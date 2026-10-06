import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Check,
  Clock,
  AlertTriangle,
  ChevronDown,
  LogOut,
  KeyRound,
  Sparkles,
  RefreshCw,
  Database,
  Shield,
  ShieldAlert,
  ArrowLeft,
  UserCircle2,
  Trash2,
  FileSignature,
  Award,
  Send,
  FileText,
  CheckCircle2,
  MessageSquare,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { User, SystemNotification } from '../types';
import { db } from '../services/db';
import { canReloadDatabase } from '../utils/permission';
import { formatNotificationDateTime } from '../utils/dateUtils';

interface HeaderProps {
  currentUser: User;
  allUsers: User[];
  canSwitchUser?: boolean;
  isImpersonating?: boolean;
  adminOriginUser?: User | null;
  onSwitchUser?: (userId: string) => void;
  onReturnToAdmin?: () => void;
  onLogout: () => void;
  onOpenUserProfile?: () => void;
  onOpenChangePassword: () => void;
  onOpenDatabaseCenter?: () => void;
  notifications: SystemNotification[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification?: (id: string) => void;
  onOpenNotificationHistory?: () => void;
  onSelectNotificationTarget: (type?: string, id?: string, subTarget?: 'COMMENTS' | 'DETAILS' | 'APPROVAL') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  canSwitchUser = false,
  isImpersonating = false,
  adminOriginUser = null,
  onSwitchUser,
  onReturnToAdmin,
  onLogout,
  onOpenUserProfile,
  onOpenChangePassword,
  onOpenDatabaseCenter,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onOpenNotificationHistory,
  onSelectNotificationTarget,
  searchQuery,
  onSearchChange,
}) => {
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifFilterTab, setNotifFilterTab] = useState<'ALL' | 'UNREAD' | 'ACTION'>('ALL');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter((n) => !n.isRead);

  const filteredNotifs = notifications.filter((n) => {
    if (notifFilterTab === 'UNREAD') return !n.isRead;
    if (notifFilterTab === 'ACTION') {
      return (
        n.type === 'TASK_APPROVAL_REQUEST' ||
        n.type === 'DOC_SIGN_REQUEST' ||
        n.type === 'DOC_SIGNED' ||
        n.type === 'TASK_ASSIGNED' ||
        n.type === 'NEW_TASK'
      );
    }
    return true;
  });

  const handleSyncDb = async () => {
    setIsSyncing(true);
    try {
      const res = await db.reloadFromDatabase();
      setSyncToast(res.message || 'Đã làm mới dữ liệu từ CSDL thành công!');
      setTimeout(() => setSyncToast(null), 3000);
    } catch (e: any) {
      setSyncToast('Lỗi nạp dữ liệu: ' + (e.message || e));
      setTimeout(() => setSyncToast(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifPanel(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const todayStr = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date());

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
      {/* Search Input Bar */}
      <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200/90 w-96 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          id="global-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm nhanh mã hồ sơ, số văn bản, công việc, nhân sự..."
          className="bg-transparent border-none text-xs outline-none w-full text-slate-700 placeholder-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-1 font-bold"
          >
            ×
          </button>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* DB Sync indicator & button (Chỉ dành riêng cho Lãnh đạo hoặc Quản trị viên) */}
        {canReloadDatabase(currentUser) && (
          <div className="relative flex items-center gap-1.5">
            <button
              onClick={handleSyncDb}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isSyncing
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800'
              }`}
              title="Nhấn để tải lại toàn bộ dữ liệu mới nhất từ CSDL"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-600' : 'text-emerald-700'}`} />
              <span className="hidden lg:inline">{isSyncing ? 'Đang nạp CSDL...' : 'Lấy dữ liệu từ CSDL'}</span>
            </button>

            {onOpenDatabaseCenter && (
              <button
                onClick={onOpenDatabaseCenter}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                title="Mở bảng điều khiển CSDL Firebase & MySQL, cấu hình và sao lưu"
              >
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden xl:inline">Quản Lý CSDL</span>
              </button>
            )}

            {syncToast && (
              <div className="absolute top-10 right-0 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-2">
                {syncToast}
              </div>
            )}
          </div>
        )}

        {/* Date indicator */}
        <div className="hidden sm:flex items-center gap-2 bg-indigo-50/80 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-indigo-100">
          <Clock className="w-3.5 h-3.5" />
          <span className="capitalize">{todayStr}</span>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications"
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Thông báo & Nhắc việc"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifPanel && (
            <div className="absolute right-0 mt-2 w-96 sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hộp Thư Thông Báo</h4>
                    {unreadNotifs.length > 0 && (
                      <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                        {unreadNotifs.length} mới
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">Điều hành công việc & theo dõi văn bản</span>
                </div>
                {unreadNotifs.length > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                    title="Đánh dấu tất cả thông báo là đã đọc"
                  >
                    <Check className="w-3.5 h-3.5" /> Đọc tất cả
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-slate-100 text-xs">
                <button
                  onClick={() => setNotifFilterTab('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                    notifFilterTab === 'ALL'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({notifications.length})
                </button>
                <button
                  onClick={() => setNotifFilterTab('UNREAD')}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                    notifFilterTab === 'UNREAD'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Chưa đọc ({unreadNotifs.length})
                </button>
                <button
                  onClick={() => setNotifFilterTab('ACTION')}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                    notifFilterTab === 'ACTION'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Trình duyệt & Ký số
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                {filteredNotifs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <Bell className="w-8 h-8 text-slate-300 stroke-1" />
                    <span>Không có thông báo nào trong mục này</span>
                  </div>
                ) : (
                  filteredNotifs.map((n) => {
                    const timeInfo = formatNotificationDateTime(n.createdAt);
                    
                    // Icon and color badge mapping
                    let iconNode = <Bell className="w-4 h-4 text-indigo-600" />;
                    let iconBg = 'bg-indigo-50 border-indigo-100';
                    let typeBadge = 'Thông báo';
                    let badgeColor = 'bg-slate-100 text-slate-700';

                    if (n.type === 'TASK_APPROVAL_REQUEST') {
                      iconNode = <Award className="w-4 h-4 text-purple-600" />;
                      iconBg = 'bg-purple-50 border-purple-200';
                      typeBadge = 'Trình nghiệm thu';
                      badgeColor = 'bg-purple-100 text-purple-800';
                    } else if (n.type === 'DOC_SIGN_REQUEST') {
                      iconNode = <FileSignature className="w-4 h-4 text-violet-600" />;
                      iconBg = 'bg-violet-50 border-violet-200';
                      typeBadge = 'Trình ký duyệt';
                      badgeColor = 'bg-violet-100 text-violet-800';
                    } else if (n.type === 'DOC_SIGNED') {
                      iconNode = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                      iconBg = 'bg-emerald-50 border-emerald-200';
                      typeBadge = 'Lãnh đạo đã ký';
                      badgeColor = 'bg-emerald-100 text-emerald-800';
                    } else if (n.type === 'TASK_APPROVED') {
                      iconNode = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                      iconBg = 'bg-emerald-50 border-emerald-200';
                      typeBadge = 'Đã nghiệm thu';
                      badgeColor = 'bg-emerald-100 text-emerald-800';
                    } else if (n.type === 'DOC_ISSUED') {
                      iconNode = <Send className="w-4 h-4 text-blue-600" />;
                      iconBg = 'bg-blue-50 border-blue-200';
                      typeBadge = 'Đã phát hành';
                      badgeColor = 'bg-blue-100 text-blue-800';
                    } else if (n.type === 'NEW_TASK' || n.type === 'TASK_ASSIGNED') {
                      iconNode = <FileText className="w-4 h-4 text-indigo-600" />;
                      iconBg = 'bg-indigo-50 border-indigo-200';
                      typeBadge = 'Giao nhiệm vụ';
                      badgeColor = 'bg-indigo-100 text-indigo-800';
                    } else if (n.type === 'DOC_ASSIGNED' || n.type === 'DOC_INCOMING') {
                      iconNode = <FileText className="w-4 h-4 text-sky-600" />;
                      iconBg = 'bg-sky-50 border-sky-200';
                      typeBadge = 'Văn bản đến';
                      badgeColor = 'bg-sky-100 text-sky-800';
                    } else if (n.type === 'OVERDUE' || n.type === 'TASK_REJECTED') {
                      iconNode = <AlertTriangle className="w-4 h-4 text-rose-600" />;
                      iconBg = 'bg-rose-50 border-rose-200';
                      typeBadge = n.type === 'TASK_REJECTED' ? 'Yêu cầu làm lại' : 'Quá hạn';
                      badgeColor = 'bg-rose-100 text-rose-800';
                    } else if (n.type === 'DEADLINE_TODAY') {
                      iconNode = <Clock className="w-4 h-4 text-amber-600" />;
                      iconBg = 'bg-amber-50 border-amber-200';
                      typeBadge = 'Hạn hôm nay';
                      badgeColor = 'bg-amber-100 text-amber-800';
                    } else if (n.type === 'TASK_COMMENT') {
                      iconNode = <MessageSquare className="w-4 h-4 text-emerald-600" />;
                      iconBg = 'bg-emerald-50 border-emerald-200';
                      typeBadge = 'Ý kiến trao đổi';
                      badgeColor = 'bg-emerald-50 text-emerald-700';
                    }

                    return (
                      <div
                        key={n.id}
                        className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors relative group ${
                          !n.isRead ? 'bg-indigo-50/40' : ''
                        }`}
                        onClick={() => {
                          onMarkNotificationAsRead(n.id);
                          if (n.linkType && n.targetId) {
                            const subTarget =
                              n.subTarget ||
                              (n.type === 'TASK_COMMENT'
                                ? 'COMMENTS'
                                : n.type === 'TASK_APPROVAL_REQUEST'
                                ? 'APPROVAL'
                                : undefined);
                            onSelectNotificationTarget(n.linkType, n.targetId, subTarget);
                            setShowNotifPanel(false);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                            {iconNode}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${badgeColor}`}>
                                {typeBadge}
                              </span>
                              
                              {/* Date and Time badge */}
                              <span
                                className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 shrink-0"
                                title={timeInfo.full}
                              >
                                <Clock className="w-3 h-3 text-slate-400" />
                                {timeInfo.display}
                              </span>
                            </div>

                            <p className={`text-xs leading-snug line-clamp-2 ${!n.isRead ? 'font-bold text-slate-900' : 'text-slate-700 font-medium'}`}>
                              {n.title}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {n.message}
                            </p>

                            {/* Sender Info */}
                            {n.senderName && (
                              <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                <span className="font-semibold text-slate-600">Từ:</span> {n.senderName}
                                {n.senderRole && <span className="text-slate-400">({n.senderRole})</span>}
                              </div>
                            )}
                          </div>

                          {/* Actions on hover & Unread dot */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1 shadow-2xs"></span>
                            )}
                            {onDeleteNotification && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteNotification(n.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                title="Xóa thông báo này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer with link to full history view */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                {onOpenNotificationHistory ? (
                  <button
                    onClick={() => {
                      setShowNotifPanel(false);
                      onOpenNotificationHistory();
                    }}
                    className="w-full py-1.5 text-center text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center justify-center gap-1.5 hover:bg-indigo-50/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Xem toàn bộ Lịch Sử Thông Báo & Điều Hành</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 px-2">Đã lưu trữ {notifications.length} thông báo</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Impersonation Indicator for Admin / Leader */}
        {isImpersonating && onReturnToAdmin && (
          <button
            onClick={onReturnToAdmin}
            id="btn-return-admin-header"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer animate-pulse"
            title={`Nhấp để quay lại tài khoản ${adminOriginUser?.role === 'LEADER' ? 'Lãnh đạo' : 'Quản trị viên'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại {adminOriginUser?.role === 'LEADER' ? 'Lãnh đạo' : 'Admin'}</span>
          </button>
        )}

        {/* Role & User Switcher / Real User Menu */}
        <div className="relative" ref={userRef}>
          <button
            id="btn-user-profile-menu"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              isImpersonating
                ? 'border-amber-400 bg-amber-50/70 hover:bg-amber-100/80'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser?.fullName || 'User'}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div className="flex flex-col text-left hidden md:block">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">{currentUser?.fullName || 'User'}</span>
              <span className="text-[10px] text-indigo-600 font-semibold">{currentUser?.username || currentUser?.email?.split('@')[0] || 'account'}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Impersonation Notice banner in dropdown */}
              {isImpersonating && onReturnToAdmin && (
                <div className="p-3 bg-amber-500 text-white flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span className="font-bold truncate">Đang ủy quyền Quản trị viên</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onReturnToAdmin();
                    }}
                    className="px-2.5 py-1 bg-white text-amber-900 font-bold rounded-lg text-[11px] hover:bg-amber-50 transition-colors shrink-0 shadow-xs cursor-pointer"
                  >
                    Về Admin
                  </button>
                </div>
              )}

              {/* Account Info Header */}
              <div className="p-4 bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <img src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={currentUser?.fullName || 'User'} className="w-11 h-11 rounded-full object-cover border-2 border-indigo-400/40" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{currentUser?.fullName || 'User'}</p>
                    <p className="text-xs text-slate-300 truncate">@{currentUser?.username || currentUser?.email?.split('@')[0] || 'account'}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 uppercase">
                        {currentUser?.role || 'STAFF'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Phòng ban:</span>
                  <span className="text-slate-200 font-medium truncate max-w-[170px]">{currentUser?.department || 'Chưa cập nhật'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2 divide-y divide-slate-100">
                <div className="py-1 space-y-0.5">
                  <button
                    id="btn-open-user-profile-header"
                    onClick={() => {
                      onOpenUserProfile?.();
                      setShowUserDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <UserCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Thông tin cá nhân & Giới thiệu</span>
                  </button>

                  <button
                    id="btn-open-change-password-header"
                    onClick={() => {
                      onOpenChangePassword();
                      setShowUserDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    <span>Đổi mật khẩu tài khoản</span>
                  </button>
                </div>

                {/* Account Switching for ADMIN, LEADER, or active impersonator */}
                {canSwitchUser && onSwitchUser && (
                  <div className="py-1 bg-slate-50/60 rounded-xl p-2 my-1 border border-slate-100">
                    <div className="px-1 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-indigo-600" />
                        <span>Chuyển quyền tài khoản kiểm tra</span>
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto mt-1 space-y-0.5 custom-scrollbar">
                      {allUsers.map((u) => {
                        const isCurrent = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u.id);
                              setShowUserDropdown(false);
                            }}
                            className={`w-full px-2.5 py-1.5 flex items-center justify-between text-left rounded-lg text-xs hover:bg-white hover:shadow-xs transition-all cursor-pointer ${
                              isCurrent ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-700'
                            }`}
                          >
                            <span className="truncate">{u?.fullName || 'Người dùng'}</span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">({u?.role})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Logout Button */}
                <div className="pt-2 pb-1">
                  <button
                    id="btn-logout-confirm"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Đăng xuất khỏi hệ thống</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
