import React, { useState } from 'react';
import {
  Code2,
  Terminal,
  Key,
  FolderGit2,
  Server,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Database,
  Layers,
} from 'lucide-react';

export const VsCodeGuideView: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const steps = [
    {
      number: '01',
      title: 'Tải mã nguồn về máy tính & Mở bằng VS Code',
      description:
        'Bạn có thể xuất mã nguồn dự án này (dạng file .ZIP hoặc kết nối GitHub qua menu của AI Studio) về máy tính cá nhân.',
      details: [
        'Tải và cài đặt phần mềm VS Code (Visual Studio Code) từ trang chính thức: https://code.visualstudio.com/',
        'Cài đặt môi trường chạy Node.js (phiên bản LTS v18 trở lên) từ: https://nodejs.org/',
        'Giải nén mã nguồn vào một thư mục trên máy (ví dụ: `C:/Projects/quan-ly-van-ban` hoặc `/Users/name/quan-ly-van-ban`).',
        'Mở VS Code -> Chọn **File** -> **Open Folder...** -> Chọn thư mục dự án vừa giải nén.',
      ],
    },
    {
      number: '02',
      title: 'Cài đặt các thư viện (Dependencies)',
      description:
        'Mở Terminal tích hợp trong VS Code (phím tắt `Ctrl + \`` trên Windows hoặc `Cmd + \`` trên macOS) và chạy lệnh sau:',
      code: 'npm install',
      codeId: 'cmd-install',
    },
    {
      number: '03',
      title: 'Cấu hình Khóa API AI (GEMINI_API_KEY)',
      description:
        'Tạo file `.env` ở thư mục gốc của dự án (cùng cấp với `package.json`) để lưu khóa API của Google Gemini.',
      code: `# File .env tại thư mục gốc
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
PORT=3000`,
      codeId: 'env-code',
      extraInfo:
        'Khóa API miễn phí có thể lấy tại: https://aistudio.google.com/app/apikey. Hệ thống sử dụng thư viện chuẩn `@google/genai` với mô hình mới nhất `gemini-3.7-flash`.',
    },
    {
      number: '04',
      title: 'Khởi chạy phần mềm ở chế độ Phát triển (Dev Mode)',
      description:
        'Trong Terminal của VS Code, gõ lệnh khởi chạy server fullstack tích hợp giao diện React và Backend API:',
      code: 'npm run dev',
      codeId: 'cmd-run',
      details: [
        'Server sẽ khởi chạy tại đường dẫn: `http://localhost:3000`',
        'Mở trình duyệt Web (Chrome, Edge, Safari) và truy cập `http://localhost:3000` để sử dụng phần mềm mượt mà.',
        'Mọi thay đổi code trong thư mục `src/` hoặc `server.ts` sẽ được cập nhật tự động.',
      ],
    },
  ];

  const extensions = [
    { name: 'Tailwind CSS IntelliSense', desc: 'Gợi ý tự động và highlight cú pháp Tailwind CSS cực nhanh' },
    { name: 'ESLint', desc: 'Kiểm tra lỗi cú pháp và đảm bảo chuẩn quy tắc TypeScript' },
    { name: 'Prettier - Code formatter', desc: 'Tự động căn chỉnh format code đẹp mắt mỗi khi bấm Save' },
    { name: 'Gemini Code Assist / GitHub Copilot', desc: 'Trợ lý AI hỗ trợ gợi ý code thông minh ngay trong file' },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Laptop className="w-6 h-6" />
            </div>
            <h1 className="text-lg md:text-xl font-black">
              Hướng Dẫn Code & Chạy Dự Án Trên VS Code
            </h1>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Dự án được xây dựng theo kiến trúc hiện đại: <strong>React 19 + TypeScript + Tailwind CSS</strong> ở Client và <strong>Node.js / Express + Google GenAI SDK (@google/genai)</strong> ở Server.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Full-stack Sẵn Sàng
          </span>
        </div>
      </div>

      {/* 4 Steps */}
      <div className="space-y-5">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-600" />
          Các bước thiết lập và chạy trên máy tính
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-black text-sm flex items-center justify-center border border-indigo-100">
                  {step.number}
                </span>
                <h3 className="font-bold text-slate-800 text-sm">{step.title}</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>

              {step.code && (
                <div className="relative bg-slate-900 rounded-xl p-3.5 text-xs font-mono text-emerald-400">
                  <pre className="overflow-x-auto custom-scrollbar">{step.code}</pre>
                  <button
                    onClick={() => copyToClipboard(step.code!, step.codeId!)}
                    className="absolute right-2.5 top-2.5 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] flex items-center gap-1"
                  >
                    {copiedCode === step.codeId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCode === step.codeId ? 'Đã chép' : 'Copy'}</span>
                  </button>
                </div>
              )}

              {step.details && (
                <ul className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-100 list-disc list-inside">
                  {step.details.map((d, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {d}
                    </li>
                  ))}
                </ul>
              )}

              {step.extraInfo && (
                <div className="text-[11px] text-indigo-700 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                  {step.extraInfo}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommended VS Code Extensions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          Extension khuyên dùng trong VS Code để code nhanh & chuẩn
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {extensions.map((ext) => (
            <div key={ext.name} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="font-bold text-xs text-slate-800 block mb-1">{ext.name}</span>
              <p className="text-[11px] text-slate-500">{ext.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture & AI Integration Note */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Cấu trúc Tích hợp AI Gemini trong Code
        </h3>

        <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
          <p>
            1. <strong>Phía Server (`/server.ts`):</strong> Sử dụng SDK <code>@google/genai</code> gọi mô hình <code>gemini-3.7-flash</code> qua các Endpoint REST API:
          </p>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1 text-slate-700">
            <div>• POST <code>/api/ai/summarize-document</code>: Tóm tắt & trích xuất thuộc tính văn bản đến</div>
            <div>• POST <code>/api/ai/draft-outgoing-doc</code>: Soạn thảo văn bản đi chuẩn Nghị định 30</div>
            <div>• POST <code>/api/ai/suggest-task-breakdown</code>: Phân rã nhiệm vụ & cảnh báo rủi ro</div>
            <div>• POST <code>/api/ai/ask-assistant</code>: Chatbot trợ lý quản lý điều hành</div>
          </div>
          <p>
            2. <strong>Phía Client (`/src/services/aiService.ts`):</strong> Các hàm TypeScript gọn gàng gọi vào server nội bộ, giúp bảo mật tuyệt đối mã khóa API trên máy chủ.
          </p>
        </div>
      </div>
    </div>
  );
};
