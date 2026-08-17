import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from typing import List, Dict, Optional

def format_ass_time(seconds: float) -> str:
    """Format seconds as ASS timestamp: H:MM:SS.cc"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours}:{minutes:02d}:{secs:05.2f}"

def color_to_ass_hex(hex_str: str, default: str = "&H00FFFFFF") -> str:
    """Convert #RRGGBB to ASS &H00BBGGRR format."""
    clean = hex_str.replace("#", "").strip()
    if len(clean) == 6:
        r, g, b = clean[0:2], clean[2:4], clean[4:6]
        return f"&H00{b}{g}{r}"
    elif len(clean) == 8:
        r, g, b = clean[0:2], clean[2:4], clean[4:6]
        return f"&H00{b}{g}{r}"
    return default

def generate_ass_subtitles(
    words: List[Dict],
    start_time: float,
    end_time: float,
    output_ass_path: str,
    hook_title: Optional[str] = None,
    font_style: Optional[Dict] = None
) -> str:
    """
    Sinh file phụ đề ASS chuẩn 1080x1920 có hiệu ứng nhảy chữ Karaoke và Hook Bar.
    """
    font_style = font_style or {}
    font_family = font_style.get("fontFamily", "Montserrat")
    font_size = font_style.get("fontSize", 42)
    text_color = color_to_ass_hex(font_style.get("textColor", "#FFFFFF"), "&H00FFFFFF")
    stroke_color = color_to_ass_hex(font_style.get("strokeColor", "#000000"), "&H00000000")
    stroke_width = font_style.get("strokeWidth", 8)
    highlight_color = color_to_ass_hex(font_style.get("highlightColor", "#04f827"), "&H0027F804") # Neon Green
    is_uppercase = font_style.get("isUppercase", True)

    clip_words = [w for w in words if w["start"] >= start_time - 0.2 and w["end"] <= end_time + 0.5]

    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: SubtitleStyle,{font_family},{font_size * 2},{text_color},&H000000FF,{stroke_color},&H80000000,-1,0,0,0,100,100,1,0,1,{stroke_width},2,2,40,40,240,1
Style: HookStyle,Montserrat,60,&H00000000,&H000000FF,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,1,0,1,16,4,8,40,40,160,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events = []

    # 1. Top Hook Headline Bar (burned into top 1/3 of screen during first 5-10s or whole clip)
    if hook_title:
        clean_title = hook_title.upper() if is_uppercase else hook_title
        h_start = format_ass_time(0.0)
        h_end = format_ass_time(min(8.0, end_time - start_time))
        events.append(f"Dialogue: 1,{h_start},{h_end},HookStyle,,0,0,0,,{{\\pos(540, 220)\\bord14\\3c&H00FFFFFF&\\c&H00000000&}}{clean_title}")

    # 2. Chunk words into short 3-5 word animated subtitle lines
    chunk_size = 4
    for i in range(0, len(clip_words), chunk_size):
        chunk = clip_words[i:i + chunk_size]
        if not chunk:
            continue

        chunk_start = max(0.0, chunk[0]["start"] - start_time)
        chunk_end = max(chunk_start + 0.5, chunk[-1]["end"] - start_time)

        # For each word in chunk, highlight it while active
        for active_idx, active_word in enumerate(chunk):
            w_start = max(0.0, active_word["start"] - start_time)
            w_end = max(w_start + 0.15, active_word["end"] - start_time)

            line_parts = []
            for idx, w in enumerate(chunk):
                w_text = w["word"].upper() if is_uppercase else w["word"]
                if idx == active_idx:
                    # Highlight active word
                    line_parts.append(f"{{\\c{highlight_color}\\t(0,100,\\fscx115\\fscy115)}}{w_text}{{\\rSubtitleStyle}}")
                else:
                    line_parts.append(w_text)

            line_text = " ".join(line_parts)
            events.append(f"Dialogue: 0,{format_ass_time(w_start)},{format_ass_time(w_end)},SubtitleStyle,,0,0,0,,{{\\pos(540, 1620)}}{line_text}")

    full_ass_content = ass_header + "\n".join(events) + "\n"

    Path(output_ass_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_ass_path, "w", encoding="utf-8") as f:
        f.write(full_ass_content)

    return output_ass_path

if __name__ == "__main__":
    from backend.config import BASE_DIR, OUTPUT_CLIPS_DIR
    import json
    res_path = OUTPUT_CLIPS_DIR / "pipeline_results.json"
    if res_path.exists():
        with open(res_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        words = data["transcript"]["words"]
        out_ass = str(OUTPUT_CLIPS_DIR / "test_subtitles.ass")
        generate_ass_subtitles(words, 10.0, 40.0, out_ass, hook_title="Luật Chất lượng Hàng hóa 2025")
        print("Generated test ASS file:", out_ass)
