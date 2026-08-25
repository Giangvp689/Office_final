import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  FileText,
  CheckSquare,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { askAIAssistant } from '../services/aiService';
import { generateLocalAssistantAnswer } from '../utils/localAssistant';
import { IncomingDocument, OutgoingDocument, Task, User as UserType, Dossier } from '../types';

interface AIAssistantViewProps {
  incomingDocs: IncomingDocument[];
  outgoingDocs: OutgoingDocument[];
  tasks: Task[];
  users: UserType[];
  dossiers: Dossier[];
  currentUser: UserType;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  incomingDocs,
  outgoingDocs,
  tasks,
  users,
  dossiers,
  currentUser,
}) => {
  const [messages, setMessages] = useState<
    Array<{ sender: 'user' | 'ai'; text: string; timestamp: string }>
  >([
    {
      sender: 'ai',
      text: `Xin chào đồng chí ${currentUser?.fullName || 'Cán bộ'}! Tôi là Trợ lý AI Quản lý Văn bản & Điều hành Công việc. 
Tôi có thể giúp đồng chí:
1. Tra cứu văn bản đến, văn bản đi và hồ sơ vụ việc đang thụ lý.
2. Phân tích danh sách công việc trễ hạn và đề xuất biện pháp đôn đốc.
3. Hướng dẫn soạn thảo văn bản hành chính theo thể thức chuẩn Nghị định 30/2020/NĐ-CP.
4. Tóm tắt các nhiệm vụ trọng tâm cần hoàn thành trong tuần.

Đồng chí cần hỗ trợ nội dung gì hôm nay?`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const samplePrompts = [
    'Thống kê các công việc quá hạn hiện tại và đề xuất phân công lại.',
    'Có văn bản đến nào ở mức Hỏa tốc chưa được xử lý không?',
    'Tóm tắt các hồ sơ vụ việc đang mở của đơn vị.',
    'Hướng dẫn các thành phần thể thức bắt buộc của một Tờ trình theo NĐ 30.',
  ];

  const handleSend = async (customPrompt?: string) => {
    const query = customPrompt || input;
    if (!query.trim() || isLoading) return;

    const userMsg = {
      sender: 'user' as const,
      text: query,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const systemContext = {
        totalIncoming: incomingDocs.length,
        totalOutgoing: outgoingDocs.length,
        totalTasks: tasks.length,
        overdueTasks: tasks
          .filter((t) => t.status === 'OVERDUE' || t.dueDate < new Date().toISOString().split('T')[0])
          .map((t) => ({ code: t.code, title: t.title, dueDate: t.dueDate })),
        urgentDocs: incomingDocs
          .filter((d) => d.urgency === 'HOA_TOC' || d.urgency === 'KHAN')
          .map((d) => ({ number: d.documentNumber, summary: d.summary, urgency: d.urgency })),
        dossiers: dossiers.map((d) => ({ code: d.code, title: d.title, status: d.status })),
      };

      // Race against 2.5s timeout: if cloud takes too long, instantly respond with local smart engine!
      const aiPromise = askAIAssistant({
        question: query,
        systemContext,
      });

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_USE_LOCAL')), 2000)
      );

      let answer = '';
      try {
        answer = await Promise.race([aiPromise, timeoutPromise]);
      } catch (raceErr: any) {
        // Instant smart local answer
        answer = generateLocalAssistantAnswer(query, systemContext);
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: answer,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      const systemContext = {
        totalIncoming: incomingDocs.length,
        totalOutgoing: outgoingDocs.length,
        totalTasks: tasks.length,
        overdueTasks: tasks.filter((t) => t.status === 'OVERDUE'),
        urgentDocs: incomingDocs.filter((d) => d.urgency === 'HOA_TOC' || d.urgency === 'KHAN'),
        dossiers,
      };
      const fallbackAns = generateLocalAssistantAnswer(query, systemContext);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: fallbackAns,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-hidden flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Trợ Lý AI Gemini Quản Lý & Điều Hành</h1>
            <p className="text-xs text-slate-500">Mô hình AI đa năng hỗ trợ phân tích dữ liệu, tra cứu hồ sơ và tư vấn thể thức</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 text-xs ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'ai' && (
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-4 rounded-2xl max-w-2xl leading-relaxed whitespace-pre-line ${
                m.sender === 'user'
                  ? 'bg-slate-900 text-white rounded-br-xs'
                  : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-bl-xs'
              }`}
            >
              <p>{m.text}</p>
              <span
                className={`text-[9px] block mt-2 text-right ${
                  m.sender === 'user' ? 'text-slate-400' : 'text-slate-400'
                }`}
              >
                {m.timestamp}
              </span>
            </div>

            {m.sender === 'user' && (
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser?.fullName || 'User'}
                className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0 mt-1"
              />
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-slate-500 italic">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              AI đang phân tích dữ liệu và suy nghĩ câu trả lời...
            </div>
          </div>
        )}
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex flex-wrap gap-2 mb-3 shrink-0">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 self-center mr-1">
          <Lightbulb className="w-3.5 h-3.5" /> Gợi ý:
        </span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[11px] bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-lg px-3 py-1 transition-colors text-left"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2 shrink-0 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Nhập câu hỏi hoặc yêu cầu cho Trợ lý AI..."
          className="flex-1 p-2.5 bg-transparent border-none text-xs outline-none text-slate-800 placeholder-slate-400"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Gửi</span>
        </button>
      </div>
    </div>
  );
};
