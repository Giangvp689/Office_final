import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Calendar,
  User as UserIcon,
  MessageSquare,
  Paperclip,
  TrendingUp,
  Plus,
  Send,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Task, User, Dossier, TaskStatus } from '../types';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentUser: User;
  users: User[];
  dossiers: Dossier[];
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onAddComment: (taskId: string, text: string) => void;
  onUpdateProgress: (taskId: string, progress: number, status: TaskStatus) => void;
  onOpenAiBreakdown?: (task: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  currentUser,
  users,
  dossiers,
  onToggleSubtask,
  onAddSubtask,
  onAddComment,
  onUpdateProgress,
  onOpenAiBreakdown,
}) => {
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  if (!isOpen || !task) return null;

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id || d.code === id);

  const assignee = getUser(task.assigneeId);
  const creator = getUser(task.creatorId);
  const dossier = getDossier(task.dossierId);

  const handleSubtaskAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    onAddSubtask(task.id, newSubtaskText.trim());
    setNewSubtaskText('');
  };

  const handleCommentAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(task.id, newCommentText.trim());
    setNewCommentText('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                  {task.code}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase">{task.priority}</span>
              </div>
              <h2 className="font-bold text-slate-800 text-sm mt-0.5 line-clamp-1">{task.title}</h2>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Main Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mô tả nhiệm vụ</span>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {task.description || 'Không có mô tả bổ sung.'}
            </p>
            {dossier && (
              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-indigo-700 font-semibold flex items-center gap-1.5">
                <span>📁 Hồ sơ vụ việc:</span>
                <span>{dossier.code} - {dossier.title}</span>
              </div>
            )}
          </div>

          {/* Key Assignee & Deadline Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Cán bộ chủ trì</span>
              <div className="flex items-center gap-2 mt-1.5">
                <img
                  src={assignee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="font-bold text-slate-800 truncate">{assignee?.fullName || 'Chưa giao'}</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Người giao việc</span>
              <p className="font-bold text-slate-800 mt-2">{creator?.fullName || 'Lãnh đạo cơ quan'}</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Hạn chót hoàn thành</span>
              <p className="font-bold text-rose-600 mt-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{task.dueDate}</span>
              </p>
            </div>
          </div>

          {/* Interactive Progress Slider */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Tiến độ thực hiện: {task.progress}%</span>
              </span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {task.status}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={task.progress}
              onChange={(e) => {
                const val = Number(e.target.value);
                const newStatus: TaskStatus = val >= 100 ? 'COMPLETED' : val > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
                onUpdateProgress(task.id, val, newStatus);
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% Chưa làm</span>
              <span>50% Đang thực hiện</span>
              <span>100% Hoàn thành</span>
            </div>
          </div>

          {/* Subtasks Checklist */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <span>Danh mục việc con (Subtasks Checklist)</span>
              </h3>
              {onOpenAiBreakdown && (
                <button
                  onClick={() => onOpenAiBreakdown(task)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>AI Chia nhỏ việc</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {task.subTasks?.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => onToggleSubtask(task.id, sub.id)}
                  className="flex items-center gap-3 p-2 bg-slate-50 hover:bg-indigo-50/40 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                  <span
                    className={`flex-1 text-xs ${
                      sub.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-800 font-semibold'
                    }`}
                  >
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubtaskAdd} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                placeholder="Thêm việc con mới..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </form>
          </div>

          {/* Comments & Discussions */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Trao đổi & Ý kiến chỉ đạo ({task.comments?.length || 0})</span>
            </h3>

            <div className="space-y-3 max-h-48 overflow-y-auto">
              {task.comments?.length === 0 ? (
                <p className="text-slate-400 text-xs italic">Chưa có ý kiến trao đổi nào.</p>
              ) : (
                task.comments?.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">{c.userName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCommentAdd} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Nhập ý kiến chỉ đạo hoặc báo cáo tiến độ..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
