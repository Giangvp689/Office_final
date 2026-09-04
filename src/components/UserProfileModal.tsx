import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import {
  X,
  User as UserIcon,
  KeyRound,
  Camera,
  Upload,
  Phone,
  Mail,
  Building,
  Briefcase,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  FileText,
  Save,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSaveProfile: (updatedUser: User) => void;
  initialTab?: 'PROFILE' | 'PASSWORD';
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
  initialTab = 'PROFILE',
}) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PASSWORD'>(initialTab);

  // Profile fields state
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(
    currentUser?.avatar || AVATAR_PRESETS[0]
  );
  const [avatarUrlInput, setAvatarUrlInput] = useState('');

  // Password fields state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever currentUser or initialTab changes
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPhone(currentUser.phone || '');
      setBio(currentUser.bio || '');
      setAvatar(currentUser.avatar || AVATAR_PRESETS[0]);
    }
    setActiveTab(initialTab);
    setError(null);
    setSuccess(null);
  }, [currentUser, initialTab, isOpen]);

  if (!isOpen) return null;

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh không được vượt quá 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatar(result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Profile Information
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedUser: User = {
        ...currentUser,
        fullName: fullName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        avatar: avatar || currentUser.avatar,
      };

      onSaveProfile(updatedUser);
      setSuccess('Đã cập nhật thông tin cá nhân thành công!');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu thông tin cá nhân.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword) {
      setError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (newPassword.length < 3) {
      setError('Mật khẩu mới phải có ít nhất 3 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!currentUser?.id) {
        setError('Không tìm thấy tài khoản người dùng.');
        return;
      }
      const res = await db.changePassword(currentUser.id, oldPassword, newPassword);
      if (res.success) {
        setSuccess('Đổi mật khẩu tài khoản thành công!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 1200);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs">
              {activeTab === 'PROFILE' ? <UserIcon className="w-4.5 h-4.5" /> : <KeyRound className="w-4.5 h-4.5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {activeTab === 'PROFILE' ? 'Thông Tin Cá Nhân & Hồ Sơ' : 'Đổi Mật Khẩu Tài Khoản'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {currentUser?.fullName} (@{currentUser?.username || currentUser?.email?.split('@')[0]})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-4 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('PROFILE');
              setError(null);
              setSuccess(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PROFILE'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Thông Tin Cá Nhân</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('PASSWORD');
              setError(null);
              setSuccess(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PASSWORD'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Đổi Mật Khẩu</span>
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Status Banners */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {activeTab === 'PROFILE' ? (
            <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Section */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                <label className="block text-xs font-bold text-slate-700 mb-2.5">
                  Ảnh đại diện cá nhân
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group shrink-0">
                    <img
                      src={avatar}
                      alt="Avatar preview"
                      className="w-18 h-18 rounded-2xl object-cover border-2 border-indigo-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                      title="Nhấp để tải ảnh mới từ máy tính"
                    >
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Đổi ảnh</span>
                    </button>
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Tải ảnh từ máy tính</span>
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        Hoặc chọn nhanh ảnh mẫu có sẵn:
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        {AVATAR_PRESETS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAvatar(p)}
                            className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                              avatar === p
                                ? 'border-indigo-600 ring-2 ring-indigo-200 scale-105'
                                : 'border-slate-200 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={p} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên cán bộ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912.345.678"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bio / Giới thiệu */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Giới thiệu bản thân & Chuyên môn phụ trách
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {bio.length} ký tự
                  </span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Giới thiệu vắn tắt về kinh nghiệm công tác, nhiệm vụ chuyên trách, lĩnh vực phụ trách trong cơ quan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all leading-relaxed custom-scrollbar"
                />
              </div>

              {/* Organizational Info (System Managed) */}
              <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    Thông tin chức danh & Phân công
                  </span>
                  <span className="text-[10px] text-slate-400 italic">
                    (Cơ quan quản trị)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Tài khoản</span>
                    <span className="font-mono text-slate-700 font-bold">
                      @{currentUser?.username || currentUser?.email?.split('@')[0]}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Email công vụ</span>
                    <span className="font-mono text-slate-700 font-bold truncate block" title={currentUser?.email}>
                      {currentUser?.email}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Phòng ban</span>
                    <span className="text-slate-800 font-medium truncate block">
                      {currentUser?.department || 'Chưa phân phòng'}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Chức vụ & Vai trò</span>
                    <span className="text-slate-800 font-medium truncate block">
                      {currentUser?.position || 'Chuyên viên'} ({currentUser?.role})
                    </span>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <form id="password-form" onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại (mặc định: 123)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-indigo-500 transition-all font-mono pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (tối thiểu 3 ký tự)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-indigo-500 transition-all font-mono pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  required
                />
              </div>

              <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                <strong>Lưu ý bảo mật:</strong> Mật khẩu mới sẽ được cập nhật đồng bộ vào hệ thống và CSDL. Sau khi đổi mật khẩu thành công, bạn có thể dùng mật khẩu mới này cho những lần đăng nhập sau.
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          {activeTab === 'PROFILE' ? (
            <button
              type="submit"
              form="profile-form"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          ) : (
            <button
              type="submit"
              form="password-form"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{loading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
