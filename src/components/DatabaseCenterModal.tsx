import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertTriangle,
  FileJson,
  FileCode,
  Server,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { db } from '../services/db';

interface DatabaseCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataResetOrRestored: () => void;
}

export const DatabaseCenterModal: React.FC<DatabaseCenterModalProps> = ({
  isOpen,
  onClose,
  onDataResetOrRestored,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; tablesCount?: number; error?: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initResult, setInitResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch {
      setDbStatus({ connected: false, error: 'Không thể kết nối máy chủ backend' });
    }
  };

  const handleInitDb = async () => {
    setIsInitializing(true);
    setInitResult(null);
    try {
      const res = await fetch('/api/init-db', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setInitResult('Khởi tạo cấu trúc bảng và nạp 100% dữ liệu vào MySQL thành công!');
        await db.checkAndSyncMySql();
        onDataResetOrRestored();
        checkStatus();
      } else {
        setInitResult(`Lỗi: ${data.error || 'Không thể tạo bảng'}`);
      }
    } catch (e: any) {
      setInitResult(`Lỗi kết nối MySQL: ${e.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const data = db.exportAllData();
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `qlvb_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportSQL = () => {
    const sqlContent = db.exportDatabaseSQL();
    const blob = new Blob([sqlContent], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `vanphong_so_mysql_${new Date().toISOString().split('T')[0]}.sql`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const success = db.importData(parsed);
      if (success) {
        setImportStatus('Khôi phục dữ liệu thành công!');
        onDataResetOrRestored();
        setTimeout(() => {
          setImportStatus(null);
          onClose();
        }, 1200);
      } else {
        setImportStatus('Lỗi cấu trúc dữ liệu không hợp lệ.');
      }
    } catch (e) {
      setImportStatus('Định dạng JSON bị lỗi cú pháp.');
    }
  };

  const handleResetMock = () => {
    if (confirm('Bạn có chắc chắn muốn đặt lại toàn bộ dữ liệu mẫu ban đầu? Các thay đổi sẽ bị làm mới.')) {
      db.resetToMockData();
      onDataResetOrRestored();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Quản Trị Cơ Sở Dữ Liệu MySQL (XAMPP)</h2>
              <p className="text-[11px] text-slate-400">Đồng bộ tự động CRUD vào MySQL, xuất file SQL và sao lưu</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Live MySQL Status & Auto Init */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-100 text-xs">Trạng Thái Kết Nối MySQL Backend</span>
              </div>
              <div className="flex items-center gap-2">
                {dbStatus?.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Đã kết nối MySQL ({dbStatus.tablesCount || 0} bảng)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Sẵn sàng kết nối MySQL (Port 3306)
                  </span>
                )}
                <button
                  onClick={checkStatus}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Kiểm tra lại kết nối"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Tất cả các thao tác <strong>Thêm mới, Chỉnh sửa, Xóa văn bản / công việc</strong> trên giao diện từ bây giờ sẽ được gửi qua REST API Backend và lưu trực tiếp vào cơ sở dữ liệu MySQL <code className="text-emerald-300 font-mono">vanphong_so</code>.
            </p>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="text-[10px] text-slate-400 font-mono">
                Host: <strong>localhost:3306</strong> | User: <strong>root</strong> | DB: <strong>vanphong_so</strong>
              </div>
              <button
                onClick={handleInitDb}
                disabled={isInitializing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isInitializing ? 'Đang khởi tạo...' : '1-Click Tạo Bảng & Nạp Dữ Liệu MySQL'}</span>
              </button>
            </div>

            {initResult && (
              <p
                className={`text-[11px] font-bold p-2 rounded-lg ${
                  initResult.includes('thành công') ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                }`}
              >
                {initResult}
              </p>
            )}
          </div>

          {/* MySQL Box */}
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-700" />
                <h4 className="font-bold text-amber-900 text-xs">Tải File SQL Dump Hoàn Chỉnh (Cho phpMyAdmin)</h4>
              </div>
              <button
                onClick={handleExportSQL}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File .SQL</span>
              </button>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Tải file SQL chứa toàn bộ câu lệnh <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded font-bold">CREATE TABLE</code> và <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded font-bold">INSERT</code> dữ liệu để import thủ công qua <strong>phpMyAdmin</strong> nếu muốn.
            </p>
          </div>

          {/* Export Box */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-indigo-900 text-xs">Sao Lưu Toàn Bộ Dữ Liệu (JSON)</h4>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Xuất file .JSON để lưu trữ dự phòng hoặc mang sang thiết bị khác.
              </p>
            </div>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải JSON</span>
            </button>
          </div>

          {/* Import Box */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-700 text-xs">Khôi Phục Từ Bản Sao Lưu (Paste JSON)</h4>
            <textarea
              rows={2}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Dán nội dung JSON đã sao lưu vào đây..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-mono text-[11px] focus:border-indigo-500"
            ></textarea>
            {importStatus && (
              <p
                className={`text-xs font-bold ${
                  importStatus.includes('thành công') ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {importStatus}
              </p>
            )}
            <button
              onClick={handleImport}
              disabled={!jsonText.trim()}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Khôi Phục Dữ Liệu</span>
            </button>
          </div>

          {/* Reset Box */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-rose-700 text-xs">Khôi Phục Dữ Liệu Mẫu Mặc Định</h4>
              <p className="text-[11px] text-slate-500">Làm mới lại toàn bộ dữ liệu mẫu ban đầu của hệ thống.</p>
            </div>
            <button
              onClick={handleResetMock}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Dữ Liệu</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

