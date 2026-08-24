import React, { useState } from 'react';
import {
  X,
  Inbox,
  Send,
  Calendar,
  User as UserIcon,
  FolderArchive,
  FileText,
  Download,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Share2,
} from 'lucide-react';
import { IncomingDocument, OutgoingDocument, User, Dossier } from '../types';

interface DocDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'INCOMING' | 'OUTGOING';
  incomingDoc?: IncomingDocument | null;
  outgoingDoc?: OutgoingDocument | null;
  users: User[];
  dossiers: Dossier[];
  onUpdateIncomingStatus?: (id: string, status: any) => void;
  onUpdateOutgoingStatus?: (id: string, status: any) => void;
  onCreateTaskFromDoc?: (title: string, dossierId?: string) => void;
}

export const DocDetailModal: React.FC<DocDetailModalProps> = ({
  isOpen,
  onClose,
  type,
  incomingDoc,
  outgoingDoc,
  users,
  dossiers,
  onUpdateIncomingStatus,
  onUpdateOutgoingStatus,
  onCreateTaskFromDoc,
}) => {
  if (!isOpen) return null;

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id || d.code === id);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {type === 'INCOMING' ? (
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Inbox className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
            )}
            <div>
              <h2 className="font-bold text-slate-800 text-sm">
                {type === 'INCOMING' ? 'Chi Tiết Văn Bản Đến' : 'Chi Tiết Văn Bản Đi'}
              </h2>
              <span className="text-xs font-mono text-slate-400">
                {type === 'INCOMING' ? incomingDoc?.documentNumber : outgoingDoc?.documentNumber}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {type === 'INCOMING' && incomingDoc && (
            <>
              {/* Summary Block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Trích yếu nội dung
                  </span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {incomingDoc.docType}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">{incomingDoc.summary}</p>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Cơ quan ban hành</span>
                  <p className="font-bold text-slate-800">{incomingDoc.issuingAuthority}</p>
                  <p className="text-[11px] text-slate-500 font-mono">Số gốc: {incomingDoc.officialNumber}</p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Ngày tháng</span>
                  <p className="text-slate-700">Ngày đến: <b>{incomingDoc.receivedDate}</b></p>
                  <p className="text-slate-700">Hạn xử lý: <b className="text-rose-600">{incomingDoc.dueDate}</b></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Cán bộ chủ trì</span>
                  {incomingDoc.assigneeId ? (
                    <div className="flex items-center gap-2 mt-1">
                      <img
                        src={getUser(incomingDoc.assigneeId)?.avatar}
                        alt="Avatar"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="font-bold text-slate-800">{getUser(incomingDoc.assigneeId)?.fullName}</span>
                    </div>
                  ) : (
                    <p className="text-amber-600 font-medium">Chưa phân công cán bộ</p>
                  )}
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Hồ sơ vụ việc liên kết</span>
                  <p className="font-bold text-indigo-700 font-mono mt-1">
                    {incomingDoc.dossierId || 'Chưa gán hồ sơ'}
                  </p>
                </div>
              </div>

              {/* Attachments */}
              {incomingDoc.attachments && incomingDoc.attachments.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2">Tệp đính kèm văn bản ({incomingDoc.attachments.length})</h4>
                  <div className="space-y-2">
                    {incomingDoc.attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-slate-800">{file.name}</span>
                          <span className="text-slate-400 text-[10px]">({file.size})</span>
                        </div>
                        <a
                          href={file.url}
                          download={file.name}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-indigo-600 font-bold rounded hover:bg-slate-50"
                        >
                          Tải về
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Action: Create Task From Doc */}
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-indigo-900 text-xs">Tạo Nhiệm Vụ Phân Công Từ Văn Bản Này</h4>
                  <p className="text-[11px] text-indigo-700">Tự động liên kết mã hồ sơ và trích yếu vào nhiệm vụ mới.</p>
                </div>
                <button
                  onClick={() => {
                    onCreateTaskFromDoc?.(
                      `Xử lý văn bản: ${incomingDoc.summary}`,
                      incomingDoc.dossierId
                    );
                    onClose();
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Giao việc ngay</span>
                </button>
              </div>
            </>
          )}

          {type === 'OUTGOING' && outgoingDoc && (
            <>
              {/* Summary Block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Trích yếu nội dung phát hành
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {outgoingDoc.docType}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">{outgoingDoc.summary}</p>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Nơi nhận</span>
                  <p className="font-bold text-slate-800">{outgoingDoc.recipient}</p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Ngày phát hành</span>
                  <p className="font-bold text-slate-800">{outgoingDoc.releaseDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Cán bộ soạn thảo</span>
                  <p className="font-bold text-slate-800">{getUser(outgoingDoc.drafterId)?.fullName || '---'}</p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Người ký phê duyệt</span>
                  <p className="font-bold text-slate-800">{getUser(outgoingDoc.signerId)?.fullName || '---'}</p>
                </div>
              </div>

              {/* Attachments */}
              {outgoingDoc.attachments && outgoingDoc.attachments.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2">Tệp đính kèm văn bản ({outgoingDoc.attachments.length})</h4>
                  <div className="space-y-2">
                    {outgoingDoc.attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-slate-800">{file.name}</span>
                          <span className="text-slate-400 text-[10px]">({file.size})</span>
                        </div>
                        <a
                          href={file.url}
                          download={file.name}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-emerald-600 font-bold rounded hover:bg-slate-50"
                        >
                          Tải về
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
