import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  CheckSquare,
  RefreshCw,
  Lightbulb,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { askAIAssistant, AIChatMessageItem } from '../services/aiService';
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
      text: `Xin chào đồng chí **${currentUser?.fullName || 'Cán bộ'}**! Tôi là **Trợ lý Gemini AI Cấp Cao** của Hệ thống Quản Lý & Điều Hành Văn Phòng.

Tôi nắm rõ toàn bộ **${incomingDocs.length} văn bản đến**, **${outgoingDocs.length} văn bản đi**, **${tasks.length} nhiệm vụ** và **${dossiers.length} hồ sơ vụ việc** hiện có trong hệ thống.

Đồng chí có thể nhắn tin hỏi tôi bất kỳ nội dung nào:
1. 📋 **Tóm tắt chuyên sâu văn bản đến** và bóc tách các yêu cầu, nhiệm vụ cần thi hành.
2. ⚠️ **Phân tích công việc quá hạn** hoặc đôn đốc chuyên viên bám sát tiến độ.
3. 🚨 **Rà soát văn bản Hỏa tốc / Khẩn** cần xử lý ưu tiên trong ngày.
4. 📝 **Hướng dẫn & Soạn thảo dự thảo văn bản** theo thể thức chuẩn **Nghị định 30/2020/NĐ-CP**.
5. 🔍 **Tra cứu chi tiết** số hiệu văn bản, người thụ lý, mốc thời hạn hoặc thống kê theo phòng ban.

Đồng chí cần hỗ trợ nội dung gì hôm nay?`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const samplePrompts = [
    'Tóm tắt các văn bản đến mới nhất và bóc tách các yêu cầu, nhiệm vụ cần thi hành.',
    'Thống kê chi tiết các công việc quá hạn, ai phụ trách và phương án giải quyết?',
    'Rà soát các văn bản Hỏa tốc / Khẩn chưa xử lý và tiến độ luân chuyển.',
    'Soạn dự thảo công văn báo cáo UBND Tỉnh về tiến độ nhiệm vụ theo Nghị định 30.',
    'Phân tích khối lượng công việc và tiến độ theo từng phòng ban.',
    'Tìm kiếm tất cả các văn bản và công việc liên quan đến tài chính, ngân sách.',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleClearChat = () => {
    if (confirm('Đồng chí có chắc muốn làm mới cuộc trò chuyện với Trợ lý AI?')) {
      setMessages([
        {
          sender: 'ai',
          text: `Đã làm mới cuộc hội thoại! Tôi sẵn sàng hỗ trợ đồng chí ${currentUser?.fullName || 'Cán bộ'} tra cứu và xử lý công việc tiếp theo.`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

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
      // Build full real-time system context
      const systemContext = {
        currentUser,
        incomingDocs,
        outgoingDocs,
        tasks,
        dossiers,
        users,
        totalIncoming: incomingDocs.length,
        totalOutgoing: outgoingDocs.length,
        totalTasks: tasks.length,
        overdueTasks: tasks
          .filter((t) => t.status === 'OVERDUE' || (t.dueDate && t.dueDate < new Date().toISOString().split('T')[0]))
          .map((t) => ({
            code: t.code,
            title: t.title,
            dueDate: t.dueDate,
            assigneeName: users.find((u) => u.id === t.assigneeId)?.fullName || 'Chưa rõ',
            progress: t.progress,
            status: t.status,
          })),
        urgentDocs: incomingDocs
          .filter((d) => (d.urgency === 'HOA_TOC' || d.urgency === 'KHAN' || d.urgency === 'THUONG_KHAN') && d.status !== 'COMPLETED')
          .map((d) => ({
            number: d.documentNumber,
            officialNumber: d.officialNumber,
            authority: d.issuingAuthority,
            summary: d.summary,
            urgency: d.urgency,
            dueDate: d.dueDate,
            assigneeName: users.find((u) => u.id === d.assigneeId)?.fullName || 'Chưa phân công',
          })),
      };

      // Map conversation history
      const chatHistory: AIChatMessageItem[] = messages.slice(-10).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      // Call Gemini API through backend proxy (with graceful fallback inside askAIAssistant)
      const answer = await askAIAssistant({
        question: query,
        chatHistory,
        systemContext,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: answer,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      console.warn('[AIAssistantView] Fallback execution:', err);
      const fallbackAns = generateLocalAssistantAnswer(query, {
        currentUser,
        incomingDocs,
        outgoingDocs,
        tasks,
        dossiers,
        users,
      });
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
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-hidden flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0 mb-4 bg-white p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Trợ Lý Gemini AI Điều Hành & Phân Tích Văn Bản</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Nắm toàn bộ dữ liệu CSDL
              </span>
            </div>
            <p className="text-xs text-slate-500">Mô hình AI thế hệ mới: Trả lời tự do mọi câu hỏi, tóm tắt sâu, bóc tách yêu cầu và tư vấn thể thức NĐ 30/2020/NĐ-CP</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors text-xs flex items-center gap-1.5 font-medium"
            title="Làm mới cuộc trò chuyện"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-4 rounded-2xl max-w-3xl leading-relaxed whitespace-pre-line group relative shadow-xs ${
                m.sender === 'user'
                  ? 'bg-slate-900 text-white rounded-br-xs'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
              }`}
            >
              <div className="prose prose-xs max-w-none text-slate-800 leading-relaxed">
                {m.sender === 'user' ? (
                  <p className="text-white font-medium">{m.text}</p>
                ) : (
                  <div className="space-y-2 text-xs leading-relaxed text-slate-800">
                    {m.text}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 mt-3 pt-2 border-t border-slate-100">
                <span
                  className={`text-[10px] ${
                    m.sender === 'user' ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </span>

                {m.sender === 'ai' && (
                  <button
                    onClick={() => handleCopy(m.text, idx)}
                    className="opacity-60 group-hover:opacity-100 text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-all"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {m.sender === 'user' && (
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser?.fullName || 'User'}
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 mt-1"
              />
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-slate-600 italic">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 rounded-full bg-pink-600 animate-bounce [animation-delay:0.4s]"></div>
              <span className="font-medium text-slate-600 not-italic ml-1">
                Trợ lý Gemini đang phân tích dữ liệu toàn hệ thống và suy nghĩ câu trả lời...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 self-center mr-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Gợi ý câu hỏi:
        </span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[11px] bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-xl px-3 py-1.5 transition-all text-left shadow-2xs font-medium"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2 shrink-0 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Nhập bất kỳ câu hỏi, yêu cầu tra cứu, tóm tắt hoặc soạn thảo văn bản..."
          className="flex-1 p-2 bg-transparent border-none text-xs outline-none text-slate-800 placeholder-slate-400"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Gửi</span>
        </button>
      </div>
    </div>
  );
};
