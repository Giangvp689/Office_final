import React from 'react';
import {
  IncomingDocument,
  OutgoingDocument,
  Task,
  User,
  Dossier,
  AttachmentFile,
} from '../types';
import {
  FileText,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FolderKanban,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';

interface DashboardViewProps {
  incomingDocs: IncomingDocument[];
  outgoingDocs: OutgoingDocument[];
  tasks: Task[];
  users: User[];
  dossiers: Dossier[];
  attachments: AttachmentFile[];
  onSelectSection: (section: any) => void;
  onOpenTaskDetail: (taskId: string) => void;
  onOpenIncomingDocDetail: (docId: string) => void;
  onOpenDossierDetail: (dossierId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  incomingDocs,
  outgoingDocs,
  tasks,
  users,
  dossiers,
  onSelectSection,
  onOpenTaskDetail,
  onOpenIncomingDocDetail,
  onOpenDossierDetail,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const totalIncoming = incomingDocs.length;
  const totalOutgoing = outgoingDocs.length;
  const overdueTasks = tasks.filter(
    (t) => t.status === 'OVERDUE' || (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate < today)
  );
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const urgentIncoming = incomingDocs.filter(
    (d) => (d.urgency === 'HOA_TOC' || d.urgency === 'KHAN' || d.urgency === 'THUONG_KHAN') && d.status !== 'COMPLETED'
  );

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id);

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">
            Hoàn thành
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase">
            Quá hạn
          </span>
        );
      case 'WAITING_APPROVAL':
        return (
          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">
            Chờ duyệt
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">
            Đang thực hiện
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
            Chưa bắt đầu
          </span>
        );
    }
  };

  const getUrgencyBadge = (urgency: IncomingDocument['urgency']) => {
    switch (urgency) {
      case 'HOA_TOC':
        return <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">HỎA TỐC</span>;
      case 'KHAN':
      case 'THUONG_KHAN':
        return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">KHẨN</span>;
      default:
        return <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">THƯỜNG</span>;
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      {/* 4 Stat Cards - Sleek Interface Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Văn bản đến */}
        <div
          onClick={() => onSelectSection('INCOMING_DOCS')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">
              Văn bản đến
            </span>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold">
              +{incomingDocs.filter((d) => d.status === 'PROCESSING').length} Đang xử lý
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
            {totalIncoming}
          </div>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalIncoming / 10) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Đã giao: {incomingDocs.filter((d) => d.assigneeId).length}</span>
            <span className="text-rose-500 font-semibold">{urgentIncoming.length} văn bản khẩn</span>
          </div>
        </div>

        {/* Card 2: Văn bản đi */}
        <div
          onClick={() => onSelectSection('OUTGOING_DOCS')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">
              Văn bản đi
            </span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
              Đã phát hành
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
            {totalOutgoing}
          </div>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalOutgoing / 8) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Đã ký ban hành: {outgoingDocs.filter((d) => d.status === 'ISSUED' || d.status === 'SENT').length}</span>
            <span>Dự thảo: {outgoingDocs.filter((d) => d.status === 'DRAFT').length}</span>
          </div>
        </div>

        {/* Card 3: Việc quá hạn (Thẻ cảnh báo nổi bật) */}
        <div
          onClick={() => onSelectSection('REMINDERS')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-rose-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">
              Việc quá hạn
            </span>
            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold">
              Cần xử lý gấp
            </span>
          </div>
          <div className="text-3xl font-black text-rose-600 tracking-tight">
            {String(overdueTasks.length).padStart(2, '0')}
          </div>
          <div className="mt-3 h-1.5 bg-rose-100 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overdueTasks.length * 25)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            {overdueTasks.length > 0 ? 'Đôn đốc cán bộ phụ trách ngay' : 'Không có công việc trễ hạn'}
          </div>
        </div>

        {/* Card 4: Hoàn thành tiến độ */}
        <div
          onClick={() => onSelectSection('ALL_TASKS')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">
              Tỷ lệ hoàn thành
            </span>
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
              {completedTasks.length}/{tasks.length} Việc
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-amber-600 transition-colors">
            {completionRate}%
          </div>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Tổng số {tasks.length} nhiệm vụ đang được quản lý
          </div>
        </div>
      </div>

      {/* Main Grid: Tasks Table (8 cols) + Right Side Feed (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Tasks Follow-up Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="font-bold text-slate-800 text-sm md:text-base">
                Theo dõi Tiến độ Công việc Phân công
              </h2>
            </div>
            <button
              onClick={() => onSelectSection('ALL_TASKS')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-200/80">
                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Nội dung công việc</th>
                  <th className="px-4 py-3">Người xử lý</th>
                  <th className="px-4 py-3">Hạn xử lý</th>
                  <th className="px-4 py-3">Tiến độ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tasks.slice(0, 6).map((task) => {
                  const assignee = getUser(task.assigneeId);
                  const dossier = getDossier(task.dossierId);
                  return (
                    <tr
                      key={task.id}
                      onClick={() => onOpenTaskDetail(task.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {task.title}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{task.code}
                            </span>
                            {dossier && (
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-medium">
                                {dossier.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={assignee.avatar}
                              alt={assignee.fullName}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <span className="text-xs text-slate-700 font-medium whitespace-nowrap">
                              {assignee.fullName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa giao</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium whitespace-nowrap">
                        <span
                          className={
                            task.dueDate < today && task.status !== 'COMPLETED'
                              ? 'text-rose-600 font-bold'
                              : 'text-slate-600'
                          }
                        >
                          {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="w-24">
                          <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                            <span>{task.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                task.progress === 100
                                  ? 'bg-emerald-500'
                                  : task.progress > 50
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Incoming Docs & Smart Dossier Binder */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Box 1: Văn bản mới đến */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm md:text-base">Văn bản mới đến</h3>
              <button
                onClick={() => onSelectSection('INCOMING_DOCS')}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Tất cả &rarr;
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {incomingDocs.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onOpenIncomingDocDetail(doc.id)}
                  className="p-3 rounded-xl border border-slate-200/70 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">
                        {doc.docType}
                      </span>
                      {getUrgencyBadge(doc.urgency)}
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(doc.receivedDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                    {doc.summary}
                  </p>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span className="truncate">{doc.issuingAuthority}</span>
                    <span className="font-mono font-medium text-slate-600">
                      Số: {doc.documentNumber}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Box 2: Smart Dossier Banner - Sleek Indigo Theme */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-lg p-5 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FolderKanban className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-sm">Quản lý theo Mã Hồ Sơ</h3>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed mb-4">
                Hệ thống tự động liên kết tất cả văn bản đến, văn bản đi, công việc và tài liệu theo từng mã hồ sơ vụ việc chuyên biệt.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => onSelectSection('DOSSIERS')}
                className="w-full bg-white text-indigo-700 text-xs font-bold py-2.5 rounded-lg hover:bg-indigo-50 transition-colors shadow-xs"
              >
                Tra cứu danh sách hồ sơ ({dossiers.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
