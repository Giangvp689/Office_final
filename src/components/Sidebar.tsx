import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  Send,
  CheckSquare,
  UserCheck,
  Calendar,
  Bell,
  FolderArchive,
  Contact2,
  Files,
  Sliders,
  History,
  Bot,
  Laptop,
  Users,
  Sparkles,
  BrainCircuit,
} from 'lucide-react';
import { User, Role } from '../types';

export type NavSection =
  | 'DASHBOARD'
  | 'CLASSIFIER_STUDIO'
  | 'INCOMING_DOCS'
  | 'OUTGOING_DOCS'
  | 'DOSSIERS'
  | 'ALL_TASKS'
  | 'MY_ASSIGNED_TASKS'
  | 'MY_DELEGATED_TASKS'
  | 'CALENDAR'
  | 'REMINDERS'
  | 'PERSONNEL'
  | 'VAULT'
  | 'MASTER_DATA'
  | 'AUDIT_LOGS'
  | 'AI_ASSISTANT'
  | 'VSCODE_GUIDE';

export type TabKey = NavSection; // For backwards compatibility

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  currentUser: User;
  onOpenUserSwitch: () => void;
  counts: {
    incoming: number;
    outgoing: number;
    myTasks: number;
    overdue: number;
    reminders: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  currentUser,
  onOpenUserSwitch,
  counts,
}) => {
  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Quản trị viên', bg: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'LEADER':
        return { label: 'Lãnh đạo cơ quan', bg: 'bg-rose-100 text-rose-700 border-rose-200' };
      case 'CLERK':
        return { label: 'Văn thư lưu trữ', bg: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'STAFF':
      default:
        return { label: 'Chuyên viên xử lý', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
  };

  const roleBadge = getRoleBadge(currentUser.role);

  return (
    <aside
      id="app-sidebar"
      className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 select-none"
    >
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm shadow-indigo-200">
            V
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-slate-800 leading-tight tracking-tight truncate">
              VĂN PHÒNG SỐ
            </span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase truncate">
              Hồ Sơ & Điều Hành
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="p-3 border-b border-slate-100 space-y-2">
        <button
          id="btn-nav-classifier-studio"
          onClick={() => onSelectSection('CLASSIFIER_STUDIO')}
          className={`w-full text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 border cursor-pointer ${
            currentSection === 'CLASSIFIER_STUDIO'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-700 shadow-md shadow-indigo-200 ring-2 ring-indigo-200'
              : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-transparent shadow-xs'
          }`}
        >
          <BrainCircuit className="w-4 h-4 text-white animate-pulse" />
          <span className="truncate">Phân Loại Văn Bản (AI)</span>
          <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-black">CỐT LÕI</span>
        </button>

        <button
          id="btn-nav-ai"
          onClick={() => onSelectSection('AI_ASSISTANT')}
          className={`w-full text-xs font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 border cursor-pointer ${
            currentSection === 'AI_ASSISTANT'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-gradient-to-r from-violet-50 to-indigo-50 hover:from-violet-100 hover:to-indigo-100 text-indigo-700 border-indigo-200/80 shadow-2xs'
          }`}
        >
          <Bot className="w-4 h-4 text-indigo-600" />
          <span>Trợ Lý Gemini AI</span>
        </button>

        <button
          id="btn-nav-vscode"
          onClick={() => onSelectSection('VSCODE_GUIDE')}
          className={`w-full text-[11px] font-bold py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 border cursor-pointer ${
            currentSection === 'VSCODE_GUIDE'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          <Laptop className="w-3.5 h-3.5 text-emerald-600" />
          <span>Hướng Dẫn Chạy Offline</span>
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
        {/* Nhóm 1: Bàn làm việc & Lịch */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
            Tổng quan & Lịch
          </div>
          <div className="space-y-0.5">
            <button
              id="nav-dashboard"
              onClick={() => onSelectSection('DASHBOARD')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'DASHBOARD'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Bàn Làm Việc (Tổng quan)</span>
            </button>

            <button
              id="nav-calendar"
              onClick={() => onSelectSection('CALENDAR')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'CALENDAR'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Lịch Công Tác & Hạn Chót</span>
            </button>

            <button
              id="nav-reminders"
              onClick={() => onSelectSection('REMINDERS')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'REMINDERS'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" />
                <span>Nhắc Việc & Trễ Hạn</span>
              </div>
              {counts.overdue > 0 && (
                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {counts.overdue}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Nhóm 2: Văn bản & Hồ sơ */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
            Văn bản & Hồ sơ
          </div>
          <div className="space-y-0.5">
            <button
              id="nav-incoming"
              onClick={() => onSelectSection('INCOMING_DOCS')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'INCOMING_DOCS'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4 text-blue-600" />
                <span>Quản Lý Văn Bản Đến</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {counts.incoming}
              </span>
            </button>

            <button
              id="nav-outgoing"
              onClick={() => onSelectSection('OUTGOING_DOCS')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'OUTGOING_DOCS'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Quản Lý Văn Bản Đi</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {counts.outgoing}
              </span>
            </button>

            <button
              id="nav-dossiers"
              onClick={() => onSelectSection('DOSSIERS')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'DOSSIERS'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FolderArchive className="w-4 h-4 text-indigo-600" />
              <span>Hồ Sơ Vụ Việc (Mã HS)</span>
            </button>

            <button
              id="nav-vault"
              onClick={() => onSelectSection('VAULT')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'VAULT'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Files className="w-4 h-4 text-slate-500" />
              <span>Kho Tài Liệu & Đính Kèm</span>
            </button>
          </div>
        </div>

        {/* Nhóm 3: Điều hành Công việc */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
            Điều Hành Công Việc
          </div>
          <div className="space-y-0.5">
            <button
              id="nav-my-tasks"
              onClick={() => onSelectSection('MY_ASSIGNED_TASKS')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'MY_ASSIGNED_TASKS'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Việc Được Giao</span>
              </div>
              {counts.myTasks > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {counts.myTasks}
                </span>
              )}
            </button>

            <button
              id="nav-delegated-tasks"
              onClick={() => onSelectSection('MY_DELEGATED_TASKS')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'MY_DELEGATED_TASKS'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Việc Tôi Đã Giao Đi</span>
            </button>

            <button
              id="nav-all-tasks"
              onClick={() => onSelectSection('ALL_TASKS')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'ALL_TASKS'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              <span>Tất Cả Công Việc</span>
            </button>
          </div>
        </div>

        {/* Nhóm 4: Quản trị hệ thống */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
            Quản Trị & Danh Mục
          </div>
          <div className="space-y-0.5">
            <button
              id="nav-personnel"
              onClick={() => onSelectSection('PERSONNEL')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'PERSONNEL'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Contact2 className="w-4 h-4" />
              <span>Nhân Sự & Phân Quyền</span>
            </button>

            <button
              id="nav-master-data"
              onClick={() => onSelectSection('MASTER_DATA')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'MASTER_DATA'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Danh Mục Dùng Chung</span>
            </button>

            <button
              id="nav-audit-logs"
              onClick={() => onSelectSection('AUDIT_LOGS')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                currentSection === 'AUDIT_LOGS'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Lịch Sử & Kiểm Toán</span>
            </button>
          </div>
        </div>
      </nav>

      {/* User Footer Profile & Role Switcher */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/70">
        <div
          onClick={onOpenUserSwitch}
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white hover:shadow-xs transition-all cursor-pointer group"
          title="Bấm để chuyển đổi vai trò / cán bộ"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.fullName}
            className="w-9 h-9 rounded-xl object-cover border border-slate-200"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600">
              {currentUser.fullName}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border inline-block max-w-max mt-0.5 ${roleBadge.bg}`}
            >
              {roleBadge.label}
            </span>
          </div>
          <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
        </div>
      </div>
    </aside>
  );
};
