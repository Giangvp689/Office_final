import mammoth from 'mammoth';

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
  summary?: string;
}

// Convert File / Blob to Base64 string
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix (e.g. "data:application/pdf;base64,")
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Utility to extract clean text & metadata from uploaded files (DOCX, PDF, Images/Scans, TXT, MD, etc.)
 * Uses AI Vision OCR for PDFs and Scanned Images, and Mammoth for Word files (.docx).
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

      // Clean up multiple consecutive line breaks
      const normalizedText = rawExtracted.replace(/\n{3,}/g, '\n\n');
      return {
        title: cleanTitle,
        text: normalizedText,
        success: true,
      };
    }

    // 2. Handle PDF files & Scanned Images (Multimodal AI OCR)
    const isPdf = extension === 'pdf' || file.type === 'application/pdf';
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff'].includes(extension) || file.type.startsWith('image/');

    if (isPdf || isImage) {
      try {
        const base64 = await fileToBase64(file);
        const mimeType = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');

        const ocrResponse = await fetch('/api/ai/ocr-document', {
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
        console.warn('AI OCR failed, falling back to local extraction:', ocrErr?.message || ocrErr);
      }

      // Fallback if OCR service isn't reachable
      return {
        title: cleanTitle,
        text: `[Tệp ${isPdf ? 'PDF' : 'Ảnh'}: ${file.name} - ${(file.size / 1024).toFixed(1)} KB]\n(Đã tiếp nhận tệp đính kèm)`,
        success: true,
      };
    }

    // 3. Handle standard Text files (.txt, .md, .csv, .json, .log, .rtf)
    if (
      ['txt', 'md', 'csv', 'json', 'log', 'rtf', 'tsv', 'xml', 'html', 'htm'].includes(extension) ||
      file.type.startsWith('text/')
    ) {
      const text = await file.text();
      return {
        title: cleanTitle,
        text: text.trim(),
        success: true,
      };
    }

    // 4. Handle legacy DOC (binary)
    if (extension === 'doc') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (result.value && result.value.trim().length > 0) {
          return {
            title: cleanTitle,
            text: result.value.trim(),
            success: true,
          };
        }
      } catch {
        // Not a docx
      }

      return {
        title: cleanTitle,
        text: `[Tệp Word cũ .DOC: ${file.name}]\nLưu ý: Định dạng .doc cũ là file nhị phân. Vui lòng chuyển sang định dạng .docx (Word 2010+) hoặc mở file và copy/paste toàn văn bản để AI phân tích chuẩn xác.`,
        success: true,
      };
    }

    // 5. Fallback for other files - test if binary (ZIP header PK\x03\x04)
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
        error: `Tệp ${file.name} ở định dạng nhị phân. Vui lòng tải tệp Word (.docx), PDF (.pdf) hoặc văn bản thuần (.txt).`,
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

