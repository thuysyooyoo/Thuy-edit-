import os
import sys
import subprocess
from pathlib import Path
from typing import List, Dict, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import FFMPEG_PATH, OUTPUT_CLIPS_DIR, BASE_DIR
from backend.face_tracker import FaceTracker
from backend.subtitle_generator import generate_ass_subtitles
from backend.audio_mixer import build_sound_fx_audio_filter

def cut_video_segment(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    lossless: bool = False
) -> str:
    """Cắt video nhanh từng đoạn."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    duration = end_time - start_time
    
    if lossless:
        cmd = [
            FFMPEG_PATH, "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            output_path
        ]
    else:
        cmd = [
            FFMPEG_PATH, "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-c:a", "aac",
            "-b:a", "192k",
            "-avoid_negative_ts", "make_zero",
            output_path
        ]
        
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return output_path

def render_hd_vertical_clip(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    words: List[Dict],
    hook_title: Optional[str] = None,
    title_config: Optional[Dict] = None,
    caption_config: Optional[Dict] = None,
    caption_preset: Optional[str] = 'hormozi',
    font_style: Optional[Dict] = None,
    brand_config: Optional[Dict] = None,
    text_layers: Optional[List[Dict]] = None,
    sound_fx_markers: Optional[List[Dict]] = None,
    auto_whoosh: bool = True,
    auto_ding: bool = True,
    brolls: Optional[List[Dict]] = None,
    selected_bgm: Optional[str] = 'none',
    bgm_volume: int = 25,
    excluded_word_indices: Optional[List[int]] = None,
    scenes: Optional[List[Dict]] = None
) -> str:
    """
    🔥 PHIÊN 3 FLAGSHIP WYSIWYG HD 9:16 RENDER ENGINE:
    - Nhận diện khuôn mặt người nói & Auto-Crop 9:16 (Face Tracker).
    - Đốt Tiêu đề Hook theo đúng Style, vị trí, kích thước, thời lượng hiển thị.
    - Đốt phụ đề Karaoke ASS chuẩn font, màu sắc, vị trí, preset và loại bỏ từ đã cắt.
    - Đốt Nhãn dán Chữ (Text Layers) đúng vị trí và Style.
    - Tự động / Thủ công hòa âm Sound FX & BGM Nhạc nền.
    - Xuất video Full HD chuẩn 1080x1920 siêu tốc và sắc nét tuyệt đối.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    duration = max(1.0, end_time - start_time)

    # 1. Face Tracker 9:16 Crop
    try:
        tracker = FaceTracker()
        crop_data = tracker.analyze_video_crop(input_path, start_time, end_time)
        crop_filter = crop_data["crop_filter"]
    except Exception as e:
        print(f"FaceTracker warning: {e}. Fallback to center crop.")
        crop_filter = "crop=ih*9/16:ih:(iw-ih*9/16)/2:0"

    # 2. Generate ASS Subtitles, Hook Title & Text Layers
    temp_dir = BASE_DIR / "temp"
    temp_dir.mkdir(exist_ok=True)
    ass_path = str(temp_dir / f"subs_{int(start_time)}.ass")
    generate_ass_subtitles(
        words=words,
        start_time=start_time,
        end_time=end_time,
        output_ass_path=ass_path,
        hook_title=hook_title,
        title_config=title_config,
        caption_config=caption_config,
        caption_preset=caption_preset,
        font_style=font_style,
        text_layers=text_layers,
        excluded_word_indices=excluded_word_indices
    )

    # Escape path for FFmpeg filter on Windows
    escaped_ass_path = ass_path.replace("\\", "/").replace(":", "\\:")

    # 3. Sound FX & BGM Audio Mixing
    keywords_times = [w["start"] for w in words if start_time <= w["start"] <= end_time and len(w["word"]) >= 5]
    audio_fx_data = build_sound_fx_audio_filter(
        clip_start_time=start_time,
        clip_end_time=end_time,
        sound_fx_markers=sound_fx_markers or [],
        auto_whoosh=auto_whoosh,
        auto_ding=auto_ding,
        keywords_timestamps=keywords_times,
        selected_bgm=selected_bgm,
        bgm_volume=bgm_volume
    )

    # 4. Assemble FFmpeg Command (Fast Seeking & High Speed Multi-threaded Encoding)
    vf_string = f"{crop_filter},scale=1080:1920:flags=bicubic,subtitles='{escaped_ass_path}'"

    cmd = [
        FFMPEG_PATH, "-y",
        "-ss", str(start_time),
        "-t", str(duration),
        "-i", input_path
    ]

    fx_files = audio_fx_data.get("fx_files", [])
    for fx in fx_files:
        cmd.extend(["-i", fx["path"]])

    if fx_files:
        filter_parts = ["[0:a]volume=1.0[main_a]"]
        amix_inputs = "[main_a]"
        for idx, fx in enumerate(fx_files):
            delay = fx["time_ms"]
            label = f"fx_{idx}"
            filter_parts.append(f"[{idx+1}:a]adelay={delay}|{delay},volume=0.75[{label}]")
            amix_inputs += f"[{label}]"

        filter_parts.append(f"{amix_inputs}amix=inputs={len(fx_files)+1}:duration=first:dropout_transition=1[out_a]")
        full_filter_complex = ";".join(filter_parts)
        
        cmd.extend([
            "-vf", vf_string,
            "-filter_complex", full_filter_complex,
            "-map", "0:v",
            "-map", "[out_a]",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "fastdecode",
            "-threads", "0",
            "-crf", "18",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            output_path
        ])
    else:
        cmd.extend([
            "-vf", vf_string,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "fastdecode",
            "-threads", "0",
            "-crf", "18",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            output_path
        ])

    print("Running Ultra-Fast HD Vertical Render Pipeline...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=180)
    if res.returncode != 0:
        err_msg = res.stderr.decode("utf-8", errors="ignore")
        print("FFmpeg Error:", err_msg)
        raise RuntimeError(f"FFmpeg HD render failed: {err_msg[-300:]}")

    return output_path

def batch_export_clips(
    video_path: str,
    clips: List[Dict],
    lossless: bool = False
) -> List[Dict]:
    results = []
    for clip in clips:
        clip_id = clip.get("id", 1)
        safe_title = f"clip_{clip_id}_{clip.get('duration', 30)}s"
        out_file = str(OUTPUT_CLIPS_DIR / f"{safe_title}.mp4")
        
        cut_video_segment(
            input_path=video_path,
            output_path=out_file,
            start_time=clip["start_time"],
            end_time=clip["end_time"],
            lossless=lossless
        )
        results.append({
            "clip_id": clip_id,
            "title": clip.get("title", f"Clip #{clip_id}"),
            "file_path": out_file,
            "duration": clip.get("duration", 0)
        })
    return results
