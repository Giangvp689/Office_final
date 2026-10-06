import React, { useState } from 'react';
import { db } from '../services/db';
import { User } from '../types';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
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
  FileText,
  Sparkles,
  HelpCircle,
  X,
  Server,
  Fingerprint,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập hoặc email công vụ.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu tài khoản.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await db.login(username.trim(), password);
      if (res.success && res.user) {
        setSuccess('Xác thực thành công! Đang chuyển tiếp vào không gian làm việc...');
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 450);
      } else {
        setError(res.message || 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 relative overflow-hidden font-sans text-slate-800">
      {/* Background Decorative Pattern & Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -left-48 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-48 w-[32rem] h-[32rem] bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 w-96 h-96 bg-indigo-900/30 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        {/* Left Side: Administrative Identity & System Overview */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-20 -top-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* National emblem badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-semibold mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cổng Xác Thực Công Vụ Tập Trung</span>
            </div>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3.5 mb-3">
              <div className="relative shrink-0">
                <img
                  src="/src/assets/images/gov_office_logo_1791271698168.jpg"
                  alt="Logo Văn Phòng Số"
                  className="w-13 h-13 rounded-2xl object-cover shadow-xl border border-white/25 ring-2 ring-indigo-400/30"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  VĂN PHÒNG SỐ
                </h1>
                <p className="text-xs text-indigo-300 font-bold tracking-wide uppercase">
                  Điều Hành & Quản Trị Văn Bản
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-4">
              Hệ thống quản lý văn bản đến/đi, tự động trích xuất thực thể, phân luồng điều phối theo mã hồ sơ và giám sát tiến độ công việc toàn cơ quan.
            </p>

            {/* Key System Capabilities */}
            <div className="mt-8 space-y-3.5">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Phân Loại Văn Bản Thông Minh (AI)</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Tự động nhận diện lĩnh vực, độ khẩn, trích xuất thực thể và gợi ý cán bộ thụ lý.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Quản Lý Hồ Sơ & Chu Trình Khép Kín</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Theo dõi xuyên suốt từ văn bản đến, chỉ đạo giao việc, dự thảo văn bản đi đến lưu trữ.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Server className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Cơ Sở Dữ Liệu Thời Gian Thực</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Đồng bộ an toàn CSDL, phân quyền nghiêm ngặt theo chức danh và phòng ban.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Tiêu chuẩn an toàn TT ISO 27001</span>
            <span className="font-mono text-indigo-300">v2.6.2 Enterprise</span>
          </div>
        </div>

        {/* Right Side: Professional Login Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-8 text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2">
                <Fingerprint className="w-3.5 h-3.5" />
                <span>XÁC THỰC CÁN BỘ</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Đăng nhập tài khoản
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                Nhập tên đăng nhập hoặc email công vụ và mật khẩu để bắt đầu phiên làm việc.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs sm:text-sm animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <p className="font-bold">Đăng nhập không thành công</p>
                  <p className="text-rose-700 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs sm:text-sm animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <p className="font-bold">Xác thực thành công</p>
                  <p className="text-emerald-700 mt-0.5">{success}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Tên đăng nhập / Email công vụ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="input-login-username"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Nhập tên đăng nhập hoặc email công vụ"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                  />
                  {username && (
                    <button
                      type="button"
                      onClick={() => setUsername('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Quên mật khẩu?</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="input-login-password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Nhập mật khẩu truy cập"
                    required
                    className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-medium">Ghi nhớ đăng nhập trên thiết bị này</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-submit-login"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang xác thực dữ liệu...</span>
                    </div>
                  ) : (
                    <>
                      <span>Đăng Nhập Vào Hệ Thống</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mã hóa đường truyền an toàn SSL</span>
              </div>
              <span className="font-medium text-slate-400">Cổng dịch vụ số</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal with OTP Email Verification */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        defaultEmailOrUsername=""
        onPasswordResetSuccess={(loginUser, newPass) => {
          setUsername(loginUser);
          setPassword(newPass);
          setSuccess(`Mật khẩu mới đã được cập nhật thành công cho tài khoản ${loginUser}! Vui lòng bấm Đăng Nhập.`);
          setError(null);
        }}
      />
    </div>
  );
};
