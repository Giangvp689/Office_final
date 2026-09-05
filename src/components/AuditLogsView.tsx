import React, { useState } from 'react';
import { History, Search, User, Clock, ShieldCheck, Activity, Trash2, CheckCircle2 } from 'lucide-react';
import { AuditLog } from '../types';
import { db } from '../services/db';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const handleClearLogs = () => {
    db.clearAuditLogs();
    setShowConfirmClear(false);
    setClearSuccess(true);
    setTimeout(() => setClearSuccess(false), 3000);
  };

  const filteredLogs = logs.filter((log) => {
    const target = log.targetName || log.entityTitle || log.entityType || '';
    return (
      !searchTerm ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      target.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Lịch Sử Chỉnh Sửa & Nhật Ký Truy Vết ({logs.length})
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống tự động ghi vết và tối ưu hóa bộ nhớ đệm an toàn, lưu giữ các nhật ký mới nhất.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {clearSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Đã làm sạch bộ nhớ đệm!</span>
            </div>
          )}

          {showConfirmClear ? (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-lg">
              <span className="text-xs text-rose-700 font-medium px-1">Xác nhận xóa?</span>
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-2.5 py-1 text-xs font-medium bg-rose-600 text-white rounded hover:bg-rose-700 transition"
              >
                Xóa
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition"
              >
                Hủy
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-xs font-medium shadow-2xs transition"
              title="Làm sạch bộ nhớ nhật ký truy vết"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Dọn dẹp nhật ký</span>
            </button>
          )}
        </div>
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
                    {log.targetName || log.entityTitle || log.entityType || '---'}
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
