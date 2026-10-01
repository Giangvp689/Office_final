import React, { useState, useMemo } from 'react';
import { Task, IncomingDocument, User } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckSquare,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  CalendarDays,
  ListTodo,
  ArrowRight,
  User as UserIcon,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  incomingDocs: IncomingDocument[];
  users: User[];
  currentUser: User;
  onOpenTaskDetail: (id: string) => void;
  onOpenIncomingDocDetail: (id: string) => void;
}

type ScheduleTab = 'ALL' | 'IN_PROGRESS' | 'UPCOMING' | 'COMPLETED' | 'OVERDUE';
type ViewMode = 'CALENDAR' | 'LIST';

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  incomingDocs,
  users,
  currentUser,
  onOpenTaskDetail,
  onOpenIncomingDocDetail,
}) => {
  const isLeaderOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'LEADER';
  const isClerkRole = currentUser?.role === 'CLERK';
  const canToggleScope = isLeaderOrAdmin || isClerkRole;

  // Scope filter: Leaders and Clerks can toggle between personal vs agency-wide
  const [scope, setScope] = useState<'MY' | 'ALL'>(canToggleScope ? 'ALL' : 'MY');
  const [activeStatusTab, setActiveStatusTab] = useState<ScheduleTab>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('CALENDAR');
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 0 is Sunday in JS, convert to Monday-first (0=Mon...6=Sun)
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to normalize dates (e.g. migrate legacy 2025 dates to active calendar year if needed)
  const normalizeDateStr = (dateStr?: string): string => {
    if (!dateStr) return '';
    // If year in data is 2025 and we are viewing 2026, align month/day
    if (dateStr.startsWith('2025-')) {
      return dateStr.replace('2025-', `${year}-`);
    }
    return dateStr.split('T')[0];
  };

  // 1. Filter items based on user RBAC scope
  const scopedTasks = useMemo(() => {
    if (scope === 'ALL' && canToggleScope) {
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
  }, [tasks, scope, canToggleScope, currentUser?.id]);

  const scopedDocs = useMemo(() => {
    if (scope === 'ALL' && canToggleScope) {
      return incomingDocs;
    }
    if (!currentUser) return incomingDocs;
    return incomingDocs.filter(
      (d) =>
        d.assigneeId === currentUser?.id ||
        d.coAssigneeIds?.includes(currentUser?.id || '') ||
        d.createdById === currentUser?.id
    );
  }, [incomingDocs, scope, canToggleScope, currentUser?.id]);

  // 2. Helper to classify status category
  const getItemStatusCategory = (
    dueDate?: string,
    status?: string
  ): 'COMPLETED' | 'OVERDUE' | 'IN_PROGRESS' | 'UPCOMING' => {
    if (status === 'COMPLETED' || status === 'SIGNED' || status === 'ISSUED') {
      return 'COMPLETED';
    }
    const normDue = normalizeDateStr(dueDate);
    if (status === 'OVERDUE' || (normDue && normDue < todayStr)) {
      return 'OVERDUE';
    }
    if (
      status === 'IN_PROGRESS' ||
      status === 'PROCESSING' ||
      status === 'WAITING_APPROVAL' ||
      (normDue && normDue === todayStr)
    ) {
      return 'IN_PROGRESS';
    }
    return 'UPCOMING';
  };

  // 3. Statistics counters
  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let upcoming = 0;
    let overdue = 0;

    scopedTasks.forEach((t) => {
      const cat = getItemStatusCategory(t.dueDate, t.status);
      if (cat === 'COMPLETED') completed++;
      else if (cat === 'OVERDUE') overdue++;
      else if (cat === 'IN_PROGRESS') inProgress++;
      else upcoming++;
    });

    scopedDocs.forEach((d) => {
      const cat = getItemStatusCategory(d.dueDate, d.status);
      if (cat === 'COMPLETED') completed++;
      else if (cat === 'OVERDUE') overdue++;
      else if (cat === 'IN_PROGRESS') inProgress++;
      else upcoming++;
    });

    return {
      total: scopedTasks.length + scopedDocs.length,
      completed,
      inProgress,
      upcoming,
      overdue,
    };
  }, [scopedTasks, scopedDocs, todayStr, year]);

  // 4. Color & Badge Styling Maps
  const getEventStyle = (dueDate?: string, status?: string) => {
    const cat = getItemStatusCategory(dueDate, status);
    switch (cat) {
      case 'COMPLETED':
        return {
          cardBg: 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border-emerald-200 border-l-[3px] border-l-emerald-600',
          dotBg: 'bg-emerald-500',
          badgeText: 'Đã hoàn thành',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          iconColor: 'text-emerald-600',
        };
      case 'OVERDUE':
        return {
          cardBg: 'bg-rose-50 hover:bg-rose-100/90 text-rose-900 border-rose-300 border-l-[3px] border-l-rose-600 font-semibold',
          dotBg: 'bg-rose-500 animate-pulse',
          badgeText: 'Quá hạn / Gấp',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
          iconColor: 'text-rose-600',
        };
      case 'IN_PROGRESS':
        return {
          cardBg: 'bg-blue-50 hover:bg-blue-100/90 text-blue-900 border-blue-200 border-l-[3px] border-l-blue-600 font-medium',
          dotBg: 'bg-blue-500',
          badgeText: 'Đang thực hiện',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 font-semibold',
          iconColor: 'text-blue-600',
        };
      case 'UPCOMING':
      default:
        return {
          cardBg: 'bg-purple-50 hover:bg-purple-100/90 text-purple-900 border-purple-200 border-l-[3px] border-l-purple-600 font-medium',
          dotBg: 'bg-purple-500',
          badgeText: 'Sắp tới',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          iconColor: 'text-purple-600',
        };
    }
  };

  const monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];

  const daysOfWeek = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

  // List view categorized items
  const categorizedList = useMemo(() => {
    const list: {
      type: 'TASK' | 'DOC';
      id: string;
      title: string;
      code?: string;
      dueDate: string;
      status: string;
      category: 'COMPLETED' | 'OVERDUE' | 'IN_PROGRESS' | 'UPCOMING';
      priority?: string;
      progress?: number;
      assigneeName?: string;
    }[] = [];

    scopedTasks.forEach((t) => {
      const cat = getItemStatusCategory(t.dueDate, t.status);
      if (activeStatusTab === 'ALL' || activeStatusTab === cat) {
        list.push({
          type: 'TASK',
          id: t.id,
          title: t.title,
          code: t.code,
          dueDate: normalizeDateStr(t.dueDate),
          status: t.status,
          category: cat,
          priority: t.priority,
          progress: t.progress,
          assigneeName: users.find((u) => u.id === t.assigneeId)?.fullName,
        });
      }
    });

    scopedDocs.forEach((d) => {
      const cat = getItemStatusCategory(d.dueDate, d.status);
      if (activeStatusTab === 'ALL' || activeStatusTab === cat) {
        list.push({
          type: 'DOC',
          id: d.id,
          title: d.summary,
          code: d.documentNumber,
          dueDate: normalizeDateStr(d.dueDate),
          status: d.status,
          category: cat,
          priority: d.urgency,
          assigneeName: users.find((u) => u.id === d.assigneeId)?.fullName,
        });
      }
    });

    return list.sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));
  }, [scopedTasks, scopedDocs, activeStatusTab, users, year]);

  // Items for the selected day panel
  const selectedDayItems = useMemo(() => {
    if (!selectedDateStr) return [];
    const items: {
      type: 'TASK' | 'DOC';
      id: string;
      title: string;
      code?: string;
      dueDate: string;
      status: string;
      category: 'COMPLETED' | 'OVERDUE' | 'IN_PROGRESS' | 'UPCOMING';
      progress?: number;
      assigneeName?: string;
    }[] = [];

    scopedTasks.forEach((t) => {
      if (normalizeDateStr(t.dueDate) === selectedDateStr) {
        items.push({
          type: 'TASK',
          id: t.id,
          title: t.title,
          code: t.code,
          dueDate: normalizeDateStr(t.dueDate),
          status: t.status,
          category: getItemStatusCategory(t.dueDate, t.status),
          progress: t.progress,
          assigneeName: users.find((u) => u.id === t.assigneeId)?.fullName,
        });
      }
    });

    scopedDocs.forEach((d) => {
      if (normalizeDateStr(d.dueDate) === selectedDateStr) {
        items.push({
          type: 'DOC',
          id: d.id,
          title: d.summary,
          code: d.documentNumber,
          dueDate: normalizeDateStr(d.dueDate),
          status: d.status,
          category: getItemStatusCategory(d.dueDate, d.status),
          assigneeName: users.find((u) => u.id === d.assigneeId)?.fullName,
        });
      }
    });

    return items;
  }, [selectedDateStr, scopedTasks, scopedDocs, users, year]);

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 flex flex-col gap-6 flex-1 max-w-7xl mx-auto">
      {/* Top Header & Executive Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                Lịch Công Tác & Hạn Chót
                <span className="text-xs font-normal text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 font-semibold">
                  {scope === 'MY'
                    ? `Cá nhân: ${currentUser?.fullName || 'Cán bộ'}`
                    : isClerkRole
                    ? 'Lịch công tác cơ quan & Sổ văn thư'
                    : 'Toàn cơ quan'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi trực quan màu sắc tiến độ các nhiệm vụ Đang thực hiện, Sẽ thực hiện, Đã xong và Quá hạn
              </p>
            </div>
          </div>
        </div>

        {/* View mode switcher & scope filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canToggleScope && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setScope('MY')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  scope === 'MY'
                    ? 'bg-white text-indigo-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lịch của tôi
              </button>
              <button
                onClick={() => setScope('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  scope === 'ALL'
                    ? 'bg-white text-indigo-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isClerkRole ? 'Lịch cơ quan & Sổ văn thư' : 'Toàn cơ quan'}
              </button>
            </div>
          )}

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'CALENDAR'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Lịch tháng</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Lịch trình</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Status Metric Cards / Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Tất cả */}
        <button
          onClick={() => setActiveStatusTab('ALL')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeStatusTab === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-400/30'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Tất cả lịch</span>
            <CalendarIcon className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-black mt-2">{stats.total}</div>
          <div className="text-[10px] opacity-70 mt-0.5">Tổng số nhiệm vụ & hạn chót</div>
        </button>

        {/* Đang thực hiện (In Progress) - Xanh dương */}
        <button
          onClick={() => setActiveStatusTab('IN_PROGRESS')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeStatusTab === 'IN_PROGRESS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
              : 'bg-blue-50/80 text-blue-900 border-blue-200 hover:bg-blue-100/70 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block border border-white"></span>
              Đang thực hiện
            </span>
            <PlayCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-blue-700">{stats.inProgress}</div>
          <div className="text-[10px] text-blue-600/90 mt-0.5">Nhiệm vụ đang tiến hành</div>
        </button>

        {/* Sẽ thực hiện (Upcoming) - Tím */}
        <button
          onClick={() => setActiveStatusTab('UPCOMING')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeStatusTab === 'UPCOMING'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-300'
              : 'bg-purple-50/80 text-purple-900 border-purple-200 hover:bg-purple-100/70 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block border border-white"></span>
              Sẽ thực hiện
            </span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-purple-700">{stats.upcoming}</div>
          <div className="text-[10px] text-purple-600/90 mt-0.5">Kế hoạch sắp tới</div>
        </button>

        {/* Đã thực hiện (Completed) - Xanh lá */}
        <button
          onClick={() => setActiveStatusTab('COMPLETED')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeStatusTab === 'COMPLETED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
              : 'bg-emerald-50/80 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-white"></span>
              Đã thực hiện
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-700">{stats.completed}</div>
          <div className="text-[10px] text-emerald-600/90 mt-0.5">Đã hoàn thành tốt</div>
        </button>

        {/* Quá hạn (Overdue) - Đỏ */}
        <button
          onClick={() => setActiveStatusTab('OVERDUE')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeStatusTab === 'OVERDUE'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
              : 'bg-rose-50/80 text-rose-900 border-rose-200 hover:bg-rose-100/70 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block border border-white animate-pulse"></span>
              Quá hạn / Gấp
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-rose-700">{stats.overdue}</div>
          <div className="text-[10px] text-rose-600/90 mt-0.5">Cần đôn đốc xử lý ngay</div>
        </button>
      </div>

      {/* Main Display: CALENDAR GRID OR LIST VIEW */}
      {viewMode === 'CALENDAR' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            {/* Month Navigator Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <span className="text-base md:text-lg font-bold text-slate-800">
                  {monthNames[month]} năm {year}
                </span>
                <span className="text-xs text-slate-500 font-semibold bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  {stats.total} sự kiện
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                    title="Tháng trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Hôm nay
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                    title="Tháng sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Prominent Color Legend Bar */}
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center gap-4 md:gap-6 text-xs font-medium text-slate-700">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">CHÚ THÍCH MÀU:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-500 shadow-2xs"></span>
                <span className="font-semibold text-blue-900">Đang thực hiện (Xanh dương)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-purple-500 shadow-2xs"></span>
                <span className="font-semibold text-purple-900">Sẽ thực hiện / Sắp tới (Tím)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-2xs"></span>
                <span className="font-semibold text-emerald-900">Đã thực hiện (Xanh lá)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500 shadow-2xs"></span>
                <span className="font-semibold text-rose-900">Quá hạn / Gấp (Đỏ)</span>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/80">
              {daysOfWeek.map((day, idx) => (
                <div
                  key={day}
                  className={`p-2.5 text-center text-xs font-bold uppercase tracking-wider ${
                    idx >= 5 ? 'text-rose-500' : 'text-slate-700'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Month Calendar Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
              {/* Empty cells before month start */}
              {Array.from({ length: startingDay }).map((_, idx) => (
                <div key={`empty-${idx}`} className="min-h-[135px] bg-slate-50/50 p-2" />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const formattedDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = formattedDay === todayStr;
                const isSelected = selectedDateStr === formattedDay;

                // Filter tasks & docs for this specific day
                const dayTasks = scopedTasks.filter((t) => {
                  const dStr = normalizeDateStr(t.dueDate);
                  if (dStr !== formattedDay) return false;
                  if (activeStatusTab === 'ALL') return true;
                  return getItemStatusCategory(t.dueDate, t.status) === activeStatusTab;
                });

                const dayDocs = scopedDocs.filter((d) => {
                  const dStr = normalizeDateStr(d.dueDate);
                  if (dStr !== formattedDay) return false;
                  if (activeStatusTab === 'ALL') return true;
                  return getItemStatusCategory(d.dueDate, d.status) === activeStatusTab;
                });

                const totalItems = dayTasks.length + dayDocs.length;

                // Check categories present on this day to render color dots
                const hasOverdue = dayTasks.some((t) => getItemStatusCategory(t.dueDate, t.status) === 'OVERDUE') ||
                  dayDocs.some((d) => getItemStatusCategory(d.dueDate, d.status) === 'OVERDUE');
                const hasInProgress = dayTasks.some((t) => getItemStatusCategory(t.dueDate, t.status) === 'IN_PROGRESS') ||
                  dayDocs.some((d) => getItemStatusCategory(d.dueDate, d.status) === 'IN_PROGRESS');
                const hasUpcoming = dayTasks.some((t) => getItemStatusCategory(t.dueDate, t.status) === 'UPCOMING') ||
                  dayDocs.some((d) => getItemStatusCategory(d.dueDate, d.status) === 'UPCOMING');
                const hasCompleted = dayTasks.some((t) => getItemStatusCategory(t.dueDate, t.status) === 'COMPLETED') ||
                  dayDocs.some((d) => getItemStatusCategory(d.dueDate, d.status) === 'COMPLETED');

                return (
                  <div
                    key={dayNum}
                    onClick={() => setSelectedDateStr(formattedDay)}
                    className={`min-h-[140px] p-2 flex flex-col justify-between transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-indigo-50/50 ring-2 ring-indigo-500 z-10'
                        : isToday
                        ? 'bg-indigo-50/20 hover:bg-indigo-50/40'
                        : hasOverdue
                        ? 'bg-rose-50/15 hover:bg-rose-50/30'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Top Row: Date number & Color category dots */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold rounded-lg w-7 h-7 flex items-center justify-center transition-transform group-hover:scale-105 ${
                          isToday
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : isSelected
                            ? 'bg-slate-800 text-white font-black'
                            : 'text-slate-700 bg-slate-100 group-hover:bg-slate-200'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* Color Category Indicator Dots */}
                      <div className="flex items-center gap-1">
                        {hasOverdue && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-2xs"
                            title="Có nhiệm vụ quá hạn"
                          />
                        )}
                        {hasInProgress && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-2xs"
                            title="Có nhiệm vụ đang thực hiện"
                          />
                        )}
                        {hasUpcoming && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-2xs"
                            title="Có nhiệm vụ sắp tới"
                          />
                        )}
                        {hasCompleted && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs"
                            title="Có nhiệm vụ đã hoàn thành"
                          />
                        )}
                        {totalItems > 0 && (
                          <span className="text-[10px] text-slate-500 font-bold bg-white px-1.5 py-0.2 rounded-md border border-slate-200 ml-0.5">
                            {totalItems}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Events Colored Cards Container */}
                    <div className="space-y-1.5 overflow-y-auto max-h-[105px] custom-scrollbar flex-1 pr-0.5">
                      {/* Tasks */}
                      {dayTasks.map((t) => {
                        const style = getEventStyle(t.dueDate, t.status);
                        return (
                          <div
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTaskDetail(t.id);
                            }}
                            className={`p-1.5 rounded-lg text-[11px] border truncate cursor-pointer transition-all flex items-center justify-between gap-1.5 shadow-2xs hover:scale-[1.02] ${style.cardBg}`}
                            title={`[Nhiệm vụ: ${t.code}] ${t.title} (${t.progress}%) - ${style.badgeText}`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${style.iconColor}`} />
                              <span className="truncate font-semibold">{t.title}</span>
                            </div>
                            {t.progress !== undefined && (
                              <span className="text-[9px] font-bold opacity-80 shrink-0 font-mono">
                                {t.progress}%
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Incoming Docs */}
                      {dayDocs.map((d) => {
                        const style = getEventStyle(d.dueDate, d.status);
                        return (
                          <div
                            key={d.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenIncomingDocDetail(d.id);
                            }}
                            className={`p-1.5 rounded-lg text-[11px] border truncate cursor-pointer transition-all flex items-center justify-between gap-1.5 shadow-2xs hover:scale-[1.02] ${style.cardBg}`}
                            title={`[Văn bản đến: ${d.documentNumber}] ${d.summary} - ${style.badgeText}`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <FileText className={`w-3.5 h-3.5 shrink-0 ${style.iconColor}`} />
                              <span className="truncate font-semibold">VB: {d.documentNumber}</span>
                            </div>
                            <span className="text-[9px] font-bold opacity-80 shrink-0">Hạn</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Detail Card Panel */}
          {selectedDateStr && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Chi Tiết Nhiệm Vụ Ngày {selectedDateStr.split('-').reverse().join('/')}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Có {selectedDayItems.length} công việc và văn bản cần theo dõi
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDateStr(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedDayItems.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Không có lịch công tác hoặc hạn chót nào trong ngày này.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedDayItems.map((item) => {
                    const style = getEventStyle(item.dueDate, item.status);
                    return (
                      <div
                        key={item.id}
                        onClick={() =>
                          item.type === 'TASK'
                            ? onOpenTaskDetail(item.id)
                            : onOpenIncomingDocDetail(item.id)
                        }
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 cursor-pointer transition-all hover:shadow-xs ${style.cardBg}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.type === 'TASK' ? (
                              <CheckSquare className={`w-4 h-4 ${style.iconColor} shrink-0`} />
                            ) : (
                              <FileText className={`w-4 h-4 ${style.iconColor} shrink-0`} />
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-xs truncate">{item.title}</div>
                              {item.code && (
                                <span className="text-[10px] opacity-75 font-mono">
                                  {item.code}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${style.badgeClass}`}
                          >
                            {style.badgeText}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-black/5">
                          <span className="text-[11px] opacity-80">
                            Cán bộ: <strong>{item.assigneeName || 'N/A'}</strong>
                          </span>
                          <span className="font-bold text-indigo-600 flex items-center gap-1 text-[11px]">
                            Xem chi tiết <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* TIMELINE / LIST VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <h2 className="text-sm font-bold text-slate-800">
              Danh Sách Nhiệm Vụ & Hạn Chót ({categorizedList.length} mục)
            </h2>
            <span className="text-xs text-slate-500">Sắp xếp theo hạn xử lý</span>
          </div>

          {categorizedList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-600">
                Không có lịch công tác hoặc hạn chót nào trong mục này
              </p>
              <p className="text-xs text-slate-400 mt-1">Chọn tab khác để kiểm tra thêm lịch trình</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {categorizedList.map((item) => {
                const style = getEventStyle(item.dueDate, item.status);

                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      item.type === 'TASK'
                        ? onOpenTaskDetail(item.id)
                        : onOpenIncomingDocDetail(item.id)
                    }
                    className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${style.cardBg}`}
                      >
                        {item.type === 'TASK' ? (
                          <CheckSquare className={`w-4 h-4 ${style.iconColor}`} />
                        ) : (
                          <FileText className={`w-4 h-4 ${style.iconColor}`} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {item.title}
                          </span>
                          {item.code && (
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.code}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>
                            Loại: <strong>{item.type === 'TASK' ? 'Nhiệm vụ công việc' : 'Văn bản đến'}</strong>
                          </span>
                          {item.assigneeName && (
                            <span>
                              Cán bộ: <strong>{item.assigneeName}</strong>
                            </span>
                          )}
                          {item.progress !== undefined && (
                            <span className="text-slate-600 font-medium">
                              Tiến độ: <strong>{item.progress}%</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Hạn: {item.dueDate}</span>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badgeClass}`}
                          >
                            {style.badgeText}
                          </span>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
