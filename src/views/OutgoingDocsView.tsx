import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  OutgoingDocument,
  User,
  Dossier,
  IncomingDocument,
  OutgoingDocStatus,
  AttachmentFile,
  Task,
  MasterData,
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
  Upload,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Image as ImageIcon,
  Building,
  UserCheck,
  Calendar,
  Layers,
  Lock,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { draftOutgoingDocWithAI } from '../services/aiService';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { canAccessOutgoingDoc, isLeaderOrAdmin, isClerk } from '../utils/permission';
import { dbService } from '../services/db';

interface OutgoingDocsViewProps {
  docs: OutgoingDocument[];
  incomingDocs: IncomingDocument[];
  users: User[];
  dossiers: Dossier[];
  onSaveDoc: (doc: OutgoingDocument) => void;
  onDeleteDoc: (id: string) => void;
  currentUser: User;
  onOpenDossier: (dossierId: string) => void;
  initialSelectedDocId?: string;
  tasks?: Task[];
  masterData?: MasterData;
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
  initialSelectedDocId,
  tasks = [],
  masterData,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  const isSuperUser = isLeaderOrAdmin(currentUser) || isClerk(currentUser);
  const [docScope, setDocScope] = useState<'MY' | 'ALL'>(isSuperUser ? 'ALL' : 'MY');
  const [myRoleFilter, setMyRoleFilter] = useState<'ALL' | 'DRAFTED' | 'SIGNER'>('ALL');

  const [selectedDoc, setSelectedDoc] = useState<OutgoingDocument | null>(null);

  // Recipient suggestions from masterData + existing outgoing docs
  const recipientList = useMemo(() => {
    const fromMaster = (masterData?.authorities || masterData?.issuingAuthorities || [])
      .map((a: any) => (typeof a === 'string' ? a : a.name))
      .filter(Boolean);
    const fromDocs = docs.map((d) => d.recipient).filter(Boolean);
    const combined = Array.from(new Set([...fromMaster, ...fromDocs]));
    return combined.length > 0
      ? combined
      : ['Ủy Ban Nhân Dân Tỉnh', 'Sở Tư Pháp', 'Sở Nội Vụ', 'Sở Kế Hoạch và Đầu Tư', 'Văn Phòng UBND'];
  }, [masterData, docs]);

  // Doc types from masterData + standards
  const docTypeList = useMemo(() => {
    const fromMaster = (masterData?.docTypes || masterData?.documentTypes || [])
      .map((t: any) => (typeof t === 'string' ? t : t.name))
      .filter(Boolean);
    const defaultTypes = [
      'Công văn',
      'Tờ trình',
      'Báo cáo',
      'Thông báo',
      'Quyết định',
      'Kế hoạch',
      'Giấy mời',
      'Chỉ thị',
    ];
    return Array.from(new Set([...fromMaster, ...defaultTypes]));
  }, [masterData]);

  // Accessible docs based on permissions
  const accessibleDocs = useMemo(() => {
    if (isSuperUser && docScope === 'ALL') {
      return docs;
    }
    return docs.filter((d) => canAccessOutgoingDoc(d, currentUser, dossiers));
  }, [docs, isSuperUser, docScope, currentUser, dossiers]);

  // Auto open document if navigated from notification
  useEffect(() => {
    if (initialSelectedDocId) {
      const target = docs.find(
        (d) => d.id === initialSelectedDocId || d.documentNumber === initialSelectedDocId
      );
      if (target) {
        setSelectedDoc(target);
        setSearch('');
        setFilterStatus('ALL');
        setFilterType('ALL');
      }
    }
  }, [initialSelectedDocId, docs]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<OutgoingDocument> | null>(null);

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState<AttachmentFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Drag and drop & File Input refs for scanning/uploading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // In-App Delete Confirmation State
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<OutgoingDocument | null>(null);
  const [deleteToastMessage, setDeleteToastMessage] = useState<string | null>(null);

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id);

  const filteredDocs = accessibleDocs.filter((doc) => {
    if (myRoleFilter === 'DRAFTED' && doc.drafterId !== currentUser?.id && doc.createdById !== currentUser?.id) {
      return false;
    }
    if (myRoleFilter === 'SIGNER' && doc.signerId !== currentUser?.id) {
      return false;
    }

    const matchSearch =
      doc.documentNumber.toLowerCase().includes(search.toLowerCase()) ||
      doc.summary.toLowerCase().includes(search.toLowerCase()) ||
      doc.recipient.toLowerCase().includes(search.toLowerCase()) ||
      (doc.content && doc.content.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = filterStatus === 'ALL' || doc.status === filterStatus;
    const matchType = filterType === 'ALL' || doc.docType === filterType;

    return matchSearch && matchStatus && matchType;
  });

  const handleOpenAddModal = () => {
    setEditingDoc({
      id: 'vbdi-' + Date.now(),
      documentNumber: `${docs.length + 105}/UBND-VP`,
      releaseDate: new Date().toISOString().split('T')[0],
      docType: 'Công văn',
      recipient: 'Ủy Ban Nhân Dân Tỉnh',
      summary: '',
      content: '',
      drafterId: currentUser?.id || users[0]?.id || '',
      signerId: users.find((u) => u?.role === 'LEADER')?.id || currentUser?.id || users[0]?.id || '',
      status: 'DRAFT',
      dossierId: dossiers[0]?.id || '',
      attachments: [],
      createdById: currentUser?.id || users[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (doc: OutgoingDocument) => {
    setEditingDoc({
      ...doc,
      attachments: doc.attachments || [],
    });
    setIsModalOpen(true);
  };

  // Convert uploaded computer files to base64 and add to editingDoc.attachments
  const handleFilesUpload = (files: FileList | null) => {
    if (!files || files.length === 0 || !editingDoc) return;

    const newAttachments: AttachmentFile[] = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        newAttachments.push({
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          fileName: file.name,
          fileSize: file.size,
          fileType: ext,
          fileUrl: dataUrl,
          category: 'VAN_BAN_DI',
          uploadedAt: new Date().toISOString(),
          uploadedById: currentUser?.id || '',
          uploadedByName: currentUser?.fullName || 'Người dùng',
          dossierId: editingDoc.dossierId || undefined,
          tags: ['Văn bản đi', ext.toUpperCase(), 'Scan từ máy tính'],
        });

        processed++;
        if (processed === files.length) {
          setEditingDoc((prev) => ({
            ...prev,
            attachments: [...(prev?.attachments || []), ...newAttachments],
          }));
        }
      };

      reader.readAsDataURL(file);
    });
  };

  // Quick file attachment directly from Details Drawer
  const handleQuickUploadFromDetail = (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedDoc) return;

    const newAttachments: AttachmentFile[] = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        newAttachments.push({
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          fileName: file.name,
          fileSize: file.size,
          fileType: ext,
          fileUrl: dataUrl,
          category: 'VAN_BAN_DI',
          uploadedAt: new Date().toISOString(),
          uploadedById: currentUser?.id || '',
          uploadedByName: currentUser?.fullName || 'Người dùng',
          dossierId: selectedDoc.dossierId || undefined,
          tags: ['Văn bản đi', ext.toUpperCase()],
        });

        processed++;
        if (processed === files.length) {
          const updatedDoc: OutgoingDocument = {
            ...selectedDoc,
            attachments: [...(selectedDoc.attachments || []), ...newAttachments],
          };
          onSaveDoc(updatedDoc);
          setSelectedDoc(updatedDoc);
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (attId: string) => {
    if (!editingDoc) return;
    setEditingDoc({
      ...editingDoc,
      attachments: (editingDoc.attachments || []).filter((a) => a.id !== attId),
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editingDoc.documentNumber || !editingDoc.summary) {
      alert('Vui lòng nhập đầy đủ Số văn bản đi và Trích yếu nội dung.');
      return;
    }

    const docToSave: OutgoingDocument = {
      id: editingDoc.id || 'vbdi-' + Date.now(),
      documentNumber: editingDoc.documentNumber.trim(),
      releaseDate: editingDoc.releaseDate || new Date().toISOString().split('T')[0],
      docType: editingDoc.docType || 'Công văn',
      recipient: editingDoc.recipient || 'Ủy Ban Nhân Dân',
      summary: editingDoc.summary.trim(),
      content: editingDoc.content || '',
      drafterId: editingDoc.drafterId || currentUser?.id || '',
      signerId: editingDoc.signerId || currentUser?.id || '',
      status: (editingDoc.status as OutgoingDocStatus) || 'DRAFT',
      dossierId: editingDoc.dossierId || undefined,
      replyToDocId: editingDoc.replyToDocId || undefined,
      attachments: editingDoc.attachments || [],
      createdById: editingDoc.createdById || currentUser?.id || '',
      createdAt: editingDoc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveDoc(docToSave);
    setIsModalOpen(false);
    setEditingDoc(null);

    if (selectedDoc && selectedDoc.id === docToSave.id) {
      setSelectedDoc(docToSave);
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
          content: result.draftContent,
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

  const handleDownloadFile = (file: AttachmentFile) => {
    if (!file.fileUrl) return;
    const a = document.createElement('a');
    a.href = file.fileUrl;
    a.download = file.fileName || 'van-ban-di';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getFileIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'docx':
      case 'doc':
        return <FileCode className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return <ImageIcon className="w-4 h-4 text-purple-500 shrink-0" />;
      default:
        return <File className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    if (bytes < k * k) return (bytes / k).toFixed(1) + ' KB';
    return (bytes / (k * k)).toFixed(2) + ' MB';
  };

  const getStatusBadge = (status: OutgoingDocStatus) => {
    switch (status) {
      case 'ISSUED':
      case 'SENT':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] border border-emerald-200">
            ĐÃ PHÁT HÀNH
          </span>
        );
      case 'SIGNED':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] border border-indigo-200">
            ĐÃ KÝ DUYỆT
          </span>
        );
      case 'REVIEWING':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] border border-purple-200">
            CHỜ DUYỆT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200">
            DỰ THẢO
          </span>
        );
    }
  };

  return (
    <div className="w-full p-6 md:p-8 flex flex-col gap-6 flex-1">
      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Quản Lý Văn Bản Đi & Phát Hành</h1>
            <span className="bg-emerald-100 text-emerald-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200">
              {filteredDocs.length} văn bản
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi dự thảo phát hành, người ký duyệt và phân quyền tiếp cận nghiệp vụ
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Super user scope switcher */}
          {isSuperUser && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <span className="text-[10px] text-slate-500 font-bold px-2 uppercase">Phạm vi:</span>
              <button
                onClick={() => setDocScope('MY')}
                className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  docScope === 'MY'
                    ? 'bg-white text-indigo-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Văn bản của tôi
              </button>
              <button
                onClick={() => setDocScope('ALL')}
                className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  docScope === 'ALL'
                    ? 'bg-white text-indigo-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toàn cơ quan ({docs.length})
              </button>
            </div>
          )}

          {!isSuperUser && (
            <div className="text-[11px] font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Chỉ hiển thị văn bản đi bạn soạn thảo hoặc ký duyệt</span>
            </div>
          )}

          <button
            onClick={() => {
              handleOpenAddModal();
              setShowAiDraftModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Soạn Thảo Văn Bản</span>
          </button>

          <button
            id="add-outgoing-doc-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Mới Văn Bản Đi</span>
          </button>
        </div>
      </div>

      {/* Role Sub-filters for personalized involvement */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 bg-emerald-50/70 p-1 rounded-xl border border-emerald-100 text-xs">
          <span className="text-[11px] font-bold text-emerald-900 px-2">Nhiệm vụ văn bản:</span>
          <button
            onClick={() => setMyRoleFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              myRoleFilter === 'ALL' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Tất cả ({accessibleDocs.length})
          </button>
          <button
            onClick={() => setMyRoleFilter('DRAFTED')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              myRoleFilter === 'DRAFTED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Tôi soạn thảo ({accessibleDocs.filter((d) => d.drafterId === currentUser?.id || d.createdById === currentUser?.id).length})
          </button>
          <button
            onClick={() => setMyRoleFilter('SIGNER')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              myRoleFilter === 'SIGNER' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            Tôi ký duyệt ({accessibleDocs.filter((d) => d.signerId === currentUser?.id).length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm số đi, trích yếu, cơ quan nhận..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 outline-none cursor-pointer"
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
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 outline-none cursor-pointer"
        >
          <option value="ALL">Tất cả loại văn bản</option>
          <option value="Công văn">Công văn</option>
          <option value="Tờ trình">Tờ trình</option>
          <option value="Báo cáo">Báo cáo</option>
          <option value="Thông báo">Thông báo</option>
          <option value="Quyết định">Quyết định</option>
          <option value="Kế hoạch">Kế hoạch</option>
        </select>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Số văn bản đi</th>
                <th className="px-4 py-3.5">Ngày phát hành</th>
                <th className="px-4 py-3.5">Loại VB</th>
                <th className="px-5 py-3.5">Nơi nhận & Trích yếu nội dung</th>
                <th className="px-4 py-3.5">Tệp scan / File đính kèm</th>
                <th className="px-4 py-3.5">Soạn / Ký</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    Không có văn bản đi nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const drafter = getUser(doc.drafterId);
                  const signer = getUser(doc.signerId);
                  const dossier = getDossier(doc.dossierId);
                  const hasFiles = doc.attachments && doc.attachments.length > 0;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{doc.documentNumber}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {new Date(doc.releaseDate).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-indigo-100">
                          {doc.docType}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 max-w-xs md:max-w-md">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-bold text-slate-700">
                              Kính gửi: {doc.recipient}
                            </span>
                            {dossier && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                                {dossier.code}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-slate-800 line-clamp-2 leading-relaxed">
                            {doc.summary}
                          </p>
                        </div>
                      </td>

                      {/* Attachment / Scan preview */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {hasFiles ? (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-purple-200 flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              <span>{doc.attachments.length} tệp scan</span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewFile(doc.attachments[0]);
                                setIsPreviewOpen(true);
                              }}
                              className="p-1 hover:bg-purple-100 text-purple-700 rounded transition-colors cursor-pointer"
                              title="Xem bản scan"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Chưa có tệp</span>
                        )}
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
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleOpenEditModal(doc)}
                            title="Chỉnh sửa văn bản"
                            className="p-1.5 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetDoc(doc);
                            }}
                            title="Xóa văn bản"
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
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

      {/* Selected Outgoing Document Detail Drawer */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto custom-scrollbar">
            {!canAccessOutgoingDoc(selectedDoc, currentUser, dossiers) ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 my-auto">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-xs">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-2">
                  Quyền Riêng Tư & Thẩm Quyền Văn Bản Đi
                </h3>
                <p className="text-xs text-slate-600 max-w-md leading-relaxed mb-6">
                  Văn bản này do cán bộ khác soạn thảo hoặc thuộc hồ sơ nội bộ được phân quyền riêng. Bạn không thuộc danh sách người soạn thảo hoặc người có thẩm quyền ký duyệt văn bản này.
                </p>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Đóng chi tiết
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <Send className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-slate-800 text-base">Chi Tiết Văn Bản Đi</span>
                    </div>
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

              {/* Status and Numbers */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Số văn bản đi</span>
                  <span className="font-bold font-mono text-base text-slate-800">{selectedDoc.documentNumber}</span>
                  <span className="text-xs text-slate-500 block mt-0.5">Ngày phát hành: {selectedDoc.releaseDate}</span>
                </div>
                <div>{getStatusBadge(selectedDoc.status)}</div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Cơ quan / Nơi nhận</span>
                  <span className="font-bold text-slate-800">{selectedDoc.recipient}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Loại văn bản</span>
                  <span className="font-bold text-indigo-700">{selectedDoc.docType}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Cán bộ soạn thảo</span>
                  <span className="font-semibold text-slate-700">{getUser(selectedDoc.drafterId)?.fullName || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Lãnh đạo ký duyệt</span>
                  <span className="font-semibold text-slate-700">{getUser(selectedDoc.signerId)?.fullName || '—'}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                  Trích yếu nội dung văn bản
                </span>
                <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-line">
                  {selectedDoc.summary}
                </p>
              </div>

              {/* Content / Full Text if available */}
              {selectedDoc.content && (
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    Nội dung chi tiết / Dự thảo văn bản
                  </span>
                  <div className="p-3 bg-slate-50 rounded-lg text-xs font-serif text-slate-800 max-h-48 overflow-y-auto whitespace-pre-line leading-relaxed custom-scrollbar">
                    {selectedDoc.content}
                  </div>
                </div>
              )}

              {/* Scanned Attachments List & Quick Upload */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-slate-800 text-xs">
                      Tệp Scan / Văn bản đính kèm ({selectedDoc.attachments?.length || 0})
                    </span>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={quickFileInputRef}
                      onChange={(e) => handleQuickUploadFromDetail(e.target.files)}
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                    />
                    <button
                      onClick={() => quickFileInputRef.current?.click()}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>+ Đính kèm file scan</span>
                    </button>
                  </div>
                </div>

                {selectedDoc.attachments && selectedDoc.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDoc.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-purple-50/50 rounded-xl border border-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {getFileIcon(file.fileType)}
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">{file.fileName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {formatFileSize(file.fileSize)} &bull; {new Date(file.uploadedAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setPreviewFile(file);
                              setIsPreviewOpen(true);
                            }}
                            className="p-1.5 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors cursor-pointer"
                            title="Xem bản scan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadFile(file)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Tải về máy tính"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-[11px] text-slate-400">Chưa có bản scan nào đính kèm cho văn bản này</p>
                    <button
                      onClick={() => quickFileInputRef.current?.click()}
                      className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Nhấn để tải lên bản scan PDF từ máy tính
                    </button>
                  </div>
                )}
              </div>

              {/* WORKFLOW STEPPER & ACTION PANELS */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Quy Trình Xử Lý & Phát Hành Văn Bản Đi
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Theo NĐ 30/2020/NĐ-CP</span>
                </div>

                {/* 4-Step Stepper */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 ${
                    selectedDoc.status === 'DRAFT'
                      ? 'bg-slate-800 text-white border-slate-900 ring-2 ring-slate-400/40'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    <span>1. Dự thảo</span>
                    <span className="text-[9px] font-normal opacity-80">Chuyên viên soạn</span>
                  </div>

                  <div className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 ${
                    selectedDoc.status === 'REVIEWING'
                      ? 'bg-purple-600 text-white border-purple-700 ring-2 ring-purple-400/40 animate-pulse'
                      : selectedDoc.status === 'SIGNED' || selectedDoc.status === 'ISSUED' || selectedDoc.status === 'SENT'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                    <span>2. Trình ký</span>
                    <span className="text-[9px] font-normal opacity-80">Chờ Lãnh đạo</span>
                  </div>

                  <div className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 ${
                    selectedDoc.status === 'SIGNED'
                      ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-400/40 animate-pulse'
                      : selectedDoc.status === 'ISSUED' || selectedDoc.status === 'SENT'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                    <span>3. Ký số</span>
                    <span className="text-[9px] font-normal opacity-80">Lãnh đạo ký</span>
                  </div>

                  <div className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 ${
                    selectedDoc.status === 'ISSUED' || selectedDoc.status === 'SENT'
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/40'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                    <span>4. Phát hành</span>
                    <span className="text-[9px] font-normal opacity-80">Văn thư cấp số</span>
                  </div>
                </div>

                {/* ROLE SPECIFIC ACTION BANNERS */}

                {/* Step 1: DRAFT -> Chuyên viên Trình ký Lãnh đạo */}
                {selectedDoc.status === 'DRAFT' && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Văn bản đang ở mức Dự thảo</span>
                      <span className="text-[11px] text-slate-500">
                        Người ký được chỉ định: <strong>{getUser(selectedDoc.signerId)?.fullName || 'Lãnh đạo'}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = dbService.submitOutgoingDocForSign(selectedDoc.id, currentUser);
                        if (updated) {
                          setSelectedDoc(updated);
                          onSaveDoc(updated);
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Trình Ký Lãnh Đạo</span>
                    </button>
                  </div>
                )}

                {/* Step 2: REVIEWING -> Lãnh đạo Phê duyệt & Ký số */}
                {selectedDoc.status === 'REVIEWING' && (
                  <div className="bg-purple-50/80 border border-purple-200 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping"></span>
                        <span className="font-bold text-purple-950 text-xs">
                          Văn bản đang chờ Lãnh đạo phê duyệt & ký số
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-800 bg-purple-100 font-bold px-2 py-0.5 rounded-full">
                        Người ký: {getUser(selectedDoc.signerId)?.fullName}
                      </span>
                    </div>

                    {isLeaderOrAdmin(currentUser) || selectedDoc.signerId === currentUser?.id ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const note = prompt('Nhập ý kiến phê duyệt / xác nhận ký số điện tử:', 'Đã xem xét và đồng ý ký số duyệt ban hành.');
                            if (note !== null) {
                              const updated = dbService.signOutgoingDoc(selectedDoc.id, currentUser, note);
                              if (updated) {
                                setSelectedDoc(updated);
                                onSaveDoc(updated);
                              }
                            }
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Phê Duyệt & Ký Số Điện Tử</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt('Nhập lý do trả lại yêu cầu sửa đổi dự thảo:');
                            if (reason) {
                              const updated: OutgoingDocument = {
                                ...selectedDoc,
                                status: 'DRAFT',
                                summary: `${selectedDoc.summary} [Lãnh đạo yêu cầu sửa: ${reason}]`,
                                updatedAt: new Date().toISOString(),
                              };
                              dbService.saveOutgoingDoc(updated, currentUser);
                              setSelectedDoc(updated);
                              onSaveDoc(updated);
                            }
                          }}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Yêu cầu sửa dự thảo</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-purple-900 italic">
                        Dự thảo đã được gửi tới Lãnh đạo <strong>{getUser(selectedDoc.signerId)?.fullName}</strong>. Vui lòng chờ Thủ trưởng kiểm tra và ký số.
                      </p>
                    )}
                  </div>
                )}

                {/* Step 3: SIGNED -> Văn thư cấp số & phát hành */}
                {selectedDoc.status === 'SIGNED' && (
                  <div className="bg-indigo-50/80 border border-indigo-200 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-indigo-950 text-xs">
                          Văn bản đã được Lãnh đạo ký số &bull; Chờ Văn thư phát hành
                        </span>
                      </div>
                      {selectedDoc.signedAt && (
                        <span className="text-[10px] text-indigo-700 font-mono">
                          Ký lúc: {new Date(selectedDoc.signedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>

                    {isClerk(currentUser) || isLeaderOrAdmin(currentUser) ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-slate-600">
                          Văn thư kiểm tra thể thức, đóng dấu số và chuyển phát hành chính thức:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newNum = prompt('Nhập Số văn bản đi chính thức vào sổ:', selectedDoc.documentNumber);
                            if (newNum !== null) {
                              const updated = dbService.issueOutgoingDoc(selectedDoc.id, currentUser, newNum);
                              if (updated) {
                                setSelectedDoc(updated);
                                onSaveDoc(updated);
                              }
                            }
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Cấp Số, Đóng Dấu & Phát Hành Đi</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-indigo-900 italic">
                        Lãnh đạo đã ký số điện tử hoàn tất. Đang chuyển Văn thư cơ quan vào sổ, đóng dấu và phát hành văn bản.
                      </p>
                    )}
                  </div>
                )}

                {/* Step 4: ISSUED / SENT -> Đã phát hành chính thức */}
                {(selectedDoc.status === 'ISSUED' || selectedDoc.status === 'SENT') && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-emerald-950 block">
                        Văn bản đã phát hành chính thức đến nơi nhận
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        Nơi nhận: <strong>{selectedDoc.recipient}</strong> &bull; Số lưu: <strong>{selectedDoc.documentNumber}</strong>
                        {selectedDoc.issuedAt && ` &bull; Ngày: ${new Date(selectedDoc.issuedAt).toLocaleDateString('vi-VN')}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetDoc(selectedDoc);
                }}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa văn bản</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const doc = selectedDoc;
                  setSelectedDoc(null);
                  handleOpenEditModal(doc);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Chỉnh sửa văn bản</span>
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Outgoing Document Modal with Computer File Upload & Drag-Drop */}
      {isModalOpen && editingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {editingDoc.id?.startsWith('vbdi-') && !docs.some((d) => d.id === editingDoc.id)
                      ? 'Soạn Thảo & Phát Hành Văn Bản Đi Mới'
                      : `Cập Nhật Văn Bản Đi: ${editingDoc.documentNumber}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Hỗ trợ quét scan PDF từ máy tính và lưu trữ đồng bộ vào MySQL
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar">
              {/* AI Draft Assist Banner */}
              <div className="bg-linear-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-purple-900 text-xs">
                      Trợ Lý AI Soạn Thảo Văn Bản Chuẩn Nghị Định 30/2020/NĐ-CP
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiDraftModal(!showAiDraftModal)}
                    className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    {showAiDraftModal ? 'Thu gọn AI' : 'Mở trợ lý AI'}
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
                          placeholder="VD: Phê duyệt kinh phí chuyển đổi số năm 2025"
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
                        placeholder="VD: Nêu căn cứ Quyết định 06, đề xuất cấp máy quét và máy chủ, dự toán 500tr"
                        className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs"
                      />
                    </div>

                    {aiDraftError && <p className="text-[11px] text-rose-600">{aiDraftError}</p>}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateAIDraft}
                        disabled={isAiDrafting}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isAiDrafting ? 'AI đang soạn thảo văn bản...' : 'Tạo dự thảo văn bản'}</span>
                      </button>

                      {generatedDraft && (
                        <button
                          type="button"
                          onClick={handleCopyDraft}
                          className="px-3 py-2 bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Đã sao chép' : 'Sao chép dự thảo'}</span>
                        </button>
                      )}
                    </div>

                    {generatedDraft && (
                      <div className="p-3 bg-white border border-purple-200 rounded-lg max-h-40 overflow-y-auto text-xs whitespace-pre-line font-serif text-slate-800 leading-relaxed custom-scrollbar">
                        {generatedDraft}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Document Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số văn bản đi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDoc.documentNumber || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, documentNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại văn bản</label>
                  <select
                    value={editingDoc.docType || docTypeList[0] || 'Công văn'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, docType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer font-medium"
                  >
                    {editingDoc.docType && !docTypeList.includes(editingDoc.docType) && (
                      <option value={editingDoc.docType}>{editingDoc.docType}</option>
                    )}
                    {docTypeList.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày phát hành</label>
                  <input
                    type="date"
                    value={editingDoc.releaseDate || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, releaseDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Đơn vị / Cơ quan nhận văn bản <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold">Gợi ý từ danh mục dùng chung</span>
                </div>
                <input
                  type="text"
                  required
                  list="outgoing-recipient-list"
                  value={editingDoc.recipient || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, recipient: e.target.value })}
                  placeholder="Chọn từ danh mục cơ quan hoặc gõ tên người nhận..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
                <datalist id="outgoing-recipient-list">
                  {recipientList.map((rec, idx) => (
                    <option key={`rec-${idx}`} value={rec} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Trích yếu nội dung văn bản <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={editingDoc.summary || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, summary: e.target.value })}
                  placeholder="Nhập tóm tắt nội dung văn bản phát hành..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Upload Scan / PDF Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800 text-xs">
                      Tải lên bản quét (Scan) / Tệp đính kèm từ máy tính
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Lưu trữ trực tiếp MySQL</span>
                </div>

                {/* Drag and Drop Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFilesUpload(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFilesUpload(e.target.files)}
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="font-bold text-slate-700 text-xs">
                      Kéo & thả file scan vào đây hoặc <span className="text-indigo-600 underline">chọn từ máy tính</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Hỗ trợ tệp PDF bản scan, hình ảnh (.png, .jpg), văn bản Word (.docx), Excel (.xlsx)
                    </p>
                  </div>
                </div>

                {/* Attached files list in form */}
                {editingDoc.attachments && editingDoc.attachments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Danh sách file scan đã chọn ({editingDoc.attachments.length}):
                    </span>
                    {editingDoc.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {getFileIcon(file.fileType)}
                          <span className="font-bold text-slate-800 text-xs truncate">{file.fileName}</span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            ({formatFileSize(file.fileSize)})
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewFile(file);
                              setIsPreviewOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                            title="Xem thử"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(file.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Xóa tệp"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Signers & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cán bộ soạn thảo</label>
                  <select
                    value={editingDoc.drafterId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, drafterId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.position || u.role || 'Chuyên viên'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lãnh đạo ký duyệt</label>
                  <select
                    value={editingDoc.signerId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, signerId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer font-bold"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role || 'LEADER'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái văn bản</label>
                  {isLeaderOrAdmin(currentUser) || isClerk(currentUser) ? (
                    <select
                      value={editingDoc.status || 'DRAFT'}
                      onChange={(e) => setEditingDoc({ ...editingDoc, status: e.target.value as OutgoingDocStatus })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <option value="DRAFT">Dự thảo</option>
                      <option value="REVIEWING">Chờ duyệt ký</option>
                      <option value="SIGNED">Đã ký duyệt (Lãnh đạo)</option>
                      <option value="ISSUED">Đã phát hành (Văn thư)</option>
                      <option value="SENT">Đã gửi đi</option>
                    </select>
                  ) : (
                    <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                      <span>{editingDoc.status === 'ISSUED' || editingDoc.status === 'SENT' ? 'Đã phát hành' : editingDoc.status === 'SIGNED' ? 'Đã ký số' : editingDoc.status === 'REVIEWING' ? 'Chờ duyệt ký' : 'Dự thảo'}</span>
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                        * Nhân viên soạn thảo văn bản ở mức "Dự thảo". Lãnh đạo ký số và Văn thư cấp số phát hành.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Link Dossier & Reply */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gắn vào Mã Hồ Sơ</label>
                  <select
                    value={editingDoc.dossierId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, dossierId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer"
                  >
                    <option value="">-- Không gắn hồ sơ --</option>
                    {dossiers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.title.slice(0, 35)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trả lời cho Văn bản đến</label>
                  <select
                    value={editingDoc.replyToDocId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, replyToDocId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer"
                  >
                    <option value="">-- Không trả lời văn bản nào --</option>
                    {incomingDocs.map((inDoc) => (
                      <option key={inDoc.id} value={inDoc.id}>
                        Số {inDoc.documentNumber} - {inDoc.summary.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Lưu & Phát Hành Vào MySQL</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (100% Reliable in iFrames) */}
      {deleteTargetDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa văn bản đi</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Đồng chí có chắc chắn muốn xóa văn bản này khỏi Sổ Văn bản Đi? Toàn bộ tệp đính kèm cũng sẽ bị gỡ bỏ.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-medium">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Số văn bản đi:</span>
                <span className="font-bold text-emerald-700 font-mono">{deleteTargetDoc.documentNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nơi nhận:</span>
                <span className="font-bold text-slate-800">{deleteTargetDoc.recipient}</span>
              </div>
              <div className="pt-1 border-t border-slate-200/80">
                <span className="text-slate-400 block text-[11px] mb-0.5">Trích yếu:</span>
                <p className="text-slate-800 line-clamp-2 text-[11px]">{deleteTargetDoc.summary}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetDoc(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = deleteTargetDoc.id;
                  const targetNum = deleteTargetDoc.documentNumber;
                  onDeleteDoc(targetId);
                  if (selectedDoc?.id === targetId) {
                    setSelectedDoc(null);
                  }
                  setDeleteTargetDoc(null);
                  setDeleteToastMessage(`Đã xóa thành công văn bản đi số [${targetNum}].`);
                  setTimeout(() => setDeleteToastMessage(null), 3500);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {deleteToastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-4">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{deleteToastMessage}</span>
        </div>
      )}
    </div>
  );
};
