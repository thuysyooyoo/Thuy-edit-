import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Edit3, 
  Settings, 
  Sparkles, 
  Smile, 
  ShieldAlert, 
  Check, 
  Film, 
  X, 
  UserCheck, 
  Move, 
  Crown, 
  ZoomIn, 
  ZoomOut, 
  Trash2, 
  Plus, 
  Minus, 
  Type,
  Maximize2
} from 'lucide-react';

export default function OpusCanvasPreview({ 
  videoRef, 
  clip, 
  words = [], 
  currentTime, 
  captionPreset = 'Karaoke',
  setCaptionPreset,
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
  setFontStyle,
  aiEmoji = false,
  autoCensor = false,
  speakerColors = true,
  brandConfig = { showLogo: true, logoUrl: null, logoText: 'OPUS STUDIO', logoSize: 65, logoOpacity: 90, pos: { x: 82, y: 6 } },
  onUpdateBrandConfig,
  titleConfig = { visible: true, style: 'pill_white', scale: 100, pos: { x: 50, y: 10 } },
  onUpdateTitleConfig,
  captionConfig = { visible: true, scale: 100, pos: { x: 50, y: 84 } },
  onUpdateCaptionConfig,
  captionPos = { x: 50, y: 84 },
  onUpdateCaptionPos,
  onUpdateTextLayer,
  onUpdateTextLayerPos,
  activeTransition = 'zoom_in',
  onSelectElementToCustomize,
  onRemoveTextLayer,
  onRemoveBroll,
  onEditPhraseText
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(customTitle || clip?.title || '');
  const [editingPhraseModal, setEditingPhraseModal] = useState(null);
  const [editingTextLayerModal, setEditingTextLayerModal] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null); // { type: 'title' | 'caption' | 'logo' | 'textLayer' | 'broll', id: null }

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
  const canvasContainerRef = useRef(null);

  // Drag & Resize states
  const [activeDragging, setActiveDragging] = useState(null);
  const [activeResizing, setActiveResizing] = useState(null);

  // Start Move / Drag
  const startDragging = (e, type, id = null, currentPos) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElement({ type, id });
    setActiveDragging({
      type,
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: currentPos?.x ?? 50,
      startPosY: currentPos?.y ?? 50
    });
  };

  // Start Resize / Scale Handle
  const startResizing = (e, type, id = null, currentScale, currentSize) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElement({ type, id });
    setActiveResizing({
      type,
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startScale: currentScale || 100,
      startSize: currentSize || 65,
      startFontSize: fontStyle?.fontSize || 40
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      // DRAGGING
      if (activeDragging && canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        const deltaXPct = ((e.clientX - activeDragging.startMouseX) / rect.width) * 100;
        const deltaYPct = ((e.clientY - activeDragging.startMouseY) / rect.height) * 100;
        const newX = Math.max(6, Math.min(94, Math.round(activeDragging.startPosX + deltaXPct)));
        const newY = Math.max(5, Math.min(95, Math.round(activeDragging.startPosY + deltaYPct)));

        if (activeDragging.type === 'title' && onUpdateTitleConfig) {
          onUpdateTitleConfig(prev => ({ ...prev, pos: { x: newX, y: newY } }));
        } else if (activeDragging.type === 'caption') {
          if (onUpdateCaptionConfig) onUpdateCaptionConfig(prev => ({ ...prev, pos: { x: newX, y: newY } }));
          if (onUpdateCaptionPos) onUpdateCaptionPos({ x: newX, y: newY });
        } else if (activeDragging.type === 'logo' && onUpdateBrandConfig) {
          onUpdateBrandConfig(prev => ({ ...prev, pos: { x: newX, y: newY } }));
        } else if (activeDragging.type === 'textLayer' && onUpdateTextLayerPos) {
          onUpdateTextLayerPos(activeDragging.id, { x: newX, y: newY });
        }
      }

      // RESIZING
      if (activeResizing && canvasContainerRef.current) {
        const delta = (e.clientX - activeResizing.startMouseX) + (e.clientY - activeResizing.startMouseY);

        if (activeResizing.type === 'title' && onUpdateTitleConfig) {
          const newScale = Math.max(50, Math.min(250, Math.round(activeResizing.startScale + delta * 0.6)));
          onUpdateTitleConfig(prev => ({ ...prev, scale: newScale }));
        } else if (activeResizing.type === 'caption') {
          const newScale = Math.max(50, Math.min(250, Math.round(activeResizing.startScale + delta * 0.6)));
          if (onUpdateCaptionConfig) onUpdateCaptionConfig(prev => ({ ...prev, scale: newScale }));
          if (setFontStyle) {
            const newFontSize = Math.max(18, Math.min(80, Math.round(activeResizing.startFontSize + delta * 0.2)));
            setFontStyle(prev => ({ ...prev, fontSize: newFontSize }));
          }
        } else if (activeResizing.type === 'logo' && onUpdateBrandConfig) {
          const newSize = Math.max(25, Math.min(200, Math.round(activeResizing.startSize + delta * 0.5)));
          onUpdateBrandConfig(prev => ({ ...prev, logoSize: newSize }));
        } else if (activeResizing.type === 'textLayer' && onUpdateTextLayer) {
          const newScale = Math.max(50, Math.min(250, Math.round(activeResizing.startScale + delta * 0.6)));
          onUpdateTextLayer(activeResizing.id, { scale: newScale });
        }
      }
    };

    const handleMouseUp = () => {
      if (activeDragging) setActiveDragging(null);
      if (activeResizing) setActiveResizing(null);
    };

    if (activeDragging || activeResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDragging, activeResizing, onUpdateTitleConfig, onUpdateCaptionConfig, onUpdateCaptionPos, onUpdateBrandConfig, onUpdateTextLayer, onUpdateTextLayerPos, setFontStyle]);

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

  const handleSavePhraseEdit = (newText) => {
    if (editingPhraseModal && onEditPhraseText && newText.trim()) {
      const matchIndices = editingPhraseModal.words.map(w => words.findIndex(item => item === w)).filter(idx => idx !== -1);
      if (matchIndices.length > 0) {
        onEditPhraseText(matchIndices, newText.trim());
      }
    }
    setEditingPhraseModal(null);
  };

  // Emojis dictionary for AI Emoji feature
  const getWordEmoji = (word) => {
    const clean = word.toLowerCase().replace(/[.,!?\"']/g, '');
    const emojiMap = {
      'tiền': '💵', 'triệu': '💰', 'tỷ': '💎', 'doanh': '📈', 'thu': '📊',
      'xe': '🚗', 'nhà': '🏡', 'ăn': '🍕', 'uống': '🥤', 'ngủ': '😴',
      'yêu': '❤️', 'thích': '🔥', 'hot': '⚡', 'viral': '🚀', 'cảnh': '⚠️',
      'bí': '🤫', 'quyết': '🔑', 'mẹo': '💡', 'nguy': '🚨', 'thành': '🏆'
    };
    return emojiMap[clean] || null;
  };

  const activeBroll = brolls.find(b => currentTime >= b.start && currentTime <= b.end);

  // Sync B-Roll video with main player
  useEffect(() => {
    if (activeBroll && brollVideoRef.current) {
      const offset = currentTime - activeBroll.start;
      if (Math.abs(brollVideoRef.current.currentTime - offset) > 0.3) {
        brollVideoRef.current.currentTime = offset;
      }
      if (isPlaying && brollVideoRef.current.paused) {
        brollVideoRef.current.play().catch(() => {});
      } else if (!isPlaying && !brollVideoRef.current.paused) {
        brollVideoRef.current.pause();
      }
    }
  }, [currentTime, isPlaying, activeBroll]);

  // Render floating action toolbar for selected canvas element
  const renderElementToolbar = (type, id, onZoomIn, onZoomOut, onEdit, onDelete, label = '') => {
    return (
      <div 
        onClick={(e) => e.stopPropagation()}
        className="absolute -top-9 left-1/2 -translate-x-1/2 z-40 bg-[#121422]/95 border border-[#333852] rounded-xl shadow-2xl p-1 flex items-center gap-1 backdrop-blur-md animate-fade-in text-[10px]"
      >
        <span className="text-[9px] font-bold text-slate-300 px-1.5 font-mono uppercase truncate max-w-[80px]">
          {label}
        </span>
        <div className="w-[1px] h-3 bg-white/20" />
        
        {/* Zoom Out */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onZoomOut && onZoomOut();
          }}
          title="Thu nhỏ kích thước"
          className="w-5 h-5 rounded-lg bg-[#202438] hover:bg-[#2c324e] text-slate-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          <Minus className="w-3 h-3" />
        </button>

        {/* Zoom In */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onZoomIn && onZoomIn();
          }}
          title="Phóng to kích thước"
          className="w-5 h-5 rounded-lg bg-[#202438] hover:bg-[#2c324e] text-slate-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          <Plus className="w-3 h-3" />
        </button>

        {/* Edit */}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Chỉnh sửa nội dung / kiểu dáng"
            className="px-1.5 h-5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold flex items-center gap-0.5 transition-all hover:scale-105"
          >
            <Edit3 className="w-2.5 h-2.5" />
            <span>Sửa</span>
          </button>
        )}

        {/* Delete */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Xóa / Ẩn phần tử này"
            className="w-5 h-5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const renderBrollVisual = (broll, extraClass = '') => {
    if (broll.videoUrl) {
      return (
        <video
          ref={brollVideoRef}
          src={broll.videoUrl}
          className={`w-full h-full object-cover ${extraClass}`}
          muted
          playsInline
          loop
        />
      );
    }

    if (broll.imageUrl) {
      return (
        <div className={`w-full h-full relative overflow-hidden ${extraClass}`}>
          <img
            ref={brollImageRef}
            src={broll.imageUrl}
            alt={broll.title}
            className="w-full h-full object-cover animate-ken-burns filter brightness-95"
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
    <div 
      onClick={() => setSelectedElement(null)}
      className="h-full bg-[#090a0f] flex items-center justify-center p-4 relative overflow-hidden select-none"
    >
      {/* 9:16 Frame Container */}
      <div 
        ref={canvasContainerRef}
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
            onClick={(e) => {
              e.stopPropagation();
              setSelectedElement({ type: 'broll', id: activeBroll.id });
            }}
            className={`absolute overflow-hidden transition-all duration-300 ${
              activeBroll.style === 'full_cover' ? 'inset-0 z-15' :
              activeBroll.style === 'split_50_50_top' ? 'inset-x-0 top-0 h-1/2 z-15' :
              activeBroll.style === 'split_50_50_bottom' ? 'inset-x-0 bottom-0 h-1/2 z-15' :
              activeBroll.style === 'split_30_70_top' ? 'inset-x-0 top-0 h-[30%] z-15' :
              activeBroll.style === 'split_30_70_bottom' ? 'inset-x-0 bottom-0 h-[30%] z-15' :
              activeBroll.style === 'background' ? 'inset-0 z-5 scale-105 filter brightness-90' :
              activeBroll.style === 'pip' ? 'top-16 right-3 w-28 h-20 rounded-xl border-2 border-amber-500 shadow-2xl z-20' :
              'inset-0 z-15'
            } ${selectedElement?.type === 'broll' ? 'ring-2 ring-amber-400' : ''}`}
          >
            {renderBrollVisual(activeBroll)}
            
            {/* B-Roll Header Tag */}
            <div className="absolute top-2 left-2 bg-black/75 border border-amber-500/50 px-1.5 py-0.5 rounded text-[8px] text-amber-300 font-mono font-bold z-20 flex items-center gap-1">
              {activeBroll.style === 'background' && <UserCheck className="w-2.5 h-2.5 text-emerald-400" />}
              <span>{activeBroll.style === 'background' ? 'Tách Người AI & Làm Nền: ' : 'B-Roll: '}</span>
              <span>{activeBroll.title}</span>
            </div>

            {/* Quick Delete B-Roll Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveBroll && onRemoveBroll(activeBroll.id);
              }}
              title="Xóa B-Roll này khỏi video"
              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center z-25 shadow-lg active:scale-95"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── SOFT AMBIENT GRADIENT FEATHERING BLEND SEAMS (CHO PHONG CÁCH 50:50 & 30:70) ── */}
        {activeBroll && (activeBroll.style === 'split_50_50_top' || activeBroll.style === 'split_50_50_bottom') && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-16 pointer-events-none z-25 overflow-hidden flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-b from-transparent via-black/85 to-transparent backdrop-blur-[1.5px]" />
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

        {/* ═════════════════════════════════════════════════════════════════════════════════
            1. BRAND LOGO / WATERMARK OVERLAY (DI CHUYỂN, ZOOM TO NHỎ, SỬA & XÓA)
           ═════════════════════════════════════════════════════════════════════════════════ */}
        {brandConfig?.showLogo && (
          <div 
            style={{ 
              top: `${brandConfig.pos?.y ?? 6}%`, 
              left: `${brandConfig.pos?.x ?? 82}%`,
              transform: 'translate(-50%, -50%)',
              opacity: (brandConfig.logoOpacity ?? 90) / 100 
            }}
            onMouseDown={(e) => startDragging(e, 'logo', null, brandConfig.pos || { x: 82, y: 6 })}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedElement({ type: 'logo', id: null });
            }}
            className={`absolute z-35 cursor-move group select-none transition-shadow ${
              selectedElement?.type === 'logo' ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-black rounded-xl' : ''
            }`}
            title="Kéo di chuyển, kéo góc dưới phải để zoom to nhỏ"
          >
            {/* Quick Action Toolbar */}
            {selectedElement?.type === 'logo' && renderElementToolbar(
              'logo',
              null,
              () => onUpdateBrandConfig && onUpdateBrandConfig(prev => ({ ...prev, logoSize: Math.min(200, (prev.logoSize || 65) + 8) })),
              () => onUpdateBrandConfig && onUpdateBrandConfig(prev => ({ ...prev, logoSize: Math.max(25, (prev.logoSize || 65) - 8) })),
              () => onSelectElementToCustomize && onSelectElementToCustomize('brand'),
              () => onUpdateBrandConfig && onUpdateBrandConfig(prev => ({ ...prev, showLogo: false })),
              'Logo'
            )}

            <div className="relative p-1 rounded-xl group-hover:ring-1 group-hover:ring-indigo-400/60 group-hover:bg-black/40 transition-all flex items-center gap-1.5">
              {brandConfig?.logoUrl ? (
                <img 
                  src={brandConfig.logoUrl} 
                  alt="Brand Logo" 
                  style={{ width: `${brandConfig.logoSize || 65}px` }}
                  className="object-contain drop-shadow-md pointer-events-none"
                />
              ) : (
                <div 
                  style={{ fontSize: `${Math.round((brandConfig.logoSize || 65) * 0.16)}px` }}
                  className="px-2.5 py-1 rounded-md bg-black/75 border border-white/25 text-white font-black tracking-wider uppercase backdrop-blur-xs shadow-md"
                >
                  {brandConfig?.logoText || 'OPUS STUDIO'}
                </div>
              )}

              {/* Corner Resize Handle */}
              <div
                onMouseDown={(e) => startResizing(e, 'logo', null, 100, brandConfig.logoSize || 65)}
                className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                title="Kéo góc để phóng to / thu nhỏ Logo"
              >
                <Maximize2 className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════════════
            2. CUSTOM TEXT STICKERS (DI CHUYỂN, ZOOM TO NHỎ, SỬA & XÓA)
           ═════════════════════════════════════════════════════════════════════════════════ */}
        {textLayers.map((tl, i) => {
          const textObj = typeof tl === 'string' ? { id: `tl_${i}`, text: tl, style: 'header', scale: 100, pos: { x: 50, y: 60 + i * 8 } } : tl;
          const currentPos = textObj.pos || { x: 50, y: 60 + i * 8 };
          const currentScale = textObj.scale || 100;
          const isSelected = selectedElement?.type === 'textLayer' && selectedElement?.id === textObj.id;

          return (
            <div 
              key={textObj.id || i}
              style={{
                top: `${currentPos.y}%`,
                left: `${currentPos.x}%`,
                transform: `translate(-50%, -50%) scale(${currentScale / 100})`
              }}
              onMouseDown={(e) => startDragging(e, 'textLayer', textObj.id, currentPos)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement({ type: 'textLayer', id: textObj.id });
              }}
              className={`absolute z-35 cursor-move group select-none text-center ${
                isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-black rounded-xl' : ''
              }`}
              title="Kéo di chuyển, kéo góc dưới phải để zoom to nhỏ"
            >
              {/* Quick Action Toolbar */}
              {isSelected && renderElementToolbar(
                'textLayer',
                textObj.id,
                () => onUpdateTextLayer && onUpdateTextLayer(textObj.id, { scale: Math.min(250, currentScale + 15) }),
                () => onUpdateTextLayer && onUpdateTextLayer(textObj.id, { scale: Math.max(50, currentScale - 15) }),
                () => setEditingTextLayerModal(textObj),
                () => onRemoveTextLayer && onRemoveTextLayer(textObj.id || i),
                'Text'
              )}

              <div className="relative inline-block">
                {textObj.style === 'neon_tag' ? (
                  <div className="bg-black/90 text-emerald-300 font-bold text-xs px-3.5 py-1 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.8)] border border-emerald-400 uppercase tracking-wider">
                    {textObj.text}
                  </div>
                ) : textObj.style === 'gradient_badge' ? (
                  <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-white font-black text-xs px-3.5 py-1 rounded-xl shadow-xl border border-amber-300 uppercase tracking-wider">
                    {textObj.text}
                  </div>
                ) : textObj.style === 'callout_box' ? (
                  <div className="bg-[#12141f]/90 backdrop-blur-md text-slate-200 font-medium text-xs px-3 py-1 rounded-xl border border-[#30354e] shadow-lg">
                    {textObj.text}
                  </div>
                ) : textObj.style === 'yellow_impact' ? (
                  <div className="text-yellow-300 font-black text-sm uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,1)] px-2 py-0.5">
                    {textObj.text}
                  </div>
                ) : (
                  <div className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3 py-1 rounded-lg shadow-xl uppercase tracking-wider border border-indigo-400">
                    {textObj.text}
                  </div>
                )}

                {/* Corner Resize Handle */}
                <div
                  onMouseDown={(e) => startResizing(e, 'textLayer', textObj.id, currentScale, 65)}
                  className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  title="Kéo góc để phóng to / thu nhỏ chữ"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
          );
        })}

        {/* ═════════════════════════════════════════════════════════════════════════════════
            3. TOP HOOK HEADLINE OVERLAY (DI CHUYỂN, ZOOM TO NHỎ, SỬA & XÓA)
           ═════════════════════════════════════════════════════════════════════════════════ */}
        {titleConfig?.visible !== false && (
          <div 
            style={{
              top: `${titleConfig?.pos?.y ?? 10}%`,
              left: `${titleConfig?.pos?.x ?? 50}%`,
              transform: `translate(-50%, -50%) scale(${(titleConfig?.scale ?? 100) / 100})`
            }}
            onMouseDown={(e) => !editingTitle && startDragging(e, 'title', null, titleConfig?.pos || { x: 50, y: 10 })}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedElement({ type: 'title', id: null });
            }}
            className={`absolute z-35 cursor-move group select-none text-center max-w-[92%] ${
              selectedElement?.type === 'title' ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black rounded-xl' : ''
            }`}
            title="Kéo di chuyển, kéo góc dưới phải để zoom to nhỏ"
          >
            {/* Quick Action Toolbar */}
            {selectedElement?.type === 'title' && !editingTitle && renderElementToolbar(
              'title',
              null,
              () => onUpdateTitleConfig && onUpdateTitleConfig(prev => ({ ...prev, scale: Math.min(250, (prev.scale || 100) + 15) })),
              () => onUpdateTitleConfig && onUpdateTitleConfig(prev => ({ ...prev, scale: Math.max(50, (prev.scale || 100) - 15) })),
              () => {
                setEditingTitle(true);
                setTitleInput(customTitle || clip?.title || '');
              },
              () => onUpdateTitleConfig && onUpdateTitleConfig(prev => ({ ...prev, visible: false })),
              'Tiêu Đề'
            )}

            {editingTitle ? (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-[#181a26] border border-[#3b4160] p-2 rounded-xl shadow-2xl space-y-2 cursor-default"
              >
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
              <div className="relative inline-block group-hover:scale-105 transition-transform">
                {titleConfig?.style === 'neon_cyber' ? (
                  <div className="bg-black/90 text-emerald-300 font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] uppercase tracking-tight">
                    <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
                    <Edit3 className="w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-emerald-300 transition-opacity" />
                  </div>
                ) : titleConfig?.style === 'gradient_gold' ? (
                  <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl shadow-2xl border border-yellow-200 uppercase tracking-tight">
                    <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
                    <Edit3 className="w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-black transition-opacity" />
                  </div>
                ) : titleConfig?.style === 'yellow_impact' ? (
                  <div className="text-yellow-300 font-black text-sm sm:text-base px-3 py-1 drop-shadow-[0_4px_8px_rgba(0,0,0,1)] uppercase tracking-tight">
                    <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
                    <Edit3 className="w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-yellow-300 transition-opacity" />
                  </div>
                ) : titleConfig?.style === 'minimal' ? (
                  <div className="bg-black/60 backdrop-blur-md text-white font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border border-white/20 shadow-lg uppercase tracking-tight">
                    <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
                    <Edit3 className="w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-white transition-opacity" />
                  </div>
                ) : (
                  <div className="bg-white/95 hover:bg-white text-black font-black text-xs sm:text-sm px-3 py-1.5 rounded-lg shadow-lg inline-block leading-snug tracking-tight uppercase border border-white">
                    <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
                    <Edit3 className="w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-slate-700 transition-opacity" />
                  </div>
                )}

                {/* Corner Resize Handle */}
                <div
                  onMouseDown={(e) => startResizing(e, 'title', null, titleConfig?.scale ?? 100, 65)}
                  className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  title="Kéo góc để phóng to / thu nhỏ Tiêu đề"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════════════
            4. SUBTITLE / DYNAMIC CAPTIONS (DI CHUYỂN, ZOOM TO NHỎ, SỬA LỜI THOẠI & XÓA)
           ═════════════════════════════════════════════════════════════════════════════════ */}
        {captionPreset !== 'No captions' && captionConfig?.visible !== false && activePhrase.length > 0 && (
          <div 
            style={{
              top: `${captionConfig?.pos?.y ?? captionPos?.y ?? 84}%`,
              left: `${captionConfig?.pos?.x ?? captionPos?.x ?? 50}%`,
              transform: `translate(-50%, -50%) scale(${(captionConfig?.scale ?? 100) / 100})`
            }}
            onMouseDown={(e) => startDragging(e, 'caption', null, captionConfig?.pos || captionPos || { x: 50, y: 84 })}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedElement({ type: 'caption', id: null });
            }}
            title="Kéo di chuyển, kéo góc dưới phải để zoom to nhỏ phụ đề"
            className={`absolute z-35 cursor-move group select-none text-center max-w-[95%] ${
              selectedElement?.type === 'caption' ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-black rounded-xl' : ''
            }`}
          >
            {/* Quick Action Toolbar */}
            {selectedElement?.type === 'caption' && renderElementToolbar(
              'caption',
              null,
              () => {
                if (setFontStyle) setFontStyle(prev => ({ ...prev, fontSize: Math.min(80, (prev.fontSize || 40) + 4) }));
                if (onUpdateCaptionConfig) onUpdateCaptionConfig(prev => ({ ...prev, scale: Math.min(250, (prev.scale || 100) + 15) }));
              },
              () => {
                if (setFontStyle) setFontStyle(prev => ({ ...prev, fontSize: Math.max(18, (prev.fontSize || 40) - 4) }));
                if (onUpdateCaptionConfig) onUpdateCaptionConfig(prev => ({ ...prev, scale: Math.max(50, (prev.scale || 100) - 15) }));
              },
              () => {
                const phraseText = activePhrase.map(w => w.word).join(' ');
                setEditingPhraseModal({ words: activePhrase, text: phraseText });
              },
              () => {
                if (onUpdateCaptionConfig) onUpdateCaptionConfig(prev => ({ ...prev, visible: false }));
                if (setCaptionPreset) setCaptionPreset('No captions');
              },
              'Phụ Đề'
            )}

            <div className="inline-block relative p-1.5 rounded-xl group-hover:ring-1 group-hover:ring-brand-400/60 group-hover:bg-black/30 transition-all">
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

              {/* Corner Resize Handle */}
              <div
                onMouseDown={(e) => startResizing(e, 'caption', null, captionConfig?.scale ?? 100, 65)}
                className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                title="Kéo góc để phóng to / thu nhỏ phụ đề"
              >
                <Maximize2 className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>
        )}

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

      {/* ── MODAL: SỬA LỜI THOẠI TRỰC TIẾP TRÊN CANVAS ── */}
      {editingPhraseModal && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-[#151724] border border-[#2d3248] rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand-400" />
                <span>Sửa Lời Thoại Phụ Đề Tại Mốc Này</span>
              </h3>
              <button 
                onClick={() => setEditingPhraseModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              defaultValue={editingPhraseModal.text}
              id="phrase-modal-input"
              rows={3}
              className="w-full bg-[#0c0d14] border border-[#272b3e] rounded-xl p-3 text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
              placeholder="Nhập lời thoại chính xác..."
              autoFocus
            />

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setEditingPhraseModal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#222538] hover:bg-[#2c3048] text-slate-300 font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  const inputVal = document.getElementById('phrase-modal-input')?.value;
                  if (inputVal) handleSavePhraseEdit(inputVal);
                }}
                className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SỬA NỘI DUNG NHÃN CHỮ (TEXT LAYER) ── */}
      {editingTextLayerModal && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-[#151724] border border-[#2d3248] rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Type className="w-4 h-4 text-indigo-400" />
                <span>Chỉnh Sửa Nhãn Chữ (Text Layer)</span>
              </h3>
              <button 
                onClick={() => setEditingTextLayerModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              defaultValue={editingTextLayerModal.text}
              id="textlayer-modal-input"
              className="w-full bg-[#0c0d14] border border-[#272b3e] rounded-xl p-3 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
              placeholder="Nhập nội dung chữ..."
              autoFocus
            />

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setEditingTextLayerModal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#222538] hover:bg-[#2c3048] text-slate-300 font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  const val = document.getElementById('textlayer-modal-input')?.value;
                  if (val && onUpdateTextLayer) {
                    onUpdateTextLayer(editingTextLayerModal.id, { text: val.trim() });
                  }
                  setEditingTextLayerModal(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
