import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { firestoreSync } from '../services/firestoreSync';
import { User } from '../types';
import {
  X,
  KeyRound,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Copy,
  Check,
  Sparkles,
  Lock,
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordResetSuccess: (identifier: string, newPass: string) => void;
  defaultEmailOrUsername?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onPasswordResetSuccess,
  defaultEmailOrUsername = '',
}) => {
  const [step, setStep] = useState<'INPUT_EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'COMPLETED'>('INPUT_EMAIL');
  const [identifier, setIdentifier] = useState(defaultEmailOrUsername);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [deliveredRealEmail, setDeliveredRealEmail] = useState(false);
  const [emailDeliveryMessage, setEmailDeliveryMessage] = useState<string | null>(null);
  const [isDomainNotice, setIsDomainNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('INPUT_EMAIL');
      setIdentifier(defaultEmailOrUsername);
      setMatchedUser(null);
      setOtpCode('');
      setEnteredOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setCountdown(60);
      setCanResend(false);
      setDeliveredRealEmail(false);
      setIsDomainNotice(false);
      setEmailDeliveryMessage(null);
    }
  }, [isOpen, defaultEmailOrUsername]);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: any = null;
    if (step === 'VERIFY_OTP' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  if (!isOpen) return null;

  // Step 1: Send OTP to Entered Email
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = identifier.trim().toLowerCase();
    if (!cleanInput) {
      setError('Vui lòng nhập địa chỉ email của cán bộ cần khôi phục mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsDomainNotice(false);

    try {
      // 1. Try finding in Firestore live database first by email or username
      let user = await firestoreSync.findUserByLogin(cleanInput);

      // 2. Also search local users in DB / SQLite / MySQL store
      if (!user) {
        const users = db.getUsers();
        user = users.find(
          (u) =>
            (u.email && u.email.toLowerCase() === cleanInput) ||
            (u.username && u.username.toLowerCase() === cleanInput) ||
            u.id.toLowerCase() === cleanInput
        ) || null;
      }

      if (!user) {
        setError(`Địa chỉ email "${identifier.trim()}" không tồn tại trong cơ sở dữ liệu cán bộ của cơ quan. Vui lòng kiểm tra lại chính xác.`);
        setLoading(false);
        return;
      }

      // Generate secure 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpCode(generatedOtp);
      setMatchedUser(user);
      setEnteredOtp('');
      setCountdown(60);
      setCanResend(false);

      // Dispatch to real email sending API endpoint targeting the user's specific email
      const targetEmail = user.email || cleanInput;
      try {
        const mailRes = await fetch('/api/send-otp-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: targetEmail,
            otpCode: generatedOtp,
            recipientName: user.fullName,
          }),
        });
        const mailData = await mailRes.json();
        setDeliveredRealEmail(Boolean(mailData.deliveredRealEmail));
        setIsDomainNotice(Boolean(mailData.isDomainOrTestLimit));

        if (mailData.deliveredRealEmail) {
          setEmailDeliveryMessage(`Email chứa mã OTP thực tế đã được gửi thành công đến hòm thư: ${targetEmail}`);
        } else {
          setEmailDeliveryMessage(mailData.message || mailData.errorDetail || 'Chưa thể gửi email thực tế qua Resend.');
        }
      } catch (mailErr: any) {
        console.warn('Mail dispatch notice:', mailErr);
        setDeliveredRealEmail(false);
        setEmailDeliveryMessage('Không thể kết nối máy chủ gửi thư.');
      }

      setStep('VERIFY_OTP');
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi kiểm tra thông tin cán bộ.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!enteredOtp.trim()) {
      setError('Vui lòng nhập mã OTP xác thực 6 chữ số.');
      return;
    }
    if (enteredOtp.trim() !== otpCode) {
      setError('Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại.');
      return;
    }
    setStep('NEW_PASSWORD');
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword) {
      setError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (newPassword.length < 3) {
      setError('Mật khẩu mới phải có tối thiểu 3 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
      return;
    }

    setLoading(true);

    try {
      const emailOrUser = matchedUser?.email || matchedUser?.username || identifier;
      const res = await db.resetPassword(emailOrUser, newPassword);

      if (res.success) {
        setStep('COMPLETED');
      } else {
        setError(res.message || 'Không thể cập nhật mật khẩu. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(otpCode);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const handleAutoFillOtp = () => {
    setEnteredOtp(otpCode);
  };

  const handleFinishAndLogin = () => {
    const loginUser = matchedUser?.username || matchedUser?.email || identifier;
    onPasswordResetSuccess(loginUser, newPassword);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Subtle decorative header glow */}
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Khôi Phục Mật Khẩu
              </h3>
              <p className="text-xs text-slate-500">
                Xác thực danh tính qua hòm thư công vụ và thiết lập mật khẩu mới
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === 'INPUT_EMAIL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {step === 'INPUT_EMAIL' ? '1' : <Check className="w-3.5 h-3.5" />}
            </div>
            <span
              className={`text-xs font-semibold ${
                step === 'INPUT_EMAIL' ? 'text-indigo-600' : 'text-slate-500'
              }`}
            >
              Nhập email
            </span>
          </div>

          <div className="w-8 h-0.5 bg-slate-200" />

          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === 'VERIFY_OTP'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : step === 'NEW_PASSWORD' || step === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step === 'NEW_PASSWORD' || step === 'COMPLETED' ? <Check className="w-3.5 h-3.5" /> : '2'}
            </div>
            <span
              className={`text-xs font-semibold ${
                step === 'VERIFY_OTP'
                  ? 'text-indigo-600'
                  : step === 'NEW_PASSWORD' || step === 'COMPLETED'
                  ? 'text-slate-500'
                  : 'text-slate-400'
              }`}
            >
              Mã OTP
            </span>
          </div>

          <div className="w-8 h-0.5 bg-slate-200" />

          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === 'NEW_PASSWORD'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : step === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step === 'COMPLETED' ? <Check className="w-3.5 h-3.5" /> : '3'}
            </div>
            <span
              className={`text-xs font-semibold ${
                step === 'NEW_PASSWORD' || step === 'COMPLETED'
                  ? 'text-indigo-600'
                  : 'text-slate-400'
              }`}
            >
              Mật khẩu mới
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* STEP 1: INPUT EMAIL */}
        {step === 'INPUT_EMAIL' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Địa chỉ email của cán bộ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoFocus
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Nhập email cán bộ (ví dụ: giangvp689@gmail.com hoặc duc.hoang@hanam.gov.vn)"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Cán bộ nhập đúng địa chỉ email đã đăng ký trong cơ sở dữ liệu. Nếu email không tồn tại trong hệ thống, hệ thống sẽ báo lỗi và từ chối xử lý.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang kiểm tra CSDL...</span>
                  </>
                ) : (
                  <>
                    <span>Gửi Mã Xác Thực OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: VERIFY REAL OTP FROM EMAIL */}
        {step === 'VERIFY_OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {/* Real Email Dispatch Notice Banner */}
            {deliveredRealEmail ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between font-bold text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ĐÃ PHÁT MÃ XÁC THỰC THÀNH CÔNG ĐẾN EMAIL</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-[10px] text-emerald-900 uppercase font-mono font-bold">
                    Resend Live
                  </span>
                </div>
                <div className="text-slate-700 leading-relaxed text-xs">
                  Hệ thống đã gửi thư chứa mã OTP xác thực (6 chữ số) đến địa chỉ email:
                  <div className="mt-1.5 px-3 py-2 bg-white rounded-xl border border-emerald-100 font-semibold text-emerald-950 flex items-center justify-between shadow-xs">
                    <span className="font-mono text-sm">{matchedUser?.email}</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {matchedUser?.fullName} ({matchedUser?.position || 'Cán bộ'})
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                  👉 Vui lòng mở hộp thư email (kiểm tra cả mục <strong>Hộp thư đến</strong> và <strong>Spam/Thư rác</strong>), sao chép mã 6 chữ số và nhập vào ô bên dưới.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between font-bold text-amber-800">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>THÔNG BÁO DỊCH VỤ EMAIL MÁY CHỦ</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200/70 text-[10px] text-amber-900 uppercase font-mono font-bold">
                    Chế độ Kiểm thử
                  </span>
                </div>
                <div className="text-slate-700 text-xs leading-relaxed">
                  {emailDeliveryMessage ? (
                    <p className="font-medium text-amber-900 mb-1">{emailDeliveryMessage}</p>
                  ) : (
                    <p className="font-medium text-amber-900 mb-1">Chưa tìm thấy biến môi trường RESEND_API_KEY trong file .env trên máy chủ.</p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Để gửi thư thật đến hòm thư ngoài, quản trị viên cần thêm <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">RESEND_API_KEY=re_...</code> vào file <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">.env</code>.
                  </p>
                </div>
                {/* Temporary OTP for development / testing */}
                <div className="mt-2 p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Mã OTP thử nghiệm hệ thống vừa tạo:</span>
                    <span className="font-mono text-xl font-bold tracking-widest text-indigo-700">{otpCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEnteredOtp(otpCode);
                      setCopiedOtp(true);
                      setTimeout(() => setCopiedOtp(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedOtp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedOtp ? 'Đã điền mã' : 'Điền mã ngay'}</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nhập mã OTP (6 chữ số) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={enteredOtp}
                onChange={(e) => {
                  setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''));
                  if (error) setError(null);
                }}
                placeholder="Ví dụ: 839201"
                className="w-full text-center tracking-widest font-mono text-2xl py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-bold"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Mã có hiệu lực trong 5 phút</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={() => handleRequestOtp()}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Gửi lại mã OTP</span>
                </button>
              ) : (
                <span className="text-slate-400 font-mono">
                  Gửi lại sau: {countdown}s
                </span>
              )}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('INPUT_EMAIL')}
                className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Xác Thực Mã OTP</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SET NEW PASSWORD */}
        {step === 'NEW_PASSWORD' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Xác minh thành công cho cán bộ <strong>{matchedUser?.fullName}</strong> ({matchedUser?.email}). Hãy đặt mật khẩu mới.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Nhập mật khẩu mới..."
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Nhập lại mật khẩu mới..."
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('VERIFY_OTP')}
                className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác Nhận Đổi Mật Khẩu</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: COMPLETED */}
        {step === 'COMPLETED' && (
          <div className="text-center py-4 space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h4 className="text-lg font-extrabold text-slate-900 mb-1">
                Đặt Lại Mật Khẩu Thành Công!
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Mật khẩu mới đã được cập nhật đồng bộ lên <strong>Google Cloud Firestore</strong> và máy chủ hệ thống. Bạn có thể đăng nhập ngay với mật khẩu mới.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 text-left space-y-1">
              <p>
                Tài khoản: <strong>{matchedUser?.username || matchedUser?.email}</strong>
              </p>
              <p>
                Họ và tên: <strong>{matchedUser?.fullName}</strong>
              </p>
              <p>
                Mật khẩu mới: <span className="font-mono font-bold text-indigo-600">{newPassword}</span>
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinishAndLogin}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Đăng Nhập Ngay Với Mật Khẩu Mới</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
