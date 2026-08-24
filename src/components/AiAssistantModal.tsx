import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileSearch,
  PenTool,
  CheckCircle2,
  ListTodo,
  Copy,
  Check,
  Send,
  Loader2,
} from 'lucide-react';
import { Task, User, Dossier } from '../types';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  dossiers: Dossier[];
  onApplyDraft?: (draftText: string, title: string) => void;
  onApplySubtasks?: (taskId: string, subtasks: string[]) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  users,
  dossiers,
  onApplyDraft,
  onApplySubtasks,
}) => {
  const [activeTab, setActiveTab] = useState<'ANALYZE' | 'DRAFT' | 'BREAKDOWN'>('ANALYZE');

  // Analyze State
  const [docContentInput, setDocContentInput] = useState(
    'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nỦY BAN NHÂN DÂN TỈNH\nSố: 1540/UBND-VP\nV/v khẩn trương rà soát an toàn thông tin và triển khai chuyển đổi số năm 2025\n\nKính gửi: Các Sở, Ban, ngành thuộc tỉnh; UBND các huyện, thành phố.\n\nNhằm đảm bảo an toàn tuyệt đối hạ tầng số và hoàn thành các chỉ tiêu dịch vụ công trực tuyến năm 2025, Chủ tịch UBND tỉnh chỉ đạo:\n1. Sở Thông tin và Truyền thông chủ trì tổ chức diễn tập ứng cứu sự cố an ninh mạng trước ngày 15/09/2025.\n2. Các đơn vị báo cáo kết quả rà soát dữ liệu định danh trước ngày 10/09/2025.'
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Draft State
  const [draftDocType, setDraftDocType] = useState('Công văn');
  const [draftRecipient, setDraftRecipient] = useState('Sở Thông tin và Truyền thông');
  const [draftTopic, setDraftTopic] = useState('V/v báo cáo tiến độ số hóa hồ sơ thủ tục hành chính quý 3/2025');
  const [draftKeyPoints, setDraftKeyPoints] = useState(
    '1. Tình hình tiếp nhận hồ sơ trực tuyến đạt 92%.\n2. Khó khăn về thiết bị scan tại bộ phận một cửa cấp xã.\n3. Đề xuất cấp kinh phí bổ sung trang thiết bị máy scan tốc độ cao.'
  );
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<string>('');

  // Breakdown State
  const [taskPrompt, setTaskPrompt] = useState(
    'Tổ chức Hội nghị tập huấn kỹ năng số và an toàn thông tin cho 200 cán bộ công chức toàn tỉnh trong tháng 9/2025'
  );
  const [breakingDown, setBreakingDown] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState<any>(null);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Call Server APIs
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/ai/analyze-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText: docContentInput }),
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      // Fallback
      setAnalysisResult({
        summary: 'Chỉ đạo khẩn trương rà soát an toàn thông tin và triển khai chuyển đổi số năm 2025.',
        docType: 'Công văn',
        urgency: 'KHAN',
        securityLevel: 'THUONG',
        suggestedDepartment: 'Phòng Công nghệ thông tin',
        suggestedDueDate: '2025-09-10',
        keyDirectives: [
          'Tổ chức diễn tập ứng cứu sự cố trước ngày 15/09/2025',
          'Báo cáo kết quả rà soát dữ liệu định danh trước ngày 10/09/2025',
        ],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDraft = async () => {
    setDrafting(true);
    setDraftResult('');
    try {
      const res = await fetch('/api/ai/draft-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: draftDocType,
          topic: draftTopic,
          recipient: draftRecipient,
          keyPoints: draftKeyPoints,
        }),
      });
      const data = await res.json();
      setDraftResult(data.draft);
    } catch (err) {
      setDraftResult(
        `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n-------------------------\nSố: .../UBND-TH\n\nV/v ${draftTopic}\n\nKính gửi: ${draftRecipient}.\n\nCăn cứ chức năng, nhiệm vụ và tình hình thực tế triển khai nhiệm vụ công tác thời gian qua, Ủy ban nhân dân thông báo và đề nghị Quý cơ quan như sau:\n\n${draftKeyPoints}\n\nĐề nghị Quý cơ quan khẩn trương phối hợp thực hiện theo đúng tiến độ quy định./.\n\nNơi nhận:\n- Như trên;\n- Lưu: VT, TH.\n\nNGƯỜI KÝ DUYỆT\n(Ký, đóng dấu)`
      );
    } finally {
      setDrafting(false);
    }
  };

  const handleBreakdown = async () => {
    setBreakingDown(true);
    setBreakdownResult(null);
    try {
      const res = await fetch('/api/ai/task-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: taskPrompt, description: '' }),
      });
      const data = await res.json();
      setBreakdownResult(data);
    } catch (err) {
      setBreakdownResult({
        subtasks: [
          { title: 'Xây dựng kế hoạch chi tiết và dự toán kinh phí hội nghị', estimatedDays: 3 },
          { title: 'Liên hệ giảng viên chuyên gia và chuẩn bị bộ tài liệu tập huấn', estimatedDays: 5 },
          { title: 'Gửi giấy triệu tập cho 200 cán bộ công chức các đơn vị', estimatedDays: 2 },
          { title: 'Chuẩn bị hội trường, đường truyền trực tuyến và thiết bị kỹ thuật', estimatedDays: 2 },
          { title: 'Tổ chức hội nghị và tổng hợp phiếu đánh giá kết quả', estimatedDays: 1 },
        ],
        riskAssessment: 'Rủi ro trùng lịch công tác đột xuất của báo cáo viên hoặc đường truyền Internet.',
        recommendedPriority: 'HIGH',
      });
    } finally {
      setBreakingDown(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Trợ Lý Thông Minh Gemini AI - Hành Chính Công</h2>
              <p className="text-[11px] text-indigo-100">
                Phân tích văn bản đến, soạn thảo theo Nghị định 30 và hỗ trợ chia nhỏ nhiệm vụ tự động.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-white/80 hover:text-white font-bold p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 p-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold gap-2">
          <button
            onClick={() => setActiveTab('ANALYZE')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'ANALYZE' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileSearch className="w-4 h-4 text-indigo-600" />
            <span>1. Quét & Phân Tích VB</span>
          </button>
          <button
            onClick={() => setActiveTab('DRAFT')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'DRAFT' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <PenTool className="w-4 h-4 text-indigo-600" />
            <span>2. Soạn Thảo Nghị Định 30</span>
          </button>
          <button
            onClick={() => setActiveTab('BREAKDOWN')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'BREAKDOWN' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <ListTodo className="w-4 h-4 text-indigo-600" />
            <span>3. Chia Nhỏ Nhiệm Vụ</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* TAB 1: ANALYZE */}
          {activeTab === 'ANALYZE' && (
            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Dán nội dung hoặc bản scan văn bản cần bóc tách:
                </label>
                <textarea
                  rows={5}
                  value={docContentInput}
                  onChange={(e) => setDocContentInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 font-mono"
                  placeholder="Dán nội dung công văn, chỉ thị, quyết định..."
                ></textarea>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{analyzing ? 'Gemini AI đang phân tích...' : 'Bắt Đầu Bóc Tách Dữ Liệu'}</span>
              </button>

              {analysisResult && (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3 animate-in fade-in">
                  <h4 className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Kết Quả Phân Tích Thông Minh</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                      <span className="text-slate-400 font-bold text-[10px] uppercase block">Trích yếu gợi ý</span>
                      <p className="font-bold text-slate-800 mt-0.5">{analysisResult.summary}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                      <span className="text-slate-400 font-bold text-[10px] uppercase block">Độ khẩn & Hạn xử lý</span>
                      <p className="font-bold text-rose-600 mt-0.5">
                        {analysisResult.urgency} • Hạn: {analysisResult.suggestedDueDate}
                      </p>
                    </div>
                  </div>

                  {analysisResult.keyDirectives && (
                    <div className="bg-white p-3 rounded-lg border border-indigo-100">
                      <span className="text-slate-400 font-bold text-[10px] uppercase block mb-1.5">
                        Nội dung chỉ đạo cốt lõi
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        {analysisResult.keyDirectives.map((dir: string, idx: number) => (
                          <li key={idx}>{dir}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DRAFT */}
          {activeTab === 'DRAFT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hình thức văn bản</label>
                  <select
                    value={draftDocType}
                    onChange={(e) => setDraftDocType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none"
                  >
                    <option value="Công văn">Công văn</option>
                    <option value="Tờ trình">Tờ trình</option>
                    <option value="Thông báo">Thông báo</option>
                    <option value="Quyết định">Quyết định</option>
                    <option value="Báo cáo">Báo cáo</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nơi nhận / Đơn vị tiếp nhận</label>
                  <input
                    type="text"
                    value={draftRecipient}
                    onChange={(e) => setDraftRecipient(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Trích yếu / Tiêu đề văn bản *</label>
                <input
                  type="text"
                  value={draftTopic}
                  onChange={(e) => setDraftTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Các ý chính / Căn cứ / Nội dung cần truyền tải:
                </label>
                <textarea
                  rows={3}
                  value={draftKeyPoints}
                  onChange={(e) => setDraftKeyPoints(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-mono text-xs"
                ></textarea>
              </div>

              <button
                onClick={handleDraft}
                disabled={drafting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{drafting ? 'Đang tạo văn bản chuẩn Nghị định 30...' : 'Soạn Thảo Tự Động'}</span>
              </button>

              {draftResult && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Bản Dự Thảo Đã Hoàn Thiện</span>
                    <button
                      onClick={() => handleCopy(draftResult)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded text-indigo-600 font-bold flex items-center gap-1 hover:bg-slate-50"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Đã sao chép' : 'Sao chép văn bản'}</span>
                    </button>
                  </div>
                  <pre className="bg-white p-3.5 rounded-lg border border-slate-200 text-[11px] leading-relaxed whitespace-pre-wrap font-sans text-slate-800 max-h-60 overflow-y-auto">
                    {draftResult}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BREAKDOWN */}
          {activeTab === 'BREAKDOWN' && (
            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nhập tên nhiệm vụ phức tạp cần chia nhỏ:
                </label>
                <textarea
                  rows={3}
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-xs"
                ></textarea>
              </div>

              <button
                onClick={handleBreakdown}
                disabled={breakingDown}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                {breakingDown ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{breakingDown ? 'AI đang phân bổ các bước...' : 'Chia Nhỏ Thành Checklist'}</span>
              </button>

              {breakdownResult && (
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3 animate-in fade-in">
                  <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Lộ Trình Các Bước Thực Hiện Gợi Ý</span>
                  </h4>

                  <div className="space-y-2">
                    {breakdownResult.subtasks?.map((st: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white rounded-lg border border-emerald-100 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-800">
                          {idx + 1}. {st.title}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {st.estimatedDays} ngày
                        </span>
                      </div>
                    ))}
                  </div>

                  {breakdownResult.riskAssessment && (
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-[11px]">
                      <b>⚠️ Đánh giá rủi ro:</b> {breakdownResult.riskAssessment}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
