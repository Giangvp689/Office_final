import { DocumentClassificationResult } from '../types';
import { classifyDocumentLocally } from '../utils/localClassifier';
import { generateLocalAssistantAnswer } from '../utils/localAssistant';

export interface AIMandateItem {
  mandate: string;
  responsibleParty?: string;
  deadline?: string;
  deliverable?: string;
  priority?: 'HOA_TOC' | 'KHAN' | 'THUONG';
}

export interface AISummarizeResult {
  summary: string;
  executiveSummary?: string;
  keyRequirements: string[];
  keyMandates?: AIMandateItem[];
  legalBasisList?: string[];
  suggestedUrgency: 'THUONG' | 'KHAN' | 'HOA_TOC';
  suggestedDueDate: string;
  suggestedDepartment: string;
  suggestedAssigneeName?: string;
  actionPlan: string;
  riskAlert?: string;
}

export interface AIDraftDocResult {
  title: string;
  draftContent: string;
  suggestedSigner: string;
  notes: string;
}

export interface AITaskBreakdownResult {
  subTasks: Array<{
    title: string;
    daysEstimated: number;
    suggestedAssigneeName: string;
  }>;
  riskWarning: string;
  recommendedMilestones: string[];
}

async function safeFetchJson<T>(url: string, body: any, defaultErrorMsg: string): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Returned HTML or non-JSON (e.g. 502/504 gateway or error page)
      throw new Error(`Máy chủ phản hồi không đúng định dạng (Mã ${response.status}). Vui lòng thử lại sau giây lát.`);
    }
    if (!response.ok || (json && json.success === false)) {
      throw new Error(json?.error || defaultErrorMsg);
    }
    return json as T;
  } catch (err: any) {
    throw new Error(err.message || defaultErrorMsg);
  }
}

export async function classifyDocumentWithAI(data: {
  text?: string;
  title?: string;
  fileName?: string;
  departments?: any[];
  availableStaff?: any[];
}): Promise<DocumentClassificationResult> {
  try {
    const json = await safeFetchJson<{ result: DocumentClassificationResult }>(
      '/api/ai/classify-document',
      data,
      'Lỗi khi phân loại văn bản bằng AI'
    );
    if (json && json.result) {
      return json.result;
    }
  } catch (err) {
    console.warn('[AI Service] Network / API fallback to local classifier:', err);
  }
  return classifyDocumentLocally({
    text: data.text,
    title: data.title,
    fileName: data.fileName,
    departments: data.departments,
    availableStaff: data.availableStaff,
  });
}

export async function summarizeDocumentWithAI(data: {
  title: string;
  content: string;
  docType?: string;
  issuingAuthority?: string;
}): Promise<AISummarizeResult> {
  try {
    const json = await safeFetchJson<{ result: AISummarizeResult }>(
      '/api/ai/summarize-document',
      data,
      'Không thể kết nối đến Trợ lý AI'
    );
    if (json && json.result) {
      return json.result;
    }
  } catch (err) {
    console.warn('[AI Service] Fallback summary:', err);
  }
  const isUrgent = (data.content || data.title || '').toLowerCase().includes('khẩn') || (data.content || data.title || '').toLowerCase().includes('hỏa tốc');
  return {
    summary: (data.content || data.title || '').slice(0, 180) + '...',
    keyRequirements: [
      'Kiểm tra và thẩm định hồ sơ văn bản theo đúng thẩm quyền',
      'Xây dựng văn bản tham mưu hoặc phản hồi cho cơ quan gửi đến',
      'Đảm bảo tiến độ hoàn thành đúng thời hạn quy định',
    ],
    suggestedUrgency: isUrgent ? 'KHAN' : 'THUONG',
    suggestedDueDate: new Date(Date.now() + (isUrgent ? 2 : 5) * 86400000).toISOString().split('T')[0],
    suggestedDepartment: data.issuingAuthority ? 'Văn phòng Cơ quan' : 'Phòng chuyên môn phụ trách',
    actionPlan: '1. Tiếp nhận phân luồng -> 2. Soạn thảo ý kiến tham mưu -> 3. Trình Lãnh đạo phê duyệt.',
  };
}

export async function draftOutgoingDocWithAI(data: {
  docType: string;
  recipient: string;
  goal: string;
  basisDocTitle?: string;
  keyPoints?: string;
}): Promise<AIDraftDocResult> {
  try {
    const json = await safeFetchJson<{ result: AIDraftDocResult }>(
      '/api/ai/draft-outgoing-doc',
      data,
      'Lỗi soạn thảo bằng AI'
    );
    if (json && json.result) {
      return json.result;
    }
  } catch (err) {
    console.warn('[AI Service] Fallback draft doc:', err);
  }
  const today = new Date();
  const dateStr = `ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
  return {
    title: `V/v ${data.goal || 'thực hiện nhiệm vụ được giao'}`,
    draftContent: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n-------------------\nSố: .../VP-TH\n..., ${dateStr}\n\nKính gửi: ${data.recipient || 'Ủy ban nhân dân Tỉnh / Sở Tài chính'}\n\nCăn cứ: ${data.basisDocTitle || 'Kế hoạch công tác năm 2025'};\n${data.docType || 'Công văn'} về việc ${data.goal || 'triển khai nhiệm vụ'}.\n\nNội dung chính:\n${data.keyPoints || '- Đảm bảo đúng quy định pháp luật và tiến độ đề ra.\n- Chủ động phối hợp chặt chẽ giữa các đơn vị liên quan.'}\n\nKính trình cấp có thẩm quyền xem xét, chỉ đạo.\n\nNơi nhận:\n- Như trên;\n- Lưu: VT, TH.\n\nTHỦ TRƯỞNG CƠ QUAN\n(Ký, ghi rõ họ tên, đóng dấu)`,
    suggestedSigner: 'Lãnh đạo Cơ quan / Chánh Văn phòng',
    notes: 'Dự thảo theo chuẩn Nghị định 30/2020/NĐ-CP của Chính phủ.',
  };
}

export async function suggestTaskBreakdownWithAI(data: {
  taskTitle: string;
  description: string;
  dueDate?: string;
  availableStaff?: string[];
}): Promise<AITaskBreakdownResult> {
  try {
    const json = await safeFetchJson<{ result: AITaskBreakdownResult }>(
      '/api/ai/suggest-task-breakdown',
      data,
      'Lỗi phân rã công việc bằng AI'
    );
    if (json && json.result) {
      return json.result;
    }
  } catch (err) {
    console.warn('[AI Service] Fallback task breakdown:', err);
  }
  return {
    subTasks: [
      { title: 'Bước 1: Rà soát căn cứ pháp lý và hồ sơ tài liệu liên quan', daysEstimated: 1, suggestedAssigneeName: 'Chuyên viên phụ trách' },
      { title: 'Bước 2: Soạn thảo dự thảo văn bản / phương án triển khai chi tiết', daysEstimated: 2, suggestedAssigneeName: 'Chuyên viên chuyên môn' },
      { title: 'Bước 3: Lấy ý kiến các phòng ban phối hợp và hoàn thiện nội dung', daysEstimated: 2, suggestedAssigneeName: 'Trưởng phòng' },
      { title: 'Bước 4: Trình Lãnh đạo phê duyệt và phát hành chính thức', daysEstimated: 1, suggestedAssigneeName: 'Lãnh đạo đơn vị' },
    ],
    riskWarning: 'Cần bám sát mốc thời gian để đảm bảo chất lượng và tiến độ.',
    recommendedMilestones: ['Hoàn thiện dự thảo ban đầu', 'Phê duyệt và ban hành'],
  };
}

export interface AIChatMessageItem {
  role: 'user' | 'model';
  text: string;
}

export async function askAIAssistant(data: {
  question: string;
  chatHistory?: AIChatMessageItem[];
  systemContext?: any;
}): Promise<string> {
  try {
    const json = await safeFetchJson<{ answer: string }>(
      '/api/ai/ask-assistant',
      data,
      'Lỗi xử lý phản hồi từ AI'
    );
    if (json && json.answer) {
      return json.answer;
    }
  } catch (err) {
    console.warn('[AI Service] Fallback assistant answer:', err);
  }
  return generateLocalAssistantAnswer(data.question, data.systemContext);
}

