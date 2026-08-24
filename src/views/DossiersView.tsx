import React, { useState } from 'react';
import {
  Dossier,
  IncomingDocument,
  OutgoingDocument,
  Task,
  AttachmentFile,
  User,
  DossierStatus,
} from '../types';
import {
  FolderKanban,
  Search,
  Plus,
  FileText,
  Send,
  CheckSquare,
  Paperclip,
  Calendar,
  Lock,
  Edit,
  Trash2,
  X,
  UserCheck,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';

interface DossiersViewProps {
  dossiers: Dossier[];
  incomingDocs: IncomingDocument[];
  outgoingDocs: OutgoingDocument[];
  tasks: Task[];
  users: User[];
  onSaveDossier: (dossier: Dossier) => void;
  onDeleteDossier: (id: string) => void;
  currentUser: User;
  onOpenTaskDetail: (id: string) => void;
  onOpenIncomingDocDetail: (id: string) => void;
}

export const DossiersView: React.FC<DossiersViewProps> = ({
  dossiers,
  incomingDocs,
  outgoingDocs,
  tasks,
  users,
  onSaveDossier,
  onDeleteDossier,
  currentUser,
  onOpenTaskDetail,
  onOpenIncomingDocDetail,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDossier, setEditingDossier] = useState<Partial<Dossier> | null>(null);

  const getUser = (id?: string) => users.find((u) => u.id === id);

  const filteredDossiers = dossiers.filter((d) => {
    const matchSearch =
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.department.toLowerCase().includes(search.toLowerCase());

    const matchStatus = filterStatus === 'ALL' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleOpenAddModal = () => {
    setEditingDossier({
      id: 'hs-' + Date.now(),
      code: `HS-2025-${String(dossiers.length + 1).padStart(3, '0')}`,
      title: '',
      department: 'Phòng Hành chính - Tổng hợp',
      managerId: currentUser.id,
      startDate: new Date().toISOString().split('T')[0],
      status: 'OPEN',
      securityLevel: 'THUONG',
      description: '',
      createdById: currentUser.id,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (d: Dossier) => {
    setEditingDossier({ ...d });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDossier || !editingDossier.code || !editingDossier.title) return;

    onSaveDossier(editingDossier as Dossier);
    setIsModalOpen(false);
    setEditingDossier(null);
    if (selectedDossier && selectedDossier.id === editingDossier.id) {
      setSelectedDossier(editingDossier as Dossier);
    }
  };

  const getStatusBadge = (s: DossierStatus) => {
    switch (s) {
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">ĐÃ ĐÓNG</span>;
      case 'ARCHIVED':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">LƯU TRỮ VĨNH VIỄN</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">ĐANG XỬ LÝ</span>;
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quản Lý Hồ Sơ Vụ Việc (Dossiers)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mắt xích liên kết toàn bộ Văn bản đến + Văn bản đi + Công việc + Tài liệu theo từng Mã hồ sơ
          </p>
        </div>
        <button
          id="add-dossier-btn"
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Mở hồ sơ vụ việc mới</span>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã hồ sơ (HS-...), tên vụ việc, phòng ban..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Tất cả trạng thái hồ sơ</option>
          <option value="OPEN">Đang mở (Đang xử lý)</option>
          <option value="CLOSED">Đã đóng hồ sơ</option>
          <option value="ARCHIVED">Đã bàn giao lưu trữ</option>
        </select>
      </div>

      {/* Dossier Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDossiers.map((d) => {
          const linkedIn = incomingDocs.filter((doc) => doc.dossierId === d.id);
          const linkedOut = outgoingDocs.filter((doc) => doc.dossierId === d.id);
          const linkedTasks = tasks.filter((t) => t.dossierId === d.id);
          const manager = getUser(d.managerId);

          return (
            <div
              key={d.id}
              onClick={() => setSelectedDossier(d)}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {d.code}
                  </span>
                  {getStatusBadge(d.status)}
                </div>

                <h3 className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors mb-2 line-clamp-2 leading-snug">
                  {d.title}
                </h3>

                <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                  {d.description || 'Hồ sơ vụ việc hành chính'}
                </p>
              </div>

              <div>
                {/* Linked counters */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center mb-3">
                  <div>
                    <div className="font-bold text-blue-600 text-xs">{linkedIn.length}</div>
                    <div className="text-[10px] text-slate-400">VB Đến</div>
                  </div>
                  <div>
                    <div className="font-bold text-emerald-600 text-xs">{linkedOut.length}</div>
                    <div className="text-[10px] text-slate-400">VB Đi</div>
                  </div>
                  <div>
                    <div className="font-bold text-purple-600 text-xs">{linkedTasks.length}</div>
                    <div className="text-[10px] text-slate-400">Nhiệm vụ</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 truncate">
                    {manager && (
                      <img
                        src={manager.avatar}
                        alt="avatar"
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                    <span className="truncate">{manager?.fullName || d.department}</span>
                  </div>
                  <span className="font-medium text-slate-400 shrink-0">
                    {new Date(d.startDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dossier Detail Drawer */}
      {selectedDossier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-slate-800 text-base">
                  [{selectedDossier.code}] {selectedDossier.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedDossier(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="space-y-5 text-xs flex-1">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-indigo-700 text-sm">
                    {selectedDossier.code}
                  </span>
                  {getStatusBadge(selectedDossier.status)}
                </div>
                <span className="text-slate-500 font-medium">{selectedDossier.department}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Mô tả hồ sơ vụ việc
                </span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedDossier.description || 'Chưa có mô tả chi tiết'}
                </p>
              </div>

              {/* Linked Incoming Docs */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Văn bản đến liên kết (
                    {incomingDocs.filter((d) => d.dossierId === selectedDossier.id).length})
                  </span>
                </div>

                <div className="space-y-2">
                  {incomingDocs
                    .filter((d) => d.dossierId === selectedDossier.id)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDossier(null);
                          onOpenIncomingDocDetail(doc.id);
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-blue-50/40 rounded-lg border border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 font-mono block">
                            {doc.documentNumber}
                          </span>
                          <span className="text-slate-600 truncate block text-[11px]">
                            {doc.summary}
                          </span>
                        </div>
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded shrink-0">
                          {doc.urgency}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Linked Tasks */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    Công việc thuộc hồ sơ ({tasks.filter((t) => t.dossierId === selectedDossier.id).length})
                  </span>
                </div>

                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.dossierId === selectedDossier.id)
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedDossier(null);
                          onOpenTaskDetail(t.id);
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-indigo-50/40 rounded-lg border border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 font-mono block">
                            #{t.code} - {t.title}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            Hạn: {new Date(t.dueDate).toLocaleDateString('vi-VN')} | Tiến độ: {t.progress}%
                          </span>
                        </div>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded shrink-0">
                          {t.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Linked Outgoing Docs */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-emerald-600" />
                    Văn bản đi phát hành ({outgoingDocs.filter((d) => d.dossierId === selectedDossier.id).length})
                  </span>
                </div>

                <div className="space-y-2">
                  {outgoingDocs
                    .filter((d) => d.dossierId === selectedDossier.id)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 font-mono block">
                            {doc.documentNumber} ({doc.docType})
                          </span>
                          <span className="text-slate-600 truncate block text-[11px]">
                            Gửi: {doc.recipient} - {doc.summary}
                          </span>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded shrink-0">
                          {doc.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  const d = selectedDossier;
                  setSelectedDossier(null);
                  handleOpenEditModal(d);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Chỉnh sửa thông tin hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Dossier Modal */}
      {isModalOpen && editingDossier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <FolderKanban className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {editingDossier.id?.startsWith('hs-') && !dossiers.some((d) => d.id === editingDossier.id)
                    ? 'Mở Hồ Sơ Vụ Việc Mới'
                    : `Cập Nhật Hồ Sơ: ${editingDossier.code}`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mã hồ sơ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDossier.code || ''}
                    onChange={(e) => setEditingDossier({ ...editingDossier, code: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phòng ban quản lý</label>
                  <input
                    type="text"
                    value={editingDossier.department || ''}
                    onChange={(e) => setEditingDossier({ ...editingDossier, department: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tiêu đề hồ sơ vụ việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingDossier.title || ''}
                  onChange={(e) => setEditingDossier({ ...editingDossier, title: e.target.value })}
                  placeholder="VD: Hồ sơ Dự án nâng cấp hạ tầng số 2025"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả mục đích & phạm vi vụ việc</label>
                <textarea
                  rows={3}
                  value={editingDossier.description || ''}
                  onChange={(e) => setEditingDossier({ ...editingDossier, description: e.target.value })}
                  placeholder="Nhập ghi chú hoặc căn cứ hình thành hồ sơ..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cán bộ phụ trách</label>
                  <select
                    value={editingDossier.managerId || ''}
                    onChange={(e) => setEditingDossier({ ...editingDossier, managerId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày lập hồ sơ</label>
                  <input
                    type="date"
                    value={editingDossier.startDate || ''}
                    onChange={(e) => setEditingDossier({ ...editingDossier, startDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái hồ sơ</label>
                  <select
                    value={editingDossier.status || 'OPEN'}
                    onChange={(e) => setEditingDossier({ ...editingDossier, status: e.target.value as DossierStatus })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="OPEN">Đang mở (Đang xử lý)</option>
                    <option value="CLOSED">Đã đóng hồ sơ</option>
                    <option value="ARCHIVED">Lưu trữ vĩnh viễn</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  Lưu hồ sơ vụ việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
