import React, { useState, useEffect, useRef, useMemo } from 'react';
import TopBar from './components/TopBar';
import OpusTranscript, { COMMON_FILLERS_LIST } from './components/OpusTranscript';
import OpusCanvasPreview from './components/OpusCanvasPreview';
import OpusTimeline from './components/OpusTimeline';
import OpusRightSidebar from './components/OpusRightSidebar';
import UploadView from './components/UploadView';
import DashboardView from './components/DashboardView';
import ClipPreviewModal from './components/ClipPreviewModal';
import BrollPickerModal from './components/BrollPickerModal';
import SoundFxPickerModal from './components/SoundFxPickerModal';
import AICopilotDrawer from './components/AICopilotDrawer';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);
  const [activeClip, setActiveClip] = useState(null);
  const [selectedPreviewClip, setSelectedPreviewClip] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // 'upload' | 'dashboard' | 'editor'
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingHd, setIsExportingHd] = useState(false);

  // AI Copilot Drawer State & Selected Model (Phiên 4)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.7-flash');

  // Background Job Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);

  // Studio Settings & Live Visual Transformations
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [videoLayout, setVideoLayout] = useState('fill'); // 'fill' | 'fit' | 'split'
  const [faceTrackerEnabled, setFaceTrackerEnabled] = useState(true);
  const [captionPreset, setCaptionPreset] = useState('Karaoke Neon Green');
  const [captionEffect, setCaptionEffect] = useState('pop'); // 'pop' | 'wave' | 'glow' | 'slide'
  const [customTitle, setCustomTitle] = useState('');
  const [activeSidebarTab, setActiveSidebarTab] = useState('captions');
  
  const [highlightKeywords, setHighlightKeywords] = useState(true);
  const [speechEnhance, setSpeechEnhance] = useState(true);
  const [aiEmoji, setAiEmoji] = useState(false);
  const [autoCensor, setAutoCensor] = useState(false);
  const [autoTransitions, setAutoTransitions] = useState(true);
  const [activeTransition, setActiveTransition] = useState('zoom_in');
  const [selectedTransitionSceneId, setSelectedTransitionSceneId] = useState(null);
  const [speakerColors, setSpeakerColors] = useState(true);

  const handleOpenTransitionsTab = (sceneId) => {
    setActiveSidebarTab('transitions');
    setSelectedTransitionSceneId(sceneId);
  };

  // Watermark Live Overlay
  const [watermark, setWatermark] = useState({
    visible: true,
    text: 'OPUS STUDIO',
    pos: 'top-right',
    opacity: 85
  });
  
  // Auto vs Manual Sound FX & Ducking (Phiên 3)
  const [autoWhoosh, setAutoWhoosh] = useState(true);
  const [autoDing, setAutoDing] = useState(true);
  const [audioDucking, setAudioDucking] = useState(true);
  const [autoBroll, setAutoBroll] = useState(false);

  // Interactive Auto-Mix State
  const [isAutoMixing, setIsAutoMixing] = useState(false);
  const [autoMixMessage, setAutoMixMessage] = useState('');

  // Font Customization State (1:1 Chuẩn Ảnh Font Settings)
  const [fontStyle, setFontStyle] = useState({
    fontFamily: 'Montserrat',
    fontSize: 40,
    textColor: '#ffffff',
    fontWeight: 'Black',
    isItalic: false,
    isUnderline: false,
    isUppercase: true,
    strokeColor: '#000000',
    strokeWidth: 8,
    hasShadow: true,
    shadowColor: '#000000',
    shadowX: 2,
    shadowY: 2,
    shadowBlur: 2,
    hasHighlight: true,
    highlightColor: '#04f827'
  });

  // Cleanup State
  const [excludedWordIndices, setExcludedWordIndices] = useState(new Set());
  const [excludedPauseIndices, setExcludedPauseIndices] = useState(new Set());
  const [pauseThreshold, setPauseThreshold] = useState(0.5);
  const [activeCleanupMode, setActiveCleanupMode] = useState(null);

  // Layers: B-Roll, Sound FX, Text Layers
  const [brolls, setBrolls] = useState([]);
  const [soundFxMarkers, setSoundFxMarkers] = useState([]);
  const [textLayers, setTextLayers] = useState([]);

  // Modals for B-Roll & Sound FX Picker
  const [isBrollPickerOpen, setIsBrollPickerOpen] = useState(false);
  const [brollTimeRange, setBrollTimeRange] = useState(null);

  const [isSoundFxPickerOpen, setIsSoundFxPickerOpen] = useState(false);
  const [soundFxTimestamp, setSoundFxTimestamp] = useState(0);

  const videoRef = useRef(null);
  const playedFxRef = useRef(new Set());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/data');
      const json = await res.json();
      setData(json);

      if (json.has_data && json.viral_clips && json.viral_clips.length > 0) {
        setActiveClip(json.viral_clips[0]);
        setCurrentTime(json.viral_clips[0].start_time);
        setCustomTitle(json.viral_clips[0].title);
        setCurrentView('dashboard');
      } else {
        setCurrentView('upload');
      }
    } catch (err) {
      console.error("Failed to load pipeline data:", err);
      setCurrentView('upload');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter words belonging to current clip
  const allWords = data?.transcript?.words || [];
  const currentClipWords = useMemo(() => {
    return allWords.filter(
      w => activeClip && w.start >= activeClip.start_time - 0.2 && w.end <= activeClip.end_time + 0.5
    );
  }, [allWords, activeClip]);

  // Detected Fillers Count
  const detectedFillersCount = useMemo(() => {
    let count = 0;
    currentClipWords.forEach((w) => {
      const clean = w.word.toLowerCase().replace(/[.,!?\"']/g, '').trim();
      if (COMMON_FILLERS_LIST.includes(clean)) count++;
    });
    return count;
  }, [currentClipWords]);

  // Detected Pauses & Pauses List
  const detectedPausesList = useMemo(() => {
    const list = [];
    let pCount = 0;
    for (let i = 1; i < currentClipWords.length; i++) {
      const prev = currentClipWords[i - 1];
      const curr = currentClipWords[i];
      const gap = curr.start - prev.end;
      if (gap >= pauseThreshold) {
        list.push({
          index: pCount++,
          start: prev.end,
          end: curr.start,
          duration: gap
        });
      }
    }
    return list;
  }, [currentClipWords, pauseThreshold]);

  const detectedPausesCount = detectedPausesList.length;

  // Real-time Skip Intervals
  const skipIntervals = useMemo(() => {
    const intervals = [];

    excludedWordIndices.forEach((idx) => {
      if (currentClipWords[idx]) {
        intervals.push({
          start: currentClipWords[idx].start,
          end: currentClipWords[idx].end
        });
      }
    });

    excludedPauseIndices.forEach((pIdx) => {
      const targetPause = detectedPausesList.find(p => p.index === pIdx);
      if (targetPause) {
        intervals.push({
          start: targetPause.start,
          end: targetPause.end
        });
      }
    });

    intervals.sort((a, b) => a.start - b.start);
    return intervals;
  }, [excludedWordIndices, excludedPauseIndices, currentClipWords, detectedPausesList]);

  // Poll job status when processing
  useEffect(() => {
    let interval = null;
    if (isProcessing) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('http://127.0.0.1:8000/api/job-status');
          const statusJson = await res.json();
          setJobStatus(statusJson);

          if (statusJson.status === 'completed') {
            setIsProcessing(false);
            clearInterval(interval);
            await fetchData();
            setCurrentView('dashboard');
          } else if (statusJson.status === 'error') {
            setIsProcessing(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error polling status:", err);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleStartProcessing = async (inputSource, apiKey) => {
    setIsProcessing(true);
    setJobStatus({ status: 'processing', progress: 5, stage: 'Đang chuẩn bị...', message: 'Khởi động AI Engine...' });

    try {
      const res = await fetch('http://127.0.0.1:8000/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_source: inputSource,
          gemini_api_key: apiKey
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        setJobStatus({ status: 'error', error: errData.detail || "Không thể khởi động tác vụ." });
        setIsProcessing(false);
      }
    } catch (err) {
      setJobStatus({ status: 'error', error: `Lỗi kết nối: ${err.message}` });
      setIsProcessing(false);
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Live Sound Effects & Real-Time Skip Engine
  const handleTimeUpdate = (time) => {
    for (const skip of skipIntervals) {
      if (time >= skip.start - 0.05 && time < skip.end) {
        if (videoRef.current) {
          videoRef.current.currentTime = skip.end + 0.03;
          setCurrentTime(skip.end + 0.03);
        }
        return;
      }
    }

    setCurrentTime(time);

    const clipStart = activeClip?.start_time || 0;
    const relTime = time - clipStart;

    soundFxMarkers.forEach((marker) => {
      const markerKey = marker.id || `${marker.name}_${marker.time}`;
      if (relTime >= marker.time - 0.05 && relTime <= marker.time + 0.3) {
        if (!playedFxRef.current.has(markerKey)) {
          playedFxRef.current.add(markerKey);
          try {
            const fxAudio = new Audio(`http://127.0.0.1:8000/assets/sounds/${marker.file}`);
            fxAudio.volume = 0.9;
            fxAudio.play().catch(err => console.log("Sound FX autoplay error:", err));
          } catch (e) {
            console.log("Audio play error:", e);
          }
        }
      }
    });

    if (activeClip && time >= activeClip.end_time) {
      playedFxRef.current.clear();
      if (videoRef.current) {
        videoRef.current.currentTime = activeClip.start_time;
        setCurrentTime(activeClip.start_time);
      }
    }
  };

  const handleSeek = (timestamp) => {
    for (const skip of skipIntervals) {
      if (timestamp >= skip.start && timestamp < skip.end) {
        timestamp = skip.end + 0.02;
        break;
      }
    }

    setCurrentTime(timestamp);
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }

    const clipStart = activeClip?.start_time || 0;
    const seekRelTime = timestamp - clipStart;
    soundFxMarkers.forEach((m) => {
      const markerKey = m.id || `${m.name}_${m.time}`;
      if (m.time >= seekRelTime - 0.1) {
        playedFxRef.current.delete(markerKey);
      }
    });
  };

  const handleToggleExcludeWords = (indices) => {
    const next = new Set(excludedWordIndices);
    indices.forEach(idx => {
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
    });
    setExcludedWordIndices(next);
  };

  const handleEditPhraseText = (indices, newPhraseText) => {
    if (!data?.transcript?.words || indices.length === 0) return;

    const firstWord = currentClipWords[indices[0]];
    const lastWord = currentClipWords[indices[indices.length - 1]];
    const totalStart = firstWord?.start || 0;
    const totalEnd = lastWord?.end || totalStart + 1.0;
    const totalDuration = totalEnd - totalStart;

    const newWordsArr = newPhraseText.trim().split(/\s+/);
    const wordDuration = totalDuration / Math.max(1, newWordsArr.length);

    const replacements = newWordsArr.map((w, i) => ({
      word: w,
      start: totalStart + i * wordDuration,
      end: totalStart + (i + 1) * wordDuration,
      score: 1.0
    }));

    const actualStartIndex = data.transcript.words.findIndex(w => w === firstWord);
    const actualEndIndex = data.transcript.words.findIndex(w => w === lastWord);

    if (actualStartIndex !== -1 && actualEndIndex !== -1) {
      const updatedWords = [...data.transcript.words];
      updatedWords.splice(actualStartIndex, (actualEndIndex - actualStartIndex) + 1, ...replacements);
      setData({
        ...data,
        transcript: {
          ...data.transcript,
          words: updatedWords
        }
      });
    }
  };

  const handleOpenBrollPicker = (range) => {
    setBrollTimeRange(range || { start: currentTime, end: currentTime + 4 });
    setIsBrollPickerOpen(true);
  };

  const handleOpenSoundFxPicker = (time) => {
    setSoundFxTimestamp(time || currentTime);
    setIsSoundFxPickerOpen(true);
  };

  const handleSelectBroll = (brollObj) => {
    setBrolls(prev => [...prev, brollObj]);
  };

  const handleSelectSoundFx = (fxObj, specificTime = null) => {
    const clipStart = activeClip?.start_time || 0;
    const targetTime = specificTime !== null ? specificTime : currentTime;
    const relTime = Math.max(0, targetTime - clipStart);
    setSoundFxMarkers([...soundFxMarkers, { ...fxObj, id: `manual_${Date.now()}`, time: Math.round(relTime * 10) / 10 }]);
    playedFxRef.current.clear();
  };

  const handleUpdateSoundFxTime = (id, newTime) => {
    if (!activeClip) return;
    const clipStart = activeClip.start_time;
    const clipEnd = activeClip.end_time;
    const clipDur = clipEnd - clipStart;
    const boundedTime = Math.max(0, Math.min(clipDur, newTime));
    setSoundFxMarkers(prev => prev.map(m => m.id === id ? { ...m, time: Math.round(boundedTime * 10) / 10 } : m));
    playedFxRef.current.clear();
  };

  const handleDeleteSoundFx = (id) => {
    setSoundFxMarkers(prev => prev.filter(m => m.id !== id));
    playedFxRef.current.clear();
  };

  const handleRunAutoAudioMix = () => {
    if (!activeClip) return;
    setIsAutoMixing(true);
    setAutoMixMessage('AI đang phân tích kịch bản và quét các điểm chuyển cảnh...');

    setTimeout(() => {
      setAutoMixMessage('AI đang nhận diện các từ khóa trọng tâm...');

      setTimeout(() => {
        setAutoMixMessage('AI đang thiết lập cân bằng âm lượng Audio Ducking...');

        setTimeout(() => {
          const clipStart = activeClip.start_time;
          const clipEnd = activeClip.end_time;
          const clipDur = clipEnd - clipStart;

          const newMarkers = [];

          if (autoWhoosh) {
            newMarkers.push({
              id: 'whoosh_start',
              name: 'Whoosh Fast',
              file: 'whoosh.wav',
              time: 0.4,
              category: 'Chuyển cảnh'
            });

            if (clipDur > 20) {
              newMarkers.push({
                id: 'whoosh_mid',
                name: 'Whoosh Fast',
                file: 'whoosh.wav',
                time: Math.round(clipDur * 0.48 * 10) / 10,
                category: 'Chuyển cảnh'
              });
            }
          }

          if (autoDing && currentClipWords.length > 0) {
            const candidateWords = currentClipWords.filter(w => w.word.length >= 5 && (w.start - clipStart) > 2.0);
            const step = Math.max(1, Math.floor(candidateWords.length / 3));
            
            for (let i = 0; i < candidateWords.length && newMarkers.length < 5; i += step) {
              const kw = candidateWords[i];
              const relTime = Math.max(0.8, Math.min(clipDur - 1.0, kw.start - clipStart));
              newMarkers.push({
                id: `ding_${i}`,
                name: 'Ding Bling Sparkle',
                file: 'ding.wav',
                time: Math.round(relTime * 10) / 10,
                category: 'Điểm nhấn'
              });
            }
          }

          setSoundFxMarkers(newMarkers);
          playedFxRef.current.clear();
          setIsAutoMixing(false);
          setAutoMixMessage('');

          try {
            const soundWhoosh = new Audio('http://127.0.0.1:8000/assets/sounds/whoosh.wav');
            soundWhoosh.volume = 0.9;
            soundWhoosh.play();
          } catch(e) {}
        }, 500);
      }, 500);
    }, 500);
  };

  // Extend Clip Functions
  const handleExtendStart = (seconds = 5) => {
    if (!activeClip) return;
    const newStart = Math.max(0, activeClip.start_time - seconds);
    setActiveClip({
      ...activeClip,
      start_time: newStart,
      duration: activeClip.end_time - newStart
    });
    setCurrentTime(newStart);
  };

  const handleExtendEnd = (seconds = 5) => {
    if (!activeClip) return;
    const maxDur = data?.transcript?.duration || 142.17;
    const newEnd = Math.min(maxDur, activeClip.end_time + seconds);
    setActiveClip({
      ...activeClip,
      end_time: newEnd,
      duration: newEnd - activeClip.start_time
    });
  };

  // Copilot Action Execution Engine
  const handleExecuteCopilotAction = (action) => {
    if (!action || !action.type) return;

    if (action.type === 'set_title' && action.title) {
      setCustomTitle(action.title);
    } else if (action.type === 'update_font' && action.style) {
      setFontStyle(prev => ({ ...prev, ...action.style }));
    } else if (action.type === 'cleanup_speech') {
      handleRemoveAllFillers();
      handleRemoveAllPauses();
    } else if (action.type === 'run_auto_mix') {
      handleRunAutoAudioMix();
    } else if (action.type === 'export_hd') {
      handleExportHd();
    } else if (action.type === 'add_broll') {
      setBrolls(prev => [...prev, { title: action.title || 'B-Roll AI', time: action.time || 2.0 }]);
    }
  };

  const handleClearAllSoundFx = () => {
    setSoundFxMarkers([]);
    playedFxRef.current.clear();
  };

  const handleTogglePause = (pauseIndex) => {
    const next = new Set(excludedPauseIndices);
    if (next.has(pauseIndex)) {
      next.delete(pauseIndex);
    } else {
      next.add(pauseIndex);
    }
    setExcludedPauseIndices(next);
  };

  const handleRemoveAllFillers = () => {
    const next = new Set(excludedWordIndices);
    currentClipWords.forEach((w, idx) => {
      const clean = w.word.toLowerCase().replace(/[.,!?\"']/g, '').trim();
      if (COMMON_FILLERS_LIST.includes(clean)) {
        next.add(idx);
      }
    });
    setExcludedWordIndices(next);
  };

  const handleRemoveAllPauses = () => {
    const next = new Set();
    detectedPausesList.forEach(p => {
      next.add(p.index);
    });
    setExcludedPauseIndices(next);
  };

  const handleAddTextLayer = (title) => {
    setTextLayers(prev => [...prev, title]);
  };

  const handleRemoveTextLayer = (index) => {
    setTextLayers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSplitAtPlayhead = () => {
    if (!activeClip || !data) return;
    const splitPoint = currentTime;
    const clipStart = activeClip.start_time || 0;
    const clipEnd = activeClip.end_time || 60;

    const currentScenes = activeClip.scenes && activeClip.scenes.length > 0 ? activeClip.scenes : [
      { id: `${activeClip.id}_sc0`, title: 'Đoạn 1', start_time: clipStart, end_time: clipEnd, transition: null }
    ];

    const targetIdx = currentScenes.findIndex(
      s => splitPoint > s.start_time + 0.5 && splitPoint < s.end_time - 0.5
    );

    if (targetIdx === -1) {
      alert("Không thể cắt tách sát biên phân cảnh (cần cách điểm đầu/cuối tối thiểu 0.5 giây).");
      return;
    }

    const targetScene = currentScenes[targetIdx];
    const baseTitle = targetScene.title.replace(/\s*\([A-Z0-9]+\)$/, '');

    const sceneA = {
      ...targetScene,
      id: `sc_${Date.now()}_${targetIdx}_A`,
      title: `${baseTitle} (A)`,
      end_time: splitPoint,
      transition: 'zoom_in' // Mặc định hiệu ứng chuyển cảnh khi vừa cắt đôi
    };

    const sceneB = {
      ...targetScene,
      id: `sc_${Date.now()}_${targetIdx}_B`,
      title: `${baseTitle} (B)`,
      start_time: splitPoint,
      transition: targetScene.transition || null
    };

    const nextScenes = [...currentScenes];
    nextScenes.splice(targetIdx, 1, sceneA, sceneB);

    setActiveClip({
      ...activeClip,
      scenes: nextScenes
    });
  };

  const handleDeleteScene = (sceneId) => {
    if (!activeClip) return;
    const currentScenes = activeClip.scenes || [];
    if (currentScenes.length <= 1) {
      alert("Không thể xóa hết tất cả phân cảnh. Phải giữ lại ít nhất 1 đoạn video.");
      return;
    }

    const nextScenes = currentScenes.filter(s => s.id !== sceneId);
    setActiveClip({
      ...activeClip,
      scenes: nextScenes
    });
  };

  const handleUpdateSceneTransition = (sceneId, transitionType) => {
    if (!activeClip) return;
    const currentScenes = activeClip.scenes || [];
    const nextScenes = currentScenes.map(s => {
      if (s.id === sceneId) {
        return { ...s, transition: transitionType === 'none' ? null : transitionType };
      }
      return s;
    });

    setActiveClip({
      ...activeClip,
      scenes: nextScenes
    });
  };

  const handleDeleteSelectedLayer = () => {
    if (brolls.length > 0) setBrolls(brolls.slice(0, -1));
    else if (textLayers.length > 0) setTextLayers(textLayers.slice(0, -1));
    else if (soundFxMarkers.length > 0) setSoundFxMarkers(soundFxMarkers.slice(0, -1));
  };

  const handleExport = async () => {
    if (!activeClip) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/cut-custom-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: activeClip.id,
          excluded_word_indices: Array.from(excludedWordIndices),
          excluded_pause_indices: Array.from(excludedPauseIndices)
        })
      });
      const resJson = await res.json();
      if (res.ok) {
        alert(`Đã xuất cắt nhanh thành công!\nFile lưu tại: ${resJson.file_path}`);
      } else {
        alert(`Lỗi xuất video: ${resJson.detail || "Không rõ"}`);
      }
    } catch (err) {
      alert(`Lỗi kết nối: ${err.message}`);
    }
  };

  const handleExportHd = async () => {
    if (!activeClip) return;
    setIsExportingHd(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/export-hd-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: activeClip.id,
          custom_title: customTitle || activeClip.title,
          font_style: fontStyle,
          sound_fx_markers: soundFxMarkers,
          auto_whoosh: autoWhoosh,
          auto_ding: autoDing,
          brolls: brolls
        })
      });
      const resJson = await res.json();
      if (res.ok) {
        alert(`XUẤT VIDEO 9:16 FULL HD THÀNH CÔNG!\n\nĐộ phân giải: 1080x1920 Full HD (CRF 18)\nFile lưu tại: ${resJson.file_path}`);
      } else {
        alert(`Lỗi Render HD: ${resJson.detail || "Không rõ"}`);
      }
    } catch (err) {
      alert(`Lỗi kết nối máy chủ: ${err.message}`);
    } finally {
      setIsExportingHd(false);
    }
  };

  const handleSelectClipToPreview = (clip) => {
    setSelectedPreviewClip(clip);
  };

  const handleGoToEditor = (clip) => {
    setActiveClip(clip);
    setCurrentTime(clip.start_time);
    setCustomTitle(clip.title);
    setExcludedWordIndices(new Set());
    setExcludedPauseIndices(new Set());
    setBrolls([]);
    setTextLayers([]);
    setSoundFxMarkers([]);
    playedFxRef.current.clear();
    setCurrentView('editor');
  };

  const handleSelectElementToCustomize = (type) => {
    if (type === 'captions') {
      setActiveSidebarTab('captions');
    } else if (type === 'broll') {
      setActiveSidebarTab('broll');
    } else if (type === 'text' || type === 'title') {
      setActiveSidebarTab('text');
    }
  };

  const clipDuration = activeClip ? (activeClip.end_time - activeClip.start_time) : 30;

  return (
    <div className="h-screen w-screen bg-[#090a0f] flex flex-col font-sans text-slate-100 overflow-hidden select-none">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Đang tải Opus AI Studio...</p>
          </div>
        </div>
      ) : currentView === 'upload' ? (
        <UploadView
          onStartProcessing={handleStartProcessing}
          isProcessing={isProcessing}
          jobStatus={jobStatus}
        />
      ) : currentView === 'dashboard' ? (
        <>
          <DashboardView
            videoTitle={data?.video_metadata?.title}
            clips={data?.viral_clips || []}
            onSelectClip={handleSelectClipToPreview}
            onOpenUpload={() => setCurrentView('upload')}
            onGoToEditor={handleGoToEditor}
          />

          <ClipPreviewModal
            clip={selectedPreviewClip}
            isOpen={!!selectedPreviewClip}
            onClose={() => setSelectedPreviewClip(null)}
            onGoToEditor={handleGoToEditor}
            words={data?.transcript?.words || []}
          />
        </>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            onSpeechCleanup={() => setActiveCleanupMode('fillers')}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            videoLayout={videoLayout}
            setVideoLayout={setVideoLayout}
            faceTrackerEnabled={faceTrackerEnabled}
            setFaceTrackerEnabled={setFaceTrackerEnabled}
            onExport={handleExport}
            onExportHd={handleExportHd}
            isExportingHd={isExportingHd}
            videoTitle={data?.video_metadata?.title}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
            isCopilotOpen={isCopilotOpen}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            clipDuration={clipDuration}
            onExtendStart={handleExtendStart}
            onExtendEnd={handleExtendEnd}
          />

          <div className="flex-1 grid grid-cols-12 overflow-hidden">
            {/* Left: Script / Transcript Editor */}
            <div className="col-span-5 h-full border-r border-[#222536] overflow-hidden">
              <OpusTranscript
                clip={activeClip}
                words={data?.transcript?.words || []}
                currentTime={currentTime}
                onSeekWord={handleSeek}
                excludedWordIndices={excludedWordIndices}
                onToggleExcludeWords={handleToggleExcludeWords}
                onEditPhraseText={handleEditPhraseText}
                onOpenBrollPicker={handleOpenBrollPicker}
                onOpenSoundFxPicker={handleOpenSoundFxPicker}
                excludedPauseIndices={excludedPauseIndices}
                onTogglePause={handleTogglePause}
                highlightKeywords={highlightKeywords}
                pauseThreshold={pauseThreshold}
                activeCleanupMode={activeCleanupMode}
              />
            </div>

            {/* Center: Video Canvas Preview với Full Live Visual Transformations */}
            <div className="col-span-4 h-full overflow-hidden">
              <OpusCanvasPreview
                videoRef={videoRef}
                clip={activeClip}
                words={data?.transcript?.words || []}
                currentTime={currentTime}
                captionPreset={captionPreset}
                captionEffect={captionEffect}
                customTitle={customTitle}
                setCustomTitle={setCustomTitle}
                aspectRatio={aspectRatio}
                videoLayout={videoLayout}
                faceTrackerEnabled={faceTrackerEnabled}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                onTimeUpdate={handleTimeUpdate}
                brolls={brolls}
                textLayers={textLayers}
                fontStyle={fontStyle}
                aiEmoji={aiEmoji}
                autoCensor={autoCensor}
                speakerColors={speakerColors}
                watermark={watermark}
                activeTransition={activeTransition}
                onSelectElementToCustomize={handleSelectElementToCustomize}
                onRemoveTextLayer={handleRemoveTextLayer}
              />
            </div>

            {/* Right: 8-Tab Opus Tools Sidebar */}
            <div className="col-span-3 h-full overflow-hidden">
              <OpusRightSidebar
                activeTab={activeSidebarTab}
                setActiveTab={setActiveSidebarTab}
                captionPreset={captionPreset}
                setCaptionPreset={setCaptionPreset}
                captionEffect={captionEffect}
                setCaptionEffect={setCaptionEffect}
                highlightKeywords={highlightKeywords}
                setHighlightKeywords={setHighlightKeywords}
                speechEnhance={speechEnhance}
                setSpeechEnhance={setSpeechEnhance}
                aiEmoji={aiEmoji}
                setAiEmoji={setAiEmoji}
                autoCensor={autoCensor}
                setAutoCensor={setAutoCensor}
                autoTransitions={autoTransitions}
                setAutoTransitions={setAutoTransitions}
                activeTransition={activeTransition}
                setActiveTransition={setActiveTransition}
                speakerColors={speakerColors}
                setSpeakerColors={setSpeakerColors}
                autoWhoosh={autoWhoosh}
                setAutoWhoosh={setAutoWhoosh}
                autoDing={autoDing}
                setAutoDing={setAutoDing}
                audioDucking={audioDucking}
                setAudioDucking={setAudioDucking}
                autoBroll={autoBroll}
                setAutoBroll={setAutoBroll}
                fontStyle={fontStyle}
                setFontStyle={setFontStyle}
                watermark={watermark}
                setWatermark={setWatermark}
                onRemoveAllFillers={handleRemoveAllFillers}
                onRemoveAllPauses={handleRemoveAllPauses}
                pauseThreshold={pauseThreshold}
                setPauseThreshold={setPauseThreshold}
                detectedFillersCount={detectedFillersCount}
                detectedPausesCount={detectedPausesCount}
                activeCleanupMode={activeCleanupMode}
                setActiveCleanupMode={setActiveCleanupMode}
                onOpenBrollPicker={handleOpenBrollPicker}
                onOpenSoundFxPicker={handleOpenSoundFxPicker}
                onInsertSoundFx={handleSelectSoundFx}
                onAddTextLayer={handleAddTextLayer}
                onRunAutoAudioMix={handleRunAutoAudioMix}
                isAutoMixing={isAutoMixing}
                autoMixMessage={autoMixMessage}
                soundFxCount={soundFxMarkers.length}
                onClearAllSoundFx={handleClearAllSoundFx}
                clip={activeClip}
                selectedTransitionSceneId={selectedTransitionSceneId}
                setSelectedTransitionSceneId={setSelectedTransitionSceneId}
                onUpdateSceneTransition={handleUpdateSceneTransition}
              />
            </div>
          </div>

          {/* Bottom Multi-Track Timeline */}
          <OpusTimeline
            clip={activeClip}
            currentTime={currentTime}
            onSeek={handleSeek}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            totalDuration={data?.transcript?.duration || 142.17}
            brolls={brolls}
            soundFxMarkers={soundFxMarkers}
            textLayers={textLayers}
            onSplitAtPlayhead={handleSplitAtPlayhead}
            onDeleteSelectedLayer={handleDeleteSelectedLayer}
            onAddMediaTrack={() => setIsBrollPickerOpen(true)}
            onOpenAudioTab={() => setActiveSidebarTab('audio')}
            onOpenTransitionsTab={handleOpenTransitionsTab}
            onUpdateSoundFxTime={handleUpdateSoundFxTime}
            onDeleteSoundFx={handleDeleteSoundFx}
            onDeleteBroll={(id) => setBrolls(prev => prev.filter(b => b.id !== id))}
            onDeleteScene={handleDeleteScene}
            onUpdateSceneTransition={handleUpdateSceneTransition}
          />

          {/* AI Producer Copilot Drawer */}
          <AICopilotDrawer
            isOpen={isCopilotOpen}
            onClose={() => setIsCopilotOpen(false)}
            clip={activeClip}
            fontStyle={fontStyle}
            soundFxCount={soundFxMarkers.length}
            onExecuteAction={handleExecuteCopilotAction}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
          />
        </div>
      )}

      {/* B-Roll Selection Modal */}
      <BrollPickerModal
        isOpen={isBrollPickerOpen}
        onClose={() => setIsBrollPickerOpen(false)}
        onSelect={handleSelectBroll}
        timeRange={brollTimeRange}
        clipStartTime={activeClip?.start_time || 0}
      />

      {/* Sound FX Selection Modal */}
      <SoundFxPickerModal
        isOpen={isSoundFxPickerOpen}
        onClose={() => setIsSoundFxPickerOpen(false)}
        onSelect={handleSelectSoundFx}
        timestamp={soundFxTimestamp}
      />
    </div>
  );
}
