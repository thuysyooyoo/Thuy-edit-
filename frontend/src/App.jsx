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
import WysiwygExportModal from './components/WysiwygExportModal';
import { toPng } from 'html-to-image';
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
  const [isWysiwygModalOpen, setIsWysiwygModalOpen] = useState(false);

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

  // Brand Logo & Template Configuration
  const [brandConfig, setBrandConfig] = useState({
    showLogo: true,
    logoUrl: null, // Custom uploaded logo URL
    logoText: 'OPUS STUDIO',
    logoSize: 65,
    logoOpacity: 90,
    pos: { x: 82, y: 6 }, // Draggable percentage position
    primaryColor: '#6366f1',
    secondaryColor: '#04f827',
    accentColor: '#ff007a'
  });

  // Top Hook Title Style, Position, Scale, ScaleX, ScaleY, Timing & Visibility
  const [titleConfig, setTitleConfig] = useState({
    visible: true,
    style: 'pill_white', // 'pill_white' | 'neon_cyber' | 'gradient_gold' | 'yellow_impact' | 'minimal'
    scale: 100, // percentage 40 - 300
    scaleX: 100, // horizontal stretch %
    scaleY: 100, // vertical stretch %
    pos: { x: 50, y: 10 }, // Draggable percentage position
    startTime: 0, // start offset in seconds
    duration: 6 // duration in seconds
  });

  // Subtitle / Caption Position, Scale, ScaleX, ScaleY & Visibility
  const [captionConfig, setCaptionConfig] = useState({
    visible: true,
    scale: 100, // percentage 40 - 300
    scaleX: 100, // horizontal stretch %
    scaleY: 100, // vertical stretch %
    pos: { x: 50, y: 84 } // Draggable percentage position
  });

  // Background Music (BGM) State
  const [selectedBgm, setSelectedBgm] = useState('none');
  const [bgmVolume, setBgmVolume] = useState(25);
  const [customBgmList, setCustomBgmList] = useState([]);
  const bgmAudioRef = useRef(new Audio());

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

  // Layers: B-Roll, Sound FX, Draggable Text Layers
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
  const audioContextRef = useRef(null);
  const audioNodesRef = useRef(null);

  // 🎧 Web Audio API Real-time Speech Noise Filter & Studio Noise Gate (Triệt tiêu 100% ồn nền khi ngắt giọng)
  useEffect(() => {
    if (!videoRef.current) return;
    
    const setupAudioGraph = () => {
      try {
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();
          const source = ctx.createMediaElementSource(videoRef.current);
          
          // 1. Cascaded 24dB/oct High-Pass Filters (Triệt tiêu toàn bộ tiếng ầm rì, rung máy, gió dưới 110Hz)
          const highPass1 = ctx.createBiquadFilter();
          highPass1.type = 'highpass';
          highPass1.frequency.value = 110;
          highPass1.Q.value = 0.707;

          const highPass2 = ctx.createBiquadFilter();
          highPass2.type = 'highpass';
          highPass2.frequency.value = 110;
          highPass2.Q.value = 0.707;

          // 2. Notch Filters (Triệt tiêu tiếng ù điện xoay chiều 50Hz, 60Hz)
          const notch50 = ctx.createBiquadFilter();
          notch50.type = 'notch';
          notch50.frequency.value = 50;
          notch50.Q.value = 10;

          const notch60 = ctx.createBiquadFilter();
          notch60.type = 'notch';
          notch60.frequency.value = 60;
          notch60.Q.value = 10;

          // 3. Cascaded 24dB/oct Low-Pass Filters (Cắt bỏ tiếng rít cao tần, quạt gió trên 6800Hz)
          const lowPass1 = ctx.createBiquadFilter();
          lowPass1.type = 'lowpass';
          lowPass1.frequency.value = 6800;
          lowPass1.Q.value = 0.707;

          const lowPass2 = ctx.createBiquadFilter();
          lowPass2.type = 'lowpass';
          lowPass2.frequency.value = 6800;
          lowPass2.Q.value = 0.707;

          // 4. Vocal Formant Peaking Boosts (Làm ấm và rõ âm thoại tiếng Việt)
          const vocalPresence = ctx.createBiquadFilter();
          vocalPresence.type = 'peaking';
          vocalPresence.frequency.value = 3000;
          vocalPresence.Q.value = 1.4;
          vocalPresence.gain.value = 6.0;

          const vocalWarmth = ctx.createBiquadFilter();
          vocalWarmth.type = 'peaking';
          vocalWarmth.frequency.value = 1200;
          vocalWarmth.Q.value = 1.0;
          vocalWarmth.gain.value = 2.5;

          // 5. Dynamics Compressor (Cân bằng dải động âm lượng)
          const compressor = ctx.createDynamicsCompressor();
          compressor.threshold.value = -22;
          compressor.knee.value = 25;
          compressor.ratio.value = 5;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.20;

          // 6. Real-time Studio Noise Gate Node & Analyser (Tự động ngắt tiếng xì xào khi ngừng nói)
          const gateGain = ctx.createGain();
          gateGain.gain.value = 1.0;

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          const pcmData = new Float32Array(analyser.fftSize);

          let isGateOpen = true;
          const checkNoiseGate = () => {
            if (ctx.state === 'running') {
              analyser.getFloatTimeDomainData(pcmData);
              let sum = 0;
              for (let i = 0; i < pcmData.length; i++) {
                sum += pcmData[i] * pcmData[i];
              }
              const rms = Math.sqrt(sum / pcmData.length);
              const db = 20 * Math.log10(Math.max(1e-5, rms));

              // Nếu âm lượng < -40dB (khoảng nghỉ/chỉ có tiếng ồn nền) -> Đóng cổng ngắt sạch 98% tạp âm
              if (db < -40) {
                if (isGateOpen) {
                  isGateOpen = false;
                  gateGain.gain.setTargetAtTime(0.015, ctx.currentTime, 0.04);
                }
              } else if (db >= -36) { // Khi người nói cất giọng -> Mở cổng tức thì
                if (!isGateOpen) {
                  isGateOpen = true;
                  gateGain.gain.setTargetAtTime(1.15, ctx.currentTime, 0.008);
                }
              }
            }
            requestAnimationFrame(checkNoiseGate);
          };
          requestAnimationFrame(checkNoiseGate);

          // Gain Nodes for A/B Bypass vs Processed
          const bypassGain = ctx.createGain();
          const effectGain = ctx.createGain();

          // Bypass path
          source.connect(bypassGain);
          bypassGain.connect(ctx.destination);

          // Processed path with Studio Noise Gate
          source.connect(highPass1);
          highPass1.connect(highPass2);
          highPass2.connect(notch50);
          notch50.connect(notch60);
          notch60.connect(lowPass1);
          lowPass1.connect(lowPass2);
          lowPass2.connect(vocalPresence);
          vocalPresence.connect(vocalWarmth);
          vocalWarmth.connect(compressor);
          compressor.connect(gateGain);
          gateGain.connect(analyser);
          analyser.connect(effectGain);
          effectGain.connect(ctx.destination);

          // Initial gains based on speechEnhance
          if (speechEnhance) {
            bypassGain.gain.value = 0;
            effectGain.gain.value = 1;
          } else {
            bypassGain.gain.value = 1;
            effectGain.gain.value = 0;
          }

          audioContextRef.current = ctx;
          audioNodesRef.current = { bypassGain, effectGain, ctx, gateGain };
        }
      } catch (err) {
        console.warn("Web Audio API setup notice:", err);
      }
    };

    videoRef.current.addEventListener('play', setupAudioGraph, { once: true });
  }, []);

  // Update audio filter gains on toggle
  useEffect(() => {
    if (audioNodesRef.current) {
      const { bypassGain, effectGain, ctx } = audioNodesRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if (speechEnhance) {
        bypassGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        effectGain.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
      } else {
        bypassGain.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
        effectGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      }
    }
  }, [speechEnhance]);

  // 🎵 Đồng bộ phát / dừng / âm lượng Nhạc nền (BGM) với Video
  useEffect(() => {
    const bgmAudio = bgmAudioRef.current;
    if (!bgmAudio) return;

    if (!selectedBgm || selectedBgm === 'none') {
      bgmAudio.pause();
      return;
    }

    const trackUrls = {
      lofi: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
      cinematic: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=inspiring-cinematic-ambient-116199.mp3',
      energetic: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=electronic-future-beats-117997.mp3'
    };

    const custom = customBgmList.find(c => c.id === selectedBgm);
    const audioUrl = custom?.url || trackUrls[selectedBgm];

    if (audioUrl) {
      if (bgmAudio.src !== audioUrl) {
        bgmAudio.src = audioUrl;
        bgmAudio.loop = true;
      }
      bgmAudio.volume = Math.max(0, Math.min(1, (bgmVolume / 100) * 0.4));

      if (isPlaying) {
        bgmAudio.play().catch(() => {});
      } else {
        bgmAudio.pause();
      }
    } else {
      bgmAudio.pause();
    }
  }, [selectedBgm, isPlaying, bgmVolume, customBgmList]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/data');
      const json = await res.json();
      setData(json);

      if (json.has_data && json.viral_clips && json.viral_clips.length > 0) {
        const firstClip = json.viral_clips[0];
        setActiveClip(firstClip);
        setCurrentTime(firstClip.start_time);
        setCustomTitle(firstClip.title);

        // Khôi phục bản lưu tạm nếu có
        try {
          const localSaved = localStorage.getItem(`opus_saved_project_${firstClip.id}`);
          if (localSaved) {
            const p = JSON.parse(localSaved);
            if (p.customTitle) setCustomTitle(p.customTitle);
            if (p.fontStyle) setFontStyle(p.fontStyle);
            if (p.captionPreset) setCaptionPreset(p.captionPreset);
            if (p.captionEffect) setCaptionEffect(p.captionEffect);
            if (p.titleConfig) setTitleConfig(p.titleConfig);
            if (p.captionConfig) setCaptionConfig(p.captionConfig);
            if (p.brandConfig) setBrandConfig(p.brandConfig);
            if (p.textLayers) setTextLayers(p.textLayers);
            if (p.brolls) setBrolls(p.brolls);
            if (p.soundFxMarkers) setSoundFxMarkers(p.soundFxMarkers);
            if (p.excludedWordIndices) setExcludedWordIndices(new Set(p.excludedWordIndices));
            if (p.excludedPauseIndices) setExcludedPauseIndices(new Set(p.excludedPauseIndices));
            if (p.speechEnhance !== undefined) setSpeechEnhance(p.speechEnhance);
          }
        } catch(e) {}

        setCurrentView('editor');
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

  // Real-time Skip Intervals (Tự động xóa cả từ và khoảng trắng/lặng phía sau từ bị gạch bỏ)
  const skipIntervals = useMemo(() => {
    if (!currentClipWords.length) return [];
    
    const excludedList = Array.from(excludedWordIndices)
      .filter(idx => idx >= 0 && idx < currentClipWords.length)
      .sort((a, b) => a - b);
      
    const intervals = [];

    // Gom cụm các từ bị xóa liền kề và lấy mốc kết thúc đến đầu từ tiếp theo được giữ lại
    if (excludedList.length > 0) {
      let chunkStartIdx = excludedList[0];
      let chunkEndIdx = excludedList[0];

      for (let i = 1; i < excludedList.length; i++) {
        if (excludedList[i] === chunkEndIdx + 1) {
          chunkEndIdx = excludedList[i];
        } else {
          const start = currentClipWords[chunkStartIdx].start;
          const nextIncludedIdx = chunkEndIdx + 1;
          const end = nextIncludedIdx < currentClipWords.length
            ? currentClipWords[nextIncludedIdx].start
            : currentClipWords[chunkEndIdx].end + 0.3;

          intervals.push({ start, end });
          chunkStartIdx = excludedList[i];
          chunkEndIdx = excludedList[i];
        }
      }

      const start = currentClipWords[chunkStartIdx].start;
      const nextIncludedIdx = chunkEndIdx + 1;
      const end = nextIncludedIdx < currentClipWords.length
        ? currentClipWords[nextIncludedIdx].start
        : currentClipWords[chunkEndIdx].end + 0.3;

      intervals.push({ start, end });
    }

    // Khoảng lặng explicit bị gạch bỏ
    excludedPauseIndices.forEach((pIdx) => {
      const targetPause = detectedPausesList.find(p => p.index === pIdx);
      if (targetPause) {
        intervals.push({
          start: targetPause.start,
          end: targetPause.end
        });
      }
    });

    // Khoảng thời gian bị khuyết giữa các phân cảnh (nếu xóa phân cảnh ở giữa)
    if (activeClip?.scenes && activeClip.scenes.length > 1) {
      for (let i = 1; i < activeClip.scenes.length; i++) {
        const prevScene = activeClip.scenes[i - 1];
        const currScene = activeClip.scenes[i];
        if (currScene.start_time > prevScene.end_time + 0.05) {
          intervals.push({
            start: prevScene.end_time,
            end: currScene.start_time
          });
        }
      }
    }

    // Merge các khoảng nhảy gối nhau
    intervals.sort((a, b) => a.start - b.start);
    const merged = [];
    intervals.forEach(curr => {
      if (!merged.length) {
        merged.push({ ...curr });
      } else {
        const last = merged[merged.length - 1];
        if (curr.start <= last.end + 0.05) {
          last.end = Math.max(last.end, curr.end);
        } else {
          merged.push({ ...curr });
        }
      }
    });

    return merged;
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

  const handleAddTextLayer = (title, style = 'header', scale = 100) => {
    setTextLayers(prev => [
      ...prev,
      {
        id: `tl_${Date.now()}_${prev.length}`,
        text: title,
        style: style,
        scale: scale,
        scaleX: 100,
        scaleY: 100,
        pos: { x: 50, y: 60 + (prev.length % 4) * 8 }
      }
    ]);
  };

  const handleUpdateTextLayer = (id, updates) => {
    setTextLayers(prev => prev.map(tl => tl.id === id ? { ...tl, ...updates } : tl));
  };

  const handleUpdateTextLayerPos = (id, pos) => {
    setTextLayers(prev => prev.map(tl => tl.id === id ? { ...tl, pos } : tl));
  };

  const handleRemoveTextLayer = (id) => {
    setTextLayers(prev => prev.filter(tl => tl.id !== id));
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

    const deletedScene = currentScenes.find(s => s.id === sceneId);
    const nextScenes = currentScenes.filter(s => s.id !== sceneId);

    if (deletedScene && nextScenes.length > 0) {
      // 1. Tự động gạch bỏ/loại bỏ toàn bộ từ trong transcript thuộc phân cảnh bị xóa
      const nextExcluded = new Set(excludedWordIndices);
      currentClipWords.forEach((w, idx) => {
        if (w.start >= deletedScene.start_time - 0.1 && w.end <= deletedScene.end_time + 0.1) {
          nextExcluded.add(idx);
        }
      });
      setExcludedWordIndices(nextExcluded);

      // 2. Tính toán lại mốc bắt đầu, kết thúc và trừ thời lượng thực tế của clip
      const newStart = nextScenes[0].start_time;
      const newEnd = nextScenes[nextScenes.length - 1].end_time;
      const netDuration = nextScenes.reduce((sum, s) => sum + Math.max(0, s.end_time - s.start_time), 0);
      const roundedDur = Math.round(netDuration * 100) / 100;

      const updatedClip = {
        ...activeClip,
        start_time: newStart,
        end_time: newEnd,
        duration: roundedDur,
        scenes: nextScenes
      };

      setActiveClip(updatedClip);

      // Cập nhật cả danh sách viral_clips để đồng bộ Clip Cards
      if (data?.viral_clips) {
        setData(prev => ({
          ...prev,
          viral_clips: prev.viral_clips.map(c => c.id === activeClip.id ? updatedClip : c)
        }));
      }

      // 3. Nếu con trỏ phát (currentTime) đang nằm trong đoạn vừa xóa, tự động nhảy về đầu đoạn còn lại
      if (currentTime >= deletedScene.start_time && currentTime <= deletedScene.end_time) {
        const nextTargetTime = nextScenes.find(s => s.start_time >= deletedScene.end_time)?.start_time || newStart;
        setCurrentTime(nextTargetTime);
        if (videoRef.current) {
          videoRef.current.currentTime = nextTargetTime;
        }
      }
    }
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
      // 📸 Chụp Snapshot Đồ Họa độ phân giải cao chuẩn 1080x1920 (WYSIWYG)
      const canvasContainer = document.getElementById('opus-canvas-container');
      const containerWidth = canvasContainer ? canvasContainer.getBoundingClientRect().width : 340;
      const pixelRatio = Math.max(1.5, Math.min(4.5, 1080 / containerWidth));

      let titleCardPng = null;
      const titleEl = document.getElementById('title-card-capture');
      if (titleEl && titleConfig?.visible !== false) {
        try {
          titleCardPng = await toPng(titleEl, {
            pixelRatio,
            backgroundColor: 'transparent',
            filter: (node) => !node.classList?.contains('export-ignore-handle') && !node.classList?.contains('element-action-toolbar')
          });
        } catch (e) {
          console.warn('Error capturing title card snapshot:', e);
        }
      }

      let brandLogoPng = null;
      const logoEl = document.getElementById('brand-logo-capture');
      if (logoEl && brandConfig?.showLogo) {
        try {
          brandLogoPng = await toPng(logoEl, {
            pixelRatio,
            backgroundColor: 'transparent',
            filter: (node) => !node.classList?.contains('export-ignore-handle') && !node.classList?.contains('element-action-toolbar')
          });
        } catch (e) {
          console.warn('Error capturing brand logo snapshot:', e);
        }
      }

      const res = await fetch('http://127.0.0.1:8000/api/export-hd-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: activeClip.id,
          custom_title: customTitle || activeClip.title,
          title_card_image: titleCardPng,
          brand_logo_image: brandLogoPng,
          title_config: titleConfig,
          caption_config: captionConfig,
          caption_preset: captionPreset,
          font_style: fontStyle,
          brand_config: brandConfig,
          text_layers: textLayers,
          sound_fx_markers: soundFxMarkers,
          auto_whoosh: autoWhoosh,
          auto_ding: autoDing,
          brolls: brolls,
          selected_bgm: selectedBgm,
          bgm_volume: bgmVolume,
          excluded_word_indices: Array.from(excludedWordIndices),
          excluded_pause_indices: Array.from(excludedPauseIndices),
          skip_intervals: skipIntervals,
          scenes: activeClip.scenes || []
        })
      });
      const resJson = await res.json();
      if (res.ok) {
        // Tự động kích hoạt tải video về máy tính
        const downloadUrl = `http://127.0.0.1:8000/api/download-clip/${resJson.file_name}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = resJson.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert(`✅ XUẤT VIDEO 9:16 FULL HD THÀNH CÔNG!\n\nĐộ phân giải: 1080x1920 Full HD (CRF 18)\nFile đã bắt đầu tải về máy: ${resJson.file_name}\nĐường dẫn lưu trữ: ${resJson.file_path}`);
      } else {
        alert(`Lỗi Render HD: ${resJson.detail || "Không rõ"}`);
      }
    } catch (err) {
      alert(`Lỗi kết nối máy chủ: ${err.message}`);
    } finally {
      setIsExportingHd(false);
    }
  };

  // 💾 Lưu Tạm Toàn Bộ Dự Án Video
  const handleSaveProject = () => {
    if (!activeClip) return;
    
    const projectState = {
      clip_id: activeClip.id,
      clip: activeClip,
      customTitle: customTitle || activeClip.title,
      fontStyle,
      captionPreset,
      captionEffect,
      titleConfig,
      captionConfig,
      brandConfig,
      textLayers,
      brolls,
      soundFxMarkers,
      excludedWordIndices: Array.from(excludedWordIndices),
      excludedPauseIndices: Array.from(excludedPauseIndices),
      aspectRatio,
      videoLayout,
      activeTransition,
      speechEnhance,
      savedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(`opus_saved_project_${activeClip.id}`, JSON.stringify(projectState));
      alert("✅ ĐÃ LƯU TẠM DỰ ÁN THÀNH CÔNG!\n\nToàn bộ thiết lập (tiêu đề, phụ đề, B-Roll, nhãn chữ, logo, sound fx và cắt ghép) đã được lưu trữ an toàn.");
    } catch(e) {
      alert("Lỗi lưu trữ: " + e.message);
    }
  };

  const handleSelectClipToPreview = (clip) => {
    setSelectedPreviewClip(clip);
  };

  const handleGoToEditor = (clip) => {
    setSelectedPreviewClip(null);
    const targetClip = clip || (data?.viral_clips && data.viral_clips[0]);
    if (!targetClip) {
      setCurrentView('editor');
      return;
    }

    setActiveClip(targetClip);
    setCurrentTime(targetClip.start_time || 0);
    setCustomTitle(targetClip.title || "Clip Studio");

    // Khôi phục bản lưu tạm nếu có
    let restored = false;
    try {
      const localSaved = localStorage.getItem(`opus_saved_project_${targetClip.id}`);
      if (localSaved) {
        const p = JSON.parse(localSaved);
        if (p.customTitle) setCustomTitle(p.customTitle);
        if (p.fontStyle) setFontStyle(p.fontStyle);
        if (p.captionPreset) setCaptionPreset(p.captionPreset);
        if (p.captionEffect) setCaptionEffect(p.captionEffect);
        if (p.titleConfig) setTitleConfig(p.titleConfig);
        if (p.captionConfig) setCaptionConfig(p.captionConfig);
        if (p.brandConfig) setBrandConfig(p.brandConfig);
        if (p.textLayers) setTextLayers(p.textLayers);
        if (p.brolls) setBrolls(p.brolls);
        if (p.soundFxMarkers) setSoundFxMarkers(p.soundFxMarkers);
        if (p.excludedWordIndices) setExcludedWordIndices(new Set(p.excludedWordIndices));
        if (p.excludedPauseIndices) setExcludedPauseIndices(new Set(p.excludedPauseIndices));
        if (p.aspectRatio) setAspectRatio(p.aspectRatio);
        if (p.videoLayout) setVideoLayout(p.videoLayout);
        if (p.activeTransition) setActiveTransition(p.activeTransition);
        if (p.speechEnhance !== undefined) setSpeechEnhance(p.speechEnhance);
        if (p.clip?.scenes) setActiveClip(p.clip);
        restored = true;
      }
    } catch(e) {}

    if (!restored) {
      setExcludedWordIndices(new Set());
      setExcludedPauseIndices(new Set());
      setBrolls([]);
      setTextLayers([]);
      setSoundFxMarkers([]);
    }

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
            speechEnhance={speechEnhance}
            onToggleSpeechEnhance={() => setSpeechEnhance(!speechEnhance)}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            videoLayout={videoLayout}
            setVideoLayout={setVideoLayout}
            faceTrackerEnabled={faceTrackerEnabled}
            setFaceTrackerEnabled={setFaceTrackerEnabled}
            onExport={handleExport}
            onExportHd={handleExportHd}
            onExportWysiwyg={() => setIsWysiwygModalOpen(true)}
            onSaveProject={handleSaveProject}
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

            {/* Center: Video Canvas Preview với Full Live Visual Transformations, Kéo Thả, Zoom To Nhỏ & Sửa/Xóa */}
            <div className="col-span-4 h-full overflow-hidden">
              <OpusCanvasPreview
                videoRef={videoRef}
                clip={activeClip}
                words={data?.transcript?.words || []}
                currentTime={currentTime}
                captionPreset={captionPreset}
                setCaptionPreset={setCaptionPreset}
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
                setFontStyle={setFontStyle}
                aiEmoji={aiEmoji}
                autoCensor={autoCensor}
                speakerColors={speakerColors}
                brandConfig={brandConfig}
                onUpdateBrandConfig={setBrandConfig}
                titleConfig={titleConfig}
                onUpdateTitleConfig={setTitleConfig}
                captionConfig={captionConfig}
                onUpdateCaptionConfig={setCaptionConfig}
                captionPos={captionConfig.pos}
                onUpdateCaptionPos={(newPos) => setCaptionConfig(prev => ({ ...prev, pos: newPos }))}
                onUpdateTextLayer={handleUpdateTextLayer}
                onUpdateTextLayerPos={handleUpdateTextLayerPos}
                activeTransition={activeTransition}
                onSelectElementToCustomize={handleSelectElementToCustomize}
                onRemoveTextLayer={handleRemoveTextLayer}
                onRemoveBroll={(brollId) => setBrolls(prev => prev.filter(b => b.id !== brollId))}
                onEditPhraseText={handleEditPhraseText}
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
                brandConfig={brandConfig}
                setBrandConfig={setBrandConfig}
                titleConfig={titleConfig}
                setTitleConfig={setTitleConfig}
                selectedBgm={selectedBgm}
                setSelectedBgm={setSelectedBgm}
                bgmVolume={bgmVolume}
                setBgmVolume={setBgmVolume}
                customBgmList={customBgmList}
                setCustomBgmList={setCustomBgmList}
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
            titleConfig={titleConfig}
            onUpdateTitleConfig={setTitleConfig}
            customTitle={customTitle}
            brolls={brolls}
            soundFxMarkers={soundFxMarkers}
            textLayers={textLayers}
            skipIntervals={skipIntervals}
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

      {/* 🎬 Modal Xuất Video WYSIWYG Chuẩn CapCut (Khớp 100% Preview) */}
      <WysiwygExportModal
        isOpen={isWysiwygModalOpen}
        onClose={() => setIsWysiwygModalOpen(false)}
        clip={activeClip}
        sourceVideoUrl="http://127.0.0.1:8000/api/stream/source"
        words={data?.transcript?.words || []}
        customTitle={customTitle || activeClip?.title || ''}
        titleConfig={titleConfig}
        brandConfig={brandConfig}
        captionConfig={captionConfig}
        fontStyle={fontStyle}
        textLayers={textLayers}
        brolls={brolls}
        skipIntervals={skipIntervals}
        videoLayout={videoLayout}
      />
    </div>
  );
}
