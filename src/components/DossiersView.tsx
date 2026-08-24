import React, { useState } from 'react';
import {
  FolderArchive,
  Search,
  Plus,
  Inbox,
  Send,
  CheckSquare,
  FileText,
  Clock,
  User,
  ChevronRight,
  Filter,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { Dossier, IncomingDocument, OutgoingDocument, Task, User as UserType, DossierStatus } from '../types';

interface DossiersViewProps {
  dossiers: Dossier[];
  incomingDocs: IncomingDocument[];
  outgoingDocs: OutgoingDocument[];
  tasks: Task[];
  users: UserType[];
  onSelectIncomingDoc: (doc: IncomingDocument) => void;
  onSelectOutgoingDoc: (doc: OutgoingDocument) => void;
  onSelectTask: (task: Task) => void;
  onCreateNewDossier: () => void;
  onUpdateDossierStatus: (id: string, status: DossierStatus) => void;
}

export const DossiersView: React.FC<DossiersViewProps> = ({
  dossiers,
  incomingDocs,
  outgoingDocs,
  tasks,
  users,
  onSelectIncomingDoc,
  onSelectOutgoingDoc,
  onSelectTask,
  onCreateNewDossier,
  onUpdateDossierStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DossierStatus>('ALL');
  const [selectedDossierId, setSelectedDossierId] = useState<string>(dossiers[0]?.id || '');

  const filteredDossiers = dossiers.filter((d) => {
    const matchSearch =
      !searchTerm ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.department && d.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeDossier = dossiers.find((d) => d.id === selectedDossierId) || filteredDossiers[0] || dossiers[0];

  // Linked items for active dossier
  const linkedIncoming = incomingDocs.filter(
    (doc) => doc.dossierId === activeDossier?.code || doc.dossierId === activeDossier?.id
  );
  const linkedOutgoing = outgoingDocs.filter(
    (doc) => doc.dossierId === activeDossier?.code || doc.dossierId === activeDossier?.id
  );
  const linkedTasks = tasks.filter(
    (t) => t.dossierId === activeDossier?.code || t.dossierId === activeDossier?.id
  );

  const getUser = (id?: string) => users.find((u) => u.id === id);

  const getDossierStatusBadge = (status: DossierStatus) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Đang thực hiện</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã đóng hồ sơ</span>;
      case 'ARCHIVED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Đã lưu trữ vĩnh viễn</span>;
      case 'OPEN':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Mới mở hồ sơ</span>;
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderArchive className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Quản Lý Hồ Sơ Vụ Việc 360° ({dossiers.length})
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mắt xích liên kết toàn diện: Văn bản đến, văn bản đi, nhiệm vụ phân công, tài liệu và nhân sự theo từng Mã Hồ Sơ.
          </p>
        </div>

        <button
          onClick={onCreateNewDossier}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Mở Mã Hồ Sơ Mới</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Dossier list */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Search & Filter */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã hồ sơ, tiêu đề..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs outline-none w-full text-slate-700 placeholder-slate-400"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto text-[11px] font-bold">
              {(['ALL', 'IN_PROGRESS', 'CLOSED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === st ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Tất cả' : st === 'IN_PROGRESS' ? 'Đang thực hiện' : 'Đã hoàn thành'}
                </button>
              ))}
            </div>
          </div>

          {/* Dossiers Cards */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredDossiers.map((d) => {
              const isSelected = activeDossier?.id === d.id;
              const inCount = incomingDocs.filter((x) => x.dossierId === d.code).length;
              const outCount = outgoingDocs.filter((x) => x.dossierId === d.code).length;
              const taskCount = tasks.filter((x) => x.dossierId === d.code).length;

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDossierId(d.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-xs flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-xs ring-1 ring-indigo-400/30'
                      : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100">
                      {d.code}
                    </span>
                    {getDossierStatusBadge(d.status)}
                  </div>

                  <h3 className="font-bold text-slate-800 text-xs line-clamp-2">{d.title}</h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>{d.department || 'Cơ quan'}</span>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-600">
                      <span>📥 {inCount}</span>
                      <span>📤 {outCount}</span>
                      <span>⚡ {taskCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: 360-Degree Linked Dossier Hub */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          {activeDossier ? (
            <>
              {/* Dossier Header */}
              <div className="space-y-3 pb-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                      {activeDossier.code}
                    </span>
                    {getDossierStatusBadge(activeDossier.status)}
                  </div>

                  {/* Status Toggle */}
                  <select
                    value={activeDossier.status}
                    onChange={(e) => onUpdateDossierStatus(activeDossier.id, e.target.value as DossierStatus)}
                    className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 outline-none"
                  >
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="CLOSED">Đã đóng hồ sơ</option>
                    <option value="ARCHIVED">Lưu trữ</option>
                  </select>
                </div>

                <h2 className="text-base font-bold text-slate-800 leading-snug">{activeDossier.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {activeDossier.description || 'Hồ sơ lưu trữ các văn bản chỉ đạo và kế hoạch phối hợp.'}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Phòng phụ trách</span>
                    <span className="font-semibold text-slate-700">{activeDossier.department || 'Văn phòng'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Ngày khởi tạo</span>
                    <span className="font-semibold text-slate-700">{activeDossier.startDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Hạn hoàn tất</span>
                    <span className="font-semibold text-rose-600">{activeDossier.endDate || '---'}</span>
                  </div>
                </div>
              </div>

              {/* 360 Ecosystem Sections */}

              {/* 1. Linked Incoming Docs */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Inbox className="w-4 h-4 text-blue-600" />
                    <span>Văn bản đến liên kết ({linkedIncoming.length})</span>
                  </h3>
                </div>

                {linkedIncoming.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">Chưa có văn bản đến nào liên kết mã hồ sơ này.</p>
                ) : (
                  <div className="space-y-2">
                    {linkedIncoming.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => onSelectIncomingDoc(doc)}
                        className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 transition-colors cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700">{doc.documentNumber}</span>
                            <span className="text-[10px] text-slate-400">• {doc.issuingAuthority}</span>
                          </div>
                          <p className="text-slate-700 font-medium truncate mt-0.5">{doc.summary}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Linked Tasks */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Nhiệm vụ & Công việc phân công ({linkedTasks.length})</span>
                  </h3>
                </div>

                {linkedTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">Chưa có nhiệm vụ nào được giao theo mã hồ sơ này.</p>
                ) : (
                  <div className="space-y-2">
                    {linkedTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200/80 transition-colors cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700">{task.code}</span>
                            <span className="text-[10px] text-slate-500">Hạn: {task.dueDate}</span>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                              {task.progress}%
                            </span>
                          </div>
                          <p className="text-slate-800 font-semibold truncate mt-0.5">{task.title}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Linked Outgoing Docs */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-emerald-600" />
                    <span>Văn bản đi / Báo cáo ban hành ({linkedOutgoing.length})</span>
                  </h3>
                </div>

                {linkedOutgoing.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">Chưa có văn bản đi nào liên kết mã hồ sơ này.</p>
                ) : (
                  <div className="space-y-2">
                    {linkedOutgoing.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => onSelectOutgoingDoc(doc)}
                        className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200/80 transition-colors cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-700">{doc.documentNumber}</span>
                            <span className="text-[10px] text-slate-400">• Nơi nhận: {doc.recipient}</span>
                          </div>
                          <p className="text-slate-700 font-medium truncate mt-0.5">{doc.summary}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Vui lòng chọn một hồ sơ bên trái để xem chi tiết liên kết 360°.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
