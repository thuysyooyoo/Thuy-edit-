import json
import os
from google import genai
from backend.config import GEMINI_API_KEY
from backend.boundary_snapper import snap_clip_boundaries

PROMPT_VIRAL_ANALYSIS = """
Bạn là một chuyên gia biên tập video viral hàng đầu trên TikTok, YouTube Shorts và Instagram Reels.
Bạn cũng là một đạo diễn dựng phim chuyên nghiệp, cực kỳ khắt khe về tính hoàn chỉnh của từng câu nói và nhịp điệu kết thúc video.

## NHIỆM VỤ
Phân tích bản ghi lời thoại (Transcript) có mốc thời gian dưới đây.
Trích xuất ra **CHỈ 3 đến 6 đoạn ngắn (Clip) CHẤT LƯỢNG CAO NHẤT** — KHÔNG cắt toàn bộ video, chỉ chọn lọc những đoạn thực sự đắt giá.

## TIÊU CHÍ BẮT BUỘC CHO MỖI CLIP
Mỗi clip **PHẢI** đáp ứng đủ cả 4 tiêu chí cấu trúc sau, nếu không đủ thì LOẠI BỎ clip đó:

1. **HOOK (3 giây đầu):**
   - Câu mở đầu gây tò mò / sốc / đánh đúng tâm lý người xem (scroll-stopping).

2. **PROBLEM (Vấn đề / Nỗi đau):**
   - Nêu rõ vấn đề, thắc mắc hoặc thách thức cụ thể mà người xem quan tâm.

3. **SOLUTION & CONCLUSION (Giải pháp & Kết luận):**
   - Cung cấp câu trả lời, giải pháp hoặc bài học giá trị.

4. **ĐIỂM ĐẦU VÀ ĐIỂM KẾT THÚC HOÀN CHỈNH (CỰC KỲ QUAN TRỌNG):**
   - `start_time`: BẮT BUỘC bắt đầu từ đầu một câu nói hoàn chỉnh.
   - `end_time`: **BẮT BUỘC PHẢI LÀ ĐIỂM KẾT THÚC CỦA MỘT CÂU NÓI HOÀN CHỈNH (CÓ KẾT CÂU TRỌN VẸN).**
   - Người nói **PHẢI NÓI XONG HẾT CÂU**, có dấu chấm kết thúc ý rõ ràng.
   - **TUYỆT ĐỐI CẤM:** Không được cắt khi người nói đang nói dở câu, đang nói nửa chừng, hoặc ngắt giữa một từ/ý.

## YÊU CẦU BỔ SUNG
- Thời lượng mỗi clip: 25 đến 60 giây (tối ưu khoảng 30-50 giây).
- `start_time` và `end_time` PHẢI khớp chính xác với timecodes trong transcript.
- Tiêu đề (`title`) phải viết hoa các từ quan trọng, cực kỳ cuốn hút, giật gân và liên quan trực tiếp đến nội dung clip.

## DỮ LIỆU TRANSCRIPT ĐẦU VÀO
{transcript_json}

## ĐỊNH DẠNG KẾT QUẢ (Trả về JSON thuần túy, không bao quanh bởi markdown):
{{
  "clips": [
    {{
      "id": 1,
      "title": "Tiêu Đề Viral Gây Tò Mò",
      "start_time": 12.5,
      "end_time": 45.0,
      "duration": 32.5,
      "hook_score": 95,
      "hook": "Câu hook mở đầu cụ thể trong clip này",
      "problem": "Vấn đề/pain point được nêu ra trong clip",
      "solution": "Giải pháp/giá trị/insight mà clip cung cấp",
      "summary": "Tóm tắt tại sao clip này có tiềm năng viral cao"
    }}
  ]
}}
"""

GEMINI_MODELS = [
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash'
]

def analyze_viral_clips(transcript_data: dict, api_key: str = None) -> dict:
    """
    Phân tích transcript bằng AI Gemini để tìm danh sách các Clip Viral đắt giá.
    Tự động căn chỉnh mốc thời gian (Smart Snapping) để đảm bảo kết câu trọn vẹn 100%.
    """
    api_key = api_key or GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    words = transcript_data.get("words", [])
    segments = transcript_data.get("segments", [])

    if api_key:
        print("[ViralAnalyzer] 🧠 Đang gửi Transcript sang AI Gemini để phân tích cấu trúc Hook → Problem → Solution & Kết câu hoàn chỉnh...", flush=True)
        try:
            client = genai.Client(api_key=api_key)

            compact_segments = []
            for seg in segments:
                compact_segments.append({
                    "start": round(seg["start"], 2),
                    "end": round(seg["end"], 2),
                    "text": seg["text"]
                })

            prompt = PROMPT_VIRAL_ANALYSIS.format(
                transcript_json=json.dumps(compact_segments, ensure_ascii=False)
            )

            response = None
            used_model = None
            for model_name in GEMINI_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    used_model = model_name
                    break
                except Exception as model_err:
                    print(f"[ViralAnalyzer] Thử model {model_name} chưa được: {model_err}")

            if response:
                clean_text = response.text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.startswith("```"):
                    clean_text = clean_text[3:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()

                result = json.loads(clean_text)
                raw_clips = result.get('clips', [])
                
                # Áp dụng Smart Snapping để đảm bảo 100% nói hết câu, không bị ngắt chữ
                snapped_clips = []
                for c in raw_clips:
                    raw_st = c["start_time"]
                    raw_et = c["end_time"]
                    snapped_st, snapped_et = snap_clip_boundaries(raw_st, raw_et, words, segments)
                    
                    c["start_time"] = snapped_st
                    c["end_time"] = snapped_et
                    c["duration"] = round(snapped_et - snapped_st, 2)
                    snapped_clips.append(c)

                print(f"[ViralAnalyzer] ✅ AI Gemini ({used_model}) + Smart Snapping đã hoàn thiện {len(snapped_clips)} clip (đảm bảo kết câu trọn vẹn)!", flush=True)

                for c in snapped_clips:
                    print(f"\n  🎯 [Clip #{c.get('id')}] \"{c.get('title')}\" — Điểm: {c.get('hook_score')}/100 ({c.get('start_time')}s -> {c.get('end_time')}s | {c.get('duration')}s)", flush=True)
                    print(f"     🪝 Hook: {c.get('hook', 'N/A')}", flush=True)
                    print(f"     ⚠️ Problem: {c.get('problem', 'N/A')}", flush=True)
                    print(f"     💡 Solution: {c.get('solution', 'N/A')}", flush=True)

                return {"clips": snapped_clips}

        except Exception as e:
            print(f"[ViralAnalyzer] ❌ Lỗi khi phân tích bằng Gemini API: {e}", flush=True)
            print("[ViralAnalyzer] Chuyển sang chế độ Fallback...", flush=True)

    # --- FALLBACK RULE-BASED SEGMENTATION ---
    print("=" * 60, flush=True)
    print("⚠️  CẢNH BÁO: Đang chạy chế độ Phân Đoạn Tự Động (Fallback)", flush=True)
    print("=" * 60, flush=True)

    clips = []
    clip_id = 1
    target_duration = 40.0
    current_start = 0.0
    current_texts = []

    for seg in segments:
        current_texts.append(seg["text"])
        duration_so_far = seg["end"] - current_start

        if duration_so_far >= target_duration or seg == segments[-1]:
            end_time = seg["end"]
            snapped_st, snapped_et = snap_clip_boundaries(current_start, end_time, words, segments)
            clip_duration = snapped_et - snapped_st
            if clip_duration >= 15.0:
                combined_text = " ".join(current_texts)
                clips.append({
                    "id": clip_id,
                    "title": f"Đoạn nổi bật #{clip_id}",
                    "start_time": snapped_st,
                    "end_time": snapped_et,
                    "duration": round(clip_duration, 2),
                    "hook_score": 50,
                    "hook": "(Cần Gemini API để phân tích)",
                    "problem": "(Cần Gemini API để phân tích)",
                    "solution": "(Cần Gemini API để phân tích)",
                    "summary": combined_text[:200] + "..."
                })
                clip_id += 1
            current_start = seg["end"]
            current_texts = []

    return {"clips": clips}
