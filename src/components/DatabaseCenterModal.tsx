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
  Settings,
  ShieldCheck,
  HardDrive,
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
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; tablesCount?: number; error?: string; config?: any } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initResult, setInitResult] = useState<string | null>(null);

  // Editable config state
  const [showConfig, setShowConfig] = useState(false);
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3306');
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('vanphong_so');
  const [configSaveMsg, setConfigSaveMsg] = useState<string | null>(null);

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
        if (data.config) {
          setHost(data.config.host || 'localhost');
          setPort(String(data.config.port || 3306));
          setUser(data.config.user || 'root');
          setPassword(data.config.password || '');
          setDatabase(data.config.database || 'vanphong_so');
        }
      }
    } catch {
      setDbStatus({ connected: false, error: 'Không thể kết nối máy chủ backend Node.js' });
    }
  };

  const handleSaveConfigAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaveMsg('Đang kiểm tra kết nối...');
    try {
      const res = await fetch('/api/db-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port: Number(port) || 3306, user, password, database }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigSaveMsg('Đã kết nối thành công tới MySQL!');
        setDbStatus(data.status);
      } else {
        setConfigSaveMsg(`Lỗi kết nối: ${data.status?.error || data.error || 'Kiểm tra lại XAMPP/MySQL'}`);
      }
    } catch (err: any) {
      setConfigSaveMsg(`Lỗi kết nối: ${err.message}`);
    }
  };

  const handleInitDb = async () => {
    setIsInitializing(true);
    setInitResult(null);
    try {
      const res = await fetch('/api/init-db', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setInitResult('Khởi tạo database `vanphong_so`, các bảng và nạp 100% dữ liệu mẫu vào MySQL thành công!');
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
    } catch {
      setImportStatus('Định dạng JSON bị lỗi cú pháp.');
    }
  };

  const handleResetMock = () => {
    if (confirm('Bạn có chắc chắn muốn đặt lại toàn bộ dữ liệu mẫu ban đầu? Các thay đổi sẽ được làm mới.')) {
      db.resetToMockData();
      onDataResetOrRestored();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Quản Trị Cơ Sở Dữ Liệu MySQL</h2>
              <p className="text-[11px] text-slate-400">Đồng bộ tự động CRUD vào MySQL, hỗ trợ ảnh Base64 và sao lưu toàn diện</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs custom-scrollbar">
          {/* Live MySQL Status & Auto Init */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3.5 shadow-md">
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
                    Chờ kết nối ({host}:{port})
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
              Toàn bộ thao tác <strong>Thêm mới nhân sự (kèm Avatar), Văn bản đến/đi, Hồ sơ vụ việc, Công việc</strong> được lưu trữ trực tiếp vào CSDL MySQL <code className="text-emerald-300 font-mono font-bold">{database}</code>.
            </p>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-[11px] text-indigo-300 hover:text-indigo-200 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{showConfig ? 'Ẩn cấu hình MySQL' : 'Chỉnh sửa cấu hình kết nối'}</span>
              </button>

              <button
                onClick={handleInitDb}
                disabled={isInitializing}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isInitializing ? 'Đang khởi tạo...' : '1-Click Tạo Bảng & Nạp Dữ Liệu MySQL'}</span>
              </button>
            </div>

            {/* Editable Config Form */}
            {showConfig && (
              <form onSubmit={handleSaveConfigAndTest} className="mt-3 p-3 bg-slate-800/80 rounded-xl space-y-3 border border-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400 block mb-0.5">Host</label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Port</label>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Database</label>
                    <input
                      type="text"
                      value={database}
                      onChange={(e) => setDatabase(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">User</label>
                    <input
                      type="text"
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="(Trống nếu là root mặc định)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      Lưu & Kiểm tra
                    </button>
                  </div>
                </div>

                {configSaveMsg && (
                  <p className={`text-[11px] font-semibold ${configSaveMsg.includes('thành công') ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {configSaveMsg}
                  </p>
                )}
              </form>
            )}

            {initResult && (
              <p
                className={`text-[11px] font-bold p-2.5 rounded-xl ${
                  initResult.includes('thành công') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {initResult}
              </p>
            )}
          </div>

          {/* MySQL Box */}
          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-700" />
                <h4 className="font-bold text-amber-900 text-xs">Tải File SQL Dump Hoàn Chỉnh (Cho phpMyAdmin / MySQL Workbench)</h4>
              </div>
              <button
                onClick={handleExportSQL}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File .SQL</span>
              </button>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Tải file SQL chứa toàn bộ câu lệnh <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded font-bold">CREATE TABLE</code> và <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded font-bold">INSERT</code> dữ liệu (có hỗ trợ cột avatar <code className="font-mono font-bold">LONGTEXT</code>) để import thủ công qua <strong>phpMyAdmin</strong> nếu muốn.
            </p>
          </div>

          {/* Export Box */}
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-indigo-900 text-xs">Sao Lưu Toàn Bộ Dữ Liệu (JSON)</h4>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Xuất file .JSON để lưu trữ dự phòng hoặc mang sang thiết bị khác.
              </p>
            </div>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
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
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
