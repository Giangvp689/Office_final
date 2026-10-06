import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertTriangle,
  AlertCircle,
  FileJson,
  FileCode,
  Server,
  RefreshCw,
  Zap,
  Settings,
  ShieldCheck,
  HardDrive,
  Flame,
  Cloud,
  Mail,
  Send,
} from 'lucide-react';
import { db } from '../services/db';
import { firestoreSync } from '../services/firestoreSync';

import { User } from '../types';
import { isLeaderOrAdmin } from '../utils/permission';

interface DatabaseCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataResetOrRestored: () => void;
  currentUser?: User;
}

export const DatabaseCenterModal: React.FC<DatabaseCenterModalProps> = ({
  isOpen,
  onClose,
  onDataResetOrRestored,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'FIREBASE' | 'MYSQL' | 'EMAIL' | 'BACKUP'>('FIREBASE');
  const [jsonText, setJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; tablesCount?: number; error?: string; config?: any } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initResult, setInitResult] = useState<string | null>(null);

  // Email status & test
  const [emailStatus, setEmailStatus] = useState<{
    isConfigured: boolean;
    sender: string;
    maskedKey: string;
    domain: string;
  } | null>(null);
  const [testEmailTo, setTestEmailTo] = useState(currentUser?.email || 'giangvp689@gmail.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Firebase status
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState(false);
  const [isFirebasePulling, setIsFirebasePulling] = useState(false);
  const [firebaseSyncMsg, setFirebaseSyncMsg] = useState<string | null>(null);
  const [firestoreConnected, setFirestoreConnected] = useState(false);

  // Editable config state
  const [showConfig, setShowConfig] = useState(false);
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3306');
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('vanphong_so');
  const [configSaveMsg, setConfigSaveMsg] = useState<string | null>(null);
  const [rulesCopied, setRulesCopied] = useState(false);
  const [dataSourceMode, setDataSourceModeState] = useState<'FIREBASE_ONLY' | 'MYSQL' | 'HYBRID'>(() => db.getDataSourceMode());

  const handleToggleMode = (newMode: 'FIREBASE_ONLY' | 'MYSQL') => {
    db.setDataSourceMode(newMode);
    setDataSourceModeState(newMode);
    if (newMode === 'FIREBASE_ONLY') {
      setActiveTab('FIREBASE');
    }
    onDataResetOrRestored();
  };

  const handleCopyRules = () => {
    const rulesCode = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
    navigator.clipboard.writeText(rulesCode);
    setRulesCopied(true);
    setTimeout(() => setRulesCopied(false), 3000);
  };

  const checkEmailStatus = async () => {
    try {
      const res = await fetch('/api/email-status');
      if (res.ok) {
        const data = await res.json();
        setEmailStatus(data);
      }
    } catch {
      setEmailStatus(null);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo.trim()) return;
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: testEmailTo.trim() }),
      });
      const data = await res.json();
      setTestEmailResult({
        success: data.success,
        message: data.message || (data.success ? 'Đã gửi thành công!' : 'Thất bại'),
      });
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err.message || 'Lỗi mạng khi kết nối máy chủ gửi email.',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      checkFirebase();
      checkEmailStatus();
      if (currentUser?.email) {
        setTestEmailTo(currentUser.email);
      }
    }
  }, [isOpen]);

  const checkFirebase = async () => {
    const isConn = await firestoreSync.checkConnection();
    setFirestoreConnected(isConn);
  };

  const handleSyncToFirebase = async () => {
    setIsFirebaseSyncing(true);
    setFirebaseSyncMsg(null);
    try {
      const result = await db.syncAllToFirestore();
      if (result.success) {
        setFirebaseSyncMsg('Đã đồng bộ toàn bộ dữ liệu mẫu & hiện tại lên Firebase Firestore thành công!');
        setFirestoreConnected(true);
        onDataResetOrRestored();
      } else {
        setFirebaseSyncMsg(`Lỗi đồng bộ Firebase: ${result.error}`);
      }
    } catch (err: any) {
      setFirebaseSyncMsg(`Lỗi đồng bộ: ${err.message || err}`);
    } finally {
      setIsFirebaseSyncing(false);
    }
  };

  const handlePullFromFirebase = async () => {
    setIsFirebasePulling(true);
    setFirebaseSyncMsg(null);
    try {
      const data = await firestoreSync.fetchAllFromFirestore();
      if (data) {
        if (data.users && data.users.length > 0) {
          localStorage.setItem('qlvb_users_v2', JSON.stringify(data.users));
        }
        if (data.tasks && data.tasks.length > 0) {
          localStorage.setItem('qlvb_tasks_v2', JSON.stringify(data.tasks));
        }
        if (data.incomingDocs && data.incomingDocs.length > 0) {
          localStorage.setItem('qlvb_incoming_docs_v2', JSON.stringify(data.incomingDocs));
        }
        if (data.outgoingDocs && data.outgoingDocs.length > 0) {
          localStorage.setItem('qlvb_outgoing_docs_v2', JSON.stringify(data.outgoingDocs));
        }
        if (data.dossiers && data.dossiers.length > 0) {
          localStorage.setItem('qlvb_dossiers_v2', JSON.stringify(data.dossiers));
        }
        if (data.attachments && data.attachments.length > 0) {
          localStorage.setItem('qlvb_attachments_v2', JSON.stringify(data.attachments));
        }
        if (data.notifications && data.notifications.length > 0) {
          localStorage.setItem('qlvb_notifications_v2', JSON.stringify(data.notifications));
        }
        if (data.masterData) {
          localStorage.setItem('qlvb_master_data_v2', JSON.stringify(data.masterData));
        }
        if (data.auditLogs && data.auditLogs.length > 0) {
          localStorage.setItem('qlvb_audit_logs_v2', JSON.stringify(data.auditLogs.slice(0, 500)));
        }
        setFirebaseSyncMsg(`✓ Đã tải và cập nhật thành công ${data.tasks?.length || 0} công việc/nhiệm vụ, ${data.incomingDocs?.length || 0} văn bản đến từ Firebase Firestore!`);
        setFirestoreConnected(true);
        onDataResetOrRestored();
      } else {
        setFirebaseSyncMsg('Không nhận được dữ liệu từ Firestore hoặc Firestore chưa có bản ghi.');
      }
    } catch (err: any) {
      setFirebaseSyncMsg(`Lỗi khi tải từ Firestore: ${err.message || err}`);
    } finally {
      setIsFirebasePulling(false);
    }
  };

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

  if (!isOpen || (currentUser && !isLeaderOrAdmin(currentUser))) return null;

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
              <h2 className="font-bold text-slate-800 text-sm">Trung Tâm Quản Trị Cơ Sở Dữ Liệu</h2>
              <p className="text-[11px] text-slate-400">Quản trị kết nối Firebase Cloud, MySQL và sao lưu dữ liệu</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Banner: Pure Firebase vs MySQL */}
        <div className="px-6 py-3 bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-indigo-50/50 border-b border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                dataSourceMode === 'FIREBASE_ONLY' ? 'bg-orange-500 text-white shadow-xs' : 'bg-indigo-600 text-white shadow-xs'
              }`}
            >
              {dataSourceMode === 'FIREBASE_ONLY' ? <Flame className="w-4 h-4 fill-white/20" /> : <Server className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-800 text-xs">Chế độ Cơ Sở Dữ Liệu:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    dataSourceMode === 'FIREBASE_ONLY'
                      ? 'bg-orange-100 text-orange-800 border border-orange-300'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                  }`}
                >
                  {dataSourceMode === 'FIREBASE_ONLY' ? '🔥 100% Google Firebase Cloud' : '🐬 Kết nối MySQL Server'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {dataSourceMode === 'FIREBASE_ONLY'
                  ? 'Ứng dụng chỉ lấy và lưu dữ liệu trực tiếp qua Google Firestore, không qua MySQL.'
                  : 'Ứng dụng kết nối tới máy chủ CSDL MySQL.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => handleToggleMode('FIREBASE_ONLY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dataSourceMode === 'FIREBASE_ONLY'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Chỉ Dùng Firebase
            </button>
            <button
              onClick={() => handleToggleMode('MYSQL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dataSourceMode === 'MYSQL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Kèm MySQL
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-white border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('FIREBASE')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'FIREBASE'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Firebase Firestore (Online)</span>
          </button>
          <button
            onClick={() => setActiveTab('MYSQL')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'MYSQL'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-indigo-600" />
            <span>MySQL Backend (Offline/Local)</span>
          </button>
          <button
            onClick={() => setActiveTab('EMAIL')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'EMAIL'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Email Resend ({emailStatus?.isConfigured ? 'Hoạt động' : 'Chưa bật'})</span>
          </button>
          <button
            onClick={() => setActiveTab('BACKUP')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'BACKUP'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-slate-600" />
            <span>Sao Lưu & Khôi Phục</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs custom-scrollbar">
          {activeTab === 'FIREBASE' && (
            <div className="space-y-4">
              {/* Live Firebase Cloud Status */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl space-y-3.5 shadow-md border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="font-bold text-slate-100 text-xs">Cơ Sở Dữ Liệu Firebase Cloud Firestore</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {firestoreConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Đã kết nối Firestore Cloud (Online)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Đang kết nối Firestore...
                      </span>
                    )}
                    <button
                      onClick={checkFirebase}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
                      title="Kiểm tra lại kết nối Firestore"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Hệ thống đã tích hợp <strong>Google Firebase Firestore</strong> theo thời gian thực (Realtime Sync). Khi có văn bản, hồ sơ, nhiệm vụ hoặc thay đổi trạng thái, dữ liệu được tự động đồng bộ ngay lập tức mà không cần F5.
                </p>

                <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-slate-400">
                      Project Firebase hiện tại: <strong className="text-emerald-400 font-mono">documentai-7f924</strong> <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">DocumentAI</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Email quản trị: <strong className="text-orange-300">Giangvp689@gmail.com</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handlePullFromFirebase}
                      disabled={isFirebasePulling}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-100 font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm border border-slate-600"
                      title="Kéo toàn bộ nhiệm vụ, văn bản đến/đi từ Firebase Firestore về trình duyệt này"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isFirebasePulling ? 'Đang tải...' : 'Tải Dữ Liệu Từ Firestore Về'}</span>
                    </button>

                    <button
                      onClick={handleSyncToFirebase}
                      disabled={isFirebaseSyncing}
                      className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isFirebaseSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Lên Firestore'}</span>
                    </button>
                  </div>
                </div>

                {firebaseSyncMsg && (
                  <div className="space-y-3">
                    <p
                      className={`text-[11px] font-bold p-2.5 rounded-xl ${
                        firebaseSyncMsg.includes('thành công')
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {firebaseSyncMsg}
                    </p>

                    {firebaseSyncMsg.includes('Missing or insufficient permissions') && (
                      <div className="bg-amber-950/80 border border-amber-600/70 p-3 rounded-xl flex items-center justify-between gap-3 text-amber-200 text-xs shadow-inner">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>Chưa mở quyền ghi Firestore trên Firebase Console.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyRules}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shrink-0"
                        >
                          {rulesCopied ? '✓ Đã chép Rules' : 'Sao chép Rules'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Collection stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Cán bộ (users)</div>
                  <div className="text-lg font-black text-slate-800 mt-0.5">{db.getUsers().length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">VB Đến (incoming)</div>
                  <div className="text-lg font-black text-indigo-700 mt-0.5">{db.getIncomingDocs().length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">VB Đi (outgoing)</div>
                  <div className="text-lg font-black text-blue-700 mt-0.5">{db.getOutgoingDocs().length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Nhiệm vụ (tasks)</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">{db.getTasks().length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Hồ sơ (dossiers)</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5">{db.getDossiers().length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Tệp (attachments)</div>
                  <div className="text-lg font-black text-purple-700 mt-0.5">{db.getAttachments().length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Thông báo</div>
                  <div className="text-lg font-black text-rose-700 mt-0.5">{db.getNotifications().length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Nhật ký (audit)</div>
                  <div className="text-lg font-black text-slate-700 mt-0.5">{db.getAuditLogs().length}</div>
                </div>
              </div>

              {/* Instructions on Pure Firebase Mode */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ưu điểm khi chỉ sử dụng Firebase Cloud (Không qua MySQL):</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-emerald-800 leading-relaxed">
                  <li><strong>Không cần cài MySQL/XAMPP:</strong> Dữ liệu được lưu trữ trực tiếp trên đám mây Google Firestore an toàn, không lo lỗi cổng 3306 hay máy chủ offline.</li>
                  <li><strong>Đồng bộ tức thì (Realtime):</strong> Khi chuyên viên hoặc lãnh đạo ký duyệt, giao việc hay cập nhật tiến độ, tất cả người dùng khác sẽ nhận ngay mà không cần tải lại trang.</li>
                  <li><strong>Lưu trữ liên tục &amp; độc lập:</strong> Hoạt động ngay cả khi triển khai trên Vercel, Cloud Run hay máy cục bộ.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'MYSQL' && (
            <div className="space-y-4">
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
                  Kết nối máy chủ MySQL cơ sở dữ liệu.
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

              {/* Export SQL Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Xuất File SQL Dump</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tải tệp .SQL cấu trúc và dữ liệu cho MySQL.
                  </p>
                </div>
                <button
                  onClick={handleExportSQL}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải File .SQL</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'BACKUP' && (
            <div className="space-y-4">
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
                  rows={3}
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
          )}

          {activeTab === 'EMAIL' && (
            <div className="space-y-4">
              {/* Resend Service Status Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl space-y-3 shadow-md border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-sm">Dịch Vụ Gửi Email (Resend REST API)</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                      emailStatus?.isConfigured
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${emailStatus?.isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {emailStatus?.isConfigured ? 'ĐÃ CẤU HÌNH API KEY' : 'CHƯA CẤU HÌNH .ENV'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-slate-400 block">Địa chỉ người gửi (RESEND_FROM):</span>
                    <span className="font-mono font-bold text-slate-200">{emailStatus?.sender || 'vanban@trg.id.vn'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-slate-400 block">Khóa API (RESEND_API_KEY):</span>
                    <span className="font-mono font-bold text-slate-200">
                      {emailStatus?.isConfigured ? emailStatus.maskedKey : 'Chưa thiết lập'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Dịch vụ Resend phục vụ tính năng gửi mã OTP quên mật khẩu và các thông báo văn bản khẩn đến email cán bộ.
                </p>
              </div>

              {/* Test Email Dispatch Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Kiểm Tra Gửi Email Thật Ngay Lập Tức</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Kiểm tra kết nối trực tiếp với máy chủ Resend</span>
                </div>

                <form onSubmit={handleSendTestEmail} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Địa chỉ email nhận thư thử nghiệm:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        value={testEmailTo}
                        onChange={(e) => setTestEmailTo(e.target.value)}
                        placeholder="Ví dụ: giangvp689@gmail.com"
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isSendingTestEmail || !testEmailTo.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                      >
                        {isSendingTestEmail ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Đang gửi...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Gửi Thử Nghiệm</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {testEmailResult && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-start gap-2 animate-in fade-in ${
                        testEmailResult.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {testEmailResult.success ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5 leading-snug">
                        <span className="font-bold">{testEmailResult.success ? 'Thành công:' : 'Thất bại:'} </span>
                        <span>{testEmailResult.message}</span>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Step by step configuration guide */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/60 space-y-2 text-slate-700 text-xs">
                <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Hướng Dẫn Cấu Hình Resend & Tên Miền trg.id.vn</span>
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed">
                  <li>
                    Đăng nhập tài khoản Resend tại <strong className="font-mono text-blue-800">resend.com/emails</strong> (tài khoản <strong className="font-mono">giangvp689</strong>).
                  </li>
                  <li>
                    Vào menu <strong>API Keys</strong> &gt; Tạo khóa mới (Permission: <em>Full Access</em> hoặc <em>Sending Access</em>) và sao chép mã khóa dạng <code className="bg-white px-1 py-0.5 rounded font-mono text-indigo-700">re_...</code>.
                  </li>
                  <li>
                    Thêm biến vào file <code className="bg-white px-1 py-0.5 rounded font-mono text-indigo-700">.env</code> trên máy chủ:
                    <div className="mt-1 p-2 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[10px]">
                      RESEND_API_KEY=re_your_api_key_here<br />
                      RESEND_FROM=vanban@trg.id.vn
                    </div>
                  </li>
                  <li>
                    Vào mục <strong>Domains</strong> trên Resend, kiểm tra xem tên miền <strong className="font-mono">trg.id.vn</strong> đã có trạng thái <strong>Verified</strong> (Đã xác thực DNS DKIM/SPF) chưa.
                    <span className="block text-slate-500 mt-0.5">*(Nếu tên miền chưa xác thực, Resend chỉ cho phép gửi thử đến email chính của tài khoản giangvp689@gmail.com)*</span>
                  </li>
                </ol>
              </div>
            </div>
          )}
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
