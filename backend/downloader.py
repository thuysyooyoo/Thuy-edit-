import os
import yt_dlp
from pathlib import Path
from backend.config import DOWNLOADS_DIR, FFMPEG_DIR


def download_youtube_video(url: str, output_dir: Path = DOWNLOADS_DIR,
                           cookies_browser: str = None) -> dict:
    """
    Download video from YouTube URL at the highest available quality.
    
    Strategy:
    1. If cookies_browser specified (e.g. 'chrome'): use logged-in session for full HD.
    2. Try tv_embedded client for 1080p separate streams + FFmpeg merge.
    3. Fallback to android client for best available combined stream.
    
    Args:
        cookies_browser: Browser name to extract cookies from (e.g. 'chrome', 'edge', 'firefox').
                         This enables downloading videos that require authentication or are
                         restricted to logged-in users, and often unlocks higher quality formats.
    """
    output_template = str(output_dir / "%(id)s_%(title)s.%(ext)s")
    
    base_opts = {
        'outtmpl': output_template,
        'quiet': False,
        'no_warnings': True,
        'overwrites': True,
        'ffmpeg_location': FFMPEG_DIR,
        'merge_output_format': 'mp4',
    }
    
    # ── Attempt 1: With browser cookies (authenticated, full quality) ──
    if cookies_browser:
        ydl_opts = {
            **base_opts,
            'format': (
                'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/'
                'bestvideo[height<=1080]+bestaudio/'
                'best[ext=mp4]/best'
            ),
            'cookiesfrombrowser': (cookies_browser,),
        }
        print(f"[Downloader] Tải HD (cookies từ {cookies_browser}): {url}", flush=True)
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return _extract_and_return(ydl, url, output_dir)
        except Exception as e:
            print(f"[Downloader] ⚠️ Cookie auth thất bại ({e}). Thử cách khác...", flush=True)
    
    # ── Attempt 2: tv_embedded client (1080p without auth) ──
    ydl_opts = {
        **base_opts,
        'format': (
            '299+140/298+140/137+140/136+140/'
            '303+251/302+251/'
            'bestvideo[height<=1080]+bestaudio/'
            'best'
        ),
        'extractor_args': {'youtube': {'player_client': ['tv_embedded']}},
    }
    print(f"[Downloader] Tải video từ YouTube (thử HD 1080p): {url}", flush=True)
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return _extract_and_return(ydl, url, output_dir)
    except Exception as e:
        print(f"[Downloader] ⚠️ HD không tải được ({e}). Dùng phương án dự phòng...", flush=True)
    
    # ── Attempt 3: android/ios fallback (best combined, may be 360p) ──
    ydl_opts = {
        **base_opts,
        'format': 'best[ext=mp4]/best',
        'extractor_args': {'youtube': {'player_client': ['android', 'ios']}},
    }
    print(f"[Downloader] Tải với phương án dự phòng (Android client)...", flush=True)
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        result = _extract_and_return(ydl, url, output_dir)
        height = result.get('height', 0)
        if isinstance(height, int) and height < 720:
            print(f"[Downloader] ⚠️ Chỉ tải được {height}p. Video này bị giới hạn chất lượng trên YouTube.", flush=True)
            print(f"[Downloader] 💡 Gợi ý: Dùng file video gốc từ máy tính để có chất lượng Full HD.", flush=True)
        return result


def _extract_and_return(ydl, url, output_dir):
    """Helper: extract info, download, and return metadata dict."""
    info = ydl.extract_info(url, download=True)
    filename = ydl.prepare_filename(info)
    
    if not os.path.exists(filename):
        video_id = info.get('id', '')
        for f in output_dir.iterdir():
            if video_id in f.name and f.suffix in ('.mp4', '.mkv', '.webm'):
                filename = str(f)
                break
    
    width = info.get('width', '?')
    height = info.get('height', '?')
    vcodec = info.get('vcodec', '?')
    fps = info.get('fps', '?')
    print(f"[Downloader] ✅ Tải thành công! Chất lượng: {width}x{height} @ {fps}fps, "
          f"Codec: {vcodec}", flush=True)
    
    return {
        "title": info.get("title", "Untitled"),
        "duration": info.get("duration", 0),
        "video_path": filename,
        "id": info.get("id", ""),
        "author": info.get("uploader", "Unknown"),
        "width": width,
        "height": height,
    }


def prepare_local_video(file_path: str) -> dict:
    """
    Validate local video file and extract basic info.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy file video tại: {file_path}")

    return {
        "title": path.stem,
        "duration": 0,
        "video_path": str(path),
        "id": path.stem,
        "author": "Local File"
    }
