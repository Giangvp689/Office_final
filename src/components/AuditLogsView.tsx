import React, { useState } from 'react';
import { History, Search, User, Clock, ShieldCheck, Activity } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    return (
      !searchTerm ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">TẠO MỚI</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">CẬP NHẬT</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">XÓA</span>;
      case 'ASSIGN':
        return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">PHÂN CÔNG</span>;
      case 'STATUS_CHANGE':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">ĐỔI TRẠNG THÁI</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">HÀNH ĐỘNG</span>;
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Lịch Sử Chỉnh Sửa & Nhật Ký Truy Vết ({logs.length})
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Hệ thống tự động ghi vết toàn bộ hoạt động tiếp nhận văn bản, phân công, chuyển trạng thái và cập nhật tiến độ công việc.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, nội dung thay đổi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-3.5">Thời gian</th>
              <th className="p-3.5">Cán bộ thực hiện</th>
              <th className="p-3.5">Loại hành động</th>
              <th className="p-3.5">Đối tượng tác động</th>
              <th className="p-3.5">Chi tiết thay đổi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Không tìm thấy lịch sử phù hợp.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                    </div>
                  </td>

                  <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">
                    {log.userName}
                  </td>

                  <td className="p-3.5 whitespace-nowrap">{getActionBadge(log.action)}</td>

                  <td className="p-3.5 whitespace-nowrap font-medium text-indigo-700">
                    {log.targetName}
                  </td>

                  <td className="p-3.5 text-slate-600">
                    {log.details || '---'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
