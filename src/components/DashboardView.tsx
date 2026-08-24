import React from 'react';
import {
  Inbox,
  Send,
  AlertCircle,
  CheckCircle2,
  FolderArchive,
  ArrowRight,
  Sparkles,
  Calendar,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { IncomingDocument, OutgoingDocument, Task, Dossier, User, MasterData } from '../types';

interface DashboardViewProps {
  stats: {
    totalIncoming: number;
    pendingIncoming: number;
    urgentIncoming: number;
    totalOutgoing: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    inProgressTasks: number;
    completionRate: number;
  };
  tasks: Task[];
  incomingDocs: IncomingDocument[];
  outgoingDocs: OutgoingDocument[];
  dossiers: Dossier[];
  users: User[];
  onSelectTask: (task: Task) => void;
  onSelectIncomingDoc: (doc: IncomingDocument) => void;
  onSelectDossier: (dossier: Dossier) => void;
  onNavigateTab: (tab: any) => void;
  onOpenAiAssistant: () => void;
  onOpenQuickCreate: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  tasks,
  incomingDocs,
  dossiers,
  users,
  onSelectTask,
  onSelectIncomingDoc,
  onSelectDossier,
  onNavigateTab,
  onOpenAiAssistant,
  onOpenQuickCreate,
}) => {
  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id || d.code === id);

  const recentTasks = tasks.slice(0, 5);
  const recentIncomingDocs = incomingDocs.slice(0, 4);

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">Hoàn thành</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase animate-pulse">Quá hạn</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">Đang thực hiện</span>;
      case 'WAITING_APPROVAL':
        return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">Chờ duyệt</span>;
      case 'NOT_STARTED':
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Chưa bắt đầu</span>;
    }
  };

  const getDocTypeBadge = (type: string) => {
    const upper = type.toUpperCase();
    if (upper.includes('QUYẾT ĐỊNH')) {
      return <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">QUYẾT ĐỊNH</span>;
    }
    if (upper.includes('CHỈ THỊ') || upper.includes('KHẨN')) {
      return <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">HỎA TỐC</span>;
    }
    if (upper.includes('THÔNG BÁO')) {
      return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">THÔNG BÁO</span>;
    }
    return <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">CÔNG VĂN</span>;
  };

  return (
    <section className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* 4 Sleek Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Văn bản đến */}
        <div
          onClick={() => onNavigateTab('incoming_docs')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-tight">Văn bản đến</span>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold">
              +{stats.pendingIncoming} Cần xử lý
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.totalIncoming}</div>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (stats.pendingIncoming / Math.max(1, stats.totalIncoming)) * 100)}%` }}
            ></div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {stats.urgentIncoming > 0 ? `⚠️ Có ${stats.urgentIncoming} văn bản khẩn/hỏa tốc` : 'Đang xử lý đúng quy trình'}
          </span>
        </div>

        {/* Card 2: Văn bản đi */}
        <div
          onClick={() => onNavigateTab('outgoing_docs')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-tight">Văn bản đi</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">Đã lưu trữ</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.totalOutgoing}</div>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full w-[80%]"></div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">Ký số & phát hành thông suốt</span>
        </div>

        {/* Card 3: Việc quá hạn */}
        <div
          onClick={() => onNavigateTab('reminders')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-tight">Việc quá hạn</span>
            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold">Cần xử lý</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {stats.overdueTasks < 10 ? `0${stats.overdueTasks}` : stats.overdueTasks}
          </div>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full"
              style={{ width: `${Math.min(100, stats.overdueTasks * 20)}%` }}
            ></div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">Yêu cầu đôn đốc hạn chót</span>
        </div>

        {/* Card 4: Tỷ lệ hoàn thành */}
        <div
          onClick={() => onNavigateTab('tasks_all')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-tight">Hoàn thành</span>
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">Tiến độ</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.completionRate}%</div>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            ></div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {stats.completedTasks}/{stats.totalTasks} công việc đã xong
          </span>
        </div>
      </div>

      {/* Main Grid: Tasks Table & Incoming Docs List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Theo dõi Công việc */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">Theo dõi Công việc Phân công</h2>
            </div>
            <button
              onClick={() => onNavigateTab('tasks_all')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/70 border-b border-slate-100">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Nội dung công việc</th>
                  <th className="px-4 py-3">Người xử lý</th>
                  <th className="px-4 py-3">Hạn xử lý</th>
                  <th className="px-4 py-3">Tiến độ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentTasks.map((t) => {
                  const assignee = getUser(t.assigneeId);
                  const dossier = getDossier(t.dossierId);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 line-clamp-1 hover:text-indigo-600 transition-colors">
                            {t.title}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-mono">[{t.code}]</span>
                            {dossier && (
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded truncate max-w-[140px]">
                                {dossier.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={assignee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={assignee?.fullName}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200"
                          />
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">
                            {assignee?.fullName || 'Chưa phân công'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.dueDate}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="w-20">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-0.5">
                            <span>{t.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                t.progress >= 100
                                  ? 'bg-emerald-500'
                                  : t.progress > 50
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${t.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">{getStatusBadge(t.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): Văn bản mới đến & Lưu trữ thông minh */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card: Văn bản mới đến */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Văn bản mới đến</h3>
              <button
                onClick={() => onNavigateTab('incoming_docs')}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Xem tất cả &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {recentIncomingDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onSelectIncomingDoc(doc)}
                  className="p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    {getDocTypeBadge(doc.docType)}
                    <span className="text-[10px] text-slate-400 font-medium">{doc.receivedDate}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight hover:text-indigo-600">
                    {doc.summary}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-50 text-[10px] text-slate-500">
                    <span className="truncate max-w-[150px]">Từ: {doc.issuingAuthority}</span>
                    <span className="font-mono text-slate-400">Số: {doc.documentNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Banner Lưu trữ thông minh */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl shadow-lg p-5 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FolderArchive className="w-4 h-4 text-indigo-200" />
                <h3 className="font-bold text-sm">Lưu trữ liên kết theo Mã Hồ sơ</h3>
              </div>
              <p className="text-[11px] text-indigo-100 leading-relaxed mb-4">
                Hệ thống liên kết tự động Văn bản đến/đi, nhiệm vụ phân công và tài liệu số theo từng mã vụ việc, chống thất lạc thông tin 100%.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onNavigateTab('dossiers')}
                className="flex-1 bg-white text-indigo-700 text-xs font-bold py-2 px-3 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm text-center"
              >
                Tra cứu Hồ sơ ({dossiers.length})
              </button>
              <button
                onClick={onOpenAiAssistant}
                className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold p-2 rounded-lg transition-colors flex items-center justify-center"
                title="Hỏi AI"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
