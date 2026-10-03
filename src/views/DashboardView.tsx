import React, { useState, useMemo } from 'react';
import {
  IncomingDocument,
  OutgoingDocument,
  Task,
  User,
  Dossier,
  AttachmentFile,
} from '../types';
import {
  FileText,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FolderKanban,
  Sparkles,
  User as UserIcon,
  BrainCircuit,
  Zap,
  Calendar,
  Filter,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  BarChart3,
  Layers,
  ChevronDown,
  Building2,
  Check,
} from 'lucide-react';
import { ReportModal } from '../components/ReportModal';

interface DashboardViewProps {
  incomingDocs: IncomingDocument[];
  outgoingDocs: OutgoingDocument[];
  tasks: Task[];
  users: User[];
  dossiers: Dossier[];
  attachments: AttachmentFile[];
  currentUser?: User;
  onSelectSection: (section: any) => void;
  onOpenTaskDetail: (taskId: string) => void;
  onOpenIncomingDocDetail: (docId: string) => void;
  onOpenDossierDetail: (dossierId: string) => void;
}

type TimeFilterOption =
  | '30_DAYS'
  | '7_DAYS'
  | 'THIS_MONTH'
  | 'PREV_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM'
  | 'ALL_TIME';

export const DashboardView: React.FC<DashboardViewProps> = ({
  incomingDocs,
  outgoingDocs,
  tasks,
  users,
  dossiers,
  currentUser,
  onSelectSection,
  onOpenTaskDetail,
  onOpenIncomingDocDetail,
  onOpenDossierDetail,
}) => {
  // Default to rolling 30 days as specifically requested by user
  const [timeRange, setTimeRange] = useState<TimeFilterOption>('30_DAYS');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [scope, setScope] = useState<'ALL' | 'MY_WORK' | string>('ALL');
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Current system date
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute dynamic date range boundaries
  const { startDate, endDate, label: timeRangeLabel } = useMemo(() => {
    const today = new Date();
    const format = (d: Date) => d.toISOString().split('T')[0];

    if (timeRange === '30_DAYS') {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return {
        startDate: format(start),
        endDate: format(today),
        label: '30 ngày gần đây (Mặc định)',
      };
    }

    if (timeRange === '7_DAYS') {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return {
        startDate: format(start),
        endDate: format(today),
        label: '7 ngày qua',
      };
    }

    if (timeRange === 'THIS_MONTH') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        startDate: format(start),
        endDate: format(today),
        label: `Tháng ${today.getMonth() + 1}/${today.getFullYear()}`,
      };
    }

    if (timeRange === 'PREV_MONTH') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: format(start),
        endDate: format(end),
        label: `Tháng trước (${start.getMonth() + 1}/${start.getFullYear()})`,
      };
    }

    if (timeRange === 'THIS_QUARTER') {
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), quarter * 3, 1);
      return {
        startDate: format(start),
        endDate: format(today),
        label: `Quý ${quarter + 1}/${today.getFullYear()}`,
      };
    }

    if (timeRange === 'THIS_YEAR') {
      const start = new Date(today.getFullYear(), 0, 1);
      return {
        startDate: format(start),
        endDate: format(today),
        label: `Năm ${today.getFullYear()}`,
      };
    }

    if (timeRange === 'CUSTOM') {
      return {
        startDate: customStartDate || '2026-01-01',
        endDate: customEndDate || format(today),
        label: 'Tùy chọn khoảng ngày',
      };
    }

    return {
      startDate: '1970-01-01',
      endDate: '2099-12-31',
      label: 'Toàn hệ thống (Toàn bộ lịch sử)',
    };
  }, [timeRange, customStartDate, customEndDate, todayStr]);

  // Unique departments for scope filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set);
  }, [users]);

  // Scope label for reports and headers
  const scopeLabel = useMemo(() => {
    if (scope === 'MY_WORK') return `Tiến độ cá nhân (${currentUser?.fullName || 'Tôi'})`;
    if (scope === 'ALL') return 'Toàn cơ quan / Tất cả đơn vị';
    return `Phòng ban: ${scope}`;
  }, [scope, currentUser]);

  // Date parsing helper
  const getDocDate = (doc: IncomingDocument) => (doc.receivedDate || doc.issueDate || doc.createdAt || '').slice(0, 10);
  const getOutDocDate = (doc: OutgoingDocument) => (doc.releaseDate || (doc as any).issuedDate || doc.createdAt || '').slice(0, 10);
  const getTaskDate = (task: Task) => (task.dueDate || task.startDate || task.createdAt || '').slice(0, 10);

  // Check matching scope (User activity diagram: "Kiểm tra quyền và phạm vi dữ liệu")
  const isMatchScope = (assigneeId?: string, coAssigneeIds?: string[]) => {
    if (scope === 'ALL') return true;
    if (scope === 'MY_WORK') {
      if (!currentUser) return true;
      return assigneeId === currentUser.id || Boolean(coAssigneeIds?.includes(currentUser.id));
    }
    const assignee = users.find((u) => u.id === assigneeId);
    return assignee?.department === scope || assignee?.departmentId === scope;
  };

  // Check matching date range
  const isMatchTime = (dateStr: string) => {
    if (timeRange === 'ALL_TIME') return true;
    if (!dateStr) return true;
    return dateStr >= startDate && dateStr <= endDate;
  };

  // Filtered Datasets based on Time & Scope
  const filteredIncomingDocs = useMemo(() => {
    return incomingDocs.filter((d) => isMatchTime(getDocDate(d)) && isMatchScope(d.assigneeId, d.coAssigneeIds));
  }, [incomingDocs, startDate, endDate, timeRange, scope, currentUser, users]);

  const filteredOutgoingDocs = useMemo(() => {
    return outgoingDocs.filter((d) => isMatchTime(getOutDocDate(d)) && isMatchScope(d.drafterId || d.signerId));
  }, [outgoingDocs, startDate, endDate, timeRange, scope, currentUser, users]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => isMatchTime(getTaskDate(t)) && isMatchScope(t.assigneeId, t.coAssigneeIds));
  }, [tasks, startDate, endDate, timeRange, scope, currentUser, users]);

  // Dynamic KPI Metrics for filtered range
  const totalIncoming = filteredIncomingDocs.length;
  const totalOutgoing = filteredOutgoingDocs.length;
  const urgentIncoming = filteredIncomingDocs.filter(
    (d) => (d.urgency === 'HOA_TOC' || d.urgency === 'KHAN' || d.urgency === 'THUONG_KHAN') && d.status !== 'COMPLETED'
  );
  const overdueTasks = filteredTasks.filter(
    (t) => t.status === 'OVERDUE' || (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate < todayStr)
  );
  const completedTasks = filteredTasks.filter((t) => t.status === 'COMPLETED');
  const completionRate = filteredTasks.length > 0 ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0;

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getDossier = (id?: string) => dossiers.find((d) => d.id === id);

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">
            Hoàn thành
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase">
            Quá hạn
          </span>
        );
      case 'WAITING_APPROVAL':
        return (
          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">
            Chờ duyệt
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">
            Đang thực hiện
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
            Chưa bắt đầu
          </span>
        );
    }
  };

  const getUrgencyBadge = (urgency: IncomingDocument['urgency']) => {
    switch (urgency) {
      case 'HOA_TOC':
        return <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">HỎA TỐC</span>;
      case 'KHAN':
      case 'THUONG_KHAN':
        return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">KHẨN</span>;
      default:
        return <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">THƯỜNG</span>;
    }
  };

  // Weekly breakdown data for the 30-day window chart
  const weeklyChartData = useMemo(() => {
    const weeks = [
      { name: 'Tuần 1', countInc: 0, countOut: 0, countTask: 0 },
      { name: 'Tuần 2', countInc: 0, countOut: 0, countTask: 0 },
      { name: 'Tuần 3', countInc: 0, countOut: 0, countTask: 0 },
      { name: 'Tuần 4', countInc: 0, countOut: 0, countTask: 0 },
    ];

    filteredIncomingDocs.forEach((d, i) => {
      weeks[i % 4].countInc += 1;
    });
    filteredOutgoingDocs.forEach((d, i) => {
      weeks[i % 4].countOut += 1;
    });
    filteredTasks.forEach((t, i) => {
      weeks[i % 4].countTask += 1;
    });

    return weeks;
  }, [filteredIncomingDocs, filteredOutgoingDocs, filteredTasks]);

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 flex flex-col gap-6 flex-1">
      {/* Flagship Academic Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 text-white shadow-md border border-indigo-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-white shrink-0 shadow-inner">
            <BrainCircuit className="w-6 h-6 text-indigo-200 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-400/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-300/30">
                Chức Năng Cốt Lõi Đề Tài
              </span>
              <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">
                NLP Classification Engine
              </span>
            </div>
            <h2 className="text-base md:text-lg font-black tracking-tight text-white">
              Studio Phân Loại Nội Dung Văn Bản & Trích Xuất Thực Thể Tự Động
            </h2>
            <p className="text-xs text-indigo-100/80 max-w-2xl leading-relaxed">
              Tự động phân loại đa nhãn (Tài chính, Tổ chức Cán bộ, Pháp chế...), nhận diện thể loại theo NĐ 30/2020, đo lường độ tin cậy và tự động điều phối cho chuyên viên phụ trách.
            </p>
          </div>
        </div>

        <button
          id="btn-dash-open-classifier"
          onClick={() => onSelectSection('CLASSIFIER_STUDIO')}
          className="self-start md:self-center py-2.5 px-4 bg-white text-indigo-950 hover:bg-indigo-50 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 shrink-0 transition-all cursor-pointer group"
        >
          <Zap className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          <span>Mở Phân Loại Văn Bản</span>
          <ArrowRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* TIME FILTER & SCOPE CONTROL TOOLBAR (THE CORE USER REQUIREMENT) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Left: Quick Time Range Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Thời gian:</span>
            </span>

            <button
              onClick={() => setTimeRange('30_DAYS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeRange === '30_DAYS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              30 ngày gần đây
            </button>

            <button
              onClick={() => setTimeRange('7_DAYS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeRange === '7_DAYS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              7 ngày qua
            </button>

            <button
              onClick={() => setTimeRange('THIS_MONTH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeRange === 'THIS_MONTH'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tháng này
            </button>

            <button
              onClick={() => setTimeRange('THIS_QUARTER')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeRange === 'THIS_QUARTER'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Quý này
            </button>

            <button
              onClick={() => setTimeRange('THIS_YEAR')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeRange === 'THIS_YEAR'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Năm nay
            </button>

            <button
              onClick={() => setTimeRange('CUSTOM')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeRange === 'CUSTOM'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tùy chọn ngày
            </button>

            <button
              onClick={() => setTimeRange('ALL_TIME')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeRange === 'ALL_TIME'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Xem lại dữ liệu toàn bộ lịch sử hệ thống"
            >
              Toàn hệ thống
            </button>
          </div>

          {/* Right: Scope Filter & Export Report Action */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Selector (Activity Diagram step: "Kiểm tra quyền và phạm vi dữ liệu") */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
              >
                <option value="ALL">Toàn cơ quan (Mọi đơn vị)</option>
                {currentUser && (
                  <option value="MY_WORK">Tiến độ của tôi ({currentUser.fullName})</option>
                )}
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    Phòng: {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Report Action (Activity diagram: "Xuất báo cáo / Nhận file báo cáo") */}
            <button
              onClick={() => setIsReportOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo</span>
            </button>
          </div>
        </div>

        {/* Custom Date Inputs (Only when CUSTOM is selected) */}
        {timeRange === 'CUSTOM' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Từ ngày:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:bg-white focus:outline-indigo-600"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Đến ngày:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:bg-white focus:outline-indigo-600"
              />
            </div>
          </div>
        )}

        {/* Active Range Information Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-semibold text-[11px] border border-indigo-100">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>Phạm vi hiển thị:</span>
              {timeRange === 'ALL_TIME' ? (
                <strong>Toàn bộ dữ liệu lịch sử hệ thống</strong>
              ) : (
                <strong>
                  {new Date(startDate).toLocaleDateString('vi-VN')} &rarr; {new Date(endDate).toLocaleDateString('vi-VN')} ({timeRangeLabel})
                </strong>
              )}
            </span>
            <span className="text-[11px] text-slate-400">
              • {scopeLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">
              Số liệu lọc: <strong>{totalIncoming}</strong> VB đến, <strong>{totalOutgoing}</strong> VB đi, <strong>{filteredTasks.length}</strong> công việc
            </span>
            {timeRange !== '30_DAYS' && (
              <button
                onClick={() => setTimeRange('30_DAYS')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                title="Quay lại mặc định 30 ngày gần đây"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Về 30 ngày mặc định</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Stat Cards - Filtered in real-time according to selected window */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Văn bản đến trong kỳ */}
        <div
          onClick={() => onSelectSection('INCOMING_DOCS')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">
              Văn bản đến ({timeRange === '30_DAYS' ? '30 ngày' : 'Trong kỳ'})
            </span>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold">
              +{filteredIncomingDocs.filter((d) => d.status === 'PROCESSING').length} Đang xử lý
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
            {totalIncoming}
          </div>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalIncoming / 15) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Đã giao xử lý: {filteredIncomingDocs.filter((d) => d.assigneeId).length}</span>
            <span className="text-rose-500 font-semibold">{urgentIncoming.length} văn bản khẩn</span>
          </div>
        </div>

        {/* Card 2: Văn bản đi trong kỳ */}
        <div
          onClick={() => onSelectSection('OUTGOING_DOCS')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">
              Văn bản đi ({timeRange === '30_DAYS' ? '30 ngày' : 'Trong kỳ'})
            </span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
              Đã phát hành
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
            {totalOutgoing}
          </div>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalOutgoing / 10) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Đã ban hành: {filteredOutgoingDocs.filter((d) => d.status === 'ISSUED' || d.status === 'SENT').length}</span>
            <span>Dự thảo: {filteredOutgoingDocs.filter((d) => d.status === 'DRAFT' || d.status === 'REVIEWING').length}</span>
          </div>
        </div>

        {/* Card 3: Việc quá hạn trong kỳ */}
        <div
          onClick={() => onSelectSection('REMINDERS')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-rose-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">
              Việc quá hạn trong kỳ
            </span>
            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold">
              Cần xử lý gấp
            </span>
          </div>
          <div className="text-3xl font-black text-rose-600 tracking-tight">
            {String(overdueTasks.length).padStart(2, '0')}
          </div>
          <div className="mt-3 h-1.5 bg-rose-100 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overdueTasks.length * 25)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            {overdueTasks.length > 0 ? 'Đôn đốc cán bộ phụ trách ngay' : 'Không có công việc trễ hạn'}
          </div>
        </div>

        {/* Card 4: Hoàn thành tiến độ trong kỳ */}
        <div
          onClick={() => onSelectSection('ALL_TASKS')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">
              Tỷ lệ hoàn thành ({timeRange === '30_DAYS' ? '30 ngày' : 'Kỳ này'})
            </span>
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
              {completedTasks.length}/{filteredTasks.length} Việc
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-amber-600 transition-colors">
            {completionRate}%
          </div>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Tổng {filteredTasks.length} nhiệm vụ phát sinh trong khoảng thời gian này
          </div>
        </div>
      </div>

      {/* STATISTICAL CHART SECTION (ACTIVITY DIAGRAM: "Xem KPI và biểu đồ thống kê") */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Biểu đồ Phân Phối Khối Lượng Văn Bản & Tiến Độ Xử Lý
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
              <span>VB Đến</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>VB Đi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span>Nhiệm vụ</span>
            </div>
          </div>
        </div>

        {/* 4-Period Mini Bar Chart */}
        <div className="grid grid-cols-4 gap-3 sm:gap-6 pt-2 pb-1">
          {weeklyChartData.map((item, idx) => {
            const maxVal = Math.max(1, ...weeklyChartData.map((w) => Math.max(w.countInc, w.countOut, w.countTask)));
            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="h-28 w-full bg-slate-50 rounded-xl p-2 flex items-end justify-center gap-1.5 border border-slate-100">
                  {/* Bar 1: Incoming */}
                  <div
                    className="w-1/4 max-w-4 bg-indigo-500 hover:bg-indigo-600 rounded-t-sm transition-all"
                    style={{ height: `${Math.max(12, (item.countInc / maxVal) * 100)}%` }}
                    title={`VB Đến: ${item.countInc}`}
                  />
                  {/* Bar 2: Outgoing */}
                  <div
                    className="w-1/4 max-w-4 bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all"
                    style={{ height: `${Math.max(12, (item.countOut / maxVal) * 100)}%` }}
                    title={`VB Đi: ${item.countOut}`}
                  />
                  {/* Bar 3: Tasks */}
                  <div
                    className="w-1/4 max-w-4 bg-amber-500 hover:bg-amber-600 rounded-t-sm transition-all"
                    style={{ height: `${Math.max(12, (item.countTask / maxVal) * 100)}%` }}
                    title={`Nhiệm vụ: ${item.countTask}`}
                  />
                </div>
                <div className="text-[11px] font-bold text-slate-700">{item.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {item.countInc + item.countOut + item.countTask} mục
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Tasks Table (8 cols) + Right Side Feed (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Tasks Follow-up Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <div>
                <h2 className="font-bold text-slate-800 text-sm md:text-base">
                  Theo dõi Tiến độ Công việc ({timeRange === '30_DAYS' ? '30 ngày qua' : 'Trong kỳ'})
                </h2>
                <p className="text-[11px] text-slate-400">
                  {filteredTasks.length} nhiệm vụ thuộc phạm vi lọc hiện tại
                </p>
              </div>
            </div>
            <button
              onClick={() => onSelectSection('ALL_TASKS')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-200/80">
                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Nội dung công việc</th>
                  <th className="px-4 py-3">Người xử lý</th>
                  <th className="px-4 py-3">Hạn xử lý</th>
                  <th className="px-4 py-3">Tiến độ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Clock className="w-6 h-6 text-slate-300" />
                        <p className="text-xs">Không có công việc phát sinh trong khoảng thời gian đã chọn.</p>
                        <button
                          onClick={() => setTimeRange('ALL_TIME')}
                          className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Chuyển sang "Toàn hệ thống" để xem toàn bộ lịch sử
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.slice(0, 6).map((task) => {
                    const assignee = getUser(task.assigneeId);
                    const dossier = getDossier(task.dossierId);
                    return (
                      <tr
                        key={task.id}
                        onClick={() => onOpenTaskDetail(task.id)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {task.title}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{task.code}
                              </span>
                              {dossier && (
                                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-medium">
                                  {dossier.code}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={assignee.avatar}
                                alt={assignee.fullName}
                                className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <span className="text-xs text-slate-700 font-medium whitespace-nowrap">
                                {assignee.fullName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa giao</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium whitespace-nowrap">
                          <span
                            className={
                              task.dueDate < todayStr && task.status !== 'COMPLETED'
                                ? 'text-rose-600 font-bold'
                                : 'text-slate-600'
                            }
                          >
                            {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                              <span>{task.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  task.progress === 100
                                    ? 'bg-emerald-500'
                                    : task.progress > 50
                                    ? 'bg-indigo-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getStatusBadge(task.status)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Incoming Docs & Smart Dossier Binder */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Box 1: Văn bản tiếp nhận trong kỳ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base">
                  Văn bản tiếp nhận ({timeRange === '30_DAYS' ? '30 ngày qua' : 'Trong kỳ'})
                </h3>
                <span className="text-[11px] text-slate-400">
                  {filteredIncomingDocs.length} văn bản
                </span>
              </div>
              <button
                onClick={() => onSelectSection('INCOMING_DOCS')}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Tất cả &rarr;
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {filteredIncomingDocs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Không có văn bản đến trong khoảng thời gian này.
                </div>
              ) : (
                filteredIncomingDocs.slice(0, 4).map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onOpenIncomingDocDetail(doc.id)}
                    className="p-3 rounded-xl border border-slate-200/70 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">
                          {doc.docType}
                        </span>
                        {getUrgencyBadge(doc.urgency)}
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(doc.receivedDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                      {doc.summary}
                    </p>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                      <span className="truncate">{doc.issuingAuthority}</span>
                      <span className="font-mono font-medium text-slate-600">
                        Số: {doc.documentNumber}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Box 2: Smart Dossier Banner */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl shadow-lg p-5 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FolderKanban className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-sm">Quản lý theo Mã Hồ Sơ Vụ Việc</h3>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed mb-4">
                Tự động liên kết văn bản đến, văn bản đi, nhiệm vụ điều phối và tài liệu đính kèm theo mã hồ sơ điện tử chuyên biệt.
              </p>
            </div>

            <button
              onClick={() => onSelectSection('DOSSIERS')}
              className="w-full bg-white text-indigo-700 text-xs font-bold py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-xs"
            >
              Tra cứu danh sách hồ sơ ({dossiers.length})
            </button>
          </div>
        </div>
      </div>

      {/* OFFICIAL ADMINISTRATIVE REPORT EXPORT MODAL */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        startDateStr={startDate}
        endDateStr={endDate}
        timeRangeLabel={timeRangeLabel}
        scopeLabel={scopeLabel}
        incomingDocs={filteredIncomingDocs}
        outgoingDocs={filteredOutgoingDocs}
        tasks={filteredTasks}
        users={users}
        dossiers={dossiers}
        currentUser={currentUser}
      />
    </div>
  );
};
