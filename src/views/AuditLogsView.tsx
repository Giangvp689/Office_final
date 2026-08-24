import React, { useState } from 'react';
import { AuditLog, User } from '../types';
import { History, Search, Filter, ShieldCheck } from 'lucide-react';

interface AuditLogsViewProps {
  logs: AuditLog[];
  users: User[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, users }) => {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.entityType.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    const matchAction = filterAction === 'ALL' || log.action === filterAction;
    return matchSearch && matchAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">TẠO MỚI</span>;
      case 'UPDATE':
        return <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">CẬP NHẬT</span>;
      case 'DELETE':
        return <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">XÓA BỎ</span>;
      default:
        return <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[10px]">TRUY VẤN AI</span>;
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Lịch Sử Thao Tác & Nhật Ký Hệ Thống</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ghi vết kiểm toán (Audit Trail): Ghi nhận Ai thực hiện - Thao tác gì - Thời điểm nào
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo người thực hiện, đối tượng, nội dung..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Tất cả hành động</option>
          <option value="CREATE">Tạo mới</option>
          <option value="UPDATE">Cập nhật</option>
          <option value="DELETE">Xóa</option>
          <option value="AI_QUERY">Truy vấn AI</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Thời gian</th>
                <th className="px-4 py-3">Người thao tác</th>
                <th className="px-4 py-3">Hành động</th>
                <th className="px-4 py-3">Đối tượng</th>
                <th className="px-5 py-3">Chi tiết nội dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}{' '}
                    - {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">{log.userName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{getActionBadge(log.action)}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-700">
                    {log.entityType}
                  </td>
                  <td className="px-5 py-3 text-slate-600 leading-relaxed">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
