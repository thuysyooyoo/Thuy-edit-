import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Crop, 
  ChevronDown, 
  Wand2, 
  ArrowLeft,
  Zap,
  Loader2,
  Cpu,
  Clock,
  Layout,
  Check,
  Save,
  Mic
} from 'lucide-react';

export default function TopBar({ 
  onSpeechCleanup, 
  speechEnhance = false,
  onToggleSpeechEnhance,
  onExtendClip, 
  aspectRatio, 
  setAspectRatio, 
  onExport, 
  onExportHd,
  onExportWysiwyg,
  onSaveProject,
  onOpenProjects,
  isExportingHd = false,
  videoTitle, 
  onBackToDashboard,
  onToggleCopilot,
  isCopilotOpen = false,
  selectedModel = 'gemini-3.7-flash',
  setSelectedModel,
  faceTrackerEnabled = true,
  setFaceTrackerEnabled,
  videoLayout = 'fill',
  setVideoLayout,
  clipDuration = 30,
  onExtendStart,
  onExtendEnd
}) {
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const extendRef = useRef(null);
  const layoutRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (extendRef.current && !extendRef.current.contains(event.target)) {
        setIsExtendOpen(false);
      }
      if (layoutRef.current && !layoutRef.current.contains(event.target)) {
        setIsLayoutOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const layoutOptions = [
    { id: 'fill', label: 'Fill (Toàn màn hình 9:16)', desc: 'Tự động phóng to lấp đầy khung dọc' },
    { id: 'fit', label: 'Fit (Khung vừa vặn)', desc: 'Giữ nguyên tỉ lệ gốc có viền mờ phía sau' },
    { id: 'split', label: 'Split Screen 50/50', desc: 'Chia đôi màn hình cho 2 người đối thoại' },
  ];

  return (
    <div className="h-13 bg-[#111218] border-b border-[#232634] px-4 flex items-center justify-between select-none z-30 font-sans">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181a26] hover:bg-[#222536] text-slate-300 hover:text-white border border-[#292d3f] text-xs font-bold transition-all mr-1 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Danh sách Clips</span>
          </button>
        )}

        {onOpenProjects && (
          <button
            onClick={onOpenProjects}
            title="Xem và chuyển đổi giữa các video dự án đã nạp (Không bao giờ mất dữ liệu)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1e2d] hover:bg-[#25283c] text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all mr-1 shadow-sm active:scale-95"
          >
            <span>📂 Kho Dự Án</span>
          </button>
        )}

        <button
          onClick={() => {
            onToggleSpeechEnhance ? onToggleSpeechEnhance() : onSpeechCleanup && onSpeechCleanup();
          }}
          title="Khử tạp âm, lọc ồn và làm rõ giọng nói người thuyết trình"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm active:scale-95 ${
            speechEnhance 
              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500' 
              : 'bg-[#1e202d] hover:bg-[#282b3d] text-slate-200 hover:text-white border-[#2f3347]'
          }`}
        >
          <Wand2 className={`w-3.5 h-3.5 ${speechEnhance ? 'text-indigo-400 animate-pulse' : 'text-indigo-400'}`} />
          <span>Speech cleanup: <strong>{speechEnhance ? 'BẬT' : 'TẮT'}</strong></span>
        </button>

        {/* Extend Clip Popover */}
        <div className="relative" ref={extendRef}>
          <button
            onClick={() => setIsExtendOpen(!isExtendOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181a24] hover:bg-[#222533] text-slate-300 hover:text-white border border-[#272b3c] text-xs font-medium transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Extend clip</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isExtendOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#141622] border border-[#2d3248] rounded-xl shadow-2xl p-3 z-50 space-y-2.5">
              <div className="text-xs font-bold text-white flex items-center justify-between pb-1.5 border-b border-[#222638]">
                <span>Mở rộng thời lượng</span>
                <span className="text-[11px] font-mono text-slate-400">{clipDuration.toFixed(1)}s</span>
              </div>
              
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    onExtendStart && onExtendStart(5);
                    setIsExtendOpen(false);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#1b1e2c] hover:bg-[#262b40] text-left text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-between transition-colors"
                >
                  <span>Mở rộng đoạn đầu (+5s về trước)</span>
                  <span className="text-[10px] font-mono text-indigo-400">+5s</span>
                </button>

                <button
                  onClick={() => {
                    onExtendEnd && onExtendEnd(5);
                    setIsExtendOpen(false);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#1b1e2c] hover:bg-[#262b40] text-left text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-between transition-colors"
                >
                  <span>Mở rộng đoạn cuối (+5s về sau)</span>
                  <span className="text-[10px] font-mono text-indigo-400">+5s</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Copilot & Model Selector */}
        <div className="flex items-center bg-[#151724] border border-[#2e334d] rounded-xl p-0.5 shadow-md">
          <button
            onClick={onToggleCopilot}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
              isCopilotOpen
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-indigo-500/25'
                : 'text-indigo-300 hover:text-white hover:bg-[#202336]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>AI Copilot</span>
          </button>

          <div className="h-4 w-[1px] bg-[#2a2e42] mx-1" />
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel && setSelectedModel(e.target.value)}
            className="bg-transparent text-indigo-300 text-[11px] font-bold px-2 py-1 focus:outline-none cursor-pointer hover:text-white"
          >
            <option value="gemini-3.7-flash" className="bg-[#12131e] text-white">Gemini 3.7 Flash</option>
            <option value="gemini-2.5-pro" className="bg-[#12131e] text-white">Gemini 2.5 Pro</option>
            <option value="gemini-2.5-flash" className="bg-[#12131e] text-white">Gemini 2.5 Flash</option>
            <option value="gemini-2.0-flash" className="bg-[#12131e] text-white">Gemini 2.0 Flash</option>
          </select>
        </div>
      </div>

      {/* Center controls: Format & Layout & Tracker */}
      <div className="flex items-center gap-2 bg-[#161822] p-1 rounded-xl border border-[#272a3b]">
        <button 
          onClick={() => setAspectRatio(aspectRatio === '9:16' ? '16:9' : '9:16')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#222535] text-white text-xs font-bold shadow-sm"
        >
          <span className="w-2.5 h-3.5 border-2 border-white rounded-xs inline-block" />
          <span>{aspectRatio}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Layout Dropdown */}
        <div className="relative" ref={layoutRef}>
          <button 
            onClick={() => setIsLayoutOpen(!isLayoutOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-300 hover:text-white text-xs font-medium"
          >
            <Crop className="w-3.5 h-3.5 text-slate-400" />
            <span>Layout: <strong className="capitalize text-white">{videoLayout}</strong></span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isLayoutOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#141622] border border-[#2d3248] rounded-xl shadow-2xl p-2 z-50 space-y-1">
              {layoutOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setVideoLayout && setVideoLayout(opt.id);
                    setIsLayoutOpen(false);
                  }}
                  className={`w-full p-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between ${
                    videoLayout === opt.id ? 'bg-indigo-600/30 border border-indigo-500/40 text-white' : 'hover:bg-[#1f2233] text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold">{opt.label}</div>
                    <div className="text-[10px] text-slate-400">{opt.desc}</div>
                  </div>
                  {videoLayout === opt.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-3 w-[1px] bg-[#2e334a]" />

        {/* Face Tracker Toggle */}
        <button 
          onClick={() => setFaceTrackerEnabled && setFaceTrackerEnabled(!faceTrackerEnabled)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            faceTrackerEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${faceTrackerEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>Face Tracker: <strong>{faceTrackerEnabled ? 'BẬT' : 'TẮT'}</strong></span>
        </button>
      </div>

      {/* Right controls: Export Buttons */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-slate-400 truncate max-w-[160px] hidden lg:inline-block">
          {videoTitle || "Opus Clip Project"}
        </span>

        {/* Save Project Draft Button */}
        {onSaveProject && (
          <button
            onClick={onSaveProject}
            title="Lưu tạm thời toàn bộ thiết lập (tiêu đề, phụ đề, B-Roll, chữ, logo, phân cảnh)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e2030] hover:bg-[#282c44] text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <Save className="w-3.5 h-3.5 text-indigo-400" />
            <span>Lưu Tạm</span>
          </button>
        )}

        {/* Quick Cut Export */}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1e2b] hover:bg-[#25283a] text-slate-200 hover:text-white border border-[#2c3044] text-xs font-semibold transition-all"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Xuất Cắt Nhanh</span>
        </button>

        {/* Export WYSIWYG 100% Matching Preview Button */}
        {onExportWysiwyg && (
          <button
            onClick={onExportWysiwyg}
            title="Ghi hình trực tiếp Canvas: Khớp 100% B-Roll kho hàng, thấy trọn khuôn mặt, thẻ tiêu đề vàng, không bị tiếng ting ting và đúng thời lượng"
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-brand-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-brand-600/30 transition-all active:scale-95 ring-1 ring-amber-300/40"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current text-yellow-200 animate-pulse" />
            <span>🎬 Xuất WYSIWYG (Khớp 100%)</span>
          </button>
        )}

        {/* Export Full HD 1080x1920 (Backend Render) */}
        <button
          disabled={isExportingHd}
          onClick={onExportHd}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c1e2b] hover:bg-[#25283a] text-slate-300 hover:text-white border border-[#2c3044] text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
        >
          {isExportingHd ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang Render HD...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
              <span>Render Backend</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
