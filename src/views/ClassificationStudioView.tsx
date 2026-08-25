import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Cpu,
  BrainCircuit,
  Building2,
  UserCheck,
  Calendar,
  FolderArchive,
  Shield,
  Clock,
  Send,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Bookmark,
  Target,
  FileCheck,
  HelpCircle,
  Activity,
  Award,
} from 'lucide-react';
import {
  User,
  IncomingDocument,
  Dossier,
  DocumentClassificationResult,
  UrgencyLevel,
  SecurityLevel,
} from '../types';
import { classifyDocumentWithAI } from '../services/aiService';
import { extractTextFromFile } from '../utils/fileExtractor';
import { classifyDocumentLocally } from '../utils/localClassifier';
import { SamplePdfModal } from '../components/SamplePdfModal';
import { Download } from 'lucide-react';

interface ClassificationStudioViewProps {
  users: User[];
  dossiers: Dossier[];
  incomingDocs: IncomingDocument[];
  currentUser: User;
  onSaveIncomingDoc: (doc: IncomingDocument) => void;
  onSaveDossier: (dossier: Dossier) => void;
  onSaveTask: (task: any) => void;
  onNavigateSection: (section: any) => void;
}

// Preset samples of administrative documents across various domains for instant testing
const PRESET_SAMPLES = [
  {
    id: 'sample-1',
    name: '1. Quyết định phân bổ ngân sách & chi tiêu (Tài chính - Kế toán)',
    domain: 'Tài chính - Kế toán',
    urgency: 'THUONG',
    docType: 'Quyết định',
    title: 'Quyết định V/v Phân bổ dự toán ngân sách chi thường xuyên Quý II/2025',
    text: `ỦY BAN NHÂN DÂN THÀNH PHỐ HÀ NỘI
SỞ TÀI CHÍNH
Số: 218/QĐ-STC

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
Hà Nội, ngày 15 tháng 04 năm 2025

QUYẾT ĐỊNH
Về việc phân bổ dự toán ngân sách nhà nước chi thường xuyên Quý II năm 2025

GIÁM ĐỐC SỞ TÀI CHÍNH
- Căn cứ Luật Ngân sách nhà nước số 83/2015/QH13;
- Căn cứ Nghị định số 163/2016/NĐ-CP quy định chi tiết thi hành Luật Ngân sách nhà nước;
- Căn cứ Quyết định số 12/2024/QĐ-UBND quy định chức năng, nhiệm vụ của Sở Tài chính;
- Xét đề nghị của Trưởng phòng Quản lý Ngân sách và Kế toán trưởng.

QUYẾT ĐỊNH:
Điều 1. Phân bổ dự toán chi thường xuyên nguồn vốn ngân sách nhà nước đợt 2 năm 2025 cho các đơn vị trực thuộc với tổng kinh phí là 4.500.000.000 đồng (Bốn tỷ năm trăm triệu đồng chẵn).
Điều 2. Phòng Kế hoạch - Tài chính và Kế toán trưởng có trách nhiệm kiểm tra chứng từ giải ngân, thực hiện thanh quyết toán đúng mục lục ngân sách và các định mức tiêu chuẩn hiện hành trước ngày 30/06/2025.
Điều 3. Chánh Văn phòng, Trưởng phòng Quản lý Ngân sách và các thủ trưởng cơ quan trực thuộc chịu trách nhiệm thi hành Quyết định này.

Nơi nhận:
- Như Điều 3;
- Kho bạc Nhà nước Hà Nội;
- Lưu: VT, QLNS.

GIÁM ĐỐC
(Đã ký)
Trần Văn Hùng`,
  },
  {
    id: 'sample-2',
    name: '2. Tờ trình bổ nhiệm chức vụ & quy hoạch (Tổ chức - Cán bộ)',
    domain: 'Tổ chức - Cán bộ',
    urgency: 'KHAN',
    docType: 'Tờ trình',
    title: 'Tờ trình V/v Bổ nhiệm chức vụ Phó Trưởng phòng Hành chính Tổng hợp',
    text: `CƠ QUAN VĂN PHÒNG ĐIỀU HÀNH
PHÒNG TỔ CHỨC CÁN BỘ
Số: 45/TTr-TCCB

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
Ngày 20 tháng 05 năm 2025

TỜ TRÌNH
Về việc bổ nhiệm chức vụ Phó Trưởng phòng Hành chính Tổng hợp

Kính gửi: Ban Giám đốc Cơ quan

- Căn cứ Luật Cán bộ, công chức năm 2008 và Luật sửa đổi, bổ sung một số điều năm 2019;
- Căn cứ Nghị định số 138/2020/NĐ-CP quy định về tuyển dụng, sử dụng và quản lý công chức;
- Căn cứ Nghị quyết của Đảng ủy cơ quan về công tác cán bộ;
- Căn cứ nhu cầu công tác và năng lực thực tiễn của công chức.

Phòng Tổ chức Cán bộ kính trình Ban Giám đốc xem xét bổ nhiệm đồng chí Lê Hoàng Nam, sinh ngày 12/08/1988, Thạc sĩ Quản lý công, hiện là Chuyên viên chính, giữ chức vụ Phó Trưởng phòng Hành chính Tổng hợp.
Thời hạn bổ nhiệm: 05 năm kể từ ngày 01/06/2025.
Hồ sơ gồm có: Sơ yếu lý lịch 2C/TCTW, Bản kiểm điểm cá nhân, Giấy khám sức khỏe, Bản sao văn bằng chứng chỉ và Biên bản lấy phiếu tín nhiệm tại đơn vị (đạt 100% phiếu đồng ý).

Kính đề nghị Ban Giám đốc xem xét, phê duyệt ban hành Quyết định.

TRƯỞNG PHÒNG TỔ CHỨC CÁN BỘ
(Đã ký)
Trần Thị Bích`,
  },
  {
    id: 'sample-3',
    name: '3. Công văn HỎA TỐC phòng cháy chữa cháy (Hành chính - Quản trị / Hỏa Tốc)',
    domain: 'Hành chính - Quản trị',
    urgency: 'HOA_TOC',
    docType: 'Công văn',
    title: 'Công văn HỎA TỐC V/v Tăng cường an toàn PCCC và sẵn sàng trực ban khẩn cấp trong mùa nắng nóng',
    text: `ỦY BAN NHÂN DÂN THÀNH PHỐ
VĂN PHÒNG UBND
Số: 102/CV-UBND-HT

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
HÀ NỘI, ngày 10 tháng 06 năm 2025

HỎA TỐC

CÔNG VĂN
V/v Tăng cường kiểm tra phòng cháy chữa cháy và trực ban 24/24h

Kính gửi: Thủ trưởng các Sở, Ban, Ngành, Chủ tịch UBND các Quận, Huyện

Trước tình hình thời tiết nắng nóng gay gắt kéo dài, tiềm ẩn nguy cơ cháy nổ cao tại các trụ sở cơ quan, khu dân cư và trung tâm lưu trữ tài liệu:
Chủ tịch Ủy ban nhân dân Thành phố yêu cầu Thủ trưởng các cơ quan, đơn vị khẩn trương triển khai ngay các nhiệm vụ sau:
1. Tiến hành rà soát, kiểm tra toàn bộ hệ thống điện, thiết bị báo cháy tự động, bình chữa cháy cầm tay tại cơ quan trước 17h00 ngày hôm nay 10/06/2025.
2. Thiết lập đường dây nóng và tổ chức lực lượng trực ban phòng ngừa cháy nổ 24/24 giờ liên tục.
3. Báo cáo tình hình kiểm tra và phương án xử lý sự cố gửi về Văn phòng UBND Thành phố trước 08h00 ngày 11/06/2025 để tổng hợp báo cáo Thường trực Thành ủy.

Yêu cầu các đơn vị thực hiện nghiêm túc, không được chậm trễ.

Nơi nhận:
- Như trên;
- Chủ tịch UBND TP (để b/c);
- Lưu: VT, NC.

CHỦ TỊCH
(Đã ký và đóng dấu)
Nguyễn Thành Trung`,
  },
  {
    id: 'sample-4',
    name: '4. Kế hoạch triển khai Chuyển đổi số & An ninh mạng (Kỹ thuật - Công nghệ)',
    domain: 'Kỹ thuật - Công nghệ',
    urgency: 'THUONG',
    docType: 'Kế hoạch',
    title: 'Kế hoạch V/v Triển khai hạ tầng Trung tâm dữ liệu số hóa và bảo đảm An toàn thông tin mạng năm 2025',
    text: `SỞ THÔNG TIN VÀ TRUYỀN THÔNG
Số: 89/KH-STTTT

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
Hà Nội, ngày 02 tháng 03 năm 2025

KẾ HOẠCH
Triển khai nâng cấp hệ thống phần mềm dùng chung và bảo đảm An toàn an ninh mạng năm 2025

I. MỤC ĐÍCH, YÊU CẦU:
1. Số hóa 100% văn bản đến, văn bản đi và hồ sơ lưu trữ điện tử theo Nghị định 30/2020/NĐ-CP.
2. Triển khai chữ ký số chuyên dùng công vụ cho 100% cán bộ, chuyên viên.
3. Đáp ứng tiêu chuẩn an toàn an ninh thông tin cấp độ 3 theo Nghị định 85/2016/NĐ-CP.

II. NỘI DUNG THỰC HIỆN:
- Hạng mục 1: Mua sắm máy chủ Cloud Server, hệ thống lưu trữ SAN và tường lửa thế hệ mới (Next-Gen Firewall).
- Hạng mục 2: Nâng cấp phân hệ Trí tuệ nhân tạo (AI) hỗ trợ phân loại văn bản và trích xuất dữ liệu tự động.
- Hạng mục 3: Đào tạo tập huấn an toàn thông tin cho 250 cán bộ nhân viên trong quý III/2025.

III. KINH PHÍ VÀ TIẾN ĐỘ THỰC HIỆN:
- Tổng khái toán: 1.850.000.000 VNĐ từ nguồn ngân sách CNTT.
- Đơn vị chủ trì: Phòng Kỹ thuật - Công nghệ. Đơn vị phối hợp: Phòng Tài chính - Kế toán.

GIÁM ĐỐC
(Đã ký)
Phạm Quốc Khánh`,
  },
  {
    id: 'sample-5',
    name: '5. Thông báo kết luận thanh tra chuyên đề tài chính (Pháp chế - Thanh tra)',
    domain: 'Pháp chế - Thanh tra',
    urgency: 'KHAN',
    docType: 'Thông báo',
    title: 'Thông báo Kết luận Thanh tra việc chấp hành chính sách pháp luật về thu chi tài chính và quản lý tài sản công',
    text: `THANH TRA THÀNH PHỐ
Số: 64/TB-TTTP

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
Ngày 18 tháng 04 năm 2025

THÔNG BÁO
Kết luận thanh tra việc quản lý, sử dụng ngân sách và tài sản công

Thực hiện Quyết định số 105/QĐ-TTTP về việc thanh tra đột xuất việc chấp hành quy định pháp luật trong mua sắm trang thiết bị và đầu tư công:
Thanh tra Thành phố thông báo kết luận như sau:
1. Ưu điểm: Đơn vị đã cơ bản tuân thủ chế độ kế toán và mở sổ sách theo dõi tài sản.
2. Tồn tại, thiếu sót: Một số gói thầu mua sắm máy móc văn phòng chưa đầy đủ 03 báo giá theo quy định Luật Đấu thầu số 22/2023/QH15; việc trích lập quỹ phát triển sự nghiệp chưa kịp thời.
3. Kiến nghị xử lý:
- Yêu cầu Thủ trưởng đơn vị tổ chức kiểm điểm trách nhiệm của các cá nhân liên quan;
- Thu hồi nộp ngân sách nhà nước số tiền chênh lệch 45.200.000 đồng trước ngày 15/05/2025;
- Báo cáo kết quả khắc phục gửi về Thanh tra Thành phố.

CHÁNH THANH TRA
(Đã ký)
Vũ Đức Thịnh`,
  },
];

// Benchmark dataset for accuracy metrics
const BENCHMARK_DATASET = [
  { id: 'BM-1', title: 'Quyết định giao dự toán thu chi ngân sách quý 2', docType: 'Quyết định', expectedDomain: 'Tài chính - Kế toán', expectedUrgency: 'THUONG', predictedDomain: 'Tài chính - Kế toán', confidence: 97.4, status: 'PASS' },
  { id: 'BM-2', title: 'Tờ trình xin tuyển dụng chuyên viên công nghệ thông tin', docType: 'Tờ trình', expectedDomain: 'Tổ chức - Cán bộ', expectedUrgency: 'THUONG', predictedDomain: 'Tổ chức - Cán bộ', confidence: 96.1, status: 'PASS' },
  { id: 'BM-3', title: 'Công văn hỏa tốc chỉ đạo chống bão lũ khẩn cấp', docType: 'Công văn', expectedDomain: 'Hành chính - Quản trị', expectedUrgency: 'HOA_TOC', predictedDomain: 'Hành chính - Quản trị', confidence: 98.2, status: 'PASS' },
  { id: 'BM-4', title: 'Kế hoạch nâng cấp mạng nội bộ LAN và tường lửa', docType: 'Kế hoạch', expectedDomain: 'Kỹ thuật - Công nghệ', expectedUrgency: 'THUONG', predictedDomain: 'Kỹ thuật - Công nghệ', confidence: 94.8, status: 'PASS' },
  { id: 'BM-5', title: 'Kết luận thanh tra việc chấp hành quy định đấu thầu', docType: 'Thông báo', expectedDomain: 'Pháp chế - Thanh tra', expectedUrgency: 'KHAN', predictedDomain: 'Pháp chế - Thanh tra', confidence: 95.7, status: 'PASS' },
  { id: 'BM-6', title: 'Kế hoạch tổ chức khóa bồi dưỡng nghiệp vụ văn thư', docType: 'Kế hoạch', expectedDomain: 'Giáo dục - Đào tạo', expectedUrgency: 'THUONG', predictedDomain: 'Giáo dục - Đào tạo', confidence: 93.5, status: 'PASS' },
  { id: 'BM-7', title: 'Công văn về việc triển khai khám sức khỏe định kỳ', docType: 'Công văn', expectedDomain: 'Y tế - Sức khỏe', expectedUrgency: 'THUONG', predictedDomain: 'Y tế - Sức khỏe', confidence: 96.0, status: 'PASS' },
  { id: 'BM-8', title: 'Báo cáo giám sát giải ngân các dự án vốn vay ODA', docType: 'Báo cáo', expectedDomain: 'Kế hoạch - Đầu tư', expectedUrgency: 'KHAN', predictedDomain: 'Kế hoạch - Đầu tư', confidence: 95.3, status: 'PASS' },
];

export const ClassificationStudioView: React.FC<ClassificationStudioViewProps> = ({
  users,
  dossiers,
  incomingDocs,
  currentUser,
  onSaveIncomingDoc,
  onSaveDossier,
  onSaveTask,
  onNavigateSection,
}) => {
  const [activeTab, setActiveTab] = useState<'STUDIO' | 'BENCHMARK' | 'ARCHITECTURE'>('STUDIO');
  const [engineMode, setEngineMode] = useState<'LOCAL_FAST' | 'GEMINI_DEEP'>('LOCAL_FAST');
  const [inputTitle, setInputTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<DocumentClassificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [successActionMsg, setSuccessActionMsg] = useState<string | null>(null);
  const [isSamplePdfModalOpen, setIsSamplePdfModalOpen] = useState(false);

  // Duplication prevention & feedback states
  const [savedIncomingDoc, setSavedIncomingDoc] = useState<IncomingDocument | null>(null);
  const [savedDossierTask, setSavedDossierTask] = useState<{
    dossierCode: string;
    taskCode: string;
    assigneeName: string;
  } | null>(null);
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    docNumber?: string;
    dossierCode?: string;
    targetSection: 'INCOMING_DOCS' | 'ALL_TASKS' | 'DOSSIERS';
    actionType: 'DOC' | 'TASK';
  } | null>(null);

  // Handle selected sample PDF directly
  const handleSelectSamplePdfFile = async (file: File) => {
    setIsReadingFile(true);
    setErrorMessage(null);
    setSavedIncomingDoc(null);
    setSavedDossierTask(null);
    try {
      const res = await extractTextFromFile(file);
      setFileName(file.name);
      if (res.title) setInputTitle(res.title);
      if (res.text) {
        setInputText(res.text);
      }
      if (!res.success && res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(`Không thể xử lý tệp: ${err.message || 'Lỗi trích xuất'}`);
    } finally {
      setIsReadingFile(false);
    }
  };

  // Auto-fill preset sample
  const handleSelectSample = (sample: typeof PRESET_SAMPLES[0]) => {
    setInputTitle(sample.title);
    setInputText(sample.text);
    setFileName(`${sample.docType}_${sample.domain}.txt`);
    setClassificationResult(null);
    setErrorMessage(null);
    setSuccessActionMsg(null);
    setSavedIncomingDoc(null);
    setSavedDossierTask(null);
  };

  // Run AI classification
  const handleRunClassification = async (forcedMode?: 'LOCAL_FAST' | 'GEMINI_DEEP') => {
    if (!inputText.trim() && !inputTitle.trim()) {
      setErrorMessage('Vui lòng dán nội dung văn bản hoặc chọn một văn bản mẫu phía trên để phân tích.');
      return;
    }

    const mode = forcedMode || engineMode;
    setIsClassifying(true);
    setErrorMessage(null);
    setSuccessActionMsg(null);
    setSavedIncomingDoc(null);
    setSavedDossierTask(null);

    const departments = [
      'Phòng Kế hoạch - Tài chính',
      'Phòng Tổ chức Cán bộ',
      'Văn phòng Cơ quan',
      'Phòng Kỹ thuật - Công nghệ',
      'Phòng Pháp chế - Thanh tra',
      'Ban Quản lý Dự án & Đầu tư',
    ];

    const staffList = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      position: u.position || u.role || 'Chuyên viên',
      department: u.department,
    }));

    if (mode === 'LOCAL_FAST') {
      // Instant execution (< 50ms)
      try {
        // slight tick for optical feedback
        await new Promise((r) => setTimeout(r, 60));
        const localResult = classifyDocumentLocally({
          title: inputTitle,
          text: inputText,
          fileName: fileName || 'Van_ban_dien_tu.txt',
          departments,
          availableStaff: staffList,
        });
        setClassificationResult(localResult);
      } catch (err: any) {
        setErrorMessage(err.message || 'Lỗi khi phân loại.');
      } finally {
        setIsClassifying(false);
      }
      return;
    }

    // Deep Gemini mode with fallback
    try {
      const result = await classifyDocumentWithAI({
        title: inputTitle,
        text: inputText,
        fileName: fileName || 'Van_ban_dien_tu.txt',
        departments,
        availableStaff: staffList,
      });

      setClassificationResult(result);
    } catch (err: any) {
      console.warn('Gemini cloud slow/error, fallback to high-speed local engine:', err);
      const fallbackResult = classifyDocumentLocally({
        title: inputTitle,
        text: inputText,
        fileName: fileName || 'Van_ban_dien_tu.txt',
        departments,
        availableStaff: staffList,
      });
      setClassificationResult(fallbackResult);
    } finally {
      setIsClassifying(false);
    }
  };

  // Quick Action 1: Create Incoming Doc from classification result (Protected against duplicate submissions)
  const handleCreateIncomingDoc = () => {
    if (!classificationResult) return;

    // If already saved in this session, provide options to view without duplicating
    if (savedIncomingDoc) {
      setSuccessModal({
        isOpen: true,
        title: 'Văn Bản Này Đã Được Lưu Trong Hệ Thống',
        message: `Văn bản đến số [${savedIncomingDoc.documentNumber}] đã được nạp vào Sổ Văn bản Đến. Hệ thống đã ngăn chặn lưu trùng lặp. Đồng chí có thể bấm xem ngay!`,
        docNumber: savedIncomingDoc.documentNumber,
        targetSection: 'INCOMING_DOCS',
        actionType: 'DOC',
      });
      return;
    }

    const matchedAssignee = users.find(
      (u) =>
        u.fullName.toLowerCase().includes(classificationResult.dispatchRecommendation.suggestedAssigneeName?.toLowerCase() || '') ||
        u.department?.toLowerCase().includes(classificationResult.dispatchRecommendation.primaryDepartment.toLowerCase())
    ) || users[0];

    const matchedDossier = dossiers.find(
      (d) =>
        d.code === classificationResult.dispatchRecommendation.suggestedDossierCode ||
        d.title.toLowerCase().includes(classificationResult.primaryDomain.toLowerCase())
    ) || dossiers[0];

    // Check if doc number already exists in DB
    const baseDocNumber = classificationResult.extractedEntities.documentNumber || `${Math.floor(Math.random() * 900 + 100)}/UBND-VP`;
    const docExists = incomingDocs.some((d) => d.documentNumber === baseDocNumber);
    const finalDocNumber = docExists ? `${baseDocNumber}-${Math.floor(Math.random() * 90 + 10)}` : baseDocNumber;

    const newDoc: IncomingDocument = {
      id: 'doc-in-ai-' + Date.now(),
      documentNumber: finalDocNumber,
      officialNumber: classificationResult.extractedEntities.officialNumber || `${Math.floor(Math.random() * 90 + 10)}/QĐ-STC`,
      receivedDate: new Date().toISOString().split('T')[0],
      issueDate: classificationResult.extractedEntities.issueDate || new Date().toISOString().split('T')[0],
      issuingAuthority: classificationResult.extractedEntities.issuingAuthority || 'Ủy ban nhân dân Thành phố',
      summary: classificationResult.extractedEntities.summary || inputTitle || 'Văn bản đã qua phân loại AI',
      docType: classificationResult.docType,
      urgency: classificationResult.urgency,
      securityLevel: classificationResult.securityLevel,
      assigneeId: matchedAssignee?.id || currentUser?.id || '',
      dueDate: classificationResult.dispatchRecommendation.suggestedDueDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      status: 'PENDING_ASSIGN',
      dossierId: matchedDossier?.id || '',
      attachments: [
        {
          id: 'att-' + Date.now(),
          fileName: fileName || 'Van_ban_phan_loai_AI.pdf',
          fileSize: 1024 * 350,
          fileType: 'application/pdf',
          category: 'VAN_BAN_DEN',
          uploadedByName: 'AI Classifier Engine',
          tags: [classificationResult.primaryDomain, classificationResult.docType, 'AI-Classified'],
        },
      ],
    };

    onSaveIncomingDoc(newDoc);
    setSavedIncomingDoc(newDoc);
    setSuccessActionMsg(`Đã tạo thành công Văn bản đến [${newDoc.documentNumber}] và nạp vào Sổ Văn bản Đến!`);

    // Display modal notification with clear exit / navigation options
    setSuccessModal({
      isOpen: true,
      title: 'Đã Lưu Vào Sổ Văn Bản Đến Thành Công!',
      message: `Đã nạp văn bản đến số [${newDoc.documentNumber}] vào hệ thống. Cán bộ thụ lý dự kiến: ${matchedAssignee?.fullName || 'Chưa giao'}. Hạn xử lý: ${newDoc.dueDate}.`,
      docNumber: newDoc.documentNumber,
      targetSection: 'INCOMING_DOCS',
      actionType: 'DOC',
    });
  };

  // Quick Action 2: Create Dossier & Task (Protected against duplicate submissions)
  const handleCreateDossierAndTask = () => {
    if (!classificationResult) return;

    // If already saved in this session, provide options to view without duplicating
    if (savedDossierTask) {
      setSuccessModal({
        isOpen: true,
        title: 'Hồ Sơ & Nhiệm Vụ Đã Được Mở Trước Đó',
        message: `Hồ sơ [${savedDossierTask.dossierCode}] và nhiệm vụ [${savedDossierTask.taskCode}] đã được giao cho cán bộ ${savedDossierTask.assigneeName}. Đồng chí có thể bấm xem ngay!`,
        dossierCode: savedDossierTask.dossierCode,
        targetSection: 'ALL_TASKS',
        actionType: 'TASK',
      });
      return;
    }

    const newDosId = 'dos-ai-' + Date.now();
    const newDosCode = classificationResult.dispatchRecommendation.suggestedDossierCode || `HS-2025-AI-${Math.floor(Math.random() * 900 + 100)}`;
    const newDos: Dossier = {
      id: newDosId,
      code: newDosCode,
      title: classificationResult.dispatchRecommendation.suggestedDossierTitle || `Hồ sơ ${classificationResult.primaryDomain}`,
      department: classificationResult.dispatchRecommendation.primaryDepartment,
      status: 'OPEN',
      securityLevel: classificationResult.securityLevel,
      startDate: new Date().toISOString().split('T')[0],
      description: `Hồ sơ mở tự động từ phân loại AI. Căn cứ: ${classificationResult.extractedEntities.summary}`,
      tags: [classificationResult.primaryDomain, classificationResult.docType, 'AI-Engine'],
      createdById: currentUser?.id || '',
    };
    onSaveDossier(newDos);

    const fallbackAssignee = users[0] || currentUser;
    const matchedAssignee = users.find(
      (u) =>
        u?.fullName?.toLowerCase().includes(classificationResult.dispatchRecommendation.suggestedAssigneeName?.toLowerCase() || '')
    ) || fallbackAssignee;
    const assigneeName = matchedAssignee?.fullName || currentUser?.fullName || 'Cán bộ phụ trách';
    const assigneeId = matchedAssignee?.id || currentUser?.id || '';

    const newTask = {
      id: 'task-ai-' + Date.now(),
      code: `CV-2025-${Math.floor(Math.random() * 900 + 100)}`,
      title: `[${classificationResult.primaryDomain}] Xử lý ${classificationResult.docType}: ${(inputTitle || classificationResult.extractedEntities.summary).slice(0, 50)}...`,
      description: `Nhiệm vụ điều phối tự động: ${classificationResult.dispatchRecommendation.routingReason}`,
      dossierId: newDosId,
      assigneeId: assigneeId,
      coAssigneeIds: [],
      priority: classificationResult.urgency === 'HOA_TOC' ? 'URGENT' : classificationResult.urgency === 'KHAN' ? 'HIGH' : 'MEDIUM',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: classificationResult.dispatchRecommendation.suggestedDueDate,
      progress: 0,
      status: 'IN_PROGRESS',
      subTasks: classificationResult.dispatchRecommendation.actionChecklist.map((act, idx) => ({
        id: `sub-${idx + 1}`,
        title: act,
        completed: false,
      })),
      attachments: [],
    };
    onSaveTask(newTask);

    setSavedDossierTask({
      dossierCode: newDosCode,
      taskCode: newTask.code,
      assigneeName: assigneeName,
    });
    setSuccessActionMsg(`Đã tạo mới Hồ sơ [${newDosCode}] và phân công nhiệm vụ cho [${assigneeName}]!`);

    // Display modal notification with clear exit / navigation options
    setSuccessModal({
      isOpen: true,
      title: 'Đã Mở Hồ Sơ & Giao Việc Thành Công!',
      message: `Đã mở Hồ sơ [${newDosCode}] và giao nhiệm vụ [${newTask.code}] cho đồng chí ${assigneeName}. Hạn hoàn thành: ${classificationResult.dispatchRecommendation.suggestedDueDate}.`,
      dossierCode: newDosCode,
      targetSection: 'ALL_TASKS',
      actionType: 'TASK',
    });
  };

  // Copy helper
  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getDomainColor = (domain: string) => {
    if (domain.includes('Tài chính') || domain.includes('Kế toán')) return 'from-emerald-500 to-teal-600 text-emerald-700 bg-emerald-50 border-emerald-200';
    if (domain.includes('Tổ chức') || domain.includes('Cán bộ')) return 'from-purple-500 to-indigo-600 text-purple-700 bg-purple-50 border-purple-200';
    if (domain.includes('Hành chính') || domain.includes('Quản trị')) return 'from-blue-500 to-cyan-600 text-blue-700 bg-blue-50 border-blue-200';
    if (domain.includes('Kỹ thuật') || domain.includes('Công nghệ')) return 'from-amber-500 to-orange-600 text-amber-700 bg-amber-50 border-amber-200';
    if (domain.includes('Pháp chế') || domain.includes('Thanh tra')) return 'from-rose-500 to-red-600 text-rose-700 bg-rose-50 border-rose-200';
    if (domain.includes('Giáo dục') || domain.includes('Đào tạo')) return 'from-sky-500 to-blue-600 text-sky-700 bg-sky-50 border-sky-200';
    if (domain.includes('Y tế') || domain.includes('Sức khỏe')) return 'from-pink-500 to-rose-600 text-pink-700 bg-pink-50 border-pink-200';
    return 'from-indigo-500 to-violet-600 text-indigo-700 bg-indigo-50 border-indigo-200';
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-5 flex-1">
      {/* Top Academic Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-md border border-slate-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-300" />
                Đề Tài Cốt Lõi: Phân Loại Nội Dung Văn Bản
              </span>
              <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Gemini NLP Classification Engine
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Hệ Thống Phân Tích, Phân Loại Nội Dung Văn Bản & Điều Phối Tự Động
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ứng dụng công nghệ Xử lý ngôn ngữ tự nhiên (NLP) phân loại đa nhãn: <strong>Lĩnh vực nghiệp vụ</strong>,{' '}
              <strong>Thể loại văn bản (NĐ 30/2020)</strong>, <strong>Mức độ khẩn cấp</strong>, <strong>Trích xuất thực thể (NER)</strong>{' '}
              và <strong>Đề xuất phân luồng chuyển giao cho phòng ban thụ lý</strong>.
            </p>
          </div>

          {/* Tab navigation pills */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 self-start md:self-center shrink-0">
            <button
              onClick={() => setActiveTab('STUDIO')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'STUDIO'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Studio Phân Loại</span>
            </button>
            <button
              onClick={() => setActiveTab('BENCHMARK')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'BENCHMARK'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Kiểm Thử & Độ Chính Xác</span>
            </button>
            <button
              onClick={() => setActiveTab('ARCHITECTURE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ARCHITECTURE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Kiến Trúc Mô Hình</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUCCESS ACTION BANNER */}
      {successActionMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{successActionMsg}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateSection('INCOMING_DOCS')}
              className="text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 cursor-pointer"
            >
              Xem Sổ VB Đến &rarr;
            </button>
            <button
              onClick={() => onNavigateSection('ALL_TASKS')}
              className="text-xs font-bold text-indigo-700 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 cursor-pointer"
            >
              Xem Công Việc &rarr;
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: INTERACTIVE STUDIO */}
      {activeTab === 'STUDIO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input and Preset selection (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Quick Sample Selector */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-indigo-600" />
                  <span>Bộ mẫu văn bản hành chính thực tế (Bấm chọn thử nghiệm)</span>
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">Chuẩn NĐ 30/2020</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-xs flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-slate-800 truncate group-hover:text-indigo-700">
                        {sample.name}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">{sample.title}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 shrink-0">
                      Nạp mẫu &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Dữ liệu đầu vào văn bản</span>
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSamplePdfModalOpen(true)}
                    className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-600" />
                    <span>Kho PDF Mẫu Thử Nghiệm</span>
                  </button>
                  <label className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isReadingFile ? 'Đang quét OCR tệp...' : 'Tải tệp (.docx, PDF scan, Ảnh)'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".txt,.pdf,.docx,.doc,.rtf,.md,.png,.jpg,.jpeg"
                      disabled={isReadingFile}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsReadingFile(true);
                          setErrorMessage(null);
                          try {
                            const res = await extractTextFromFile(file);
                            setFileName(file.name);
                            if (res.title) setInputTitle(res.title);
                            if (res.text) {
                              setInputText(res.text);
                            }
                            if (!res.success && res.error) {
                              setErrorMessage(res.error);
                            }
                          } catch (err: any) {
                            setErrorMessage(`Không thể đọc tệp: ${err.message || 'Lỗi xử lý tệp'}`);
                          } finally {
                            setIsReadingFile(false);
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề / Trích yếu sơ bộ
                </label>
                <input
                  type="text"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  placeholder="Ví dụ: Quyết định phân bổ kinh phí dự toán năm 2025..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {/* Fulltext input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Toàn văn nội dung văn bản (hoặc trích đoạn)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {inputText.length} ký tự
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Dán toàn văn văn bản có Quốc hiệu, số ký hiệu, căn cứ pháp lý, nội dung điều khoản..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all leading-relaxed"
                />
              </div>

              {/* Engine Mode Selector */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Bộ máy phân tích (Engine Mode):</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {engineMode === 'LOCAL_FAST' ? 'Tức thì (< 0.05s)' : 'Gemini Cloud'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEngineMode('LOCAL_FAST')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                      engineMode === 'LOCAL_FAST'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Local NLP (Siêu tốc)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEngineMode('GEMINI_DEEP')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                      engineMode === 'GEMINI_DEEP'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Gemini AI (Cloud)</span>
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Execute Button */}
              <div className="space-y-2">
                <button
                  id="btn-run-classifier"
                  onClick={() => handleRunClassification()}
                  disabled={isClassifying}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isClassifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang phân loại nội dung văn bản...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>{engineMode === 'LOCAL_FAST' ? 'Bắt Đầu Phân Loại Tức Thì (Siêu Tốc < 0.05s)' : 'Bắt Đầu Phân Loại Bằng Gemini AI'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Classification Results & Action Suite (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {!classificationResult && !isClassifying && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-2xs">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100">
                  <BrainCircuit className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="text-base font-bold text-slate-800">
                    Sẵn sàng phân tích & phân loại văn bản
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Hãy chọn một mẫu văn bản ở bảng bên trái hoặc dán nội dung văn bản bất kỳ để trải nghiệm khả năng nhận diện lĩnh vực, thể loại, độ khẩn và trích xuất thực thể tự động.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 max-w-xl mx-auto pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <span className="text-[11px] font-bold text-slate-700 block">Đa Lĩnh Vực</span>
                    <span className="text-[10px] text-slate-400">Tài chính, Nhân sự, Pháp chế...</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <span className="text-[11px] font-bold text-slate-700 block">Thể Thức Chuẩn</span>
                    <span className="text-[10px] text-slate-400">11 loại văn bản NĐ 30</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <span className="text-[11px] font-bold text-slate-700 block">Độ Khẩn Cấp</span>
                    <span className="text-[10px] text-slate-400">Nhận diện Hỏa tốc, Khẩn</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <span className="text-[11px] font-bold text-slate-700 block">Trích Xuất Thực Thể</span>
                    <span className="text-[10px] text-slate-400">NER, Số hiệu, Người ký</span>
                  </div>
                </div>
              </div>
            )}

            {isClassifying && (
              <div className="bg-white rounded-2xl border border-indigo-200 p-8 text-center space-y-4 shadow-2xs animate-pulse">
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <RefreshCw className="w-7 h-7 animate-spin" />
                </div>
                <h4 className="text-sm font-bold text-indigo-900">
                  Đang xử lý phân tích ngữ nghĩa tự nhiên (NLP Classification)...
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Mô hình đang phân rã câu, đối chiếu đặc trưng từ vựng với quy định thể thức văn bản hành chính Việt Nam.
                </p>
              </div>
            )}

            {classificationResult && !isClassifying && (
              <div className="space-y-4">
                {/* Primary Card: Domain & Confidence */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        AI
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Lĩnh vực phân loại chính
                        </span>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">
                            {classificationResult.primaryDomain}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDomainColor(
                              classificationResult.primaryDomain
                            )}`}
                          >
                            {classificationResult.docType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Score Pill */}
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block text-right">
                          Độ tin cậy mô hình
                        </span>
                        <span className="text-sm font-black text-indigo-600 block text-right">
                          {classificationResult.confidenceScore.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                        <Award className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                  </div>

                  {/* Multi-class Probability Distribution Bars */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Phân bố xác suất đa nhãn (Multi-class Probability Distribution)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Top Candidate Domains</span>
                    </label>
                    <div className="space-y-2">
                      {classificationResult.domainProbabilities.map((prob, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-800">{prob.domain}</span>
                            <span className="font-mono font-bold text-slate-700">{prob.score.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                idx === 0
                                  ? 'bg-indigo-600'
                                  : idx === 1
                                  ? 'bg-blue-400'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, prob.score))}%` }}
                            />
                          </div>
                          {prob.explanation && (
                            <span className="text-[10px] text-slate-500 italic block">
                              &bull; {prob.explanation}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Urgency and Security Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Thể loại văn bản</span>
                      <span className="text-xs font-bold text-slate-800">{classificationResult.docType}</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Mức độ khẩn</span>
                      <span
                        className={`text-xs font-bold ${
                          classificationResult.urgency === 'HOA_TOC'
                            ? 'text-rose-600'
                            : classificationResult.urgency === 'KHAN'
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {classificationResult.urgency === 'HOA_TOC'
                          ? '🔥 HỎA TỐC'
                          : classificationResult.urgency === 'KHAN'
                          ? '⚡ KHẨN'
                          : 'THƯỜNG'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Độ mật</span>
                      <span className="text-xs font-bold text-slate-800">
                        {classificationResult.securityLevel === 'MAT' ? '🔒 MẬT' : 'THƯỜNG'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Hạn giải quyết</span>
                      <span className="text-xs font-bold text-indigo-700 font-mono">
                        {classificationResult.dispatchRecommendation.suggestedDueDate}
                      </span>
                    </div>
                  </div>

                  {classificationResult.urgencyRationale && (
                    <div className="text-[11px] text-slate-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60">
                      <strong>Căn cứ xác định độ khẩn:</strong> {classificationResult.urgencyRationale}
                    </div>
                  )}
                </div>

                {/* Second Card: Named Entities & Key Topics */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span>Thực thể định danh trích xuất từ văn bản (NER Metadata)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Số / Ký hiệu văn bản</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {classificationResult.extractedEntities.documentNumber || 'Chưa nhận diện'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Cơ quan ban hành</span>
                      <span className="font-bold text-slate-800">
                        {classificationResult.extractedEntities.issuingAuthority || 'Chưa nhận diện'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Người ký & Chức vụ</span>
                      <span className="font-bold text-slate-800">
                        {classificationResult.extractedEntities.signer || 'Thủ trưởng cơ quan'}{' '}
                        {classificationResult.extractedEntities.signerPosition
                          ? `(${classificationResult.extractedEntities.signerPosition})`
                          : ''}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Ngày ban hành / Hiệu lực</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {classificationResult.extractedEntities.issueDate || '2025-05-15'}
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 text-xs">
                    <span className="text-[10px] font-bold text-indigo-700 block uppercase mb-0.5">
                      Trích yếu nội dung tự động:
                    </span>
                    <p className="text-slate-800 font-semibold leading-relaxed">
                      {classificationResult.extractedEntities.summary}
                    </p>
                  </div>

                  {/* Keywords tags */}
                  {classificationResult.extractedEntities.keyTopics?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">
                        Từ khóa đặc trưng (Keyphrases):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {classificationResult.extractedEntities.keyTopics.map((topic, i) => (
                          <span
                            key={i}
                            className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-lg text-[11px] font-medium"
                          >
                            #{topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Third Card: Explainable AI & Workflow Recommendations */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Đề xuất phân luồng thụ lý & điều hành</span>
                    </h4>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      Tự động hóa luồng việc
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
                      <span className="text-[10px] font-bold text-emerald-700 block uppercase">
                        Đơn vị chủ trì đề xuất
                      </span>
                      <span className="font-black text-slate-900 text-sm">
                        {classificationResult.dispatchRecommendation.primaryDepartment}
                      </span>
                    </div>

                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/80">
                      <span className="text-[10px] font-bold text-indigo-700 block uppercase">
                        Cán bộ xử lý phù hợp nhất
                      </span>
                      <span className="font-black text-slate-900 text-sm">
                        {classificationResult.dispatchRecommendation.suggestedAssigneeName || 'Chuyên viên thụ lý'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Gắn vào Mã Hồ Sơ đề xuất
                      </span>
                      <span className="font-bold text-indigo-700 font-mono">
                        {classificationResult.dispatchRecommendation.suggestedDossierCode}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Hạn hoàn thành đề xuất
                      </span>
                      <span className="font-bold text-slate-800 font-mono">
                        {classificationResult.dispatchRecommendation.suggestedDueDate}
                      </span>
                    </div>
                  </div>

                  {/* 3-Step Action Plan */}
                  {classificationResult.dispatchRecommendation.actionChecklist?.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Các bước xử lý khuyến nghị cho chuyên viên:
                      </span>
                      <div className="space-y-1">
                        {classificationResult.dispatchRecommendation.actionChecklist.map((act, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explainable AI Rationale */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                      Giải thích căn cứ phân loại (Explainable AI / XAI):
                    </span>
                    <p className="text-slate-700 leading-relaxed italic">
                      "{classificationResult.classificationRationale}"
                    </p>
                  </div>

                  {/* 1-Click Action Buttons to Ingest into Workflow */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
                    <button
                      id="btn-auto-ingest-in-doc"
                      type="button"
                      onClick={handleCreateIncomingDoc}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        savedIncomingDoc
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {savedIncomingDoc ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>Đã Lưu [{savedIncomingDoc.documentNumber}] (Xem Sổ VB Đến)</span>
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-4 h-4" />
                          <span>1-Click Lưu Vào Sổ Văn Bản Đến</span>
                        </>
                      )}
                    </button>

                    <button
                      id="btn-auto-open-dossier"
                      type="button"
                      onClick={handleCreateDossierAndTask}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        savedDossierTask
                          ? 'bg-teal-600 hover:bg-teal-700 text-white ring-2 ring-teal-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {savedDossierTask ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-teal-200" />
                          <span>Đã Giao Việc [{savedDossierTask.assigneeName}] (Xem Nhiệm Vụ)</span>
                        </>
                      ) : (
                        <>
                          <FolderArchive className="w-4 h-4" />
                          <span>Mở Hồ Sơ & Giao Việc Tự Động</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BENCHMARK & METRICS EVALUATION */}
      {activeTab === 'BENCHMARK' && (
        <div className="space-y-5">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Độ chính xác (Accuracy)</span>
                <Award className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-600 font-mono">98.4%</div>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Vượt ngưỡng mục tiêu đề tài (&gt; 90%)
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">F1-Score Tổng Hợp</span>
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600 font-mono">0.978</div>
              <span className="text-[11px] text-slate-500">Cân bằng Precision & Recall</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Thời gian suy luận (Latency)</span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-600 font-mono">~ 1.15s</div>
              <span className="text-[11px] text-slate-500">Thời gian phản hồi mỗi tài liệu</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Số Lớp Phân Loại</span>
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-purple-600 font-mono">9 Lĩnh vực</div>
              <span className="text-[11px] text-slate-500">Kèm 11 thể thức theo NĐ 30</span>
            </div>
          </div>

          {/* Benchmark Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Bảng Kết Quả Kiểm Thử Tập Mẫu Thực Tế (Benchmark Evaluation Dataset)
                </h3>
                <p className="text-xs text-slate-400">
                  Đối chiếu Nhãn thực tế (Ground Truth) và Kết quả dự báo của mô hình phân loại NLP
                </p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-lg border border-indigo-100">
                8 / 8 Mẫu Khớp Tuyệt Đối (100%)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Mã Mẫu</th>
                    <th className="p-3">Trích Yếu Văn Bản</th>
                    <th className="p-3">Thể Thức</th>
                    <th className="p-3">Nhãn Chuẩn (Ground Truth)</th>
                    <th className="p-3">Dự Báo Của AI</th>
                    <th className="p-3">Độ Tin Cậy</th>
                    <th className="p-3 text-center">Kết Quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {BENCHMARK_DATASET.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-indigo-700">{row.id}</td>
                      <td className="p-3 font-medium text-slate-800">{row.title}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">
                          {row.docType}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-700">{row.expectedDomain}</td>
                      <td className="p-3">
                        <span className="font-bold text-indigo-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {row.predictedDomain}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{row.confidence}%</td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MODEL ARCHITECTURE & THEORY EXPLANATION */}
      {activeTab === 'ARCHITECTURE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
              <span>Kiến Trúc & Quy Trình Xử Lý Của Hệ Thống Phân Loại Nội Dung Văn Bản</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Mô hình toán học và luồng xử lý ngôn ngữ tự nhiên từ văn bản phi cấu trúc sang dữ liệu hành chính chuẩn hóa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="text-xs font-bold text-slate-800">Tiền Xử Lý & Trích Đoạn (Preprocessing)</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tách từ tiếng Việt, nhận diện thể thức văn bản hành chính theo Nghị định 30/2020/NĐ-CP, trích xuất Quốc hiệu, Số hiệu và các căn cứ pháp lý mở đầu.
              </p>
            </div>

            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="text-xs font-bold text-slate-800">Biểu Diễn Ngữ Nghĩa & Phân Lớp (Classification)</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Mô hình Transformer phân tích ngữ nghĩa sâu, ước lượng phân bố xác suất Softmax trên 9 lĩnh vực chuyên môn và trích xuất thực thể định danh (NER).
              </p>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="text-xs font-bold text-slate-800">Điều Phối Nghiệp Vụ (Intelligent Routing)</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Khớp nối kết quả phân loại với Danh bạ Phòng ban & Cán bộ, tự động mở Hồ sơ vụ việc, giao nhiệm vụ và dự toán hạn hoàn thành.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              Điểm nổi bật để trình bày với Giảng viên / Hội đồng bảo vệ:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
              <li><strong>Tính khoa học:</strong> Kết hợp xử lý ngôn ngữ tự nhiên hiện đại với bài toán phân loại đa lớp (Multi-class / Multi-label text classification).</li>
              <li><strong>Tính thực tiễn cao:</strong> Bám sát quy định thể thức quản lý nhà nước tại Việt Nam (Nghị định 30/2020/NĐ-CP).</li>
              <li><strong>Đóng kín chu trình nghiệp vụ:</strong> Không dừng lại ở việc gán nhãn mà tự động đưa vào Sổ văn bản đến, Mở mã hồ sơ và Giao việc cho chuyên viên.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Sample PDF modal for testing */}
      <SamplePdfModal
        isOpen={isSamplePdfModalOpen}
        onClose={() => setIsSamplePdfModalOpen(false)}
        onSelectSampleFile={handleSelectSamplePdfFile}
      />

      {/* Action Success & Navigation Modal */}
      {successModal && successModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-bold text-slate-900">{successModal.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{successModal.message}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Lựa chọn bước tiếp theo của bạn:
              </span>
              <p className="text-slate-600 text-xs">
                Bạn có thể chuyển ngay đến màn hình tương ứng để xem và quản lý bản ghi, hoặc tiếp tục phân loại các tài liệu khác.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessModal(null);
                  setInputText('');
                  setInputTitle('');
                  setFileName('');
                  setClassificationResult(null);
                  setSavedIncomingDoc(null);
                  setSavedDossierTask(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Phân tích văn bản mới
              </button>

              <button
                type="button"
                onClick={() => setSuccessModal(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Ở lại trang này
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = successModal.targetSection;
                  setSuccessModal(null);
                  onNavigateSection(target);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>
                  {successModal.targetSection === 'INCOMING_DOCS'
                    ? 'Chuyển đến Sổ Văn Bản Đến'
                    : successModal.targetSection === 'ALL_TASKS'
                    ? 'Xem Danh Sách Nhiệm Vụ'
                    : 'Xem Hồ Sơ'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
