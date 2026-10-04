import React, { useState, useMemo } from 'react';
import { AuditLog, User } from '../types';
import { History, Search, Filter, ShieldCheck, LogIn, LogOut } from 'lucide-react';

interface AuditLogsViewProps {
  logs: AuditLog[];
  users: User[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, users }) => {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  // Sắp xếp nhật ký từ mới nhất lên trước (Newest First)
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }, [logs]);

  const filteredLogs = sortedLogs.filter((log) => {
    // Không cần ghi nhận / hiển thị đăng xuất
    if (log.action === 'LOGOUT') return false;

    const q = (search || '').trim().toLowerCase();
    const uName = (log.userName || '').toLowerCase();
    const eType = (log.entityType || '').toLowerCase();
    const eTitle = (log.entityTitle || '').toLowerCase();
    const det = (log.details || '').toLowerCase();

    const matchSearch =
      !q ||
      uName.includes(q) ||
      eType.includes(q) ||
      eTitle.includes(q) ||
      det.includes(q);

    const matchAction = filterAction === 'ALL' || log.action === filterAction;
    return matchSearch && matchAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">🔑 ĐĂNG NHẬP</span>;
      case 'CREATE':
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">TẠO MỚI</span>;
      case 'UPDATE':
        return <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">CẬP NHẬT</span>;
      case 'DELETE':
        return <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">XÓA BỎ</span>;
      case 'STATUS_CHANGE':
        return <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-[10px]">ĐỔI TRẠNG THÁI</span>;
      case 'ASSIGN':
        return <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">GIAO VIỆC</span>;
      case 'COMMENT':
        return <span className="bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded text-[10px]">TRAO ĐỔI</span>;
      case 'UPLOAD_FILE':
        return <span className="bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded text-[10px]">TẢI LÊN TỆP</span>;
      case 'SWITCH_USER':
        return <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[10px]">CHUYỂN TÀI KHOẢN</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px]">{action}</span>;
    }
  };

  return (
    <div className="w-full p-6 md:p-8 flex flex-col gap-6 flex-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Lịch Sử Thao Tác & Nhật Ký Hệ Thống</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi vết kiểm toán (Audit Trail): Ghi nhận Ai thực hiện - Thao tác gì - Thời điểm nào
          </p>
        </div>
        <div className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg font-semibold">
          Tổng cộng: <span className="font-bold text-indigo-900">{filteredLogs.length}</span> bản ghi
        </div>
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
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
        >
          <option value="ALL">Tất cả hành động ({filteredLogs.length})</option>
          <option value="LOGIN">Đăng nhập</option>
          <option value="CREATE">Tạo mới</option>
          <option value="UPDATE">Cập nhật</option>
          <option value="STATUS_CHANGE">Đổi trạng thái</option>
          <option value="ASSIGN">Giao việc</option>
          <option value="COMMENT">Ý kiến trao đổi</option>
          <option value="SWITCH_USER">Chuyển tài khoản</option>
          <option value="DELETE">Xóa bỏ</option>
          <option value="UPLOAD_FILE">Tải lên tệp</option>
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
