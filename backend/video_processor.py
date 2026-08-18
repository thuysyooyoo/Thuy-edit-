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

import base64

def save_base64_image(data_uri: str, target_path: str) -> Optional[str]:
    """Lưu chuỗi ảnh base64 data URI thành file PNG chuẩn."""
    if not data_uri:
        return None
    try:
        if "," in data_uri:
            data_uri = data_uri.split(",", 1)[1]
        img_bytes = base64.b64decode(data_uri)
        Path(target_path).parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(img_bytes)
        return target_path
    except Exception as e:
        print(f"Error saving base64 image to {target_path}: {e}")
        return None

def render_hd_vertical_clip(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    words: List[Dict],
    hook_title: Optional[str] = None,
    title_card_image: Optional[str] = None,
    brand_logo_image: Optional[str] = None,
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
    🔥 PHIÊN 3 FLAGSHIP WYSIWYG HD 9:16 RENDER ENGINE (DOM Snapshot + Subtitle Overlay):
    - Nhận diện khuôn mặt người nói & Auto-Crop 9:16 (Face Tracker).
    - Đè ảnh Snapshot Đồ họa Thẻ Tiêu đề Hook (khớp 100% màu vàng gradient, bo góc, bóng đổ, font).
    - Đè ảnh Snapshot Logo thương hiệu (khớp 100% vị trí, kích thước, độ mờ).
    - Đốt phụ đề Karaoke ASS chuẩn font, màu sắc, vị trí, preset và loại bỏ từ đã cắt.
    - Đốt Nhãn dán Chữ (Text Layers) đúng vị trí và Style.
    - Tự động / Thủ công hòa âm Sound FX & BGM Nhạc nền.
    - Xuất video Full HD chuẩn 1080x1920 siêu tốc và sắc nét tuyệt đối.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    duration = max(1.0, end_time - start_time)
    temp_dir = BASE_DIR / "temp"
    temp_dir.mkdir(exist_ok=True)

    # 1. Face Tracker 9:16 Crop
    try:
        tracker = FaceTracker()
        crop_data = tracker.analyze_video_crop(input_path, start_time, end_time)
        crop_filter = crop_data["crop_filter"]
    except Exception as e:
        print(f"FaceTracker warning: {e}. Fallback to center crop.")
        crop_filter = "crop=ih*9/16:ih:(iw-ih*9/16)/2:0"

    # 2. Xử lý ảnh Snapshot Đồ họa (Title Card & Brand Logo)
    title_config = title_config or {}
    brand_config = brand_config or {}

    title_card_path = None
    if title_card_image:
        title_card_path = save_base64_image(
            title_card_image,
            str(temp_dir / f"title_card_{int(start_time)}.png")
        )

    brand_logo_path = None
    if brand_logo_image:
        brand_logo_path = save_base64_image(
            brand_logo_image,
            str(temp_dir / f"brand_logo_{int(start_time)}.png")
        )
    elif brand_config.get("showLogo") and brand_config.get("logoUrl") and os.path.exists(str(brand_config.get("logoUrl"))):
        brand_logo_path = str(brand_config.get("logoUrl"))

    # 3. Generate ASS Subtitles & Text Layers
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
        brand_config=brand_config,
        text_layers=text_layers,
        excluded_word_indices=excluded_word_indices,
        has_title_card_image=bool(title_card_path),
        has_brand_logo_image=bool(brand_logo_path)
    )

    # Escape path for FFmpeg filter on Windows
    escaped_ass_path = ass_path.replace("\\", "/").replace(":", "\\:")

    # 4. Sound FX & BGM Audio Mixing
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

    # 5. Assemble FFmpeg Inputs & FilterGraph
    cmd = [
        FFMPEG_PATH, "-y",
        "-ss", str(start_time),
        "-i", input_path,
        "-t", str(duration)
    ]

    current_input_idx = 1
    title_input_idx = None
    if title_card_path:
        cmd.extend(["-i", title_card_path])
        title_input_idx = current_input_idx
        current_input_idx += 1

    logo_input_idx = None
    if brand_logo_path:
        cmd.extend(["-i", brand_logo_path])
        logo_input_idx = current_input_idx
        current_input_idx += 1

    fx_files = audio_fx_data.get("fx_files", [])
    for fx in fx_files:
        cmd.extend(["-i", fx["path"]])
        current_input_idx += 1

    # Build Complex Filter for Video and Audio
    filter_parts = []
    
    # Video Base Crop & Scale
    filter_parts.append(f"[0:v]{crop_filter},scale=1080:1920:flags=bicubic[v_base]")
    curr_v = "v_base"

    # Overlay Brand Logo Snapshot
    if logo_input_idx is not None:
        l_pos = brand_config.get("pos", {"x": 82, "y": 6})
        lx = max(0, min(1080, int((l_pos.get("x", 82) / 100.0) * 1080)))
        ly = max(0, min(1920, int((l_pos.get("y", 6) / 100.0) * 1920)))
        filter_parts.append(f"[{curr_v}][{logo_input_idx}:v]overlay=x={lx}-w/2:y={ly}-h/2[v_logo]")
        curr_v = "v_logo"

    # Overlay Title Card Snapshot
    if title_input_idx is not None:
        t_pos = title_config.get("pos", {"x": 50, "y": 10})
        tx = max(0, min(1080, int((t_pos.get("x", 50) / 100.0) * 1080)))
        ty = max(0, min(1920, int((t_pos.get("y", 10) / 100.0) * 1920)))
        t_start = float(title_config.get("startTime", 0.0))
        t_dur = float(title_config.get("duration", 6.0))
        t_end = t_start + t_dur
        filter_parts.append(f"[{curr_v}][{title_input_idx}:v]overlay=x={tx}-w/2:y={ty}-h/2:enable='between(t,{t_start},{t_end})'[v_title]")
        curr_v = "v_title"

    # Burn Subtitles
    filter_parts.append(f"[{curr_v}]subtitles='{escaped_ass_path}'[v_out]")

    # Audio Mix
    if fx_files:
        filter_parts.append("[0:a]volume=1.0[main_a]")
        amix_inputs = "[main_a]"
        for idx, fx in enumerate(fx_files):
            delay = fx["time_ms"]
            label = f"fx_{idx}"
            audio_idx = (title_input_idx is not None) + (logo_input_idx is not None) + 1 + idx
            filter_parts.append(f"[{audio_idx}:a]adelay={delay}|{delay},volume=0.75[{label}]")
            amix_inputs += f"[{label}]"

        filter_parts.append(f"{amix_inputs}amix=inputs={len(fx_files)+1}:duration=first:dropout_transition=1[out_a]")
        curr_a = "[out_a]"
    else:
        filter_parts.append("[0:a]volume=1.0[out_a]")
        curr_a = "[out_a]"

    full_filter_complex = ";".join(filter_parts)

    cmd.extend([
        "-filter_complex", full_filter_complex,
        "-map", "[v_out]",
        "-map", curr_a,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "fastdecode",
        "-threads", "0",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-t", str(duration),
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
