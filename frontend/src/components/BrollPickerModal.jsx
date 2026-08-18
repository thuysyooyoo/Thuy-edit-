import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Film, 
  Search, 
  Video, 
  Image as ImageIcon, 
  UploadCloud, 
  Check, 
  Clock, 
  Layout, 
  Scissors, 
  Play, 
  Pause,
  Trash2,
  AlertCircle
} from 'lucide-react';

const INITIAL_STOCK_BROLLS = [
  { id: 'sb_1', title: 'Container Cảng Biển & Logistics', category: 'Xuất nhập khẩu', mediaType: 'image', duration: 5, thumb: '🚢', bg: 'from-blue-900 to-indigo-950' },
  { id: 'sb_2', title: 'Kiểm Kê Hàng Hóa Cửa Khẩu', category: 'Thương mại', mediaType: 'image', duration: 4, thumb: '📦', bg: 'from-amber-900 to-yellow-950' },
  { id: 'sb_3', title: 'Doanh Nhân Họp Đàm Phán', category: 'Kinh doanh', mediaType: 'image', duration: 6, thumb: '💼', bg: 'from-slate-900 to-zinc-950' },
  { id: 'sb_4', title: 'Kiểm Định Chất Lượng Tiêu Chuẩn', category: 'Pháp lý', mediaType: 'image', duration: 4, thumb: '🔬', bg: 'from-emerald-900 to-teal-950' },
  { id: 'sb_5', title: 'Văn Phòng Hiện Đại & Máy Tính', category: 'Công nghệ', mediaType: 'image', duration: 5, thumb: '🏢', bg: 'from-cyan-900 to-blue-950' },
  { id: 'sb_6', title: 'Ký Kết Hợp Đồng Pháp Lý', category: 'Pháp lý', mediaType: 'image', duration: 5, thumb: '📑', bg: 'from-purple-900 to-slate-950' },
  { id: 'sb_7', title: 'Dây Chuyền Sản Xuất Nhà Máy', category: 'Sản xuất', mediaType: 'image', duration: 7, thumb: '🏭', bg: 'from-orange-900 to-amber-950' },
  { id: 'sb_8', title: 'Biểu Đồ Tăng Trưởng Doanh Thu', category: 'Tài chính', mediaType: 'image', duration: 4, thumb: '📈', bg: 'from-green-900 to-emerald-950' },
];

export default function BrollPickerModal({ isOpen, onClose, onSelect, timeRange, clipStartTime = 0 }) {
  const [activeTab, setActiveTab] = useState('stock');
  const [stockList, setStockList] = useState(INITIAL_STOCK_BROLLS);
  const [selectedItem, setSelectedItem] = useState(INITIAL_STOCK_BROLLS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Video Trimming In/Out State
  const [videoDuration, setVideoDuration] = useState(10);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(5);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);

  // Main Clip Placement Timing
  const [timingMode, setTimingMode] = useState('phrase'); // 'phrase' | 'custom'
  const phraseStart = timeRange?.start !== undefined ? Math.max(0, timeRange.start - clipStartTime) : 0;
  const phraseEnd = timeRange?.end !== undefined ? Math.max(0, timeRange.end - clipStartTime) : 4;
  
  const [customStart, setCustomStart] = useState(Math.round(phraseStart * 10) / 10);
  const [customEnd, setCustomEnd] = useState(Math.round(phraseEnd * 10) / 10 || 4);

  // B-Roll Layout Style
  const [brollStyle, setBrollStyle] = useState('split_50_50_top');

  const fileInputRef = useRef(null);
  const trimVideoRef = useRef(null);

  // When selectedItem changes, reset trimmer defaults
  useEffect(() => {
    if (selectedItem) {
      setTrimStart(0);
      setTrimEnd(selectedItem.duration || 5);
      setPreviewCurrentTime(0);
      setIsPreviewPlaying(false);
    }
  }, [selectedItem]);

  if (!isOpen) return null;

  const filteredStock = stockList.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUploaded = Array.from(files).map((file, idx) => {
      const isVideo = file.type.startsWith('video') || /\.(mp4|mov|quicktime|webm|avi|mkv|m4v|ts|flv)$/i.test(file.name);
      const url = URL.createObjectURL(file);
      return {
        id: `uploaded_${Date.now()}_${idx}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        category: isVideo ? 'Video Tải Lên' : 'Ảnh Tải Lên',
        mediaType: isVideo ? 'video' : 'image',
        duration: isVideo ? 10 : 5,
        thumb: isVideo ? '🎬' : '🖼️',
        fileUrl: url,
        isCustom: true,
        bg: 'from-indigo-900 to-purple-950'
      };
    });

    setStockList(prev => [...newUploaded, ...prev]);
    setSelectedItem(newUploaded[0]);
    setActiveTab('stock');
  };

  const handleDeleteItem = (e, itemId) => {
    e.stopPropagation();
    const updated = stockList.filter(item => item.id !== itemId);
    setStockList(updated);
    if (selectedItem?.id === itemId) {
      setSelectedItem(updated.length > 0 ? updated[0] : null);
    }
  };

  const handleLoadedMetadata = (e) => {
    const dur = Math.round(e.target.duration * 10) / 10 || 10;
    setVideoDuration(dur);
    setTrimStart(0);
    setTrimEnd(Math.min(dur, Math.max(3, phraseEnd - phraseStart)));
  };

  const handleTogglePreviewPlay = () => {
    if (!trimVideoRef.current) return;
    if (isPreviewPlaying) {
      trimVideoRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      if (trimVideoRef.current.currentTime >= trimEnd || trimVideoRef.current.currentTime < trimStart) {
        trimVideoRef.current.currentTime = trimStart;
      }
      trimVideoRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!trimVideoRef.current) return;
    const cur = trimVideoRef.current.currentTime;
    setPreviewCurrentTime(cur);
    if (cur >= trimEnd) {
      trimVideoRef.current.currentTime = trimStart;
    }
  };

  const handleConfirmInsert = () => {
    if (!selectedItem) return;

    const startSec = timingMode === 'phrase' ? phraseStart : parseFloat(customStart) || 0;
    const endSec = timingMode === 'phrase' ? Math.max(startSec + 1, phraseEnd) : Math.max(startSec + 1, parseFloat(customEnd) || (startSec + 4));
    const isVideo = selectedItem.mediaType === 'video';

    onSelect({
      id: `broll_${Date.now()}`,
      title: selectedItem.title,
      thumb: selectedItem.thumb,
      mediaType: selectedItem.mediaType || 'image',
      fileUrl: selectedItem.fileUrl,
      start: Math.round(startSec * 10) / 10,
      end: Math.round(endSec * 10) / 10,
      duration: Math.round((endSec - startSec) * 10) / 10,
      videoTrimStart: isVideo ? Math.round(trimStart * 10) / 10 : 0,
      videoTrimEnd: isVideo ? Math.round(trimEnd * 10) / 10 : (selectedItem.duration || 5),
      style: brollStyle
    });

    onClose();
  };

  const styleOptions = [
    { id: 'split_50_50_top', name: 'Chia Đôi 50:50 (B-Roll Trên / Video Dưới)', desc: 'Hòa trộn chuyển sắc mềm mại ở đường tiếp giáp' },
    { id: 'split_50_50_bottom', name: 'Chia Đôi 50:50 (Video Trên / B-Roll Dưới)', desc: 'Hòa trộn chuyển sắc mềm mại ở đường tiếp giáp' },
    { id: 'split_30_70_top', name: 'Tỉ Lệ 30:70 (B-Roll 30% Trên / Video 70% Dưới)', desc: 'B-Roll 30% ở đỉnh với viền chuyển tiếp êm' },
    { id: 'split_30_70_bottom', name: 'Tỉ Lệ 30:70 (Video 70% Trên / B-Roll 30% Dưới)', desc: 'B-Roll 30% ở đáy với viền chuyển tiếp êm' },
    { id: 'full_cover', name: 'Chuyển Cảnh Toàn Màn Hình (100% Full Cut)', desc: 'B-Roll phủ kín toàn màn hình, phụ đề vẫn hiển thị phía trên' },
    { id: 'background', name: 'Làm Nền Phía Sau Nhân Vật (Tách Người AI)', desc: 'Bóc tách pixel cơ thể người nói và đặt B-Roll làm nền' },
    { id: 'pip', name: 'Khung Nổi Picture-in-Picture (Góc Trên Phải)', desc: 'Khung video B-Roll nhỏ bo góc đổ bóng nổi bật' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none font-sans">
      <div className="bg-[#11121a] border border-[#262a3d] rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#202334] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Chèn, Tải Lên & Quản Lý B-Roll</h3>
              <p className="text-[11px] text-slate-400">
                Tải lên (MP4, MOV, Ảnh), xóa tư liệu tùy chọn và hòa trộn màu tiếp giáp mượt mà
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-[#1a1c29] text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-12 divide-x divide-[#202334]">
          {/* Left: Library & Upload List */}
          <div className="col-span-6 p-4 space-y-3 overflow-y-auto max-h-[68vh]">
            <div className="flex items-center justify-between gap-2 border-b border-[#1d2030] pb-2 text-xs">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('stock')}
                  className={`pb-1 px-2 font-bold transition-all ${
                    activeTab === 'stock' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Thư Viện ({stockList.length})
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="pb-1 px-2 font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>+ Tải Lên (MP4, MOV, Ảnh...)</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,image/*,.mp4,.mov,.quicktime,.webm,.avi,.mkv,.m4v"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tư liệu..."
                className="w-full bg-[#0a0b10] border border-[#23273a] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Stock / Upload Grid with Delete Button */}
            {filteredStock.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Không tìm thấy tư liệu nào. Hãy bấm <strong>+ Tải Lên</strong> để thêm video/ảnh mới.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredStock.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`relative p-3 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all group ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 shadow-md ring-2 ring-amber-500'
                          : 'bg-[#161824] hover:bg-[#202336] border-[#25283a]'
                      }`}
                    >
                      {/* Delete Button on Card */}
                      <button
                        onClick={(e) => handleDeleteItem(e, item.id)}
                        title="Xóa mục B-Roll này khỏi thư viện"
                        className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-black/70 hover:bg-rose-600 border border-white/20 text-slate-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <div className={`h-20 bg-gradient-to-br ${item.bg || 'from-slate-900 to-black'} rounded-xl flex items-center justify-center text-2xl mb-2 overflow-hidden relative`}>
                        {item.fileUrl ? (
                          item.mediaType === 'video' ? (
                            <video src={item.fileUrl} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={item.fileUrl} alt={item.title} className="w-full h-full object-cover" />
                          )
                        ) : (
                          <span>{item.thumb}</span>
                        )}

                        {item.isCustom && (
                          <span className="absolute bottom-1 left-1 bg-indigo-600/90 text-white font-bold text-[8px] px-1.5 py-0.2 rounded font-mono">
                            Đã Tải Lên
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300">
                          {item.title}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>{item.category}</span>
                          <span className="font-mono text-amber-400 font-semibold">
                            {item.mediaType === 'video' ? `${item.duration}s` : 'Ảnh'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Video Trimmer & Placement Setup */}
          <div className="col-span-6 p-4 space-y-4 overflow-y-auto max-h-[68vh] text-xs">
            {/* 1. Video Trimmer Player (For Video Media) */}
            {selectedItem?.mediaType === 'video' && selectedItem?.fileUrl && (
              <div className="p-3 bg-[#161824] border border-[#262a3d] rounded-2xl space-y-3">
                <div className="flex items-center justify-between font-bold text-white pb-1 border-b border-[#202334]">
                  <div className="flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cắt Đoạn Video Gốc (In/Out Trimmer)</span>
                  </div>
                  <span className="font-mono text-[10px] text-amber-300">
                    Đoạn lấy: {Math.max(0, trimEnd - trimStart).toFixed(1)}s
                  </span>
                </div>

                {/* Mini Player */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                  <video
                    ref={trimVideoRef}
                    src={selectedItem.fileUrl}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onClick={handleTogglePreviewPlay}
                    className="w-full h-full object-contain cursor-pointer"
                    playsInline
                  />
                  {!isPreviewPlaying && (
                    <button
                      onClick={handleTogglePreviewPlay}
                      className="absolute w-10 h-10 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow-lg"
                    >
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </button>
                  )}
                  <span className="absolute bottom-1 right-2 bg-black/80 px-1.5 py-0.5 rounded font-mono text-[9px] text-slate-300">
                    {previewCurrentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
                  </span>
                </div>

                {/* Range Sliders */}
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 font-semibold mb-1">
                      <span>Bắt đầu (In): <strong className="text-amber-400 font-mono">{trimStart.toFixed(1)}s</strong></span>
                      <span>Kết thúc (Out): <strong className="text-amber-400 font-mono">{trimEnd.toFixed(1)}s</strong></span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="range"
                        min="0"
                        max={videoDuration}
                        step="0.2"
                        value={trimStart}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTrimStart(Math.min(val, trimEnd - 0.5));
                          if (trimVideoRef.current) trimVideoRef.current.currentTime = val;
                        }}
                        className="w-full h-1.5 bg-[#25283a] rounded-lg appearance-none accent-amber-500 cursor-pointer"
                      />
                      <input
                        type="range"
                        min="0"
                        max={videoDuration}
                        step="0.2"
                        value={trimEnd}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTrimEnd(Math.max(val, trimStart + 0.5));
                          if (trimVideoRef.current) trimVideoRef.current.currentTime = val;
                        }}
                        className="w-full h-1.5 bg-[#25283a] rounded-lg appearance-none accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Main Clip Placement Timing */}
            <div className="p-3 bg-[#161824] border border-[#262a3d] rounded-2xl space-y-2.5">
              <div className="font-bold text-white flex items-center gap-1.5 pb-1 border-b border-[#202334]">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Thời Lượng Chèn Vào Video Chính</span>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="timing_mode"
                    checked={timingMode === 'phrase'}
                    onChange={() => setTimingMode('phrase')}
                    className="accent-amber-500"
                  />
                  <span>Theo câu văn đã chọn: <strong className="text-amber-300 font-mono">[{phraseStart.toFixed(1)}s - {phraseEnd.toFixed(1)}s]</strong></span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="timing_mode"
                    checked={timingMode === 'custom'}
                    onChange={() => setTimingMode('custom')}
                    className="accent-amber-500"
                  />
                  <span>Tùy chỉnh số giây cụ thể</span>
                </label>

                {timingMode === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400">Từ giây:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={customStart}
                        onChange={(e) => setCustomStart(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#0a0b10] border border-[#2b2f44] text-white rounded-lg px-2.5 py-1 text-xs font-mono mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Đến giây:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#0a0b10] border border-[#2b2f44] text-white rounded-lg px-2.5 py-1 text-xs font-mono mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Display Style Selection with Smooth Boundary Blend Notice */}
            <div className="p-3 bg-[#161824] border border-[#262a3d] rounded-2xl space-y-2">
              <div className="font-bold text-white flex items-center justify-between pb-1 border-b border-[#202334]">
                <div className="flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Phong Cách Hiển Thị B-Roll</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">Hòa trộn mềm</span>
              </div>

              <div className="space-y-1.5">
                {styleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setBrollStyle(opt.id)}
                    className={`w-full p-2 rounded-xl text-left transition-all flex items-center justify-between ${
                      brollStyle === opt.id
                        ? 'bg-indigo-950/60 border border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                        : 'bg-[#10121a] hover:bg-[#1b1e2c] border border-[#23273a] text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{opt.name}</div>
                      <div className="text-[10px] text-slate-400">{opt.desc}</div>
                    </div>
                    {brollStyle === opt.id && <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#202334] bg-[#0c0d14] flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {selectedItem ? (
              <>
                Đã chọn: <strong className="text-white">{selectedItem.title}</strong>
                {selectedItem.mediaType === 'video' && (
                  <span className="text-amber-400 font-mono ml-2 font-bold">
                    (Đoạn cắt: {trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s)
                  </span>
                )}
              </>
            ) : (
              <span className="text-rose-400">Vui lòng chọn một mục B-Roll</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1e2130] text-slate-300 hover:text-white font-bold text-xs"
            >
              Hủy
            </button>
            <button
              disabled={!selectedItem}
              onClick={handleConfirmInsert}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-amber-600/30 active:scale-95 transition-all"
            >
              Chèn Đoạn B-Roll Đã Chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
