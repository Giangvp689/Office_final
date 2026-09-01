import React, { useState, useRef } from 'react';
import { AttachmentFile, Dossier, User, IncomingDocument, OutgoingDocument, Task } from '../types';
import {
  FolderOpen,
  Search,
  Plus,
  Paperclip,
  Download,
  Eye,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  X,
  Upload,
  Image as ImageIcon,
  FolderKanban,
} from 'lucide-react';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { canAccessAttachment, isLeaderOrAdmin } from '../utils/permission';

interface DocumentsVaultViewProps {
  attachments: AttachmentFile[];
  dossiers: Dossier[];
  users: User[];
  onUploadFile: (file: AttachmentFile) => void;
  onDeleteFile: (id: string) => void;
  currentUser: User;
  incomingDocs?: IncomingDocument[];
  outgoingDocs?: OutgoingDocument[];
  tasks?: Task[];
}

export const DocumentsVaultView: React.FC<DocumentsVaultViewProps> = ({
  attachments,
  dossiers,
  users,
  onUploadFile,
  onDeleteFile,
  currentUser,
  incomingDocs = [],
  outgoingDocs = [],
  tasks = [],
}) => {
  const [search, setSearch] = useState('');
  const [filterDossier, setFilterDossier] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newDossierId, setNewDossierId] = useState(dossiers[0]?.id || '');
  const [selectedFileObj, setSelectedFileObj] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Preview Modal
  const [previewFile, setPreviewFile] = useState<AttachmentFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id);

  const isSuperUser = isLeaderOrAdmin(currentUser);
  const [vaultScope, setVaultScope] = useState<'MY' | 'ALL'>(isSuperUser ? 'ALL' : 'MY');

  // Base list of files accessible to current user
  const accessibleFiles = React.useMemo(() => {
    if (isSuperUser && vaultScope === 'ALL') {
      return attachments;
    }
    return attachments.filter((file) =>
      canAccessAttachment(file, currentUser, dossiers, incomingDocs, outgoingDocs, tasks)
    );
  }, [attachments, isSuperUser, vaultScope, currentUser, dossiers, tasks, incomingDocs, outgoingDocs]);

  const filteredFiles = accessibleFiles.filter((f) => {
    const matchSearch =
      f.fileName.toLowerCase().includes(search.toLowerCase()) ||
      (f.category && f.category.toLowerCase().includes(search.toLowerCase()));

    const matchDossier = filterDossier === 'ALL' || f.dossierId === filterDossier;
    const matchType =
      filterType === 'ALL' ||
      (filterType === 'PDF' && f.fileType?.toLowerCase() === 'pdf') ||
      (filterType === 'IMG' && ['png', 'jpg', 'jpeg', 'webp'].includes(f.fileType?.toLowerCase() || '')) ||
      (filterType === 'DOC' && ['doc', 'docx'].includes(f.fileType?.toLowerCase() || '')) ||
      (filterType === 'XLS' && ['xls', 'xlsx', 'csv'].includes(f.fileType?.toLowerCase() || ''));

    return matchSearch && matchDossier && matchType;
  });

  const handleProcessFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase() || 'file';
    const reader = new FileReader();

    reader.onload = (e) => {
      setSelectedFileObj({
        name: file.name,
        size: file.size,
        type: ext,
        dataUrl: (e.target?.result as string) || '',
      });
      if (!newFileName) {
        setNewFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileObj && !newFileName) return;

    const fileName = selectedFileObj?.name || newFileName;
    const fileType = selectedFileObj?.type || fileName.split('.').pop()?.toLowerCase() || 'pdf';
    const fileSize = selectedFileObj?.size || 250000;
    const fileUrl = selectedFileObj?.dataUrl || '#';

    const newFile: AttachmentFile = {
      id: 'att-' + Date.now(),
      fileName,
      fileType,
      fileSize,
      fileUrl,
      category: 'KHAC',
      uploadedAt: new Date().toISOString(),
      uploadedById: currentUser?.id || '',
      uploadedByName: currentUser?.fullName || 'Người dùng',
      dossierId: newDossierId || undefined,
      tags: ['Kho tài liệu', fileType.toUpperCase()],
    };

    onUploadFile(newFile);
    setIsModalOpen(false);
    setNewFileName('');
    setSelectedFileObj(null);
  };

  const handleDownloadFile = (file: AttachmentFile) => {
    if (!file.fileUrl) return;
    const a = document.createElement('a');
    a.href = file.fileUrl;
    a.download = file.fileName || 'tai-lieu';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getFileIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-rose-500" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
      case 'docx':
      case 'doc':
        return <FileCode className="w-8 h-8 text-blue-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return <ImageIcon className="w-8 h-8 text-purple-500" />;
      default:
        return <File className="w-8 h-8 text-slate-400" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    if (bytes < k * k) return (bytes / k).toFixed(1) + ' KB';
    return (bytes / (k * k)).toFixed(2) + ' MB';
  };

  return (
    <div className="w-full p-6 md:p-8 flex flex-col gap-6 flex-1">
      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Kho Tài Liệu & Bản Quét (Scan)</h1>
            <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-indigo-200">
              {accessibleFiles.length} tệp tin
            </span>
            {!isLeaderOrAdmin && (
              <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                🔒 Tài liệu liên quan
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tập trung toàn bộ tệp scan PDF, hình ảnh, văn bản đính kèm lưu trữ trong cơ sở dữ liệu MySQL
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isLeaderOrAdmin && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs text-xs font-semibold">
              <button
                onClick={() => setVaultScope('MY')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  vaultScope === 'MY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tài liệu của tôi
              </button>
              <button
                onClick={() => setVaultScope('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  vaultScope === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toàn cơ quan ({attachments.length})
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setSelectedFileObj(null);
              setNewFileName('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Tải Lên Tệp Scan / Tài Liệu Mới</span>
          </button>
        </div>
      </div>

      {/* Security Info Banner for Staff */}
      {!isLeaderOrAdmin && (
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 text-xs text-indigo-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <span>
              <strong>Bảo mật tài liệu:</strong> Bạn chỉ có quyền xem, tải về các tệp đính kèm do bạn tải lên hoặc nằm trong các hồ sơ vụ việc / nhiệm vụ mà bạn có tham gia ({accessibleFiles.length} tệp).
            </span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên tệp, loại tài liệu..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 outline-none cursor-pointer"
        >
          <option value="ALL">Tất cả định dạng</option>
          <option value="PDF">Bản scan PDF (.pdf)</option>
          <option value="IMG">Hình ảnh scan (.png, .jpg)</option>
          <option value="DOC">Văn bản Word (.docx)</option>
          <option value="XLS">Bảng tính Excel (.xlsx)</option>
        </select>

        <select
          value={filterDossier}
          onChange={(e) => setFilterDossier(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 outline-none cursor-pointer"
        >
          <option value="ALL">Tất cả hồ sơ vụ việc</option>
          {dossiers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} - {d.title.slice(0, 25)}...
            </option>
          ))}
        </select>
      </div>

      {/* File Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredFiles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-medium">Chưa có tệp tài liệu nào trong kho</p>
          </div>
        ) : (
          filteredFiles.map((file) => {
            const uploader = getUser(file.uploadedById);
            const dossier = getDossier(file.dossierId);

            return (
              <div
                key={file.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-md transition-all p-4 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    {getFileIcon(file.fileType)}
                    <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                      {file.fileType || 'FILE'}
                    </span>
                  </div>

                  <h4
                    onClick={() => {
                      setPreviewFile(file);
                      setIsPreviewOpen(true);
                    }}
                    className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug mb-1 group-hover:text-indigo-600 cursor-pointer"
                  >
                    {file.fileName}
                  </h4>

                  {dossier && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold block w-fit mb-2">
                      {dossier.code}
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 mt-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                    <span className="font-mono">{formatFileSize(file.fileSize)}</span>
                    <span>{new Date(file.uploadedAt).toLocaleDateString('vi-VN')}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 truncate max-w-[110px]">
                      {file.uploadedByName || uploader?.fullName || 'Cán bộ'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setPreviewFile(file);
                          setIsPreviewOpen(true);
                        }}
                        title="Xem tài liệu / scan"
                        className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDownloadFile(file)}
                        title="Tải về máy tính"
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa tệp tài liệu "${file.fileName}"?`)) {
                            onDeleteFile(file.id);
                          }
                        }}
                        title="Xóa tệp"
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Real File Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Tải Lên Tệp Scan / Tài Liệu Từ Máy Tính</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-4 text-xs">
              {/* File Selector Drag & Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleProcessFile(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50'
                    : selectedFileObj
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-300 bg-slate-50 hover:border-indigo-400'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleProcessFile(e.target.files)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                />

                {selectedFileObj ? (
                  <div className="space-y-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center font-bold">
                      ✓
                    </div>
                    <p className="font-bold text-slate-800 text-xs truncate max-w-xs mx-auto">
                      {selectedFileObj.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {formatFileSize(selectedFileObj.size)} &bull; .{selectedFileObj.type.toUpperCase()}
                    </p>
                    <span className="text-[10px] text-indigo-600 font-bold underline block mt-1">
                      Nhấn để đổi tệp khác
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-700 text-xs">
                      Nhấn vào đây để chọn tệp từ máy tính
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Hỗ trợ tệp PDF, scan ảnh JPG/PNG, tài liệu Word/Excel
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên hiển thị tài liệu
                </label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="VD: Bản scan Đơn đề nghị cấp phép..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gắn vào Hồ Sơ vụ việc</label>
                <select
                  value={newDossierId}
                  onChange={(e) => setNewDossierId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="">-- Không gắn vào hồ sơ --</option>
                  {dossiers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.title.slice(0, 30)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải lên & Lưu MySQL</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
