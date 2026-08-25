import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  LayoutGrid,
  List,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  FolderArchive,
  MessageSquare,
  Paperclip,
  Sparkles,
} from 'lucide-react';
import { Task, User, Dossier, TaskStatus, TaskPriority } from '../types';

interface TasksViewProps {
  tasks: Task[];
  users: User[];
  dossiers: Dossier[];
  onSelectTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onCreateNewTask: () => void;
  onOpenAiTaskModal?: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  users,
  dossiers,
  onSelectTask,
  onEditTask,
  onDeleteTask,
  onCreateNewTask,
  onOpenAiTaskModal,
}) => {
  const [viewMode, setViewMode] = useState<'TABLE' | 'KANBAN'>('TABLE');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id || d.code === id);

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      !searchTerm ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchAssignee = assigneeFilter === 'ALL' || t.assigneeId === assigneeFilter;

    return matchSearch && matchStatus && matchPriority && matchAssignee;
  });

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase">Rất khẩn</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-bold text-[10px]">Ưu tiên cao</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium text-[10px]">Trung bình</span>;
      case 'LOW':
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">Thấp</span>;
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">Hoàn thành</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase animate-pulse">Quá hạn</span>;
      case 'WAITING_APPROVAL':
        return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">Chờ duyệt</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">Đang làm</span>;
      case 'NOT_STARTED':
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Chưa làm</span>;
    }
  };

  // Kanban Columns
  const kanbanColumns: Array<{ id: TaskStatus; title: string; countBg: string }> = [
    { id: 'NOT_STARTED', title: 'Chưa bắt đầu', countBg: 'bg-slate-100 text-slate-700' },
    { id: 'IN_PROGRESS', title: 'Đang thực hiện', countBg: 'bg-amber-100 text-amber-700' },
    { id: 'WAITING_APPROVAL', title: 'Chờ nghiệm thu', countBg: 'bg-purple-100 text-purple-700' },
    { id: 'COMPLETED', title: 'Đã hoàn thành', countBg: 'bg-emerald-100 text-emerald-700' },
    { id: 'OVERDUE', title: 'Quá hạn xử lý', countBg: 'bg-rose-100 text-rose-700' },
  ];

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Quản Lý & Điều Hành Công Việc</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Giao nhiệm vụ, chỉ định người chủ trì - phối hợp, quản lý hạn chót và kiểm soát 100% tiến độ thực hiện.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View mode toggle */}
          <div className="bg-white border border-slate-200 p-1 rounded-lg flex items-center shadow-xs">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'TABLE' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng Bảng"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Bảng</span>
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'KANBAN' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng Thẻ Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          <button
            onClick={onCreateNewTask}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Giao Việc Mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã công việc, tên việc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-slate-700 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="NOT_STARTED">Chưa bắt đầu</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="WAITING_APPROVAL">Chờ phê duyệt</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="OVERDUE">Quá hạn</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả mức ưu tiên</option>
            <option value="URGENT">Rất khẩn</option>
            <option value="HIGH">Ưu tiên cao</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="LOW">Thấp</option>
          </select>

          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả cán bộ phụ trách</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.role || 'STAFF'})
              </option>
            ))}
          </select>

          {(searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || assigneeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setAssigneeFilter('ALL');
              }}
              className="text-xs text-rose-600 hover:underline px-1 font-semibold"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* View Content: TABLE OR KANBAN */}
      {viewMode === 'TABLE' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Mã việc / Hồ sơ</th>
                  <th className="px-5 py-3 w-1/3">Tên nội dung công việc</th>
                  <th className="px-4 py-3">Người giao</th>
                  <th className="px-4 py-3">Người chủ trì</th>
                  <th className="px-3 py-3">Ưu tiên</th>
                  <th className="px-3 py-3">Hạn chót</th>
                  <th className="px-4 py-3">Tiến độ</th>
                  <th className="px-3 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                      Không có công việc nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const creator = getUser(task.creatorId);
                    const assignee = getUser(task.assigneeId);
                    const dossier = getDossier(task.dossierId);
                    return (
                      <tr
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 font-mono text-xs">{task.code}</span>
                            {dossier && (
                              <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded mt-0.5 inline-block max-w-max font-semibold">
                                {dossier.code}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                              {task.title}
                            </span>
                            <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {task.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                            {task.subTasks && task.subTasks.length > 0 && (
                              <span className="flex items-center gap-1">
                                <CheckSquare className="w-3 h-3 text-slate-500" />
                                {task.subTasks.filter((s) => s.completed).length}/{task.subTasks.length} việc con
                              </span>
                            )}
                            {task.comments && task.comments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-slate-500" />
                                {task.comments.length} trao đổi
                              </span>
                            )}
                            {task.attachments && task.attachments.length > 0 && (
                              <span className="flex items-center gap-1 text-indigo-600">
                                <Paperclip className="w-3 h-3" />
                                {task.attachments.length} tệp
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-slate-600 text-xs font-medium">
                            {creator?.fullName || '---'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <img
                              src={assignee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={assignee?.fullName}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200"
                            />
                            <span className="font-semibold text-slate-800 text-xs">
                              {assignee?.fullName || 'Chưa giao'}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3.5 whitespace-nowrap">{getPriorityBadge(task.priority)}</td>

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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-100/70 p-3 rounded-xl border border-slate-200 flex flex-col max-h-[75vh]"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-slate-700">{col.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.countBg}`}>
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {colTasks.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-[11px] border border-dashed border-slate-200 rounded-lg">
                      Trống
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const assignee = getUser(task.assigneeId);
                      const dossier = getDossier(task.dossierId);
                      return (
                        <div
                          key={task.id}
                          onClick={() => onSelectTask(task)}
                          className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono font-bold text-slate-500">{task.code}</span>
                            {getPriorityBadge(task.priority)}
                          </div>

                          <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
                            {task.title}
                          </h4>

                          {dossier && (
                            <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold inline-block">
                              📁 {dossier.code}
                            </span>
                          )}

                          {/* Progress Bar */}
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                              <span>Tiến độ</span>
                              <span>{task.progress}%</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full"
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <img
                                src={assignee?.avatar}
                                alt={assignee?.fullName}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span className="truncate max-w-[80px] font-medium">{assignee?.fullName}</span>
                            </div>
                            <span className="flex items-center gap-1 text-slate-500 font-medium">
                              <Calendar className="w-3 h-3" />
                              {task.dueDate}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
