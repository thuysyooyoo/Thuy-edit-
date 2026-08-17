import React, { useState } from 'react';
import { X, Volume2, Play, Check, Music } from 'lucide-react';

const SOUND_FX_LIBRARY = [
  { id: 'whoosh', name: 'Whoosh Fast Swoosh', category: 'Chuyển cảnh', file: 'whoosh.wav', duration: '0.25s', desc: 'Âm thanh lướt gió nhanh khi chuyển ý' },
  { id: 'ding', name: 'Ding Bling Sparkle', category: 'Điểm nhấn', file: 'ding.wav', duration: '0.35s', desc: 'Âm thanh leng keng khi có ý tưởng hay' },
  { id: 'pop', name: 'Pop Bubble Subtitle', category: 'Hiện chữ', file: 'pop.wav', duration: '0.10s', desc: 'Tiếng nổ bong bóng nhẹ khi từ khóa xuất hiện' },
  { id: 'boom', name: 'Cinematic Hit Impact', category: 'Tác động mạnh', file: 'boom.wav', duration: '0.60s', desc: 'Âm trầm điện ảnh cho phân đoạn kịch tính' },
  { id: 'camera', name: 'Camera Shutter Click', category: 'Chụp ảnh', file: 'camera.wav', duration: '0.05s', desc: 'Tiếng chụp ảnh ghi lại khoảnh khắc quan trọng' },
];

export default function SoundFxPickerModal({ isOpen, onClose, onSelect, timestamp }) {
  const [playingId, setPlayingId] = useState(null);

  if (!isOpen) return null;

  const playPreview = (fx) => {
    try {
      const audio = new Audio(`http://127.0.0.1:8000/assets/sounds/${fx.file}`);
      audio.play();
      setPlayingId(fx.id);
      setTimeout(() => setPlayingId(null), 800);
    } catch (e) {
      console.log("Audio play error:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="bg-[#11121a] border border-[#262a3d] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-[#202334] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Chọn Hiệu Ứng Âm Thanh (Sound FX)</h3>
              <p className="text-[11px] text-slate-400">
                Chèn vào vị trí: <strong className="text-rose-400 font-mono">{timestamp?.toFixed(2)}s</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-[#1a1c29] text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of FX */}
        <div className="p-5 space-y-2.5 overflow-y-auto">
          {SOUND_FX_LIBRARY.map((fx) => (
            <div
              key={fx.id}
              className="p-3 bg-[#161824] hover:bg-[#1f2235] border border-[#25283a] hover:border-rose-500/50 rounded-2xl flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => playPreview(fx)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    playingId === fx.id ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-[#222538] text-slate-300 group-hover:text-white'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
                <div>
                  <h4 className="text-xs font-bold text-white">{fx.name}</h4>
                  <p className="text-[10px] text-slate-400">{fx.desc} • <span className="text-rose-300 font-mono">{fx.duration}</span></p>
                </div>
              </div>

              <button
                onClick={() => {
                  playPreview(fx);
                  onSelect(fx);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 border border-rose-500/40 text-xs font-bold text-rose-300 hover:text-white transition-all shadow-sm active:scale-95"
              >
                Chọn Chèn
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
