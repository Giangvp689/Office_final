import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Check, Clock, AlertTriangle, ChevronDown, LogOut, KeyRound, Sparkles } from 'lucide-react';
import { User, SystemNotification } from '../types';

interface HeaderProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser?: (userId: string) => void;
  onLogout: () => void;
  onOpenChangePassword: () => void;
  notifications: SystemNotification[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectNotificationTarget: (type?: string, id?: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onLogout,
  onOpenChangePassword,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllAsRead,
  onSelectNotificationTarget,
  searchQuery,
  onSearchChange,
}) => {
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter((n) => !n.isRead);

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
            <div className="absolute right-0 mt-2 w-84 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Thông Báo & Nhắc Hạn</h4>
                  <span className="text-[10px] text-slate-400">{unreadNotifs.length} chưa đọc</span>
                </div>
                {unreadNotifs.length > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" /> Đọc tất cả
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">Không có thông báo mới</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        onMarkNotificationAsRead(n.id);
                        if (n.linkType && n.targetId) {
                          onSelectNotificationTarget(n.linkType, n.targetId);
                          setShowNotifPanel(false);
                        }
                      }}
                      className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="shrink-0 mt-0.5">
                          {n.type === 'OVERDUE' ? (
                            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          ) : n.type === 'DEADLINE_TODAY' ? (
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                              <Clock className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                              <Bell className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug ${!n.isRead ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1"></span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role & User Switcher / Real User Menu */}
        <div className="relative" ref={userRef}>
          <button
            id="btn-user-profile-menu"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.fullName}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div className="flex flex-col text-left hidden md:block">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">{currentUser.fullName}</span>
              <span className="text-[10px] text-indigo-600 font-semibold">{currentUser.username || currentUser.email.split('@')[0]}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Account Info Header */}
              <div className="p-4 bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <img src={currentUser.avatar} alt={currentUser.fullName} className="w-11 h-11 rounded-full object-cover border-2 border-indigo-400/40" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{currentUser.fullName}</p>
                    <p className="text-xs text-slate-300 truncate">@{currentUser.username || currentUser.email.split('@')[0]}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 uppercase">
                        {currentUser.role}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Phòng ban:</span>
                  <span className="text-slate-200 font-medium truncate max-w-[170px]">{currentUser.department || 'Chưa cập nhật'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2 divide-y divide-slate-100">
                <div className="py-1">
                  <button
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

                {/* Switch to another account if in fast test mode */}
                {onSwitchUser && (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Chuyển nhanh tài khoản</span>
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    </div>
                    <div className="max-h-36 overflow-y-auto mt-1 space-y-0.5">
                      {allUsers.map((u) => {
                        const isCurrent = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u.id);
                              setShowUserDropdown(false);
                            }}
                            className={`w-full px-3 py-1.5 flex items-center justify-between text-left rounded-lg text-xs hover:bg-slate-100 transition-colors cursor-pointer ${
                              isCurrent ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-700'
                            }`}
                          >
                            <span className="truncate">{u.fullName}</span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">({u.username || u.email.split('@')[0]})</span>
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
