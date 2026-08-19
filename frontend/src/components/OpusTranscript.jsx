import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Film, 
  Volume2, 
  Edit3, 
  Check, 
  X, 
  Highlighter,
  PlusCircle,
  Play,
  Search
} from 'lucide-react';

export const COMMON_FILLERS_LIST = [
  'à', 'ừm', 'ừ', 'ờ', 'hả', 'kiểu như', 'ý là', 'thì là', 'như là',
  'uh', 'um', 'uhh', 'umm', 'like', 'basically', 'actually', 'xong', 'hôm', 'vừa'
];

export default function OpusTranscript({ 
  clip, 
  words = [], 
  currentTime, 
  onSeekWord,
  excludedWordIndices,
  onToggleExcludeWords,
  onEditPhraseText,
  onOpenBrollPicker,
  onOpenSoundFxPicker,
  excludedPauseIndices,
  onTogglePause,
  highlightKeywords = true,
  pauseThreshold = 0.35,
  activeCleanupMode = null
}) {
  const containerRef = useRef(null);
  
  // Selection state
  const [selectedRange, setSelectedRange] = useState(null);
  const [editingPhrase, setEditingPhrase] = useState(null);
  const [editInput, setEditInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceInput, setReplaceInput] = useState('');

  const clipWords = words.filter(
    w => clip && w.start >= clip.start_time - 0.2 && w.end <= clip.end_time + 0.5
  );

  // Group words and pauses
  const items = [];
  let pauseCount = 0;

  clipWords.forEach((w, idx) => {
    if (idx > 0) {
      const prev = clipWords[idx - 1];
      const gap = w.start - prev.end;
      if (gap >= pauseThreshold) {
        const pIdx = pauseCount++;
        items.push({
          type: 'pause',
          duration: gap.toFixed(2),
          pauseIndex: pIdx,
          start: prev.end,
          end: w.start,
          nextStart: w.start
        });
      }
    }
    items.push({
      type: 'word',
      data: w,
      originalIdx: idx
    });
  });

  const handleMouseUp = (e) => {
    if (e && e.target && e.target.closest('#transcript-floating-menu')) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
      setSelectedRange(null);
      return;
    }

    const selectedText = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 };

    const matchingIndices = [];
    const spanElements = containerRef.current?.querySelectorAll('.transcript-word');

    if (spanElements) {
      spanElements.forEach((el, index) => {
        if (selection.containsNode(el, true)) {
          matchingIndices.push(index);
        }
      });
    }

    if (matchingIndices.length > 0) {
      setSelectedRange({
        indices: matchingIndices,
        text: selectedText,
        top: rect.top - containerRect.top - 48,
        left: Math.max(10, rect.left - containerRect.left)
      });
    }
  };

  const handleApplyAction = (action) => {
    if (!selectedRange) return;
    const { indices } = selectedRange;
    const firstWord = clipWords[indices[0]];
    const lastWord = clipWords[indices[indices.length - 1]];

    if (action === 'delete') {
      onToggleExcludeWords(indices);
    } else if (action === 'broll') {
      onOpenBrollPicker({
        start: firstWord?.start || 0,
        end: lastWord?.end || 0,
        text: selectedRange.text
      });
    } else if (action === 'sound') {
      onOpenSoundFxPicker(firstWord?.start || 0);
    } else if (action === 'edit') {
      setEditingPhrase({
        indices: indices,
        text: selectedRange.text
      });
      setEditInput(selectedRange.text);
    }

    setSelectedRange(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleSavePhraseEdit = () => {
    if (editingPhrase && editInput.trim()) {
      onEditPhraseText(editingPhrase.indices, editInput.trim());
    }
    setEditingPhrase(null);
  };

  // Search matching objects & indices
  const matchingWordObjects = searchQuery.trim()
    ? clipWords.map((w, idx) => ({ word: w, idx })).filter(item => item.word.word.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : [];
  const matchingIndices = matchingWordObjects.map(item => item.idx);

  const handleBatchReplace = () => {
    if (!replaceInput.trim() || matchingIndices.length === 0) return;
    if (onEditPhraseText) {
      onEditPhraseText(matchingIndices, replaceInput.trim());
    }
    setReplaceInput('');
  };

  const handleBatchBroll = () => {
    if (matchingWordObjects.length === 0) return;
    const firstWord = matchingWordObjects[0].word;
    const lastWord = matchingWordObjects[matchingWordObjects.length - 1].word;
    if (onOpenBrollPicker) {
      onOpenBrollPicker({
        start: firstWord.start,
        end: Math.max(firstWord.start + 2, lastWord.end),
        text: searchQuery
      });
    }
  };

  const handleBatchDelete = () => {
    if (matchingIndices.length === 0) return;
    if (onToggleExcludeWords) {
      onToggleExcludeWords(matchingIndices);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="h-full bg-[#0d0e15] flex flex-col font-sans select-text leading-relaxed text-sm relative"
    >
      {/* ── Search Bar & Batch Actions Toolbar ── */}
      <div className="p-3 bg-[#11131c] border-b border-[#212434] space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#171924] border border-[#272b3d] rounded-xl px-3 py-1.5 focus-within:border-indigo-500">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm từ khóa trong transcript..."
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full font-medium"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setReplaceInput(''); }} className="text-slate-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {searchQuery.trim() && (
            <span className="text-[11px] font-mono text-indigo-400 shrink-0 font-semibold">
              {matchingIndices.length} kết quả
            </span>
          )}
        </div>

        {/* Batch Actions for Search Matches */}
        {searchQuery.trim() && matchingIndices.length > 0 && (
          <div className="p-2.5 bg-[#171926] border border-[#272b40] rounded-2xl space-y-2 animate-fade-in text-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>Tác vụ hàng loạt cho <strong className="text-amber-400 font-mono font-bold">"{searchQuery}"</strong> ({matchingIndices.length} từ):</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replaceInput}
                onChange={(e) => setReplaceInput(e.target.value)}
                placeholder="Nhập từ mới để sửa tất cả..."
                className="flex-1 bg-[#0d0e15] border border-[#2c3047] text-white text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-indigo-500 font-medium"
              />
              <button
                disabled={!replaceInput.trim()}
                onClick={handleBatchReplace}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition active:scale-95 shadow-sm shrink-0"
              >
                Sửa tất cả
              </button>
            </div>

            <div className="flex items-center gap-1.5 pt-1 border-t border-[#202334]">
              <button
                onClick={handleBatchBroll}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-xl bg-[#202334] hover:bg-[#2c3047] text-amber-300 font-semibold text-[11px] transition"
              >
                <Film className="w-3 h-3" />
                <span>+ B-Roll đoạn này</span>
              </button>

              <button
                onClick={handleBatchDelete}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-xl bg-rose-950/50 hover:bg-rose-900 border border-rose-800/40 text-rose-300 font-bold text-[11px] transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa các đoạn này</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Transcript Text Area ── */}
      <div className="flex-1 p-5 overflow-y-auto relative">
        {/* Floating Action Menu */}
        {selectedRange && (
          <div
            id="transcript-floating-menu"
            style={{ top: `${selectedRange.top}px`, left: `${selectedRange.left}px` }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute z-50 bg-[#161826] border border-[#2d3248] rounded-2xl shadow-2xl p-1.5 flex items-center gap-1 animate-fade-in backdrop-blur-md"
          >
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => handleApplyAction('broll')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#202334] hover:bg-[#2c3047] text-amber-300 text-xs font-semibold transition-all hover:scale-105"
            >
              <Film className="w-3.5 h-3.5" />
              <span>+ B-Roll</span>
            </button>

            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => handleApplyAction('sound')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#202334] hover:bg-[#2c3047] text-rose-300 text-xs font-semibold transition-all hover:scale-105"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>+ Sound FX</span>
            </button>

            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => handleApplyAction('edit')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#202334] hover:bg-[#2c3047] text-sky-300 text-xs font-semibold transition-all hover:scale-105"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Sửa Cả Cụm Từ</span>
            </button>

            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => handleApplyAction('delete')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 text-rose-300 text-xs font-bold transition-all hover:scale-105"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Đoạn Này</span>
            </button>
          </div>
        )}

        {/* Modal Sửa Cả Cụm Từ */}
        {editingPhrase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
            <div className="bg-[#181a26] border border-[#2e334a] p-5 rounded-3xl shadow-2xl w-full max-w-md space-y-3.5 animate-fade-in">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-sky-400" />
                <span>Chỉnh Sửa Toàn Bộ Cụm Lời Thoại</span>
              </h4>
              <p className="text-xs text-slate-400">
                Nhập nội dung câu từ mới cho cụm từ đã chọn:
              </p>
              <textarea
                rows="3"
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                autoFocus
                className="w-full bg-[#0d0e15] border border-[#2b2f44] rounded-xl p-3 text-sm text-white font-medium focus:outline-none focus:border-brand-500"
              />
              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  onClick={() => setEditingPhrase(null)}
                  className="px-4 py-2 rounded-xl bg-[#222536] text-slate-300 hover:text-white font-semibold"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSavePhraseEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-brand-600/30"
                >
                  Lưu Thay Đổi Cụm Từ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Words List */}
        <div className="flex flex-wrap items-center gap-y-2.5">
          {items.map((item, index) => {
            if (item.type === 'pause') {
              const isExcluded = excludedPauseIndices && excludedPauseIndices.has(item.pauseIndex);
              const isHighlighted = activeCleanupMode === 'pauses' || (item.duration >= 0.5);

              return (
                <button
                  key={`pause-${index}`}
                  type="button"
                  onClick={() => onTogglePause && onTogglePause(item.pauseIndex)}
                  onDoubleClick={() => onSeekWord(item.nextStart)}
                  title={`Khoảng dừng ${item.duration} giây. Click để xóa / giữ lại.`}
                  className={`inline-flex items-center px-1.5 py-0.5 mx-1 rounded text-[11px] font-mono transition-all ${
                    isExcluded
                      ? 'opacity-25 line-through bg-rose-950/40 text-rose-400 border border-rose-800/40'
                      : isHighlighted
                      ? 'bg-[#2b1f14] border border-amber-600/50 text-amber-300 shadow-xs'
                      : 'bg-[#181a26] border border-[#272a3e] text-[#9ca3af] hover:bg-[#25283b] hover:text-white'
                  }`}
                >
                  {item.duration.replace('.', ',')} giây
                </button>
              );
            }

            const w = item.data;
            const idx = item.originalIdx;
            const isExcluded = excludedWordIndices.has(idx);
            const isCurrent = currentTime >= w.start && currentTime <= w.end;
            
            const cleanText = w.word.toLowerCase().replace(/[.,!?\"']/g, '').trim();
            const isFiller = COMMON_FILLERS_LIST.includes(cleanText);

            const isSearchMatch = searchQuery.trim() && cleanText.includes(searchQuery.toLowerCase().trim());

            const isKeyword = highlightKeywords && !isFiller && (
              w.word.length >= 4 && (
                w.word.toLowerCase().includes('luật') ||
                w.word.toLowerCase().includes('hàng') ||
                w.word.toLowerCase().includes('quy') ||
                w.word.toLowerCase().includes('đúng') ||
                w.word.toLowerCase().includes('rủi') ||
                w.word.toLowerCase().includes('giá') ||
                w.word.toLowerCase().includes('phẩm') ||
                w.word.toLowerCase().includes('chuẩn') ||
                w.word.toLowerCase().includes('xác') ||
                w.word.toLowerCase().includes('thương') ||
                w.word.toLowerCase().includes('chất') ||
                w.word.toLowerCase().includes('thức') ||
                w.word.toLowerCase().includes('nghị') ||
                w.word.toLowerCase().includes('định')
              )
            );

            return (
              <span
                key={`word-${idx}`}
                onClick={() => onSeekWord(w.start)}
                title={`[${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s] Click: Tua video | Bôi đen để: +B-Roll, +Sound FX, Sửa cụm từ, Xóa đoạn`}
                className={`transcript-word inline-block px-1 py-0.5 mx-0.5 rounded cursor-pointer transition-all duration-75 text-[14px] ${
                  isSearchMatch
                    ? 'bg-emerald-500 text-black font-extrabold ring-2 ring-emerald-300'
                    : isExcluded
                    ? 'opacity-25 line-through bg-rose-950/40 text-rose-400'
                    : isCurrent
                    ? 'bg-yellow-400 text-black font-extrabold shadow-md scale-105 rounded-md'
                    : isFiller
                    ? 'bg-[#3b2816] text-[#f59e0b] border border-amber-500/40 font-semibold hover:bg-amber-500/30'
                    : isKeyword
                    ? 'text-yellow-400 font-bold hover:bg-yellow-400/20'
                    : 'text-slate-100 hover:bg-[#25283b] hover:text-white'
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
