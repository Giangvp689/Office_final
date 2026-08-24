import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  Send,
  CheckCircle2,
  Bell,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Task, User, Dossier, TaskStatus } from '../types';

interface DelegatedTasksViewProps {
  currentUser: User;
  tasks: Task[];
  users: User[];
  dossiers: Dossier[];
  onSelectTask: (task: Task) => void;
  onCreateNewTask: () => void;
  onSendReminder: (taskId: string, assigneeName: string, taskTitle: string) => void;
}

export const DelegatedTasksView: React.FC<DelegatedTasksViewProps> = ({
  currentUser,
  tasks,
  users,
  dossiers,
  onSelectTask,
  onCreateNewTask,
  onSendReminder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const delegatedTasks = tasks.filter((t) => t.creatorId === currentUser.id);

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id || d.code === id);

  const filteredTasks = delegatedTasks.filter((t) => {
    const matchSearch =
      !searchTerm ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">Hoàn thành</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase">Quá hạn</span>;
      case 'WAITING_APPROVAL':
        return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">Chờ nghiệm thu</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">Đang làm</span>;
      case 'NOT_STARTED':
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Chưa bắt đầu</span>;
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Việc Tôi Giao Đi ({delegatedTasks.length})
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Giám sát tiến độ của cấp dưới và các chuyên viên được giao nhiệm vụ bởi <b>{currentUser.fullName}</b>.
          </p>
        </div>

        <button
          onClick={onCreateNewTask}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Giao Việc Mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã hoặc tên công việc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-slate-700 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="WAITING_APPROVAL">Chờ nghiệm thu</option>
            <option value="OVERDUE">Quá hạn</option>
            <option value="COMPLETED">Đã hoàn thành</option>
          </select>
        </div>
      </div>

      {/* Table of Delegated Tasks */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Mã việc</th>
                <th className="px-5 py-3 w-1/3">Nội dung công việc</th>
                <th className="px-4 py-3">Cán bộ chủ trì</th>
                <th className="px-3 py-3">Hạn chót</th>
                <th className="px-4 py-3">Tiến độ</th>
                <th className="px-3 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    Bạn chưa giao việc nào hoặc không có việc phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const assignee = getUser(task.assigneeId);
                  const dossier = getDossier(task.dossierId);
                  return (
                    <tr
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-800 font-mono text-xs">{task.code}</span>
                        {dossier && (
                          <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded block mt-0.5 max-w-max font-semibold">
                            {dossier.code}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {task.title}
                        </span>
                        <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {task.description}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            src={assignee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={assignee?.fullName}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="font-bold text-slate-800 block text-xs truncate max-w-[120px]">
                              {assignee?.fullName || 'Chưa giao'}
                            </span>
                            <span className="text-[10px] text-slate-400">{assignee?.role}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap font-medium text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{task.dueDate}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="w-24">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-0.5">
                            <span>{task.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                task.progress >= 100
                                  ? 'bg-emerald-500'
                                  : task.progress > 50
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap">{getStatusBadge(task.status)}</td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSendReminder(task.id, assignee?.fullName || 'Cán bộ', task.title)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2.5 py-1 rounded-md border border-indigo-200 transition-colors flex items-center gap-1 ml-auto"
                          title="Gửi thông báo đôn đốc"
                        >
                          <Bell className="w-3 h-3 text-indigo-600" />
                          <span>Nhắc việc</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
