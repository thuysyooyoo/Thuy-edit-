import os
import json
import re
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import BASE_DIR, DOWNLOADS_DIR, OUTPUT_CLIPS_DIR, GEMINI_API_KEY
from backend.downloader import download_youtube_video, prepare_local_video
from backend.transcriber import Transcriber
from backend.text_cleaner import detect_filler_words_and_silence
from backend.viral_analyzer import analyze_viral_clips
from backend.video_processor import cut_video_segment, batch_export_clips, render_hd_vertical_clip
from backend.copilot_engine import CopilotEngine, AVAILABLE_MODELS

app = FastAPI(title="AI Video Editor API", version="1.0.0")

# CORS middleware for Electron / Vite React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_FILE = OUTPUT_CLIPS_DIR / "pipeline_results.json"
copilot_instance = CopilotEngine()

# State tracking for background video processing
current_job = {
    "status": "idle",
    "progress": 0,
    "stage": "",
    "message": "",
    "error": None
}

class ProcessRequest(BaseModel):
    input_source: str
    gemini_api_key: Optional[str] = None

class TranscriptCutRequest(BaseModel):
    clip_id: int
    excluded_word_indices: List[int] = []
    excluded_pause_indices: List[int] = []
    custom_title: Optional[str] = None

class HdExportRequest(BaseModel):
    clip_id: int
    custom_title: Optional[str] = None
    font_style: Optional[Dict] = None
    sound_fx_markers: Optional[List[Dict]] = None
    auto_whoosh: bool = True
    auto_ding: bool = True
    brolls: Optional[List[Dict]] = None

class CopilotChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict]] = []
    clip_context: Optional[Dict] = None
    model_name: Optional[str] = "gemini-3.7-flash"
    api_key: Optional[str] = None

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "AI Video Editor Backend"}

def _background_run_pipeline(input_source: str, gemini_api_key: Optional[str] = None):
    global current_job
    try:
        current_job["status"] = "processing"
        current_job["progress"] = 10
        current_job["stage"] = "Bước 1/5: Tải / Nạp video"
        current_job["message"] = "Đang kiểm tra và nạp dữ liệu video..."
        current_job["error"] = None

        cleaned_input = input_source.strip().strip('"').strip("'")
        if cleaned_input.startswith("http://") or cleaned_input.startswith("https://"):
            video_meta = download_youtube_video(cleaned_input)
        else:
            video_meta = prepare_local_video(cleaned_input)
        
        video_path = video_meta["video_path"]

        current_job["progress"] = 30
        current_job["stage"] = "Bước 2/5: Bóc băng Faster-Whisper"
        current_job["message"] = "AI đang nhận diện giọng nói và căn thời gian từng từ..."
        
        transcriber = Transcriber(model_size="small")
        transcript_result = transcriber.transcribe(video_path)

        current_job["progress"] = 55
        current_job["stage"] = "Bước 3/5: Lọc từ thừa & khoảng lặng"
        current_job["message"] = "Đang tự động phát hiện từ ậm ờ và khoảng lặng dài..."
        clean_result = detect_filler_words_and_silence(transcript_result["words"])

        current_job["progress"] = 75
        current_job["stage"] = "Bước 4/5: Phân tích Hook - Problem - Solution"
        current_job["message"] = "AI đang đánh giá độ viral và cấu trúc video 1-4 phút..."
        viral_results = analyze_viral_clips(transcript_result, api_key=gemini_api_key)
        clips = viral_results.get("clips", [])

        current_job["progress"] = 90
        current_job["stage"] = "Bước 5/5: Xuất video clips"
        current_job["message"] = f"Đang xuất {len(clips)} clip viral..."
        exported_files = batch_export_clips(video_path, clips, lossless=True)

        results = {
            "video_metadata": video_meta,
            "transcript": transcript_result,
            "clean_result": clean_result,
            "viral_clips": clips,
            "exported_files": exported_files
        }
        with open(RESULTS_FILE, "w", encoding="utf-8") as fp:
            json.dump(results, fp, ensure_ascii=False, indent=2)

        current_job["status"] = "completed"
        current_job["progress"] = 100
        current_job["stage"] = "Hoàn tất!"
        current_job["message"] = f"Đã trích xuất thành công {len(clips)} clip viral!"
    except Exception as e:
        import traceback
        traceback.print_exc()
        current_job["status"] = "error"
        current_job["progress"] = 0
        current_job["stage"] = "Lỗi xử lý"
        current_job["message"] = str(e)
        current_job["error"] = str(e)

@app.post("/api/process")
def process_video_endpoint(req: ProcessRequest, background_tasks: BackgroundTasks):
    global current_job
    if current_job["status"] == "processing":
        raise HTTPException(status_code=400, detail="Một tác vụ khác đang được xử lý. Vui lòng đợi.")
    
    current_job = {
        "status": "processing",
        "progress": 5,
        "stage": "Khởi động",
        "message": "Đang khởi tạo tiến trình phân tích AI...",
        "error": None
    }
    background_tasks.add_task(_background_run_pipeline, req.input_source, req.gemini_api_key)
    return {"success": True, "message": "Đã bắt đầu tiến trình xử lý video."}

@app.get("/api/job-status")
def get_job_status():
    return current_job

@app.get("/api/copilot/models")
def get_available_copilot_models():
    """Lấy danh sách các Model AI mà người dùng có thể lựa chọn theo sở thích."""
    return {"models": AVAILABLE_MODELS}

@app.post("/api/copilot/chat")
def chat_with_copilot(req: CopilotChatRequest):
    """
    🤖 Endpoint AI Copilot Producer: Nhận lệnh tiếng Việt và trả về Action thực thi Studio.
    """
    res = copilot_instance.chat(
        user_message=req.message,
        history=req.history,
        clip_context=req.clip_context,
        model_name=req.model_name,
        api_key=req.api_key
    )
    return res

@app.get("/api/data")
def get_pipeline_data():
    """Lấy dữ liệu video, transcript và danh sách viral clips hiện tại."""
    if not RESULTS_FILE.exists():
        return {
            "has_data": False,
            "message": "Chưa có dự án nào được xử lý."
        }
    with open(RESULTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {
        "has_data": True,
        **data
    }

@app.get("/api/stream/source")
def stream_source_video(request: Request):
    """Stream video nguồn cho HTML5 video player hỗ trợ Range Requests."""
    if not RESULTS_FILE.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy video")
    with open(RESULTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    video_path = data.get("video_metadata", {}).get("video_path")
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="File video gốc không tồn tại")
    
    return _range_stream_video(video_path, request)

@app.get("/api/stream/clip/{clip_id}")
def stream_clip_video(clip_id: int, request: Request):
    """Stream video của clip đã cắt."""
    if not RESULTS_FILE.exists():
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu")
    with open(RESULTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    exported = data.get("exported_files", [])
    target = next((c for c in exported if c.get("clip_id") == clip_id), None)
    if not target or not os.path.exists(target["file_path"]):
        raise HTTPException(status_code=404, detail=f"Không tìm thấy clip #{clip_id}")
    
    return _range_stream_video(target["file_path"], request)

def _range_stream_video(file_path: str, request: Request):
    """Helper xử lý HTTP 206 Partial Content Range Stream."""
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")
    
    if not range_header:
        def iter_file():
            with open(file_path, "rb") as f:
                while chunk := f.read(1024 * 1024):
                    yield chunk
        return StreamingResponse(iter_file(), media_type="video/mp4", headers={"Content-Length": str(file_size)})
    
    range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not range_match:
        raise HTTPException(status_code=416, detail="Invalid Range Header")
    
    start = int(range_match.group(1))
    end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
    content_length = (end - start) + 1
    
    def iter_range():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = content_length
            while remaining > 0:
                chunk_size = min(1024 * 1024, remaining)
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk
                
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": "video/mp4",
    }
    return StreamingResponse(iter_range(), status_code=206, headers=headers)

@app.post("/api/export-hd-clip")
def export_hd_vertical_video(req: HdExportRequest):
    """
    🔥 Xuất video 1080x1920 Full HD chuẩn 9:16 có Face Tracker, Phụ đề Karaoke ASS và Sound FX
    """
    if not RESULTS_FILE.exists():
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu video")
        
    with open(RESULTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    video_path = data["video_metadata"]["video_path"]
    clips = data["viral_clips"]
    target_clip = next((c for c in clips if c["id"] == req.clip_id), None)
    if not target_clip:
        raise HTTPException(status_code=404, detail="Không tìm thấy clip")
        
    words = data["transcript"]["words"]
    title = req.custom_title or target_clip.get("title", f"clip_{req.clip_id}")
    safe_name = f"HD_9x16_clip_{req.clip_id}.mp4"
    out_file = str(OUTPUT_CLIPS_DIR / safe_name)
    
    try:
        render_hd_vertical_clip(
            input_path=video_path,
            output_path=out_file,
            start_time=target_clip["start_time"],
            end_time=target_clip["end_time"],
            words=words,
            hook_title=title,
            font_style=req.font_style,
            sound_fx_markers=req.sound_fx_markers,
            auto_whoosh=req.auto_whoosh,
            auto_ding=req.auto_ding,
            brolls=req.brolls
        )
        return {
            "success": True,
            "message": "Đã xuất video 9:16 Full HD 1080x1920 hoàn tất!",
            "file_path": out_file,
            "file_name": safe_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cut-custom-clip")
def cut_custom_clip_by_transcript(req: TranscriptCutRequest):
    """Text-based video editing cut."""
    if not RESULTS_FILE.exists():
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu video")
        
    with open(RESULTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    video_path = data["video_metadata"]["video_path"]
    clips = data["viral_clips"]
    target_clip = next((c for c in clips if c["id"] == req.clip_id), None)
    if not target_clip:
        raise HTTPException(status_code=404, detail="Không tìm thấy clip gốc")
        
    all_words = data["transcript"]["words"]
    clip_words = [w for w in all_words if target_clip["start_time"] <= w["start"] and w["end"] <= target_clip["end_time"]]
    remaining_words = [w for idx, w in enumerate(clip_words) if idx not in req.excluded_word_indices]
    
    if not remaining_words:
        raise HTTPException(status_code=400, detail="Không thể xóa toàn bộ lời thoại của clip")
        
    keep_segments = []
    curr_seg = {"start": remaining_words[0]["start"], "end": remaining_words[0]["end"]}
    
    for i in range(1, len(remaining_words)):
        w = remaining_words[i]
        if w["start"] - curr_seg["end"] <= 0.25:
            curr_seg["end"] = w["end"]
        else:
            keep_segments.append(curr_seg)
            curr_seg = {"start": w["start"], "end": w["end"]}
    keep_segments.append(curr_seg)
    
    safe_title = f"custom_clip_{req.clip_id}"
    out_file = str(OUTPUT_CLIPS_DIR / f"{safe_title}.mp4")
    
    if len(keep_segments) == 1:
        cut_video_segment(video_path, out_file, keep_segments[0]["start"], keep_segments[0]["end"] + 0.3, lossless=False)
    else:
        temp_cut_files = []
        temp_dir = BASE_DIR / "temp"
        temp_dir.mkdir(exist_ok=True)
        
        for idx, seg in enumerate(keep_segments):
            seg_file = str(temp_dir / f"temp_seg_{idx}.mp4")
            cut_video_segment(video_path, seg_file, seg["start"], seg["end"], lossless=False)
            temp_cut_files.append(seg_file)
            
        concat_list_path = str(temp_dir / "concat_list.txt")
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for seg_file in temp_cut_files:
                f.write(f"file '{seg_file}'\n")
                
        from backend.config import FFMPEG_PATH
        import subprocess
        cmd = [
            FFMPEG_PATH, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_list_path,
            "-c", "copy",
            out_file
        ]
        subprocess.run(cmd, check=True)
        
    return {
        "success": True,
        "message": "Đã cắt và render video loại bỏ từ thừa & khoảng lặng thành công!",
        "file_path": out_file,
        "segments_count": len(keep_segments)
    }

# Mount static sound assets
SOUNDS_DIR = BASE_DIR / "backend" / "assets" / "sounds"
if SOUNDS_DIR.exists():
    app.mount("/assets/sounds", StaticFiles(directory=str(SOUNDS_DIR)), name="sounds")

# Mount static React Frontend build directly
DIST_DIR = BASE_DIR / "frontend" / "dist"
if DIST_DIR.exists() and (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        return FileResponse(str(DIST_DIR / "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
