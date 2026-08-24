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

export async function summarizeDocumentWithAI(data: {
  title: string;
  content: string;
  docType?: string;
  issuingAuthority?: string;
}): Promise<AISummarizeResult> {
  const response = await fetch('/api/ai/summarize-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể kết nối đến Trợ lý AI');
  }
  const json = await response.json();
  return json.result;
}

export async function draftOutgoingDocWithAI(data: {
  docType: string;
  recipient: string;
  goal: string;
  basisDocTitle?: string;
  keyPoints?: string;
}): Promise<AIDraftDocResult> {
  const response = await fetch('/api/ai/draft-outgoing-doc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Lỗi soạn thảo bằng AI');
  }
  const json = await response.json();
  return json.result;
}

export async function suggestTaskBreakdownWithAI(data: {
  taskTitle: string;
  description: string;
  dueDate?: string;
  availableStaff?: string[];
}): Promise<AITaskBreakdownResult> {
  const response = await fetch('/api/ai/suggest-task-breakdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Lỗi phân rã công việc bằng AI');
  }
  const json = await response.json();
  return json.result;
}

export async function askAIAssistant(data: {
  question: string;
  systemContext?: any;
}): Promise<string> {
  const response = await fetch('/api/ai/ask-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Lỗi xử lý phản hồi từ AI');
  }
  const json = await response.json();
  return json.answer || 'Không có phản hồi từ AI';
}
