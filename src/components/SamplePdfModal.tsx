import React, { useState } from 'react';
import { FileText, Download, Play, CheckCircle2, AlertCircle, X, Sparkles, Eye } from 'lucide-react';
import { SAMPLE_DOCUMENTS, SampleDocPreset, generateSamplePdf, downloadSamplePdfFile } from '../utils/samplePdfGenerator';

interface SamplePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSampleFile?: (file: File) => void;
}

export const SamplePdfModal: React.FC<SamplePdfModalProps> = ({
  isOpen,
  onClose,
  onSelectSampleFile,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<SampleDocPreset>(SAMPLE_DOCUMENTS[0]);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = (preset: SampleDocPreset) => {
    downloadSamplePdfFile(preset);
    setDownloadSuccess(`Đã tải xuống ${preset.fileName} thành công! Bạn có thể dùng file này để upload thử nghiệm.`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleUseDirectly = (preset: SampleDocPreset) => {
    if (onSelectSampleFile) {
      const { file } = generateSamplePdf(preset);
      onSelectSampleFile(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Kho Tệp PDF Mẫu Hành Chính Việt Nam
                <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  Thử nghiệm OCR & Phân loại
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Tải file .pdf chuẩn thể thức về máy tính để upload thử nghiệm, hoặc chạy thử nghiệm trực tiếp 1-chạm.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {downloadSuccess && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 max-h-[70vh] overflow-y-auto">
          {/* Preset list */}
          <div className="md:col-span-5 space-y-2.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Chọn mẫu văn bản ({SAMPLE_DOCUMENTS.length})
            </label>
            {SAMPLE_DOCUMENTS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      {preset.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        preset.urgency === 'Hỏa tốc'
                          ? 'bg-rose-100 text-rose-700'
                          : preset.urgency === 'Khẩn'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {preset.urgency}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 line-clamp-2 mt-1">
                    {preset.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Số: {preset.documentNumber}</span>
                    <span>{preset.date}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Preset Details & Actions */}
          <div className="md:col-span-7 flex flex-col justify-between bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700">Xem trước văn bản:</span>
                <span className="text-[11px] font-mono text-slate-500">{selectedPreset.fileName}</span>
              </div>

              <div className="bg-white rounded-lg p-3.5 border border-slate-200 text-xs text-slate-700 space-y-2 font-serif max-h-56 overflow-y-auto">
                <div className="text-center font-bold text-slate-900 border-b pb-1">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br />
                  <span className="font-normal italic text-[11px]">Độc lập - Tự do - Hạnh phúc</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 font-sans">
                  <span>{selectedPreset.authority}</span>
                  <span>Số: {selectedPreset.documentNumber}</span>
                </div>
                <div className="font-sans font-bold text-center text-slate-900 pt-1">
                  {selectedPreset.title}
                </div>
                <div className="text-[11px] text-slate-600 leading-relaxed font-sans space-y-1">
                  {selectedPreset.bodyParagraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(selectedPreset)}
                className="w-full sm:flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Tải PDF về máy</span>
              </button>

              {onSelectSampleFile && (
                <button
                  type="button"
                  onClick={() => handleUseDirectly(selectedPreset)}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Dùng thử OCR ngay</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 px-5">
          <span>Định dạng: Chuẩn PDF A4 Vector, tuân thủ Nghị định 30/2020/NĐ-CP</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-medium cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
