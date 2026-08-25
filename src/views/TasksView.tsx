import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Task,
  User,
  Dossier,
  IncomingDocument,
  TaskPriority,
  TaskStatus,
  SubTask,
  TaskComment,
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
  Send,
  UserCheck,
  ShieldCheck,
  Briefcase,
  Users,
  Database,
  ArrowRight,
  MessageCircle,
  FileText,
  HelpCircle,
  Flame,
  CheckCircle2,
  Sparkle,
  Inbox,
  Info,
  ExternalLink,
} from 'lucide-react';
import { suggestTaskBreakdownWithAI } from '../services/aiService';
import { dbService } from '../services/db';

const getDeptString = (dept: any): string => {
  if (!dept) return '';
  if (typeof dept === 'string') return dept;
  if (typeof dept === 'object') return dept.name || dept.code || '';
  return String(dept);
};

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
  initialSelectedTaskId?: string;
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
  initialSelectedTaskId,
}) => {
  // Tabs for sub-filtering
  const [activeTab, setActiveTab] = useState<'ALL' | 'ASSIGNED_TO_ME' | 'DELEGATED_BY_ME'>(filterMode);
  const [assignedSubFilter, setAssignedSubFilter] = useState<'ALL' | 'PRIMARY' | 'COOPERATE'>('ALL');

  useEffect(() => {
    setActiveTab(filterMode);
  }, [filterMode]);

  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN'>('LIST');

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const discussionSectionRef = useRef<HTMLDivElement>(null);

  // Auto open task and scroll to discussion if navigated from notification
  useEffect(() => {
    if (initialSelectedTaskId) {
      const target = tasks.find(
        (t) => t.id === initialSelectedTaskId || t.code === initialSelectedTaskId
      );
      if (target) {
        setSelectedTask(target);
        setSearch('');
        setFilterPriority('ALL');
        setFilterStatus('ALL');
        setActiveTab('ALL');

        // Scroll to discussion chat section smoothly
        setTimeout(() => {
          if (discussionSectionRef.current) {
            discussionSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 250);
      }
    }
  }, [initialSelectedTaskId, tasks]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // AI Task Breakdown State
  const [showAiBreakdown, setShowAiBreakdown] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Chat & Directives State (Real Authenticated User)
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id || d.code === id);
  const getIncomingDoc = (id?: string) => incomingDocs.find((d) => d.id === id);

  const today = new Date().toISOString().split('T')[0];

  // Quick Directive templates based on Persona
  const leaderDirectives = [
    '📌 Yêu cầu đồng chí khẩn trương hoàn thành báo cáo trước 17h hôm nay.',
    '📌 Đồng ý với phương án đề xuất, cho phép triển khai các bước tiếp theo.',
    '📌 Cần rà soát kỹ bảng dự toán kinh phí và đối chiếu định mức tài chính.',
    '📌 Yêu cầu phối hợp chặt chẽ với các đơn vị liên quan để đảm bảo tiến độ.',
  ];

  const staffResponses = [
    '💬 Dạ báo cáo Thủ trưởng, em đã tiếp nhận chỉ đạo và đang triển khai ngay ạ.',
    '💬 Kính gửi Lãnh đạo, tiến độ công việc hiện đã đạt 80%, dự kiến xong trong hôm nay.',
    '💬 Dạ em gửi Lãnh đạo xem trước bản dự thảo đề cương sơ bộ để xin ý kiến chỉ đạo.',
    '💬 Báo cáo Lãnh đạo, nhiệm vụ đã hoàn thành đúng hạn và đầy đủ hồ sơ nghiệm thu.',
  ];

  const isLeaderOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'LEADER';
  const [agencyScope, setAgencyScope] = useState<'MY' | 'ALL'>(isLeaderOrAdmin ? 'ALL' : 'MY');

  // Base list of tasks accessible to this user
  const accessibleTasks = useMemo(() => {
    if (isLeaderOrAdmin && agencyScope === 'ALL') {
      return tasks;
    }
    if (!currentUser) return tasks;
    return tasks.filter(
      (t) =>
        t.assigneeId === currentUser?.id ||
        t.coAssigneeIds?.includes(currentUser?.id || '') ||
        t.creatorId === currentUser?.id ||
        t.createdById === currentUser?.id
    );
  }, [tasks, isLeaderOrAdmin, agencyScope, currentUser?.id]);

  // Counts for tabs
  const assignedToMeTasks = accessibleTasks.filter(
    (t) => t.assigneeId === currentUser?.id || t.coAssigneeIds?.includes(currentUser?.id || '')
  );
  const myLeadTasks = accessibleTasks.filter((t) => t.assigneeId === currentUser?.id);
  const myCoTasks = accessibleTasks.filter((t) => t.coAssigneeIds?.includes(currentUser?.id || ''));
  const delegatedByMeTasks = accessibleTasks.filter(
    (t) => t.createdById === currentUser?.id || t.creatorId === currentUser?.id
  );

  const filteredTasks = accessibleTasks.filter((t) => {
    // Mode filtering
    if (activeTab === 'ASSIGNED_TO_ME') {
      if (assignedSubFilter === 'PRIMARY') {
        if (t.assigneeId !== currentUser?.id) return false;
      } else if (assignedSubFilter === 'COOPERATE') {
        if (!t.coAssigneeIds?.includes(currentUser?.id || '')) return false;
      } else {
        if (t.assigneeId !== currentUser?.id && !t.coAssigneeIds?.includes(currentUser?.id || '')) return false;
      }
    } else if (activeTab === 'DELEGATED_BY_ME') {
      if (t.createdById !== currentUser?.id && t.creatorId !== currentUser?.id) return false;
    }

    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchPriority = filterPriority === 'ALL' || t.priority === filterPriority;
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;

    return matchSearch && matchPriority && matchStatus;
  });

  const handleOpenAddModal = () => {
    setEditingTask({
      id: 'task-' + Date.now(),
      code: `CV-${new Date().getFullYear()}-${String(tasks.length + 1).padStart(2, '0')}`,
      title: '',
      description: '',
      creatorId: currentUser?.id || '',
      createdById: currentUser?.id || '',
      assigneeId: users.find((u) => u.id !== currentUser?.id)?.id || currentUser?.id || '',
      coAssigneeIds: [],
      startDate: today,
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      progress: 0,
      subTasks: [],
      comments: [],
      attachments: [],
      dossierId: dossiers[0]?.id || '',
      incomingDocId: '',
    });
    setAiError(null);
    setFormError(null);
    setShowAiBreakdown(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask({ ...task });
    setAiError(null);
    setFormError(null);
    setShowAiBreakdown(false);
    setIsModalOpen(true);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingTask) return;

    let finalTitle = (editingTask.title || '').trim();
    if (!finalTitle && editingTask.description?.trim()) {
      finalTitle = editingTask.description.trim().slice(0, 100);
    }
    if (!finalTitle) {
      setFormError('⚠️ Vui lòng nhập Tên nhiệm vụ hoặc Mô tả công việc để lưu.');
      return;
    }
    setFormError(null);

    const taskToSave: Task = {
      ...editingTask,
      id: editingTask.id || 'task-' + Date.now(),
      code: editingTask.code?.trim() || `CV-${new Date().getFullYear()}-${String(tasks.length + 1).padStart(2, '0')}`,
      title: finalTitle,
      description: editingTask.description || '',
      creatorId: editingTask.creatorId || editingTask.createdById || currentUser?.id || '',
      createdById: editingTask.createdById || editingTask.creatorId || currentUser?.id || '',
      assigneeId: editingTask.assigneeId || currentUser?.id || '',
      coAssigneeIds: editingTask.coAssigneeIds || [],
      priority: editingTask.priority || 'MEDIUM',
      startDate: editingTask.startDate || today,
      dueDate: editingTask.dueDate || today,
      progress: typeof editingTask.progress === 'number' ? editingTask.progress : 0,
      status: editingTask.status || 'IN_PROGRESS',
      subTasks: editingTask.subTasks || [],
      comments: editingTask.comments || [],
      attachments: editingTask.attachments || [],
      dossierId: editingTask.dossierId || '',
      incomingDocId: editingTask.incomingDocId || '',
    };

    onSaveTask(taskToSave);
    setIsModalOpen(false);
    setEditingTask(null);
    if (selectedTask && selectedTask.id === taskToSave.id) {
      setSelectedTask(taskToSave);
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
      }));

      setEditingTask((prev) => ({
        ...prev,
        subTasks: [...(prev?.subTasks || []), ...newSubTasks],
        description: prev?.description
          ? `${prev.description}\n\n[AI Gợi ý rủi ro & tiến độ]: ${result.riskWarning}`
          : `[AI Gợi ý rủi ro & tiến độ]: ${result.riskWarning}`,
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
    const updatedSubTasks = (selectedTask.subTasks || []).map((st) =>
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    const completedCount = updatedSubTasks.filter((s) => s.completed).length;
    const newProgress =
      updatedSubTasks.length > 0
        ? Math.round((completedCount / updatedSubTasks.length) * 100)
        : selectedTask.progress;

    const updatedTask: Task = {
      ...selectedTask,
      subTasks: updatedSubTasks,
      progress: newProgress,
      status:
        newProgress === 100
          ? 'COMPLETED'
          : selectedTask.status === 'NOT_STARTED'
          ? 'IN_PROGRESS'
          : selectedTask.status,
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
      subTasks: [...(selectedTask.subTasks || []), newSt],
    };
    setSelectedTask(updatedTask);
    onSaveTask(updatedTask);
    setNewSubtaskTitle('');
  };

  // Send interactive chat message / directive (as authentic currentUser)
  const handleSendMessage = async (customContent?: string) => {
    const textToSend = customContent || newComment;
    if (!selectedTask || !textToSend.trim()) return;

    setIsSendingMessage(true);
    const senderUser = currentUser;

    // Prevent duplicate comments in state
    const currentComments = selectedTask.comments || [];
    const uniqueId = `cm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const commentObj: TaskComment = {
      id: uniqueId,
      userId: senderUser.id,
      userName: senderUser.fullName,
      userAvatar: senderUser.avatar,
      content: textToSend.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...currentComments, commentObj];
    const updatedTask: Task = {
      ...selectedTask,
      comments: updatedComments,
      updatedAt: new Date().toISOString(),
    };

    setSelectedTask(updatedTask);
    onSaveTask(updatedTask);

    // Call service to write directly to MySQL database & notify recipient
    dbService.addTaskComment(selectedTask.id, commentObj, senderUser);

    setNewComment('');
    setIsSendingMessage(false);
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black text-[10px] inline-flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-600" />
            KHẨN CẤP
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px]">
            CAO
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px]">
            THẤP
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium text-[10px]">
            TRUNG BÌNH
          </span>
        );
    }
  };

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            HOÀN THÀNH
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black text-[10px] animate-pulse">
            QUÁ HẠN
          </span>
        );
      case 'WAITING_APPROVAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">
            CHỜ DUYỆT
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
            ĐANG LÀM
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px]">
            ĐÃ HỦY
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
            CHƯA BẮT ĐẦU
          </span>
        );
    }
  };

  const kanbanColumns: { status: TaskStatus; label: string; bg: string }[] = [
    { status: 'NOT_STARTED', label: 'Chưa bắt đầu', bg: 'bg-slate-100' },
    { status: 'IN_PROGRESS', label: 'Đang thực hiện', bg: 'bg-blue-50' },
    { status: 'WAITING_APPROVAL', label: 'Chờ duyệt', bg: 'bg-purple-50' },
    { status: 'COMPLETED', label: 'Đã hoàn thành', bg: 'bg-emerald-50' },
  ];

  // Helper to get active task's leadership & assignee
  const selectedLeader = selectedTask ? getUser(selectedTask.creatorId || selectedTask.createdById) : null;
  const selectedAssignee = selectedTask ? getUser(selectedTask.assigneeId) : null;

  return (
    <div className="w-full p-5 md:p-7 flex flex-col gap-5 flex-1">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-black text-slate-800">
              Quản Lý Phân Công & Điều Hành Nhiệm Vụ
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Theo dõi phân công đúng người thực hiện, trao đổi chỉ đạo 2 chiều giữa Lãnh đạo và Nhân viên, lưu trữ CSDL MySQL.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* List / Kanban View Switch */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'LIST' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'KANBAN' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            id="add-task-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Giao nhiệm vụ mới</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>{isLeaderOrAdmin && agencyScope === 'ALL' ? 'Tất cả nhiệm vụ cơ quan' : 'Tất cả việc của tôi'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {accessibleTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ASSIGNED_TO_ME')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ASSIGNED_TO_ME'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Nhiệm vụ giao cho tôi</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'ASSIGNED_TO_ME' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
              {assignedToMeTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('DELEGATED_BY_ME')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'DELEGATED_BY_ME'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Nhiệm vụ tôi giao</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'DELEGATED_BY_ME' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-700'}`}>
              {delegatedByMeTasks.length}
            </span>
          </button>
        </div>

        {/* Agency vs Personal scope switcher for Leaders & Admins */}
        {isLeaderOrAdmin && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <span className="text-[10px] text-slate-500 font-bold px-2 uppercase">Phạm vi:</span>
            <button
              onClick={() => setAgencyScope('MY')}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                agencyScope === 'MY'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Việc của tôi
            </button>
            <button
              onClick={() => setAgencyScope('ALL')}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                agencyScope === 'ALL'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toàn cơ quan
            </button>
          </div>
        )}

        {/* Non-leader privacy badge */}
        {!isLeaderOrAdmin && (
          <div className="text-[11px] font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Chỉ hiển thị công việc bạn được giao hoặc trực tiếp giao đi</span>
          </div>
        )}

        {/* Sub filter when in ASSIGNED_TO_ME */}
        {activeTab === 'ASSIGNED_TO_ME' && (
          <div className="flex items-center gap-1.5 bg-indigo-50/70 p-1 rounded-xl border border-indigo-100 text-xs">
            <span className="text-[11px] font-bold text-indigo-900 px-2">Vai trò:</span>
            <button
              onClick={() => setAssignedSubFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                assignedSubFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              Tất cả ({assignedToMeTasks.length})
            </button>
            <button
              onClick={() => setAssignedSubFilter('PRIMARY')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                assignedSubFilter === 'PRIMARY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Tôi chủ trì ({myLeadTasks.length})
            </button>
            <button
              onClick={() => setAssignedSubFilter('COOPERATE')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                assignedSubFilter === 'COOPERATE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Tôi phối hợp ({myCoTasks.length})
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên công việc, mã việc, mô tả..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Mọi mức ưu tiên</option>
          <option value="URGENT">Khẩn cấp</option>
          <option value="HIGH">Ưu tiên cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Mọi trạng thái</option>
          <option value="IN_PROGRESS">Đang làm</option>
          <option value="NOT_STARTED">Chưa bắt đầu</option>
          <option value="WAITING_APPROVAL">Chờ duyệt</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="OVERDUE">Quá hạn</option>
        </select>
      </div>

      {/* Main Content: List or Kanban */}
      {viewMode === 'LIST' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Mã & Tên nhiệm vụ</th>
                  <th className="px-4 py-3">Lãnh đạo giao việc</th>
                  <th className="px-4 py-3">Người thực hiện chính</th>
                  <th className="px-4 py-3">Hạn hoàn thành</th>
                  <th className="px-4 py-3">Tiến độ</th>
                  <th className="px-4 py-3">Trao đổi</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckSquare className="w-8 h-8 text-slate-300" />
                        <span className="font-medium">Không tìm thấy công việc nào phù hợp.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const leader = getUser(t.creatorId || t.createdById);
                    const assignee = getUser(t.assigneeId);
                    const coAssignees = (t.coAssigneeIds || []).map((id) => getUser(id)).filter(Boolean);
                    const isOverdue = t.dueDate < today && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';

                    const isMyLead = t.assigneeId === currentUser?.id;
                    const isMyCo = t.coAssigneeIds?.includes(currentUser?.id || '');
                    const isMyDelegated = t.creatorId === currentUser?.id || t.createdById === currentUser?.id;

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                      >
                        {/* Task Code & Title */}
                        <td className="px-5 py-3.5 max-w-xs md:max-w-md">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-bold font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                #{t.code}
                              </span>

                              {/* Role Badge for current user */}
                              {isMyLead && (
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  ⭐ Bạn Chủ Trì
                                </span>
                              )}
                              {isMyCo && (
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  🤝 Bạn Phối Hợp
                                </span>
                              )}
                              {isMyDelegated && (
                                <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  👑 Bạn Giao Việc
                                </span>
                              )}

                              {getPriorityBadge(t.priority)}
                            </div>

                            <span className="font-bold text-slate-800 group-hover:text-indigo-600 leading-snug">
                              {t.title}
                            </span>
                          </div>
                        </td>

                        {/* Leader who assigned */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {leader ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={leader.avatar}
                                alt={leader.fullName}
                                className="w-6 h-6 rounded-full object-cover border border-amber-300 ring-1 ring-amber-100"
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-[11px]">{leader.fullName}</span>
                                <span className="text-[10px] text-slate-400">{leader.position || 'Lãnh đạo'}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Hệ thống</span>
                          )}
                        </td>

                        {/* Assignee / Primary Staff */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={assignee.avatar}
                                alt={assignee.fullName}
                                className="w-6 h-6 rounded-full object-cover border border-indigo-200"
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-[11px]">{assignee.fullName}</span>
                                {coAssignees.length > 0 && (
                                  <span className="text-[10px] text-indigo-600 font-medium">
                                    +{coAssignees.length} người phối hợp
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa phân công</span>
                          )}
                        </td>

                        {/* Due Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium">
                          <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                            {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        </td>

                        {/* Progress */}
                        <td className="px-4 py-3.5">
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                              <span>{t.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  t.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${t.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Comments count */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-600 font-semibold text-[11px]">
                            <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{(t.comments || []).length}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getStatusBadge(isOverdue ? 'OVERDUE' : t.status)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleOpenEditModal(t)}
                              title="Sửa công việc"
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer transition-colors"
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
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg cursor-pointer transition-colors"
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
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col min-h-[420px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <span className="font-bold text-xs text-slate-800">{col.label}</span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
                  {colTasks.map((t) => {
                    const assignee = getUser(t.assigneeId);
                    const leader = getUser(t.creatorId || t.createdById);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="bg-slate-50/80 hover:bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[10px] text-slate-500 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
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
                          <span className="font-semibold text-rose-600">
                            Hạn: {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {leader && (
                              <img
                                src={leader.avatar}
                                alt={leader.fullName}
                                className="w-5 h-5 rounded-full object-cover border border-amber-300"
                                title={`Lãnh đạo giao việc: ${leader.fullName}`}
                              />
                            )}
                            <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                            {assignee && (
                              <img
                                src={assignee.avatar}
                                alt={assignee.fullName}
                                className="w-5 h-5 rounded-full object-cover border border-indigo-400"
                                title={`Người thực hiện: ${assignee.fullName}`}
                              />
                            )}
                          </div>
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

      {/* Task Detail Modal & Interactive Directives Chat Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="font-black text-slate-800 text-base block">
                    [{selectedTask.code}] {selectedTask.title}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Phân công & Trao đổi chỉ đạo nhiệm vụ trực tiếp
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-5 text-xs flex-1">
              {/* Badges & Status Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(selectedTask.priority)}
                  {getStatusBadge(selectedTask.status)}
                </div>

                {/* Quick Status Updater */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700">Trạng thái:</span>
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
                    className="bg-white border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="NOT_STARTED">Chưa bắt đầu</option>
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="WAITING_APPROVAL">Chờ duyệt</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
              </div>

              {/* Personnel Assignment Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Leader / Assigner */}
                <div className="p-3.5 bg-gradient-to-r from-amber-50/80 to-white rounded-2xl border border-amber-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">
                      Lãnh Đạo Giao Việc
                    </span>
                  </div>
                  {selectedLeader ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={selectedLeader.avatar}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover border-2 border-amber-300"
                      />
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">
                          {selectedLeader.fullName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {selectedLeader.position || getDeptString(selectedLeader.department)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Ban Giám Đốc</span>
                  )}
                </div>

                {/* Primary Assignee */}
                <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 to-white rounded-2xl border border-indigo-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider">
                      Cán Bộ Chủ Trì Thực Hiện
                    </span>
                  </div>
                  {selectedAssignee ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={selectedAssignee.avatar}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover border-2 border-indigo-300"
                      />
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">
                          {selectedAssignee.fullName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {selectedAssignee.position || getDeptString(selectedAssignee.department)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Chưa giao cụ thể</span>
                  )}
                </div>
              </div>

              {/* Co-assignees if any */}
              {selectedTask.coAssigneeIds && selectedTask.coAssigneeIds.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                    Cán bộ phối hợp thực hiện ({selectedTask.coAssigneeIds.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.coAssigneeIds.map((id) => {
                      const u = getUser(id);
                      if (!u) return null;
                      return (
                        <div
                          key={u.id}
                          className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-medium text-[11px]"
                        >
                          <img src={u.avatar} alt={u.fullName} className="w-4 h-4 rounded-full object-cover" />
                          <span>{u.fullName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Linked Incoming Document & Dossier Info */}
              {(selectedTask.incomingDocId || selectedTask.dossierId) && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                  {selectedTask.incomingDocId && getIncomingDoc(selectedTask.incomingDocId) && (
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/80">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Căn cứ Văn bản đến
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          [{getIncomingDoc(selectedTask.incomingDocId)?.documentNumber}]{' '}
                          {getIncomingDoc(selectedTask.incomingDocId)?.summary}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Đơn vị gửi: {getIncomingDoc(selectedTask.incomingDocId)?.issuingAuthority}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedTask.dossierId && (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Hồ sơ vụ việc liên kết
                        </span>
                        <span className="text-xs font-bold text-indigo-700">
                          {getDossier(selectedTask.dossierId)?.code} - {getDossier(selectedTask.dossierId)?.title}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const dId = selectedTask.dossierId;
                          setSelectedTask(null);
                          if (dId) onOpenDossier(dId);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors"
                      >
                        Mở hồ sơ &rarr;
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Slider */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
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
                      status:
                        p === 100
                          ? 'COMPLETED'
                          : p > 0 && selectedTask.status === 'NOT_STARTED'
                          ? 'IN_PROGRESS'
                          : selectedTask.status,
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
                <p className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedTask.description || 'Không có mô tả chi tiết'}
                </p>
              </div>

              {/* Checklist Sub-tasks */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800">Checklist Các Bước Thực Hiện</span>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    {(selectedTask.subTasks || []).filter((s) => s.completed).length}/
                    {(selectedTask.subTasks || []).length} Đã xong
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  {(selectedTask.subTasks || []).map((st) => (
                    <div
                      key={st.id}
                      onClick={() => handleToggleSubtask(st.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors ${
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
                      <span
                        className={`flex-1 ${
                          st.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                        }`}
                      >
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
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={handleAddSubTask}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>
              </div>

              {/* 2-WAY INTERACTIVE CHAT & DIRECTIVES SECTION */}
              <div ref={discussionSectionRef} className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden flex flex-col scroll-mt-6">
                {/* Chat Header */}
                <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs">
                      Ý Kiến Chỉ Đạo & Trao Đổi Nghiệp Vụ ({(selectedTask.comments || []).length})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 bg-emerald-950/70 px-2.5 py-0.5 rounded-full font-bold border border-emerald-700/60">
                    <Database className="w-3 h-3" />
                    <span>Lưu CSDL MySQL</span>
                  </div>
                </div>

                {/* REAL AUTHENTICATED USER IDENTITY BAR */}
                <div className="p-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Tài khoản gửi tin:</span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg shadow-2xs">
                      <img
                        src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={currentUser?.fullName || 'User'}
                        className="w-4 h-4 rounded-full object-cover border border-slate-200"
                      />
                      <span className="font-bold text-xs text-slate-800">{currentUser?.fullName || 'Người dùng'}</span>
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                        {currentUser?.position || (currentUser?.role === 'DIRECTOR' ? 'Giám đốc' : currentUser?.role === 'DEPUTY_DIRECTOR' ? 'Phó Giám đốc' : currentUser?.role === 'CHIEF_OFFICER' ? 'Chánh Văn phòng' : 'Chuyên viên')}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Đang đăng nhập thực tế
                  </span>
                </div>

                {/* Chat Messages Stream */}
                <div className="p-4 space-y-3.5 max-h-72 overflow-y-auto custom-scrollbar bg-slate-50/50">
                  {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                    <div className="text-center text-slate-400 py-6 text-xs flex flex-col items-center gap-2">
                      <MessageCircle className="w-8 h-8 text-slate-300" />
                      <span>Chưa có trao đổi nào. Hãy gửi ý kiến chỉ đạo hoặc báo cáo tiến độ đầu tiên!</span>
                    </div>
                  ) : (
                    // Deduplicate comments by id just in case
                    selectedTask.comments.filter((c, index, arr) => arr.findIndex(x => x.id === c.id) === index).map((cm, idx) => {
                      const isMe = cm.userId === currentUser?.id;
                      const sender = getUser(cm.userId);
                      const isLeaderSender = cm.userId === (selectedTask.creatorId || selectedTask.createdById);
                      const isAssigneeSender = cm.userId === selectedTask.assigneeId;

                      return (
                        <div
                          key={cm.id ? `${cm.id}-${idx}` : `cm-key-${idx}`}
                          className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {/* Sender Avatar */}
                          <img
                            src={cm.userAvatar || sender?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={cm.userName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                          />

                          {/* Message Content Bubble */}
                          <div
                            className={`max-w-[80%] rounded-2xl p-3 text-xs ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs'
                            }`}
                          >
                            <div
                              className={`flex items-center gap-1.5 mb-1 ${
                                isMe ? 'justify-end text-indigo-100' : 'text-slate-500'
                              }`}
                            >
                              <span className={`font-bold text-[11px] ${isMe ? 'text-white' : 'text-slate-800'}`}>
                                {cm.userName}
                              </span>

                              {/* Role Tag */}
                              {isLeaderSender && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isMe ? 'bg-indigo-700 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>
                                  Lãnh đạo
                                </span>
                              )}
                              {isAssigneeSender && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isMe ? 'bg-indigo-700 text-emerald-300' : 'bg-emerald-100 text-emerald-800'}`}>
                                  Chủ trì
                                </span>
                              )}

                              <span className="text-[10px] opacity-75">
                                {new Date(cm.createdAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <p className="leading-relaxed whitespace-pre-line text-xs font-normal">
                              {cm.content}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Action Suggestion Chips */}
                {(() => {
                  const isCurrentUserLeader = selectedTask.creatorId === currentUser?.id || selectedTask.createdById === currentUser?.id || (currentUser?.role && ['DIRECTOR', 'DEPUTY_DIRECTOR', 'CHIEF_OFFICER', 'LEADER', 'ADMIN'].includes(currentUser.role));
                  return (
                    <div className="p-2.5 bg-slate-100/80 border-t border-slate-200">
                      <div className="flex items-center gap-1 mb-1.5 text-[10px] font-bold text-slate-500">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>{isCurrentUserLeader ? 'Mẫu ý kiến chỉ đạo nhanh:' : 'Mẫu phản hồi & báo cáo nhanh:'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(isCurrentUserLeader ? leaderDirectives : staffResponses).map(
                          (phrase, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendMessage(phrase)}
                              className="text-[10px] bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-300 font-medium transition-all text-left"
                            >
                              {phrase}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Chat Input Box */}
                {(() => {
                  const isCurrentUserLeader = selectedTask.creatorId === currentUser?.id || selectedTask.createdById === currentUser?.id || (currentUser?.role && ['DIRECTOR', 'DEPUTY_DIRECTOR', 'CHIEF_OFFICER', 'LEADER', 'ADMIN'].includes(currentUser.role));
                  return (
                    <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={
                          isCurrentUserLeader
                            ? 'Nhập ý kiến chỉ đạo của Lãnh đạo...'
                            : 'Nhập nội dung phản hồi, báo cáo tiến độ thực tế...'
                        }
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={isSendingMessage || !newComment.trim()}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi</span>
                      </button>
                    </div>
                  );
                })()}
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
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
                    ? 'Giao Nhiệm Vụ Mới Cho Cán Bộ'
                    : `Cập Nhật Nhiệm Vụ: ${editingTask.code}`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs custom-scrollbar">
              {/* Form Validation Error Banner */}
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-center gap-2 font-bold animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title & Code Prominent Top Section */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                {/* Linked Incoming Document (Căn cứ giao việc) */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Inbox className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Căn cứ Văn bản đến liên kết (Nếu có)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Tự động gán Mã hồ sơ & Trích yếu
                    </span>
                  </label>
                  <select
                    value={editingTask.incomingDocId || ''}
                    onChange={(e) => {
                      const selectedDocId = e.target.value;
                      const matchedDoc = incomingDocs.find((d) => d.id === selectedDocId);
                      if (matchedDoc) {
                        setEditingTask({
                          ...editingTask,
                          incomingDocId: selectedDocId,
                          dossierId: matchedDoc.dossierId || editingTask.dossierId,
                          title: editingTask.title ? editingTask.title : `Xử lý VB đến [${matchedDoc.documentNumber}]: ${matchedDoc.summary.slice(0, 70)}`,
                          assigneeId: matchedDoc.assigneeId || editingTask.assigneeId,
                        });
                      } else {
                        setEditingTask({
                          ...editingTask,
                          incomingDocId: '',
                        });
                      }
                    }}
                    className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- Giao việc theo Kế hoạch nội bộ / Độc lập (Không theo VB đến) --</option>
                    {incomingDocs.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        [{doc.documentNumber}] {doc.issuingAuthority} - {doc.summary.slice(0, 60)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700 mb-1">Mã công việc</label>
                    <input
                      type="text"
                      value={editingTask.code || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, code: e.target.value })}
                      placeholder="CV-2026-01"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-bold text-indigo-950 mb-1">
                      Tên nhiệm vụ / Tiêu đề công việc <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={editingTask.title || ''}
                      onChange={(e) => {
                        setEditingTask({ ...editingTask, title: e.target.value });
                        if (formError) setFormError(null);
                      }}
                      placeholder="VD: Soát xét hợp đồng bảo trì phần mềm..."
                      className="w-full p-2.5 bg-white border border-indigo-200 focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-900 shadow-xs"
                    />
                  </div>
                </div>

                {/* AI Suggest Breakdown Helper inside */}
                <div className="flex items-center justify-between pt-1 border-t border-indigo-100/70">
                  <div className="flex items-center gap-1.5 text-indigo-800 font-semibold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Gợi ý AI phân rã checklist & tiến độ</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAiBreakdown}
                    disabled={isAiLoading}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isAiLoading ? 'AI đang phân tích...' : 'AI Phân Rã'}</span>
                  </button>
                </div>
                {aiError && <p className="text-[11px] text-rose-600 font-medium">{aiError}</p>}
              </div>

              {/* Leader Assigner & Primary Staff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-amber-800 mb-1">
                    👑 Lãnh đạo giao việc <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingTask.creatorId || editingTask.createdById || currentUser?.id || ''}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        creatorId: e.target.value,
                        createdById: e.target.value,
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <optgroup label="--- Ban Giám Đốc & Lãnh Đạo Đơn Vị ---">
                      {users
                        .filter(
                          (u) =>
                            u?.role === 'LEADER' ||
                            u?.role === 'ADMIN' ||
                            u?.position?.includes('Giám Đốc') ||
                            u?.position?.includes('Trưởng Phòng') ||
                            u?.position?.includes('Chánh Văn Phòng')
                        )
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            👑 {u.fullName} - {u.position || u.role || 'Lãnh đạo'} ({getDeptString(u.department)})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="--- Chuyên Viên & Cán Bộ Khác ---">
                      {users
                        .filter(
                          (u) =>
                            u?.role !== 'LEADER' &&
                            u?.role !== 'ADMIN' &&
                            !u?.position?.includes('Giám Đốc') &&
                            !u?.position?.includes('Trưởng Phòng') &&
                            !u?.position?.includes('Chánh Văn Phòng')
                        )
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} - {u.position || u.role || 'Chuyên viên'} ({getDeptString(u.department)})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-indigo-800 mb-1">
                    ⭐ Người thực hiện chính (Chủ trì) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingTask.assigneeId || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, assigneeId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-900"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.position || u.role || 'Chuyên viên'}) - {getDeptString(u.department)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Co-assignees selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  🤝 Cán bộ phối hợp thực hiện (Chọn nhiều)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto custom-scrollbar">
                  {users
                    .filter((u) => u.id !== editingTask.assigneeId)
                    .map((u) => {
                      const isChecked = (editingTask.coAssigneeIds || []).includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-indigo-50 border-indigo-300 font-bold text-indigo-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = editingTask.coAssigneeIds || [];
                              if (e.target.checked) {
                                setEditingTask({ ...editingTask, coAssigneeIds: [...current, u.id] });
                              } else {
                                setEditingTask({
                                  ...editingTask,
                                  coAssigneeIds: current.filter((id) => id !== u.id),
                                });
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{u.fullName}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả chi tiết & Yêu cầu đầu ra</label>
                <textarea
                  rows={3}
                  value={editingTask.description || ''}
                  onChange={(e) => {
                    setEditingTask({ ...editingTask, description: e.target.value });
                    if (formError) setFormError(null);
                  }}
                  placeholder="Mô tả cụ thể mục tiêu, tài liệu cần nộp, tiêu chí đánh giá..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Dates & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-rose-600"
                  />
                </div>

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
              </div>

              {/* Status & Dossier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={editingTask.status || 'IN_PROGRESS'}
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
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Gắn vào Mã Hồ Sơ vụ việc</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">Theo NĐ 30/2020</span>
                  </label>
                  <select
                    value={editingTask.dossierId || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dossierId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-900"
                  >
                    <option value="">-- Chưa gắn hồ sơ vụ việc --</option>
                    {dossiers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.title.slice(0, 35)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dossier Principle Explanation Box */}
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-relaxed">
                  <span className="font-bold">Nguyên lý Hồ sơ công việc:</span> Gắn Mã Hồ Sơ giúp tập hợp toàn bộ{' '}
                  <strong>Văn bản đến + Nhiệm vụ xử lý + Dự thảo / Văn bản đi + File scan</strong> về một đầu mối.
                  Lãnh đạo và cán bộ có thể tra cứu toàn bộ tiến trình vụ việc và nộp lưu trữ cơ quan chỉ với 1 click.
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                {formError ? (
                  <span className="text-rose-600 font-bold text-xs">{formError}</span>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-all"
                  >
                    Lưu nhiệm vụ
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
