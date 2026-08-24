import React, { useState } from 'react';
import {
  Send,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { OutgoingDocument, User, Dossier, OutgoingDocStatus, MasterData } from '../types';

interface OutgoingDocsViewProps {
  docs: OutgoingDocument[];
  users: User[];
  dossiers: Dossier[];
  masterData: MasterData;
  onSelectDoc: (doc: OutgoingDocument) => void;
  onEditDoc: (doc: OutgoingDocument) => void;
  onDeleteDoc: (id: string) => void;
  onCreateNewDoc: () => void;
  onOpenAiDraftModal: () => void;
}

export const OutgoingDocsView: React.FC<OutgoingDocsViewProps> = ({
  docs,
  users,
  dossiers,
  masterData,
  onSelectDoc,
  onEditDoc,
  onDeleteDoc,
  onCreateNewDoc,
  onOpenAiDraftModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id || d.code === id);

  const filteredDocs = docs.filter((d) => {
    const matchSearch =
      !searchTerm ||
      d.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.summary.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchType = typeFilter === 'ALL' || d.docType === typeFilter;

    return matchSearch && matchStatus && matchType;
  });

  const getStatusBadge = (status: OutgoingDocStatus) => {
    switch (status) {
      case 'SENT':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">Đã gửi đi</span>;
      case 'ISSUED':
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px] uppercase">Đã phát hành</span>;
      case 'SIGNED':
        return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">Đã ký duyệt</span>;
      case 'REVIEWING':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">Đang thẩm định</span>;
      case 'DRAFT':
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Dự thảo</span>;
    }
  };

  const totalCount = docs.length;
  const draftCount = docs.filter((d) => d.status === 'DRAFT' || d.status === 'REVIEWING').length;
  const signedCount = docs.filter((d) => d.status === 'SIGNED').length;
  const issuedCount = docs.filter((d) => d.status === 'ISSUED' || d.status === 'SENT').length;

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sổ Quản Lý Văn Bản Đi</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi quá trình soạn thảo, thẩm định, trình ký, cấp số phát hành và gửi văn bản ra ngoài cơ quan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAiDraftModal}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold py-2.5 px-3.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>AI Soạn Thảo Nghị Định 30</span>
          </button>

          <button
            onClick={onCreateNewDoc}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Soạn Thảo Văn Bản Đi</span>
          </button>
        </div>
      </div>

      {/* 4 Stat blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Tổng văn bản đi</span>
          <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{totalCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] text-amber-600 font-semibold uppercase">Đang soạn / Thẩm định</span>
          <div className="text-2xl font-extrabold text-amber-700 mt-0.5">{draftCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] text-purple-600 font-semibold uppercase">Đã ký duyệt</span>
          <div className="text-2xl font-extrabold text-purple-700 mt-0.5">{signedCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] text-emerald-600 font-semibold uppercase">Đã phát hành / Gửi</span>
          <div className="text-2xl font-extrabold text-emerald-700 mt-0.5">{issuedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm số đi, đơn vị nhận, trích yếu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-slate-700 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả trạng thái phát hành</option>
            <option value="DRAFT">Dự thảo</option>
            <option value="REVIEWING">Đang thẩm định</option>
            <option value="SIGNED">Đã ký duyệt</option>
            <option value="ISSUED">Đã phát hành</option>
            <option value="SENT">Đã gửi đi</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả loại văn bản</option>
            {masterData.documentTypes.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>

          {(searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
              }}
              className="text-xs text-rose-600 hover:underline px-1 font-semibold"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Số đi / Mã</th>
                <th className="px-4 py-3">Ngày phát hành</th>
                <th className="px-4 py-3">Loại VB</th>
                <th className="px-4 py-3">Đơn vị nhận</th>
                <th className="px-5 py-3 w-1/3">Trích yếu nội dung</th>
                <th className="px-4 py-3">Người soạn / Ký</th>
                <th className="px-3 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    Không có văn bản đi nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const drafter = getUser(doc.drafterId);
                  const signer = getUser(doc.signerId);
                  const dossier = getDossier(doc.dossierId);
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectDoc(doc)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 font-mono text-xs">{doc.documentNumber}</span>
                          {dossier && (
                            <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded mt-0.5 inline-block max-w-max font-semibold">
                              {dossier.code}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                        {doc.releaseDate}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-slate-800 font-medium bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {doc.docType}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 line-clamp-1">{doc.recipient}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 line-clamp-2 leading-relaxed group-hover:text-indigo-600 transition-colors">
                          {doc.summary}
                        </p>
                        {doc.attachments && doc.attachments.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-indigo-600">
                            <FileText className="w-3 h-3" />
                            <span>{doc.attachments.length} tệp đính kèm</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col text-[11px]">
                          <span className="text-slate-700">Soạn: <b>{drafter?.fullName || '---'}</b></span>
                          <span className="text-slate-500">Ký: <b>{signer?.fullName || '---'}</b></span>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap">{getStatusBadge(doc.status)}</td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectDoc(doc)}
                            className="p-1.5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditDoc(doc)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa văn bản đi số ${doc.documentNumber}?`)) {
                                onDeleteDoc(doc.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Xóa văn bản"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
