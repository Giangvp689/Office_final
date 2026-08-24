import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
  FileText,
  MessageSquare,
  Paperclip,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import { Task, User, Dossier, TaskStatus } from '../types';

interface MyTasksViewProps {
  currentUser: User;
  tasks: Task[];
  users: User[];
  dossiers: Dossier[];
  onSelectTask: (task: Task) => void;
  onUpdateTaskProgress: (taskId: string, progress: number, status: TaskStatus, note?: string) => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({
  currentUser,
  tasks,
  users,
  dossiers,
  onSelectTask,
  onUpdateTaskProgress,
}) => {
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'URGENT' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const myTasks = tasks.filter((t) => t.assigneeId === currentUser.id || t.coAssigneeIds?.includes(currentUser.id));

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id || d.code === id);

  const today = new Date().toISOString().split('T')[0];

  const filteredTasks = myTasks.filter((t) => {
    if (filterCategory === 'URGENT') return t.priority === 'URGENT' || t.priority === 'HIGH';
    if (filterCategory === 'OVERDUE') return t.status === 'OVERDUE' || (t.status !== 'COMPLETED' && t.dueDate < today);
    if (filterCategory === 'IN_PROGRESS') return t.status === 'IN_PROGRESS' || t.status === 'NOT_STARTED';
    if (filterCategory === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  const overdueCount = myTasks.filter((t) => t.status === 'OVERDUE' || (t.status !== 'COMPLETED' && t.dueDate < today)).length;
  const inProgressCount = myTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'NOT_STARTED').length;
  const completedCount = myTasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Việc Giao Cho Tôi ({myTasks.length})</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Không gian làm việc của cán bộ: <b>{currentUser.fullName}</b>. Cập nhật tiến độ trực tiếp và nộp báo cáo kết quả.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterCategory === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tất cả ({myTasks.length})
          </button>
          <button
            onClick={() => setFilterCategory('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterCategory === 'OVERDUE' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            Quá hạn ({overdueCount})
          </button>
          <button
            onClick={() => setFilterCategory('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterCategory === 'IN_PROGRESS' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            Đang thực hiện ({inProgressCount})
          </button>
          <button
            onClick={() => setFilterCategory('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterCategory === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            Đã hoàn thành ({completedCount})
          </button>
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">Tuyệt vời! Không có công việc nào trong mục này.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const creator = getUser(task.creatorId);
            const dossier = getDossier(task.dossierId);
            const isOverdue = task.status === 'OVERDUE' || (task.status !== 'COMPLETED' && task.dueDate < today);

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`bg-white rounded-xl border p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                  isOverdue ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {task.code}
                    </span>
                    {task.priority === 'URGENT' ? (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded uppercase">
                        Rất khẩn
                      </span>
                    ) : task.priority === 'HIGH' ? (
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase">
                        Ưu tiên cao
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Thường
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 hover:text-indigo-600 transition-colors">
                    {task.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                    {task.description}
                  </p>

                  {dossier && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                      <span>📁 Hồ sơ:</span>
                      <span className="font-bold truncate">{dossier.title} ({dossier.code})</span>
                    </div>
                  )}

                  {/* Subtasks Preview */}
                  {task.subTasks && task.subTasks.length > 0 && (
                    <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                        <span>Checklist việc cần làm</span>
                        <span>
                          {task.subTasks.filter((s) => s.completed).length}/{task.subTasks.length}
                        </span>
                      </div>
                      {task.subTasks.slice(0, 3).map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={sub.completed}
                            readOnly
                            className="rounded text-indigo-600 pointer-events-none"
                          />
                          <span className={`truncate ${sub.completed ? 'line-through text-slate-400' : ''}`}>
                            {sub.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Section: Progress & Quick Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                        Tiến độ hoàn thành:
                      </span>
                      <span className="font-bold text-indigo-700">{task.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          task.progress >= 100 ? 'bg-emerald-500' : task.progress > 50 ? 'bg-indigo-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-[11px]">
                      Giao bởi: <b>{creator?.fullName || 'Lãnh đạo'}</b>
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[11px] font-semibold ${
                        isOverdue ? 'text-rose-600' : 'text-slate-600'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Hạn: {task.dueDate}
                    </span>
                  </div>

                  {/* Quick update buttons */}
                  <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    {task.status !== 'COMPLETED' ? (
                      <>
                        <button
                          onClick={() => {
                            const newProgress = Math.min(100, task.progress + 25);
                            const newStatus = newProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS';
                            onUpdateTaskProgress(task.id, newProgress, newStatus, 'Cập nhật tiến độ nhanh');
                          }}
                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold py-1.5 rounded-lg border border-indigo-200 transition-colors"
                        >
                          +25% Tiến độ
                        </button>
                        <button
                          onClick={() => onUpdateTaskProgress(task.id, 100, 'COMPLETED', 'Đã hoàn thành toàn bộ')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
                        >
                          Xong việc
                        </button>
                      </>
                    ) : (
                      <span className="w-full text-center text-xs font-bold text-emerald-700 bg-emerald-50 py-1.5 rounded-lg border border-emerald-200">
                        ✓ Nhiệm vụ đã hoàn thành
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
