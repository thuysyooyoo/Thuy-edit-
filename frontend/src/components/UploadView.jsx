import React, { useState } from 'react';
import { 
  UploadCloud, 
  Video, 
  HardDrive, 
  Sparkles, 
  FileVideo, 
  Settings, 
  Key, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  Layers,
  Wand2
} from 'lucide-react';

export default function UploadView({ onStartProcessing, isProcessing, jobStatus }) {
  const [sourceType, setSourceType] = useState('youtube'); // 'youtube' | 'local'
  const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=UImo1FhNuVQ');
  const [localPath, setLocalPath] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [autoCaptions, setAutoCaptions] = useState(true);
  const [autoHookHeadline, setAutoHookHeadline] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = sourceType === 'youtube' ? youtubeUrl : localPath;
    if (!input) return;
    onStartProcessing(input, apiKey || undefined);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-[#090a0f] select-none">
      {/* Container Box */}
      <div className="w-full max-w-2xl bg-[#11121a] border border-[#232637] rounded-3xl shadow-2xl overflow-hidden p-8">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-glow text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Video Repurposing 1:1 Opus Clip</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            1 Long Video ➔ Nhiều Clip 9:16 Viral Tự Động
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Tự động bóc băng tiếng Việt, tìm các đoạn Hook - Problem - Solution đắt giá, tạo phụ đề Karaoke và căn góc người nói 9:16.
          </p>
        </div>

        {/* Processing State */}
        {isProcessing ? (
          <div className="py-12 px-6 text-center space-y-6 bg-[#0d0e15] rounded-2xl border border-[#1f2233]">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/40 mx-auto flex items-center justify-center shadow-lg shadow-brand-500/20 animate-pulse">
              <Wand2 className="w-8 h-8 text-brand-glow" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{jobStatus?.stage || "Đang xử lý AI..."}</h3>
              <p className="text-xs text-slate-400 mt-1">{jobStatus?.message || "Hệ thống đang phân tích video của bạn"}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#181a26] rounded-full h-3 border border-[#2b2f44] overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-600 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${jobStatus?.progress || 10}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span>Tiến độ phân tích</span>
              <strong className="text-white font-bold">{jobStatus?.progress || 10}%</strong>
            </div>
          </div>
        ) : (
          /* Form Input */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tab selector */}
            <div className="grid grid-cols-2 gap-2 bg-[#0a0b10] p-1.5 rounded-2xl border border-[#1f2233]">
              <button
                type="button"
                onClick={() => setSourceType('youtube')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${
                  sourceType === 'youtube'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-[#161824]'
                }`}
              >
                <Video className="w-4 h-4 text-red-400" />
                <span>Dán Link YouTube URL</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('local')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${
                  sourceType === 'local'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-[#161824]'
                }`}
              >
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Chọn File Từ Máy Tính</span>
              </button>
            </div>

            {/* Input Box */}
            {sourceType === 'youtube' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Nhập đường dẫn video YouTube:</span>
                  <span className="text-[11px] text-slate-500 font-normal">Hỗ trợ mọi video công khai / nội bộ</span>
                </label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-[#0a0b10] border border-[#23273a] focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  Đường dẫn file video trên máy (.mp4, .mov, .mkv):
                </label>
                <input
                  type="text"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder="D:\Videos\video_goc_full_hd.mp4"
                  className="w-full bg-[#0a0b10] border border-[#23273a] focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* AI Presets & Settings */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0e1017] border border-[#222536] cursor-pointer hover:border-[#32364e] transition-colors">
                <input
                  type="checkbox"
                  checked={autoHookHeadline}
                  onChange={(e) => setAutoHookHeadline(e.target.checked)}
                  className="w-4 h-4 accent-brand-500 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-white">Auto Hook Headline</div>
                  <div className="text-[10px] text-slate-400">Tự động gắn tiêu đề giật gân đỉnh video</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0e1017] border border-[#222536] cursor-pointer hover:border-[#32364e] transition-colors">
                <input
                  type="checkbox"
                  checked={autoCaptions}
                  onChange={(e) => setAutoCaptions(e.target.checked)}
                  className="w-4 h-4 accent-brand-500 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-white">Auto Karaoke Captions</div>
                  <div className="text-[10px] text-slate-400">Tự động chèn phụ đề nhảy chữ vàng</div>
                </div>
              </label>
            </div>

            {/* Optional API Key */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1.5">
                <span>Gemini API Key (Tùy chọn nếu đã lưu trong .env):</span>
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-glow hover:underline text-[11px]"
                >
                  Lấy key miễn phí
                </a>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#0a0b10] border border-[#23273a] focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Bắt Đầu Trích Xuất Clip Viral Ngay</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
