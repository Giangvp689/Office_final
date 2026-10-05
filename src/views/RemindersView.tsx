import React, { useState, useMemo } from 'react';
import { Task, IncomingDocument, OutgoingDocument, User, SystemNotification } from '../types';
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
  ShieldAlert,
  FileCheck2,
  Sparkles,
  Award,
  Layers,
  Trash2,
  Search,
  FileSignature,
  ArrowRight,
  ExternalLink,
  Check,
  RotateCcw,
  Calendar,
  MessageSquare,
  Filter,
} from 'lucide-react';
import { canNudgeOrRemindStaff, canCreateOrAssignTask, isClerk, isLeaderOrAdmin } from '../utils/permission';
import { formatNotificationDateTime } from '../utils/dateUtils';

interface RemindersViewProps {
  tasks: Task[];
  incomingDocs: IncomingDocument[];
  outgoingDocs?: OutgoingDocument[];
  users: User[];
  currentUser: User;
  onOpenTaskDetail: (id: string) => void;
  onOpenIncomingDocDetail: (id: string) => void;
  onOpenOutgoingDocDetail?: (id: string) => void;
  onCreateNotification: (title: string, message: string, userId?: string) => void;
  notifications?: SystemNotification[];
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  onClearAllNotifications?: () => void;
  onNavigateToTarget?: (type: string, id: string, subTarget?: 'COMMENTS' | 'DETAILS' | 'APPROVAL') => void;
  initialTab?: 'REMINDERS' | 'NOTIFICATIONS';
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  tasks,
  incomingDocs,
  outgoingDocs = [],
  users,
  currentUser,
  onOpenTaskDetail,
  onOpenIncomingDocDetail,
  onOpenOutgoingDocDetail,
  onCreateNotification,
  notifications = [],
  onMarkNotificationAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onNavigateToTarget,
  initialTab = 'REMINDERS',
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'REMINDERS' | 'NOTIFICATIONS'>(initialTab);
  const [notifSearch, setNotifSearch] = useState('');
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD' | 'APPROVAL' | 'ASSIGNMENT' | 'COMPLETED'>('ALL');
  const [nudgedIds, setNudgedIds] = useState<string[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const canNudge = canNudgeOrRemindStaff(currentUser);
  const canAssign = canCreateOrAssignTask(currentUser);
  const isClerkUser = isClerk(currentUser);
  const isStaffUser = currentUser?.role === 'STAFF';
  const isLeader = isLeaderOrAdmin(currentUser);

  // Scope: STAFF is strictly 'MY' (never sees other people's tasks). Leaders can toggle 'ALL' or 'MY'.
  const [leaderScope, setLeaderScope] = useState<'ALL' | 'MY'>('ALL');
  const effectiveScope = isStaffUser ? 'MY' : leaderScope;

  // Filter tasks based on personalized scope
  const scopedTasks = useMemo(() => {
    if (isStaffUser) {
      return tasks.filter(
        (t) => t.assigneeId === currentUser?.id || t.coAssigneeIds?.includes(currentUser?.id || '')
      );
    }
    if (isLeader && leaderScope === 'MY') {
      return tasks.filter(
        (t) =>
          t.creatorId === currentUser?.id ||
          t.createdById === currentUser?.id ||
          t.assigneeId === currentUser?.id
      );
    }
    return tasks;
  }, [tasks, isStaffUser, isLeader, leaderScope, currentUser?.id]);

  // 1. Overdue Tasks (Personalized)
  const overdueTasks = useMemo(() => {
    return scopedTasks.filter(
      (t) =>
        (t.status === 'OVERDUE' || t.dueDate < today) &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED'
    );
  }, [scopedTasks, today]);

  // 2. Tasks Due Today (Personalized)
  const dueTodayTasks = useMemo(() => {
    return scopedTasks.filter(
      (t) => t.dueDate === today && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    );
  }, [scopedTasks, today]);

  // 3. Tasks Due in 3 days (Personalized)
  const dueSoonTasks = useMemo(() => {
    return scopedTasks.filter(
      (t) => t.dueDate > today && t.dueDate <= in3Days && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    );
  }, [scopedTasks, today, in3Days]);

  // 4. Tasks waiting for Leader's approval & acceptance (For Leaders / Admins)
  const waitingApprovalTasks = useMemo(() => {
    if (!isLeader) return [];
    return tasks.filter((t) => t.status === 'WAITING_APPROVAL');
  }, [tasks, isLeader]);

  // 5. Incoming Docs relevant to the user
  const relevantIncomingDocs = useMemo(() => {
    if (isStaffUser) {
      // Specialist only sees incoming docs assigned to them that are active
      return incomingDocs.filter(
        (d) =>
          (d.assigneeId === currentUser?.id || d.coAssigneeIds?.includes(currentUser?.id || '')) &&
          d.status !== 'COMPLETED'
      );
    }
    // Leader / Clerk: Unassigned docs needing directive or registration
    return incomingDocs.filter((d) => !d.assigneeId || d.status === 'PENDING_ASSIGN');
  }, [incomingDocs, isStaffUser, currentUser?.id]);

  // 6. Outgoing Docs relevant to the user
  const relevantOutgoingDocs = useMemo(() => {
    if (isStaffUser) {
      // Specialist: Outgoing docs drafted by them that are pending (not issued/sent)
      return outgoingDocs.filter(
        (d) =>
          (d.drafterId === currentUser?.id || d.createdById === currentUser?.id) &&
          d.status !== 'ISSUED' &&
          d.status !== 'SENT'
      );
    }
    if (isClerkUser) {
      // Clerk: Outgoing docs waiting for numbering, stamping & release
      return outgoingDocs.filter(
        (d) => d.status === 'SIGNED' || d.status === 'DRAFT'
      );
    }
    // Leader: Outgoing docs pending review or signature
    return outgoingDocs.filter(
      (d) => d.status === 'DRAFT' || d.status === 'REVIEWING'
    );
  }, [outgoingDocs, isStaffUser, isClerkUser, currentUser?.id]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const approvalNotifsCount = useMemo(
    () => notifications.filter((n) => n.type === 'TASK_APPROVAL_REQUEST' || n.type === 'DOC_SIGN_REQUEST').length,
    [notifications]
  );

  const completedNotifsCount = useMemo(
    () => notifications.filter((n) => n.type === 'TASK_APPROVED' || n.type === 'DOC_SIGNED' || n.type === 'DOC_ISSUED').length,
    [notifications]
  );

  const assignedNotifsCount = useMemo(
    () =>
      notifications.filter(
        (n) => n.type === 'NEW_TASK' || n.type === 'TASK_ASSIGNED' || n.type === 'DOC_ASSIGNED' || n.type === 'DOC_INCOMING'
      ).length,
    [notifications]
  );

  const filteredNotificationList = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Text filter
      if (notifSearch.trim()) {
        const query = notifSearch.toLowerCase();
        const matchTitle = (n.title || '').toLowerCase().includes(query);
        const matchMsg = (n.message || '').toLowerCase().includes(query);
        const matchSender = (n.senderName || '').toLowerCase().includes(query);
        if (!matchTitle && !matchMsg && !matchSender) return false;
      }

      // 2. Tab filter
      if (notifFilter === 'UNREAD') return !n.isRead;
      if (notifFilter === 'APPROVAL') {
        return n.type === 'TASK_APPROVAL_REQUEST' || n.type === 'DOC_SIGN_REQUEST';
      }
      if (notifFilter === 'ASSIGNMENT') {
        return (
          n.type === 'NEW_TASK' ||
          n.type === 'TASK_ASSIGNED' ||
          n.type === 'DOC_ASSIGNED' ||
          n.type === 'DOC_INCOMING'
        );
      }
      if (notifFilter === 'COMPLETED') {
        return n.type === 'TASK_APPROVED' || n.type === 'DOC_SIGNED' || n.type === 'DOC_ISSUED';
      }
      return true;
    });
  }, [notifications, notifSearch, notifFilter]);

  const handleNudge = (task: Task) => {
    if (!canNudge && !isClerkUser) return;
    const assignee = getUser(task.assigneeId);
    const deadlineStr = new Date(task.dueDate).toLocaleDateString('vi-VN');
    const msg = isClerkUser
      ? `Bộ phận Văn thư gửi thông báo nhắc hạn xử lý văn bản/công việc "${task.title}" (Hạn chót: ${deadlineStr}). Đề nghị cán bộ khẩn trương hoàn thiện để vào sổ phát hành.`
      : `${currentUser.fullName} (${currentUser.position || 'Lãnh đạo đơn vị'}) nhắc nhở đôn đốc đẩy nhanh tiến độ công việc "${task.title}", hạn hoàn thành: ${deadlineStr}`;

    onCreateNotification(
      isClerkUser ? `Nhắc hạn văn bản: ${task.code}` : `Đôn đốc tiến độ: ${task.code}`,
      msg,
      task.assigneeId
    );
    setNudgedIds((prev) => [...prev, task.id]);
    setTimeout(() => {
      setNudgedIds((prev) => prev.filter((id) => id !== task.id));
    }, 4000);
  };

  return (
    <div className="w-full p-6 md:p-8 flex flex-col gap-6 flex-1">
      {/* Header and Scope Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {isStaffUser ? 'Nhắc Việc & Hạn Chót Của Tôi' : 'Trung Tâm Nhắc Việc & Cảnh Báo Trễ Hạn'}
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isStaffUser
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              {isStaffUser ? 'Dành riêng cho Chuyên viên' : 'Điều hành & Đôn đốc'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStaffUser
              ? `Tự động theo dõi các nhiệm vụ, văn bản được phân công trực tiếp cho đồng chí ${currentUser.fullName}.`
              : 'Tự động phân loại công việc quá hạn, việc đến hạn và phát hành thông báo đôn đốc cán bộ chuyên viên.'}
          </p>
        </div>

        {/* Scope switcher for Leaders */}
        {isLeader && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold self-start sm:self-auto">
            <span className="text-[10px] text-slate-500 font-bold px-2 uppercase">Phạm vi:</span>
            <button
              onClick={() => setLeaderScope('ALL')}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                leaderScope === 'ALL'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toàn cơ quan ({tasks.length})
            </button>
            <button
              onClick={() => setLeaderScope('MY')}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                leaderScope === 'MY'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tôi chỉ đạo / giao việc
            </button>
          </div>
        )}
      </div>

      {/* Staff Reassurance Banner */}
      {isStaffUser && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>
              Tài khoản đang đăng nhập: <strong>{currentUser.fullName}</strong> ({currentUser.position || 'Chuyên viên'} - {currentUser.department || 'Đơn vị'}) &bull; Hệ thống chỉ lọc và hiển thị công việc thuộc thẩm quyền của bạn.
            </span>
          </div>
        </div>
      )}

      {/* Main Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveMainTab('REMINDERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'REMINDERS'
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Nhiệm Vụ & Hạn Chót</span>
            {overdueTasks.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {overdueTasks.length} quá hạn
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMainTab('NOTIFICATIONS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'NOTIFICATIONS'
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>Lịch Sử Thông Báo & Điều Hành</span>
            {unreadCount > 0 ? (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {unreadCount} mới
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        {/* Global actions when in Notifications tab */}
        {activeMainTab === 'NOTIFICATIONS' && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Đánh dấu tất cả đã đọc</span>
              </button>
            )}
            {notifications.length > 0 && onClearAllNotifications && (
              <button
                onClick={() => {
                  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử thông báo?')) {
                    onClearAllNotifications();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa tất cả</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: NOTIFICATIONS HISTORY */}
      {activeMainTab === 'NOTIFICATIONS' && (
        <div className="flex flex-col gap-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tổng thông báo
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-800">{notifications.length}</span>
                <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-1">
                Chưa đọc
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-rose-600">{unreadCount}</span>
                <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
                Ký duyệt & Nghiệm thu
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-purple-700">{approvalNotifsCount}</span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                Đã duyệt & Phát hành
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-emerald-700">{completedNotifsCount}</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/90 w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={notifSearch}
                onChange={(e) => setNotifSearch(e.target.value)}
                placeholder="Tìm tiêu đề, nội dung, người gửi..."
                className="bg-transparent text-xs outline-none w-full text-slate-700 placeholder-slate-400"
              />
              {notifSearch && (
                <button onClick={() => setNotifSearch('')} className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1">
                  ×
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
              <button
                onClick={() => setNotifFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  notifFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                onClick={() => setNotifFilter('UNREAD')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  notifFilter === 'UNREAD'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
              <button
                onClick={() => setNotifFilter('APPROVAL')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  notifFilter === 'APPROVAL'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Trình duyệt & Ký số ({approvalNotifsCount})
              </button>
              <button
                onClick={() => setNotifFilter('ASSIGNMENT')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  notifFilter === 'ASSIGNMENT'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Giao việc & Chỉ đạo ({assignedNotifsCount})
              </button>
              <button
                onClick={() => setNotifFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  notifFilter === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đã duyệt & Phát hành ({completedNotifsCount})
              </button>
            </div>
          </div>

          {/* Notification History Cards */}
          <div className="space-y-3">
            {filteredNotificationList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-3">
                <Bell className="w-10 h-10 text-slate-300" />
                <h3 className="font-bold text-sm text-slate-700">Không có thông báo nào phù hợp</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {notifSearch ? 'Không tìm thấy thông báo khớp với từ khóa tìm kiếm.' : 'Hộp thư thông báo của bạn hiện đang trống.'}
                </p>
              </div>
            ) : (
              filteredNotificationList.map((n) => {
                const timeInfo = formatNotificationDateTime(n.createdAt);

                // Type details
                let iconNode = <Bell className="w-5 h-5 text-indigo-600" />;
                let iconBg = 'bg-indigo-50 border-indigo-100';
                let typeBadge = 'Thông báo hệ thống';
                let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

                if (n.type === 'TASK_APPROVAL_REQUEST') {
                  iconNode = <Award className="w-5 h-5 text-purple-600" />;
                  iconBg = 'bg-purple-50 border-purple-200';
                  typeBadge = 'Trình nghiệm thu nhiệm vụ';
                  badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
                } else if (n.type === 'DOC_SIGN_REQUEST') {
                  iconNode = <FileSignature className="w-5 h-5 text-violet-600" />;
                  iconBg = 'bg-violet-50 border-violet-200';
                  typeBadge = 'Trình ký duyệt văn bản đi';
                  badgeColor = 'bg-violet-100 text-violet-800 border-violet-200';
                } else if (n.type === 'DOC_SIGNED') {
                  iconNode = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
                  iconBg = 'bg-emerald-50 border-emerald-200';
                  typeBadge = 'Lãnh đạo đã ký số duyệt';
                  badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                } else if (n.type === 'TASK_APPROVED') {
                  iconNode = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
                  iconBg = 'bg-emerald-50 border-emerald-200';
                  typeBadge = 'Đã nghiệm thu hoàn thành';
                  badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                } else if (n.type === 'DOC_ISSUED') {
                  iconNode = <Send className="w-5 h-5 text-blue-600" />;
                  iconBg = 'bg-blue-50 border-blue-200';
                  typeBadge = 'Văn bản đã phát hành';
                  badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                } else if (n.type === 'NEW_TASK' || n.type === 'TASK_ASSIGNED') {
                  iconNode = <FileText className="w-5 h-5 text-indigo-600" />;
                  iconBg = 'bg-indigo-50 border-indigo-200';
                  typeBadge = 'Giao nhiệm vụ mới';
                  badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                } else if (n.type === 'DOC_ASSIGNED' || n.type === 'DOC_INCOMING') {
                  iconNode = <FileText className="w-5 h-5 text-sky-600" />;
                  iconBg = 'bg-sky-50 border-sky-200';
                  typeBadge = 'Văn bản đến';
                  badgeColor = 'bg-sky-100 text-sky-800 border-sky-200';
                } else if (n.type === 'TASK_REJECTED') {
                  iconNode = <AlertTriangle className="w-5 h-5 text-rose-600" />;
                  iconBg = 'bg-rose-50 border-rose-200';
                  typeBadge = 'Yêu cầu hoàn thiện lại';
                  badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                } else if (n.type === 'OVERDUE') {
                  iconNode = <AlertTriangle className="w-5 h-5 text-rose-600" />;
                  iconBg = 'bg-rose-50 border-rose-200';
                  typeBadge = 'Đôn đốc quá hạn';
                  badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                } else if (n.type === 'DEADLINE_TODAY') {
                  iconNode = <Clock className="w-5 h-5 text-amber-600" />;
                  iconBg = 'bg-amber-50 border-amber-200';
                  typeBadge = 'Đến hạn trong ngày';
                  badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                } else if (n.type === 'TASK_COMMENT') {
                  iconNode = <MessageSquare className="w-5 h-5 text-emerald-600" />;
                  iconBg = 'bg-emerald-50 border-emerald-200';
                  typeBadge = 'Ý kiến trao đổi nhiệm vụ';
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                }

                return (
                  <div
                    key={n.id}
                    className={`bg-white rounded-2xl border p-5 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                      !n.isRead ? 'border-indigo-300 ring-2 ring-indigo-50 bg-indigo-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                        {iconNode}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header Badges with Exact Date & Time */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {typeBadge}
                          </span>

                          {!n.isRead ? (
                            <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                              Chưa đọc
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                              Đã đọc
                            </span>
                          )}

                          {/* EXACT DATE AND TIME DISPLAY */}
                          <div
                            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-slate-200/80 ml-auto md:ml-0"
                            title={timeInfo.full}
                          >
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{timeInfo.date}</span>
                            <span className="text-slate-300">&bull;</span>
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{timeInfo.time}</span>
                            <span className="text-slate-400 font-normal">({timeInfo.relative})</span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className={`text-sm leading-snug ${!n.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                          {n.title}
                        </h3>

                        {/* Message */}
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                          {n.message}
                        </p>

                        {/* Sender info */}
                        {n.senderName && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                            <span className="font-semibold text-slate-700">Người gửi:</span>
                            <span className="font-bold text-indigo-700">{n.senderName}</span>
                            {n.senderRole && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                                {n.senderRole}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                      {n.linkType && n.targetId && (
                        <button
                          onClick={() => {
                            if (onMarkNotificationAsRead && !n.isRead) onMarkNotificationAsRead(n.id);
                            if (onNavigateToTarget) {
                              const subTarget =
                                n.subTarget ||
                                (n.type === 'TASK_COMMENT'
                                  ? 'COMMENTS'
                                  : n.type === 'TASK_APPROVAL_REQUEST'
                                  ? 'APPROVAL'
                                  : undefined);
                              onNavigateToTarget(n.linkType, n.targetId, subTarget);
                            } else if (n.linkType === 'TASK') {
                              onOpenTaskDetail(n.targetId);
                            } else if (n.linkType === 'INCOMING_DOC') {
                              onOpenIncomingDocDetail(n.targetId);
                            } else if (n.linkType === 'OUTGOING_DOC' && onOpenOutgoingDocDetail) {
                              onOpenOutgoingDocDetail(n.targetId);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          <span>Mở xem chi tiết</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="flex items-center gap-1.5">
                        {!n.isRead && onMarkNotificationAsRead && (
                          <button
                            onClick={() => onMarkNotificationAsRead(n.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Đánh dấu là đã đọc"
                          >
                            <Check className="w-3 h-3" />
                            <span>Đã đọc</span>
                          </button>
                        )}

                        {onDeleteNotification && (
                          <button
                            onClick={() => onDeleteNotification(n.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa thông báo này khỏi lịch sử"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REMINDERS & DEADLINES GRID */}
      {activeMainTab === 'REMINDERS' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Quá hạn (Overdue Tasks) */}
        <div className="bg-white rounded-2xl border border-rose-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-100 mb-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-bold text-sm text-slate-800">
                {isStaffUser ? 'Nhiệm vụ của bạn quá hạn' : 'Công việc quá hạn xử lý'} ({overdueTasks.length})
              </h2>
            </div>
            <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full">
              Khẩn cấp
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 custom-scrollbar">
            {overdueTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                {isStaffUser
                  ? 'Tuyệt vời! Bạn không có công việc nào bị quá hạn.'
                  : 'Không có công việc nào bị quá hạn. Rất tốt!'}
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
                        {isStaffUser ? (
                          <span>Tiến độ hiện tại: <strong>{t.progress}%</strong></span>
                        ) : (
                          <span>Phụ trách: <strong>{assignee?.fullName || 'Chưa giao'}</strong> ({assignee?.role || 'Chuyên viên'})</span>
                        )}
                      </div>
                    </div>

                    {isStaffUser ? (
                      <button
                        onClick={() => onOpenTaskDetail(t.id)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs cursor-pointer transition-all"
                      >
                        Báo cáo ngay
                      </button>
                    ) : canNudge ? (
                      <button
                        onClick={() => handleNudge(t)}
                        disabled={isNudged}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                          isNudged
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                        }`}
                        title="Đôn đốc cán bộ đẩy nhanh tiến độ"
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
                    ) : isClerkUser ? (
                      <button
                        onClick={() => handleNudge(t)}
                        disabled={isNudged}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                          isNudged
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                        }`}
                        title="Văn thư gửi thông báo nhắc hạn"
                      >
                        {isNudged ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đã nhắc hạn</span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-3.5 h-3.5" />
                            <span>Nhắc hạn VB</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                        Quá hạn
                      </span>
                    )}
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
                {isStaffUser ? 'Nhiệm vụ của bạn đến hạn hôm nay' : 'Nhiệm vụ đến hạn hôm nay'} ({dueTodayTasks.length})
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
                        {isStaffUser ? (
                          <span>Tiến độ: {t.progress}% &bull; Hạn: Hôm nay</span>
                        ) : (
                          <span>Phụ trách: {assignee?.fullName || 'Chưa giao'} | Tiến độ: {t.progress}%</span>
                        )}
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

        {/* Section 3: Sắp đến hạn trong 1-3 ngày tới */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <CheckSquare className="w-5 h-5" />
              <h2 className="font-bold text-sm text-slate-800">
                {isStaffUser ? 'Nhiệm vụ của bạn sắp đến hạn (1-3 ngày)' : 'Sắp đến hạn trong 1-3 ngày tới'} ({dueSoonTasks.length})
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
                        Hạn: <strong>{new Date(t.dueDate).toLocaleDateString('vi-VN')}</strong> | {isStaffUser ? `Tiến độ: ${t.progress}%` : (assignee?.fullName || 'Chưa giao')}
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

        {/* Section 4: For Leader -> Tasks Waiting for Approval; For Staff -> Incoming Docs to handle */}
        {isLeader ? (
          <div className="bg-white rounded-2xl border border-purple-200 shadow-xs p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100 mb-4">
              <div className="flex items-center gap-2 text-purple-700">
                <Award className="w-5 h-5" />
                <h2 className="font-bold text-sm text-slate-800">
                  Chuyên viên trình nghiệm thu ({waitingApprovalTasks.length})
                </h2>
              </div>
              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Chờ Lãnh đạo duyệt
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-80 custom-scrollbar">
              {waitingApprovalTasks.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Hiện không có nhiệm vụ nào đang chờ Lãnh đạo thẩm định nghiệm thu.
                </div>
              ) : (
                waitingApprovalTasks.map((t) => {
                  const assignee = getUser(t.assigneeId);
                  return (
                    <div
                      key={t.id}
                      onClick={() => onOpenTaskDetail(t.id)}
                      className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 flex items-center justify-between cursor-pointer hover:border-purple-400 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[10px] text-purple-700 font-bold block mb-0.5">
                          #{t.code}
                        </span>
                        <h4 className="font-bold text-xs text-slate-800 truncate">{t.title}</h4>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Cán bộ báo cáo: <strong>{assignee?.fullName || 'Chuyên viên'}</strong>
                        </div>
                      </div>
                      <span className="text-[10px] bg-purple-600 text-white font-bold px-2.5 py-1 rounded-lg">
                        Phê duyệt
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-xs p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100 mb-4">
              <div className="flex items-center gap-2 text-blue-600">
                <FileText className="w-5 h-5" />
                <h2 className="font-bold text-sm text-slate-800">
                  {isStaffUser ? 'Văn bản đến đang thụ lý' : 'Văn bản đến chưa phân công'} ({relevantIncomingDocs.length})
                </h2>
              </div>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {isStaffUser ? 'Được giao' : 'Cần giao'}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-80 custom-scrollbar">
              {relevantIncomingDocs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  {isStaffUser
                    ? 'Bạn đã hoàn tất xử lý tất cả văn bản đến được giao.'
                    : 'Tất cả văn bản đến đã được phân công xử lý đầy đủ.'}
                </div>
              ) : (
                relevantIncomingDocs.map((doc) => (
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
                      Xem văn bản
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Section 5: Relevant Outgoing Documents */}
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-xs p-5 flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100 mb-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <FileCheck2 className="w-5 h-5" />
              <h2 className="font-bold text-sm text-slate-800">
                {isStaffUser
                  ? `Văn bản đi / Báo cáo do bạn soạn thảo (${relevantOutgoingDocs.length})`
                  : isClerkUser
                  ? `Văn bản đi chờ Văn thư cấp số & phát hành (${relevantOutgoingDocs.length})`
                  : `Văn bản đi chờ Lãnh đạo thẩm định & ký duyệt (${relevantOutgoingDocs.length})`}
              </h2>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {isStaffUser ? 'Đang thực hiện' : isClerkUser ? 'Khâu Văn thư' : 'Chờ phê duyệt'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto custom-scrollbar">
            {relevantOutgoingDocs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs col-span-2">
                Không có văn bản đi nào cần xử lý tại thời điểm này.
              </div>
            ) : (
              relevantOutgoingDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onOpenOutgoingDocDetail && onOpenOutgoingDocDetail(doc.id)}
                  className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] text-emerald-800 font-bold">
                        {doc.documentNumber || '[Chờ cấp số]'}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                        {doc.status === 'SIGNED' ? 'Lãnh đạo đã ký số' : doc.status === 'REVIEWING' ? 'Đang thẩm định' : 'Dự thảo'}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-800 truncate">{doc.summary || doc.title}</h4>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Nơi nhận: <strong>{doc.recipient}</strong>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg shrink-0 shadow-2xs">
                    Mở xem
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
