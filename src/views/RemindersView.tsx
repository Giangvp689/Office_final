import React, { useState, useMemo } from 'react';
import { Task, IncomingDocument, OutgoingDocument, User } from '../types';
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
} from 'lucide-react';
import { canNudgeOrRemindStaff, canCreateOrAssignTask, isClerk, isLeaderOrAdmin } from '../utils/permission';

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
}) => {
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

      {/* Grid of Reminder Cards */}
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
    </div>
  );
};
