import React, { useState, useEffect } from 'react';
import { SystemNotification } from '../types';
import { Bell, X, ArrowRight, MessageSquare, FileText, CheckSquare, Clock, AlertTriangle } from 'lucide-react';

interface FacebookNotificationToastProps {
  notifications: SystemNotification[];
  onMarkAsRead: (id: string) => void;
  onNavigate: (type: string, id: string) => void;
}

export const FacebookNotificationToast: React.FC<FacebookNotificationToastProps> = ({
  notifications,
  onMarkAsRead,
  onNavigate,
}) => {
  const [activeNotif, setActiveNotif] = useState<SystemNotification | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('vanphong_so_seen_toast_ids');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const recordDismissed = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('vanphong_so_seen_toast_ids', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Show the latest unread notification as a Facebook-style interactive popup
  // If a notification has already been read or dismissed, it will NEVER be shown again
  useEffect(() => {
    const unread = notifications.filter((n) => !n.isRead && !dismissedIds.has(n.id));
    if (unread.length > 0) {
      // Pick the most recent unread
      const latest = unread[0];
      setActiveNotif(latest);
    } else {
      setActiveNotif(null);
    }
  }, [notifications, dismissedIds]);

  if (!activeNotif) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeNotif) {
      recordDismissed(activeNotif.id);
      onMarkAsRead(activeNotif.id);
    }
    setActiveNotif(null);
  };

  const handleClick = () => {
    if (activeNotif) {
      recordDismissed(activeNotif.id);
      onMarkAsRead(activeNotif.id);
      if (activeNotif.linkType && activeNotif.targetId) {
        onNavigate(activeNotif.linkType, activeNotif.targetId);
      }
    }
    setActiveNotif(null);
  };

  const getIcon = () => {
    switch (activeNotif.type) {
      case 'OVERDUE':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'DEADLINE_TODAY':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS_CHANGED':
        return <CheckSquare className="w-5 h-5 text-indigo-600" />;
      case 'TASK_COMMENT':
        return <MessageSquare className="w-5 h-5 text-emerald-600" />;
      case 'DOC_INCOMING':
      case 'DOC_OUTGOING':
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <aside aria-label="Thông báo hệ thống" className="fixed bottom-6 right-6 z-50 max-w-md w-[92vw] sm:w-96 animate-in slide-in-from-bottom-5 duration-300">
      <div
        onClick={handleClick}
        className="bg-white rounded-2xl shadow-2xl border-2 border-indigo-500/30 hover:border-indigo-600 p-4 transition-all duration-200 cursor-pointer hover:shadow-indigo-500/10 group backdrop-blur-sm"
      >
        <div className="flex items-start gap-3">
          {/* Avatar / Icon Badge */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              {getIcon()}
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
          </div>

          {/* Body Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Thông báo mới
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(activeNotif.createdAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
              {activeNotif.title}
            </h4>
            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 font-normal leading-relaxed">
              {activeNotif.message}
            </p>

            <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              <span>Bấm vào để mở xem chi tiết</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
