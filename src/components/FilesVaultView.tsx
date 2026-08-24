import React, { useState } from 'react';
import {
  Files,
  Upload,
  Search,
  FileText,
  Download,
  FolderArchive,
  Trash2,
  Paperclip,
  CheckCircle,
} from 'lucide-react';
import { Dossier, IncomingDocument, OutgoingDocument, Task, User } from '../types';

interface FilesVaultViewProps {
  dossiers: Dossier[];
  incomingDocs: IncomingDocument[];
  outgoingDocs: OutgoingDocument[];
  tasks: Task[];
  users: User[];
  onUploadCustomFile: (file: { name: string; size: string; dossierCode: string }) => void;
}

export const FilesVaultView: React.FC<FilesVaultViewProps> = ({
  dossiers,
  incomingDocs,
  outgoingDocs,
  tasks,
  users,
  onUploadCustomFile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDossierFilter, setSelectedDossierFilter] = useState('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileDossier, setNewFileDossier] = useState(dossiers[0]?.code || 'HS-2025-CDS-01');

  // Collect all files across the whole system
  const allVaultFiles: Array<{
    id: string;
    name: string;
    size: string;
    url: string;
    sourceType: string;
    sourceCode: string;
    dossierCode?: string;
  }> = [];

  incomingDocs.forEach((d) => {
    d.attachments?.forEach((f, idx) => {
      allVaultFiles.push({
        id: `inc_${d.id}_${idx}`,
        name: f.name,
        size: f.size,
        url: f.url,
        sourceType: 'Văn bản đến',
        sourceCode: d.documentNumber,
        dossierCode: d.dossierId,
      });
    });
  });

  outgoingDocs.forEach((d) => {
    d.attachments?.forEach((f, idx) => {
      allVaultFiles.push({
        id: `out_${d.id}_${idx}`,
        name: f.name,
        size: f.size,
        url: f.url,
        sourceType: 'Văn bản đi',
        sourceCode: d.documentNumber,
        dossierCode: d.dossierId,
      });
    });
  });

  tasks.forEach((t) => {
    t.attachments?.forEach((f, idx) => {
      allVaultFiles.push({
        id: `task_${t.id}_${idx}`,
        name: f.name,
        size: f.size,
        url: f.url,
        sourceType: 'Công việc',
        sourceCode: t.code,
        dossierCode: t.dossierId,
      });
    });
  });

  const filteredFiles = allVaultFiles.filter((f) => {
    const matchSearch = !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.sourceCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDossier = selectedDossierFilter === 'ALL' || f.dossierCode === selectedDossierFilter;
    return matchSearch && matchDossier;
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    onUploadCustomFile({
      name: newFileName.endsWith('.pdf') || newFileName.endsWith('.docx') ? newFileName : `${newFileName}.pdf`,
      size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
      dossierCode: newFileDossier,
    });
    setNewFileName('');
    setShowUploadModal(false);
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Files className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Kho Lưu Trữ Tài Liệu Số ({allVaultFiles.length})
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý tập trung toàn bộ file đính kèm (PDF, DOCX, XLSX) liên kết theo từng mã hồ sơ vụ việc.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          <span>Tải Lên Tài Liệu Mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên file, số văn bản, mã việc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-slate-700 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedDossierFilter}
            onChange={(e) => setSelectedDossierFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả mã hồ sơ</option>
            {dossiers.map((d) => (
              <option key={d.id} value={d.code}>
                {d.code} - {d.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map((file) => (
          <div
            key={file.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 block">{file.size}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 space-y-1">
                <div>Nguồn: <b>{file.sourceType}</b> ({file.sourceCode})</div>
                {file.dossierCode && (
                  <div>Hồ sơ: <span className="font-bold text-indigo-700">{file.dossierCode}</span></div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Đã kiểm tra virus</span>
              <a
                href={file.url}
                download={file.name}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">Tải Lên Tài Liệu & Gán Mã Hồ Sơ</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên tài liệu / Văn bản *</label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Ví dụ: Phu_luc_01_Du_toan_chi_tiet.pdf"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mã hồ sơ liên kết *</label>
                <select
                  value={newFileDossier}
                  onChange={(e) => setNewFileDossier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                >
                  {dossiers.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} - {d.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drag and Drop Zone simulation */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Kéo thả tệp hoặc bấm để chọn tệp</p>
                <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ PDF, DOCX, XLSX, PNG (tối đa 25MB)</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Lưu Vào Kho Hồ Sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
