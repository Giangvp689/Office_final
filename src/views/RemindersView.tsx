import React, { useState } from 'react';
import { Task, IncomingDocument, User } from '../types';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  UserCheck,
  CheckSquare,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface RemindersViewProps {
  tasks: Task[];
  incomingDocs: IncomingDocument[];
  users: User[];
  onOpenTaskDetail: (id: string) => void;
  onOpenIncomingDocDetail: (id: string) => void;
  onCreateNotification: (title: string, message: string, userId?: string) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  tasks,
  incomingDocs,
  users,
  onOpenTaskDetail,
  onOpenIncomingDocDetail,
  onCreateNotification,
}) => {
  const [nudgedIds, setNudgedIds] = useState<string[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const getUser = (id?: string) => users.find((u) => u.id === id);

  // 1. Overdue Tasks
  const overdueTasks = tasks.filter(
    (t) => (t.status === 'OVERDUE' || t.dueDate < today) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  );

  // 2. Tasks Due Today
  const dueTodayTasks = tasks.filter(
    (t) => t.dueDate === today && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  );

  // 3. Tasks Due in 3 days
  const dueSoonTasks = tasks.filter(
    (t) => t.dueDate > today && t.dueDate <= in3Days && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  );

  // 4. Unassigned Incoming Docs
  const unassignedDocs = incomingDocs.filter((d) => !d.assigneeId || d.status === 'PENDING_ASSIGN');

  const handleNudge = (task: Task) => {
    const assignee = getUser(task.assigneeId);
    onCreateNotification(
      `Đôn đốc tiến độ: ${task.code}`,
      `Lãnh đạo cơ quan nhắc nhở đẩy nhanh tiến độ công việc "${task.title}", hạn hoàn thành: ${new Date(task.dueDate).toLocaleDateString('vi-VN')}`,
      task.assigneeId
    );
    setNudgedIds((prev) => [...prev, task.id]);
    setTimeout(() => {
      setNudgedIds((prev) => prev.filter((id) => id !== task.id));
    }, 4000);
  };

  return (
    <div className="w-full p-6 md:p-8 flex flex-col gap-6 flex-1">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Trung Tâm Nhắc Việc & Cảnh Báo Trễ Hạn</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tự động phân loại công việc quá hạn, việc đến hạn và phát hành thông báo đôn đốc cán bộ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Quá hạn (Overdue) */}
        <div className="bg-white rounded-2xl border border-rose-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-100 mb-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-bold text-sm text-slate-800">Công việc quá hạn xử lý ({overdueTasks.length})</h2>
            </div>
            <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full">
              Khẩn cấp
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 custom-scrollbar">
            {overdueTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Không có công việc nào bị quá hạn. Rất tốt!
              </div>
            ) : (
              overdueTasks.map((t) => {
                const assignee = getUser(t.assigneeId);
                const isNudged = nudgedIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1" onClick={() => onOpenTaskDetail(t.id)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold font-mono text-[10px] text-rose-700">
                          #{t.code}
                        </span>
                        <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded">
                          Trễ: {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 truncate hover:text-indigo-600 cursor-pointer">
                        {t.title}
                      </h4>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Phụ trách: <strong>{assignee?.fullName || 'Chưa giao'}</strong> ({assignee?.role || 'Chuyên viên'})
                      </div>
                    </div>

                    <button
                      onClick={() => handleNudge(t)}
                      disabled={isNudged}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all ${
                        isNudged
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                      }`}
                    >
                      {isNudged ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã đôn đốc</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Đôn đốc ngay</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 2: Đến hạn hôm nay */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100 mb-4">
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="w-5 h-5" />
              <h2 className="font-bold text-sm text-slate-800">
                Nhiệm vụ đến hạn hôm nay ({dueTodayTasks.length})
              </h2>
            </div>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Hạn trong ngày
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 custom-scrollbar">
            {dueTodayTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Không có nhiệm vụ nào hết hạn hôm nay.
              </div>
            ) : (
              dueTodayTasks.map((t) => {
                const assignee = getUser(t.assigneeId);
                return (
                  <div
                    key={t.id}
                    onClick={() => onOpenTaskDetail(t.id)}
                    className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 flex items-center justify-between cursor-pointer hover:border-amber-300 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] text-amber-700 font-bold block mb-0.5">
                        #{t.code}
                      </span>
                      <h4 className="font-bold text-xs text-slate-800 truncate">{t.title}</h4>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Phụ trách: {assignee?.fullName} | Tiến độ: {t.progress}%
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-1 rounded">
                      Hôm nay
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 3: Sắp đến hạn (1-3 ngày tới) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <CheckSquare className="w-5 h-5" />
              <h2 className="font-bold text-sm text-slate-800">
                Sắp đến hạn trong 1-3 ngày tới ({dueSoonTasks.length})
              </h2>
            </div>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Sắp tới
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 custom-scrollbar">
            {dueSoonTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Không có việc nào sắp hết hạn trong 3 ngày tới.
              </div>
            ) : (
              dueSoonTasks.map((t) => {
                const assignee = getUser(t.assigneeId);
                return (
                  <div
                    key={t.id}
                    onClick={() => onOpenTaskDetail(t.id)}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] text-slate-400 font-bold block mb-0.5">
                        #{t.code}
                      </span>
                      <h4 className="font-bold text-xs text-slate-800 truncate">{t.title}</h4>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Hạn: <strong>{new Date(t.dueDate).toLocaleDateString('vi-VN')}</strong> | {assignee?.fullName}
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                      {t.progress}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 4: Văn bản đến chưa phân công */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-blue-600">
              <FileText className="w-5 h-5" />
              <h2 className="font-bold text-sm text-slate-800">
                Văn bản đến chưa phân công ({unassignedDocs.length})
              </h2>
            </div>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Cần giao
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 custom-scrollbar">
            {unassignedDocs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Tất cả văn bản đến đã được phân công xử lý đầy đủ.
              </div>
            ) : (
              unassignedDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onOpenIncomingDocDetail(doc.id)}
                  className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[10px] text-blue-700 font-bold block mb-0.5">
                      Số: {doc.documentNumber} ({doc.issuingAuthority})
                    </span>
                    <h4 className="font-bold text-xs text-slate-800 truncate">{doc.summary}</h4>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Hạn: {new Date(doc.dueDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <span className="text-[10px] bg-indigo-600 text-white font-bold px-2.5 py-1 rounded-lg">
                    Giao ngay
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
