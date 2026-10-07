import mammoth from 'mammoth';
import pdfToText from 'react-pdftotext';
import { apiUrl } from './apiConfig';

export interface ExtractedDocumentData {
  title: string;
  text: string;
  success: boolean;
  error?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  docType?: string;
  signer?: string;
  signerPosition?: string;
  summary?: string;
}

/**
 * Heuristics to parse Vietnamese administrative metadata from raw text
 */
export function parseVietnameseDocMetadata(text: string, fallbackTitle: string) {
  let docType = 'Công văn';
  let documentNumber = '';
  let issuingAuthority = '';
  let issueDate = '';
  let title = '';
  let signer = '';
  let signerPosition = '';
  let summary = '';

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Find Số/Ký hiệu (hỗ trợ cả chuẩn 72/2025/QH15, 124/UBND-VP, 45/QĐ-TTg, v.v.)
  const docNumMatch =
    text.match(/Số\s*:\s*([0-9A-ZÀ-Ỹa-zà-ỹ\-\.\/]+)/i) ||
    text.match(/Số\s+([0-9]+\/[A-ZÀ-Ỹa-zà-ỹ\-\.\/]+)/i) ||
    text.match(/(?:^|\s)([0-9]+\/[0-9]+\/[A-Z0-9\-_]+)/m) ||
    text.match(/(?:^|\s)([0-9]+\/[A-Z0-9\-]+(?:-[A-Z0-9]+)?)/m);
  if (docNumMatch) {
    documentNumber = docNumMatch[1].trim();
  }

  // 2. Find Doc Type
  const upperText = text.toUpperCase();
  const docTypes = [
    'QUYẾT ĐỊNH',
    'TỜ TRÌNH',
    'KẾ HOẠCH',
    'THÔNG BÁO',
    'BÁO CÁO',
    'CÔNG VĂN',
    'CHỈ THỊ',
    'QUY CHẾ',
    'QUY ĐỊNH',
    'BIÊN BẢN',
    'GIẤY MỜI',
    'NGHỊ QUYẾT',
    'LUẬT',
  ];
  for (const dt of docTypes) {
    if (upperText.includes(dt)) {
      if (dt === 'QUYẾT ĐỊNH') docType = 'Quyết định';
      else if (dt === 'TỜ TRÌNH') docType = 'Tờ trình';
      else if (dt === 'KẾ HOẠCH') docType = 'Kế hoạch';
      else if (dt === 'THÔNG BÁO') docType = 'Thông báo';
      else if (dt === 'BÁO CÁO') docType = 'Báo cáo';
      else if (dt === 'CHỈ THỊ') docType = 'Chỉ thị';
      else if (dt === 'QUY CHẾ') docType = 'Quy chế';
      else if (dt === 'BIÊN BẢN') docType = 'Biên bản';
      else if (dt === 'GIẤY MỜI') docType = 'Giấy mời';
      else if (dt === 'NGHỊ QUYẾT') docType = 'Nghị quyết';
      else if (dt === 'LUẬT') docType = 'Luật';
      else docType = dt.charAt(0) + dt.slice(1).toLowerCase();
      break;
    }
  }

  // 3. Find Issuing Authority (Cơ quan ban hành bên ngoài)
  const upperNum = documentNumber.toUpperCase();
  if (upperNum.includes('QH') || upperText.includes('QUỐC HỘI')) {
    issuingAuthority = upperNum.includes('UBTVQH') || upperText.includes('ỦY BAN THƯỜNG VỤ')
      ? 'Ủy ban Thường vụ Quốc hội'
      : 'Quốc hội';
    signerPosition = 'Chủ tịch Quốc hội';
  } else if (upperNum.includes('TTG') || upperText.includes('THỦ TƯỚNG')) {
    issuingAuthority = 'Thủ tướng Chính phủ';
    signerPosition = 'Thủ tướng Chính phủ';
  } else if (upperNum.includes('CP') || upperText.includes('CHÍNH PHỦ')) {
    issuingAuthority = 'Chính phủ';
    signerPosition = 'Thủ tướng Chính phủ';
  } else if (upperNum.includes('BTC') || upperText.includes('BỘ TÀI CHÍNH')) {
    issuingAuthority = 'Bộ Tài chính';
    signerPosition = 'Bộ trưởng';
  } else if (upperNum.includes('BCA') || upperText.includes('BỘ CÔNG AN')) {
    issuingAuthority = 'Bộ Công an';
    signerPosition = 'Bộ trưởng';
  } else if (upperNum.includes('BNV') || upperText.includes('BỘ NỘI VỤ')) {
    issuingAuthority = 'Bộ Nội vụ';
    signerPosition = 'Bộ trưởng';
  } else if (upperNum.includes('BTP') || upperText.includes('BỘ TƯ PHÁP')) {
    issuingAuthority = 'Bộ Tư pháp';
    signerPosition = 'Bộ trưởng';
  } else if (upperNum.includes('BKHĐT') || upperText.includes('BỘ KẾ HOẠCH')) {
    issuingAuthority = 'Bộ Kế hoạch và Đầu tư';
    signerPosition = 'Bộ trưởng';
  } else if (upperNum.includes('BTTTT') || upperNum.includes('MIC') || upperText.includes('BỘ THÔNG TIN')) {
    issuingAuthority = 'Bộ Thông tin và Truyền thông';
    signerPosition = 'Bộ trưởng';
  } else if (upperNum.includes('UBND') || upperText.includes('ỦY BAN NHÂN DÂN')) {
    issuingAuthority = 'Ủy ban nhân dân Tỉnh / Thành phố';
    signerPosition = 'Chủ tịch UBND';
  } else {
    const authorityKeywords = [
      'QUỐC HỘI',
      'CHÍNH PHỦ',
      'THỦ TƯỚNG',
      'ỦY BAN NHÂN DÂN',
      'TÒA ÁN NHÂN DÂN',
      'VIỆN KIỂM SÁT',
      'SỞ TÀI CHÍNH',
      'SỞ TỔ CHỨC CÁN BỘ',
      'SỞ NỘI VỤ',
      'SỞ KẾ HOẠCH',
      'SỞ XÂY DỰNG',
      'SỞ THÔNG TIN',
      'SỞ TƯ PHÁP',
      'SỞ GIÁO DỤC',
      'SỞ Y TẾ',
      'SỞ',
      'BỘ',
      'CỤC',
      'CHI CỤC',
      'BAN QUẢN LÝ',
      'TỔNG CỤC',
      'VĂN PHÒNG',
    ];
    for (const line of lines.slice(0, 15)) {
      const upperLine = line.toUpperCase();
      if (authorityKeywords.some((kw) => upperLine.startsWith(kw) || upperLine.includes(kw))) {
        if (!upperLine.includes('CỘNG HÒA') && !upperLine.includes('ĐỘC LẬP') && !upperLine.includes('VIỆT NAM')) {
          issuingAuthority = line;
          break;
        }
      }
    }
  }

  // 4. Find Signer & Signer Position từ phần cuối văn bản
  // Tìm kiếm khối chữ ký ở phần cuối văn bản
  const bottomLines = lines.slice(Math.max(0, lines.length - 20));
  const sigKeywords = ['CHỦ TỊCH', 'THỦ TƯỚNG', 'BỘ TRƯỞNG', 'GIÁM ĐỐC', 'THỨ TRƯỞNG', 'PHÓ CHỦ TỊCH', 'PHÓ GIÁM ĐỐC', 'CHÁNH ÁN', 'CHÁNH VĂN PHÒNG', 'TM.', 'KT.', 'TL.'];
  
  const sigLineIdx = bottomLines.findIndex((l) => {
    const u = l.toUpperCase();
    return sigKeywords.some((kw) => u.includes(kw)) && !u.includes('KÍNH GỬI') && !u.includes('NƠI NHẬN');
  });

  if (sigLineIdx >= 0) {
    const foundPos = bottomLines[sigLineIdx].replace(/TM\.|KT\.|TL\./gi, '').trim();
    if (foundPos && foundPos.length < 50) {
      signerPosition = foundPos;
    }
    // Dòng họ tên thường nằm dưới dòng chức danh
    for (let i = sigLineIdx + 1; i < bottomLines.length; i++) {
      const candidate = bottomLines[i];
      if (/^\(.*\)$/.test(candidate) || candidate.toLowerCase().includes('nơi nhận') || candidate.toLowerCase().includes('lưu:')) {
        continue;
      }
      const words = candidate.split(/\s+/);
      if (words.length >= 2 && words.length <= 5 && !/[0-9:;_\-\/]/.test(candidate)) {
        const isNameLike = words.every((w) => /^[A-ZÀ-Ỹ]/.test(w));
        if (isNameLike) {
          signer = candidate;
          break;
        }
      }
    }
  }

  // Nhận diện một số lãnh đạo cấp cao nếu xuất hiện trong văn bản
  if (!signer) {
    if (upperText.includes('TRẦN THANH MẪN')) signer = 'Trần Thanh Mẫn';
    else if (upperText.includes('VƯƠNG ĐÌNH HUỆ')) signer = 'Vương Đình Huệ';
    else if (upperText.includes('PHẠM MINH CHÍNH')) signer = 'Phạm Minh Chính';
    else if (upperText.includes('NGUYỄN KHẮC ĐỊNH')) signer = 'Nguyễn Khắc Định';
    else if (upperText.includes('TRẦN HỒNG HÀ')) signer = 'Trần Hồng Hà';
    else if (upperText.includes('LÊ THÀNH LONG')) signer = 'Lê Thành Long';
    else if (upperText.includes('HỒ ĐỨC PHỚC')) signer = 'Hồ Đức Phớc';
    else if (upperText.includes('BÙI THANH SƠN')) signer = 'Bùi Thanh Sơn';
  }

  if (!signer && signerPosition) {
    signer = signerPosition;
  }

  // 5. Find Issue Date
  const dateMatch = text.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3];
    issueDate = `${year}-${month}-${day}`;
  }

  // 6. Find Title / Trích yếu
  const veViecMatch = text.match(/(?:Về việc|V\/v)\s+([^\n\r]+)/i);
  if (veViecMatch) {
    title = `${docType} V/v ${veViecMatch[1].trim()}`;
  } else {
    const docTypeIdx = lines.findIndex((l) => l.toUpperCase() === docType.toUpperCase());
    if (docTypeIdx >= 0 && lines[docTypeIdx + 1]) {
      title = `${docType} - ${lines[docTypeIdx + 1]}`;
    }
  }

  if (!title) {
    title = fallbackTitle;
  }

  // 7. Summary
  const informativeLines = lines.filter(
    (l) =>
      !l.includes('CỘNG HÒA') &&
      !l.includes('Độc lập') &&
      !l.includes('Số:') &&
      !l.includes('ngày') &&
      l.length > 25
  );
  if (informativeLines.length > 0) {
    summary = informativeLines.slice(0, 3).join('. ');
    if (summary.length > 300) summary = summary.slice(0, 300) + '...';
  }

  return {
    docType,
    documentNumber,
    issuingAuthority,
    issueDate,
    title,
    signer,
    signerPosition,
    summary,
  };
}

// Convert File / Blob to Base64 string
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Utility to extract clean text & metadata from uploaded files (DOCX, PDF, Images/Scans, TXT, MD, etc.)
 * Uses client-side PDF text stream decoding for instant local extraction without API keys,
 * Mammoth for Word files (.docx), and Gemini Multimodal OCR for scanned photos and image files.
 */
export async function extractTextFromFile(file: File): Promise<ExtractedDocumentData> {
  const fileName = file.name || 'document';
  const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  try {
    // 1. Handle DOCX files (Microsoft Word 2007+)
    if (extension === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawExtracted = result.value ? result.value.trim() : '';

      if (!rawExtracted) {
        return {
          title: cleanTitle,
          text: '',
          success: false,
          error: 'Tệp Word (.docx) không có nội dung văn bản hoặc chỉ chứa hình ảnh quét.',
        };
      }

      const normalizedText = rawExtracted.replace(/\n{3,}/g, '\n\n');
      const meta = parseVietnameseDocMetadata(normalizedText, cleanTitle);

      return {
        title: meta.title || cleanTitle,
        text: normalizedText,
        documentNumber: meta.documentNumber,
        issuingAuthority: meta.issuingAuthority,
        issueDate: meta.issueDate,
        docType: meta.docType,
        signer: meta.signer,
        signerPosition: meta.signerPosition,
        summary: meta.summary,
        success: true,
      };
    }

    // 2. Handle PDF files (Direct Client-Side Text Extraction + Multimodal Vision OCR Fallback)
    const isPdf = extension === 'pdf' || file.type === 'application/pdf';
    if (isPdf) {
      // Step 2.1: Try instant browser client-side PDF text extraction
      try {
        const rawPdfText = await pdfToText(file);
        if (rawPdfText && rawPdfText.trim().length > 30) {
          const cleanText = rawPdfText
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          const meta = parseVietnameseDocMetadata(cleanText, cleanTitle);

          return {
            title: meta.title || cleanTitle,
            text: cleanText,
            documentNumber: meta.documentNumber,
            issuingAuthority: meta.issuingAuthority,
            issueDate: meta.issueDate,
            docType: meta.docType,
            signer: meta.signer,
            signerPosition: meta.signerPosition,
            summary: meta.summary,
            success: true,
          };
        }
      } catch (localPdfErr: any) {
        console.warn('[PDF Client Extraction Note]:', localPdfErr?.message || localPdfErr);
      }

      // Step 2.2: If local extraction yielded empty text (scanned photo PDF), call backend Gemini Vision OCR
      try {
        const base64 = await fileToBase64(file);
        const ocrResponse = await fetch(apiUrl('/api/ai/ocr-document'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            mimeType: 'application/pdf',
            fileName: file.name,
          }),
        });

        if (ocrResponse.ok) {
          const json = await ocrResponse.json();
          if (json.success && json.result) {
            const res = json.result;
            const fullText = (res.fullText || res.summary || '').trim();
            if (fullText.length > 30) {
              return {
                title: res.title || cleanTitle,
                text: fullText,
                documentNumber: res.documentNumber,
                issuingAuthority: res.issuingAuthority,
                issueDate: res.issueDate,
                docType: res.docType,
                signer: res.signer,
                summary: res.summary,
                success: true,
              };
            }
          }
        }
      } catch (ocrErr: any) {
        console.warn('AI OCR fallback failed:', ocrErr?.message || ocrErr);
      }

      // If both failed to extract real textual content
      return {
        title: cleanTitle,
        text: '',
        success: false,
        error: `Tệp PDF "${file.name}" là bản scan hình ảnh thuần túy hoặc không có lớp văn bản số. Vui lòng mở tệp để copy/dán nội dung, hoặc tải văn bản mẫu trong hệ thống để phân loại.`,
      };
    }

    // 3. Handle Scanned Images (Photos, Scans - PNG, JPG, WEBP, etc.)
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff'].includes(extension) || file.type.startsWith('image/');
    if (isImage) {
      try {
        const base64 = await fileToBase64(file);
        const mimeType = file.type || 'image/jpeg';

        const ocrResponse = await fetch(apiUrl('/api/ai/ocr-document'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            mimeType,
            fileName: file.name,
          }),
        });

        if (ocrResponse.ok) {
          const json = await ocrResponse.json();
          if (json.success && json.result) {
            const res = json.result;
            const fullText = res.fullText || res.summary || '';
            return {
              title: res.title || cleanTitle,
              text: fullText,
              documentNumber: res.documentNumber,
              issuingAuthority: res.issuingAuthority,
              issueDate: res.issueDate,
              docType: res.docType,
              signer: res.signer,
              summary: res.summary,
              success: true,
            };
          }
        }
      } catch (ocrErr: any) {
        console.warn('Image OCR failed:', ocrErr?.message || ocrErr);
      }

      return {
        title: cleanTitle,
        text: '',
        success: false,
        error: `Không thể nhận dạng chữ từ ảnh "${file.name}". Vui lòng kiểm tra kết nối mạng hoặc dán nội dung văn bản trực tiếp.`,
      };
    }

    // 4. Handle standard Text files (.txt, .md, .csv, .json, .log, .rtf)
    if (
      ['txt', 'md', 'csv', 'json', 'log', 'rtf', 'tsv', 'xml', 'html', 'htm'].includes(extension) ||
      file.type.startsWith('text/')
    ) {
      const text = await file.text();
      const meta = parseVietnameseDocMetadata(text, cleanTitle);
      return {
        title: meta.title || cleanTitle,
        text: text.trim(),
        documentNumber: meta.documentNumber,
        issuingAuthority: meta.issuingAuthority,
        issueDate: meta.issueDate,
        docType: meta.docType,
        signer: meta.signer,
        summary: meta.summary,
        success: true,
      };
    }

    // 5. Handle legacy DOC (binary)
    if (extension === 'doc') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (result.value && result.value.trim().length > 0) {
          const meta = parseVietnameseDocMetadata(result.value.trim(), cleanTitle);
          return {
            title: meta.title || cleanTitle,
            text: result.value.trim(),
            documentNumber: meta.documentNumber,
            issuingAuthority: meta.issuingAuthority,
            issueDate: meta.issueDate,
            docType: meta.docType,
            signer: meta.signer,
            summary: meta.summary,
            success: true,
          };
        }
      } catch {
        // Not a docx
      }

      return {
        title: cleanTitle,
        text: '',
        success: false,
        error: `Tệp Word cũ .doc là file nhị phân. Vui lòng chuyển sang định dạng .docx (Word 2010+) hoặc mở file và copy/paste toàn văn bản để hệ thống phân tích.`,
      };
    }

    // 6. Fallback for other files - test if binary (ZIP header PK\x03\x04)
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
    const isZipOrDocx = bytes[0] === 0x50 && bytes[1] === 0x4b; // 'PK'

    if (isZipOrDocx) {
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (result.value && result.value.trim()) {
          return {
            title: cleanTitle,
            text: result.value.trim(),
            success: true,
          };
        }
      } catch {
        // Ignore
      }
    }

    // Try text decode
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const decoded = textDecoder.decode(arrayBuffer);
    const nonPrintableCount = (decoded.slice(0, 1000).match(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g) || []).length;
    if (nonPrintableCount > 20) {
      return {
        title: cleanTitle,
        text: '',
        success: false,
        error: `Tệp ${file.name} ở định dạng nhị phân không xác định. Vui lòng tải tệp Word (.docx), PDF (.pdf) hoặc văn bản thuần (.txt).`,
      };
    }

    return {
      title: cleanTitle,
      text: decoded.trim(),
      success: true,
    };
  } catch (err: any) {
    return {
      title: cleanTitle,
      text: '',
      success: false,
      error: `Không thể đọc tệp: ${err.message || 'Lỗi không xác định'}`,
    };
  }
}

/**
 * Trích xuất nội dung văn bản từ Data URL (base64) của tệp đính kèm đã lưu trong hệ thống
 */
export async function extractTextFromDataUrl(dataUrl: string, fileName: string): Promise<ExtractedDocumentData> {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      return { title: fileName, text: '', success: false, error: 'URL không đúng định dạng dữ liệu DataURL' };
    }
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: blob.type });
    return await extractTextFromFile(file);
  } catch (err: any) {
    return {
      title: fileName,
      text: '',
      success: false,
      error: err.message || 'Lỗi khi giải mã tệp dữ liệu đính kèm',
    };
  }
}

