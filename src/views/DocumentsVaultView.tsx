import React, { useState } from 'react';
import { AttachmentFile, Dossier, User } from '../types';
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
} from 'lucide-react';

interface DocumentsVaultViewProps {
  attachments: AttachmentFile[];
  dossiers: Dossier[];
  users: User[];
  onUploadFile: (file: AttachmentFile) => void;
  onDeleteFile: (id: string) => void;
  currentUser: User;
}

export const DocumentsVaultView: React.FC<DocumentsVaultViewProps> = ({
  attachments,
  dossiers,
  users,
  onUploadFile,
  onDeleteFile,
  currentUser,
}) => {
  const [search, setSearch] = useState('');
  const [filterDossier, setFilterDossier] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newDossierId, setNewDossierId] = useState(dossiers[0]?.id || '');
  const [newFileType, setNewFileType] = useState('pdf');

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id);

  const filteredFiles = attachments.filter((f) => {
    const matchSearch = f.fileName.toLowerCase().includes(search.toLowerCase());
    const matchDossier = filterDossier === 'ALL' || f.dossierId === filterDossier;
    return matchSearch && matchDossier;
  });

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName) return;

    const newFile: AttachmentFile = {
      id: 'att-' + Date.now(),
      fileName: newFileName.endsWith(`.${newFileType}`) ? newFileName : `${newFileName}.${newFileType}`,
      fileType: newFileType,
      fileSize: Math.floor(Math.random() * 3500000) + 150000,
      fileUrl: '#',
      uploadedAt: new Date().toISOString(),
      uploadedById: currentUser.id,
      dossierId: newDossierId || undefined,
    };

    onUploadFile(newFile);
    setIsModalOpen(false);
    setNewFileName('');
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-rose-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
      case 'docx':
      case 'doc':
        return <FileCode className="w-8 h-8 text-blue-500" />;
      default:
        return <File className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kho Tài Liệu & Đính Kèm</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý và tra cứu tập trung toàn bộ tệp đính kèm văn bản, hồ sơ vụ việc
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>Tải lên tài liệu mới</span>
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
            placeholder="Tìm tên tệp tài liệu, đuôi mở rộng..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <select
          value={filterDossier}
          onChange={(e) => setFilterDossier(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Tất cả mã hồ sơ</option>
          {dossiers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} - {d.title.slice(0, 30)}...
            </option>
          ))}
        </select>
      </div>

      {/* File Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredFiles.map((file) => {
          const uploader = getUser(file.uploadedById);
          const dossier = getDossier(file.dossierId);

          return (
            <div
              key={file.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  {getFileIcon(file.fileType)}
                  <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {file.fileType}
                  </span>
                </div>

                <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug mb-1 group-hover:text-indigo-600">
                  {file.fileName}
                </h4>

                {dossier && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-semibold block w-fit mb-2">
                    {dossier.code}
                  </span>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                  <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                  <span>{new Date(file.uploadedAt).toLocaleDateString('vi-VN')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                    Bởi: {uploader?.fullName || 'Hệ thống'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => alert(`Xem trước tệp: ${file.fileName}`)}
                      title="Xem trước"
                      className="p-1 hover:bg-indigo-50 text-indigo-600 rounded"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Xóa tài liệu ${file.fileName}?`)) {
                          onDeleteFile(file.id);
                        }
                      }}
                      title="Xóa tệp"
                      className="p-1 hover:bg-rose-50 text-rose-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Tải Lên Tài Liệu Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên tài liệu / tệp tin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="VD: Bao_cao_danh_gia_tien_do_quy1"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Định dạng tệp</label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="docx">Word Document (.docx)</option>
                    <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                    <option value="zip">Archive (.zip)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gắn vào hồ sơ</label>
                  <select
                    value={newDossierId}
                    onChange={(e) => setNewDossierId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- Không gắn --</option>
                    {dossiers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-xs"
                >
                  Tải lên ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
