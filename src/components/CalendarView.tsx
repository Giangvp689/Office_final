import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Inbox,
} from 'lucide-react';
import { Task, IncomingDocument, User } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  incomingDocs: IncomingDocument[];
  users: User[];
  onSelectTask: (task: Task) => void;
  onSelectDoc: (doc: IncomingDocument) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  incomingDocs,
  users,
  onSelectTask,
  onSelectDoc,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Shift for Monday start (0=Mon, ..., 6=Sun)
  const startingDay = (firstDayOfMonth + 6) % 7;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

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

  const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // Map events to date strings (YYYY-MM-DD)
  const getEventsForDate = (dayNumber: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(dayNumber).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    const dateTasks = tasks.filter((t) => t.dueDate === dateStr);
    const dateDocs = incomingDocs.filter((d) => d.dueDate === dateStr);

    return { dateTasks, dateDocs, dateStr };
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Lịch Công Tác & Hạn Xử Lý</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp hạn hoàn thành nhiệm vụ và hạn phản hồi văn bản theo dòng thời gian trực quan.
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            Hôm nay
          </button>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <button
              onClick={prevMonth}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center">
          {daysOfWeek.map((day, idx) => (
            <div
              key={day}
              className={`py-2.5 text-xs font-bold ${
                idx >= 5 ? 'text-rose-500' : 'text-slate-600'
              } border-r border-slate-200 last:border-r-0`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {/* Empty cells before month start */}
          {Array.from({ length: startingDay }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[110px] bg-slate-50/40 p-2 border-b border-r border-slate-100"
            ></div>
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const { dateTasks, dateDocs, dateStr } = getEventsForDate(dayNum);
            const isToday = dateStr === todayStr;

            return (
              <div
                key={`day-${dayNum}`}
                className={`min-h-[110px] p-2 border-b border-r border-slate-100 flex flex-col justify-between transition-colors ${
                  isToday ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {(dateTasks.length > 0 || dateDocs.length > 0) && (
                    <span className="text-[9px] font-bold text-slate-400">
                      {dateTasks.length + dateDocs.length} việc
                    </span>
                  )}
                </div>

                {/* Items in this day */}
                <div className="space-y-1 overflow-y-auto max-h-[80px]">
                  {/* Tasks */}
                  {dateTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate cursor-pointer transition-transform hover:scale-[1.02] ${
                        t.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                      title={`Công việc: ${t.title} (${t.status})`}
                    >
                      • {t.title}
                    </div>
                  ))}

                  {/* Incoming Docs Due */}
                  {dateDocs.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => onSelectDoc(d)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate bg-amber-100 text-amber-900 cursor-pointer hover:scale-[1.02] transition-transform"
                      title={`Hạn văn bản: ${d.documentNumber} - ${d.summary}`}
                    >
                      📄 VB {d.documentNumber}
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
