import React, { useState, useEffect, useRef } from 'react';
import { renderCompositedFrame } from '../utils/canvasCompositor';
import { Film, CheckCircle2, AlertCircle, X, Download, Loader2, Sparkles } from 'lucide-react';

export default function WysiwygExportModal({
  isOpen,
  onClose,
  clip,
  sourceVideoUrl = "http://127.0.0.1:8000/api/stream/source",
  words = [],
  customTitle = '',
  titleConfig = {},
  brandConfig = {},
  captionConfig = {},
  fontStyle = {},
  textLayers = [],
  brolls = [],
  skipIntervals = [],
  soundFxMarkers = [],
  selectedBgm = 'none',
  bgmVolume = 25,
  videoLayout = 'fill'
}) {
  const [status, setStatus] = useState('idle'); // idle | preparing | recording | converting | completed | error
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Đang chuẩn bị dữ liệu...');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const canvasRef = useRef(null);
  const hiddenVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const animFrameIdRef = useRef(null);
  const isCancelledRef = useRef(false);
  const loadedMediaRef = useRef(new Map());
  const loadedLogoRef = useRef(null);
  const audioCtxRef = useRef(null);
  const bgmAudioRef = useRef(null);

  // Tính toán thời lượng ước tính sau khi cắt
  const clipStart = clip?.start_time ?? 0;
  const clipEnd = clip?.end_time ?? (clipStart + 30);
  const rawDuration = Math.max(1, clipEnd - clipStart);
  
  const skippedTotal = (skipIntervals || []).reduce((acc, curr) => {
    const s = Math.max(clipStart, Math.min(clipEnd, curr.start));
    const e = Math.max(clipStart, Math.min(clipEnd, curr.end));
    return acc + Math.max(0, e - s);
  }, 0);
  const actualDuration = Math.max(1, rawDuration - skippedTotal);

  const formatSec = (sec) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(2);
    return `${m.toString().padStart(2, '0')}:${s.padStart(5, '0')}`;
  };

  useEffect(() => {
    if (isOpen) {
      isCancelledRef.current = false;
      startExportProcess();
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [isOpen]);

  const cleanup = () => {
    isCancelledRef.current = true;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.pause();
      hiddenVideoRef.current.src = '';
    }
    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current.src = '';
      bgmAudioRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  // Preload toàn bộ ảnh/video B-Roll và Logo vào bộ nhớ
  const preloadMedia = async () => {
    loadedMediaRef.current.clear();
    loadedLogoRef.current = null;

    // Đợi Web Fonts nạp đầy đủ (Vietnamese glyphs)
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Preload Logo
    if (brandConfig?.showLogo && brandConfig?.logoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = brandConfig.logoUrl;
      await new Promise(resolve => {
        img.onload = resolve;
        img.onerror = () => {
          // Fallback không có crossOrigin nếu URL là local hoặc data URI
          const fallbackImg = new Image();
          fallbackImg.src = brandConfig.logoUrl;
          fallbackImg.onload = () => {
            loadedLogoRef.current = fallbackImg;
            resolve();
          };
          fallbackImg.onerror = resolve;
        };
      });
      if (img.complete && img.naturalWidth > 0) {
        loadedLogoRef.current = img;
      }
    }

    // Preload B-Rolls
    for (const b of brolls || []) {
      const src = b.fileUrl || b.imageUrl || b.videoUrl;
      if (!src) continue;
      
      const isVideo = b.mediaType === 'video' || src.toLowerCase().endsWith('.mp4');
      if (isVideo) {
        const v = document.createElement('video');
        v.crossOrigin = 'anonymous';
        v.src = src;
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        loadedMediaRef.current.set(b.id, v);
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        await new Promise(resolve => {
          img.onload = () => {
            loadedMediaRef.current.set(b.id, img);
            resolve();
          };
          img.onerror = () => {
            const fallbackImg = new Image();
            fallbackImg.src = src;
            fallbackImg.onload = () => {
              loadedMediaRef.current.set(b.id, fallbackImg);
              resolve();
            };
            fallbackImg.onerror = resolve;
          };
        });
      }
    }
  };

  const startExportProcess = async () => {
    try {
      setStatus('preparing');
      setProgress(0);
      setStatusMessage('Đang nạp video nguồn, font chữ & tài nguyên B-Roll...');
      setErrorMessage('');

      await preloadMedia();

      if (isCancelledRef.current) return;

      const video = hiddenVideoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        throw new Error('Canvas hoặc Video ref không khả dụng');
      }

      // Khởi tạo Canvas Full HD 1080x1920
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      // Đặt nguồn video
      video.src = sourceVideoUrl;
      video.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = () => reject(new Error('Không thể tải video nguồn'));
      });

      if (isCancelledRef.current) return;

      // Di chuyển tới đầu clip
      video.currentTime = clipStart;
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      setStatus('recording');
      setStatusMessage('Đang ghi hình trực tiếp từng khung hình chuẩn 1080x1920...');

      // 🎧 Thiết lập Web Audio API để thu âm thanh trực tiếp (Không dính PTS sai lệch của file gốc)
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioCtxRef.current = audioCtx;

      const sourceNode = audioCtx.createMediaElementSource(video);
      const destNode = audioCtx.createMediaStreamDestination();
      
      // Nối video audio vào destNode (kèm master gain)
      const masterGain = audioCtx.createGain();
      masterGain.gain.value = 1.0;
      sourceNode.connect(masterGain);
      masterGain.connect(destNode);

      // Nối BGM nếu có
      if (selectedBgm && selectedBgm !== 'none') {
        try {
          const bgm = new Audio(`/assets/sounds/bgm/${selectedBgm}.mp3`);
          bgm.crossOrigin = 'anonymous';
          bgm.loop = true;
          const bgmSource = audioCtx.createMediaElementSource(bgm);
          const bgmGain = audioCtx.createGain();
          bgmGain.gain.value = ((bgmVolume || 25) / 100) * 0.35;
          bgmSource.connect(bgmGain);
          bgmGain.connect(destNode);
          bgm.play().catch(() => {});
          bgmAudioRef.current = bgm;
        } catch (e) {
          console.warn("BGM initialization notice:", e);
        }
      }

      // Khởi tạo MediaStream kết hợp Video từ Canvas và Audio từ Web Audio API Destination
      const canvasStream = canvas.captureStream(60); // 60 FPS
      const combinedStream = new MediaStream([
        canvasStream.getVideoTracks()[0],
        destNode.stream.getAudioTracks()[0]
      ]);

      // Khởi tạo MediaRecorder
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 12000000 // 12 Mbps Full HD sắc nét
      });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (isCancelledRef.current) return;
        await handleRecordedBlob();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(500); // chunk mỗi 500ms

      // Bắt đầu phát video
      await video.play();

      // Vòng lặp Render Khung Hình
      let isSeekingSkip = false;
      const playedFxSet = new Set();

      const renderLoop = () => {
        if (isCancelledRef.current) return;

        const currT = video.currentTime;

        // Kiểm tra kết thúc clip
        if (currT >= clipEnd || video.ended) {
          video.pause();
          if (bgmAudioRef.current) bgmAudioRef.current.pause();
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
          return;
        }

        // Logic Nhảy Qua Đoạn Cắt Bỏ (Skip Intervals)
        const inSkip = (skipIntervals || []).find(sk => currT >= (sk.start - 0.02) && currT < sk.end);
        if (inSkip && !isSeekingSkip) {
          isSeekingSkip = true;
          if (recorder.state === 'recording') {
            recorder.pause();
          }
          video.currentTime = inSkip.end + 0.01;
          const onSeekComplete = () => {
            video.removeEventListener('seeked', onSeekComplete);
            isSeekingSkip = false;
            if (recorder.state === 'paused') {
              recorder.resume();
            }
            animFrameIdRef.current = requestAnimationFrame(renderLoop);
          };
          video.addEventListener('seeked', onSeekComplete);
          return;
        }

        if (!isSeekingSkip) {
          // 🔊 Phát Sound FX nếu tới mốc thời gian
          if (soundFxMarkers && soundFxMarkers.length > 0) {
            for (const fx of soundFxMarkers) {
              const fxTime = fx.time >= clipStart ? fx.time : (clipStart + fx.time);
              const fxKey = fx.id || `${fx.sound}_${fxTime}`;
              if (Math.abs(currT - fxTime) <= 0.08 && !playedFxSet.has(fxKey)) {
                playedFxSet.add(fxKey);
                try {
                  const fxAudio = new Audio(fx.fileUrl || `/assets/sounds/${fx.sound || 'whoosh'}.mp3`);
                  fxAudio.crossOrigin = 'anonymous';
                  const fxSrc = audioCtx.createMediaElementSource(fxAudio);
                  const fxGain = audioCtx.createGain();
                  fxGain.gain.value = 0.7;
                  fxSrc.connect(fxGain);
                  fxGain.connect(destNode);
                  fxAudio.play().catch(() => {});
                } catch (e) {}
              }
            }
          }

          // 🖼️ Xác định B-Roll đang active (Khớp cả mốc thời gian tuyệt đối và tương đối!)
          const activeBroll = (brolls || []).find(b => {
            const bStart = b.start;
            const bEnd = b.end || (b.start + (b.duration || 4));
            const isAbsMatch = currT >= (bStart - 0.1) && currT <= (bEnd + 0.1);
            const relTime = currT - clipStart;
            const isRelMatch = relTime >= (bStart - 0.1) && relTime <= (bEnd + 0.1);
            return isAbsMatch || isRelMatch;
          });

          const activeBrollEl = activeBroll ? loadedMediaRef.current.get(activeBroll.id) : null;

          // 🏷️ Kiểm tra hiển thị Tiêu đề Hook
          const relT = currT >= clipStart ? (currT - clipStart) : currT;
          const isTitleVis = titleConfig?.visible !== false && (
            titleConfig?.startTime === undefined || (
              relT >= ((titleConfig.startTime ?? 0) - 0.05) &&
              relT <= ((titleConfig.startTime ?? 0) + (titleConfig.duration ?? 6) + 0.05)
            )
          );

          // 🎨 Vẽ toàn bộ frame độ phân giải 1080x1920
          renderCompositedFrame(ctx, {
            videoElement: video,
            videoLayout,
            activeBrollMediaElement: activeBrollEl,
            activeBrollConfig: activeBroll,
            titleConfig,
            customTitle: customTitle || clip?.title || '',
            isTitleVisible: isTitleVis,
            brandConfig,
            logoImgElement: loadedLogoRef.current,
            words,
            captionConfig,
            fontStyle,
            textLayers,
            currentTime: currT,
            targetWidth: 1080,
            targetHeight: 1920
          });

          // Cập nhật thanh tiến trình %
          const p = Math.min(99, Math.max(0, Math.round(((currT - clipStart) / rawDuration) * 100)));
          setProgress(p);
        }

        animFrameIdRef.current = requestAnimationFrame(renderLoop);
      };

      animFrameIdRef.current = requestAnimationFrame(renderLoop);

    } catch (err) {
      console.error('Lỗi trong quá trình xuất WYSIWYG:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Đã xảy ra lỗi không mong muốn');
    }
  };

  // Đóng gói WebM -> Gửi Backend chuyển sang MP4
  const handleRecordedBlob = async () => {
    try {
      setStatus('converting');
      setProgress(100);
      setStatusMessage('Đang đóng gói sang MP4 Full HD siêu tốc...');

      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const safeTitle = (customTitle || clip?.title || `clip_${clip?.id || 1}`).replace(/[^\w\s\-_]/gi, '').trim().replace(/\s+/g, '_');
      const targetName = `WYSIWYG_HD_${safeTitle}.mp4`;

      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      formData.append('custom_name', targetName);

      const res = await fetch('http://127.0.0.1:8000/api/convert-webm-to-mp4', {
        method: 'POST',
        body: formData
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.detail || 'Lỗi chuyển đổi MP4');
      }

      setFileName(resJson.file_name);
      setDownloadUrl(`http://127.0.0.1:8000${resJson.download_url}`);
      setStatus('completed');
      setStatusMessage('Đã xuất video hoàn tất!');

      // Tự động kích hoạt tải về máy
      const a = document.createElement('a');
      a.href = `http://127.0.0.1:8000${resJson.download_url}`;
      a.download = resJson.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (err) {
      console.error('Lỗi khi convert MP4:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Lỗi khi đóng gói file MP4');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#12141e] border border-[#2c3147] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-[#2c3147] flex items-center justify-between bg-[#181b28]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Xuất Video WYSIWYG (Khớp 100% Preview)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Chuẩn CapCut
                </span>
              </h3>
              <p className="text-xs text-slate-400">Ghi hình trực tiếp màn hình Canvas độ phân giải 1080x1920</p>
            </div>
          </div>
          {status === 'completed' || status === 'error' ? (
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Live Mini Preview Box */}
          <div className="relative aspect-9/16 max-h-56 mx-auto rounded-xl overflow-hidden border border-[#3b4160] shadow-xl bg-black flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
            
            {status === 'recording' && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-rose-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                REC 1080x1920
              </div>
            )}
          </div>

          {/* Hidden Video Player used for playback/capture */}
          <video
            ref={hiddenVideoRef}
            className="hidden"
            playsInline
            crossOrigin="anonymous"
          />

          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-2">
                {status === 'preparing' && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
                {status === 'recording' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                {status === 'converting' && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                {status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                {statusMessage}
              </span>
              <span className="font-mono font-bold text-white text-sm">{progress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-[#1e2235] rounded-full overflow-hidden p-0.5 border border-[#323854]">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  status === 'completed' ? 'bg-emerald-500' :
                  status === 'error' ? 'bg-rose-500' :
                  status === 'converting' ? 'bg-amber-500 animate-pulse' :
                  'bg-gradient-to-r from-brand-600 to-indigo-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-[#181b28] border border-[#2c3147]">
              <div className="text-[10px] text-slate-400">Độ Phân Giải</div>
              <div className="font-bold text-white mt-0.5">1080 x 1920 (9:16)</div>
            </div>
            <div className="p-2 rounded-lg bg-[#181b28] border border-[#2c3147]">
              <div className="text-[10px] text-slate-400">Thời Lượng Thực Tế</div>
              <div className="font-bold text-emerald-400 mt-0.5">{formatSec(actualDuration)}</div>
            </div>
            <div className="p-2 rounded-lg bg-[#181b28] border border-[#2c3147]">
              <div className="text-[10px] text-slate-400">Tốc Độ Khung Hình</div>
              <div className="font-bold text-indigo-400 mt-0.5">60 FPS Ultra-Smooth</div>
            </div>
          </div>

          {/* Error Display */}
          {status === 'error' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#2c3147] bg-[#181b28] flex items-center justify-between">
          {status === 'completed' ? (
            <>
              <div className="text-xs text-slate-400">
                File đã được tải về: <span className="font-bold text-white">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={downloadUrl}
                  download={fileName}
                  className="px-3.5 py-1.5 rounded-lg bg-[#252a3d] hover:bg-[#323854] text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải Lại
                </a>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition shadow-lg shadow-brand-600/30"
                >
                  Xong
                </button>
              </div>
            </>
          ) : status === 'error' ? (
            <div className="flex justify-end gap-2 w-full">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Đóng
              </button>
              <button
                onClick={startExportProcess}
                className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold"
              >
                Thử Lại
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                Vui lòng không đóng cửa sổ trong khi xuất video...
              </span>
              <button
                onClick={() => {
                  cleanup();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Hủy Bỏ
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
