import React, { useState } from 'react';
import {
  X,
  Mail,
  Inbox,
  CheckCircle2,
  Paperclip,
  Download,
  Clock,
  Building,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  FileText,
  AlertCircle,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { IncomingDocument, AttachmentFile } from '../types';
import { SAMPLE_DOCUMENTS, generateSamplePdf } from '../utils/samplePdfGenerator';

interface EmailItem {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  receivedAt: string;
  summary: string;
  docNumber: string;
  authority: string;
  docType: string;
  urgency: 'THUONG' | 'KHAN' | 'HOA_TOC';
  attachmentName: string;
  attachmentSize: number;
  samplePresetId?: string;
}

const OFFICIAL_INBOX_EMAILS: EmailItem[] = [
  {
    id: 'em-01',
    senderName: 'Văn Phòng UBND Tỉnh',
    senderEmail: 'ubnd.tinh@hanam.gov.vn',
    subject: '[HỎA TỐC] Công văn 1428/UBND-VP: Triển khai các biện pháp bảo đảm an toàn thông tin mạng & số hóa hồ sơ năm 2025',
    receivedAt: 'Hôm nay, 08:15',
    summary: 'Chỉ đạo khẩn trương rà soát an toàn thông tin 100% hệ thống và chuẩn hóa lưu trữ điện tử theo Nghị định 30/2020/NĐ-CP.',
    docNumber: '1428/UBND-VP',
    authority: 'ỦY BAN NHÂN DÂN THÀNH PHỐ',
    docType: 'Công văn',
    urgency: 'HOA_TOC',
    attachmentName: 'CongVan_1428_UBND_HoaToc_SoHoa.pdf',
    attachmentSize: 345000,
    samplePresetId: 'cong-van-hoa-toc',
  },
  {
    id: 'em-02',
    senderName: 'Sở Tài Chính Thành Phố',
    senderEmail: 'sotaichinh@hanam.gov.vn',
    subject: '[KHẨN] Quyết định 356/QĐ-STC: Phê duyệt dự toán và phân bổ kinh phí nâng cấp hạ tầng số, ứng dụng Trí tuệ nhân tạo (AI)',
    receivedAt: 'Hôm qua, 14:30',
    summary: 'Phê duyệt dự toán kinh phí triển khai Dự án Nâng cấp hệ thống Quản lý Văn bản và Điều hành tích hợp AI OCR thông minh.',
    docNumber: '356/QĐ-STC',
    authority: 'SỞ TÀI CHÍNH',
    docType: 'Quyết định',
    urgency: 'KHAN',
    attachmentName: 'QuyetDinh_356_STC_KinhPhiAI.pdf',
    attachmentSize: 420000,
    samplePresetId: 'quyet-dinh-kinh-phi',
  },
  {
    id: 'em-03',
    senderName: 'Văn Phòng UBND Thành Phố',
    senderEmail: 'vp.ubnd@hanam.gov.vn',
    subject: 'Thông báo số 89/TB-VPUBND: Tổ chức Hội nghị tập huấn sử dụng Hệ thống Quản lý văn bản điện tử và Trợ lý AI',
    receivedAt: '2 ngày trước, 09:00',
    summary: 'Kế hoạch tổ chức hội nghị tập huấn quét OCR, phân loại luồng tiếp nhận bằng AI và tra cứu văn bản thông minh cho các Sở, Ban, Ngành.',
    docNumber: '89/TB-VPUBND',
    authority: 'VĂN PHÒNG ỦY BAN NHÂN DÂN',
    docType: 'Thông báo',
    urgency: 'THUONG',
    attachmentName: 'ThongBao_89_VP_TapHuanAI.pdf',
    attachmentSize: 280000,
    samplePresetId: 'thong-bao-tap-huan',
  },
  {
    id: 'em-04',
    senderName: 'Trung Tâm Dịch Vụ Công Trực Tuyến',
    senderEmail: 'dvc.tructuyen@hanam.gov.vn',
    subject: 'Công văn 245/DVCTT: Đề xuất phương án liên thông hồ sơ thủ tục hành chính một cửa và số hóa kết quả',
    receivedAt: '3 ngày trước, 16:45',
    summary: 'Phối hợp triển khai tiếp nhận và trả kết quả bản điện tử qua Cổng Dịch vụ công quốc gia và hệ thống thông tin một cửa điện tử.',
    docNumber: '245/DVCTT',
    authority: 'TRUNG TÂM DỊCH VỤ CÔNG TRỰC TUYẾN',
    docType: 'Công văn',
    urgency: 'THUONG',
    attachmentName: 'CongVan_245_DVCTT_LienThongSoHoa.pdf',
    attachmentSize: 310000,
  },
];

interface EmailReceiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDoc: (
    docData: Partial<IncomingDocument>,
    attachments: AttachmentFile[]
  ) => void;
}

export const EmailReceiverModal: React.FC<EmailReceiverModalProps> = ({
  isOpen,
  onClose,
  onImportDoc,
}) => {
  const [activeTab, setActiveTab] = useState<'INBOX' | 'MANUAL'>('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Manual Paste Form State
  const [pasteSender, setPasteSender] = useState('');
  const [pasteSubject, setPasteSubject] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [isProcessingPaste, setIsProcessingPaste] = useState(false);

  if (!isOpen) return null;

  const handleSelectEmail = (em: EmailItem) => {
    // Generate valid sample PDF binary attachment
    let pdfUrl = '';
    const preset = SAMPLE_DOCUMENTS.find((p) => p.id === em.samplePresetId);
    if (preset) {
      const { url } = generateSamplePdf(preset);
      pdfUrl = url;
    }

    const newAttachment: AttachmentFile = {
      id: 'att-em-' + Date.now(),
      fileName: em.attachmentName,
      fileSize: em.attachmentSize,
      fileType: 'pdf',
      fileUrl: pdfUrl,
      category: 'VAN_BAN_DEN',
      uploadedByName: em.senderName,
      uploadedAt: new Date().toISOString(),
      tags: ['Email công vụ', em.docType, em.urgency],
    };

    const docData: Partial<IncomingDocument> = {
      officialNumber: em.docNumber,
      issuingAuthority: em.authority,
      summary: em.summary,
      docType: em.docType,
      urgency: em.urgency,
      securityLevel: 'THUONG',
      receptionMethod: 'EMAIL',
      senderEmail: em.senderEmail,
      emailSubject: em.subject,
      receivedDate: new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
    };

    onImportDoc(docData, [newAttachment]);
    onClose();
  };

  const handleProcessManualEmail = () => {
    if (!pasteSubject && !pasteContent) return;

    setIsProcessingPaste(true);

    // Heuristics to parse manual email text
    const cleanSubject = pasteSubject.trim() || 'Văn bản tiếp nhận qua email';
    const textToAnalyze = `${pasteSubject}\n${pasteContent}`;

    // Extract potential document number
    const numMatch = textToAnalyze.match(/Số\s*:\s*([0-9A-ZÀ-Ỹa-zà-ỹ\-\.\/]+)/i) ||
      textToAnalyze.match(/([0-9]+\/[A-ZÀ-Ỹa-zà-ỹ\-\.\/]+)/i);
    const extractedNum = numMatch ? numMatch[1].trim() : `${Math.floor(Math.random() * 800 + 100)}/EML-VB`;

    // Guess docType
    let detectedDocType = 'Công văn';
    const upper = textToAnalyze.toUpperCase();
    if (upper.includes('QUYẾT ĐỊNH')) detectedDocType = 'Quyết định';
    else if (upper.includes('TỜ TRÌNH')) detectedDocType = 'Tờ trình';
    else if (upper.includes('THÔNG BÁO')) detectedDocType = 'Thông báo';
    else if (upper.includes('BÁO CÁO')) detectedDocType = 'Báo cáo';
    else if (upper.includes('CHỈ THỊ')) detectedDocType = 'Chỉ thị';

    // Urgency
    let detectedUrgency: 'THUONG' | 'KHAN' | 'HOA_TOC' = 'THUONG';
    if (upper.includes('HỎA TỐC')) detectedUrgency = 'HOA_TOC';
    else if (upper.includes('KHẨN') || upper.includes('THƯỢNG KHẨN')) detectedUrgency = 'KHAN';

    // Summary
    const summary = pasteContent.trim()
      ? pasteContent.trim().slice(0, 250) + (pasteContent.length > 250 ? '...' : '')
      : cleanSubject;

    const attachment: AttachmentFile = {
      id: 'att-em-manual-' + Date.now(),
      fileName: `VanBan_Email_${extractedNum.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      fileSize: 350000,
      fileType: 'pdf',
      fileUrl: '',
      category: 'VAN_BAN_DEN',
      uploadedByName: pasteSender.trim() || 'Hòm thư công vụ',
      uploadedAt: new Date().toISOString(),
      tags: ['Email công vụ', detectedDocType],
    };

    const docData: Partial<IncomingDocument> = {
      officialNumber: extractedNum,
      issuingAuthority: pasteSender.includes('@') ? `Cơ quan gửi (${pasteSender})` : (pasteSender || 'Cơ quan gửi qua Email'),
      summary,
      docType: detectedDocType,
      urgency: detectedUrgency,
      securityLevel: 'THUONG',
      receptionMethod: 'EMAIL',
      senderEmail: pasteSender.trim() || 'email.congvu@donvi.gov.vn',
      emailSubject: cleanSubject,
      receivedDate: new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
    };

    setTimeout(() => {
      setIsProcessingPaste(false);
      onImportDoc(docData, [attachment]);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-[9999] animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-300">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Tiếp Nhận Văn Bản Đến Qua Hộp Thư Điện Tử Công Vụ
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  NĐ 30/2020/NĐ-CP
                </span>
              </div>
              <p className="text-xs text-sky-200/80 mt-0.5 flex items-center gap-2">
                <span>Hòm thư nhận:</span>
                <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                  vanban@trg.id.vn
                </span>
                <span className="text-emerald-300 font-semibold">• Sẵn sàng đồng bộ</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('INBOX')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'INBOX'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Hộp Thư Công Văn Mới ({OFFICIAL_INBOX_EMAILS.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('MANUAL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'MANUAL'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Dán Nội Dung Email Chuyển Tiếp</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Kênh tiếp nhận chính thống theo quy chuẩn nhà nước</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* TAB 1: OFFICIAL INBOX */}
          {activeTab === 'INBOX' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold">Quy trình xử lý văn bản đến qua Email:</p>
                  <p className="text-sky-800">
                    Khi các Sở, Ban, Ngành hoặc cơ quan cấp trên gửi công văn kèm tệp quét số hóa về hòm thư <strong>vanban@trg.id.vn</strong>, Văn thư chỉ cần bấm <strong>&quot;Tiếp nhận & Vào sổ ngay&quot;</strong>. Hệ thống sẽ tự động bóc tách số hiệu, trích yếu, nạp tệp scan đính kèm và điền thẳng vào luồng trình duyệt Lãnh đạo.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {OFFICIAL_INBOX_EMAILS.map((em) => (
                  <div
                    key={em.id}
                    className={`p-4.5 rounded-2xl border transition-all ${
                      selectedEmailId === em.id
                        ? 'bg-sky-50/60 border-sky-400 ring-2 ring-sky-200 shadow-sm'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900">{em.senderName}</span>
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            &lt;{em.senderEmail}&gt;
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {em.receivedAt}
                          </span>
                          {em.urgency === 'HOA_TOC' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                              HỎA TỐC
                            </span>
                          )}
                          {em.urgency === 'KHAN' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                              KHẨN
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-indigo-950 leading-snug">
                          {em.subject}
                        </h4>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {em.summary}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            <Building className="w-3.5 h-3.5 text-indigo-500" />
                            {em.authority}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            Số: {em.docNumber}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-medium">
                            <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{em.attachmentName} ({(em.attachmentSize / 1024).toFixed(0)} KB)</span>
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleSelectEmail(em)}
                          className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm hover:shadow-indigo-200 transition-all cursor-pointer"
                        >
                          <span>Tiếp Nhận & Vào Sổ</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL EMAIL PASTE */}
          {activeTab === 'MANUAL' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 text-indigo-950 mb-0.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Tiếp nhận email công vụ tự do bằng AI:
                </p>
                Dán địa chỉ người gửi, tiêu đề và toàn văn thư điện tử được chuyển tiếp. Hệ thống sẽ tự động bóc tách thực thể (Số hiệu, cơ quan, trích yếu, mức độ khẩn) và đưa thẳng vào Sổ văn bản đến.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Địa Chỉ Email Người Gửi / Đơn Vị Gửi
                  </label>
                  <input
                    type="text"
                    value={pasteSender}
                    onChange={(e) => setPasteSender(e.target.value)}
                    placeholder="VD: sotaichinh@hanam.gov.vn hoặc Văn phòng Sở KH&ĐT"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tiêu Đề Thư Điện Tử (Subject) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pasteSubject}
                    onChange={(e) => setPasteSubject(e.target.value)}
                    placeholder="VD: [HỎA TỐC] Công văn số 452/UBND-VP về việc..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nội Dung Bức Thư / Trích Yếu Công Văn
                  </label>
                  <textarea
                    rows={6}
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder="Dán toàn bộ nội dung email công vụ hoặc trích yếu công văn tại đây..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={!pasteSubject && !pasteContent}
                    onClick={handleProcessManualEmail}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                    <span>{isProcessingPaste ? 'Đang trích xuất...' : 'AI Trích Xuất & Vào Sổ Đến'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
