import React, { useState } from 'react';
import {
  Inbox,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  UserCheck,
  FolderArchive,
  FileText,
  Sparkles,
} from 'lucide-react';
import { IncomingDocument, User, Dossier, UrgencyLevel, IncomingDocStatus, MasterData } from '../types';

interface IncomingDocsViewProps {
  docs: IncomingDocument[];
  users: User[];
  dossiers: Dossier[];
  masterData: MasterData;
  onSelectDoc: (doc: IncomingDocument) => void;
  onEditDoc: (doc: IncomingDocument) => void;
  onDeleteDoc: (id: string) => void;
  onCreateNewDoc: () => void;
  onOpenAiDocAnalyzer: () => void;
}

export const IncomingDocsView: React.FC<IncomingDocsViewProps> = ({
  docs,
  users,
  dossiers,
  masterData,
  onSelectDoc,
  onEditDoc,
  onDeleteDoc,
  onCreateNewDoc,
  onOpenAiDocAnalyzer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id || d.code === id);

  const filteredDocs = docs.filter((d) => {
    const matchSearch =
      !searchTerm ||
      d.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.officialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.issuingAuthority.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchUrgency = urgencyFilter === 'ALL' || d.urgency === urgencyFilter;
    const matchType = typeFilter === 'ALL' || d.docType === typeFilter;

    return matchSearch && matchStatus && matchUrgency && matchType;
  });

  const getUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'HOA_TOC':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase animate-pulse">Hỏa tốc</span>;
      case 'THUONG_KHAN':
      case 'KHAN':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px] uppercase">Khẩn</span>;
      case 'THUONG':
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">Thường</span>;
    }
  };

  const getStatusBadge = (status: IncomingDocStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đã hoàn thành</span>;
      case 'PROCESSING':
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">Đang xử lý</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">Quá hạn xử lý</span>;
      case 'PENDING_ASSIGN':
      default:
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">Chờ phân công</span>;
    }
  };

  // Quick stats
  const totalCount = docs.length;
  const processingCount = docs.filter((d) => d.status === 'PROCESSING').length;
  const pendingCount = docs.filter((d) => d.status === 'PENDING_ASSIGN').length;
  const urgentCount = docs.filter((d) => d.urgency === 'HOA_TOC' || d.urgency === 'KHAN' || d.urgency === 'THUONG_KHAN').length;

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header & Quick stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sổ Quản Lý Văn Bản Đến</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi, phân luồng và giám sát tiến độ xử lý toàn bộ công văn, quyết định, chỉ thị gửi đến đơn vị.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-ai-doc-scan"
            onClick={onOpenAiDocAnalyzer}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold py-2.5 px-3.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>AI Quét & Trích Yếu</span>
          </button>

          <button
            id="btn-add-incoming-doc"
            onClick={onCreateNewDoc}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tiếp Nhận Văn Bản Đến</span>
          </button>
        </div>
      </div>

      {/* 4 Mini Stat Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Tổng văn bản đến</span>
          <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{totalCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] text-amber-600 font-semibold uppercase">Chờ phân công</span>
          <div className="text-2xl font-extrabold text-amber-700 mt-0.5">{pendingCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] text-blue-600 font-semibold uppercase">Đang xử lý</span>
          <div className="text-2xl font-extrabold text-blue-700 mt-0.5">{processingCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] text-rose-600 font-semibold uppercase">Hỏa tốc / Khẩn</span>
          <div className="text-2xl font-extrabold text-rose-700 mt-0.5">{urgentCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo số đến, số ký hiệu, cơ quan, trích yếu..."
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
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING_ASSIGN">Chờ phân công</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="OVERDUE">Quá hạn</option>
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả độ khẩn</option>
            <option value="HOA_TOC">Hỏa tốc</option>
            <option value="THUONG_KHAN">Thượng khẩn</option>
            <option value="KHAN">Khẩn</option>
            <option value="THUONG">Thường</option>
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

          {(searchTerm || statusFilter !== 'ALL' || urgencyFilter !== 'ALL' || typeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setUrgencyFilter('ALL');
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
                <th className="px-4 py-3">Số đến / Ký hiệu</th>
                <th className="px-4 py-3">Ngày đến</th>
                <th className="px-4 py-3">Cơ quan ban hành</th>
                <th className="px-5 py-3 w-1/3">Trích yếu nội dung</th>
                <th className="px-3 py-3">Độ khẩn</th>
                <th className="px-4 py-3">Người phụ trách</th>
                <th className="px-3 py-3">Hạn xử lý</th>
                <th className="px-3 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    Không tìm thấy văn bản đến phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const assignee = getUser(doc.assigneeId);
                  const dossier = getDossier(doc.dossierId);
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectDoc(doc)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs font-mono">{doc.documentNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Gốc: {doc.officialNumber}</span>
                          {dossier && (
                            <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded mt-0.5 inline-block max-w-max font-semibold">
                              {dossier.code}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                        {doc.receivedDate}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 block line-clamp-1">
                          {doc.issuingAuthority}
                        </span>
                        <span className="text-[10px] text-slate-400">Loại: {doc.docType}</span>
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

                      <td className="px-3 py-3.5 whitespace-nowrap">{getUrgencyBadge(doc.urgency)}</td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={assignee.avatar}
                              alt={assignee.fullName}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200"
                            />
                            <span className="font-medium text-slate-700 truncate max-w-[120px]">
                              {assignee.fullName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium text-[11px]">Chưa giao</span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap font-medium text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.dueDate}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap">{getStatusBadge(doc.status)}</td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectDoc(doc)}
                            className="p-1.5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded transition-colors"
                            title="Xem chi tiết & Xử lý"
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
                              if (confirm(`Bạn có chắc chắn muốn xóa văn bản đến số ${doc.documentNumber}?`)) {
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
