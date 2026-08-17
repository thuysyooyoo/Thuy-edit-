import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Crop, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Search, 
  Plus, 
  X 
} from 'lucide-react';

export default function OpusTimeline({
  clip,
  currentTime,
  onSeek,
  isPlaying,
  onTogglePlay,
  totalDuration = 142.17,
  brolls = [],
  soundFxMarkers = [],
  textLayers = [],
  onSplitAtPlayhead,
  onDeleteSelectedLayer,
  onAddMediaTrack,
  onOpenAudioTab,
  onUpdateSoundFxTime,
  onDeleteSoundFx,
  onDeleteBroll
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [selectedBrollId, setSelectedBrollId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const volumeRef = useRef(null);
  const containerTrackRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (volumeRef.current && !volumeRef.current.contains(event.target)) {
        setIsVolumeOpen(false);
      }
      if (event.target.closest('.sound-fx-marker') === null) {
        setSelectedMarkerId(null);
      }
      if (event.target.closest('.broll-track-block') === null) {
        setSelectedBrollId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clipStart = clip?.start_time || 0;
  const clipEnd = clip?.end_time || 60;
  const clipDuration = Math.max(1, clipEnd - clipStart);

  // Global mouse handlers for Drag and Drop on Timeline Markers
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!draggingId || !containerTrackRef.current) return;
      
      const rect = containerTrackRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const newRelTime = ratio * clipDuration;
      
      if (onUpdateSoundFxTime) {
        onUpdateSoundFxTime(draggingId, newRelTime);
      }
    };

    const handleGlobalMouseUp = () => {
      if (draggingId) {
        setDraggingId(null);
      }
    };

    if (draggingId) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingId, clipDuration, onUpdateSoundFxTime]);

  const handleMarkerMouseDown = (e, markerId) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingId(markerId);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.max(0, Math.min(100, ((currentTime - clipStart) / clipDuration) * 100));

  return (
    <div className={`${isCollapsed ? 'h-14' : 'h-40'} bg-[#090a0f] border-t border-[#1c1f2e] flex flex-col justify-between p-2 select-none font-sans transition-all duration-200`}>
      {/* ── Top Controls Bar ── */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <span className="w-4 h-4 rounded-md border border-slate-500 flex items-center justify-center text-[9px] font-bold">
              {isCollapsed ? '+' : '-'}
            </span>
            <span className="font-semibold text-slate-200">{isCollapsed ? 'Show timeline' : 'Hide timeline'}</span>
          </button>

          <div className="h-3.5 w-[1px] bg-[#242738] mx-0.5" />

          <button 
            onClick={onSplitAtPlayhead}
            title="Cắt tách phân cảnh (Split)" 
            className="p-1 rounded-lg hover:bg-[#1c1e2b] text-slate-300 hover:text-white transition-colors"
          >
            <Crop className="w-4 h-4" />
          </button>

          <button 
            onClick={onDeleteSelectedLayer}
            title="Xóa phân cảnh / layer được chọn" 
            className="p-1 rounded-lg hover:bg-[#1c1e2b] text-slate-300 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="relative" ref={volumeRef}>
            <button 
              onClick={() => setIsVolumeOpen(!isVolumeOpen)}
              className="p-1 rounded-lg hover:bg-[#1c1e2b] text-slate-300 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {isVolumeOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#141622] border border-[#2d3248] rounded-xl shadow-2xl p-3 z-50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Âm lượng</span>
                  <span className="font-mono text-indigo-400">{isMuted ? '0%' : `${volume}%`}</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="150"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseInt(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-full h-1.5 bg-[#25283a] rounded-lg appearance-none accent-indigo-500 cursor-pointer"
                />

                <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-1 border-t border-[#222638]">
                  <input
                    type="checkbox"
                    checked={isMuted}
                    onChange={(e) => setIsMuted(e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Tắt tiếng (Mute)</span>
                </label>
              </div>
            )}
          </div>

          <button 
            onClick={onOpenAudioTab}
            className="p-1.5 rounded-lg bg-[#1e2130] text-slate-200 border border-[#2c3044] hover:text-white hover:bg-[#282d42] transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => onSeek(clipStart)}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-md"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button 
            onClick={() => onSeek(clipEnd)}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs font-bold text-white tracking-wide ml-1">
            {formatTime(currentTime - clipStart)} <span className="text-slate-500 font-normal">/ {formatTime(clipDuration)}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
            className="w-24 h-1 bg-[#232738] rounded-lg appearance-none accent-white cursor-pointer"
          />
        </div>
      </div>

      {/* ── Tracks Container ── */}
      {!isCollapsed && (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={onAddMediaTrack}
            className="w-8 h-22 rounded-xl bg-[#131520] hover:bg-[#1e2030] border border-[#24273a] text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="Thêm B-Roll hoặc Phương tiện"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div 
            ref={containerTrackRef}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              onSeek(clipStart + ratio * clipDuration);
            }}
            className="flex-1 relative bg-[#07080d] h-24 rounded-xl border border-[#1d2030] overflow-hidden cursor-pointer group flex flex-col justify-between"
          >
            {/* Timecode Ruler */}
            <div className="h-4 px-3 flex items-center justify-between text-[9px] font-mono text-slate-500 border-b border-[#161824]">
              <span>0s</span>
              <span>{(clipDuration * 0.25).toFixed(0)}s</span>
              <span>{(clipDuration * 0.5).toFixed(0)}s</span>
              <span>{(clipDuration * 0.75).toFixed(0)}s</span>
              <span>{clipDuration.toFixed(0)}s</span>
            </div>

            {/* Track 1: Tags & Draggable Sound FX & B-Roll Blocks */}
            <div className="h-6 px-2 relative flex items-center gap-1.5 z-10">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#244b32] text-[#4ade80] border border-[#22c55e]/40 flex items-center gap-1">
                <span>T</span>
                <span>Luật</span>
              </span>

              {/* Sound FX Markers */}
              {soundFxMarkers.map((s) => {
                const markerPercent = Math.max(0, Math.min(95, (s.time / clipDuration) * 100));
                const isSelected = selectedMarkerId === s.id;
                
                return (
                  <div
                    key={s.id}
                    style={{ left: `${markerPercent}%` }}
                    onMouseDown={(e) => handleMarkerMouseDown(e, s.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMarkerId(s.id);
                    }}
                    className={`sound-fx-marker absolute top-0.5 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold text-[9px] border shadow-md cursor-grab active:cursor-grabbing transition-all ${
                      isSelected
                        ? 'bg-rose-700 text-white border-white scale-105 ring-2 ring-indigo-400 z-30'
                        : 'bg-rose-600 text-white border-rose-400 hover:bg-rose-500'
                    }`}
                  >
                    <span>FX:</span>
                    <span className="truncate max-w-[70px]">{s.name} ({s.time.toFixed(1)}s)</span>
                    
                    {isSelected && (
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteSoundFx) {
                            onDeleteSoundFx(s.id);
                          }
                          setSelectedMarkerId(null);
                        }}
                        className="ml-1 w-3 h-3 rounded-full bg-white text-rose-600 text-[8px] font-black flex items-center justify-center hover:bg-rose-100 transition-colors"
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}

              {/* B-Roll Track Blocks */}
              {brolls.map((b) => {
                const startPercent = Math.max(0, Math.min(95, (b.start / clipDuration) * 100));
                const widthPercent = Math.max(6, Math.min(100 - startPercent, (b.duration / clipDuration) * 100));
                const isSelected = selectedBrollId === b.id;

                return (
                  <div
                    key={b.id || `b_${b.start}`}
                    style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBrollId(b.id);
                    }}
                    className={`broll-track-block absolute top-0.5 h-5 rounded-md border flex items-center justify-between px-1.5 text-[9px] font-bold shadow-md cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white border-white ring-2 ring-amber-400 z-30'
                        : 'bg-amber-600/80 hover:bg-amber-600 text-white border-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-1 truncate">
                      <span>{b.thumb || '🎬'}</span>
                      <span className="truncate">{b.title}</span>
                      <span className="text-[8px] opacity-80 font-mono">({b.style || '50:50'})</span>
                    </div>

                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteBroll) {
                            onDeleteBroll(b.id);
                          }
                          setSelectedBrollId(null);
                        }}
                        className="ml-1 w-3 h-3 rounded-full bg-white text-amber-800 text-[8px] font-black flex items-center justify-center hover:bg-amber-100 transition-colors shrink-0"
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Track 2 & 3: Video Filmstrip & Audio Waveform */}
            <div className="flex-1 relative flex items-center overflow-hidden bg-[#07080d] border-t border-[#181a26]">
              <div className="absolute inset-0 flex items-center opacity-50">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="flex-1 h-full border-r border-[#151724] bg-gradient-to-b from-[#1b1e2c] to-[#0e1017]" 
                  />
                ))}
              </div>

              <div className="absolute inset-0 flex items-center justify-around px-2 z-10 pointer-events-none opacity-70">
                {Array.from({ length: 140 }).map((_, i) => {
                  const h = 12 + Math.sin(i * 0.4) * 12 + (i % 6) * 4;
                  return (
                    <div
                      key={i}
                      className="w-[1.5px] bg-slate-400/80 rounded-full"
                      style={{ height: `${Math.min(22, h)}px` }}
                    />
                  );
                })}
              </div>

              <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-slate-600/60 flex items-center justify-center text-[8px] text-white font-mono cursor-ew-resize">
                ||
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-slate-600/60 flex items-center justify-center text-[8px] text-white font-mono cursor-ew-resize">
                ||
              </div>
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-[1.5px] bg-white z-30 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,1)]"
              style={{ left: `${progressPercent}%` }}
            >
              <div className="absolute -top-1 -left-[6px] w-3.5 h-5 rounded-full bg-white text-black font-bold text-[9px] flex items-center justify-center shadow-lg border border-black/30">
                0
              </div>
            </div>
          </div>

          <button
            onClick={onAddMediaTrack}
            className="w-8 h-22 rounded-xl bg-[#131520] hover:bg-[#1e2030] border border-[#24273a] text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="Thêm B-Roll hoặc Phương tiện"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
