import os
from pathlib import Path
from faster_whisper import WhisperModel
from backend.config import WHISPER_MODEL_SIZE, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE

class Transcriber:
    def __init__(self, model_size=WHISPER_MODEL_SIZE, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE):
        print(f"[Transcriber] Đang khởi tạo mô hình Faster-Whisper ({model_size})...")
        try:
            # Thử khởi tạo với cấu hình mong muốn (GPU/Auto)
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        except Exception as e:
            print(f"[Transcriber Warning] Không thể load CUDA GPU ({e}). Tự động chuyển sang chế độ CPU...")
            self.model = WhisperModel(model_size, device="cpu", compute_type="int8")

    def transcribe(self, audio_or_video_path: str, language: str = None) -> dict:
        """
        Bóc băng âm thanh/video thành lời thoại với mốc thời gian chi tiết từng từ.
        """
        print(f"[Transcriber] Bắt đầu bóc băng file: {audio_or_video_path}")
        
        try:
            segments, info = self.model.transcribe(
                audio_or_video_path,
                language=language,
                word_timestamps=True,
                vad_filter=True
            )
            
            full_transcript = []
            all_words = []
            
            for segment in segments:
                seg_dict = {
                    "id": segment.id,
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip(),
                    "words": []
                }
                
                if segment.words:
                    for word in segment.words:
                        word_obj = {
                            "word": word.word.strip(),
                            "start": word.start,
                            "end": word.end,
                            "probability": word.probability
                        }
                        seg_dict["words"].append(word_obj)
                        all_words.append(word_obj)
                        
                full_transcript.append(seg_dict)
                
            detected_lang = info.language
            lang_probability = info.language_probability
            print(f"[Transcriber] Hoàn tất bóc băng! Ngôn ngữ phát hiện: {detected_lang} ({lang_probability:.2f})")
            
            full_text = " ".join([seg["text"] for seg in full_transcript])
            
            return {
                "language": detected_lang,
                "language_probability": lang_probability,
                "duration": info.duration,
                "full_text": full_text,
                "segments": full_transcript,
                "words": all_words
            }
        except RuntimeError as e:
            if "cublas" in str(e).lower() or "cuda" in str(e).lower():
                print("[Transcriber Fallback] Phát hiện lỗi CUDA DLL khi chạy. Chuyển mô hình sang CPU để tiếp tục...")
                self.model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
                return self.transcribe(audio_or_video_path, language=language)
            raise e
