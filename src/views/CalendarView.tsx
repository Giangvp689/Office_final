import React, { useState } from 'react';
import { Task, IncomingDocument, User } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckSquare,
  FileText,
  Clock,
} from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  incomingDocs: IncomingDocument[];
  users: User[];
  onOpenTaskDetail: (id: string) => void;
  onOpenIncomingDocDetail: (id: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  incomingDocs,
  users,
  onOpenTaskDetail,
  onOpenIncomingDocDetail,
}) => {
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

  return (
    <div className="w-full p-6 md:p-8 flex flex-col gap-6 flex-1">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Lịch Công Tác & Hạn Chót</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi trực quan tiến độ và hạn xử lý của tất cả công việc và văn bản đến
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-4 min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs"
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
          {daysOfWeek.map((day, idx) => (
            <div
              key={day}
              className={`p-3 text-center text-[11px] font-bold uppercase tracking-wider ${
                idx >= 5 ? 'text-rose-500' : 'text-slate-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
          {/* Empty cells before month start */}
          {Array.from({ length: startingDay }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[110px] bg-slate-50/40 p-2" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const formattedDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = formattedDay === todayStr;

            const dayTasks = tasks.filter((t) => t.dueDate === formattedDay);
            const dayDocs = incomingDocs.filter((d) => d.dueDate === formattedDay);

            return (
              <div
                key={dayNum}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                  isToday ? 'bg-indigo-50/40 font-bold' : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                      isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {(dayTasks.length > 0 || dayDocs.length > 0) && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      {dayTasks.length + dayDocs.length} mục
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                  {/* Tasks on this day */}
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onOpenTaskDetail(t.id)}
                      className={`p-1 rounded text-[10px] font-semibold truncate cursor-pointer transition-all flex items-center gap-1 ${
                        t.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 line-through'
                          : t.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                      title={`[Việc] ${t.title} (${t.progress}%)`}
                    >
                      <CheckSquare className="w-3 h-3 shrink-0" />
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}

                  {/* Incoming Docs due on this day */}
                  {dayDocs.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => onOpenIncomingDocDetail(d.id)}
                      className="p-1 rounded text-[10px] font-semibold truncate cursor-pointer bg-amber-100 text-amber-900 flex items-center gap-1"
                      title={`[VB Đến] ${d.documentNumber} - ${d.summary}`}
                    >
                      <FileText className="w-3 h-3 shrink-0 text-amber-700" />
                      <span className="truncate">VB: {d.documentNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
