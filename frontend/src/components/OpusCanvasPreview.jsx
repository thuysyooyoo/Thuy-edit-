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
  brandConfig = { showLogo: true, logoUrl: null, logoText: 'OPUS STUDIO', logoSize: 65, logoWidth: 80, logoHeight: 35, logoOpacity: 90, pos: { x: 82, y: 6 } },
  onUpdateBrandConfig,
  titleConfig = { visible: true, style: 'pill_white', scale: 100, boxWidth: 280, paddingY: 6, pos: { x: 50, y: 10 } },
  onUpdateTitleConfig,
  captionConfig = { visible: true, scale: 100, boxWidth: 300, paddingY: 6, pos: { x: 50, y: 84 } },
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

  // Drag & Multi-Directional Box Resizing states
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

  // Start Multi-directional Resize Handle (Kéo ngang rộng khung, kéo dọc giãn đệm, kéo 4 góc zoom)
  const startResizing = (e, type, id = null, mode = 'corner_br', metrics = {}) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElement({ type, id });
    setActiveResizing({
      type,
      id,
      mode,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startScale: metrics.scale ?? 100,
      startWidth: metrics.boxWidth ?? metrics.logoWidth ?? metrics.width ?? (type === 'logo' ? 80 : 280),
      startHeight: metrics.logoHeight ?? metrics.height ?? 35,
      startPaddingY: metrics.paddingY ?? 6,
      startFontSize: fontStyle?.fontSize ?? 40
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      // 1. DRAGGING POSITION
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

      // 2. MULTI-DIRECTIONAL BOX RESIZING (KÉO DÃN KHUNG RỘNG / CAO / ZOOM GÓC MÀ CHỮ KHÔNG BỊ MÉO)
      if (activeResizing && canvasContainerRef.current) {
        const deltaX = e.clientX - activeResizing.startMouseX;
        const deltaY = e.clientY - activeResizing.startMouseY;
        const mode = activeResizing.mode;

        // ── A. KÉO DÃN / THU HẸP CHIỀU RỘNG KHUNG CHỨA (BOX WIDTH) ──
        if (mode === 'horizontal_right' || mode === 'horizontal_left') {
          const factor = mode === 'horizontal_left' ? -1 : 1;
          const newBoxWidth = Math.max(80, Math.min(340, Math.round(activeResizing.startWidth + deltaX * factor * 1.2)));

          if (activeResizing.type === 'title' && onUpdateTitleConfig) {
            onUpdateTitleConfig(prev => ({ ...prev, boxWidth: newBoxWidth }));
          } else if (activeResizing.type === 'caption' && onUpdateCaptionConfig) {
            onUpdateCaptionConfig(prev => ({ ...prev, boxWidth: newBoxWidth }));
          } else if (activeResizing.type === 'logo' && onUpdateBrandConfig) {
            const newLogoWidth = Math.max(25, Math.min(260, Math.round(activeResizing.startWidth + deltaX * factor * 0.9)));
            onUpdateBrandConfig(prev => ({ ...prev, logoWidth: newLogoWidth, logoSize: newLogoWidth }));
          } else if (activeResizing.type === 'textLayer' && onUpdateTextLayer) {
            onUpdateTextLayer(activeResizing.id, { boxWidth: newBoxWidth });
          }
        }
        
        // ── B. KÉO DÃN / THU HẸP CHIỀU DỌC KHUNG CHỨA (PADDING VERTICAL & BOX HEIGHT) ──
        else if (mode === 'vertical_bottom' || mode === 'vertical_top') {
          const factor = mode === 'vertical_top' ? -1 : 1;
          const newPaddingY = Math.max(2, Math.min(32, Math.round(activeResizing.startPaddingY + deltaY * factor * 0.4)));

          if (activeResizing.type === 'title' && onUpdateTitleConfig) {
            onUpdateTitleConfig(prev => ({ ...prev, paddingY: newPaddingY }));
          } else if (activeResizing.type === 'caption' && onUpdateCaptionConfig) {
            onUpdateCaptionConfig(prev => ({ ...prev, paddingY: newPaddingY }));
          } else if (activeResizing.type === 'logo' && onUpdateBrandConfig) {
            const newHeight = Math.max(15, Math.min(200, Math.round(activeResizing.startHeight + deltaY * factor * 0.8)));
            onUpdateBrandConfig(prev => ({ ...prev, logoHeight: newHeight }));
          } else if (activeResizing.type === 'textLayer' && onUpdateTextLayer) {
            onUpdateTextLayer(activeResizing.id, { paddingY: newPaddingY });
          }
        }

        // ── C. KÉO GÓC ĐỒNG TỶ LỆ ZOOM TO NHỎ CẢ CHỮ VÀ KHUNG ──
        else {
          const delta = (mode === 'corner_tl' ? (-deltaX - deltaY) :
                         mode === 'corner_tr' ? (deltaX - deltaY) :
                         mode === 'corner_bl' ? (-deltaX + deltaY) :
                         (deltaX + deltaY)) * 0.5;

          const newScale = Math.max(40, Math.min(250, Math.round(activeResizing.startScale + delta * 0.5)));

          if (activeResizing.type === 'title' && onUpdateTitleConfig) {
            onUpdateTitleConfig(prev => ({ ...prev, scale: newScale }));
          } else if (activeResizing.type === 'caption') {
            if (onUpdateCaptionConfig) onUpdateCaptionConfig(prev => ({ ...prev, scale: newScale }));
            if (setFontStyle) {
              const newFontSize = Math.max(18, Math.min(80, Math.round(activeResizing.startFontSize + delta * 0.2)));
              setFontStyle(prev => ({ ...prev, fontSize: newFontSize }));
            }
          } else if (activeResizing.type === 'logo' && onUpdateBrandConfig) {
            const newSize = Math.max(25, Math.min(200, Math.round(activeResizing.startScale + delta * 0.5)));
            onUpdateBrandConfig(prev => ({ ...prev, logoSize: newSize, logoWidth: newSize * 1.3, logoHeight: newSize * 0.6 }));
          } else if (activeResizing.type === 'textLayer' && onUpdateTextLayer) {
            onUpdateTextLayer(activeResizing.id, { scale: newScale });
          }
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

  const clipStart = clip?.start_time || 0;
  const activeBroll = brolls.find(b => {
    const isAbsMatch = currentTime >= (b.start - 0.1) && currentTime <= (b.end + 0.1);
    const relTime = currentTime - clipStart;
    const isRelMatch = relTime >= (b.start - 0.1) && relTime <= (b.end + 0.1);
    return isAbsMatch || isRelMatch;
  });

  // Sync B-Roll video with main player
  useEffect(() => {
    if (activeBroll && brollVideoRef.current) {
      const brollBaseStart = activeBroll.start >= clipStart ? activeBroll.start : (clipStart + activeBroll.start);
      const offset = Math.max(0, currentTime - brollBaseStart + (activeBroll.videoTrimStart || 0));
      if (Math.abs(brollVideoRef.current.currentTime - offset) > 0.35) {
        brollVideoRef.current.currentTime = offset;
      }
      if (isPlaying && brollVideoRef.current.paused) {
        brollVideoRef.current.play().catch(() => {});
      } else if (!isPlaying && !brollVideoRef.current.paused) {
        brollVideoRef.current.pause();
      }
    }
  }, [currentTime, isPlaying, activeBroll, clipStart]);

  // ── RENDER 8-DIRECTIONAL TRANSFORM HANDLES (KHUNG VIỀN & 8 NÚM KÉO RỘNG KHUNG / CAO / GÓC) ──
  const renderTransformBox = (type, id, metrics) => {
    const isSelected = selectedElement?.type === type && selectedElement?.id === id;
    if (!isSelected) return null;

    return (
      <div className="absolute -inset-2 pointer-events-none z-40">
        {/* Bounding Line */}
        <div className="w-full h-full border-2 border-indigo-400/90 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.5)]" />

        {/* 1. Left Edge Handle (Kéo dãn rộng khung sang trái) */}
        <div
          onMouseDown={(e) => startResizing(e, type, id, 'horizontal_left', metrics)}
          className="pointer-events-auto absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-7 bg-white hover:bg-indigo-400 border border-indigo-700 rounded-full cursor-ew-resize z-50 shadow-lg hover:scale-125 transition-transform flex items-center justify-center"
          title="Kéo sang trái/phải để dãn rộng khung chứa"
        >
          <div className="w-0.5 h-3.5 bg-indigo-900 rounded" />
        </div>

        {/* 2. Right Edge Handle (Kéo dãn rộng khung sang phải) */}
        <div
          onMouseDown={(e) => startResizing(e, type, id, 'horizontal_right', metrics)}
          className="pointer-events-auto absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-7 bg-white hover:bg-indigo-400 border border-indigo-700 rounded-full cursor-ew-resize z-50 shadow-lg hover:scale-125 transition-transform flex items-center justify-center"
          title="Kéo sang trái/phải để dãn rộng khung chứa"
        >
          <div className="w-0.5 h-3.5 bg-indigo-900 rounded" />
        </div>

        {/* 3. Top Edge Handle (Kéo dãn độ cao khung trên) */}
        <div
          onMouseDown={(e) => startResizing(e, type, id, 'vertical_top', metrics)}
          className="pointer-events-auto absolute -top-2 left-1/2 -translate-x-1/2 w-7 h-3 bg-white hover:bg-indigo-400 border border-indigo-700 rounded-full cursor-ns-resize z-50 shadow-lg hover:scale-125 transition-transform flex items-center justify-center"
          title="Kéo lên/xuống để tăng độ cao khung"
        >
          <div className="h-0.5 w-3.5 bg-indigo-900 rounded" />
        </div>

        {/* 4. Bottom Edge Handle (Kéo dãn độ cao khung dưới) */}
        <div
          onMouseDown={(e) => startResizing(e, type, id, 'vertical_bottom', metrics)}
          className="pointer-events-auto absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-3 bg-white hover:bg-indigo-400 border border-indigo-700 rounded-full cursor-ns-resize z-50 shadow-lg hover:scale-125 transition-transform flex items-center justify-center"
          title="Kéo lên/xuống để tăng độ cao khung"
        >
          <div className="h-0.5 w-3.5 bg-indigo-900 rounded" />
        </div>

        {/* 5. 4 Corner Handles (Kéo góc đồng tỷ lệ Zoom) */}
        <div
          onMouseDown={(e) => startResizing(e, type, id, 'corner_tl', metrics)}
          className="pointer-events-auto absolute -top-2 -left-2 w-4 h-4 bg-white hover:bg-indigo-400 border-2 border-indigo-700 rounded-sm cursor-nwse-resize z-50 shadow-md hover:scale-125 transition-transform"
          title="Kéo góc để zoom to nhỏ đồng thời"
        />
        <div
          onMouseDown={(e) => startResizing(e, type, id, 'corner_tr', metrics)}
          className="pointer-events-auto absolute -top-2 -right-2 w-4 h-4 bg-white hover:bg-indigo-400 border-2 border-indigo-700 rounded-sm cursor-nesw-resize z-50 shadow-md hover:scale-125 transition-transform"
          title="Kéo góc để zoom to nhỏ đồng thời"
        />
        <div
          onMouseDown={(e) => startResizing(e, type, id, 'corner_bl', metrics)}
          className="pointer-events-auto absolute -bottom-2 -left-2 w-4 h-4 bg-white hover:bg-indigo-400 border-2 border-indigo-700 rounded-sm cursor-nesw-resize z-50 shadow-md hover:scale-125 transition-transform"
          title="Kéo góc để zoom to nhỏ đồng thời"
        />
        <div
          onMouseDown={(e) => startResizing(e, type, id, 'corner_br', metrics)}
          className="pointer-events-auto absolute -bottom-2 -right-2 w-4 h-4 bg-white hover:bg-indigo-400 border-2 border-indigo-700 rounded-sm cursor-nwse-resize z-50 shadow-md hover:scale-125 transition-transform"
          title="Kéo góc để zoom to nhỏ đồng thời"
        />
      </div>
    );
  };

  // Render floating action toolbar for selected canvas element
  const renderElementToolbar = (type, id, onZoomIn, onZoomOut, onStretchWidth, onStretchHeight, onEdit, onDelete, label = '') => {
    return (
      <div 
        onClick={(e) => e.stopPropagation()}
        className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 bg-[#121422]/95 border border-[#333852] rounded-xl shadow-2xl p-1 flex items-center gap-1.5 backdrop-blur-md animate-fade-in text-[10px]"
      >
        <span className="text-[9px] font-bold text-indigo-300 px-1 font-mono uppercase truncate max-w-[80px]">
          {label}
        </span>
        <div className="w-[1px] h-3.5 bg-white/20" />
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 bg-[#1a1d2e] p-0.5 rounded-lg border border-[#2b3049]">
          <button
            onClick={(e) => { e.stopPropagation(); onZoomOut && onZoomOut(); }}
            title="Thu nhỏ kích thước"
            className="w-5 h-5 rounded bg-[#22273d] hover:bg-[#2e3452] text-slate-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-[9px] font-mono px-1 text-slate-300">Zoom</span>
          <button
            onClick={(e) => { e.stopPropagation(); onZoomIn && onZoomIn(); }}
            title="Phóng to kích thước"
            className="w-5 h-5 rounded bg-[#22273d] hover:bg-[#2e3452] text-slate-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Box Width & Box Height Quick Buttons */}
        {onStretchWidth && (
          <button
            onClick={(e) => { e.stopPropagation(); onStretchWidth(); }}
            title="Dãn rộng khung chứa (Width +20px)"
            className="px-1.5 h-5 rounded bg-[#1e2338] hover:bg-indigo-600/60 text-slate-200 font-mono font-bold flex items-center gap-0.5 transition-all"
          >
            ↔ Rộng
          </button>
        )}

        {onStretchHeight && (
          <button
            onClick={(e) => { e.stopPropagation(); onStretchHeight(); }}
            title="Dãn cao khung chứa (Padding +4px)"
            className="px-1.5 h-5 rounded bg-[#1e2338] hover:bg-indigo-600/60 text-slate-200 font-mono font-bold flex items-center gap-0.5 transition-all"
          >
            ↕ Cao
          </button>
        )}

        {/* Edit */}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Chỉnh sửa nội dung / kiểu dáng"
            className="px-2 h-5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 transition-all hover:scale-105"
          >
            <Edit3 className="w-2.5 h-2.5" />
            <span>Sửa</span>
          </button>
        )}

        {/* Delete */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Xóa / Ẩn phần tử này"
            className="w-5 h-5 rounded bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const renderBrollVisual = (broll, extraClass = '') => {
    const mediaSrc = broll.fileUrl || broll.videoUrl || broll.imageUrl;
    const isVideo = broll.mediaType === 'video' || (mediaSrc && /\.(mp4|mov|webm|mkv|m4v|quicktime)/i.test(mediaSrc));

    if (isVideo && mediaSrc) {
      return (
        <video
          ref={brollVideoRef}
          src={mediaSrc}
          className={`w-full h-full object-cover ${extraClass}`}
          autoPlay
          muted
          playsInline
          loop
        />
      );
    }

    if (mediaSrc) {
      return (
        <div className={`w-full h-full relative overflow-hidden ${extraClass}`}>
          <img
            ref={brollImageRef}
            src={mediaSrc}
            alt={broll.title}
            className="w-full h-full object-cover animate-ken-burns filter brightness-95"
          />
        </div>
      );
    }

    // Fallback graphic for custom b-roll without image url
    return (
      <div className={`w-full h-full bg-gradient-to-br ${broll.bg || 'from-indigo-900 via-[#131522] to-black'} flex flex-col items-center justify-center p-3 text-center overflow-hidden ${extraClass}`}>
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/25 border border-amber-500/50 flex items-center justify-center text-amber-300 font-bold text-xl mb-1.5 shadow-lg shadow-amber-500/20">
            {broll.thumb || '🎬'}
          </div>
          <span className="text-xs font-black text-amber-300 uppercase tracking-wider line-clamp-1 drop-shadow-md">{broll.title}</span>
          <span className="text-[9px] text-amber-200/80 font-mono mt-0.5 px-2 py-0.5 rounded-full bg-black/40 border border-amber-500/20">B-Roll Visual Footage</span>
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
        id="opus-canvas-container"
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

        {/* ── 2. B-ROLL VISUAL OVERLAYS ── */}
        {activeBroll && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedElement({ type: 'broll', id: activeBroll.id });
            }}
            className={`group absolute overflow-hidden transition-all duration-300 ${
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

            {/* Quick Delete B-Roll Button (Chỉ hiện khi hover hoặc chọn, không dính vào video) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveBroll && onRemoveBroll(activeBroll.id);
              }}
              title="Xóa B-Roll này khỏi video"
              className="export-ignore-handle opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 border border-white/30 text-white flex items-center justify-center z-25 shadow-lg active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── SOFT AMBIENT GRADIENT FEATHERING BLEND SEAMS ── */}
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
            1. BRAND LOGO / WATERMARK OVERLAY (KÉO RỘNG, KÉO CAO, ZOOM GÓC, SỬA & XÓA)
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
            className="absolute z-35 cursor-move group select-none transition-shadow"
            title="Kéo di chuyển, kéo các cạnh để chỉnh kích thước khung, kéo góc để zoom"
          >
            {/* Quick Action Toolbar */}
            {selectedElement?.type === 'logo' && renderElementToolbar(
              'logo',
              null,
              () => onUpdateBrandConfig && onUpdateBrandConfig(prev => ({ ...prev, logoSize: Math.min(200, (prev.logoSize || 65) + 10) })),
              () => onUpdateBrandConfig && onUpdateBrandConfig(prev => ({ ...prev, logoSize: Math.max(25, (prev.logoSize || 65) - 10) })),
              () => onUpdateBrandConfig && onUpdateBrandConfig(prev => ({ ...prev, logoWidth: Math.min(260, (prev.logoWidth || 80) + 15) })),
              () => onUpdateBrandConfig && onUpdateBrandConfig(prev => ({ ...prev, logoHeight: Math.min(180, (prev.logoHeight || 35) + 10) })),
              () => onSelectElementToCustomize && onSelectElementToCustomize('brand'),
              () => onUpdateBrandConfig && onUpdateBrandConfig(prev => ({ ...prev, showLogo: false })),
              'Logo'
            )}

            <div 
              id="brand-logo-capture" 
              style={{ opacity: (brandConfig.logoOpacity ?? 90) / 100 }}
              className="relative p-1 rounded-xl group-hover:ring-1 group-hover:ring-indigo-400/60 group-hover:bg-black/40 transition-all flex items-center gap-1.5"
            >
              {brandConfig?.logoUrl ? (
                <img 
                  src={brandConfig.logoUrl} 
                  alt="Brand Logo" 
                  style={{ 
                    width: `${brandConfig.logoWidth || brandConfig.logoSize || 65}px`,
                    height: brandConfig.logoHeight ? `${brandConfig.logoHeight}px` : 'auto'
                  }}
                  className="object-contain drop-shadow-md pointer-events-none"
                />
              ) : (
                <div 
                  style={{ 
                    fontSize: `${Math.round((brandConfig.logoSize || 65) * 0.16)}px`,
                    width: brandConfig.logoWidth ? `${brandConfig.logoWidth}px` : 'auto'
                  }}
                  className="px-2.5 py-1 rounded-md bg-black/75 border border-white/25 text-white font-black tracking-wider uppercase backdrop-blur-xs shadow-md text-center"
                >
                  {brandConfig?.logoText || 'OPUS STUDIO'}
                </div>
              )}

              {/* 8-Directional Transform Handles */}
              {renderTransformBox('logo', null, brandConfig)}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════════════
            2. CUSTOM TEXT STICKERS (KÉO RỘNG KHUNG, KÉO CAO, ZOOM GÓC, SỬA & XÓA)
           ═════════════════════════════════════════════════════════════════════════════════ */}
        {textLayers.map((tl, i) => {
          const textObj = typeof tl === 'string' ? { id: `tl_${i}`, text: tl, style: 'header', scale: 100, boxWidth: 260, paddingY: 6, pos: { x: 50, y: 60 + i * 8 } } : tl;
          const currentPos = textObj.pos || { x: 50, y: 60 + i * 8 };
          const scale = textObj.scale ?? 100;
          const boxWidth = textObj.boxWidth ?? 260;
          const paddingY = textObj.paddingY ?? 6;

          return (
            <div 
              key={textObj.id || i}
              style={{
                top: `${currentPos.y}%`,
                left: `${currentPos.x}%`,
                transform: `translate(-50%, -50%) scale(${scale / 100})`,
                width: `${boxWidth}px`,
                maxWidth: '96%'
              }}
              onMouseDown={(e) => startDragging(e, 'textLayer', textObj.id, currentPos)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement({ type: 'textLayer', id: textObj.id });
              }}
              className="absolute z-35 cursor-move group select-none text-center"
              title="Kéo di chuyển, kéo các cạnh để chỉnh độ rộng/cao của khung, kéo góc để zoom"
            >
              {/* Quick Action Toolbar */}
              {selectedElement?.type === 'textLayer' && selectedElement?.id === textObj.id && renderElementToolbar(
                'textLayer',
                textObj.id,
                () => onUpdateTextLayer && onUpdateTextLayer(textObj.id, { scale: Math.min(250, (textObj.scale || 100) + 15) }),
                () => onUpdateTextLayer && onUpdateTextLayer(textObj.id, { scale: Math.max(40, (textObj.scale || 100) - 15) }),
                () => onUpdateTextLayer && onUpdateTextLayer(textObj.id, { boxWidth: Math.min(340, (textObj.boxWidth || 260) + 25) }),
                () => onUpdateTextLayer && onUpdateTextLayer(textObj.id, { paddingY: Math.min(32, (textObj.paddingY || 6) + 4) }),
                () => setEditingTextLayerModal(textObj),
                () => onRemoveTextLayer && onRemoveTextLayer(textObj.id || i),
                'Text'
              )}

              <div 
                style={{ paddingTop: `${paddingY}px`, paddingBottom: `${paddingY}px` }}
                className="relative inline-block w-full"
              >
                {textObj.style === 'neon_tag' ? (
                  <div className="bg-black/90 text-emerald-300 font-bold text-xs px-3.5 py-1.5 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.8)] border border-emerald-400 uppercase tracking-wider break-words leading-snug">
                    {textObj.text}
                  </div>
                ) : textObj.style === 'gradient_badge' ? (
                  <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xl border border-amber-300 uppercase tracking-wider break-words leading-snug">
                    {textObj.text}
                  </div>
                ) : textObj.style === 'callout_box' ? (
                  <div className="bg-[#12141f]/90 backdrop-blur-md text-slate-200 font-medium text-xs px-3 py-1.5 rounded-xl border border-[#30354e] shadow-lg break-words leading-snug">
                    {textObj.text}
                  </div>
                ) : textObj.style === 'yellow_impact' ? (
                  <div className="text-yellow-300 font-black text-sm uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,1)] px-2 py-0.5 break-words leading-snug">
                    {textObj.text}
                  </div>
                ) : (
                  <div className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3 py-1.5 rounded-lg shadow-xl uppercase tracking-wider border border-indigo-400 break-words leading-snug">
                    {textObj.text}
                  </div>
                )}

                {/* 8-Directional Transform Handles */}
                {renderTransformBox('textLayer', textObj.id, textObj)}
              </div>
            </div>
          );
        })}

        {/* ═════════════════════════════════════════════════════════════════════════════════
            3. TOP HOOK HEADLINE OVERLAY (KÉO RỘNG KHUNG, KÉO CAO, ZOOM GÓC, SỬA & XÓA, ĐỒNG BỘ TIMELINE)
           ═════════════════════════════════════════════════════════════════════════════════ */}
        {(() => {
          const isTitleInTimeRange = titleConfig?.startTime === undefined || (
            ((currentTime >= clipStart ? (currentTime - clipStart) : currentTime) >= ((titleConfig.startTime ?? 0) - 0.05)) &&
            ((currentTime >= clipStart ? (currentTime - clipStart) : currentTime) <= ((titleConfig.startTime ?? 0) + (titleConfig.duration ?? 6) + 0.05))
          );
          const isTitleVisible = titleConfig?.visible !== false && (editingTitle || isTitleInTimeRange);

          if (titleConfig?.visible === false) return null;

          return (
            <div 
              style={{
                top: `${titleConfig?.pos?.y ?? 10}%`,
                left: `${titleConfig?.pos?.x ?? 50}%`,
                transform: `translate(-50%, -50%) scale(${(titleConfig?.scale ?? 100) / 100})`,
                width: `${titleConfig?.boxWidth ?? 280}px`,
                maxWidth: '96%',
                opacity: isTitleVisible ? 1 : 0,
                pointerEvents: isTitleVisible ? 'auto' : 'none'
              }}
              onMouseDown={(e) => isTitleVisible && !editingTitle && startDragging(e, 'title', null, titleConfig?.pos || { x: 50, y: 10 })}
              onClick={(e) => {
                if (isTitleVisible) {
                  e.stopPropagation();
                  setSelectedElement({ type: 'title', id: null });
                }
              }}
              className="absolute z-35 cursor-move group select-none text-center transition-opacity duration-150"
              title="Kéo di chuyển, kéo các cạnh để chỉnh độ rộng/cao của khung, kéo góc để zoom"
            >
            {/* Quick Action Toolbar */}
            {selectedElement?.type === 'title' && !editingTitle && renderElementToolbar(
              'title',
              null,
              () => onUpdateTitleConfig && onUpdateTitleConfig(prev => ({ ...prev, scale: Math.min(250, (prev.scale || 100) + 15) })),
              () => onUpdateTitleConfig && onUpdateTitleConfig(prev => ({ ...prev, scale: Math.max(40, (prev.scale || 100) - 15) })),
              () => onUpdateTitleConfig && onUpdateTitleConfig(prev => ({ ...prev, boxWidth: Math.min(340, (prev.boxWidth || 280) + 25) })),
              () => onUpdateTitleConfig && onUpdateTitleConfig(prev => ({ ...prev, paddingY: Math.min(32, (prev.paddingY || 6) + 4) })),
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
              <div 
                id="title-card-capture"
                style={{ 
                  paddingTop: `${titleConfig?.paddingY ?? 6}px`, 
                  paddingBottom: `${titleConfig?.paddingY ?? 6}px` 
                }}
                className="relative inline-block w-full"
              >
                {titleConfig?.style === 'neon_cyber' ? (
                  <div className="bg-black/90 text-emerald-300 font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] uppercase tracking-tight break-words leading-snug">
                    <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
                    <Edit3 className="export-ignore-handle w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-emerald-300 transition-opacity" />
                  </div>
                ) : titleConfig?.style === 'gradient_gold' ? (
                  <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl shadow-2xl border border-yellow-200 uppercase tracking-tight break-words leading-snug">
                    <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
                    <Edit3 className="export-ignore-handle w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-black transition-opacity" />
                  </div>
                ) : titleConfig?.style === 'yellow_impact' ? (
                  <div className="text-yellow-300 font-black text-sm sm:text-base px-3 py-1 drop-shadow-[0_4px_8px_rgba(0,0,0,1)] uppercase tracking-tight break-words leading-snug">
                    <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
                    <Edit3 className="export-ignore-handle w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-yellow-300 transition-opacity" />
                  </div>
                ) : titleConfig?.style === 'minimal' ? (
                  <div className="bg-black/60 backdrop-blur-md text-white font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border border-white/20 shadow-lg uppercase tracking-tight break-words leading-snug">
                    <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
                    <Edit3 className="export-ignore-handle w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-white transition-opacity" />
                  </div>
                ) : (
                  <div className="bg-white/95 hover:bg-white text-black font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-lg shadow-lg inline-block leading-snug tracking-tight uppercase border border-white break-words">
                    <span>{customTitle || clip?.title || "Tiêu Đề Viral Clip"}</span>
                    <Edit3 className="export-ignore-handle w-3 h-3 ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-slate-700 transition-opacity" />
                  </div>
                )}

                {/* 8-Directional Transform Handles */}
                <div className="export-ignore-handle">
                  {renderTransformBox('title', null, titleConfig)}
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* ═════════════════════════════════════════════════════════════════════════════════
            4. SUBTITLE / DYNAMIC CAPTIONS (KÉO RỘNG KHUNG, KÉO CAO, ZOOM GÓC, SỬA & XÓA)
           ═════════════════════════════════════════════════════════════════════════════════ */}
        {captionPreset !== 'No captions' && captionConfig?.visible !== false && activePhrase.length > 0 && (
          <div 
            style={{
              top: `${captionConfig?.pos?.y ?? captionPos?.y ?? 84}%`,
              left: `${captionConfig?.pos?.x ?? captionPos?.x ?? 50}%`,
              transform: `translate(-50%, -50%) scale(${(captionConfig?.scale ?? 100) / 100})`,
              width: `${captionConfig?.boxWidth ?? 300}px`,
              maxWidth: '96%'
            }}
            onMouseDown={(e) => startDragging(e, 'caption', null, captionConfig?.pos || captionPos || { x: 50, y: 84 })}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedElement({ type: 'caption', id: null });
            }}
            title="Kéo di chuyển, kéo các cạnh để chỉnh độ rộng/cao của khung, kéo góc để zoom"
            className="absolute z-35 cursor-move group select-none text-center"
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
                if (onUpdateCaptionConfig) onUpdateCaptionConfig(prev => ({ ...prev, scale: Math.max(40, (prev.scale || 100) - 15) }));
              },
              () => onUpdateCaptionConfig && onUpdateCaptionConfig(prev => ({ ...prev, boxWidth: Math.min(340, (prev.boxWidth || 300) + 25) })),
              () => onUpdateCaptionConfig && onUpdateCaptionConfig(prev => ({ ...prev, paddingY: Math.min(32, (prev.paddingY || 6) + 4) })),
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

            <div 
              style={{
                paddingTop: `${captionConfig?.paddingY ?? 6}px`,
                paddingBottom: `${captionConfig?.paddingY ?? 6}px`
              }}
              className="inline-block relative w-full p-1.5 rounded-xl group-hover:ring-1 group-hover:ring-brand-400/60 group-hover:bg-black/30 transition-all"
            >
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
                className="leading-tight tracking-wider transition-all break-words"
              >
                {activePhrase.slice(0, 5).map((w, idx) => {
                  const isCurrent = currentTime >= w.start && currentTime <= w.end;
                  
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
                    </span>
                  );
                })}
              </p>

              {/* 8-Directional Transform Handles */}
              {renderTransformBox('caption', null, captionConfig)}
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
