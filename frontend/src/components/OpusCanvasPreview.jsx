import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Edit3, Settings, Sparkles, Smile, ShieldAlert, Check, Film, X, UserCheck } from 'lucide-react';

export default function OpusCanvasPreview({ 
  videoRef, 
  clip, 
  words = [], 
  currentTime, 
  captionPreset = 'Karaoke',
  captionEffect = 'pop',
  customTitle,
  setCustomTitle,
  aspectRatio = '9:16',
  videoLayout = 'fill', // 'fill' | 'fit' | 'split'
  faceTrackerEnabled = true,
  isPlaying,
  onTogglePlay,
  onTimeUpdate,
  brolls = [],
  textLayers = [],
  fontStyle = {},
  aiEmoji = false,
  autoCensor = false,
  speakerColors = true,
  watermark = { visible: true, text: 'OPUS STUDIO', pos: 'top-right', opacity: 85 },
  activeTransition = 'zoom_in',
  onSelectElementToCustomize,
  onRemoveTextLayer,
  onRemoveBroll
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(customTitle || clip?.title || '');
  const [transitionTriggered, setTransitionTriggered] = useState(false);
  const [currentTransitionEffect, setCurrentTransitionEffect] = useState(activeTransition);
  const [isAiSegmenting, setIsAiSegmenting] = useState(false);
  
  const brollVideoRef = useRef(null);
  const brollImageRef = useRef(null);
  const segmentationCanvasRef = useRef(null);
  const tempCanvasRef = useRef(null);
  const selfieSegRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastTriggeredSceneTransitionRef = useRef(null);

  const activePhrase = words.filter(w => Math.abs(w.start - currentTime) <= 1.4);

  // Trigger transition effect on scene change or seek
  useEffect(() => {
    setCurrentTransitionEffect(activeTransition);
    setTransitionTriggered(true);
    const timer = setTimeout(() => setTransitionTriggered(false), 450);
    return () => clearTimeout(timer);
  }, [activeTransition, clip?.id]);

  // Trigger dynamic transition effects at each Split Cut point on the timeline
  useEffect(() => {
    if (!clip?.scenes || clip.scenes.length <= 1) return;
    const matchScene = clip.scenes.find(
      s => s.transition && s.transition !== 'none' && Math.abs(s.end_time - currentTime) <= 0.35
    );

    if (matchScene && lastTriggeredSceneTransitionRef.current !== matchScene.id) {
      lastTriggeredSceneTransitionRef.current = matchScene.id;
      setCurrentTransitionEffect(matchScene.transition);
      setTransitionTriggered(true);
      const timer = setTimeout(() => setTransitionTriggered(false), 500);
      return () => clearTimeout(timer);
    } else if (!matchScene) {
      lastTriggeredSceneTransitionRef.current = null;
    }
  }, [currentTime, clip?.scenes]);

  const {
    fontFamily = 'Montserrat',
    fontSize = 38,
    textColor = '#ffffff',
    fontWeight = '900',
    isItalic = false,
    isUnderline = false,
    isUppercase = true,
    strokeColor = '#000000',
    strokeWidth = 6,
    hasShadow = true,
    shadowColor = '#000000',
    shadowX = 2,
    shadowY = 2,
    shadowBlur = 4,
    hasHighlight = true,
    highlightColor = '#04f827'
  } = fontStyle;

  const handleSaveTitle = () => {
    if (setCustomTitle && titleInput.trim()) {
      setCustomTitle(titleInput.trim());
    }
    setEditingTitle(false);
  };

  // Emojis dictionary for AI Emoji feature
  const getWordEmoji = (word) => {
    const clean = word.toLowerCase().replace(/[.,!?\"']/g, '').trim();
    if (['luật', 'quy', 'nghị', 'định'].includes(clean)) return '⚖️';
    if (['tiền', 'giá', 'đô', 'doanh'].includes(clean)) return '💰';
    if (['hàng', 'sản', 'phẩm'].includes(clean)) return '📦';
    if (['rủi', 'ro', 'chết', 'nguy'].includes(clean)) return '⚠️';
    if (['chuẩn', 'đúng', 'xác'].includes(clean)) return '🎯';
    if (['thương', 'thị', 'trường'].includes(clean)) return '📈';
    if (['nhanh', 'tốc', 'siêu'].includes(clean)) return '⚡';
    if (['tuyệt', 'hay', 'tốt'].includes(clean)) return '🔥';
    return null;
  };

  // Active B-Roll in current time range
  const clipStart = clip?.start_time || 0;
  const relTime = currentTime - clipStart;
  const activeBroll = brolls.find(b => relTime >= b.start && relTime <= b.end);

  // Initialize MediaPipe Selfie Segmentation
  useEffect(() => {
    if (window.SelfieSegmentation && !selfieSegRef.current) {
      try {
        const selfieSeg = new window.SelfieSegmentation({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });
        selfieSeg.setOptions({
          modelSelection: 1, // General landscape / portrait model
          selfieMode: false
        });
        selfieSeg.onResults(handleSegmentationResults);
        selfieSegRef.current = selfieSeg;
      } catch (e) {
        console.warn('SelfieSegmentation init error:', e);
      }
    }
  }, []);

  const handleSegmentationResults = (results) => {
    const canvas = segmentationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw B-Roll Background Layer
    if (brollVideoRef.current && (activeBroll?.mediaType === 'video' || activeBroll?.fileUrl?.endsWith('.mp4'))) {
      ctx.drawImage(brollVideoRef.current, 0, 0, canvas.width, canvas.height);
    } else if (brollImageRef.current && brollImageRef.current.complete) {
      ctx.drawImage(brollImageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Create masked Person cutout on a temporary canvas
    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas');
    }
    const tempCanvas = tempCanvasRef.current;
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(results.segmentationMask, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.drawImage(results.image, 0, 0, tempCanvas.width, tempCanvas.height);

    // 3. Draw segmented Person on top of B-Roll background
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    setIsAiSegmenting(true);
  };

  // Real-time animation loop when background cutout mode is active
  useEffect(() => {
    let active = true;

    const processFrame = async () => {
      if (
        active &&
        activeBroll?.style === 'background' &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        selfieSegRef.current
      ) {
        try {
          await selfieSegRef.current.send({ image: videoRef.current });
        } catch (err) {}
      }

      if (active) {
        animFrameIdRef.current = requestAnimationFrame(processFrame);
      }
    };

    if (activeBroll?.style === 'background') {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    } else {
      setIsAiSegmenting(false);
    }

    return () => {
      active = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeBroll, isPlaying]);

  // Synchronize B-Roll video playback with Master Play/Pause state and seek time
  useEffect(() => {
    if (brollVideoRef.current && activeBroll) {
      const isVideo = activeBroll.mediaType === 'video' || activeBroll.fileUrl?.endsWith('.mp4') || activeBroll.fileUrl?.endsWith('.webm') || activeBroll.fileUrl?.endsWith('.mov');
      if (isVideo) {
        if (isPlaying) {
          brollVideoRef.current.play().catch(() => {});
        } else {
          brollVideoRef.current.pause();
        }
      }
    }
  }, [isPlaying, activeBroll]);

  // Synchronize B-Roll video current time with timeline position and trim range
  useEffect(() => {
    if (brollVideoRef.current && activeBroll) {
      const isVideo = activeBroll.mediaType === 'video' || activeBroll.fileUrl?.endsWith('.mp4') || activeBroll.fileUrl?.endsWith('.webm') || activeBroll.fileUrl?.endsWith('.mov');
      if (isVideo) {
        const trimStart = activeBroll.videoTrimStart || 0;
        const trimEnd = (activeBroll.videoTrimEnd && activeBroll.videoTrimEnd > trimStart)
          ? activeBroll.videoTrimEnd
          : (brollVideoRef.current.duration || trimStart + (activeBroll.duration || 5));
        const trimDuration = Math.max(0.5, trimEnd - trimStart);

        const brollElapsed = Math.max(0, relTime - activeBroll.start);
        const targetTime = trimStart + (brollElapsed % trimDuration);

        if (Math.abs(brollVideoRef.current.currentTime - targetTime) > 0.3) {
          brollVideoRef.current.currentTime = targetTime;
        }
      }
    }
  }, [currentTime, activeBroll, relTime]);

  const renderBrollVisual = (broll, extraClass = '') => {
    if (broll.fileUrl) {
      const isVideo = broll.mediaType === 'video' || broll.fileUrl.endsWith('.mp4') || broll.fileUrl.endsWith('.webm') || broll.fileUrl.endsWith('.mov');
      if (isVideo) {
        return (
          <video
            ref={brollVideoRef}
            src={broll.fileUrl}
            autoPlay
            loop
            muted
            playsInline
            className={`w-full h-full object-cover ${extraClass}`}
          />
        );
      }
      return (
        <div className="w-full h-full overflow-hidden">
          <img
            ref={brollImageRef}
            src={broll.fileUrl}
            alt={broll.title}
            crossOrigin="anonymous"
            className={`w-full h-full object-cover animate-ken-burns ${extraClass}`}
          />
        </div>
      );
    }

    return (
      <div className={`w-full h-full bg-gradient-to-br from-amber-900 via-slate-900 to-black flex flex-col items-center justify-center p-3 text-center overflow-hidden ${extraClass}`}>
        <div className="animate-ken-burns flex flex-col items-center justify-center">
          <span className="text-4xl mb-1 drop-shadow-lg">{broll.thumb || '🎬'}</span>
          <span className="text-xs font-black text-amber-300 uppercase tracking-wider line-clamp-1">{broll.title}</span>
          <span className="text-[9px] text-slate-400 font-mono">B-Roll Motion Footage</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-[#090a0f] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* 9:16 Frame Container */}
      <div 
        className={`relative bg-black rounded-xl shadow-2xl overflow-hidden border border-[#2f334a] flex items-center justify-center transition-all duration-300 ${
          aspectRatio === '9:16'
            ? 'w-[290px] sm:w-[320px] md:w-[340px] aspect-[9/16]'
            : 'w-full max-w-[620px] aspect-video'
        }`}
      >
        {/* Blurred background duplicate for 'fit' mode */}
        {videoLayout === 'fit' && !activeBroll && (
          <video
            src="http://127.0.0.1:8000/api/stream/source"
            className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-40 pointer-events-none"
            muted
          />
        )}

        {/* Second speaker feed for 'split' mode */}
        {videoLayout === 'split' && !activeBroll && (
          <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden border-t-2 border-indigo-500">
            <video
              src="http://127.0.0.1:8000/api/stream/source"
              className="w-full h-full object-cover scale-x-[-1]"
              muted
            />
            <span className="absolute bottom-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[8px] text-white font-mono">Speaker 2</span>
          </div>
        )}

        {/* ── REAL-TIME MEDIAPIPE SELFIE SEGMENTATION CANVAS FOR BACKGROUND MODE ── */}
        {activeBroll?.style === 'background' && (
          <canvas
            ref={segmentationCanvasRef}
            width={720}
            height={1280}
            className="absolute inset-0 w-full h-full object-cover z-15"
          />
        )}

        {/* ── 1. MAIN VIDEO LAYER (ALWAYS MOUNTED & NEVER RESETS AUDIO) ── */}
        <div 
          className={`absolute transition-all duration-300 overflow-hidden ${
            activeBroll?.style === 'full_cover' || (activeBroll?.style === 'background' && isAiSegmenting)
              ? 'inset-0 opacity-0 pointer-events-none'
              : activeBroll?.style === 'split_50_50_top'
              ? 'inset-x-0 bottom-0 h-1/2 z-10'
              : activeBroll?.style === 'split_50_50_bottom'
              ? 'inset-x-0 top-0 h-1/2 z-10'
              : activeBroll?.style === 'split_30_70_top'
              ? 'inset-x-0 bottom-0 h-[70%] z-10'
              : activeBroll?.style === 'split_30_70_bottom'
              ? 'inset-x-0 top-0 h-[70%] z-10'
              : activeBroll?.style === 'background'
              ? 'inset-4 rounded-2xl border-2 border-white/60 shadow-2xl z-10'
              : videoLayout === 'split' && !activeBroll
              ? 'inset-x-0 top-0 h-1/2'
              : videoLayout === 'fit' && !activeBroll
              ? 'inset-0 flex items-center justify-center'
              : 'inset-0'
          }`}
        >
          <video
            ref={videoRef}
            src="http://127.0.0.1:8000/api/stream/source"
            onTimeUpdate={(e) => onTimeUpdate(e.target.currentTime)}
            onClick={onTogglePlay}
            className={`w-full h-full ${
              videoLayout === 'fit' && !activeBroll ? 'aspect-video object-contain border-y border-white/20' : 'object-cover'
            } cursor-pointer`}
            playsInline
          />
          {videoLayout === 'split' && !activeBroll && (
            <span className="absolute top-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[8px] text-white font-mono">Speaker 1</span>
          )}
        </div>

        {/* ── 2. B-ROLL VISUAL OVERLAYS (RENDERED BEHIND OR IN FRONT BASED ON STYLE) ── */}
        {activeBroll && (
          <div 
            className={`absolute overflow-hidden transition-all duration-300 ${
              activeBroll.style === 'full_cover' ? 'inset-0 z-15' :
              activeBroll.style === 'split_50_50_top' ? 'inset-x-0 top-0 h-1/2 z-15' :
              activeBroll.style === 'split_50_50_bottom' ? 'inset-x-0 bottom-0 h-1/2 z-15' :
              activeBroll.style === 'split_30_70_top' ? 'inset-x-0 top-0 h-[30%] z-15' :
              activeBroll.style === 'split_30_70_bottom' ? 'inset-x-0 bottom-0 h-[30%] z-15' :
              activeBroll.style === 'background' ? 'inset-0 z-5 scale-105 filter brightness-90' :
              activeBroll.style === 'pip' ? 'top-16 right-3 w-28 h-20 rounded-xl border-2 border-amber-500 shadow-2xl z-20' :
              'inset-0 z-15'
            }`}
          >
            {renderBrollVisual(activeBroll)}
            
            <div className="absolute top-2 left-2 bg-black/75 border border-amber-500/50 px-1.5 py-0.5 rounded text-[8px] text-amber-300 font-mono font-bold z-20 flex items-center gap-1">
              {activeBroll.style === 'background' && <UserCheck className="w-2.5 h-2.5 text-emerald-400" />}
              <span>{activeBroll.style === 'background' ? 'Tách Người AI & Làm Nền: ' : 'B-Roll: '}</span>
              <span>{activeBroll.title}</span>
            </div>
          </div>
        )}

        {/* ── 3. CINEMATIC GRADIENT FEATHERING BLEND SEAM (ĐOẠN TIẾP GIÁP CHUYỂN SẮC MỀM) ── */}
        {activeBroll && (activeBroll.style === 'split_50_50_top' || activeBroll.style === 'split_50_50_bottom') && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-16 pointer-events-none z-25 overflow-hidden flex items-center justify-center">
            {/* Ambient Dark Gradient Feathering */}
            <div className="w-full h-full bg-gradient-to-b from-transparent via-black/85 to-transparent backdrop-blur-[1.5px]" />
            {/* Subtle soft glowing division accent line */}
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
          </div>
        )}

        {activeBroll && activeBroll.style === 'split_30_70_top' && (
          <div className="absolute inset-x-0 top-[30%] -translate-y-1/2 h-16 pointer-events-none z-25 overflow-hidden flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-b from-transparent via-black/85 to-transparent backdrop-blur-[1.5px]" />
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
          </div>
        )}

        {activeBroll && activeBroll.style === 'split_30_70_bottom' && (
          <div className="absolute inset-x-0 top-[70%] -translate-y-1/2 h-16 pointer-events-none z-25 overflow-hidden flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-b from-transparent via-black/85 to-transparent backdrop-blur-[1.5px]" />
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
          </div>
        )}

        {/* ── TRANSITION OVERLAYS ── */}
        {transitionTriggered && (
          <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
            {currentTransitionEffect === 'flash_white' && (
              <div className="absolute inset-0 bg-white animate-fade-out" />
            )}
            {currentTransitionEffect === 'glitch' && (
              <div className="absolute inset-0 bg-indigo-500/30 mix-blend-color-dodge animate-pulse" />
            )}
            {currentTransitionEffect === 'zoom_in' && (
              <div className="absolute inset-0 border-4 border-indigo-400 scale-95 animate-ping opacity-60" />
            )}
            {currentTransitionEffect === 'fade_black' && (
              <div className="absolute inset-0 bg-black animate-fade-out" />
            )}
            {currentTransitionEffect === 'blur' && (
              <div className="absolute inset-0 backdrop-blur-md animate-fade-out" />
            )}
          </div>
        )}

        {/* ── FACE TRACKER OVERLAY ── */}
        {faceTrackerEnabled && (!activeBroll || activeBroll.style !== 'full_cover') && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-[22%] left-[28%] w-[44%] h-[32%] border border-emerald-400/60 rounded-xl shadow-[0_0_15px_rgba(52,211,153,0.3)] flex flex-col justify-between p-1">
              <div className="flex justify-between items-center text-[8px] font-mono text-emerald-300 font-bold bg-black/60 px-1 py-0.2 rounded w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                <span>AI Speaker Tracker 9:16</span>
              </div>
              <div className="self-end text-[7px] font-mono text-emerald-400/80">98% Match</div>
            </div>
          </div>
        )}

        {/* ── WATERMARK / LOGO OVERLAY ── */}
        {watermark.visible && (
          <div 
            style={{ opacity: watermark.opacity / 100 }}
            className={`absolute z-20 pointer-events-none ${
              watermark.pos === 'top-left' ? 'top-4 left-3' :
              watermark.pos === 'bottom-right' ? 'bottom-4 right-3' : 'top-4 right-3'
            }`}
          >
            <div className="px-2 py-1 rounded-md bg-black/60 border border-white/20 text-white font-black text-[10px] tracking-wider uppercase backdrop-blur-xs">
              {watermark.text}
            </div>
          </div>
        )}

        {/* ── CUSTOM TEXT STICKERS ── */}
        {textLayers.map((tl, i) => (
          <div 
            key={i} 
            onClick={(e) => {
              e.stopPropagation();
              onSelectElementToCustomize('text');
            }}
            className="absolute bottom-28 left-3 right-3 text-center cursor-pointer z-20 group"
          >
            <div className="relative inline-block">
              <div className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3 py-1 rounded-lg shadow-xl uppercase tracking-wider border border-indigo-400 hover:scale-105 transition-transform">
                {tl}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTextLayer && onRemoveTextLayer(i);
                }}
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                x
              </button>
            </div>
          </div>
        ))}

        {/* ── TOP HOOK HEADLINE OVERLAY ── */}
        <div className="absolute top-12 left-3 right-3 text-center z-20">
          {editingTitle ? (
            <div className="bg-[#181a26] border border-[#3b4160] p-2 rounded-xl shadow-2xl space-y-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                className="w-full bg-[#0d0e15] border border-[#2c3147] rounded-lg px-2 py-1 text-xs text-white font-bold text-center focus:outline-none"
              />
              <div className="flex justify-center gap-1 text-[10px]">
                <button onClick={() => setEditingTitle(false)} className="px-2 py-0.5 rounded bg-[#25293d] text-slate-300">Hủy</button>
                <button onClick={handleSaveTitle} className="px-2 py-0.5 rounded bg-brand-600 text-white font-bold">Lưu</button>
              </div>
            </div>
          ) : (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onSelectElementToCustomize('title');
                setEditingTitle(true);
                setTitleInput(customTitle || clip?.title || '');
              }}
              title="Click để sửa tiêu đề Hook đỉnh video"
              className="bg-white/95 hover:bg-white text-black font-black text-xs sm:text-sm px-3 py-1.5 rounded-lg shadow-lg inline-block max-w-[90%] leading-snug tracking-tight uppercase border border-white cursor-pointer hover:ring-2 hover:ring-brand-500 transition-all group"
            >
              <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
              <Edit3 className="w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-slate-700 transition-opacity" />
            </div>
          )}
        </div>

        {/* ── SUBTITLE / CAPTION OVERLAY ── */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onSelectElementToCustomize('captions');
          }}
          title="Click vào phụ đề để mở bảng tùy chỉnh Font, Màu sắc, Viền, Bóng"
          className="absolute bottom-12 left-3 right-3 text-center cursor-pointer group z-20"
        >
          {captionPreset !== 'No captions' && activePhrase.length > 0 && (
            <div className="inline-block max-w-[95%] relative p-1.5 rounded-xl group-hover:ring-1 group-hover:ring-brand-400/60 group-hover:bg-black/30 transition-all">
              <p 
                style={{
                  fontFamily: fontFamily,
                  fontSize: `${fontSize * 0.42}px`,
                  color: textColor,
                  fontWeight: fontWeight,
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textDecoration: isUnderline ? 'underline' : 'none',
                  textTransform: isUppercase ? 'uppercase' : 'none',
                  WebkitTextStroke: `${strokeWidth * 0.25}px ${strokeColor}`,
                  textShadow: hasShadow ? `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}` : 'none'
                }}
                className="leading-tight tracking-wider transition-all"
              >
                {activePhrase.slice(0, 5).map((w, idx) => {
                  const isCurrent = currentTime >= w.start && currentTime <= w.end;
                  const wordEmoji = aiEmoji ? getWordEmoji(w.word) : null;
                  
                  let displayWord = w.word;
                  if (autoCensor && ['rủi', 'chết', 'nguy'].includes(w.word.toLowerCase())) {
                    displayWord = '***';
                  }

                  return (
                    <span
                      key={idx}
                      style={{
                        color: isCurrent && hasHighlight ? highlightColor : textColor
                      }}
                      className={`mx-1 inline-block transition-all ${
                        isCurrent ? 'scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] font-black' : ''
                      } ${
                        captionEffect === 'pop' && isCurrent ? 'animate-bounce' :
                        captionEffect === 'glow' && isCurrent ? 'drop-shadow-[0_0_15px_rgba(4,248,39,1)]' : ''
                      }`}
                    >
                      {displayWord}
                      {wordEmoji && isCurrent && (
                        <span className="ml-1 text-sm inline-block animate-bounce">{wordEmoji}</span>
                      )}
                    </span>
                  );
                })}
              </p>
            </div>
          )}
        </div>

        {/* Play icon overlay when paused */}
        {!isPlaying && (
          <div
            onClick={onTogglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs cursor-pointer z-30"
          >
            <div className="w-12 h-12 rounded-full bg-brand-600/90 text-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
