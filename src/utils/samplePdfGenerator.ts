import { jsPDF } from 'jspdf';

export interface SampleDocPreset {
  id: string;
  title: string;
  category: string;
  documentNumber: string;
  authority: string;
  signer: string;
  date: string;
  urgency: 'Bình thường' | 'Khẩn' | 'Hỏa tốc';
  fileName: string;
  bodyParagraphs: string[];
}

export const SAMPLE_DOCUMENTS: SampleDocPreset[] = [
  {
    id: 'cong-van-hoa-toc',
    title: 'V/v khẩn trương triển khai các biện pháp bảo đảm an toàn thông tin mạng và số hóa hồ sơ năm 2025',
    category: 'Công văn',
    documentNumber: '1428/UBND-VP',
    authority: 'ỦY BAN NHÂN DÂN THÀNH PHỐ',
    signer: 'KT. CHỦ TỊCH - PHÓ CHỦ TỊCH\nNguyễn Văn Hoàng',
    date: '2025-08-15',
    urgency: 'Hỏa tốc',
    fileName: 'CongVan_1428_UBND_HoaToc_SoHoa.pdf',
    bodyParagraphs: [
      'Kính gửi: Giám đốc các Sở, Thủ trưởng các Ban, Ngành; Chủ tịch UBND các Quận, Huyện.',
      'Thực hiện chỉ đạo của Thủ tướng Chính phủ và Bộ Thông tin và Truyền thông về việc tăng cường công tác bảo đảm an toàn, an ninh mạng và đẩy mạnh chuyển đổi số quốc gia trong các cơ quan nhà nước;',
      'Chủ tịch Ủy ban nhân dân Thành phố yêu cầu Thủ trưởng các cơ quan, đơn vị khẩn trương triển khai thực hiện các nhiệm vụ trọng tâm sau:',
      '1. Sở Thông tin và Truyền thông chủ trì, phối hợp với Công an thành phố tiến hành rà soát, đánh giá tổng thể an toàn thông tin đối với 100% hệ thống thông tin, cơ sở dữ liệu dùng chung trước ngày 20/09/2025.',
      '2. Sở Nội vụ phối hợp với Văn phòng UBND thành phố hướng dẫn các đơn vị chuẩn hóa quy trình tiếp nhận, xử lý và lưu trữ văn bản điện tử có chữ ký số theo đúng Nghị định số 30/2020/NĐ-CP.',
      '3. UBND các quận, huyện bố trí đầy đủ trang thiết bị scan tốc độ cao, hoàn thành việc số hóa 100% hồ sơ tiếp nhận tại Bộ phận Một cửa chậm nhất ngày 30/10/2025.',
      'Yêu cầu các đồng chí Thủ trưởng đơn vị nghiêm túc triển khai thực hiện./.'
    ]
  },
  {
    id: 'quyet-dinh-kinh-phi',
    title: 'Phê duyệt dự toán và phân bổ kinh phí nâng cấp hạ tầng số, triển khai Trí tuệ nhân tạo (AI) trong quản lý văn bản',
    category: 'Quyết định',
    documentNumber: '356/QĐ-STC',
    authority: 'SỞ TÀI CHÍNH',
    signer: 'GIÁM ĐỐC\nTrần Đình Trọng',
    date: '2025-08-10',
    urgency: 'Khẩn',
    fileName: 'QuyetDinh_356_STC_KinhPhiAI.pdf',
    bodyParagraphs: [
      'Căn cứ Luật Ngân sách Nhà nước số 83/2015/QH13;',
      'Căn cứ Quyết định số 749/QĐ-TTg của Thủ tướng Chính phủ phê duyệt Chương trình Chuyển đổi số quốc gia;',
      'Xét đề nghị của Trưởng phòng Quản lý Ngân sách và Giám đốc Trung tâm Công nghệ Thông tin;',
      'QUYẾT ĐỊNH:',
      'Điều 1. Phê duyệt dự toán kinh phí triển khai Dự án "Nâng cấp hệ thống Quản lý Văn bản và Điều hành tích hợp AI OCR thông minh" với tổng kinh phí là 2.850.000.000 đồng (Hai tỷ tám trăm năm mươi triệu đồng chẵn) từ nguồn vốn sự nghiệp công nghệ thông tin năm 2025.',
      'Điều 2. Giao Văn phòng Sở phối hợp với Phòng Kế hoạch - Tài chính thực hiện thủ tục đấu thầu mua sắm, nghiệm thu và quyết toán theo đúng quy định hiện hành.',
      'Điều 3. Chánh Văn phòng, Trưởng các phòng chuyên môn và các đơn vị liên quan chịu trách nhiệm thi hành Quyết định này kể từ ngày ký./.'
    ]
  },
  {
    id: 'thong-bao-tap-huan',
    title: 'Thông báo về việc tổ chức Hội nghị tập huấn sử dụng Hệ thống Quản lý văn bản điện tử và Trợ lý ảo AI',
    category: 'Thông báo',
    documentNumber: '89/TB-VPUBND',
    authority: 'VĂN PHÒNG ỦY BAN NHÂN DÂN',
    signer: 'CHÁNH VĂN PHÒNG\nLê Thị Mai Anh',
    date: '2025-08-18',
    urgency: 'Bình thường',
    fileName: 'ThongBao_89_VP_TapHuanAI.pdf',
    bodyParagraphs: [
      'Để nâng cao kỹ năng ứng dụng công nghệ thông tin và khai thác hiệu quả tính năng Trợ lý AI, Văn phòng UBND thông báo kế hoạch tổ chức tập huấn như sau:',
      '1. Thời gian: 08 giờ 30 phút, ngày 28 tháng 08 năm 2025 (Thứ Năm).',
      '2. Địa điểm: Hội trường tầng 3, Trụ sở UBND Thành phố (kết hợp trực tuyến qua cầu truyền hình đến các điểm cầu Quận, Huyện).',
      '3. Thành phần tham dự: Lãnh đạo Văn phòng, Trưởng bộ phận Văn thư - Lưu trữ và cán bộ phụ trách CNTT của các Sở, Ban, Ngành và UBND cấp huyện.',
      '4. Nội dung: Hướng dẫn quét OCR văn bản scan, phân loại tự động luồng tiếp nhận bằng AI, phát hiện trùng lặp và tra cứu văn bản thông minh.',
      'Đề nghị các đơn vị gửi danh sách đại biểu tham dự về Văn phòng trước 16h00 ngày 25/08/2025 để tổng hợp./.'
    ]
  }
];

/**
 * Generates a clean, standard A4 PDF document simulating an official Vietnamese administrative document.
 */
export function generateSamplePdf(preset: SampleDocPreset): { blob: Blob; file: File; url: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header Left (Authority)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(preset.authority, margin, 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`Số: ${preset.documentNumber}`, margin, 31);
  if (preset.urgency !== 'Bình thường') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`[${preset.urgency.toUpperCase()}]`, margin + 45, 31);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
  }

  // Header Right (Nation title)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const national1 = 'CONG HOA XA HOI CHU NGHIA VIET NAM';
  const national2 = 'Doc lap - Tu do - Hanh phuc';
  doc.text(national1, pageWidth - margin, 25, { align: 'right' });
  doc.setFont('helvetica', 'italic');
  doc.text(national2, pageWidth - margin, 30, { align: 'right' });

  // Divider lines
  doc.setLineWidth(0.3);
  doc.line(pageWidth - margin - 50, 32, pageWidth - margin, 32);
  doc.line(margin, 33, margin + 35, 33);

  // Date
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'italic');
  doc.text(`Ngay ${preset.date.split('-')[2]} thang ${preset.date.split('-')[1]} nam ${preset.date.split('-')[0]}`, pageWidth - margin, 39, { align: 'right' });

  // Document Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(preset.title, pageWidth - margin * 2);
  doc.text(titleLines, pageWidth / 2, 50, { align: 'center' });

  // Body content
  let currentY = 54 + (titleLines.length * 6);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');

  preset.bodyParagraphs.forEach((p) => {
    const isHeading = p.startsWith('QUYẾT ĐỊNH') || p.startsWith('QUYET DINH');
    if (isHeading) {
      doc.setFont('helvetica', 'bold');
      currentY += 2;
      doc.text(p, pageWidth / 2, currentY, { align: 'center' });
      currentY += 7;
      doc.setFont('helvetica', 'normal');
    } else {
      const pLines = doc.splitTextToSize(p, pageWidth - margin * 2);
      doc.text(pLines, margin, currentY);
      currentY += (pLines.length * 5.5) + 3;
    }
  });

  // Footer / Signer
  currentY = Math.max(currentY + 10, 220);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const signerLines = preset.signer.split('\n');
  signerLines.forEach((line, index) => {
    doc.text(line, pageWidth - margin - 30, currentY + (index * 6), { align: 'center' });
  });

  // Red stamp simulation circle
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.8);
  doc.circle(pageWidth - margin - 45, currentY + 15, 12);
  doc.setFontSize(7);
  doc.setTextColor(220, 38, 38);
  doc.text('DA KY SO & DONG DAU', pageWidth - margin - 45, currentY + 15, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  const pdfOutput = doc.output('blob');
  const file = new File([pdfOutput], preset.fileName, { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfOutput);

  return { blob: pdfOutput, file, url };
}

/**
 * Trigger immediate browser download of the sample PDF file
 */
export function downloadSamplePdfFile(preset: SampleDocPreset) {
  const { blob, file } = generateSamplePdf(preset);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

/**
 * Remove Vietnamese accents for clean PDF rendering in default jsPDF helvetica
 */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Tạo tệp PDF Báo cáo kết quả xử lý công việc chuẩn hành chính của Chuyên viên
 */
export function generateTaskResultReportPdf(
  task: { code: string; title: string; description?: string; subTasks?: { title: string; completed: boolean }[] },
  staff: { fullName: string; department?: string; position?: string },
  customNote?: string
): { blob: Blob; file: File; url: string; base64: string; fileName: string; fileSize: number } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  // Header Left (Agency)
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  const agencyText = removeVietnameseTones(staff.department || 'VAN PHONG CO QUAN');
  doc.text(agencyText.toUpperCase(), margin, 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`So: BC-${task.code.replace(/[^a-zA-Z0-9]/g, '')}`, margin, 27);
  doc.setLineWidth(0.3);
  doc.line(margin, 29, margin + 40, 29);

  // Header Right (Nation)
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONG HOA XA HOI CHU NGHIA VIET NAM', pageWidth - margin, 22, { align: 'right' });
  doc.setFont('helvetica', 'italic');
  doc.text('Doc lap - Tu do - Hanh phuc', pageWidth - margin, 27, { align: 'right' });
  doc.setLineWidth(0.3);
  doc.line(pageWidth - margin - 50, 29, pageWidth - margin, 29);

  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Ngay ${day} thang ${month} nam ${year}`, pageWidth - margin, 36, { align: 'right' });

  // Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('BAO CAO KET QUA HOAN THANH NHIEM VU', pageWidth / 2, 46, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'italic');
  doc.text(`(Nhiem vu: ${removeVietnameseTones(task.code)} - ${removeVietnameseTones(task.title.slice(0, 50))})`, pageWidth / 2, 52, { align: 'center' });

  // To Leader
  let currentY = 62;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Kinh gui: Thu truong don vi / Lanh dao phu trach', margin, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Can bo bao cao: ${removeVietnameseTones(staff.fullName)}`, margin, currentY);
  doc.text(`Chuc vu / Phong ban: ${removeVietnameseTones(staff.position || staff.department || 'Chuyen vien')}`, margin + 85, currentY);

  currentY += 7;
  doc.text(`Ma nhiem vu: ${removeVietnameseTones(task.code)}`, margin, currentY);
  doc.text(`Ngay trinh bao cao: ${day}/${month}/${year}`, margin + 85, currentY);

  // Divider
  currentY += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // Section 1: Overview
  doc.setFont('helvetica', 'bold');
  doc.text('I. NOI DUNG NHIEM VU DUOC GIAO:', margin, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const taskDesc = removeVietnameseTones(task.description || task.title);
  const descLines = doc.splitTextToSize(taskDesc, pageWidth - margin * 2);
  doc.text(descLines, margin, currentY);
  currentY += descLines.length * 5 + 4;

  // Section 2: Subtasks / checklist
  doc.setFont('helvetica', 'bold');
  doc.text('II. KET QUA TRIEN KHAI CAC HANG MUC CONG VIEC:', margin, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');

  const subTasks = task.subTasks && task.subTasks.length > 0 ? task.subTasks : [
    { title: 'Nghien cuu van ban va ho so lien quan', completed: true },
    { title: 'Xay dung phuong an xu ly va thuc hien', completed: true },
    { title: 'Hoan thien san pham dau ra va du thao bao cao', completed: true }
  ];

  subTasks.forEach((st, idx) => {
    const statusText = st.completed ? '[DA HOAN THANH - 100%]' : '[DANG TIEN HANH]';
    const stLine = `${idx + 1}. ${removeVietnameseTones(st.title)}: ${statusText}`;
    doc.text(stLine, margin + 4, currentY);
    currentY += 5.5;
  });

  currentY += 3;

  // Section 3: Summary & Proposal
  doc.setFont('helvetica', 'bold');
  doc.text('III. KET QUA THUC TE VA KIEN NGHI THAM DINH:', margin, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const noteContent = customNote?.trim()
    ? removeVietnameseTones(customNote)
    : 'Can bo da hoan thanh day du toan bo noi dung va san pham dau ra theo dung yeu cau. Cac tai lieu dinh kem, so lieu tong hop da duoc kiem tra ky luong va dap ung tien do.';
  const noteLines = doc.splitTextToSize(noteContent, pageWidth - margin * 2);
  doc.text(noteLines, margin, currentY);
  currentY += noteLines.length * 5 + 4;

  // Proposal
  doc.text('Kinh trinh Lanh dao xem xet phe duyet va nghiem thu hoan thanh nhiem vu theo quy dinh./.', margin, currentY);

  // Signer block
  currentY = Math.max(currentY + 16, 230);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('NGUOI BAO CAO', pageWidth - margin - 35, currentY, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.text('(Ky va ghi ro ho ten)', pageWidth - margin - 35, currentY + 5, { align: 'center' });

  // Signature box
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Blue for signature
  doc.text(removeVietnameseTones(staff.fullName), pageWidth - margin - 35, currentY + 28, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  const fileName = `BaoCao_KetQua_${task.code.replace(/[^a-zA-Z0-9]/g, '_')}_${day}${month}${year}.pdf`;
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  const base64 = doc.output('datauristring');

  return {
    blob: pdfBlob,
    file,
    url,
    base64,
    fileName,
    fileSize: pdfBlob.size,
  };
}
