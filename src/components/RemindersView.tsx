import React from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  Send,
  Calendar,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Task, IncomingDocument, User, Dossier } from '../types';

interface RemindersViewProps {
  tasks: Task[];
  incomingDocs: IncomingDocument[];
  users: User[];
  dossiers: Dossier[];
  onSelectTask: (task: Task) => void;
  onSelectDoc: (doc: IncomingDocument) => void;
  onSendReminder: (targetId: string, assigneeName: string, title: string) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  tasks,
  incomingDocs,
  users,
  dossiers,
  onSelectTask,
  onSelectDoc,
  onSendReminder,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const in3DaysDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id || d.code === id);

  // 1. Quá hạn
  const overdueTasks = tasks.filter((t) => t.status !== 'COMPLETED' && (t.status === 'OVERDUE' || t.dueDate < today));
  const overdueDocs = incomingDocs.filter((d) => d.status !== 'COMPLETED' && (d.status === 'OVERDUE' || d.dueDate < today));

  // 2. Đến hạn hôm nay
  const dueTodayTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.dueDate === today);
  const dueTodayDocs = incomingDocs.filter((d) => d.status !== 'COMPLETED' && d.dueDate === today);

  // 3. Sắp đến hạn (1-3 ngày tới)
  const upcomingTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.dueDate > today && t.dueDate <= in3DaysDate);
  const upcomingDocs = incomingDocs.filter((d) => d.status !== 'COMPLETED' && d.dueDate > today && d.dueDate <= in3DaysDate);

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-rose-600" />
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Trung Tâm Nhắc Việc & Cảnh Báo Trễ Hạn
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Tự động phát hiện các điểm nghẽn tiến độ, cảnh báo các nhiệm vụ/văn bản chạm ngưỡng hạn chót và hỗ trợ gửi thông báo đôn đốc 1-click.
        </p>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase">Cần giải quyết ngay</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-extrabold text-rose-700 mt-2">
            {overdueTasks.length + overdueDocs.length}
          </div>
          <span className="text-xs text-rose-600 mt-1 block">
            {overdueTasks.length} công việc & {overdueDocs.length} văn bản đã quá hạn
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">Đến hạn hôm nay</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-700 mt-2">
            {dueTodayTasks.length + dueTodayDocs.length}
          </div>
          <span className="text-xs text-amber-600 mt-1 block">Hạn hoàn thành trước 17:00 hôm nay</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-indigo-200 bg-indigo-50/30 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase">Đến hạn trong 72h tới</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-700 mt-2">
            {upcomingTasks.length + upcomingDocs.length}
          </div>
          <span className="text-xs text-indigo-600 mt-1 block">Cần kiểm tra đôn đốc cán bộ</span>
        </div>
      </div>

      {/* Section 1: Quá hạn xử lý */}
      <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-rose-50/70 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="font-bold text-sm">Danh Sách Quá Hạn Xử Lý ({overdueTasks.length + overdueDocs.length})</h3>
          </div>
          <span className="text-[11px] font-bold text-rose-600">ĐỘ ƯU TIÊN CAO NHẤT</span>
        </div>

        <div className="divide-y divide-slate-100">
          {overdueTasks.length === 0 && overdueDocs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Không có nhiệm vụ hay văn bản nào bị quá hạn. Cơ quan đang vận hành rất tốt!
            </div>
          ) : (
            <>
              {overdueTasks.map((t) => {
                const assignee = getUser(t.assigneeId);
                const dossier = getDossier(t.dossierId);
                return (
                  <div
                    key={t.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0"></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700">[{t.code}]</span>
                          <span className="font-bold text-slate-800 text-xs truncate hover:text-indigo-600 cursor-pointer" onClick={() => onSelectTask(t)}>
                            {t.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span>Hạn chót: <b className="text-rose-600 font-bold">{t.dueDate}</b></span>
                          <span>Chủ trì: <b>{assignee?.fullName || 'Chưa phân công'}</b></span>
                          {dossier && <span>Hồ sơ: {dossier.code}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onSelectTask(t)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Xem chi tiết
                      </button>
                      <button
                        onClick={() => onSendReminder(t.id, assignee?.fullName || 'Cán bộ', t.title)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <Bell className="w-3 h-3" />
                        <span>Gửi đôn đốc</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {overdueDocs.map((d) => {
                const assignee = getUser(d.assigneeId);
                return (
                  <div
                    key={d.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700">VB: {d.documentNumber}</span>
                          <span className="font-bold text-slate-800 text-xs truncate hover:text-indigo-600 cursor-pointer" onClick={() => onSelectDoc(d)}>
                            {d.summary}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span>Từ: <b>{d.issuingAuthority}</b></span>
                          <span>Hạn xử lý: <b className="text-rose-600 font-bold">{d.dueDate}</b></span>
                          <span>Chủ trì: <b>{assignee?.fullName || 'Chưa phân công'}</b></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onSelectDoc(d)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Xem văn bản
                      </button>
                      <button
                        onClick={() => onSendReminder(d.id, assignee?.fullName || 'Cán bộ', `Xử lý VB số ${d.documentNumber}`)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <Bell className="w-3 h-3" />
                        <span>Nhắc văn thư</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Section 2: Sắp đến hạn trong 72h */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm">
              Sắp Đến Hạn Trong 3 Ngày Tới ({upcomingTasks.length + upcomingDocs.length + dueTodayTasks.length + dueTodayDocs.length})
            </h3>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {[...dueTodayTasks, ...upcomingTasks].map((t) => {
            const assignee = getUser(t.assigneeId);
            return (
              <div
                key={t.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-600">[{t.code}]</span>
                    <span className="font-bold text-slate-800 text-xs truncate hover:text-indigo-600 cursor-pointer" onClick={() => onSelectTask(t)}>
                      {t.title}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                    <span>Hạn: <b className="text-amber-700">{t.dueDate}</b></span>
                    <span>Phụ trách: <b>{assignee?.fullName || 'Chưa giao'}</b></span>
                    <span>Tiến độ: <b>{t.progress}%</b></span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectTask(t)}
                  className="px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 font-bold rounded-lg transition-colors"
                >
                  Chi tiết &rarr;
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
