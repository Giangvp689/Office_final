import React, { useState } from 'react';
import {
  IncomingDocument,
  User,
  Dossier,
  AttachmentFile,
  UrgencyLevel,
  SecurityLevel,
  IncomingDocStatus,
} from '../types';
import {
  Search,
  Filter,
  Plus,
  FileText,
  Calendar,
  Sparkles,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Paperclip,
  Trash2,
  Edit,
  X,
  ExternalLink,
  ChevronRight,
  FolderKanban,
  CheckSquare,
} from 'lucide-react';
import { summarizeDocumentWithAI } from '../services/aiService';

interface IncomingDocsViewProps {
  docs: IncomingDocument[];
  users: User[];
  dossiers: Dossier[];
  onSaveDoc: (doc: IncomingDocument) => void;
  onDeleteDoc: (id: string) => void;
  onCreateTaskFromDoc: (doc: IncomingDocument) => void;
  currentUser: User;
  onOpenDossier: (dossierId: string) => void;
}

export const IncomingDocsView: React.FC<IncomingDocsViewProps> = ({
  docs,
  users,
  dossiers,
  onSaveDoc,
  onDeleteDoc,
  onCreateTaskFromDoc,
  currentUser,
  onOpenDossier,
}) => {
  const [search, setSearch] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDossier, setFilterDossier] = useState<string>('ALL');

  const [selectedDoc, setSelectedDoc] = useState<IncomingDocument | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<IncomingDocument> | null>(null);

  // AI Summarizer State inside modal
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [rawTextToAnalyze, setRawTextToAnalyze] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id);

  const filteredDocs = docs.filter((doc) => {
    const matchSearch =
      doc.documentNumber.toLowerCase().includes(search.toLowerCase()) ||
      doc.officialNumber.toLowerCase().includes(search.toLowerCase()) ||
      doc.summary.toLowerCase().includes(search.toLowerCase()) ||
      doc.issuingAuthority.toLowerCase().includes(search.toLowerCase());

    const matchUrgency = filterUrgency === 'ALL' || doc.urgency === filterUrgency;
    const matchStatus = filterStatus === 'ALL' || doc.status === filterStatus;
    const matchDossier = filterDossier === 'ALL' || doc.dossierId === filterDossier;

    return matchSearch && matchUrgency && matchStatus && matchDossier;
  });

  const handleOpenAddModal = () => {
    setEditingDoc({
      id: 'vbd-' + Date.now(),
      documentNumber: `${docs.length + 145}/VP-DV`,
      officialNumber: '',
      receivedDate: new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
      issuingAuthority: 'Ủy Ban Nhân Dân Tỉnh',
      summary: '',
      docType: 'Công văn',
      urgency: 'THUONG',
      securityLevel: 'THUONG',
      assigneeId: currentUser.id,
      coAssigneeIds: [],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'PROCESSING',
      resultSummary: '',
      dossierId: dossiers[0]?.id || '',
      attachments: [],
      linkedTaskIds: [],
      createdById: currentUser.id,
    });
    setRawTextToAnalyze('');
    setAiError(null);
    setShowAiInput(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (doc: IncomingDocument) => {
    setEditingDoc({ ...doc });
    setRawTextToAnalyze('');
    setAiError(null);
    setShowAiInput(false);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editingDoc.documentNumber || !editingDoc.summary) return;

    onSaveDoc(editingDoc as IncomingDocument);
    setIsModalOpen(false);
    setEditingDoc(null);
    if (selectedDoc && selectedDoc.id === editingDoc.id) {
      setSelectedDoc(editingDoc as IncomingDocument);
    }
  };

  // AI Action
  const handleRunAiAnalysis = async () => {
    if (!rawTextToAnalyze && !editingDoc?.summary) {
      setAiError('Vui lòng dán nội dung văn bản hoặc nhập trích yếu để AI phân tích.');
      return;
    }
    setIsAiLoading(true);
    setAiError(null);

    try {
      const result = await summarizeDocumentWithAI({
        title: editingDoc?.summary || '',
        content: rawTextToAnalyze || editingDoc?.summary || '',
        docType: editingDoc?.docType,
        issuingAuthority: editingDoc?.issuingAuthority,
      });

      setEditingDoc((prev) => ({
        ...prev,
        summary: result.summary || prev?.summary || '',
        urgency: (result.suggestedUrgency as UrgencyLevel) || prev?.urgency || 'THUONG',
        dueDate: result.suggestedDueDate || prev?.dueDate || '',
        resultSummary: result.actionPlan ? `Kế hoạch hành động đề xuất: ${result.actionPlan}` : prev?.resultSummary,
      }));
      setShowAiInput(false);
    } catch (err: any) {
      setAiError(err.message || 'Lỗi phân tích AI');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'HOA_TOC':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-black text-[10px]">HỎA TỐC</span>;
      case 'KHAN':
      case 'THUONG_KHAN':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">KHẨN</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">Thường</span>;
    }
  };

  const getStatusBadge = (status: IncomingDocStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">ĐÃ XỬ LÝ</span>;
      case 'PROCESSING':
        return <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px]">ĐANG XỬ LÝ</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">QUÁ HẠN</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">CHƯA GIAO</span>;
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quản Lý Văn Bản Đến</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tiếp nhận, phân công xử lý, gắn mã hồ sơ vụ việc và theo dõi kết quả
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="add-incoming-doc-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tiếp nhận văn bản mới</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo số đến, số ký hiệu, trích yếu, đơn vị gửi..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Filter Urgency */}
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Tất cả độ khẩn</option>
          <option value="HOA_TOC">Hỏa tốc</option>
          <option value="KHAN">Khẩn / Thượng khẩn</option>
          <option value="THUONG">Thường</option>
        </select>

        {/* Filter Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING_ASSIGN">Chưa giao</option>
          <option value="PROCESSING">Đang xử lý</option>
          <option value="COMPLETED">Đã xử lý</option>
          <option value="OVERDUE">Quá hạn</option>
        </select>

        {/* Filter Dossier */}
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

      {/* Main Table View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Số đến / Ký hiệu</th>
                <th className="px-4 py-3">Ngày nhận</th>
                <th className="px-5 py-3">Cơ quan ban hành / Trích yếu</th>
                <th className="px-4 py-3">Người phụ trách</th>
                <th className="px-4 py-3">Hạn xử lý</th>
                <th className="px-4 py-3">Độ khẩn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Không tìm thấy văn bản đến nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const assignee = getUser(doc.assigneeId);
                  const dossier = getDossier(doc.dossierId);
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 font-mono">
                            {doc.documentNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Gốc: {doc.officialNumber || '—'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                        {new Date(doc.receivedDate).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="px-5 py-3.5 max-w-xs md:max-w-md">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-[11px] text-indigo-700">
                              {doc.issuingAuthority}
                            </span>
                            {dossier && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded font-mono">
                                {dossier.code}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-slate-800 line-clamp-2 leading-relaxed">
                            {doc.summary}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={assignee.avatar}
                              alt={assignee.fullName}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200"
                            />
                            <span className="font-medium text-slate-700">
                              {assignee.fullName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa phân công</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-medium">
                        <span
                          className={
                            doc.dueDate < new Date().toISOString().split('T')[0] &&
                            doc.status !== 'COMPLETED'
                              ? 'text-rose-600 font-bold'
                              : 'text-slate-600'
                          }
                        >
                          {new Date(doc.dueDate).toLocaleDateString('vi-VN')}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getUrgencyBadge(doc.urgency)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(doc.status)}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onCreateTaskFromDoc(doc)}
                            title="Giao việc từ văn bản này"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(doc)}
                            title="Chỉnh sửa thông tin"
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn muốn xóa văn bản đến ${doc.documentNumber}?`)) {
                                onDeleteDoc(doc.id);
                              }
                            }}
                            title="Xóa văn bản"
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
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

      {/* Document Detail Drawer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-slate-800 text-base">
                  Chi tiết Văn bản đến: {selectedDoc.documentNumber}
                </span>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs flex-1">
              {/* Top Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg">
                  {selectedDoc.docType}
                </span>
                {getUrgencyBadge(selectedDoc.urgency)}
                {getStatusBadge(selectedDoc.status)}
                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
                  Độ mật: {selectedDoc.securityLevel}
                </span>
              </div>

              {/* Summary Block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Trích yếu nội dung
                </span>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                  {selectedDoc.summary}
                </p>
              </div>

              {/* 2-Column Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Đơn vị ban hành
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block">
                    {selectedDoc.issuingAuthority}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Số ký hiệu gốc
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">
                    {selectedDoc.officialNumber || 'Chưa ghi'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Ngày tiếp nhận
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block">
                    {new Date(selectedDoc.receivedDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Hạn xử lý
                  </span>
                  <span className="text-xs font-bold text-rose-600 mt-1 block">
                    {new Date(selectedDoc.dueDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Assignee & Dossier */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Cán bộ chủ trì xử lý
                  </span>
                  {getUser(selectedDoc.assigneeId) ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={getUser(selectedDoc.assigneeId)?.avatar}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-bold text-slate-800">
                          {getUser(selectedDoc.assigneeId)?.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {getUser(selectedDoc.assigneeId)?.email}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Chưa phân công</span>
                  )}
                </div>

                {selectedDoc.dossierId && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Mã hồ sơ liên kết
                      </span>
                      <span className="text-xs font-bold text-indigo-700">
                        {getDossier(selectedDoc.dossierId)?.code} - {getDossier(selectedDoc.dossierId)?.title}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const dId = selectedDoc.dossierId;
                        setSelectedDoc(null);
                        if (dId) onOpenDossier(dId);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Mở hồ sơ &rarr;
                    </button>
                  </div>
                )}
              </div>

              {/* Result Summary */}
              {selectedDoc.resultSummary && (
                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                    Kết quả xử lý & Ghi chú
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedDoc.resultSummary}
                  </p>
                </div>
              )}

              {/* Attachments */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Tài liệu đính kèm ({selectedDoc.attachments.length})
                </span>
                {selectedDoc.attachments.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg text-slate-400 text-center border border-dashed border-slate-200">
                    Chưa có tài liệu đính kèm
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDoc.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700 truncate">
                            {file.fileName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(file.fileSize / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => {
                  const doc = selectedDoc;
                  setSelectedDoc(null);
                  onCreateTaskFromDoc(doc);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Giao việc từ văn bản này</span>
              </button>

              <button
                onClick={() => {
                  const doc = selectedDoc;
                  setSelectedDoc(null);
                  handleOpenEditModal(doc);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Sửa thông tin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Incoming Doc Modal */}
      {isModalOpen && editingDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {editingDoc.id?.startsWith('vbd-') && !docs.some((d) => d.id === editingDoc.id)
                    ? 'Tiếp Nhận Văn Bản Đến Mới'
                    : `Cập Nhật Văn Bản Đến: ${editingDoc.documentNumber}`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs custom-scrollbar">
              {/* AI Assistant Banner Helper */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-indigo-900 text-xs">
                      Trợ lý AI Gemini: Tự động trích xuất & Tóm tắt văn bản
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiInput(!showAiInput)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                  >
                    {showAiInput ? 'Đóng hộp phân tích' : 'Dán văn bản để AI phân tích'}
                  </button>
                </div>

                {showAiInput && (
                  <div className="space-y-2 pt-2 animate-in fade-in">
                    <textarea
                      value={rawTextToAnalyze}
                      onChange={(e) => setRawTextToAnalyze(e.target.value)}
                      placeholder="Dán toàn văn hoặc đoạn trích yếu văn bản đến tại đây..."
                      rows={3}
                      className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                    />
                    {aiError && <p className="text-[11px] text-rose-600">{aiError}</p>}
                    <button
                      type="button"
                      onClick={handleRunAiAnalysis}
                      disabled={isAiLoading}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAiLoading ? 'AI đang phân tích...' : 'Phân tích & Điền tự động'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Row 1: Document Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số đến nội bộ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDoc.documentNumber || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, documentNumber: e.target.value })}
                    placeholder="VD: 180/VP-UBND"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số ký hiệu cơ quan gửi
                  </label>
                  <input
                    type="text"
                    value={editingDoc.officialNumber || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, officialNumber: e.target.value })}
                    placeholder="VD: 450/QĐ-UBND"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Row 2: Authority & Doc Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cơ quan ban hành <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDoc.issuingAuthority || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, issuingAuthority: e.target.value })}
                    placeholder="VD: Ủy Ban Nhân Dân Tỉnh, Sở Tài Chính..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Loại văn bản
                  </label>
                  <select
                    value={editingDoc.docType || 'Công văn'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, docType: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Công văn">Công văn</option>
                    <option value="Quyết định">Quyết định</option>
                    <option value="Tờ trình">Tờ trình</option>
                    <option value="Thông báo">Thông báo</option>
                    <option value="Chỉ thị">Chỉ thị</option>
                    <option value="Kế hoạch">Kế hoạch</option>
                    <option value="Báo cáo">Báo cáo</option>
                  </select>
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Trích yếu nội dung văn bản <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editingDoc.summary || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, summary: e.target.value })}
                  placeholder="Nhập tóm tắt nội dung chính của văn bản..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Row 3: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ngày tiếp nhận
                  </label>
                  <input
                    type="date"
                    value={editingDoc.receivedDate || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, receivedDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ngày ban hành gốc
                  </label>
                  <input
                    type="date"
                    value={editingDoc.issueDate || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, issueDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Hạn xử lý <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editingDoc.dueDate || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, dueDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-rose-600"
                  />
                </div>
              </div>

              {/* Row 4: Urgency & Security & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ khẩn</label>
                  <select
                    value={editingDoc.urgency || 'THUONG'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, urgency: e.target.value as UrgencyLevel })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="THUONG">Thường</option>
                    <option value="KHAN">Khẩn</option>
                    <option value="THUONG_KHAN">Thượng khẩn</option>
                    <option value="HOA_TOC">Hỏa tốc</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ mật</label>
                  <select
                    value={editingDoc.securityLevel || 'THUONG'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, securityLevel: e.target.value as SecurityLevel })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="THUONG">Thường</option>
                    <option value="MAT">Mật</option>
                    <option value="TOI_MAT">Tối mật</option>
                    <option value="TUYET_MAT">Tuyệt mật</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={editingDoc.status || 'PROCESSING'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, status: e.target.value as IncomingDocStatus })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="PENDING_ASSIGN">Chưa phân công</option>
                    <option value="PROCESSING">Đang xử lý</option>
                    <option value="COMPLETED">Đã xử lý xong</option>
                    <option value="OVERDUE">Quá hạn</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Assignee & Dossier Binding */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cán bộ chủ trì xử lý
                  </label>
                  <select
                    value={editingDoc.assigneeId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, assigneeId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- Chọn cán bộ phụ trách --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Gắn vào Mã Hồ Sơ vụ việc
                  </label>
                  <select
                    value={editingDoc.dossierId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, dossierId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- Chưa gắn hồ sơ --</option>
                    {dossiers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.title.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Result Summary Note */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kết quả xử lý / Ý kiến chỉ đạo
                </label>
                <textarea
                  rows={2}
                  value={editingDoc.resultSummary || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, resultSummary: e.target.value })}
                  placeholder="Ghi chú kết quả xử lý hoặc ý kiến chỉ đạo của Lãnh đạo..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Modal Footer Actions */}
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
                  Lưu văn bản đến
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
