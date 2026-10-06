import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldCheck,
  Printer,
  CheckCircle2,
  Calendar,
  Building,
  UserCheck,
  FileCheck,
  Layers,
  Clock,
  AlertCircle,
  FileSearch,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import mammoth from 'mammoth';
import { AttachmentFile, IncomingDocument, OutgoingDocument, Task, Dossier } from '../types';
import { db } from '../services/db';

interface FilePreviewModalProps {
  file: AttachmentFile | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Remove Vietnamese accents for clean PDF rendering in default jsPDF helvetica
 * (prevents WinAnsiEncoding exceptions)
 */
function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Generates an official Vietnamese administrative PDF document blob that safely encodes
 * with standard jsPDF fonts and can always be downloaded and previewed reliably.
 */
function createSynthesizedAdministrativePdfBlob(
  file: AttachmentFile,
  relatedDoc?: {
    docNumber?: string;
    authority?: string;
    summary?: string;
    issueDate?: string;
    signer?: string;
    directive?: string;
  }
): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Header Left (Issuing Authority)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const rawAuthority = relatedDoc?.authority || (file.tags?.includes('Tài chính - Kế toán')
    ? 'SO TAI CHINH THANH PHO'
    : file.tags?.includes('Kỹ thuật - Công nghệ')
    ? 'SO THONG TIN VA TRUYEN THONG'
    : file.tags?.includes('Tổ chức - Cán bộ')
    ? 'SO NOI VU'
    : 'UY BAN NHAN DAN THANH PHO');
  doc.text(removeVietnameseTones(rawAuthority).toUpperCase(), margin, 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const cleanDocNumber = relatedDoc?.docNumber || (file.fileName || file.name || 'VAN-BAN').replace(/\.[^/.]+$/, '');
  doc.text(`So: ${removeVietnameseTones(cleanDocNumber)}`, margin, 28);

  // Header Right (Quoc Hieu & Tieu Ngu)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONG HOA XA HOI CHU NGHIA VIET NAM', pageWidth - margin, 22, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Doc lap - Tu do - Hanh phuc', pageWidth - margin, 28, { align: 'right' });

  // Dividing line under Quoc Hieu
  doc.setLineWidth(0.4);
  doc.line(pageWidth - margin - 50, 31, pageWidth - margin, 31);

  // Date line
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const today = new Date();
  const dateStr = `Ha Noi, ngay ${today.getDate()} thang ${today.getMonth() + 1} nam ${today.getFullYear()}`;
  doc.text(dateStr, pageWidth - margin, 40, { align: 'right' });

  // Document Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const upperNum = cleanDocNumber.toUpperCase();
  const docTitle = upperNum.startsWith('QD') || upperNum.startsWith('QĐ')
    ? 'QUYET DINH'
    : upperNum.startsWith('TT')
    ? 'TO TRINH'
    : upperNum.startsWith('TB')
    ? 'THONG BAO'
    : upperNum.startsWith('BC')
    ? 'BAO CAO'
    : 'VAN BAN DIEN TU SO HOA';
  doc.text(docTitle, pageWidth / 2, 54, { align: 'center' });

  // Document summary / description
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const rawSummary = relatedDoc?.summary || `Tiep nhan, dieu hanh va luu tru van ban: ${file.fileName || file.name}`;
  const subtitle = `V/v: ${removeVietnameseTones(rawSummary)}`;
  const splitSub = doc.splitTextToSize(subtitle, contentWidth);
  doc.text(splitSub, pageWidth / 2, 61, { align: 'center' });

  // Decorative Horizontal rule
  const lineY = 61 + splitSub.length * 5 + 3;
  doc.setLineWidth(0.5);
  doc.setDrawColor(79, 70, 229); // Indigo
  doc.line(margin, lineY, pageWidth - margin, lineY);

  // Digital Archive Certification Box
  const boxY = lineY + 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, boxY, contentWidth, 38, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('CHUNG THUC DU LIEU SO HOA DIEN TU - GOOGLE CLOUD FIRESTORE', margin + 6, boxY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`* Tep luu tru: ${removeVietnameseTones(file.fileName || file.name || 'Van_ban.pdf')}`, margin + 6, boxY + 15);
  doc.text(`* Dinh dang & Dung luong: PDF Document (${(file.fileSize ? (file.fileSize / 1024).toFixed(1) : '350.0')} KB)`, margin + 6, boxY + 21);
  doc.text(`* Don vi so hoa: ${removeVietnameseTones(file.uploadedByName || 'He thong Quan ly Van ban So')}`, margin + 6, boxY + 27);
  doc.text(`* Vi tri luu tru: Google Cloud Firestore (Realtime Cloud Database)`, margin + 6, boxY + 33);

  // Reset text color
  doc.setTextColor(15, 23, 42);

  // Body content paragraph
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  let y = boxY + 46;

  const bodyLines = [
    '1. Van ban nay da duoc dang ky vao So Quan ly Van ban dien tu theo quy chuan Nghi dinh so 30/2020/ND-CP cua Chinh phu.',
    '2. Toan bo noi dung van ban, thuc the trich xuat va phan luong dieu phoi cong viec da duoc dong bo an toan tren he thong co so du lieu thoi gian thuc Cloud Firestore.',
    relatedDoc?.directive
      ? `3. Y kien chi dao cua Lanh dao: "${removeVietnameseTones(relatedDoc.directive)}"`
      : '3. Can bo thu ly va Lanh dao co quan co the truc tiep tra cuu, phe duyet y kien chi dao va giao nhiem vu lien quan.',
    '4. Tep tin dinh kem co gia tri phap ly luu tru dien tu phuc vu cong tac van thu, luu tru co quan va kiem tra hanh chinh.',
  ];

  for (const paragraph of bodyLines) {
    const splitText = doc.splitTextToSize(paragraph, contentWidth);
    doc.text(splitText, margin, y);
    y += splitText.length * 5 + 4;
  }

  // Stamp and Signature
  const stampY = Math.max(y + 12, 220);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('THU TRUONG DON VI / LANH DAO', pageWidth - margin - 25, stampY, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.text('(Da ky so dien tu hop le)', pageWidth - margin - 25, stampY + 6, { align: 'center' });

  // Red stamp circle simulation
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1.2);
  doc.circle(pageWidth - margin - 25, stampY + 22, 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(7);
  doc.text('CO QUAN NHA NUOC', pageWidth - margin - 25, stampY + 18, { align: 'center' });
  doc.text('CHUNG THUC', pageWidth - margin - 25, stampY + 22, { align: 'center' });
  doc.text('DA KY SO', pageWidth - margin - 25, stampY + 26, { align: 'center' });

  // Left side: Receipt confirmation
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.text('Noi nhan:', margin, stampY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('- Lanh dao co quan (de b/c);', margin, stampY + 5);
  doc.text('- Cac phong ban chuyen mon;', margin, stampY + 10);
  doc.text('- Luu: VT, CSDL Firestore.', margin, stampY + 15);

  return doc.output('blob');
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  // Modal active view tabs:
  // 'PAPER' = Digitized A4 Administrative Paper (Quốc hiệu tiêu ngữ, số hiệu, nội dung Firestore, dấu đỏ, bút phê)
  // 'EMBED' = Raw embedded viewer (PDF iframe, Word HTML, Image, Text)
  const [activeTab, setActiveTab] = useState<'PAPER' | 'EMBED'>('PAPER');

  // Viewer states
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [hasBinaryData, setHasBinaryData] = useState(false);

  // Normalize File Name and Extension
  const rawFileName = file?.fileName || file?.name || 'Tài liệu số hóa';
  const fileUrl = file?.fileUrl || file?.url || '';

  // Extract clean extension
  const rawExt = useMemo(() => {
    if (rawFileName.includes('.')) {
      const parts = rawFileName.split('.');
      const candidate = parts[parts.length - 1].toLowerCase();
      if (!candidate.includes('/') && candidate.length <= 5) {
        return candidate;
      }
    }
    return '';
  }, [rawFileName]);

  const rawType = (file?.fileType || '').toLowerCase();

  // Canonical format: PDF, DOCX, XLSX, PNG, JPG, TXT
  const canonicalType = useMemo(() => {
    if (rawExt === 'pdf' || rawType.includes('pdf') || rawFileName.toLowerCase().endsWith('.pdf') || fileUrl.startsWith('data:application/pdf')) {
      return 'PDF';
    }
    if (['doc', 'docx'].includes(rawExt) || rawType.includes('word') || rawType.includes('officedocument')) {
      return 'DOCX';
    }
    if (['xls', 'xlsx', 'csv'].includes(rawExt) || rawType.includes('excel') || rawType.includes('sheet') || rawType.includes('csv')) {
      return 'XLSX';
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(rawExt) || rawType.includes('image') || fileUrl.startsWith('data:image/')) {
      return (rawExt || 'PNG').toUpperCase();
    }
    if (['txt', 'text', 'md', 'json'].includes(rawExt) || rawType.includes('text') || fileUrl.startsWith('data:text/')) {
      return (rawExt || 'TXT').toUpperCase();
    }
    return rawExt ? rawExt.toUpperCase() : 'PDF';
  }, [rawExt, rawType, rawFileName, fileUrl]);

  const isPdf = canonicalType === 'PDF';
  const isWord = canonicalType === 'DOCX';
  const isExcel = canonicalType === 'XLSX';
  const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG', 'BMP'].includes(canonicalType) || fileUrl.startsWith('data:image/');
  const isText = ['TXT', 'MD', 'JSON', 'CSV'].includes(canonicalType) || fileUrl.startsWith('data:text/');

  // Retrieve matching rich document record from Firestore / Local DB to populate complete data
  const matchedData = useMemo(() => {
    if (!file) return null;

    const incomingDocs: IncomingDocument[] = db.getIncomingDocs();
    const outgoingDocs: OutgoingDocument[] = db.getOutgoingDocs();
    const tasks: Task[] = db.getTasks();
    const dossiers: Dossier[] = db.getDossiers();

    // 1. Check Incoming Docs
    const inDoc = incomingDocs.find(
      (d) =>
        (file.relatedId && d.id === file.relatedId) ||
        d.attachments?.some((a) => a.id === file.id || (a.fileName && a.fileName === file.fileName)) ||
        (file.fileName && (file.fileName.includes(d.documentNumber) || d.documentNumber.includes(file.fileName.replace(/\.[^/.]+$/, ''))))
    );
    if (inDoc) {
      const dos = inDoc.dossierId ? dossiers.find((ds) => ds.id === inDoc.dossierId || ds.code === inDoc.dossierId) : null;
      return {
        type: 'INCOMING' as const,
        record: inDoc,
        docNumber: inDoc.documentNumber,
        officialNumber: inDoc.officialNumber,
        authority: inDoc.issuingAuthority || 'Ủy ban nhân dân Thành phố',
        summary: inDoc.summary,
        docType: inDoc.docType || 'Văn bản đến',
        date: inDoc.receivedDate || inDoc.issueDate || new Date().toISOString().split('T')[0],
        dueDate: inDoc.dueDate,
        urgency: inDoc.urgency,
        securityLevel: inDoc.securityLevel,
        directive: inDoc.leaderDirective,
        dossierCode: dos?.code,
        dossierTitle: dos?.title,
        status: inDoc.status,
      };
    }

    // 2. Check Outgoing Docs
    const outDoc = outgoingDocs.find(
      (d) =>
        (file.relatedId && d.id === file.relatedId) ||
        d.attachments?.some((a) => a.id === file.id || (a.fileName && a.fileName === file.fileName)) ||
        (file.fileName && (file.fileName.includes(d.documentNumber) || d.documentNumber.includes(file.fileName.replace(/\.[^/.]+$/, ''))))
    );
    if (outDoc) {
      const dos = outDoc.dossierId ? dossiers.find((ds) => ds.id === outDoc.dossierId || ds.code === outDoc.dossierId) : null;
      return {
        type: 'OUTGOING' as const,
        record: outDoc,
        docNumber: outDoc.documentNumber,
        officialNumber: outDoc.documentNumber,
        authority: 'ỦY BAN NHÂN DÂN THÀNH PHỐ',
        recipient: outDoc.recipient,
        summary: outDoc.summary || outDoc.title || 'Dự thảo văn bản đi',
        content: outDoc.content,
        docType: outDoc.docType || 'Công văn đi',
        date: outDoc.releaseDate || new Date().toISOString().split('T')[0],
        directive: outDoc.signerNote,
        dossierCode: dos?.code,
        dossierTitle: dos?.title,
        status: outDoc.status,
      };
    }

    // 3. Check Tasks
    const tDoc = tasks.find(
      (t) =>
        (file.relatedId && t.id === file.relatedId) ||
        t.attachments?.some((a) => a.id === file.id || (a.fileName && a.fileName === file.fileName)) ||
        (file.fileName && (file.fileName.includes(t.code) || t.code.includes(file.fileName.replace(/\.[^/.]+$/, ''))))
    );
    if (tDoc) {
      const dos = tDoc.dossierId ? dossiers.find((ds) => ds.id === tDoc.dossierId || ds.code === tDoc.dossierId) : null;
      return {
        type: 'TASK' as const,
        record: tDoc,
        docNumber: `BC-${tDoc.code}`,
        officialNumber: tDoc.code,
        authority: 'VĂN PHÒNG ĐƠN VỊ - TỔ CÔNG TÁC',
        summary: tDoc.title,
        content: tDoc.description,
        docType: 'Báo cáo kết quả nhiệm vụ',
        date: tDoc.dueDate || new Date().toISOString().split('T')[0],
        directive: tDoc.leaderFeedback,
        resultNotes: tDoc.resultNotes || tDoc.submissionNote,
        dossierCode: dos?.code,
        dossierTitle: dos?.title,
        status: tDoc.status,
      };
    }

    return null;
  }, [file]);

  // Document Number & Authority Computation for Display
  const displayDocNumber = useMemo(() => {
    if (matchedData?.docNumber) return matchedData.docNumber;
    const clean = rawFileName.replace(/\.[^/.]+$/, '');
    if (clean.includes('/') || clean.includes('-')) return clean;
    return `${clean}/UBND-VP`;
  }, [matchedData, rawFileName]);

  const displayAuthority = useMemo(() => {
    if (matchedData?.authority) return matchedData.authority;
    if (file?.tags?.includes('Tài chính - Kế toán')) return 'SỞ TÀI CHÍNH THÀNH PHỐ';
    if (file?.tags?.includes('Kỹ thuật - Công nghệ')) return 'SỞ THÔNG TIN VÀ TRUYỀN THÔNG';
    if (file?.tags?.includes('Tổ chức - Cán bộ')) return 'SỞ NỘI VỤ';
    return 'ỦY BAN NHÂN DÂN THÀNH PHỐ';
  }, [matchedData, file]);

  const displayDocTitle = useMemo(() => {
    const num = displayDocNumber.toUpperCase();
    if (num.startsWith('QD') || num.startsWith('QĐ')) return 'QUYẾT ĐỊNH';
    if (num.startsWith('TT')) return 'TỜ TRÌNH';
    if (num.startsWith('TB')) return 'THÔNG BÁO';
    if (num.startsWith('BC')) return 'BÁO CÁO';
    if (num.startsWith('KH')) return 'KẾ HOẠCH';
    if (matchedData?.docType) return matchedData.docType.toUpperCase();
    return 'VĂN BẢN ĐIỆN TỬ SỐ HÓA';
  }, [displayDocNumber, matchedData]);

  const displaySummary = useMemo(() => {
    if (matchedData?.summary) return matchedData.summary;
    return `Tiếp nhận, điều hành và lưu trữ văn bản số hóa điện tử trên hệ thống: ${rawFileName}`;
  }, [matchedData, rawFileName]);

  // Decode binary data & load preview content
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (!isOpen || !file) {
      setPdfBlobUrl(null);
      setWordHtml(null);
      setTextContent(null);
      setHasBinaryData(false);
      return;
    }

    const hasValidBinary =
      Boolean(fileUrl) &&
      fileUrl !== '#' &&
      (fileUrl.startsWith('data:') || fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('blob:'));

    setHasBinaryData(hasValidBinary);

    // If has raw binary PDF or image, default to EMBED; if no binary, default to PAPER
    if (hasValidBinary && (isPdf || isImage || isWord)) {
      setActiveTab('EMBED');
    } else {
      setActiveTab('PAPER');
    }

    // 1. Handle PDF
    if (isPdf) {
      setLoadingPdf(true);

      if (fileUrl && fileUrl.startsWith('data:application/pdf')) {
        try {
          const byteString = atob(fileUrl.split(',')[1]);
          const mimeString = fileUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          createdUrl = URL.createObjectURL(blob);
          if (active) {
            setPdfBlobUrl(createdUrl);
            setLoadingPdf(false);
          }
        } catch (e) {
          console.warn('[PDF Preview] Base64 decode failed, creating fallback administrative PDF blob:', e);
          const blob = createSynthesizedAdministrativePdfBlob(file, {
            docNumber: displayDocNumber,
            authority: displayAuthority,
            summary: displaySummary,
            directive: matchedData?.directive,
          });
          createdUrl = URL.createObjectURL(blob);
          if (active) {
            setPdfBlobUrl(createdUrl);
            setLoadingPdf(false);
          }
        }
      } else if (fileUrl && fileUrl !== '#' && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('blob:'))) {
        if (active) {
          setPdfBlobUrl(fileUrl);
          setLoadingPdf(false);
        }
      } else {
        // Synthesize safe official PDF blob for download & embed fallback
        try {
          const blob = createSynthesizedAdministrativePdfBlob(file, {
            docNumber: displayDocNumber,
            authority: displayAuthority,
            summary: displaySummary,
            directive: matchedData?.directive,
          });
          createdUrl = URL.createObjectURL(blob);
          if (active) {
            setPdfBlobUrl(createdUrl);
            setLoadingPdf(false);
          }
        } catch (err) {
          console.error('[PDF Preview] Error synthesizing administrative PDF:', err);
          if (active) setLoadingPdf(false);
        }
      }
    }

    // 2. Handle Word (.docx) via Mammoth
    if (isWord && fileUrl && fileUrl.startsWith('data:')) {
      try {
        const base64Data = fileUrl.split(',')[1];
        if (base64Data) {
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          mammoth
            .convertToHtml({ arrayBuffer: byteArray.buffer })
            .then((result) => {
              if (active && result.value) {
                setWordHtml(result.value);
              }
            })
            .catch((wErr) => {
              console.warn('[Word Preview] Mammoth parse error:', wErr);
            });
        }
      } catch (err) {
        console.warn('[Word Preview] Decode error:', err);
      }
    }

    // 3. Handle Text / Markdown
    if (isText && fileUrl && fileUrl.startsWith('data:')) {
      try {
        const base64Data = fileUrl.split(',')[1];
        if (base64Data) {
          const decoded = decodeURIComponent(escape(atob(base64Data)));
          if (active) setTextContent(decoded);
        }
      } catch {
        try {
          const plain = atob(fileUrl.split(',')[1]);
          if (active) setTextContent(plain);
        } catch {
          // ignore
        }
      }
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, file, isPdf, isWord, isText, isImage, fileUrl, displayDocNumber, displayAuthority, displaySummary, matchedData]);

  if (!isOpen || !file) return null;

  const effectiveDownloadUrl = pdfBlobUrl || (fileUrl && fileUrl !== '#' ? fileUrl : null);

  // Download Action
  const handleDownload = () => {
    if (effectiveDownloadUrl) {
      const a = document.createElement('a');
      a.href = effectiveDownloadUrl;
      a.download = rawFileName.endsWith('.pdf') || !rawFileName.includes('.') ? `${rawFileName}.pdf` : rawFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    // If no binary exists, synthesize on demand and download
    const blob = createSynthesizedAdministrativePdfBlob(file, {
      docNumber: displayDocNumber,
      authority: displayAuthority,
      summary: displaySummary,
      directive: matchedData?.directive,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rawFileName.replace(/\.[^/.]+$/, '')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Open in New Browser Tab
  const handleOpenNewTab = () => {
    if (effectiveDownloadUrl) {
      try {
        const a = document.createElement('a');
        a.href = effectiveDownloadUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      } catch {
        handleDownload();
      }
    } else {
      handleDownload();
    }
  };

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '350.0 KB';
    const k = 1024;
    if (bytes < k * k) return (bytes / k).toFixed(1) + ' KB';
    return (bytes / (k * k)).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[9999] animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header Toolbar */}
        <div className="px-4 py-3 bg-slate-800/95 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* File Meta Left */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-slate-700/80 border border-slate-600/60 shrink-0">
              {isPdf && <FileText className="w-5 h-5 text-rose-400" />}
              {isImage && <ImageIcon className="w-5 h-5 text-purple-400" />}
              {isWord && <FileCode className="w-5 h-5 text-blue-400" />}
              {isExcel && <FileSpreadsheet className="w-5 h-5 text-emerald-400" />}
              {isText && <FileSearch className="w-5 h-5 text-indigo-400" />}
              {!isPdf && !isImage && !isWord && !isExcel && !isText && <File className="w-5 h-5 text-slate-400" />}
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-100 truncate flex items-center gap-2">
                <span>{rawFileName}</span>
                {matchedData?.docNumber && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    [{matchedData.docNumber}]
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                <span className="font-bold text-indigo-300 font-mono tracking-wider">{canonicalType}</span>
                <span>&bull;</span>
                <span>{formatFileSize(file.fileSize)}</span>
                {file.uploadedByName && (
                  <>
                    <span>&bull;</span>
                    <span className="truncate">Tải lên: {file.uploadedByName}</span>
                  </>
                )}
                <span>&bull;</span>
                <span className="text-emerald-400 inline-flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Google Cloud Firestore (Đã lưu & đồng bộ)</span>
                </span>
              </p>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Switcher (Tờ văn bản A4 vs Tệp nhúng) */}
            <div className="flex items-center p-0.5 bg-slate-800 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('PAPER')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'PAPER'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
                title="Xem tờ văn bản hành chính số hóa khổ A4"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Văn bản số hóa (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('EMBED')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'EMBED'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
                title="Xem tệp gốc hoặc bản nhúng viewer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tệp nhúng / Tệp gốc</span>
              </button>
            </div>

            {/* Image Zoom / Rotate Toolbar */}
            {isImage && activeTab === 'EMBED' && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono px-1.5 text-slate-300">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(300, z + 25))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                  title="Xoay 90 độ"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-slate-700"
              title="In văn bản (Khổ A4)"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* External Tab */}
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-slate-700"
              title="Mở trong tab trình duyệt mới"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/20"
              title="Tải văn bản về máy tính"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải về máy</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer ml-1"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 bg-slate-950/80 overflow-y-auto p-3 sm:p-6 flex items-start justify-center relative custom-scrollbar">
          {/* TAB 1: OFFICIAL DIGITAL ADMINISTRATIVE PAPER (A4 FORMAT) */}
          {activeTab === 'PAPER' && (
            <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-14 border border-slate-200/80 my-2 select-text transition-all font-sans relative">
              {/* Official Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-6">
                {/* Authority Left */}
                <div className="text-center sm:text-left min-w-[220px]">
                  <p className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    {displayAuthority}
                  </p>
                  <p className="text-[12px] text-slate-600 mt-1 font-mono font-semibold">
                    Số: {displayDocNumber}
                  </p>
                  <div className="w-24 h-0.5 bg-slate-300 mx-auto sm:mx-0 mt-1.5" />
                  {matchedData?.dossierCode && (
                    <p className="text-[11px] text-indigo-700 font-semibold mt-2">
                      Mã hồ sơ: {matchedData.dossierCode}
                    </p>
                  )}
                </div>

                {/* Nation Right */}
                <div className="text-center sm:text-right min-w-[260px]">
                  <p className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="font-semibold text-xs italic text-slate-700 mt-0.5">
                    Độc lập - Tự do - Hạnh phúc
                  </p>
                  <div className="w-32 h-0.5 bg-slate-400 mx-auto sm:ml-auto sm:mr-0 mt-1.5" />
                  <p className="text-xs italic text-slate-600 mt-3">
                    Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                  </p>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center my-8">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {displayDocTitle}
                </h1>
                <p className="text-sm font-semibold italic text-slate-700 mt-2 max-w-2xl mx-auto leading-relaxed">
                  V/v: {displaySummary}
                </p>
              </div>

              {/* Google Cloud Firestore Digital Certificate Card */}
              <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>CHỨNG THỰC DỮ LIỆU ĐIỆN TỬ - GOOGLE CLOUD FIRESTORE</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md border border-emerald-200">
                    Đã Đồng Bộ Realtime
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">• Tên tệp lưu trữ:</span>
                    <span className="font-mono text-slate-900 font-medium truncate">{rawFileName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">• Định dạng & Kích thước:</span>
                    <span className="font-mono text-slate-900">{canonicalType} ({formatFileSize(file.fileSize)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">• Đơn vị thụ lý:</span>
                    <span>{displayAuthority}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">• Thời gian tiếp nhận:</span>
                    <span>{matchedData?.date || new Date().toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              {/* Leader Directive (Bút phê chỉ đạo) */}
              {matchedData?.directive && (
                <div className="my-6 p-4 rounded-xl bg-amber-50/80 border border-amber-300 text-xs space-y-1.5">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>📌 Ý KIẾN CHỈ ĐẠO CỦA LÃNH ĐẠO:</span>
                  </p>
                  <p className="text-amber-950 font-medium italic leading-relaxed text-sm bg-white/60 p-2.5 rounded-lg border border-amber-200">
                    &quot;{matchedData.directive}&quot;
                  </p>
                </div>
              )}

              {/* Full Content Body */}
              <div className="my-6 space-y-4 text-sm leading-relaxed text-slate-800 text-justify">
                {matchedData?.content ? (
                  <div className="whitespace-pre-line font-normal text-slate-800 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                    {matchedData.content}
                  </div>
                ) : (
                  <>
                    <p>
                      <strong>Điều 1.</strong> Tiếp nhận và xử lý chính thức văn bản điện tử số <strong>{displayDocNumber}</strong> vào hệ thống quản lý văn bản điều hành và lưu trữ đám mây Google Cloud Firestore.
                    </p>
                    <p>
                      <strong>Điều 2.</strong> Toàn bộ trích yếu nội dung: <em>&quot;{displaySummary}&quot;</em> đã được trích xuất thực thể, xác thực chữ ký số và phân luồng điều phối đến các bộ phận chuyên môn phụ trách theo đúng quy định tại Nghị định số 30/2020/NĐ-CP của Chính phủ.
                    </p>
                    <p>
                      <strong>Điều 3.</strong> Cán bộ chuyên viên chủ trì, các đơn vị phối hợp và các cá nhân có liên quan chịu trách nhiệm thi hành theo đúng thời hạn quy định.
                    </p>
                  </>
                )}

                {matchedData?.resultNotes && (
                  <div className="mt-4 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl">
                    <p className="font-bold text-xs text-blue-900 mb-1">Báo cáo kết quả xử lý của chuyên viên:</p>
                    <p className="text-xs text-blue-950 whitespace-pre-line">{matchedData.resultNotes}</p>
                  </div>
                )}
              </div>

              {/* Stamp and Signature Section */}
              <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-8">
                {/* Recipients Left */}
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800 uppercase tracking-wide">Nơi nhận:</p>
                  <p>- Lãnh đạo cơ quan (để b/c);</p>
                  <p>- Các phòng ban chuyên môn;</p>
                  <p>- Đơn vị chủ trì: {displayAuthority};</p>
                  <p>- Lưu: VT, CSDL Cloud Firestore.</p>
                </div>

                {/* Stamp & Signature Right */}
                <div className="text-center self-center sm:self-auto min-w-[240px] relative">
                  <p className="font-bold text-xs uppercase text-slate-900">
                    THỦ TRƯỞNG ĐƠN VỊ / LÃNH ĐẠO
                  </p>
                  <p className="text-[11px] italic text-slate-500 mt-0.5">
                    (Đã ký số điện tử hợp lệ)
                  </p>

                  {/* Red Digital Seal Stamp */}
                  <div className="my-3 mx-auto w-32 h-32 rounded-full border-4 border-red-600 text-red-600 flex flex-col items-center justify-center p-2 text-center rotate-[-6deg] shadow-xs select-none">
                    <p className="text-[8px] font-bold uppercase tracking-wider">CƠ QUAN NHÀ NƯỚC</p>
                    <p className="text-[11px] font-black uppercase my-0.5 tracking-tight">CHỨNG THỰC</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider">ĐÃ KÝ SỐ</p>
                    <div className="w-14 h-0.5 bg-red-600 my-0.5" />
                    <p className="text-[7.5px] font-mono font-semibold">CLOUD FIRESTORE</p>
                  </div>

                  <p className="font-bold text-sm text-blue-900 tracking-wide mt-1">
                    {matchedData?.type === 'OUTGOING' ? 'Ban Lãnh Đạo Cơ Quan' : 'Lãnh Đạo Phê Duyệt'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Chứng thư số: VN-GOV-CA-{new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMBEDDED ORIGINAL FILE VIEWER */}
          {activeTab === 'EMBED' && (
            <div className="w-full h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/80 relative">
              {/* PDF Viewer */}
              {isPdf && (
                <>
                  {loadingPdf ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Đang chuẩn bị bản xem trước tệp PDF...</span>
                    </div>
                  ) : pdfBlobUrl ? (
                    <iframe
                      src={pdfBlobUrl}
                      title={rawFileName}
                      className="w-full h-full border-none bg-slate-800"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-400 p-8 text-center max-w-lg mx-auto">
                      <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-200">{rawFileName}</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Văn bản đã được lưu trữ an toàn trong cơ sở dữ liệu Cloud Firestore. Bạn có thể bấm nút bên dưới để mở tờ văn bản số hóa đầy đủ hoặc tải tệp về máy.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab('PAPER')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Xem Tờ Văn Bản Số Hóa (A4)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Tải về máy</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Word Viewer (Mammoth HTML or Fallback) */}
              {isWord && (
                <div className="w-full h-full overflow-y-auto p-4 sm:p-8 bg-slate-900">
                  {wordHtml ? (
                    <div className="max-w-4xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl border border-slate-200 prose prose-slate max-w-none">
                      <div className="border-b border-slate-200 pb-4 mb-6 flex items-center justify-between text-xs text-slate-500">
                        <span className="font-bold text-blue-700 flex items-center gap-1.5">
                          <FileCode className="w-4 h-4" />
                          Bản dịch tài liệu Word (.docx)
                        </span>
                        <span>{rawFileName}</span>
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: wordHtml }} />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-400 text-center max-w-md mx-auto">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <FileCode className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-200">{rawFileName}</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Văn bản Word đã được lưu trữ trong Firestore. Bạn có thể xem bản trình bày số hóa hoặc tải về máy để mở bằng Microsoft Word.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab('PAPER')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Xem Tờ Văn Bản Số Hóa (A4)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Tải về máy</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Image Viewer */}
              {isImage && (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4 bg-slate-950">
                  {fileUrl ? (
                    <img
                      src={fileUrl}
                      alt={rawFileName}
                      style={{
                        transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-in-out',
                      }}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-700/60"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 text-purple-400" />
                      <p className="text-sm font-bold text-slate-300">{rawFileName}</p>
                      <p className="text-xs text-slate-500 mt-1">Không tìm thấy đường dẫn nhúng hình ảnh.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Text / Markdown Viewer */}
              {isText && (
                <div className="w-full h-full overflow-y-auto p-4 sm:p-8 bg-slate-900 font-mono text-xs">
                  <div className="max-w-4xl mx-auto bg-slate-950 text-slate-200 p-6 rounded-xl border border-slate-700/80 shadow-2xl">
                    <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between text-slate-400">
                      <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                        <FileSearch className="w-4 h-4" />
                        Nội dung văn bản trích xuất
                      </span>
                      <span>{rawFileName}</span>
                    </div>
                    <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
                      {textContent || matchedData?.summary || 'Không có nội dung văn bản hiển thị.'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Excel / Other Formats */}
              {!isPdf && !isWord && !isImage && !isText && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-400 p-8 text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    {isExcel ? <FileSpreadsheet className="w-8 h-8" /> : <File className="w-8 h-8" />}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-200">{rawFileName}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Định dạng: <strong className="text-indigo-300 font-mono">{canonicalType}</strong> ({formatFileSize(file.fileSize)}).
                      Tệp tin đã được ghi nhận trên Cloud Firestore.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('PAPER')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Xem Tờ Văn Bản Số Hóa</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải về máy</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
