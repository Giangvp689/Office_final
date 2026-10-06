import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  IncomingDocument,
  User,
  Dossier,
  AttachmentFile,
  UrgencyLevel,
  SecurityLevel,
  IncomingDocStatus,
  Task,
  MasterData,
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  CheckSquare,
  Upload,
  Eye,
  Download,
  FileCode,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  FileCheck,
  Scan,
  Lock,
  Mail,
} from 'lucide-react';
import { summarizeDocumentWithAI, classifyDocumentWithAI } from '../services/aiService';
import { extractTextFromFile } from '../utils/fileExtractor';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { SamplePdfModal } from '../components/SamplePdfModal';
import { EmailReceiverModal } from '../components/EmailReceiverModal';
import { canAccessIncomingDoc, isLeaderOrAdmin, isClerk, canRegisterIncomingDoc, canDirectIncomingDoc, getAssignableStaffUsers } from '../utils/permission';
import { dbService } from '../services/db';

interface IncomingDocsViewProps {
  docs: IncomingDocument[];
  tasks?: Task[];
  users: User[];
  dossiers: Dossier[];
  onSaveDoc: (doc: IncomingDocument) => void;
  onDeleteDoc: (id: string) => void;
  onCreateTaskFromDoc: (doc: IncomingDocument) => void;
  onDraftOutgoingDoc?: (doc: IncomingDocument) => void;
  currentUser: User;
  onOpenDossier: (dossierId: string) => void;
  onOpenTaskDetail?: (taskId: string) => void;
  initialSelectedDocId?: string;
  masterData?: MasterData;
}

export const IncomingDocsView: React.FC<IncomingDocsViewProps> = ({
  docs,
  tasks = [],
  users,
  dossiers,
  onSaveDoc,
  onDeleteDoc,
  onCreateTaskFromDoc,
  onDraftOutgoingDoc,
  currentUser,
  onOpenDossier,
  onOpenTaskDetail,
  initialSelectedDocId,
  masterData,
}) => {
  const [search, setSearch] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDossier, setFilterDossier] = useState<string>('ALL');

  const isSuperUser = isLeaderOrAdmin(currentUser) || isClerk(currentUser);
  const [docScope, setDocScope] = useState<'MY' | 'ALL'>(isSuperUser ? 'ALL' : 'MY');
  const [myRoleFilter, setMyRoleFilter] = useState<'ALL' | 'PRIMARY' | 'COOPERATE'>('ALL');

  const [selectedDoc, setSelectedDoc] = useState<IncomingDocument | null>(null);

  // Leader Directive & Direct Assignment State (Nghị định 30/2020/NĐ-CP)
  const [isDirectingOpen, setIsDirectingOpen] = useState(false);
  const [leaderDirectiveText, setLeaderDirectiveText] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [selectedCoAssigneeIds, setSelectedCoAssigneeIds] = useState<string[]>([]);
  const [selectedDueDate, setSelectedDueDate] = useState('');
  const [selectedDossierId, setSelectedDossierId] = useState('');
  const [assignmentNotice, setAssignmentNotice] = useState<string | null>(null);
  const [newlyAssignedTask, setNewlyAssignedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (selectedDoc) {
      setLeaderDirectiveText(selectedDoc.leaderDirective || '');
      setSelectedAssigneeId(selectedDoc.assigneeId || '');
      setSelectedCoAssigneeIds(selectedDoc.coAssigneeIds || []);
      setSelectedDueDate(selectedDoc.dueDate || '');
      setSelectedDossierId(selectedDoc.dossierId || (dossiers[0]?.id || ''));
      setIsDirectingOpen(selectedDoc.status === 'PENDING_ASSIGN');
      setAssignmentNotice(null);
      setNewlyAssignedTask(null);
    }
  }, [selectedDoc, dossiers]);

  const handleConfirmLeaderDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !selectedAssigneeId || !leaderDirectiveText.trim()) {
      alert('Vui lòng nhập đầy đủ ý kiến chỉ đạo và chọn cán bộ chủ trì xử lý.');
      return;
    }
    const chosenAssignee = users.find((u) => u.id === selectedAssigneeId);
    if (chosenAssignee && (chosenAssignee.role === 'LEADER' || chosenAssignee.role === 'ADMIN')) {
      alert('⚠️ Quy chế hành chính: Lãnh đạo chỉ giao việc cho Chuyên viên (STAFF) hoặc Văn thư (CLERK), không giao việc cho Lãnh đạo.');
      return;
    }
    const result = dbService.leaderAssignIncomingDoc(selectedDoc.id, currentUser, {
      assigneeId: selectedAssigneeId,
      coAssigneeIds: selectedCoAssigneeIds,
      dueDate: selectedDueDate || selectedDoc.dueDate,
      directive: leaderDirectiveText.trim(),
      dossierId: selectedDossierId || selectedDoc.dossierId,
    });
    if (result) {
      setSelectedDoc(result.doc);
      onSaveDoc(result.doc);
      setIsDirectingOpen(false);
      setNewlyAssignedTask(result.task);
      setAssignmentNotice(`Đã phê duyệt bút phê chỉ đạo và khởi tạo nhiệm vụ [${result.task.code}] cho ${getUser(selectedAssigneeId)?.fullName || 'cán bộ'}!`);
    }
  };

  // Authority suggestions from masterData + existing docs
  const authorityList = useMemo(() => {
    const fromMaster = (masterData?.authorities || masterData?.issuingAuthorities || [])
      .map((a: any) => (typeof a === 'string' ? a : a.name))
      .filter(Boolean);
    const fromDocs = docs.map((d) => d.issuingAuthority).filter(Boolean);
    const combined = Array.from(new Set([...fromMaster, ...fromDocs]));
    return combined.length > 0
      ? combined
      : ['Ủy Ban Nhân Dân Tỉnh', 'Sở Tư Pháp', 'Sở Nội Vụ', 'Sở Kế Hoạch và Đầu Tư', 'Văn Phòng UBND'];
  }, [masterData, docs]);

  // Document types from masterData + standards
  const docTypeList = useMemo(() => {
    const fromMaster = (masterData?.docTypes || masterData?.documentTypes || [])
      .map((t: any) => (typeof t === 'string' ? t : t.name))
      .filter(Boolean);
    const defaultTypes = [
      'Công văn',
      'Đơn kiến nghị / Đơn thư',
      'Quyết định',
      'Tờ trình',
      'Thông báo',
      'Chỉ thị',
      'Kế hoạch',
      'Báo cáo',
      'Giấy mời',
    ];
    return Array.from(new Set([...fromMaster, ...defaultTypes]));
  }, [masterData]);

  // Accessible docs list based on permissions
  const accessibleDocs = useMemo(() => {
    if (isSuperUser && docScope === 'ALL') {
      return docs;
    }
    return docs.filter((d) => canAccessIncomingDoc(d, currentUser, tasks));
  }, [docs, isSuperUser, docScope, currentUser, tasks]);

  // Cán bộ Chuyên viên & Văn thư đủ điều kiện nhận nhiệm vụ (Loại trừ toàn bộ Lãnh đạo & Quản trị viên)
  const assignableStaffList = useMemo(() => getAssignableStaffUsers(users, currentUser), [users, currentUser]);

  // Auto open document if navigated from notification
  useEffect(() => {
    if (initialSelectedDocId) {
      const target = docs.find(
        (d) => d.id === initialSelectedDocId || d.documentNumber === initialSelectedDocId
      );
      if (target) {
        setSelectedDoc(target);
        setSearch('');
        setFilterUrgency('ALL');
        setFilterStatus('ALL');
        setFilterDossier('ALL');
      }
    }
  }, [initialSelectedDocId, docs]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<IncomingDocument> | null>(null);

  // File attachments state inside form
  const [formAttachments, setFormAttachments] = useState<AttachmentFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<AttachmentFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // AI Summarizer State inside modal
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [rawTextToAnalyze, setRawTextToAnalyze] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [isSamplePdfModalOpen, setIsSamplePdfModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSuccessToast, setEmailSuccessToast] = useState<string | null>(null);

  // In-App Deletion Confirmation & Toast
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<IncomingDocument | null>(null);
  const [deleteToastMessage, setDeleteToastMessage] = useState<string | null>(null);

  const handleSelectSamplePdfForModal = async (file: File) => {
    setIsExtractingFile(true);
    setAiError(null);
    setShowAiInput(true);
    try {
      const res = await extractTextFromFile(file);
      if (res.text) {
        setRawTextToAnalyze(res.text);
      }
      if (res.documentNumber || res.issuingAuthority || res.summary) {
        setEditingDoc((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            officialNumber: res.documentNumber || prev.officialNumber,
            issuingAuthority: res.issuingAuthority || prev.issuingAuthority,
            signer: res.signer || prev.signer,
            signerPosition: res.signerPosition || prev.signerPosition,
            issueDate: res.issueDate || prev.issueDate,
            summary: res.summary || res.title || prev.summary,
          };
        });
      }
      if (!res.success && res.error) {
        setAiError(res.error);
      }
    } catch (err: any) {
      setAiError(`Lỗi đọc tệp: ${err.message || 'Không thể trích xuất'}`);
    } finally {
      setIsExtractingFile(false);
    }
  };

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id);

  const filteredDocs = accessibleDocs.filter((doc) => {
    if (myRoleFilter === 'PRIMARY' && doc.assigneeId !== currentUser?.id) {
      return false;
    }
    if (myRoleFilter === 'COOPERATE' && !doc.coAssigneeIds?.includes(currentUser?.id || '')) {
      return false;
    }

    const matchSearch =
      doc.documentNumber.toLowerCase().includes(search.toLowerCase()) ||
      (doc.officialNumber && doc.officialNumber.toLowerCase().includes(search.toLowerCase())) ||
      doc.summary.toLowerCase().includes(search.toLowerCase()) ||
      doc.issuingAuthority.toLowerCase().includes(search.toLowerCase());

    const matchUrgency = filterUrgency === 'ALL' || doc.urgency === filterUrgency;
    const matchStatus = filterStatus === 'ALL' || doc.status === filterStatus;
    const matchDossier = filterDossier === 'ALL' || doc.dossierId === filterDossier;

    return matchSearch && matchUrgency && matchStatus && matchDossier;
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10);

  // Reset page to 1 whenever filters or pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterUrgency, filterStatus, filterDossier, pageSize]);

  const totalItems = filteredDocs.length;
  const effectivePageSize = pageSize === 'ALL' ? (totalItems > 0 ? totalItems : 1) : pageSize;
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedDocs = pageSize === 'ALL'
    ? filteredDocs
    : filteredDocs.slice((safeCurrentPage - 1) * effectivePageSize, safeCurrentPage * effectivePageSize);

  const handleOpenAddModal = () => {
    const newDocId = 'vbd-' + Date.now();
    setEditingDoc({
      id: newDocId,
      documentNumber: `${docs.length + 145}/VP-DV`,
      officialNumber: '',
      receivedDate: new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
      issuingAuthority: 'Ủy Ban Nhân Dân Tỉnh',
      summary: '',
      docType: 'Công văn',
      urgency: 'THUONG',
      securityLevel: 'THUONG',
      assigneeId: currentUser?.id || '',
      coAssigneeIds: [],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'PROCESSING',
      resultSummary: '',
      dossierId: dossiers[0]?.id || '',
      attachments: [],
      linkedTaskIds: [],
      createdById: currentUser?.id || '',
    });
    setFormAttachments([]);
    setRawTextToAnalyze('');
    setAiError(null);
    setShowAiInput(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (doc: IncomingDocument) => {
    setEditingDoc({ ...doc });
    setFormAttachments([...(doc.attachments || [])]);
    setRawTextToAnalyze('');
    setAiError(null);
    setShowAiInput(false);
    setIsModalOpen(true);
  };

  // Process files from file input or drag-and-drop
  const processUploadedFiles = (files: FileList | null, isQuickUpload = false) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
      const reader = new FileReader();

      reader.onload = (e) => {
        const fileUrl = (e.target?.result as string) || '';
        const newAttachment: AttachmentFile = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          fileName: file.name,
          fileSize: file.size,
          fileType: extension,
          fileUrl,
          category: 'VAN_BAN_DEN',
          relatedId: editingDoc?.id || selectedDoc?.id || '',
          dossierId: editingDoc?.dossierId || selectedDoc?.dossierId || undefined,
          uploadedById: currentUser?.id || '',
          uploadedByName: currentUser?.fullName || 'Người dùng',
          uploadedAt: new Date().toISOString(),
          tags: ['Văn bản đến', extension.toUpperCase()],
        };

        if (isQuickUpload && selectedDoc) {
          // Immediately attach to selectedDoc and save to MySQL
          const updatedAttachments = [...(selectedDoc.attachments || []), newAttachment];
          const updatedDoc = { ...selectedDoc, attachments: updatedAttachments };
          setSelectedDoc(updatedDoc);
          onSaveDoc(updatedDoc);
        } else {
          // Add to form state
          setFormAttachments((prev) => [...prev, newAttachment]);
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processUploadedFiles(e.target.files, false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleQuickFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processUploadedFiles(e.target.files, true);
    if (quickFileInputRef.current) quickFileInputRef.current.value = '';
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processUploadedFiles(e.dataTransfer.files, false);
    }
  };

  const handleRemoveFormAttachment = (id?: string) => {
    setFormAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleRemoveDetailAttachment = (id?: string) => {
    if (!selectedDoc || !id) return;
    const updatedAttachments = (selectedDoc.attachments || []).filter((a) => a.id !== id);
    const updatedDoc = { ...selectedDoc, attachments: updatedAttachments };
    setSelectedDoc(updatedDoc);
    onSaveDoc(updatedDoc);
    setDeleteToastMessage('Đã xóa tệp đính kèm khỏi văn bản.');
    setTimeout(() => setDeleteToastMessage(null), 3000);
  };

  const handleOpenPreview = (file: AttachmentFile) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const handleDownloadFile = (file: AttachmentFile) => {
    if (!file.fileUrl) return;
    const a = document.createElement('a');
    a.href = file.fileUrl;
    a.download = file.fileName || 'van-ban';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editingDoc.documentNumber || !editingDoc.summary) return;

    const finalDoc: IncomingDocument = {
      ...(editingDoc as IncomingDocument),
      attachments: formAttachments,
    };

    onSaveDoc(finalDoc);
    setIsModalOpen(false);
    setEditingDoc(null);
    setFormAttachments([]);
    if (selectedDoc && selectedDoc.id === finalDoc.id) {
      setSelectedDoc(finalDoc);
    }
  };

  // Import Document from Official Email Inbox (Nghị định 30/2020/NĐ-CP)
  const handleImportFromEmail = (docData: Partial<IncomingDocument>, attachments: AttachmentFile[]) => {
    const newDocId = 'inc-em-' + Date.now();
    const newDoc: IncomingDocument = {
      id: newDocId,
      documentNumber: `${docs.length + 145}/VP-DV`,
      officialNumber: docData.officialNumber || '',
      receivedDate: docData.receivedDate || new Date().toISOString().split('T')[0],
      issueDate: docData.issueDate || new Date().toISOString().split('T')[0],
      issuingAuthority: docData.issuingAuthority || 'Cơ quan gửi qua Email',
      summary: docData.summary || 'Văn bản tiếp nhận qua thư điện tử công vụ',
      docType: docData.docType || 'Công văn',
      urgency: docData.urgency || 'THUONG',
      securityLevel: docData.securityLevel || 'THUONG',
      assigneeId: currentUser?.id || '',
      coAssigneeIds: [],
      dueDate: docData.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'PROCESSING',
      resultSummary: '',
      dossierId: dossiers[0]?.id || '',
      attachments: attachments || [],
      linkedTaskIds: [],
      receptionMethod: 'EMAIL',
      senderEmail: docData.senderEmail || '',
      emailSubject: docData.emailSubject || '',
      createdById: currentUser?.id || '',
    };
    onSaveDoc(newDoc);
    setSelectedDoc(newDoc);
    setIsEmailModalOpen(false);
    setEmailSuccessToast(
      `Đã tiếp nhận văn bản [${newDoc.documentNumber}] (${newDoc.officialNumber || 'Thư điện tử'}) từ Hộp thư công vụ vào Sổ văn bản đến thành công!`
    );
    setTimeout(() => setEmailSuccessToast(null), 5000);
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
      const departments = ['Phòng Kế hoạch - Tài chính', 'Phòng Tổ chức Cán bộ', 'Văn phòng Cơ quan', 'Phòng Kỹ thuật - Công nghệ', 'Phòng Pháp chế - Thanh tra'];
      const staffList = (users || []).map((u) => ({ id: u?.id || '', fullName: u?.fullName || 'Cán bộ', position: u?.position || u?.role || 'Chuyên viên', department: u?.department || '' }));

      const classResult = await classifyDocumentWithAI({
        title: editingDoc?.summary || '',
        text: rawTextToAnalyze || editingDoc?.summary || '',
        departments,
        availableStaff: staffList,
      });

      const matchedAssignee = users.find(
        (u) => u?.fullName?.toLowerCase().includes(classResult.dispatchRecommendation?.suggestedAssigneeName?.toLowerCase() || '')
      );

      const matchedDossier = dossiers.find(
        (d) => d.code === classResult.dispatchRecommendation?.suggestedDossierCode || d.title.toLowerCase().includes(classResult.primaryDomain.toLowerCase())
      );

      setEditingDoc((prev) => ({
        ...prev,
        documentNumber: classResult.extractedEntities.documentNumber || prev?.documentNumber || '',
        officialNumber: classResult.extractedEntities.officialNumber || prev?.officialNumber || '',
        issuingAuthority: classResult.extractedEntities.issuingAuthority || prev?.issuingAuthority || '',
        signer: classResult.extractedEntities.signer || prev?.signer || '',
        signerPosition: classResult.extractedEntities.signerPosition || prev?.signerPosition || '',
        issueDate: classResult.extractedEntities.issueDate || prev?.issueDate || '',
        summary: classResult.extractedEntities.summary || prev?.summary || '',
        docType: classResult.docType || prev?.docType,
        urgency: classResult.urgency || prev?.urgency || 'THUONG',
        securityLevel: classResult.securityLevel || prev?.securityLevel || 'THUONG',
        dueDate: classResult.dispatchRecommendation?.suggestedDueDate || prev?.dueDate || '',
        assigneeId: matchedAssignee?.id || prev?.assigneeId,
        dossierId: matchedDossier?.id || prev?.dossierId,
        resultSummary: classResult.dispatchRecommendation?.actionChecklist
          ? `[Phân loại: ${classResult.primaryDomain} (Độ tin cậy: ${classResult.confidenceScore.toFixed(1)}%)] Gợi ý xử lý: ${classResult.dispatchRecommendation.actionChecklist.join('; ')}`
          : prev?.resultSummary,
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
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">Hỏa tốc</span>;
      case 'THUONG_KHAN':
        return <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">Thượng khẩn</span>;
      case 'KHAN':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">Khẩn</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-full">Thường</span>;
    }
  };

  const getStatusBadge = (status: IncomingDocStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-emerald-200"><CheckCircle className="w-3 h-3" /> Đã xử lý</span>;
      case 'OVERDUE':
        return <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-rose-200"><AlertCircle className="w-3 h-3" /> Quá hạn</span>;
      case 'PROCESSING':
        return <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-blue-200"><Clock className="w-3 h-3" /> Đang xử lý</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2.5 py-0.5 rounded-lg">Chờ phân công</span>;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    if (bytes < k * k) return (bytes / k).toFixed(1) + ' KB';
    return (bytes / (k * k)).toFixed(2) + ' MB';
  };

  const renderFileIcon = (fileType?: string) => {
    const t = (fileType || '').toLowerCase();
    if (t === 'pdf') return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
    if (['png', 'jpg', 'jpeg', 'webp'].includes(t)) return <ImageIcon className="w-4 h-4 text-purple-500 shrink-0" />;
    if (['doc', 'docx'].includes(t)) return <FileCode className="w-4 h-4 text-blue-500 shrink-0" />;
    if (['xls', 'xlsx', 'csv'].includes(t)) return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
    return <File className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  return (
    <div className="w-full p-6 md:p-8 flex flex-col gap-6 flex-1">
      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sổ Quản Lý Văn Bản Đến</h1>
            <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-indigo-200">
              {filteredDocs.length} văn bản
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tiếp nhận văn bản từ người dân, cơ quan ban ngành; quét (scan) tệp PDF/ảnh đính kèm và phân công xử lý theo thẩm quyền
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
                Văn bản tôi xử lý
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
              <span>Chỉ hiển thị văn bản bạn được phân công xử lý</span>
            </div>
          )}

          {canRegisterIncomingDoc(currentUser) && (
            <button
              type="button"
              onClick={() => setIsEmailModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
              title="Tiếp nhận văn bản gửi qua hộp thư điện tử công vụ theo NĐ 30/2020/NĐ-CP"
            >
              <Mail className="w-4 h-4" />
              <span>Tiếp Nhận Qua Email</span>
            </button>
          )}
          {canRegisterIncomingDoc(currentUser) ? (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tiếp Nhận & Vào Sổ Đến</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100/90 text-slate-600 rounded-xl border border-slate-200 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Sổ Văn bản Đến do Văn thư quản lý</span>
            </div>
          )}
        </div>
      </div>

      {/* Email Reception Success Banner */}
      {emailSuccessToast && (
        <div className="bg-teal-50 border border-teal-200 text-teal-900 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />
            <div className="text-xs font-bold">{emailSuccessToast}</div>
          </div>
          <button
            onClick={() => setEmailSuccessToast(null)}
            className="text-teal-700 hover:text-teal-900 p-1 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Role Sub-filters for personalized assignment */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 bg-indigo-50/70 p-1 rounded-xl border border-indigo-100 text-xs">
          <span className="text-[11px] font-bold text-indigo-900 px-2">Vai trò xử lý:</span>
          <button
            onClick={() => setMyRoleFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              myRoleFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            Tất cả ({accessibleDocs.length})
          </button>
          <button
            onClick={() => setMyRoleFilter('PRIMARY')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              myRoleFilter === 'PRIMARY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Tôi chủ trì ({accessibleDocs.filter((d) => d.assigneeId === currentUser?.id).length})
          </button>
          <button
            onClick={() => setMyRoleFilter('COOPERATE')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              myRoleFilter === 'COOPERATE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            Tôi phối hợp ({accessibleDocs.filter((d) => d.coAssigneeIds?.includes(currentUser?.id || '')).length})
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo số đến, số ký hiệu, cơ quan ban hành, trích yếu..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả độ khẩn</option>
            <option value="HOA_TOC">Hỏa tốc</option>
            <option value="THUONG_KHAN">Thượng khẩn</option>
            <option value="KHAN">Khẩn</option>
            <option value="THUONG">Thường</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="COMPLETED">Đã xử lý</option>
            <option value="OVERDUE">Quá hạn</option>
            <option value="PENDING_ASSIGN">Chờ phân công</option>
          </select>

          <select
            value={filterDossier}
            onChange={(e) => setFilterDossier(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả hồ sơ vụ việc</option>
            {dossiers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.title.slice(0, 25)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[1000px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap">Số Đến / Loại VB</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Số Ký Hiệu & Cơ Quan Gửi</th>
                <th className="py-3.5 px-4 min-w-[260px]">Trích Yếu Nội Dung</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Ngày Đến / Hạn Xử Lý</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Cán Bộ Phụ Trách</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Bản Scan / Tệp</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Không tìm thấy văn bản đến phù hợp
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc) => {
                  const assignee = getUser(doc.assigneeId);
                  const attCount = doc.attachments?.length || 0;
                  const docLinkedTask = tasks.find(
                    (t) => t.incomingDocId === doc.id || t.linkedDocId === doc.id || doc.linkedTaskIds?.includes(t.id)
                  );

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Document Number & Type */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-indigo-700 font-mono text-xs group-hover:text-indigo-800">
                          {doc.documentNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {doc.docType || 'Công văn'}
                        </div>
                        <div className="mt-1">{getUrgencyBadge(doc.urgency)}</div>
                      </td>

                      {/* Official Number & Issuing Authority */}
                      <td className="py-3.5 px-4 align-top max-w-[180px]">
                        <div className="font-semibold text-slate-800">
                          {doc.issuingAuthority}
                        </div>
                        {doc.officialNumber && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                            Số gốc: {doc.officialNumber}
                          </div>
                        )}
                        {doc.issueDate && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Ký ngày: {doc.issueDate}
                          </div>
                        )}
                        {(doc.signer || doc.signerPosition) && (
                          <div className="text-[10px] text-indigo-700 font-medium mt-0.5 truncate" title={`Người ký: ${doc.signer} (${doc.signerPosition})`}>
                            Ký bởi: {doc.signer || doc.signerPosition}
                          </div>
                        )}
                        {doc.receptionMethod === 'EMAIL' && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 w-fit">
                            <Mail className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                            <span className="truncate max-w-[140px]">{doc.senderEmail || 'Email công vụ'}</span>
                          </div>
                        )}
                      </td>

                      {/* Summary */}
                      <td className="py-3.5 px-4 align-top max-w-[280px]">
                        <p className="text-slate-800 font-medium line-clamp-2 leading-relaxed">
                          {doc.summary}
                        </p>
                        {doc.dossierId && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              <FolderKanban className="w-3 h-3 text-indigo-500" />
                              {getDossier(doc.dossierId)?.code || 'Hồ sơ'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="text-slate-600 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Đến: {doc.receivedDate}</span>
                        </div>
                        <div className="text-rose-600 font-bold flex items-center gap-1 mt-1">
                          <Clock className="w-3.5 h-3.5 text-rose-500" />
                          <span>Hạn: {doc.dueDate}</span>
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4 align-top">
                        {assignee ? (
                          <div className="flex items-start gap-2">
                            <img
                              src={assignee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={assignee.fullName || 'User'}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                            />
                            <div className="truncate max-w-[130px]">
                              <span className="font-bold text-slate-700 block truncate">
                                {assignee.fullName || 'Cán bộ'}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {assignee.position || 'Chuyên viên'}
                              </span>
                              {docLinkedTask && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenTaskDetail?.(docLinkedTask.id);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 mt-1 cursor-pointer transition-colors"
                                  title={`Xem nhiệm vụ [${docLinkedTask.code}]: ${docLinkedTask.title}`}
                                >
                                  <CheckSquare className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                  <span>{docLinkedTask.code}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa giao</span>
                        )}
                      </td>

                      {/* Attachments / Scans */}
                      <td className="py-3.5 px-4 align-top">
                        {attCount > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-100">
                              <Paperclip className="w-3 h-3" />
                              {attCount} tệp scan
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Chưa đính kèm</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top">
                        {getStatusBadge(doc.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {docLinkedTask && onOpenTaskDetail && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenTaskDetail(docLinkedTask.id);
                              }}
                              className="p-1.5 rounded-lg text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition-colors cursor-pointer"
                              title={`Mở nhiệm vụ liên kết [${docLinkedTask.code}]`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(doc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Sửa văn bản & tệp scan"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetDoc(doc);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* Pagination & Count Control Bar */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              Hiển thị{' '}
              <strong className="text-slate-800">
                {totalItems === 0 ? 0 : (safeCurrentPage - 1) * (pageSize === 'ALL' ? totalItems : pageSize) + 1}
              </strong>{' '}
              -{' '}
              <strong className="text-slate-800">
                {pageSize === 'ALL' ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems)}
              </strong>{' '}
              trong tổng số <strong className="text-indigo-700 font-bold">{totalItems}</strong> văn bản đến
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Số dòng / trang:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-indigo-400"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value="ALL">Tất cả ({totalItems})</option>
              </select>
            </div>
          </div>

          {pageSize !== 'ALL' && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang đầu"
              >
                <ChevronsLeft className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      safeCurrentPage === pageNum
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang tiếp theo"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang cuối"
              >
                <ChevronsRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* View Detail Drawer / Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-end z-40 animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right duration-200">
            {!canAccessIncomingDoc(selectedDoc, currentUser, tasks) ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 my-auto">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-xs">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-2">
                  Quyền Riêng Tư & Phân Công Văn Bản
                </h3>
                <p className="text-xs text-slate-600 max-w-md leading-relaxed mb-6">
                  Văn bản này được giao cho cán bộ khác xử lý theo phân công nghiệp vụ. Tài khoản của bạn không nằm trong danh sách chủ trì, phối hợp hay người giao nhiệm vụ liên quan.
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
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {selectedDoc.documentNumber}
                      </span>
                      {getUrgencyBadge(selectedDoc.urgency)}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base mt-2">
                      {selectedDoc.summary}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

              {/* Status Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Cơ quan ban hành</span>
                  <span className="text-xs font-bold text-slate-800">{selectedDoc.issuingAuthority}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Số ký hiệu gốc</span>
                  <span className="text-xs font-mono font-bold text-slate-700">{selectedDoc.officialNumber || 'Chưa có'}</span>
                </div>
                {(selectedDoc.signer || selectedDoc.signerPosition) && (
                  <div className="col-span-2 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Người ký (Cơ quan gửi):</span>
                    <span className="font-bold text-slate-800">
                      {selectedDoc.signer || 'Lãnh đạo cơ quan ban hành'}
                      {selectedDoc.signerPosition ? ` (${selectedDoc.signerPosition})` : ''}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ngày tiếp nhận</span>
                  <span className="text-xs font-semibold text-slate-700">{selectedDoc.receivedDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Hạn giải quyết</span>
                  <span className="text-xs font-bold text-rose-600">{selectedDoc.dueDate}</span>
                </div>
                {selectedDoc.receptionMethod === 'EMAIL' && (
                  <div className="col-span-2 bg-teal-50/80 p-2.5 rounded-lg border border-teal-200/80 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                    <div className="text-[11px] text-teal-900 leading-snug">
                      <span className="font-bold">Tiếp nhận qua Hộp thư điện tử: </span>
                      <span className="font-mono">{selectedDoc.senderEmail || 'email.congvu@donvi.gov.vn'}</span>
                      {selectedDoc.emailSubject && (
                        <span className="block text-[10px] text-teal-700 italic mt-0.5">Tiêu đề: {selectedDoc.emailSubject}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* WORKFLOW STEPPER FOR INCOMING DOCUMENTS (NĐ 30/2020/NĐ-CP) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Quy Trình Tiếp Nhận & Điều Phối Văn Bản Đến
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Theo NĐ 30/2020/NĐ-CP</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 bg-emerald-50 text-emerald-800 border-emerald-200">
                    <span>1. Vào sổ đến</span>
                    <span className="text-[9px] font-normal opacity-80">Văn thư scan & số</span>
                  </div>

                  <div className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 ${
                    selectedDoc.status === 'PENDING_ASSIGN'
                      ? 'bg-purple-600 text-white border-purple-700 ring-2 ring-purple-400/40 animate-pulse'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    <span>2. Bút phê & Giao việc</span>
                    <span className="text-[9px] font-normal opacity-80">Lãnh đạo chỉ đạo</span>
                  </div>

                  <div className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 ${
                    selectedDoc.status === 'PROCESSING'
                      ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-400/40'
                      : selectedDoc.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                    <span>3. Thực thi</span>
                    <span className="text-[9px] font-normal opacity-80">Chuyên viên xử lý</span>
                  </div>

                  <div className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 ${
                    selectedDoc.status === 'COMPLETED'
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/40'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                    <span>4. Báo cáo / Trả lời</span>
                    <span className="text-[9px] font-normal opacity-80">Văn bản đi & Hồ sơ</span>
                  </div>
                </div>
              </div>

              {/* Assignment Notice Toast / Action Banner */}
              {assignmentNotice && (
                <div className="p-3.5 bg-emerald-50 text-emerald-950 border-2 border-emerald-300 rounded-2xl text-xs space-y-2 animate-in fade-in shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-emerald-900">
                      <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{assignmentNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentNotice(null);
                        setNewlyAssignedTask(null);
                      }}
                      className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  {newlyAssignedTask && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {onOpenTaskDetail && (
                        <button
                          type="button"
                          onClick={() => {
                            const tId = newlyAssignedTask.id;
                            setSelectedDoc(null);
                            onOpenTaskDetail(tId);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Mở bàn làm việc nhiệm vụ [{newlyAssignedTask.code}] &rarr;</span>
                        </button>
                      )}
                      {dbService.canSwitchUser() && newlyAssignedTask.assigneeId && (
                        <button
                          type="button"
                          onClick={() => {
                            const tId = newlyAssignedTask.id;
                            const staffId = newlyAssignedTask.assigneeId;
                            dbService.switchUser(staffId);
                            setSelectedDoc(null);
                            onOpenTaskDetail?.(tId);
                          }}
                          className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                          <span>Chuyển sang tài khoản {getUser(newlyAssignedTask.assigneeId)?.fullName} để kiểm tra thông báo &rarr;</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* LEADER DIRECTIVE & ASSIGNMENT PANEL */}
              {canDirectIncomingDoc(currentUser) && (isDirectingOpen || !selectedDoc.assigneeId) ? (
                <form onSubmit={handleConfirmLeaderDirective} className="bg-purple-50/90 border-2 border-purple-300 p-4 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-700" />
                      <span className="font-bold text-purple-950 text-xs uppercase tracking-wide">
                        LÃNH ĐẠO BÚT PHÊ CHỈ ĐẠO & GIAO VIỆC
                      </span>
                    </div>
                    {selectedDoc.assigneeId && (
                      <button
                        type="button"
                        onClick={() => setIsDirectingOpen(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        Đóng
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-purple-950 text-xs mb-1">
                      Ý kiến chỉ đạo của Lãnh đạo (Bút phê) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={leaderDirectiveText}
                      onChange={(e) => setLeaderDirectiveText(e.target.value)}
                      placeholder="Ghi rõ yêu cầu chỉ đạo: Giao đơn vị/cán bộ nào chủ trì, hướng xử lý, thời hạn tham mưu hoặc văn bản trả lời..."
                      className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-purple-400 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Chỉ định Cán bộ Chủ trì <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={selectedAssigneeId}
                        onChange={(e) => setSelectedAssigneeId(e.target.value)}
                        className="w-full p-2 bg-white border border-purple-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer outline-none"
                      >
                        <option value="">-- Chọn cán bộ chủ trì (Chuyên viên / Văn thư) --</option>
                        {assignableStaffList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.position || u.role} - {u.department || 'Phòng Chuyên Môn'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Hạn chót giải quyết <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={selectedDueDate}
                        onChange={(e) => setSelectedDueDate(e.target.value)}
                        className="w-full p-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-rose-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      Lưu trữ xuyên suốt vào Hồ Sơ Vụ Việc (Dossier)
                    </label>
                    <select
                      value={selectedDossierId}
                      onChange={(e) => setSelectedDossierId(e.target.value)}
                      className="w-full p-2 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-800 cursor-pointer outline-none"
                    >
                      <option value="">-- Chọn hoặc liên kết hồ sơ vụ việc --</option>
                      {dossiers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} - {d.title.slice(0, 40)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    {selectedDoc.assigneeId && (
                      <button
                        type="button"
                        onClick={() => setIsDirectingOpen(false)}
                        className="px-3 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Phê Duyệt Bút Phê & Tự Động Giao Việc (Tạo Task)</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Leader Directive Card (When already assigned or viewing as staff) */
                selectedDoc.leaderDirective && (
                  <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-amber-200/80">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                        <span className="font-bold text-amber-950 text-xs uppercase tracking-wide">
                          Bút Phê Chỉ Đạo Của Lãnh Đạo
                        </span>
                      </div>
                      {canDirectIncomingDoc(currentUser) && (
                        <button
                          type="button"
                          onClick={() => setIsDirectingOpen(true)}
                          className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                        >
                          Chỉnh sửa chỉ đạo / Giao lại
                        </button>
                      )}
                    </div>
                    <p className="text-xs font-serif font-medium text-slate-800 leading-relaxed italic bg-white/70 p-3 rounded-xl border border-amber-200/60">
                      &ldquo;{selectedDoc.leaderDirective}&rdquo;
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-amber-900 pt-1">
                      <span>Lãnh đạo chỉ đạo: <strong>{getUser(selectedDoc.leaderId)?.fullName || 'Thủ trưởng đơn vị'}</strong></span>
                      {selectedDoc.assignedAt && (
                        <span className="font-mono text-slate-500">
                          {new Date(selectedDoc.assignedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Assignee & Dossier Info */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    Cán bộ chủ trì xử lý
                  </span>
                  {selectedDoc.assigneeId ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={getUser(selectedDoc.assigneeId)?.avatar}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-bold text-slate-800 text-xs">
                          {getUser(selectedDoc.assigneeId)?.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {getUser(selectedDoc.assigneeId)?.position} &bull; {getUser(selectedDoc.assigneeId)?.email}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded text-xs font-semibold border border-amber-200">
                        Chờ Lãnh đạo cho ý kiến chỉ đạo & phân công
                      </span>
                      {canDirectIncomingDoc(currentUser) && (
                        <button
                          type="button"
                          onClick={() => setIsDirectingOpen(true)}
                          className="px-3 py-1 bg-purple-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Giao việc ngay
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {selectedDoc.dossierId && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Hồ sơ vụ việc liên kết
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
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Mở hồ sơ &rarr;
                    </button>
                  </div>
                )}
              </div>

              {/* LINKED TASKS & SPECIALIST EXECUTION SECTION */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-purple-600" />
                    <span>Nhiệm vụ phân công & Tiến độ chuyên viên ({tasks.filter((t) => t.incomingDocId === selectedDoc.id || t.linkedDocId === selectedDoc.id || selectedDoc.linkedTaskIds?.includes(t.id)).length})</span>
                  </span>
                  {selectedDoc.assigneeId && tasks.filter((t) => t.incomingDocId === selectedDoc.id || t.linkedDocId === selectedDoc.id || selectedDoc.linkedTaskIds?.includes(t.id)).length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetDoc = selectedDoc;
                        setSelectedDoc(null);
                        onCreateTaskFromDoc(targetDoc);
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Khởi tạo Task</span>
                    </button>
                  )}
                </div>

                {(() => {
                  const docTasks = tasks.filter(
                    (t) =>
                      t.incomingDocId === selectedDoc.id ||
                      t.linkedDocId === selectedDoc.id ||
                      selectedDoc.linkedTaskIds?.includes(t.id)
                  );

                  if (docTasks.length === 0) {
                    return (
                      <div className="p-3.5 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200 space-y-2 text-xs">
                        <p className="text-slate-500 font-medium">
                          {selectedDoc.status === 'PENDING_ASSIGN'
                            ? 'Văn bản đang Chờ Lãnh đạo cho ý kiến chỉ đạo và phân công Chuyên viên thực hiện.'
                            : selectedDoc.assigneeId
                            ? `Đã phân công cho cán bộ ${getUser(selectedDoc.assigneeId)?.fullName || 'chuyên viên'}, nhưng chưa mở bản ghi Nhiệm vụ (Task).`
                            : 'Chưa có nhiệm vụ nào được khởi tạo từ văn bản đến này.'}
                        </p>
                        {selectedDoc.assigneeId && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetDoc = selectedDoc;
                              setSelectedDoc(null);
                              onCreateTaskFromDoc(targetDoc);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Mở Bàn Làm Việc Nhiệm Vụ Cho {getUser(selectedDoc.assigneeId)?.fullName || 'Chuyên viên'}</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      {docTasks.map((task) => {
                        const staff = getUser(task.assigneeId);
                        return (
                          <div
                            key={task.id}
                            className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-2 hover:border-purple-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                                    {task.code}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    task.status === 'COMPLETED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : task.status === 'WAITING_APPROVAL'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-indigo-100 text-indigo-800'
                                  }`}>
                                    {task.status === 'COMPLETED'
                                      ? 'Đã nghiệm thu'
                                      : task.status === 'WAITING_APPROVAL'
                                      ? 'Chờ duyệt nghiệm thu'
                                      : 'Đang thực hiện'}
                                  </span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-xs mt-1.5 line-clamp-2">
                                  {task.title}
                                </h4>
                              </div>
                              <span className="text-xs font-bold text-purple-800 shrink-0 font-mono">
                                {task.progress}%
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-purple-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-purple-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>

                            {/* Assignee & Actions */}
                            <div className="flex items-center justify-between pt-1 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <span className="text-[10px] text-slate-400">Chủ trì:</span>
                                <span className="font-semibold text-slate-800">{staff?.fullName || 'Cán bộ'}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {onOpenTaskDetail && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDoc(null);
                                      onOpenTaskDetail(task.id);
                                    }}
                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Mở nhiệm vụ</span>
                                  </button>
                                )}
                                {dbService.canSwitchUser() && task.assigneeId && currentUser.id !== task.assigneeId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      dbService.switchUser(task.assigneeId);
                                      setSelectedDoc(null);
                                      onOpenTaskDetail?.(task.id);
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                    title={`Chuyển sang tài khoản ${staff?.fullName || 'chuyên viên'}`}
                                  >
                                    Đóng vai cán bộ
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Attachments / Scanned Files Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Scan className="w-4 h-4 text-indigo-600" />
                    <span>Tài liệu scan & File đính kèm ({selectedDoc.attachments?.length || 0})</span>
                  </span>

                  {/* Quick Upload Button */}
                  <div>
                    <input
                      type="file"
                      ref={quickFileInputRef}
                      onChange={handleQuickFileChange}
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => quickFileInputRef.current?.click()}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors border border-indigo-200"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>+ Đính kèm file scan</span>
                    </button>
                  </div>
                </div>

                {!selectedDoc.attachments || selectedDoc.attachments.length === 0 ? (
                  <div className="p-5 bg-slate-50 rounded-xl text-slate-400 text-center border border-dashed border-slate-200 space-y-2">
                    <Scan className="w-6 h-6 mx-auto text-slate-300" />
                    <p className="text-xs">Chưa có tệp scan hoặc văn bản đính kèm nào.</p>
                    <button
                      type="button"
                      onClick={() => quickFileInputRef.current?.click()}
                      className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Bấm vào đây để tải file PDF / ảnh scan từ máy tính
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDoc.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {renderFileIcon(file.fileType)}
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-800 truncate block text-xs group-hover:text-indigo-600">
                              {file.fileName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatFileSize(file.fileSize)} &bull; {file.fileType?.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenPreview(file)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Xem văn bản / scan"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Xem scan</span>
                          </button>

                          <button
                            onClick={() => handleDownloadFile(file)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                            title="Tải về máy"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleRemoveDetailAttachment(file.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
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
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3 mt-6">
              {/* Leader Directive Trigger */}
              {canDirectIncomingDoc(currentUser) && (
                <button
                  type="button"
                  onClick={() => setIsDirectingOpen(true)}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Bút phê & Giao việc</span>
                </button>
              )}

              {/* Staff: Draft Outgoing Doc Reply / Report */}
              {onDraftOutgoingDoc && (selectedDoc.assigneeId === currentUser.id || isLeaderOrAdmin(currentUser)) && (
                <button
                  type="button"
                  onClick={() => {
                    const doc = selectedDoc;
                    setSelectedDoc(null);
                    onDraftOutgoingDoc(doc);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>Soạn Dự Thảo VB Đi Trả Lời</span>
                </button>
              )}

              {/* Edit incoming doc metadata (Clerk or Leader) */}
              {(canRegisterIncomingDoc(currentUser) || isLeaderOrAdmin(currentUser)) && (
                <button
                  type="button"
                  onClick={() => {
                    const doc = selectedDoc;
                    setSelectedDoc(null);
                    handleOpenEditModal(doc);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Sửa thông tin
                </button>
              )}

              {(canRegisterIncomingDoc(currentUser) || isLeaderOrAdmin(currentUser)) && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTargetDoc(selectedDoc);
                  }}
                  className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-rose-200"
                  title="Xóa văn bản này"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa VB</span>
                </button>
              )}
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Incoming Doc Modal with Scan / PDF File Upload */}
      {isModalOpen && editingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {editingDoc.id?.startsWith('vbd-') && !docs.some((d) => d.id === editingDoc.id)
                      ? 'Tiếp Nhận Văn Bản Đến & Đính Kèm File Scan'
                      : `Cập Nhật Văn Bản Đến: ${editingDoc.documentNumber}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Hỗ trợ quét scan giấy tờ người dân nộp (PDF/Ảnh) lưu trực tiếp vào CSDL MySQL
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

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar">
              {/* AI Assistant Banner Helper */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3.5 rounded-xl border border-indigo-100 space-y-2">
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
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    {showAiInput ? 'Đóng hộp phân tích' : 'Dán văn bản để AI phân tích'}
                  </button>
                </div>

                {showAiInput && (
                  <div className="space-y-2 pt-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-600">Nội dung văn bản:</span>
                      <label className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>{isExtractingFile ? 'Đang quét OCR tệp...' : 'Tải tệp (.docx, PDF scan, Ảnh)'}</span>
                        <input
                          type="file"
                          className="hidden"
                          disabled={isExtractingFile}
                          accept=".docx,.doc,.txt,.pdf,.rtf,.md,.png,.jpg,.jpeg"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsExtractingFile(true);
                              setAiError(null);
                              try {
                                const res = await extractTextFromFile(file);
                                if (res.text) {
                                  setRawTextToAnalyze(res.text);
                                }
                                // Auto fill extracted entities if available from OCR
                                if (res.documentNumber || res.issuingAuthority || res.summary) {
                                  setEditingDoc((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      officialNumber: res.documentNumber || prev.officialNumber,
                                      issuingAuthority: res.issuingAuthority || prev.issuingAuthority,
                                      signer: res.signer || prev.signer,
                                      signerPosition: res.signerPosition || prev.signerPosition,
                                      issueDate: res.issueDate || prev.issueDate,
                                      summary: res.summary || res.title || prev.summary,
                                    };
                                  });
                                }
                                if (!res.success && res.error) {
                                  setAiError(res.error);
                                }
                              } catch (err: any) {
                                setAiError(`Lỗi đọc tệp: ${err.message || 'Không thể trích xuất'}`);
                              } finally {
                                setIsExtractingFile(false);
                                e.target.value = '';
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                    <textarea
                      value={rawTextToAnalyze}
                      onChange={(e) => setRawTextToAnalyze(e.target.value)}
                      placeholder="Dán toàn văn hoặc bấm 'Tải tệp (.docx, PDF scan, Ảnh)' để AI OCR & trích xuất tự động..."
                      rows={3}
                      className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-mono"
                    />
                    {aiError && <p className="text-[11px] text-rose-600 font-medium">{aiError}</p>}
                    <button
                      type="button"
                      onClick={handleRunAiAnalysis}
                      disabled={isAiLoading || isExtractingFile || !rawTextToAnalyze.trim()}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAiLoading ? 'AI đang phân tích...' : isExtractingFile ? 'Đang OCR quét tệp...' : 'Phân tích & Điền tự động'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Row 1: Document Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số ký hiệu cơ quan / người gửi
                  </label>
                  <input
                    type="text"
                    value={editingDoc.officialNumber || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, officialNumber: e.target.value })}
                    placeholder="VD: 450/QĐ-UBND hoặc Đơn kiến nghị"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Row 2: Authority & Doc Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      Cơ quan ban hành / Người gửi <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-indigo-600 font-semibold">Gợi ý từ danh mục</span>
                  </div>
                  <input
                    type="text"
                    required
                    list="incoming-authorities-list"
                    value={editingDoc.issuingAuthority || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, issuingAuthority: e.target.value })}
                    placeholder="Chọn từ danh mục hoặc gõ tên cơ quan / người gửi..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                  <datalist id="incoming-authorities-list">
                    {authorityList.map((auth, idx) => (
                      <option key={`auth-${idx}`} value={auth} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Người ký (Cơ quan gửi đến)
                    </label>
                    <input
                      type="text"
                      value={editingDoc.signer || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, signer: e.target.value })}
                      placeholder="VD: Trần Thanh Mẫn, Phạm Minh Chính..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Chức vụ người ký
                    </label>
                    <input
                      type="text"
                      value={editingDoc.signerPosition || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, signerPosition: e.target.value })}
                      placeholder="VD: Chủ tịch Quốc hội, Thủ tướng, Bộ trưởng..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Loại văn bản
                  </label>
                  <select
                    value={editingDoc.docType || docTypeList[0] || 'Công văn'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, docType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
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
              </div>

              {/* Summary */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Trích yếu nội dung văn bản <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={editingDoc.summary || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, summary: e.target.value })}
                  placeholder="Nhập tóm tắt nội dung chính của văn bản / đơn kiến nghị..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 font-medium"
                />
              </div>

              {/* SCAN & FILE UPLOAD SECTION (DRAG & DROP + BROWSE) */}
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Scan className="w-4 h-4 text-indigo-600" />
                    <span>Tải Lên Bản Quét (Scan) / File Đính Kèm Từ Máy Tính</span>
                  </label>
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    Đã chọn {formAttachments.length} tệp
                  </span>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDropFiles}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/60'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Nhấn vào đây để chọn file từ máy tính, hoặc kéo thả file vào khung
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Hỗ trợ tệp scan <strong className="text-rose-600">.PDF</strong>, hình ảnh quét <strong className="text-purple-600">.PNG, .JPG</strong>, văn bản <strong className="text-blue-600">.DOCX</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selected Files List */}
                {formAttachments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {formAttachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {renderFileIcon(file.fileType)}
                          <span className="font-semibold text-slate-800 truncate text-xs">
                            {file.fileName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            ({formatFileSize(file.fileSize)})
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(file)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                            title="Xem thử file"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormAttachment(file.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="Xóa khỏi danh sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 3: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ngày tiếp nhận
                  </label>
                  <input
                    type="date"
                    value={editingDoc.receivedDate || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, receivedDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-600"
                  />
                </div>
              </div>

              {/* Row 4: Urgency & Security & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ khẩn</label>
                  <select
                    value={editingDoc.urgency || 'THUONG'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, urgency: e.target.value as UrgencyLevel })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="THUONG">Thường</option>
                    <option value="MAT">Mật</option>
                    <option value="TOI_MAT">Tối mật</option>
                    <option value="TUYET_MAT">Tuyệt mật</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái xử lý</label>
                  <select
                    value={editingDoc.status || 'PROCESSING'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, status: e.target.value as IncomingDocStatus })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="PENDING_ASSIGN">Chờ phân công</option>
                    <option value="PROCESSING">Đang xử lý</option>
                    <option value="COMPLETED">Đã xử lý xong</option>
                    <option value="OVERDUE">Quá hạn</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Assignee & Dossier Binding */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cán bộ chuyên môn chủ trì xử lý (Loại trừ Văn thư)
                  </label>
                  <select
                    value={editingDoc.assigneeId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, assigneeId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <option value="">-- Chọn cán bộ chuyên môn phụ trách --</option>
                    {assignableStaffList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.position || u.role || 'STAFF'}) - {u.department || 'Phòng Chuyên Môn'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Gắn vào Hồ Sơ vụ việc
                  </label>
                  <select
                    value={editingDoc.dossierId || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, dossierId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
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
                  Ghi chú kết quả xử lý / Ý kiến chỉ đạo
                </label>
                <textarea
                  rows={2}
                  value={editingDoc.resultSummary || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, resultSummary: e.target.value })}
                  placeholder="Ghi chú kết quả xử lý hoặc ý kiến chỉ đạo của Lãnh đạo..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Lưu Văn Bản Đến</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sample PDF Modal */}
      <SamplePdfModal
        isOpen={isSamplePdfModalOpen}
        onClose={() => setIsSamplePdfModalOpen(false)}
        onSelectSampleFile={handleSelectSamplePdfForModal}
      />

      {/* Email Receiver Modal */}
      <EmailReceiverModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onImportDoc={handleImportFromEmail}
      />

      {/* In-App Delete Confirmation Modal (100% Reliable in iFrames) */}
      {deleteTargetDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa văn bản đến</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Đồng chí có chắc chắn muốn xóa văn bản này khỏi Sổ Văn bản Đến? Hành động này sẽ gỡ bỏ toàn bộ tệp scan liên quan.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-medium">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Số đến nội bộ:</span>
                <span className="font-bold text-indigo-700 font-mono">{deleteTargetDoc.documentNumber}</span>
              </div>
              {deleteTargetDoc.officialNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Số hiệu gốc:</span>
                  <span className="font-bold text-slate-700 font-mono">{deleteTargetDoc.officialNumber}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cơ quan gửi:</span>
                <span className="font-bold text-slate-800">{deleteTargetDoc.issuingAuthority}</span>
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
                  setDeleteToastMessage(`Đã xóa thành công văn bản đến số [${targetNum}].`);
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
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{deleteToastMessage}</span>
        </div>
      )}
    </div>
  );
};
