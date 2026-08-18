import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Subtitles, 
  UploadCloud, 
  LayoutGrid, 
  Video, 
  Infinity as InfinityIcon, 
  Type, 
  Music, 
  Scissors, 
  Mic, 
  Smile, 
  Highlighter, 
  ChevronLeft, 
  ChevronUp, 
  ChevronDown, 
  Volume2, 
  Zap, 
  Search, 
  Plus, 
  Play, 
  Check, 
  RotateCcw, 
  Sliders, 
  Italic, 
  Underline,
  Globe,
  Languages,
  Palette,
  Layers,
  FileAudio,
  Loader2,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Move,
  Crown,
  Download,
  Save,
  FileCode,
  FolderOpen
} from 'lucide-react';

export default function OpusRightSidebar({
  activeTab = 'ai_enhance',
  setActiveTab,
  captionPreset,
  setCaptionPreset,
  captionEffect = 'pop',
  setCaptionEffect,
  highlightKeywords,
  setHighlightKeywords,
  speechEnhance,
  setSpeechEnhance,
  aiEmoji,
  setAiEmoji,
  autoCensor = false,
  setAutoCensor,
  autoTransitions,
  setAutoTransitions,
  activeTransition = 'zoom_in',
  setActiveTransition,
  speakerColors = true,
  setSpeakerColors,
  // Auto vs Manual Sound FX & Ducking
  autoWhoosh = true,
  setAutoWhoosh,
  autoDing = true,
  setAutoDing,
  audioDucking = true,
  setAudioDucking,
  // Auto vs Manual B-Roll
  autoBroll = false,
  setAutoBroll,
  // Font Customization State
  fontStyle = {},
  setFontStyle,
  // Watermark State
  watermark = { visible: true, text: 'OPUS STUDIO', pos: 'top-right', opacity: 85 },
  setWatermark,
  // Cleanup callbacks
  onRemoveAllFillers,
  onRemoveAllPauses,
  pauseThreshold,
  setPauseThreshold,
  detectedFillersCount,
  detectedPausesCount,
  activeCleanupMode,
  setActiveCleanupMode,
  // Manual B-Roll / Audio / Text / Transition callbacks
  onOpenBrollPicker,
  onOpenSoundFxPicker,
  onInsertSoundFx,
  onAddTextLayer,
  // Interactive Auto-Mix
  onRunAutoAudioMix,
  isAutoMixing = false,
  autoMixMessage = '',
  soundFxCount = 0,
  onClearAllSoundFx,
  // Multi-Scene Transitions State
  clip,
  selectedTransitionSceneId,
  setSelectedTransitionSceneId,
  onUpdateSceneTransition,
  // Brand Template & Title Customization
  brandConfig,
  setBrandConfig,
  titleConfig,
  setTitleConfig,
  // Background Music Props
  selectedBgm = 'none',
  setSelectedBgm,
  bgmVolume = 25,
  setBgmVolume,
  customBgmList = [],
  setCustomBgmList
}) {
  const [captionSubTab, setCaptionSubTab] = useState('presets');
  const [playingFx, setPlayingFx] = useState(null);
  const bgmFileInputRef = useRef(null);

  // Text Tab State
  const [customTextInput, setCustomTextInput] = useState('');
  const [selectedTextStyle, setSelectedTextStyle] = useState('header');

  // Brand Logo Upload Ref
  const logoInputRef = useRef(null);
  const templateInputRef = useRef(null);

  // Dubbing State
  const [dubbingLang, setDubbingLang] = useState('en');
  const [isDubbing, setIsDubbing] = useState(false);

  // Custom User Templates Library State
  const [userTemplates, setUserTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('opus_user_custom_templates');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
      {
        id: 'tmpl_tiktok',
        name: 'Mẫu TikTok Viral (Neon)',
        desc: 'Font Montserrat Black, Subtitle Neon Green, Hook Pill White',
        createdAt: 'Mẫu sẵn có',
        preset: {
          fontStyle: { fontFamily: 'Montserrat', fontSize: 40, textColor: '#ffffff', strokeWidth: 8, strokeColor: '#000000', highlightColor: '#04f827' },
          captionPreset: 'Karaoke Neon Green',
          captionEffect: 'pop',
          titleConfig: { visible: true, style: 'pill_white' },
          brandConfig: { showLogo: true, logoText: 'OPUS STUDIO', logoSize: 65, logoOpacity: 90 }
        }
      },
      {
        id: 'tmpl_mrbeast',
        name: 'Mẫu MrBeast Giật Gân',
        desc: 'Font Impact, Chữ Vàng Highlight Trắng, Hook Yellow Impact',
        createdAt: 'Mẫu sẵn có',
        preset: {
          fontStyle: { fontFamily: 'Impact', fontSize: 46, textColor: '#FFFD03', strokeWidth: 10, strokeColor: '#000000', highlightColor: '#ffffff' },
          captionPreset: 'MrBeast Impact',
          captionEffect: 'wave',
          titleConfig: { visible: true, style: 'yellow_impact' },
          brandConfig: { showLogo: true, logoText: 'VIRAL HUB', logoSize: 70, logoOpacity: 95 }
        }
      },
      {
        id: 'tmpl_podcast',
        name: 'Mẫu Podcast Thanh Lịch Clean',
        desc: 'Font Inter Tight 36px, Viền Mỏng, Hook Minimalist Clean',
        createdAt: 'Mẫu sẵn có',
        preset: {
          fontStyle: { fontFamily: 'Inter', fontSize: 36, textColor: '#ffffff', strokeWidth: 4, strokeColor: '#000000', highlightColor: '#04f827' },
          captionPreset: 'Minimalist Clean',
          captionEffect: 'glow',
          titleConfig: { visible: true, style: 'minimal' },
          brandConfig: { showLogo: true, logoText: 'PODCAST TALK', logoSize: 60, logoOpacity: 85 }
        }
      }
    ];
  });

  const handleApplyTemplate = (tmpl) => {
    if (!tmpl?.preset) return;
    if (tmpl.preset.fontStyle && setFontStyle) setFontStyle(tmpl.preset.fontStyle);
    if (tmpl.preset.captionPreset && setCaptionPreset) setCaptionPreset(tmpl.preset.captionPreset);
    if (tmpl.preset.captionEffect && setCaptionEffect) setCaptionEffect(tmpl.preset.captionEffect);
    if (tmpl.preset.titleConfig && setTitleConfig) setTitleConfig(prev => ({ ...prev, ...tmpl.preset.titleConfig }));
    if (tmpl.preset.brandConfig && setBrandConfig) setBrandConfig(prev => ({ ...prev, ...tmpl.preset.brandConfig }));
    alert(`✅ Đã áp dụng giao diện "${tmpl.name}" thành công!`);
  };

  const handleSaveCurrentAsTemplate = () => {
    const name = prompt("Nhập tên cho Template mới của bạn:", `Template Cá Nhân ${userTemplates.length + 1}`);
    if (!name || !name.trim()) return;

    const newTmpl = {
      id: `tmpl_${Date.now()}`,
      name: name.trim(),
      desc: `Lưu ngày ${new Date().toLocaleDateString('vi-VN')} • Tùy chỉnh riêng`,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      isCustom: true,
      preset: {
        fontStyle,
        captionPreset,
        captionEffect,
        titleConfig,
        brandConfig
      }
    };

    const updated = [newTmpl, ...userTemplates];
    setUserTemplates(updated);
    try {
      localStorage.setItem('opus_user_custom_templates', JSON.stringify(updated));
    } catch(e) {}
    alert(`✅ Đã lưu mẫu "${name}" vào Kho Template cá nhân thành công!`);
  };

  const handleDeleteTemplate = (e, tmplId) => {
    e.stopPropagation();
    const updated = userTemplates.filter(t => t.id !== tmplId);
    setUserTemplates(updated);
    try {
      localStorage.setItem('opus_user_custom_templates', JSON.stringify(updated));
    } catch(e) {}
  };

  const handleExportTemplate = (e, tmpl) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tmpl, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `${tmpl.name.replace(/\s+/g, '_')}_template.json`);
    dlAnchor.click();
  };

  const handleImportTemplateFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.preset) {
          const newTmpl = {
            ...parsed,
            id: `tmpl_${Date.now()}`,
            name: parsed.name || file.name.replace('.json', ''),
            isCustom: true
          };
          const updated = [newTmpl, ...userTemplates];
          setUserTemplates(updated);
          localStorage.setItem('opus_user_custom_templates', JSON.stringify(updated));
          alert(`✅ Đã nhập Template "${newTmpl.name}" thành công!`);
        }
      } catch(err) {
        alert("File template không hợp lệ!");
      }
    };
    reader.readAsText(file);
  };

  const tools = [
    { id: 'ai_enhance', label: 'AI enhance', icon: Sparkles },
    { id: 'captions', label: 'Captions', icon: Subtitles },
    { id: 'media', label: 'Media', icon: UploadCloud },
    { id: 'brand', label: 'Brand template', icon: LayoutGrid },
    { id: 'broll', label: 'B-Roll', icon: Video },
    { id: 'transitions', label: 'Transitions', icon: InfinityIcon },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'audio', label: 'Audio', icon: Music },
  ];

  const soundFxList = [
    { id: 'whoosh', name: 'Whoosh Fast Swoosh', category: 'Chuyển cảnh', file: 'whoosh.wav', duration: '0.25s' },
    { id: 'ding', name: 'Ding Bling Sparkle', category: 'Điểm nhấn', file: 'ding.wav', duration: '0.35s' },
    { id: 'pop', name: 'Pop Bubble Subtitle', category: 'Hiện chữ', file: 'pop.wav', duration: '0.10s' },
    { id: 'boom', name: 'Cinematic Hit Impact', category: 'Tác động mạnh', file: 'boom.wav', duration: '0.60s' },
    { id: 'camera', name: 'Camera Shutter Click', category: 'Chụp ảnh', file: 'camera.wav', duration: '0.05s' },
  ];

  const captionPresetsList = [
    {
      id: 'karaoke_neon',
      name: 'Karaoke Neon Green',
      desc: 'Montserrat Black, viền 8px, Highlight Xanh Neon',
      style: { fontFamily: 'Montserrat', fontSize: 40, fontWeight: 'Black', textColor: '#ffffff', strokeWidth: 8, strokeColor: '#000000', highlightColor: '#04f827', isUppercase: true, hasShadow: true, shadowColor: '#000000' }
    },
    {
      id: 'tiktok_bold',
      name: 'TikTok Bold White',
      desc: 'Arial Black, viền 10px, Highlight Vàng Sáng',
      style: { fontFamily: 'Arial', fontSize: 42, fontWeight: 'Black', textColor: '#ffffff', strokeWidth: 10, strokeColor: '#000000', highlightColor: '#FFFD03', isUppercase: true, hasShadow: true, shadowColor: '#000000' }
    },
    {
      id: 'mrbeast_yellow',
      name: 'MrBeast Impact',
      desc: 'Impact 46px, Đổ bóng dày, Chữ in hoa',
      style: { fontFamily: 'Impact', fontSize: 46, fontWeight: 'Black', textColor: '#FFFD03', strokeWidth: 10, strokeColor: '#000000', highlightColor: '#ffffff', isUppercase: true, hasShadow: true, shadowColor: '#000000' }
    },
    {
      id: 'cyberpunk_pink',
      name: 'Cyberpunk Neon Pink',
      desc: 'Montserrat 42px, Highlight Hồng Neon',
      style: { fontFamily: 'Montserrat', fontSize: 42, fontWeight: 'Black', textColor: '#ffffff', strokeWidth: 8, strokeColor: '#000000', highlightColor: '#FF007A', isUppercase: true, hasShadow: true, shadowColor: '#FF007A' }
    },
    {
      id: 'minimalist_clean',
      name: 'Minimalist Clean',
      desc: 'Inter Tight 36px, Viền mỏng thanh lịch',
      style: { fontFamily: 'Inter', fontSize: 36, fontWeight: 'SemiBold', textColor: '#ffffff', strokeWidth: 4, strokeColor: '#000000', highlightColor: '#04f827', isUppercase: false, hasShadow: false }
    }
  ];

  const transitionsList = [
    { id: 'zoom_in', name: 'Zoom In Punch', desc: 'Phóng to đột ngột tạo điểm nhấn thị giác mạnh mẽ' },
    { id: 'flash_white', name: 'Flash White', desc: 'Chớp sáng điện ảnh lôi cuốn và mượt mà' },
    { id: 'glitch', name: 'Glitch Cyber', desc: 'Hiệu ứng nhiễu sóng số phong cách hiện đại' },
    { id: 'fade_black', name: 'Fade Black', desc: 'Mờ dần vào nền đen điện ảnh tinh tế' },
    { id: 'blur', name: 'Blur Dissolve', desc: 'Hòa tan làm mờ nhòe mềm mại' },
    { id: 'none', name: 'Không Chuyển Cảnh', desc: 'Cắt thẳng liền mạch tức thì (Hard Cut)' },
  ];

  const bgmTracks = [
    { id: 'lofi', name: 'Upbeat Lo-Fi Beat', bpm: '90 BPM', duration: '2:15' },
    { id: 'cinematic', name: 'Cinematic Inspiring Flow', bpm: '110 BPM', duration: '3:00' },
    { id: 'energetic', name: 'Tech Energetic Rhythm', bpm: '128 BPM', duration: '1:45' }
  ];

  const playSoundEffect = (fx) => {
    try {
      const audio = new Audio(`http://127.0.0.1:8000/assets/sounds/${fx.file}`);
      audio.play();
      setPlayingFx(fx.id);
      setTimeout(() => setPlayingFx(null), 800);
    } catch (e) {
      console.log("Audio play error:", e);
    }
  };

  const updateFont = (key, val) => {
    if (setFontStyle) {
      setFontStyle(prev => ({ ...prev, [key]: val }));
    }
  };

  const applyPreset = (preset) => {
    if (setFontStyle && preset.style) {
      setFontStyle(prev => ({ ...prev, ...preset.style }));
    }
    if (setCaptionPreset) {
      setCaptionPreset(preset.name);
    }
  };

  const {
    fontFamily = 'Montserrat',
    fontSize = 40,
    textColor = '#ffffff',
    fontWeight = 'Black',
    isItalic = false,
    isUnderline = false,
    isUppercase = true,
    strokeColor = '#000000',
    strokeWidth = 8,
    hasShadow = false,
    shadowColor = '#000000',
    shadowX = 2,
    shadowY = 2,
    shadowBlur = 2,
    hasHighlight = true,
    highlightColor = '#04f827'
  } = fontStyle;

  return (
    <div className="h-full flex bg-[#101118] border-l border-[#222536] overflow-hidden select-none font-sans">
      {/* Tool Drawer Content */}
      <div className="w-80 bg-[#12131c] border-r border-[#202334] p-4 flex flex-col overflow-y-auto">
        
        {/* ═══════════════════════════════════════════════════
            TAB 1: AI ENHANCE
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'ai_enhance' && (
          <div className="space-y-4 font-sans text-xs">
            {activeCleanupMode === 'fillers' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#212435]">
                  <button
                    onClick={() => setActiveCleanupMode(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Loại bỏ các từ thừa</span>
                  </button>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                    <span>{detectedFillersCount || 4} từ thừa</span>
                  </div>
                </div>

                <div className="bg-[#181a26] border border-[#272b3f] rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span>Toàn bộ là từ ngữ thừa</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="space-y-1.5 pt-1 text-slate-400">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                      <input type="checkbox" defaultChecked className="accent-brand-500 rounded" />
                      <span>Chọn tất cả ({detectedFillersCount} từ thừa)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="accent-brand-500 rounded" />
                      <span>Từ lặp lại</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="accent-brand-500 rounded" />
                      <span>Từ ậm ờ (à, ừm, xong, hôm...)</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onRemoveAllFillers();
                    setActiveCleanupMode(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs shadow-lg hover:bg-slate-200 active:scale-95 transition-all"
                >
                  Xóa tất cả từ thừa
                </button>
              </div>
            ) : activeCleanupMode === 'pauses' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#212435]">
                  <button
                    onClick={() => setActiveCleanupMode(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Loại bỏ các khoảng dừng</span>
                  </button>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                    <span>{detectedPausesCount || 20} khoảng dừng</span>
                  </div>
                </div>

                <div className="bg-[#181a26] border border-[#272b3f] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span>Thời gian tạm dừng</span>
                    <span className="font-mono text-yellow-400 font-bold">{pauseThreshold} giây</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.05"
                    value={pauseThreshold}
                    onChange={(e) => setPauseThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#25283a] rounded-lg appearance-none accent-white cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => {
                    onRemoveAllPauses();
                    setActiveCleanupMode(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs shadow-lg hover:bg-slate-200 active:scale-95 transition-all"
                >
                  Xóa tất cả
                </button>

                <p className="text-center text-[11px] text-slate-400">
                  <strong className="text-white">{detectedPausesCount || 20}</strong> các khoảng dừng được tìm thấy
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-bold text-white text-sm tracking-tight">AI enhance</h3>

                <div className="space-y-2">
                  <button 
                    onClick={() => setActiveCleanupMode('fillers')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1a1c29] hover:bg-[#23263a] border border-[#272b3f] text-left text-xs font-semibold text-white transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Scissors className="w-4 h-4 text-rose-400 group-hover:rotate-12 transition-transform" />
                      <span>Remove bad takes / fillers</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#25283b] text-[10px] text-slate-400">
                      {detectedFillersCount}
                    </span>
                  </button>

                  <button 
                    onClick={() => setActiveCleanupMode('pauses')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1a1c29] hover:bg-[#23263a] border border-[#272b3f] text-left text-xs font-semibold text-white transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      <span>Remove pauses (Khoảng dừng)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#25283b] text-[10px] text-slate-400">
                      {detectedPausesCount}
                    </span>
                  </button>
                </div>

                <div className="h-[1px] bg-[#222538] my-2" />

                <div className="space-y-3.5">
                  {/* Auto Censor Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Auto censor (Bíp từ nhạy cảm)</div>
                      <div className="text-[10px] text-slate-400">Tự động che từ ngữ nguy hiểm và bíp</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoCensor}
                      onChange={(e) => setAutoCensor && setAutoCensor(e.target.checked)}
                      className="w-4 h-4 accent-yellow-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Speech Enhancement Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Speech enhancement</div>
                      <div className="text-[10px] text-slate-400">Khử ồn & làm rõ giọng nói chuẩn studio</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={speechEnhance}
                      onChange={(e) => setSpeechEnhance(e.target.checked)}
                      className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* AI Emoji Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">AI emoji</div>
                      <div className="text-[10px] text-slate-400">Tự hiện icon cảm xúc phía trên từ đang đọc</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiEmoji}
                      onChange={(e) => setAiEmoji(e.target.checked)}
                      className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* AI Keywords Highlighter Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">AI keywords highlighter</div>
                      <div className="text-[10px] text-slate-400">Tự động tô màu nổi bật từ khóa viral</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={highlightKeywords}
                      onChange={(e) => setHighlightKeywords(e.target.checked)}
                      className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Auto Transitions Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Auto transitions</div>
                      <div className="text-[10px] text-slate-400">Tự động chèn chuyển cảnh tại các điểm cắt</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoTransitions}
                      onChange={(e) => setAutoTransitions(e.target.checked)}
                      className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Speaker Colors Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Speaker colors</div>
                      <div className="text-[10px] text-slate-400">Phân biệt màu sắc lời thoại từng người</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={speakerColors}
                      onChange={(e) => setSpeakerColors && setSpeakerColors(e.target.checked)}
                      className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Video Dubbing Dropdown */}
                  <div className="p-2.5 bg-[#171926] border border-[#262a3d] rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <Languages className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Video dubbing (Lồng tiếng AI)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={dubbingLang}
                        onChange={(e) => setDubbingLang(e.target.value)}
                        className="flex-1 bg-[#10121a] border border-[#272b3d] text-white text-xs rounded-lg px-2.5 py-1"
                      >
                        <option value="en">Tiếng Anh (English)</option>
                        <option value="zh">Tiếng Trung (Mandarin)</option>
                        <option value="ja">Tiếng Nhật (Japanese)</option>
                        <option value="ko">Tiếng Hàn (Korean)</option>
                        <option value="fr">Tiếng Pháp (French)</option>
                      </select>
                      <button
                        onClick={() => {
                          setIsDubbing(true);
                          setTimeout(() => {
                            setIsDubbing(false);
                            alert(`Đã hoàn tất tạo bản audio lồng tiếng: ${dubbingLang.toUpperCase()}`);
                          }, 1200);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1"
                      >
                        {isDubbing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>{isDubbing ? 'Đang dịch...' : 'Bắt đầu'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 2: CAPTIONS (PRESETS, FONT & EFFECTS)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'captions' && (
          <div className="space-y-4 font-sans text-xs">
            <div className="flex border-b border-[#212435] pb-2 text-xs font-semibold">
              <button 
                onClick={() => setCaptionSubTab('presets')}
                className={`flex-1 text-center pb-1 transition-all ${captionSubTab === 'presets' ? 'text-white border-b-2 border-white' : 'text-slate-400'}`}
              >
                Presets
              </button>
              <button 
                onClick={() => setCaptionSubTab('font')}
                className={`flex-1 text-center pb-1 transition-all ${captionSubTab === 'font' ? 'text-white border-b-2 border-white' : 'text-slate-400'}`}
              >
                Font
              </button>
              <button 
                onClick={() => setCaptionSubTab('effects')}
                className={`flex-1 text-center pb-1 transition-all ${captionSubTab === 'effects' ? 'text-white border-b-2 border-white' : 'text-slate-400'}`}
              >
                Effects
              </button>
            </div>

            {/* PRESETS SUBTAB */}
            {captionSubTab === 'presets' && (
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-white mb-1">Mẫu Phụ Đề Nổi Bật</div>
                {captionPresetsList.map((preset) => {
                  const isSelected = fontStyle.highlightColor === preset.style.highlightColor && fontStyle.fontFamily === preset.style.fontFamily;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected ? 'bg-indigo-950/50 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-[#161826] hover:bg-[#202336] border-[#272b40]'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white text-xs group-hover:text-indigo-300 flex items-center gap-1.5">
                          <span>{preset.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400">{preset.desc}</div>
                      </div>
                      <span className="w-4 h-4 rounded-full border border-black/40" style={{ backgroundColor: preset.style.highlightColor }} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* FONT SUBTAB */}
            {captionSubTab === 'font' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between font-bold text-white text-xs">
                  <span>Font settings</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="space-y-1">
                  <select
                    value={fontFamily}
                    onChange={(e) => updateFont('fontFamily', e.target.value)}
                    className="w-full bg-[#181a26] border border-[#272b3f] text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500"
                  >
                    <option value="Montserrat">Montserrat</option>
                    <option value="Arial">Arial Black</option>
                    <option value="Inter">Inter Tight</option>
                    <option value="Impact">Impact</option>
                    <option value="Anton">Anton</option>
                    <option value="Bebas Neue">Bebas Neue</option>
                  </select>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6 flex items-center gap-2 bg-[#181a26] border border-[#272b3f] rounded-xl px-2.5 py-1.5">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => updateFont('textColor', e.target.value)}
                      className="w-5 h-5 rounded-full border-0 cursor-pointer bg-transparent"
                    />
                    <input
                      type="number"
                      value={fontSize}
                      onChange={(e) => updateFont('fontSize', parseInt(e.target.value) || 40)}
                      className="w-10 bg-transparent text-white font-bold text-xs text-center focus:outline-none"
                    />
                    <span className="text-slate-500 text-[11px]">px</span>
                  </div>

                  <div className="col-span-6">
                    <select
                      value={fontWeight}
                      onChange={(e) => updateFont('fontWeight', e.target.value)}
                      className="w-full bg-[#181a26] border border-[#272b3f] text-white rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="Black">Black (Đậm nhất)</option>
                      <option value="Bold">Bold (Đậm)</option>
                      <option value="SemiBold">SemiBold</option>
                      <option value="Medium">Medium</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-300 font-medium">Decoration</span>
                  <div className="flex items-center gap-2 text-slate-300">
                    <button
                      onClick={() => updateFont('isItalic', !isItalic)}
                      className={`p-1.5 rounded-lg border transition-all ${isItalic ? 'bg-brand-600 border-brand-500 text-white' : 'border-[#272b3f] hover:bg-[#1f2233]'}`}
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateFont('isUnderline', !isUnderline)}
                      className={`p-1.5 rounded-lg border transition-all ${isUnderline ? 'bg-brand-600 border-brand-500 text-white' : 'border-[#272b3f] hover:bg-[#1f2233]'}`}
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-300 font-medium">Uppercase</span>
                  <input
                    type="checkbox"
                    checked={isUppercase}
                    onChange={(e) => updateFont('isUppercase', e.target.checked)}
                    className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-300 font-medium">Font stroke</span>
                  <div className="flex items-center gap-2 bg-[#181a26] border border-[#272b3f] rounded-xl px-2.5 py-1">
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => updateFont('strokeColor', e.target.value)}
                      className="w-5 h-5 rounded-full border-0 cursor-pointer bg-transparent"
                    />
                    <input
                      type="number"
                      value={strokeWidth}
                      onChange={(e) => updateFont('strokeWidth', parseInt(e.target.value) || 0)}
                      className="w-8 bg-transparent text-white font-bold text-xs text-center focus:outline-none"
                    />
                    <span className="text-slate-500 text-[11px]">px</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-[#202334]">
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-300 font-medium">AI keywords highlighter</span>
                    <input
                      type="checkbox"
                      checked={hasHighlight}
                      onChange={(e) => updateFont('hasHighlight', e.target.checked)}
                      className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div 
                      onClick={() => updateFont('highlightColor', '#04f827')}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                        highlightColor === '#04f827' ? 'bg-emerald-950/40 border border-emerald-500' : 'bg-[#181a26] border border-[#272b3f] hover:border-emerald-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-[#04f827]" />
                        <span className="font-mono text-white text-[11px]">04f827FF (Xanh Neon)</span>
                      </div>
                      {highlightColor === '#04f827' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>

                    <div 
                      onClick={() => updateFont('highlightColor', '#FFFD03')}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                        highlightColor === '#FFFD03' ? 'bg-yellow-950/40 border border-yellow-500' : 'bg-[#181a26] border border-[#272b3f] hover:border-yellow-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-[#FFFD03]" />
                        <span className="font-mono text-white text-[11px]">FFFD03FF (Vàng Sáng)</span>
                      </div>
                      {highlightColor === '#FFFD03' && <Check className="w-3.5 h-3.5 text-yellow-400" />}
                    </div>

                    <div 
                      onClick={() => updateFont('highlightColor', '#FF007A')}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                        highlightColor === '#FF007A' ? 'bg-pink-950/40 border border-pink-500' : 'bg-[#181a26] border border-[#272b3f] hover:border-pink-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-[#FF007A]" />
                        <span className="font-mono text-white text-[11px]">FF007AFF (Hồng Neon)</span>
                      </div>
                      {highlightColor === '#FF007A' && <Check className="w-3.5 h-3.5 text-pink-400" />}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EFFECTS SUBTAB */}
            {captionSubTab === 'effects' && (
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-white mb-1">Hiệu Ứng Hoạt Họa Phụ Đề</div>
                {[
                  { id: 'pop', name: 'Pop In Scale Bounce', desc: 'Chữ nảy nhẹ khi phát âm' },
                  { id: 'wave', name: 'Karaoke Color Wave', desc: 'Sóng màu quét từ trái qua phải' },
                  { id: 'glow', name: 'Neon Glow Pulse', desc: 'Tỏa sáng hào quang neon rực rỡ' },
                  { id: 'slide', name: 'Smooth Slide Up', desc: 'Trượt mượt mà từng dòng' }
                ].map((eff) => (
                  <div
                    key={eff.id}
                    onClick={() => setCaptionEffect && setCaptionEffect(eff.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      captionEffect === eff.id ? 'bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-[#161826] hover:bg-[#202336] border-[#272b40]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{eff.name}</div>
                      <div className="text-[10px] text-slate-400">{eff.desc}</div>
                    </div>
                    {captionEffect === eff.id && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 3: MEDIA (LOGO THƯƠNG HIỆU & NHẠC NỀN)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'media' && (
          <div className="space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                <span>Media & Logo Thương Hiệu</span>
              </h3>
              <span className="text-[10px] text-indigo-400 font-mono font-bold">Kéo thả tự do</span>
            </div>

            {/* 1. Logo Upload & Controls */}
            <div className="p-3.5 bg-[#171926] border border-[#272b40] rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#222638]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Logo / Sticker Thương Hiệu</span>
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandConfig?.showLogo ?? true}
                    onChange={(e) => setBrandConfig && setBrandConfig({ ...brandConfig, showLogo: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                  />
                  <span className="text-slate-300 text-[11px]">Hiển thị</span>
                </label>
              </div>

              {/* Upload button & preview */}
              <div className="flex items-center gap-3">
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl bg-[#10121a] border-2 border-dashed border-[#2f334a] hover:border-indigo-500 flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden shrink-0 group relative"
                >
                  {brandConfig?.logoUrl ? (
                    <img src={brandConfig.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
                      <span className="text-[8px] text-slate-400 mt-1">Tải Logo</span>
                    </>
                  )}
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setBrandConfig && setBrandConfig({ ...brandConfig, logoUrl: url, showLogo: true });
                    }
                  }}
                  className="hidden"
                />

                <div className="flex-1 space-y-1.5">
                  <div className="text-[11px] font-bold text-white">
                    {brandConfig?.logoUrl ? "Đã tải Logo hình ảnh" : "Chưa tải ảnh (Dùng chữ / Slogan)"}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px]"
                    >
                      + Tải ảnh mới
                    </button>
                    {brandConfig?.logoUrl && (
                      <button
                        onClick={() => setBrandConfig && setBrandConfig({ ...brandConfig, logoUrl: null })}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white font-bold text-[10px]"
                      >
                        Xóa Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Slogan / Brand Text */}
              <div>
                <span className="text-slate-400 text-[10px]">Tên thương hiệu / Slogan chữ:</span>
                <input
                  type="text"
                  value={brandConfig?.logoText || ''}
                  onChange={(e) => setBrandConfig && setBrandConfig({ ...brandConfig, logoText: e.target.value })}
                  placeholder="OPUS STUDIO"
                  className="w-full bg-[#10121a] border border-[#272b3d] text-white rounded-lg px-2.5 py-1 text-xs mt-1 font-bold"
                />
              </div>

              {/* Logo Size & Opacity */}
              <div className="space-y-2 pt-1 border-t border-[#202334]">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Kích thước Logo:</span>
                  <span className="font-mono text-indigo-400">{brandConfig?.logoSize || 65}px</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="140"
                  value={brandConfig?.logoSize || 65}
                  onChange={(e) => setBrandConfig && setBrandConfig({ ...brandConfig, logoSize: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-[#25283a] rounded-lg appearance-none accent-indigo-500 cursor-pointer"
                />

                <div className="flex items-center justify-between text-slate-300">
                  <span>Độ mờ đục:</span>
                  <span className="font-mono text-indigo-400">{brandConfig?.logoOpacity || 90}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={brandConfig?.logoOpacity || 90}
                  onChange={(e) => setBrandConfig && setBrandConfig({ ...brandConfig, logoOpacity: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-[#25283a] rounded-lg appearance-none accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Drag tip */}
              <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[10px] text-indigo-300 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 shrink-0" />
                <span>Kéo thả Logo tự do: Bấm & giữ Logo trực tiếp trên khung video xem trước để dời vị trí.</span>
              </div>
            </div>

            {/* 2. Background Music Selector (Kích hoạt phát & tải nhạc nền) */}
            <div className="p-3.5 bg-[#171926] border border-[#272b40] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-emerald-400" />
                  <span>Kho Nhạc Nền (BGM)</span>
                </div>
                <button
                  onClick={() => bgmFileInputRef.current?.click()}
                  className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white font-bold text-[9px] flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tải nhạc từ máy</span>
                </button>
                <input
                  ref={bgmFileInputRef}
                  type="file"
                  accept="audio/mp3,audio/wav,audio/m4a,audio/aac"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && setCustomBgmList && setSelectedBgm) {
                      const url = URL.createObjectURL(file);
                      const newTrack = {
                        id: `custom_bgm_${Date.now()}`,
                        name: file.name.replace(/\.[^/.]+$/, ""),
                        bpm: 'Tự tải lên',
                        duration: 'Audio',
                        url: url,
                        isCustom: true
                      };
                      setCustomBgmList(prev => [newTrack, ...prev]);
                      setSelectedBgm(newTrack.id);
                    }
                  }}
                  className="hidden"
                />
              </div>

              <div className="space-y-1.5">
                {/* 1. Mute / No BGM option */}
                <div
                  onClick={() => setSelectedBgm && setSelectedBgm('none')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedBgm === 'none' ? 'bg-slate-800/90 border-slate-400 text-white shadow-md' : 'bg-[#12131e] border-[#222638] text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="font-bold text-xs">🔇 Không dùng nhạc nền (Tắt BGM)</div>
                  {selectedBgm === 'none' && <Check className="w-4 h-4 text-white" />}
                </div>

                {/* 2. Custom Uploaded Tracks */}
                {customBgmList.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => setSelectedBgm && setSelectedBgm(track.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedBgm === track.id ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400' : 'bg-[#12131e] border-[#25283c] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <div className="font-bold text-xs text-emerald-300 truncate">🎵 {track.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Nhạc tải lên từ máy</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {selectedBgm === track.id && <Check className="w-4 h-4 text-emerald-400" />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (setCustomBgmList) setCustomBgmList(prev => prev.filter(t => t.id !== track.id));
                          if (selectedBgm === track.id && setSelectedBgm) setSelectedBgm('none');
                        }}
                        className="p-1 rounded bg-rose-950/60 text-rose-300 hover:bg-rose-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* 3. Stock Tracks */}
                {bgmTracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => setSelectedBgm && setSelectedBgm(track.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedBgm === track.id ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400' : 'bg-[#12131e] border-[#25283c] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{track.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{track.bpm} • {track.duration}</div>
                    </div>
                    {selectedBgm === track.id && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                ))}
              </div>

              {selectedBgm !== 'none' && (
                <div className="space-y-1 pt-2 border-t border-[#222638]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Âm lượng nhạc nền:</span>
                    <span className="font-mono text-emerald-400">{bgmVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={bgmVolume}
                    onChange={(e) => setBgmVolume && setBgmVolume(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#25283a] rounded-lg appearance-none accent-emerald-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 4: BRAND TEMPLATE (KHO TEMPLATE NGƯỜI DÙNG)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'brand' && (
          <div className="space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Kho Template Người Dùng</span>
              </h3>
              <span className="text-[10px] text-amber-400 font-mono font-bold">{userTemplates.length} Mẫu</span>
            </div>

            {/* Template Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSaveCurrentAsTemplate}
                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lưu Mẫu Mới</span>
              </button>

              <button
                onClick={() => templateInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-[#1c1f30] hover:bg-[#252940] border border-[#2e334d] text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                <span>Nhập File (.json)</span>
              </button>

              <input
                ref={templateInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportTemplateFile}
                className="hidden"
              />
            </div>

            {/* User Templates List */}
            <div className="space-y-2.5">
              <div className="text-slate-400 text-[11px] font-bold">Danh sách Mẫu Template:</div>

              {userTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-3 bg-[#161826] border border-[#272b40] hover:border-amber-500/60 rounded-2xl transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-white group-hover:text-amber-300 flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                      <span>{tmpl.name}</span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#202336] text-slate-400 font-mono">
                      {tmpl.createdAt}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-snug">
                    {tmpl.desc}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#222538]">
                    <button
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all active:scale-95"
                    >
                      <Check className="w-3 h-3" />
                      <span>Áp dụng mẫu</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleExportTemplate(e, tmpl)}
                        title="Tải template về máy tính (.json)"
                        className="p-1.5 rounded-lg bg-[#1e2133] hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      {tmpl.isCustom && (
                        <button
                          onClick={(e) => handleDeleteTemplate(e, tmpl.id)}
                          title="Xóa template này"
                          className="p-1.5 rounded-lg bg-[#1e2133] hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 5: B-ROLL
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'broll' && (
          <div className="space-y-5 font-sans text-xs">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Video className="w-4 h-4 text-amber-400" />
              <span>B-Roll Minh Họa</span>
            </h3>

            <div className="p-3.5 bg-[#171926] border border-[#272b40] rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#222638]">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tự Động Chèn B-Roll AI</span>
                </span>
                <input
                  type="checkbox"
                  checked={autoBroll}
                  onChange={(e) => setAutoBroll && setAutoBroll(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                AI sẽ tự động phát hiện ngữ cảnh trong lời thoại để chèn hình ảnh/video B-Roll minh họa phù hợp.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-white">Chèn Thủ Công</div>
              <button
                onClick={() => onOpenBrollPicker && onOpenBrollPicker()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Mở Kho B-Roll & AI Prompt</span>
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 6: TRANSITIONS (CHUYỂN CẢNH ĐIỂM CẮT)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'transitions' && (
          <div className="space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <InfinityIcon className="w-4 h-4 text-amber-400" />
                <span>Transitions (Chuyển Cảnh)</span>
              </h3>
              {clip?.scenes && clip.scenes.length > 1 && (
                <span className="bg-amber-950/70 border border-amber-500/50 text-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  {clip.scenes.length - 1} Điểm Cắt
                </span>
              )}
            </div>

            {/* 1. Điểm Cắt Selector (nếu clip đã được cắt tách trên Timeline) */}
            {clip?.scenes && clip.scenes.length > 1 ? (
              <div className="p-3 bg-[#171926] border border-[#272b40] rounded-2xl space-y-2.5">
                <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>Chọn Điểm Cắt Cần Đổi Hiệu Ứng:</span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {(() => {
                      const cur = clip.scenes.find(s => s.id === selectedTransitionSceneId) || clip.scenes[0];
                      return cur ? `${cur.title} ➔` : 'Tất cả';
                    })()}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                  {clip.scenes.slice(0, -1).map((sc, idx) => {
                    const nextSc = clip.scenes[idx + 1];
                    const isTarget = selectedTransitionSceneId === sc.id || (!selectedTransitionSceneId && idx === 0);
                    return (
                      <div
                        key={sc.id}
                        onClick={() => setSelectedTransitionSceneId && setSelectedTransitionSceneId(sc.id)}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isTarget
                            ? 'bg-amber-950/40 border-amber-500 text-white ring-1 ring-amber-500 shadow-md'
                            : 'bg-[#12131e] border-[#222638] text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-xs truncate">
                            {sc.title} ➔ {nextSc?.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-mono text-slate-400">
                            ({sc.end_time.toFixed(1)}s)
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-amber-300 uppercase">
                            {sc.transition ? sc.transition.replace('_', ' ') : 'None'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Apply to All Cut Points Button */}
                <button
                  onClick={() => {
                    if (clip?.scenes) {
                      clip.scenes.forEach(sc => {
                        if (onUpdateSceneTransition) onUpdateSceneTransition(sc.id, activeTransition);
                      });
                      alert(`Đã áp dụng hiệu ứng "${transitionsList.find(t => t.id === activeTransition)?.name}" cho tất cả ${clip.scenes.length - 1} điểm cắt!`);
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-[#202438] hover:bg-amber-600 hover:text-white text-amber-300 font-bold text-[11px] border border-[#313650] transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Áp Dụng Hiệu Ứng Này Cho Tất Cả Điểm Cắt</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-[#171926] border border-[#272b40] rounded-2xl text-[11px] text-slate-400 space-y-1.5">
                <div className="font-bold text-slate-200">Hiệu Ứng Chuyển Cảnh Chung:</div>
                <p className="text-[10px] leading-relaxed">
                  Bấm nút <strong>Cắt Phân Cảnh (Split / Cây kéo)</strong> trên Timeline để chia đôi đoạn và chèn các chuyển cảnh độc lập tại từng vị trí.
                </p>
              </div>
            )}

            {/* 2. Full Transitions Cards Library */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-300">Thư Viện Hiệu Ứng Chuyển Cảnh</div>
              <div className="grid grid-cols-1 gap-2">
                {transitionsList.map((trans) => {
                  const targetScene = clip?.scenes?.find(s => s.id === selectedTransitionSceneId) || (clip?.scenes && clip.scenes[0]);
                  const isSelected = targetScene ? (targetScene.transition || 'none') === trans.id : activeTransition === trans.id;

                  return (
                    <div
                      key={trans.id}
                      onClick={() => {
                        if (targetScene && onUpdateSceneTransition) {
                          onUpdateSceneTransition(targetScene.id, trans.id);
                        }
                        if (setActiveTransition) {
                          setActiveTransition(trans.id);
                        }
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected 
                          ? 'bg-amber-950/50 border-amber-500 text-white ring-2 ring-amber-500 shadow-lg' 
                          : 'bg-[#151724] hover:bg-[#1f2235] border-[#25283c] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#1c1e2e] border border-white/10 flex items-center justify-center font-bold text-[10px] text-amber-400 shrink-0">
                          {trans.id.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                            {trans.name}
                          </div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            {trans.desc}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold shrink-0 shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 7: TEXT (PHONG CÁCH TIÊU ĐỀ HOOK & NHÃN DÁN CHỮ)
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'text' && (
          <div className="space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Type className="w-4 h-4 text-indigo-400" />
                <span>Tiêu Đề Hook & Chữ Tùy Chỉnh</span>
              </h3>
              <span className="text-[10px] text-indigo-400 font-mono font-bold">Kéo thả tự do</span>
            </div>

            {/* 1. Top Title Hook Styles (Chuyển từ Brand sang Text) */}
            <div className="p-3.5 bg-[#171926] border border-[#272b40] rounded-2xl space-y-2.5">
              <div className="font-bold text-white flex items-center justify-between">
                <span>Phong Cách Tiêu Đề Hook Đỉnh Video</span>
                <span className="text-[10px] text-amber-400 font-mono">5 Styles</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'pill_white', name: 'Pill White Classic', desc: 'Nền trắng chữ đen bo góc nổi bật' },
                  { id: 'neon_cyber', name: 'Neon Cyber Green', desc: 'Viền xanh neon phát sáng công nghệ' },
                  { id: 'gradient_gold', name: 'Gradient Gold Banner', desc: 'Dải màu vàng kim hoàng gia cuốn hút' },
                  { id: 'yellow_impact', name: 'Yellow Impact MrBeast', desc: 'Chữ vàng viền đen dày giật gân' },
                  { id: 'minimal', name: 'Minimalist Clean Glass', desc: 'Nền kính mờ trong suốt thanh lịch' },
                ].map((st) => (
                  <div
                    key={st.id}
                    onClick={() => setTitleConfig && setTitleConfig({ ...titleConfig, style: st.id })}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      (titleConfig?.style || 'pill_white') === st.id
                        ? 'bg-amber-950/40 border-amber-500 text-white ring-1 ring-amber-500'
                        : 'bg-[#12131e] border-[#222638] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{st.name}</div>
                      <div className="text-[10px] text-slate-400">{st.desc}</div>
                    </div>
                    {(titleConfig?.style || 'pill_white') === st.id && (
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Custom Text Input */}
            <div className="p-3.5 bg-[#171926] border border-[#272b40] rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">Thêm Chữ / Nhãn Dán Tùy Ý:</span>
                <select
                  value={selectedTextStyle}
                  onChange={(e) => setSelectedTextStyle(e.target.value)}
                  className="bg-[#10121a] border border-[#2d3248] text-white rounded-lg px-2 py-0.5 text-[10px] font-bold"
                >
                  <option value="header">Kiểu Header</option>
                  <option value="neon_tag">Kiểu Neon</option>
                  <option value="gradient_badge">Kiểu Gradient</option>
                  <option value="callout_box">Kiểu Callout</option>
                  <option value="yellow_impact">Kiểu Yellow Impact</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTextInput}
                  onChange={(e) => setCustomTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customTextInput.trim()) {
                      onAddTextLayer && onAddTextLayer(customTextInput.trim(), selectedTextStyle);
                      setCustomTextInput('');
                    }
                  }}
                  placeholder="Nhập chữ cần chèn..."
                  className="flex-1 bg-[#10121a] border border-[#272b3d] text-white rounded-xl px-3 py-1.5 text-xs font-semibold"
                />
                <button
                  disabled={!customTextInput.trim()}
                  onClick={() => {
                    if (customTextInput.trim()) {
                      onAddTextLayer && onAddTextLayer(customTextInput.trim(), selectedTextStyle);
                      setCustomTextInput('');
                    }
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-colors shrink-0"
                >
                  Thêm
                </button>
              </div>

              <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[10px] text-indigo-300 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 shrink-0" />
                <span>Kéo thả chữ tự do: Bấm & giữ chữ trực tiếp trên khung video xem trước để dời tới bất kỳ điểm nào.</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 8: AUDIO
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'audio' && (
          <div className="space-y-5 font-sans text-xs">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Music className="w-4 h-4 text-rose-400" />
              <span>Âm Thanh & Sound FX</span>
            </h3>

            <div className="p-3.5 bg-[#171926] border border-[#272b40] rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#222638]">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Tự Động Hòa Âm AI</span>
                </span>
                <span className="text-[10px] text-rose-300 font-bold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30">
                  {soundFxCount} Sound FX trên Timeline
                </span>
              </div>

              <button
                disabled={isAutoMixing}
                onClick={onRunAutoAudioMix}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isAutoMixing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Đang quét & tạo Sound FX...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current text-yellow-300" />
                    <span>Quét & Tự Động Tạo Sound FX</span>
                  </>
                )}
              </button>

              {isAutoMixing && (
                <div className="p-2.5 bg-[#1c1424] border border-rose-500/30 rounded-xl space-y-1.5 animate-pulse">
                  <div className="flex items-center justify-between text-[11px] text-rose-300 font-semibold">
                    <span>Tiến trình AI:</span>
                    <span className="font-mono">Processing...</span>
                  </div>
                  <p className="text-[10px] text-slate-300 italic">{autoMixMessage}</p>
                </div>
              )}

              <div className="space-y-2 pt-1 border-t border-[#222638]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Tự chèn Whoosh khi chuyển cảnh</div>
                    <div className="text-[10px] text-slate-400">Lướt âm tạo nhịp khi chuyển ý</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoWhoosh}
                    onChange={(e) => setAutoWhoosh && setAutoWhoosh(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Tự chèn Ding/Pop tại từ khóa vàng</div>
                    <div className="text-[10px] text-slate-400">Gây ấn tượng tại từ trọng tâm</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoDing}
                    onChange={(e) => setAutoDing && setAutoDing(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Audio Ducking (-12dB)</div>
                    <div className="text-[10px] text-slate-400">Tự giảm nhạc nền khi người nói cất giọng</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={audioDucking}
                    onChange={(e) => setAudioDucking && setAudioDucking(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              {soundFxCount > 0 && (
                <button
                  onClick={onClearAllSoundFx}
                  className="w-full py-1.5 rounded-lg bg-[#221c24] hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-[#352739] text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa tất cả hiệu ứng âm thanh trên Timeline</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span>Kho Hiệu Ứng Thủ Công</span>
                <span className="text-[10px] text-slate-400 font-normal">Nghe thử & Chèn</span>
              </div>

              <div className="space-y-2">
                {soundFxList.map((fx) => (
                  <div
                    key={fx.id}
                    className="p-2.5 bg-[#161824] border border-[#24283b] rounded-xl flex items-center justify-between hover:border-[#343a54] transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => playSoundEffect(fx)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          playingFx === fx.id ? 'bg-rose-500 text-white' : 'bg-[#222538] text-slate-300 hover:text-white'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                      <div>
                        <div className="font-bold text-white text-xs">{fx.name}</div>
                        <div className="text-[10px] text-slate-400">{fx.category} • {fx.duration}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        playSoundEffect(fx);
                        onInsertSoundFx && onInsertSoundFx(fx);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 border border-rose-500/40 text-[10px] font-bold text-rose-300 hover:text-white transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Chèn</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Far Right Vertical Icon Nav Tabs */}
      <div className="w-18 bg-[#0a0b10] flex flex-col items-center py-3 space-y-3 z-10 border-l border-[#1d2030]">
        {tools.map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                setActiveCleanupMode(null);
              }}
              title={t.label}
              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                isSelected
                  ? 'bg-[#1e2030] text-white shadow-md border border-[#33374d]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131520]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : ''}`} />
              <span className="text-[9px] font-semibold tracking-tight text-center leading-none">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
