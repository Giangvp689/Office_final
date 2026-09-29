import React, { useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  File,
  Maximize2,
} from 'lucide-react';
import { AttachmentFile } from '../types';

interface FilePreviewModalProps {
  file: AttachmentFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !file) return null;

  const fileType = (file.fileType || file.fileName?.split('.').pop() || '').toLowerCase();
  const isPdf = fileType === 'pdf' || file.fileUrl?.startsWith('data:application/pdf');
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(fileType) || file.fileUrl?.startsWith('data:image/');
  const isWord = ['doc', 'docx'].includes(fileType);
  const isExcel = ['xls', 'xlsx', 'csv'].includes(fileType);

  const handleDownload = () => {
    if (!file.fileUrl) return;
    const a = document.createElement('a');
    a.href = file.fileUrl;
    a.download = file.fileName || 'tai-lieu';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleOpenNewTab = () => {
    if (!file.fileUrl) return;
    try {
      const a = document.createElement('a');
      a.href = file.fileUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      handleDownload();
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    if (bytes < k * k) return (bytes / k).toFixed(1) + ' KB';
    return (bytes / (k * k)).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[9999] animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header Toolbar */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-slate-700 text-indigo-400">
              {isPdf && <FileText className="w-5 h-5 text-rose-400" />}
              {isImage && <ImageIcon className="w-5 h-5 text-purple-400" />}
              {isWord && <FileCode className="w-5 h-5 text-blue-400" />}
              {isExcel && <FileSpreadsheet className="w-5 h-5 text-emerald-400" />}
              {!isPdf && !isImage && !isWord && !isExcel && <File className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-100 truncate">{file.fileName}</h3>
              <p className="text-[11px] text-slate-400">
                {fileType.toUpperCase()} &bull; {formatFileSize(file.fileSize)}
                {file.uploadedByName && ` &bull; Tải lên bởi: ${file.uploadedByName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-700/80 rounded-xl p-1 border border-slate-600">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="p-1.5 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1.5 text-slate-300">{zoom}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(300, z + 25))}
                  className="p-1.5 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                  title="Xoay 90 độ"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleOpenNewTab}
              className="p-2 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Mở tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Tải về máy tính"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về máy</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer ml-1"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-950/60 overflow-auto flex items-center justify-center p-4 relative custom-scrollbar">
          {/* PDF Viewer */}
          {isPdf && file.fileUrl && (
            <div className="w-full h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-800">
              <iframe
                src={file.fileUrl}
                title={file.fileName}
                className="w-full h-full border-none"
              />
            </div>
          )}

          {/* Image / Scanned Document Viewer */}
          {isImage && file.fileUrl && (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={file.fileUrl}
                alt={file.fileName}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                }}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-700/50 bg-white/5"
              />
            </div>
          )}

          {/* Word / Office / Other Document Preview */}
          {!isPdf && !isImage && (
            <div className="text-center max-w-md p-8 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-xl space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                {isWord && <FileCode className="w-8 h-8 text-blue-400" />}
                {isExcel && <FileSpreadsheet className="w-8 h-8 text-emerald-400" />}
                {!isWord && !isExcel && <File className="w-8 h-8 text-slate-400" />}
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-base">{file.fileName}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Định dạng tệp: <strong className="text-indigo-300 font-mono">.{fileType.toUpperCase()}</strong> ({formatFileSize(file.fileSize)})
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Tệp văn phòng đã được lưu trữ an toàn trong cơ sở dữ liệu MySQL. Bạn có thể tải tệp về để mở bằng Microsoft Word / Excel.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleDownload}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải tệp về máy tính</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
