import { DocumentClassificationResult } from '../types';

export interface AISummarizeResult {
  summary: string;
  keyRequirements: string[];
  suggestedUrgency: 'THUONG' | 'KHAN' | 'HOA_TOC';
  suggestedDueDate: string;
  suggestedDepartment: string;
  actionPlan: string;
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
  const json = await safeFetchJson<{ result: DocumentClassificationResult }>(
    '/api/ai/classify-document',
    data,
    'Lỗi khi phân loại văn bản bằng AI'
  );
  return json.result;
}

export async function summarizeDocumentWithAI(data: {
  title: string;
  content: string;
  docType?: string;
  issuingAuthority?: string;
}): Promise<AISummarizeResult> {
  const json = await safeFetchJson<{ result: AISummarizeResult }>(
    '/api/ai/summarize-document',
    data,
    'Không thể kết nối đến Trợ lý AI'
  );
  return json.result;
}

export async function draftOutgoingDocWithAI(data: {
  docType: string;
  recipient: string;
  goal: string;
  basisDocTitle?: string;
  keyPoints?: string;
}): Promise<AIDraftDocResult> {
  const json = await safeFetchJson<{ result: AIDraftDocResult }>(
    '/api/ai/draft-outgoing-doc',
    data,
    'Lỗi soạn thảo bằng AI'
  );
  return json.result;
}

export async function suggestTaskBreakdownWithAI(data: {
  taskTitle: string;
  description: string;
  dueDate?: string;
  availableStaff?: string[];
}): Promise<AITaskBreakdownResult> {
  const json = await safeFetchJson<{ result: AITaskBreakdownResult }>(
    '/api/ai/suggest-task-breakdown',
    data,
    'Lỗi phân rã công việc bằng AI'
  );
  return json.result;
}

export async function askAIAssistant(data: {
  question: string;
  systemContext?: any;
}): Promise<string> {
  const json = await safeFetchJson<{ answer: string }>(
    '/api/ai/ask-assistant',
    data,
    'Lỗi xử lý phản hồi từ AI'
  );
  return json.answer || 'Không có phản hồi từ AI';
}
