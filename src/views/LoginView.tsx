import React, { useState } from 'react';
import { db } from '../services/db';
import { User } from '../types';
import {
  Lock,
  User as UserIcon,
  ShieldCheck,
  Building2,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Database,
  Sparkles,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const demoAccounts = [
    { username: 'admin', pass: '123', name: 'Đặng Quốc Anh', role: 'Quản trị viên (Admin)', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
    { username: 'hung.nv', pass: '123', name: 'Nguyễn Văn Hùng', role: 'Thủ trưởng / Giám Đốc', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    { username: 'phuong.ttm', pass: '123', name: 'Trần Thị Mai Phương', role: 'Trưởng phòng Kế hoạch', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { username: 'binh.lt', pass: '123', name: 'Lê Thanh Bình', role: 'Văn thư Lưu trữ', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { username: 'yen.vh', pass: '123', name: 'Vũ Hải Yến', role: 'Chuyên viên Tổng hợp', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập hoặc email.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await db.login(username.trim(), password);
      if (res.success && res.user) {
        setSuccess('Đăng nhập thành công! Đang chuyển tiếp vào hệ thống...');
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 500);
      } else {
        setError(res.message || 'Tài khoản hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (acc: { username: string; pass: string }) => {
    setUsername(acc.username);
    setPassword(acc.pass);
    setError(null);
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Dynamic Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -right-40 w-[30rem] h-[30rem] bg-blue-600/25 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Branding & Info Side */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-indigo-400 text-xs font-semibold max-w-max shadow-inner">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Hệ Thống Xác Thực & Quản Trị Cơ Quan Nhà Nước</span>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Văn Phòng Số <span className="text-indigo-400">Gov.vn</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Phần mềm Quản lý Văn bản & Điều hành Công việc Điện tử
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            Hệ thống xác thực tài khoản chính thức kết nối cơ sở dữ liệu MySQL đồng bộ thời gian thực.
            Phân quyền đa tầng bảo mật nghiêm ngặt từ Ban Giám Đốc, Văn Thư, Trưởng Phòng đến Chuyên viên.
          </p>

          {/* Quick Account Suggestions */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4.5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Chọn nhanh tài khoản công vụ mẫu:
              </span>
              <span className="text-[11px] text-slate-500">Mật khẩu mặc định: <code className="text-indigo-300 font-mono">123</code></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className="flex flex-col text-left p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/60 hover:bg-indigo-950/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                      {acc.name}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${acc.badge}`}>
                      {acc.username}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 truncate">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hỗ trợ MySQL Database XAMPP / MariaDB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Phiên làm việc bảo mật cao</span>
            </div>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="lg:col-span-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Đăng nhập tài khoản</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Nhập tên người dùng hoặc email công vụ và mật khẩu của bạn.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs sm:text-sm">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-snug">{error}</div>
              </div>
            )}

            {success && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-xs sm:text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-snug">{success}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tên tài khoản / Email công vụ
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="admin hoặc hung.nv hoặc email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Mật khẩu
                  </label>
                  <span className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer" onClick={() => setPassword('123')}>
                    Quên mật khẩu? (Thử 123)
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Nhập mật khẩu"
                    required
                    className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Đăng nhập hệ thống</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-500">
              Cổng đăng nhập xác thực tập trung &middot; Phiên bản 2.5 Pro
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
