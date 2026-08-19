import React, { useState, useEffect } from 'react';
import { Folder, Film, Clock, CheckCircle2, ChevronRight, X, Play, RefreshCw } from 'lucide-react';

export default function ProjectsLibraryModal({ isOpen, onClose, onSwitchProject }) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error("Fetch projects error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = async (proj) => {
    if (proj.is_active) {
      onClose();
      return;
    }
    setSwitchingId(proj.id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/projects/switch/${proj.id}`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        if (onSwitchProject) {
          onSwitchProject(result.data);
        }
        onClose();
      }
    } catch (e) {
      console.error("Switch project error:", e);
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none font-sans">
      <div className="bg-[#11121a] border border-[#262a3d] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-[#202334] flex items-center justify-between bg-[#161826]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Kho Lưu Trữ Dự Án Video
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {projects.length} Video Đã Nạp
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Toàn bộ video và clip đã tạo được bảo lưu 100%, không bao giờ bị mất khi nạp video mới.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchProjects} 
              title="Làm mới danh sách"
              className="p-2 rounded-xl bg-[#1f2233] text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl bg-[#1f2233] text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project List */}
        <div className="p-5 space-y-3 overflow-y-auto max-h-[60vh]">
          {projects.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Film className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold">Chưa có dự án video nào trong kho lưu trữ.</p>
              <p className="text-xs text-slate-500">Mỗi khi bạn nạp một video mới, video đó sẽ tự động được lưu an toàn tại đây.</p>
            </div>
          ) : (
            projects.map((proj) => {
              const isActive = proj.is_active;
              const isSwitching = switchingId === proj.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => handleSelect(proj)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/50 shadow-lg'
                      : 'bg-[#161826] hover:bg-[#202336] border-[#25283a] hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-[#22253a] text-slate-300 group-hover:text-white'
                    }`}>
                      🎬
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-indigo-300 transition">
                          {proj.title}
                        </h4>
                        {isActive && (
                          <span className="text-[9px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Đang Mở
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                        <span>🕒 {proj.created_at || 'Vừa nạp'}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-semibold">{proj.clip_count || 0} Clips Viral</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-3">
                    {isSwitching ? (
                      <span className="text-xs text-indigo-400 font-semibold animate-pulse">Đang nạp...</span>
                    ) : isActive ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-[#22253a] group-hover:bg-indigo-600 group-hover:text-white text-slate-300 text-xs font-bold transition flex items-center gap-1">
                        <span>Tiếp tục edit</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
