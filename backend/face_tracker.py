import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cv2
import numpy as np
from typing import List, Tuple, Dict

CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'

class FaceTracker:
    def __init__(self, cascade_path: str = CASCADE_PATH):
        if not os.path.exists(cascade_path):
            raise FileNotFoundError(f"Haar cascade model not found at {cascade_path}")
        self.face_cascade = cv2.CascadeClassifier(cascade_path)

    def analyze_video_crop(
        self, 
        video_path: str, 
        start_time: float, 
        end_time: float,
        target_aspect_ratio: float = 9 / 16,
        sample_fps: float = 3.0,
        smoothing_factor: float = 0.25
    ) -> Dict:
        """
        Quét video tìm tọa độ khuôn mặt người nói và tính toán vị trí crop 9:16
        mượt mà (Smooth EMA Panning) không bị rung giật.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Target 9:16 dimensions based on original height
        target_crop_w = int(orig_height * target_aspect_ratio)
        target_crop_h = orig_height

        # Ensure target crop width does not exceed original width
        if target_crop_w > orig_width:
            target_crop_w = orig_width
            target_crop_h = int(orig_width / target_aspect_ratio)

        default_center_x = orig_width / 2.0
        current_center_x = default_center_x

        # Sample frames efficiently across the clip range (8-12 points max)
        sample_count = min(12, max(4, int((end_time - start_time) * 1.5)))
        sample_times = np.linspace(start_time, max(start_time + 0.5, end_time), num=sample_count)

        centers = []

        for t in sample_times:
            cap.set(cv2.CAP_PROP_POS_MSEC, float(t * 1000.0))
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            small_gray = cv2.resize(gray, (0, 0), fx=0.35, fy=0.35)
            faces = self.face_cascade.detectMultiScale(
                small_gray, 
                scaleFactor=1.2, 
                minNeighbors=3, 
                minSize=(25, 25)
            )

            if len(faces) > 0:
                largest_face = max(faces, key=lambda f: f[2] * f[3])
                fx, fy, fw, fh = [v / 0.35 for v in largest_face]
                detected_center_x = fx + (fw / 2.0)
                current_center_x = (smoothing_factor * detected_center_x) + ((1.0 - smoothing_factor) * current_center_x)
            else:
                current_center_x = (0.05 * default_center_x) + (0.95 * current_center_x)

            centers.append(current_center_x)

        cap.release()

        # Compute final stable center X
        final_center_x = np.median(centers) if centers else default_center_x

        # Calculate crop coordinates clamped to bounds
        crop_x = int(final_center_x - (target_crop_w / 2.0))
        crop_x = max(0, min(orig_width - target_crop_w, crop_x))
        crop_y = 0

        # FFmpeg crop filter string
        crop_filter = f"crop={target_crop_w}:{target_crop_h}:{crop_x}:{crop_y}"

        return {
            "crop_filter": crop_filter,
            "crop_x": crop_x,
            "crop_y": crop_y,
            "crop_w": target_crop_w,
            "crop_h": target_crop_h,
            "orig_w": orig_width,
            "orig_h": orig_height,
            "target_w": 1080,
            "target_h": 1920
        }

if __name__ == "__main__":
    from backend.config import BASE_DIR
    import glob
    videos = glob.glob(str(BASE_DIR / "downloads" / "*.mp4"))
    if videos:
        tracker = FaceTracker()
        res = tracker.analyze_video_crop(videos[0], start_time=10.0, end_time=40.0)
        print("Face Tracker result:", res)
