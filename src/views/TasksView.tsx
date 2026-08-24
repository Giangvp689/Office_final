import React, { useState } from 'react';
import {
  Task,
  User,
  Dossier,
  IncomingDocument,
  TaskPriority,
  TaskStatus,
  SubTask,
} from '../types';
import {
  Search,
  Plus,
  CheckSquare,
  Sparkles,
  Calendar,
  Clock,
  User as UserIcon,
  Trash2,
  Edit,
  X,
  Check,
  MessageSquare,
  Paperclip,
  FolderKanban,
  Kanban,
  List,
  AlertCircle,
} from 'lucide-react';
import { suggestTaskBreakdownWithAI } from '../services/aiService';

interface TasksViewProps {
  tasks: Task[];
  users: User[];
  dossiers: Dossier[];
  incomingDocs: IncomingDocument[];
  onSaveTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  currentUser: User;
  filterMode?: 'ALL' | 'ASSIGNED_TO_ME' | 'DELEGATED_BY_ME';
  onOpenDossier: (dossierId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  users,
  dossiers,
  incomingDocs,
  onSaveTask,
  onDeleteTask,
  currentUser,
  filterMode = 'ALL',
  onOpenDossier,
}) => {
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN'>('LIST');

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

  // AI Task Breakdown State
  const [showAiBreakdown, setShowAiBreakdown] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // New Comment State inside Task Detail
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id);

  const today = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((t) => {
    // Mode filtering
    if (filterMode === 'ASSIGNED_TO_ME') {
      if (t.assigneeId !== currentUser.id && !t.coAssigneeIds?.includes(currentUser.id)) return false;
    } else if (filterMode === 'DELEGATED_BY_ME') {
      if (t.createdById !== currentUser.id) return false;
    }

    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());

    const matchPriority = filterPriority === 'ALL' || t.priority === filterPriority;
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;

    return matchSearch && matchPriority && matchStatus;
  });

  const handleOpenAddModal = () => {
    setEditingTask({
      id: 'task-' + Date.now(),
      code: `CV-${String(tasks.length + 101).padStart(3, '0')}`,
      title: '',
      description: '',
      assigneeId: currentUser.id,
      coAssigneeIds: [],
      createdById: currentUser.id,
      startDate: today,
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      priority: 'MEDIUM',
      status: 'NOT_STARTED',
      progress: 0,
      subTasks: [],
      comments: [],
      attachments: [],
      dossierId: dossiers[0]?.id || '',
    });
    setAiError(null);
    setShowAiBreakdown(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask({ ...task });
    setAiError(null);
    setShowAiBreakdown(false);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title) return;

    onSaveTask(editingTask as Task);
    setIsModalOpen(false);
    setEditingTask(null);
    if (selectedTask && selectedTask.id === editingTask.id) {
      setSelectedTask(editingTask as Task);
    }
  };

  // AI Task Breakdown Action
  const handleRunAiBreakdown = async () => {
    if (!editingTask?.title) {
      setAiError('Vui lòng nhập tên công việc để AI phân rã nhiệm vụ.');
      return;
    }
    setIsAiLoading(true);
    setAiError(null);

    try {
      const result = await suggestTaskBreakdownWithAI({
        taskTitle: editingTask.title,
        description: editingTask.description || '',
        dueDate: editingTask.dueDate,
        availableStaff: users.map((u) => u.fullName),
      });

      const newSubTasks: SubTask[] = result.subTasks.map((st, idx) => ({
        id: `st-${Date.now()}-${idx}`,
        title: st.title,
        completed: false,
        dueDate: editingTask.dueDate,
      }));

      setEditingTask((prev) => ({
        ...prev,
        subTasks: [...(prev?.subTasks || []), ...newSubTasks],
        description: prev?.description
          ? `${prev.description}\n\n[AI Lưu ý rủi ro]: ${result.riskWarning}`
          : `[AI Lưu ý rủi ro]: ${result.riskWarning}`,
      }));
      setShowAiBreakdown(false);
    } catch (err: any) {
      setAiError(err.message || 'Lỗi phân rã AI');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Toggle Subtask
  const handleToggleSubtask = (subTaskId: string) => {
    if (!selectedTask) return;
    const updatedSubTasks = selectedTask.subTasks.map((st) =>
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    const completedCount = updatedSubTasks.filter((s) => s.completed).length;
    const newProgress =
      updatedSubTasks.length > 0 ? Math.round((completedCount / updatedSubTasks.length) * 100) : selectedTask.progress;

    const updatedTask: Task = {
      ...selectedTask,
      subTasks: updatedSubTasks,
      progress: newProgress,
      status: newProgress === 100 ? 'COMPLETED' : selectedTask.status === 'NOT_STARTED' ? 'IN_PROGRESS' : selectedTask.status,
    };
    setSelectedTask(updatedTask);
    onSaveTask(updatedTask);
  };

  // Add subtask inside detail modal
  const handleAddSubTask = () => {
    if (!selectedTask || !newSubtaskTitle.trim()) return;
    const newSt: SubTask = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const updatedTask: Task = {
      ...selectedTask,
      subTasks: [...selectedTask.subTasks, newSt],
    };
    setSelectedTask(updatedTask);
    onSaveTask(updatedTask);
    setNewSubtaskTitle('');
  };

  // Add comment
  const handleAddComment = () => {
    if (!selectedTask || !newComment.trim()) return;
    const commentObj = {
      id: `cm-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatar,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
    };
    const updatedTask: Task = {
      ...selectedTask,
      comments: [...selectedTask.comments, commentObj],
    };
    setSelectedTask(updatedTask);
    onSaveTask(updatedTask);
    setNewComment('');
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-black text-[10px]">KHẨN CẤP</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">CAO</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium text-[10px]">THẤP</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium text-[10px]">TRUNG BÌNH</span>;
    }
  };

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">HOÀN THÀNH</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-black text-[10px]">QUÁ HẠN</span>;
      case 'WAITING_APPROVAL':
        return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">CHỜ DUYỆT</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">ĐANG LÀM</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-500 font-bold text-[10px]">ĐÃ HỦY</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">CHƯA BẮT ĐẦU</span>;
    }
  };

  const kanbanColumns: { status: TaskStatus; label: string; bg: string }[] = [
    { status: 'NOT_STARTED', label: 'Chưa bắt đầu', bg: 'bg-slate-100' },
    { status: 'IN_PROGRESS', label: 'Đang thực hiện', bg: 'bg-blue-50' },
    { status: 'WAITING_APPROVAL', label: 'Chờ duyệt', bg: 'bg-purple-50' },
    { status: 'COMPLETED', label: 'Đã hoàn thành', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {filterMode === 'ASSIGNED_TO_ME'
              ? 'Nhiệm Vụ Giao Cho Tôi'
              : filterMode === 'DELEGATED_BY_ME'
              ? 'Công Việc Tôi Đã Giao'
              : 'Quản Lý Tất Cả Nhiệm Vụ & Công Việc'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân công công việc, đôn đốc tiến độ, cập nhật kết quả và checklist nhiệm vụ con
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* List / Kanban View Switch */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                viewMode === 'LIST' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                viewMode === 'KANBAN' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          <button
            id="add-task-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Giao nhiệm vụ mới</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên công việc, mã việc..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Tất cả ưu tiên</option>
          <option value="URGENT">Khẩn cấp</option>
          <option value="HIGH">Ưu tiên cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="NOT_STARTED">Chưa bắt đầu</option>
          <option value="IN_PROGRESS">Đang làm</option>
          <option value="WAITING_APPROVAL">Chờ duyệt</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="OVERDUE">Quá hạn</option>
        </select>
      </div>

      {/* Main Content: List or Kanban */}
      {viewMode === 'LIST' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Mã & Tên nhiệm vụ</th>
                  <th className="px-4 py-3">Người chủ trì</th>
                  <th className="px-4 py-3">Hạn hoàn thành</th>
                  <th className="px-4 py-3">Mức ưu tiên</th>
                  <th className="px-4 py-3">Tiến độ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Không có công việc nào trong danh sách.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const assignee = getUser(t.assigneeId);
                    const dossier = getDossier(t.dossierId);
                    const isOverdue = t.dueDate < today && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5 max-w-xs md:max-w-md">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold font-mono text-[10px] text-slate-400">
                                #{t.code}
                              </span>
                              {dossier && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded font-mono">
                                  {dossier.code}
                                </span>
                              )}
                              {t.subTasks.length > 0 && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  ✓ {t.subTasks.filter((s) => s.completed).length}/{t.subTasks.length}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-slate-800 group-hover:text-indigo-600 leading-snug">
                              {t.title}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={assignee.avatar}
                                alt={assignee.fullName}
                                className="w-6 h-6 rounded-full object-cover border border-slate-200"
                              />
                              <span className="font-medium text-slate-700">{assignee.fullName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa giao</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap font-medium">
                          <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getPriorityBadge(t.priority)}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="w-28">
                            <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                              <span>{t.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  t.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${t.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getStatusBadge(isOverdue ? 'OVERDUE' : t.status)}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleOpenEditModal(t)}
                              title="Sửa công việc"
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn xóa công việc ${t.title}?`)) {
                                  onDeleteTask(t.id);
                                }
                              }}
                              title="Xóa công việc"
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Board Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col min-h-[400px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <span className="font-bold text-xs text-slate-800">{col.label}</span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
                  {colTasks.map((t) => {
                    const assignee = getUser(t.assigneeId);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="bg-slate-50/80 hover:bg-white p-3 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] text-slate-400 font-bold">
                            #{t.code}
                          </span>
                          {getPriorityBadge(t.priority)}
                        </div>

                        <h4 className="font-bold text-xs text-slate-800 mb-2 leading-snug line-clamp-2">
                          {t.title}
                        </h4>

                        {/* Progress */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-3">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/60">
                          <span className="font-medium">
                            {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                          {assignee && (
                            <img
                              src={assignee.avatar}
                              alt={assignee.fullName}
                              className="w-5 h-5 rounded-full object-cover border border-slate-200"
                              title={assignee.fullName}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-slate-800 text-base">
                  [{selectedTask.code}] {selectedTask.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-5 text-xs flex-1">
              {/* Badges & Status Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(selectedTask.priority)}
                  {getStatusBadge(selectedTask.status)}
                </div>

                {/* Quick Status Updater */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600">Trạng thái:</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => {
                      const newStat = e.target.value as TaskStatus;
                      const updated: Task = {
                        ...selectedTask,
                        status: newStat,
                        progress: newStat === 'COMPLETED' ? 100 : selectedTask.progress,
                      };
                      setSelectedTask(updated);
                      onSaveTask(updated);
                    }}
                    className="bg-white border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="NOT_STARTED">Chưa bắt đầu</option>
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="WAITING_APPROVAL">Chờ duyệt</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700">Tiến độ thực tế</span>
                  <span className="text-sm font-black text-indigo-600">{selectedTask.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={selectedTask.progress}
                  onChange={(e) => {
                    const p = parseInt(e.target.value, 10);
                    const updated: Task = {
                      ...selectedTask,
                      progress: p,
                      status: p === 100 ? 'COMPLETED' : p > 0 && selectedTask.status === 'NOT_STARTED' ? 'IN_PROGRESS' : selectedTask.status,
                    };
                    setSelectedTask(updated);
                    onSaveTask(updated);
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Mô tả nhiệm vụ & Yêu cầu
                </span>
                <p className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedTask.description || 'Không có mô tả chi tiết'}
                </p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Người chủ trì
                  </span>
                  <div className="flex items-center gap-2">
                    <img
                      src={getUser(selectedTask.assigneeId)?.avatar}
                      alt="avatar"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-bold text-slate-800">
                      {getUser(selectedTask.assigneeId)?.fullName}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Hạn hoàn thành
                  </span>
                  <span className="font-bold text-rose-600">
                    {new Date(selectedTask.dueDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Checklist Sub-tasks */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800">Checklist Các Bước Thực Hiện</span>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    {selectedTask.subTasks.filter((s) => s.completed).length}/{selectedTask.subTasks.length} Đã xong
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  {selectedTask.subTasks.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => handleToggleSubtask(st.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                        st.completed ? 'bg-emerald-50/60 text-slate-500' : 'bg-slate-50 hover:bg-indigo-50/50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          st.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {st.completed && <Check className="w-3 h-3" />}
                      </div>
                      <span className={`flex-1 ${st.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Add Subtask Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask()}
                    placeholder="Thêm nhiệm vụ con mới..."
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={handleAddSubTask}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs"
                  >
                    Thêm
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-slate-800">
                    Trao đổi & Ý kiến chỉ đạo ({selectedTask.comments.length})
                  </span>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto mb-3 pr-1 custom-scrollbar">
                  {selectedTask.comments.length === 0 ? (
                    <div className="text-center text-slate-400 py-3 text-xs">
                      Chưa có trao đổi nào
                    </div>
                  ) : (
                    selectedTask.comments.map((cm) => (
                      <div key={cm.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">{cm.userName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(cm.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} - {new Date(cm.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{cm.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Nhập ý kiến chỉ đạo hoặc phản hồi..."
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs"
                  >
                    Gửi
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  const t = selectedTask;
                  setSelectedTask(null);
                  handleOpenEditModal(t);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Chỉnh sửa nhiệm vụ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Task Modal */}
      {isModalOpen && editingTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {editingTask.id?.startsWith('task-') && !tasks.some((t) => t.id === editingTask.id)
                    ? 'Giao Nhiệm Vụ Mới'
                    : `Cập Nhật Nhiệm Vụ: ${editingTask.code}`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs custom-scrollbar">
              {/* AI Suggest Breakdown Helper */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-indigo-900 text-xs">
                      AI Phân Rã Công Việc & Cảnh Báo Rủi Ro Tiến Độ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAiBreakdown}
                    disabled={isAiLoading}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAiLoading ? 'AI đang phân tích...' : 'AI Phân Rã Nhiệm Vụ'}</span>
                  </button>
                </div>
                {aiError && <p className="text-[11px] text-rose-600">{aiError}</p>}
              </div>

              {/* Title & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Mã công việc</label>
                  <input
                    type="text"
                    required
                    value={editingTask.code || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, code: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên nhiệm vụ / Nội dung công việc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTask.title || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    placeholder="VD: Tổng hợp báo cáo quý I gửi Lãnh đạo..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả chi tiết & Yêu cầu đầu ra</label>
                <textarea
                  rows={3}
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  placeholder="Mô tả cụ thể mục tiêu, tài liệu cần nộp, tiêu chí đánh giá..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Assignee & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Người chủ trì <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingTask.assigneeId || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, assigneeId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={editingTask.startDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, startDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Hạn hoàn thành <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-rose-600"
                  />
                </div>
              </div>

              {/* Priority & Status & Dossier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức ưu tiên</label>
                  <select
                    value={editingTask.priority || 'MEDIUM'}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="URGENT">Khẩn cấp</option>
                    <option value="HIGH">Ưu tiên cao</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="LOW">Thấp</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={editingTask.status || 'NOT_STARTED'}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="NOT_STARTED">Chưa bắt đầu</option>
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="WAITING_APPROVAL">Chờ duyệt</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gắn vào Mã Hồ Sơ</label>
                  <select
                    value={editingTask.dossierId || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dossierId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- Chưa gắn hồ sơ --</option>
                    {dossiers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.title.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  Lưu nhiệm vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
