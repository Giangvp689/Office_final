import React, { useState, useMemo, useRef } from 'react';
import {
  Dossier,
  IncomingDocument,
  OutgoingDocument,
  Task,
  AttachmentFile,
  User,
  DossierStatus,
  MasterData,
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
  Upload,
  Download,
  Eye,
  FileSpreadsheet,
  FileCode,
  File,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { canAccessDossier, isLeaderOrAdmin, canDeleteDossierRecord, canDeleteAttachmentRecord } from '../utils/permission';

interface DossiersViewProps {
  dossiers: Dossier[];
  incomingDocs: IncomingDocument[];
  outgoingDocs: OutgoingDocument[];
  tasks: Task[];
  attachments?: AttachmentFile[];
  users: User[];
  onSaveDossier: (dossier: Dossier) => void;
  onDeleteDossier: (id: string) => void;
  onUploadAttachment?: (file: AttachmentFile) => void;
  onDeleteAttachment?: (id: string) => void;
  currentUser: User;
  onOpenTaskDetail: (id: string) => void;
  onOpenIncomingDocDetail: (id: string) => void;
  onOpenOutgoingDocDetail?: (id: string) => void;
  initialDossierId?: string;
  targetTimestamp?: number;
  masterData?: MasterData;
}

export const DossiersView: React.FC<DossiersViewProps> = ({
  dossiers,
  incomingDocs,
  outgoingDocs,
  tasks,
  attachments = [],
  users,
  onSaveDossier,
  onDeleteDossier,
  onUploadAttachment,
  onDeleteAttachment,
  currentUser,
  onOpenTaskDetail,
  onOpenIncomingDocDetail,
  onOpenOutgoingDocDetail,
  initialDossierId,
  targetTimestamp,
  masterData,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [previewFile, setPreviewFile] = useState<AttachmentFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [deleteTargetDossier, setDeleteTargetDossier] = useState<Dossier | null>(null);
  const [deleteToastMessage, setDeleteToastMessage] = useState<string | null>(null);

  // Departments from masterData + existing users & dossiers
  const departmentList = useMemo(() => {
    const fromMaster = (masterData?.departments || [])
      .map((d: any) => (typeof d === 'string' ? d : d.name))
      .filter(Boolean);
    const fromUsers = users
      .map((u) => (typeof u.department === 'string' ? u.department : (u.department as any)?.name || ''))
      .filter(Boolean);
    const fromDossiers = dossiers
      .map((d) => (typeof d.department === 'string' ? d.department : (d.department as any)?.name || ''))
      .filter(Boolean);
    const combined = Array.from(new Set([...fromMaster, ...fromUsers, ...fromDossiers]));
    return combined.length > 0
      ? combined
      : ['Phòng Hành chính - Tổng hợp', 'Phòng Kế hoạch - Tài chính', 'Phòng Quản lý đô thị'];
  }, [masterData, users, dossiers]);

  const isSuperUser = isLeaderOrAdmin(currentUser);
  const [dossierScope, setDossierScope] = useState<'MY' | 'ALL'>(isSuperUser ? 'ALL' : 'MY');

  // Base list of dossiers this user is authorized to see
  const accessibleDossiers = useMemo(() => {
    if (isSuperUser && dossierScope === 'ALL') {
      return dossiers;
    }
    return dossiers.filter((d) => canAccessDossier(d, currentUser, tasks, incomingDocs, outgoingDocs));
  }, [dossiers, isSuperUser, dossierScope, tasks, incomingDocs, outgoingDocs, currentUser]);

  // Auto open dossier if navigated from notification or linked item
  React.useEffect(() => {
    if (initialDossierId) {
      const target = dossiers.find(
        (d) => d.id === initialDossierId || d.code === initialDossierId
      ) || accessibleDossiers.find(
        (d) => d.id === initialDossierId || d.code === initialDossierId
      );
      if (target) {
        setSelectedDossier(target);
        setSearch('');
        setFilterStatus('ALL');
      }
    }
  }, [initialDossierId, targetTimestamp, dossiers, accessibleDossiers]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDossier, setEditingDossier] = useState<Partial<Dossier> | null>(null);

  const getUser = (id?: string) => users.find((u) => u.id === id);

  const filteredDossiers = accessibleDossiers.filter((d) => {
    const matchSearch =
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (typeof d.department === 'string' && d.department.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = filterStatus === 'ALL' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    if (bytes < k * k) return (bytes / k).toFixed(1) + ' KB';
    return (bytes / (k * k)).toFixed(2) + ' MB';
  };

  const getFileIcon = (fileName?: string, fileType?: string) => {
    const ext = (fileType || fileName?.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileCode className="w-4 h-4 text-blue-500" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return <ImageIcon className="w-4 h-4 text-purple-500" />;
    return <File className="w-4 h-4 text-slate-500" />;
  };

  const handleDownloadAttachment = (file: AttachmentFile) => {
    if (!file.fileUrl || file.fileUrl === '#') return;
    const a = document.createElement('a');
    a.href = file.fileUrl;
    a.download = file.fileName || 'tai-lieu';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedDossier) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const ext = f.name.includes('.') ? f.name.split('.').pop()?.toLowerCase() || '' : '';
        const newAttachment: AttachmentFile = {
          id: 'att-' + Date.now() + '-' + i,
          fileName: f.name,
          fileSize: f.size,
          fileType: ext || 'file',
          fileUrl: dataUrl,
          category: 'HO_SO',
          relatedId: selectedDossier.id,
          dossierId: selectedDossier.id,
          dossierCode: selectedDossier.code,
          uploadedById: currentUser?.id || 'usr-01',
          uploadedByName: currentUser?.fullName || 'Cán bộ thụ lý',
          uploadedAt: new Date().toISOString(),
          tags: [selectedDossier.code, 'Tài liệu hồ sơ'],
        };
        onUploadAttachment?.(newAttachment);
      };
      reader.readAsDataURL(f);
    }
    e.target.value = '';
  };

  const handleOpenAddModal = () => {
    setEditingDossier({
      id: 'hs-' + Date.now(),
      code: `HS-2025-${String(dossiers.length + 1).padStart(3, '0')}`,
      title: '',
      department: 'Phòng Hành chính - Tổng hợp',
      managerId: currentUser?.id || '',
      startDate: new Date().toISOString().split('T')[0],
      status: 'OPEN',
      securityLevel: 'THUONG',
      description: '',
      createdById: currentUser?.id || '',
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
    <div className="w-full p-6 md:p-8 flex flex-col gap-6 flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Quản Lý Hồ Sơ Vụ Việc (Dossiers)</h1>
            {!isLeaderOrAdmin && (
              <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                🔒 Hồ sơ tham gia
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Mắt xích liên kết toàn bộ Văn bản đến + Văn bản đi + Công việc + Tài liệu theo từng Mã hồ sơ
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isLeaderOrAdmin && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs text-xs font-semibold">
              <button
                onClick={() => setDossierScope('MY')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dossierScope === 'MY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hồ sơ tôi tham gia
              </button>
              <button
                onClick={() => setDossierScope('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dossierScope === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toàn cơ quan ({dossiers.length})
              </button>
            </div>
          )}

          <button
            id="add-dossier-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Mở hồ sơ vụ việc mới</span>
          </button>
        </div>
      </div>

      {/* Security Info Banner for Staff */}
      {!isLeaderOrAdmin && (
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 text-xs text-indigo-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <span>
              <strong>Bảo mật thông tin:</strong> Bạn chỉ có quyền xem và truy cập các hồ sơ vụ việc mà bạn là người lập, người chủ trì hoặc được phân công nhiệm vụ/văn bản liên quan ({filteredDossiers.length} hồ sơ).
            </span>
          </div>
        </div>
      )}

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
          const linkedIn = incomingDocs.filter((doc) => doc.dossierId === d.id || doc.dossierId === d.code);
          const linkedOut = outgoingDocs.filter((doc) => doc.dossierId === d.id || doc.dossierId === d.code);
          const linkedTasks = tasks.filter((t) => t.dossierId === d.id || t.dossierId === d.code);
          const linkedAttachments = attachments.filter(
            (a) => a.dossierId === d.id || a.dossierCode === d.code || a.relatedId === d.id
          );
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
                <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center mb-3">
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
                  <div>
                    <div className="font-bold text-amber-600 text-xs">{linkedAttachments.length}</div>
                    <div className="text-[10px] text-slate-400">Tài liệu</div>
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
                    <span className="truncate">
                      {manager?.fullName || (typeof d.department === 'string' ? d.department : (d.department as any)?.name || '')}
                    </span>
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
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
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
                <span className="text-slate-500 font-medium">
                  {typeof selectedDossier.department === 'string'
                    ? selectedDossier.department
                    : (selectedDossier.department as any)?.name || ''}
                </span>
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
                    {incomingDocs.filter((d) => d.dossierId === selectedDossier.id || d.dossierId === selectedDossier.code).length})
                  </span>
                </div>

                <div className="space-y-2">
                  {incomingDocs
                    .filter((d) => d.dossierId === selectedDossier.id || d.dossierId === selectedDossier.code)
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
                    Công việc thuộc hồ sơ ({tasks.filter((t) => t.dossierId === selectedDossier.id || t.dossierId === selectedDossier.code).length})
                  </span>
                </div>

                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.dossierId === selectedDossier.id || t.dossierId === selectedDossier.code)
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
                    Văn bản đi phát hành ({outgoingDocs.filter((d) => d.dossierId === selectedDossier.id || d.dossierId === selectedDossier.code).length})
                  </span>
                </div>

                <div className="space-y-2">
                  {outgoingDocs
                    .filter((d) => d.dossierId === selectedDossier.id || d.dossierId === selectedDossier.code)
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

              {/* Linked Dossier Attachments & Direct Upload */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-amber-600" />
                    Tài liệu & Tệp đính kèm hồ sơ ({
                      attachments.filter(
                        (a) => a.dossierId === selectedDossier.id || a.dossierCode === selectedDossier.code || a.relatedId === selectedDossier.id
                      ).length
                    })
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>+ Tải tệp vào hồ sơ</span>
                  </button>
                </div>

                {(() => {
                  const dossierFiles = attachments.filter(
                    (a) => a.dossierId === selectedDossier.id || a.dossierCode === selectedDossier.code || a.relatedId === selectedDossier.id
                  );

                  if (dossierFiles.length === 0) {
                    return (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                        <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-1.5 opacity-60" />
                        <p className="text-slate-600 font-medium text-xs">Chưa có tệp tài liệu nào gắn với hồ sơ này</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Bấm nút &quot;+ Tải tệp vào hồ sơ&quot; ở trên để tải trực tiếp văn bản scan, PDF, Word hoặc hình ảnh.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {dossierFiles.map((att) => (
                        <div
                          key={att.id}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="p-1.5 bg-white rounded-md border border-slate-200 shrink-0">
                              {getFileIcon(att.fileName, att.fileType)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 text-xs block truncate" title={att.fileName}>
                                {att.fileName}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {formatFileSize(att.fileSize)} • Người tải: {att.uploadedByName || 'Cán bộ'} • {att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString('vi-VN') : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewFile(att);
                                setIsPreviewOpen(true);
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                              title="Xem trước tài liệu"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(att)}
                              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                              title="Tải về máy"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteAttachment && (
                              <button
                                type="button"
                                onClick={() => {
                                  const val = canDeleteAttachmentRecord(att, currentUser, dossiers);
                                  if (!val.allowed) {
                                    alert(val.reason);
                                    return;
                                  }
                                  if (confirm(`Bạn có chắc chắn muốn xóa tệp "${att.fileName}" khỏi hồ sơ này?`)) {
                                    onDeleteAttachment(att.id);
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Xóa tài liệu (Hình 3.34)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetDossier(selectedDossier);
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-rose-200"
                title="Xóa hồ sơ vụ việc (Văn thư/Lãnh đạo - Hình 3.34 & Bảng 3.9)"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa hồ sơ</span>
              </button>

              <button
                onClick={() => {
                  const d = selectedDossier;
                  setSelectedDossier(null);
                  handleOpenEditModal(d);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
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
                  <select
                    value={editingDossier.department || departmentList[0] || ''}
                    onChange={(e) => setEditingDossier({ ...editingDossier, department: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    {editingDossier.department && !departmentList.includes(editingDossier.department) && (
                      <option value={editingDossier.department}>{editingDossier.department}</option>
                    )}
                    {departmentList.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
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

      {/* Hidden file input for direct dossier attachment upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileSelected}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFile(null);
        }}
      />

      {/* Delete Dossier Modal (Hình 3.34 & Bảng 3.9 & Hình 3.69) */}
      {deleteTargetDossier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa hồ sơ công việc</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hình 3.34 & Bảng 3.9: Văn thư hoặc Lãnh đạo xóa hồ sơ tạo sai / rỗng.
                </p>
              </div>
            </div>

            {(() => {
              const deleteValidation = canDeleteDossierRecord(
                deleteTargetDossier,
                currentUser,
                attachments,
                incomingDocs,
                outgoingDocs,
                tasks
              );
              return (
                <>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mã hồ sơ:</span>
                      <span className="font-bold text-indigo-700 font-mono">{deleteTargetDossier.code}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Trạng thái:</span>
                      <span className="font-bold text-slate-800">
                        {deleteTargetDossier.status === 'CLOSED'
                          ? 'Đã đóng'
                          : deleteTargetDossier.status === 'ARCHIVED'
                          ? 'Lưu trữ vĩnh viễn'
                          : 'Đang mở/xử lý'}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-slate-200/80">
                      <span className="text-slate-400 block text-[11px] mb-0.5">Tiêu đề hồ sơ:</span>
                      <p className="text-slate-800 line-clamp-2 text-[11px]">{deleteTargetDossier.title}</p>
                    </div>
                  </div>

                  {!deleteValidation.allowed && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">Quy tắc nghiệp vụ từ chối xóa (Hình 3.34 & Bảng 3.9):</span>
                        <p className="text-[11px] leading-relaxed text-amber-800">{deleteValidation.reason}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTargetDossier(null)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {deleteValidation.allowed ? 'Hủy bỏ' : 'Đã hiểu & Đóng'}
                    </button>
                    {deleteValidation.allowed && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = deleteTargetDossier.id;
                          const targetCode = deleteTargetDossier.code;
                          onDeleteDossier(targetId);
                          if (selectedDossier?.id === targetId) {
                            setSelectedDossier(null);
                          }
                          setDeleteTargetDossier(null);
                          setDeleteToastMessage(`Đã xóa thành công hồ sơ vụ việc [${targetCode}].`);
                          setTimeout(() => setDeleteToastMessage(null), 3500);
                        }}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xác nhận xóa</span>
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {deleteToastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span>{deleteToastMessage}</span>
        </div>
      )}
    </div>
  );
};
