import React, { useState } from 'react';
import {
  OutgoingDocument,
  User,
  Dossier,
  IncomingDocument,
  OutgoingDocStatus,
} from '../types';
import {
  Search,
  Plus,
  Send,
  Sparkles,
  Paperclip,
  Trash2,
  Edit,
  X,
  FileCheck,
  Printer,
  Copy,
  Check,
  FolderKanban,
} from 'lucide-react';
import { draftOutgoingDocWithAI } from '../services/aiService';

interface OutgoingDocsViewProps {
  docs: OutgoingDocument[];
  incomingDocs: IncomingDocument[];
  users: User[];
  dossiers: Dossier[];
  onSaveDoc: (doc: OutgoingDocument) => void;
  onDeleteDoc: (id: string) => void;
  currentUser: User;
  onOpenDossier: (dossierId: string) => void;
}

export const OutgoingDocsView: React.FC<OutgoingDocsViewProps> = ({
  docs,
  incomingDocs,
  users,
  dossiers,
  onSaveDoc,
  onDeleteDoc,
  currentUser,
  onOpenDossier,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  const [selectedDoc, setSelectedDoc] = useState<OutgoingDocument | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<OutgoingDocument> | null>(null);

  // AI Drafting State
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  const [aiRecipient, setAiRecipient] = useState('');
  const [aiDocType, setAiDocType] = useState('Công văn');
  const [aiKeyPoints, setAiKeyPoints] = useState('');
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [aiDraftError, setAiDraftError] = useState<string | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id);

  const filteredDocs = docs.filter((doc) => {
    const matchSearch =
      doc.documentNumber.toLowerCase().includes(search.toLowerCase()) ||
      doc.summary.toLowerCase().includes(search.toLowerCase()) ||
      doc.recipient.toLowerCase().includes(search.toLowerCase());

    const matchStatus = filterStatus === 'ALL' || doc.status === filterStatus;
    const matchType = filterType === 'ALL' || doc.docType === filterType;

    return matchSearch && matchStatus && matchType;
  });

  const handleOpenAddModal = () => {
    setEditingDoc({
      id: 'vbdi-' + Date.now(),
      documentNumber: `${docs.length + 95}/CV-DV`,
      releaseDate: new Date().toISOString().split('T')[0],
      docType: 'Công văn',
      recipient: 'Ủy Ban Nhân Dân Tỉnh',
      summary: '',
      drafterId: currentUser.id,
      signerId: users.find((u) => u.role === 'LEADER')?.id || currentUser.id,
      status: 'DRAFT',
      dossierId: dossiers[0]?.id || '',
      attachments: [],
      createdById: currentUser.id,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (doc: OutgoingDocument) => {
    setEditingDoc({ ...doc });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editingDoc.documentNumber || !editingDoc.summary) return;

    onSaveDoc(editingDoc as OutgoingDocument);
    setIsModalOpen(false);
    setEditingDoc(null);
    if (selectedDoc && selectedDoc.id === editingDoc.id) {
      setSelectedDoc(editingDoc as OutgoingDocument);
    }
  };

  // AI Draft Generator Handler
  const handleGenerateAIDraft = async () => {
    if (!aiGoal) {
      setAiDraftError('Vui lòng nhập mục đích hoặc nội dung chính cần soạn thảo.');
      return;
    }
    setIsAiDrafting(true);
    setAiDraftError(null);

    try {
      const result = await draftOutgoingDocWithAI({
        docType: aiDocType,
        recipient: aiRecipient,
        goal: aiGoal,
        keyPoints: aiKeyPoints,
      });

      setGeneratedDraft(result.draftContent);
      if (editingDoc) {
        setEditingDoc({
          ...editingDoc,
          summary: result.title || editingDoc.summary,
          docType: aiDocType,
          recipient: aiRecipient || editingDoc.recipient,
        });
      }
    } catch (err: any) {
      setAiDraftError(err.message || 'Lỗi soạn thảo bằng AI');
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleCopyDraft = () => {
    if (generatedDraft) {
      navigator.clipboard.writeText(generatedDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status: OutgoingDocStatus) => {
    switch (status) {
      case 'ISSUED':
      case 'SENT':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">ĐÃ PHÁT HÀNH</span>;
      case 'SIGNED':
        return <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px]">ĐÃ KÝ DUYỆT</span>;
      case 'REVIEWING':
        return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">CHỜ DUYỆT</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">DỰ THẢO</span>;
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quản Lý Văn Bản Đi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi số văn bản phát hành, người ký duyệt, đơn vị nhận và lưu trữ theo hồ sơ
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              handleOpenAddModal();
              setShowAiDraftModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Soạn Thảo Văn Bản</span>
          </button>

          <button
            id="add-outgoing-doc-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo mới văn bản đi</span>
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
            placeholder="Tìm số đi, trích yếu, nơi nhận..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="DRAFT">Dự thảo</option>
          <option value="REVIEWING">Chờ duyệt</option>
          <option value="SIGNED">Đã ký</option>
          <option value="ISSUED">Đã phát hành</option>
          <option value="SENT">Đã gửi đi</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Tất cả loại văn bản</option>
          <option value="Công văn">Công văn</option>
          <option value="Tờ trình">Tờ trình</option>
          <option value="Báo cáo">Báo cáo</option>
          <option value="Thông báo">Thông báo</option>
          <option value="Quyết định">Quyết định</option>
        </select>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Số văn bản đi</th>
                <th className="px-4 py-3">Ngày phát hành</th>
                <th className="px-4 py-3">Loại VB</th>
                <th className="px-5 py-3">Đơn vị nhận & Trích yếu</th>
                <th className="px-4 py-3">Người soạn / Người ký</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Không có văn bản đi nào phù hợp.
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
                      onClick={() => setSelectedDoc(doc)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-800">
                        {doc.documentNumber}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                        {new Date(doc.releaseDate).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px]">
                          {doc.docType}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 max-w-xs md:max-w-md">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-slate-700">
                              Kính gửi: {doc.recipient}
                            </span>
                            {dossier && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
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
                        <div className="flex flex-col text-[11px]">
                          <span className="text-slate-700">
                            Soạn: <strong className="font-semibold">{drafter?.fullName || '—'}</strong>
                          </span>
                          <span className="text-slate-500">
                            Ký: <strong className="font-semibold text-indigo-700">{signer?.fullName || '—'}</strong>
                          </span>
                        </div>
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
                            onClick={() => handleOpenEditModal(doc)}
                            title="Chỉnh sửa văn bản"
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa văn bản đi ${doc.documentNumber}?`)) {
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

      {/* Add / Edit Outgoing Modal */}
      {isModalOpen && editingDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {editingDoc.id?.startsWith('vbdi-') && !docs.some((d) => d.id === editingDoc.id)
                    ? 'Soạn Thảo Văn Bản Đi Mới'
                    : `Cập Nhật Văn Bản Đi: ${editingDoc.documentNumber}`}
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
              {/* AI Draft Assist Modal Section */}
              <div className="bg-linear-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-purple-900 text-xs">
                      AI Tự Động Soạn Thảo Dự Thảo Chuẩn Nghị Định 30/2020/NĐ-CP
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiDraftModal(!showAiDraftModal)}
                    className="text-[11px] font-bold text-purple-700 hover:underline"
                  >
                    {showAiDraftModal ? 'Thu gọn AI' : 'Mở bảng tạo tự động'}
                  </button>
                </div>

                {showAiDraftModal && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Mục đích / Nhiệm vụ chính</label>
                        <input
                          type="text"
                          value={aiGoal}
                          onChange={(e) => setAiGoal(e.target.value)}
                          placeholder="VD: Đề xuất phê duyệt kinh phí mua sắm thiết bị CNTT 2025"
                          className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nơi nhận chính</label>
                        <input
                          type="text"
                          value={aiRecipient}
                          onChange={(e) => setAiRecipient(e.target.value)}
                          placeholder="VD: Ủy Ban Nhân Dân Tỉnh, Sở Tài Chính"
                          className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Các ý chính cần trình bày</label>
                      <input
                        type="text"
                        value={aiKeyPoints}
                        onChange={(e) => setAiKeyPoints(e.target.value)}
                        placeholder="VD: Khảo sát hiện trạng máy cũ hỏng, dự toán 1.8 tỷ, cam kết sử dụng hiệu quả"
                        className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs"
                      />
                    </div>

                    {aiDraftError && <p className="text-[11px] text-rose-600">{aiDraftError}</p>}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateAIDraft}
                        disabled={isAiDrafting}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isAiDrafting ? 'AI đang soạn thảo văn bản...' : 'Tạo dự thảo văn bản'}</span>
                      </button>

                      {generatedDraft && (
                        <button
                          type="button"
                          onClick={handleCopyDraft}
                          className="px-3 py-2 bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 font-bold rounded-lg text-xs flex items-center gap-1"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Đã sao chép' : 'Sao chép dự thảo'}</span>
                        </button>
                      )}
                    </div>

                    {generatedDraft && (
                      <div className="p-3 bg-white border border-purple-200 rounded-lg max-h-48 overflow-y-auto text-xs whitespace-pre-line font-serif text-slate-800 leading-relaxed custom-scrollbar">
                        {generatedDraft}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Document Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số văn bản đi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDoc.documentNumber || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, documentNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại văn bản</label>
                  <select
                    value={editingDoc.docType || 'Công văn'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, docType: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Công văn">Công văn</option>
                    <option value="Tờ trình">Tờ trình</option>
                    <option value="Báo cáo">Báo cáo</option>
                    <option value="Thông báo">Thông báo</option>
                    <option value="Quyết định">Quyết định</option>
                    <option value="Kế hoạch">Kế hoạch</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày phát hành</label>
                  <input
                    type="date"
                    value={editingDoc.releaseDate || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, releaseDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Đơn vị / Cơ quan nhận <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingDoc.recipient || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, recipient: e.target.value })}
                  placeholder="VD: Ủy Ban Nhân Dân Tỉnh, Sở Tài Chính..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Trích yếu nội dung <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editingDoc.summary || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, summary: e.target.value })}
                  placeholder="Nhập trích yếu nội dung văn bản..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người soạn thảo</label>
                  <select
                    value={editingDoc.drafterId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, drafterId: e.target.value })}
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
                  <label className="block font-bold text-slate-700 mb-1">Người ký duyệt</label>
                  <select
                    value={editingDoc.signerId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, signerId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái phát hành</label>
                  <select
                    value={editingDoc.status || 'DRAFT'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, status: e.target.value as OutgoingDocStatus })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="DRAFT">Dự thảo</option>
                    <option value="REVIEWING">Chờ duyệt</option>
                    <option value="SIGNED">Đã ký</option>
                    <option value="ISSUED">Đã phát hành</option>
                    <option value="SENT">Đã gửi đi</option>
                  </select>
                </div>
              </div>

              {/* Link Dossier & Reply */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gắn vào Mã Hồ Sơ</label>
                  <select
                    value={editingDoc.dossierId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, dossierId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- Chưa gắn hồ sơ --</option>
                    {dossiers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.title.slice(0, 35)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trả lời cho Văn bản đến (nếu có)</label>
                  <select
                    value={editingDoc.replyToDocId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, replyToDocId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- Không trả lời văn bản nào --</option>
                    {incomingDocs.map((inDoc) => (
                      <option key={inDoc.id} value={inDoc.id}>
                        Số {inDoc.documentNumber} ({inDoc.issuingAuthority})
                      </option>
                    ))}
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  Lưu văn bản đi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
