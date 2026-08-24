import React, { useState, useRef } from 'react';
import { User, Task, UserRole } from '../types';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Shield,
  Briefcase,
  Edit,
  Trash2,
  X,
  CheckCircle,
  Clock,
  Upload,
  Camera,
  Image as ImageIcon,
  Key,
  Calendar,
  AlertCircle,
  Building,
  UserCheck,
  Award,
} from 'lucide-react';

interface PersonnelViewProps {
  users: User[];
  tasks: Task[];
  onSaveUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User;
  onOpenTaskDetail: (id: string) => void;
}

export const PersonnelView: React.FC<PersonnelViewProps> = ({
  users,
  tasks,
  onSaveUser,
  onDeleteUser,
  currentUser,
  onOpenTaskDetail,
}) => {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Get distinct departments from existing users
  const departments = Array.from(new Set(users.map((u) => u.department).filter(Boolean)));

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search)) ||
      (u.department && u.department.toLowerCase().includes(search.toLowerCase())) ||
      (u.position && u.position.toLowerCase().includes(search.toLowerCase())) ||
      (u.username && u.username.toLowerCase().includes(search.toLowerCase()));

    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    const matchDept = filterDept === 'ALL' || u.department === filterDept;

    return matchSearch && matchRole && matchDept;
  });

  // Open modal for a BRAND NEW user
  const handleOpenAddModal = () => {
    const newId = 'u-' + Date.now();
    setIsEditingExisting(false);
    setEditingUser({
      id: newId,
      username: '',
      password: '123',
      fullName: '',
      email: '',
      phone: '',
      role: 'STAFF',
      status: 'ACTIVE',
      department: 'Phòng Hành chính - Tổng hợp',
      departmentId: 'dept-1',
      position: 'Chuyên viên',
      positionId: 'pos-4',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      joinDate: new Date().toISOString().split('T')[0],
      bio: '',
    });
    setIsModalOpen(true);
  };

  // Open modal to EDIT an EXISTING user
  const handleOpenEditModal = (u: User) => {
    setIsEditingExisting(true);
    setEditingUser({
      ...u,
      password: u.password || '123',
      joinDate: u.joinDate || new Date().toISOString().split('T')[0],
      status: u.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Process avatar upload from computer (Base64 DataURL saved directly into MySQL)
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditingUser((prev) => ({
        ...prev,
        avatar: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser.fullName || !editingUser.email) {
      alert('Vui lòng nhập Họ tên và Email của cán bộ.');
      return;
    }

    const username =
      editingUser.username?.trim() ||
      editingUser.email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '') ||
      'user_' + Date.now().toString().slice(-4);

    const userToSave: User = {
      id: editingUser.id || 'u-' + Date.now(),
      username,
      password: editingUser.password || '123',
      fullName: editingUser.fullName.trim(),
      email: editingUser.email.trim(),
      phone: editingUser.phone?.trim() || '',
      avatar:
        editingUser.avatar ||
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      department: editingUser.department || 'Phòng Hành chính - Tổng hợp',
      departmentId: editingUser.departmentId || 'dept-1',
      position: editingUser.position || 'Chuyên viên',
      positionId: editingUser.positionId || 'pos-4',
      role: editingUser.role || 'STAFF',
      status: editingUser.status || 'ACTIVE',
      joinDate: editingUser.joinDate || new Date().toISOString().split('T')[0],
      bio: editingUser.bio || '',
    };

    onSaveUser(userToSave);
    setIsModalOpen(false);

    if (selectedUser && selectedUser.id === userToSave.id) {
      setSelectedUser(userToSave);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa cán bộ "${name}" khỏi hệ thống và CSDL MySQL?`)) {
      onDeleteUser(id);
      if (selectedUser && selectedUser.id === id) {
        setSelectedUser(null);
      }
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded text-[10px] border border-purple-200">
            Quản trị hệ thống
          </span>
        );
      case 'LEADER':
        return (
          <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200">
            Lãnh đạo cơ quan
          </span>
        );
      case 'CLERK':
        return (
          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] border border-blue-200">
            Văn thư lưu trữ
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[10px] border border-slate-200">
            Chuyên viên xử lý
          </span>
        );
    }
  };

  const defaultAvatars = [
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Quản Lý Nhân Sự & Danh Mục Cán Bộ</h1>
            <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-indigo-200">
              {users.length} cán bộ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Thêm mới, sửa thông tin cán bộ, tải ảnh đại diện từ máy tính và lưu trữ đồng bộ trực tiếp vào MySQL
          </p>
        </div>

        <button
          id="add-user-btn"
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm Cán Bộ Mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên, username, email, số điện thoại, chức vụ..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 outline-none cursor-pointer"
        >
          <option value="ALL">Tất cả vai trò</option>
          <option value="LEADER">Lãnh đạo cơ quan</option>
          <option value="ADMIN">Quản trị hệ thống</option>
          <option value="CLERK">Văn thư lưu trữ</option>
          <option value="STAFF">Chuyên viên</option>
        </select>

        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 outline-none cursor-pointer"
        >
          <option value="ALL">Tất cả phòng ban</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      {/* Grid of Users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-medium">Không tìm thấy cán bộ nào phù hợp</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const userTasks = tasks.filter((t) => t.assigneeId === u.id || t.coAssigneeIds?.includes(u.id));
            const activeTasks = userTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
            const completedTasks = userTasks.filter((t) => t.status === 'COMPLETED');

            return (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={u.avatar}
                          alt={u.fullName}
                          className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-2xs group-hover:ring-2 group-hover:ring-indigo-400 transition-all"
                        />
                        {u.status === 'ACTIVE' ? (
                          <span className="w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full absolute -bottom-1 -right-1" title="Đang công tác" />
                        ) : (
                          <span className="w-3.5 h-3.5 bg-slate-400 border-2 border-white rounded-full absolute -bottom-1 -right-1" title="Nghỉ / Tạm dừng" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                          {u.fullName}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {u.position || 'Chuyên viên'}
                        </p>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          @{u.username || u.email.split('@')[0]}
                        </div>
                      </div>
                    </div>
                    {getRoleLabel(u.role)}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{u.department || 'Chưa phân phòng ban'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono text-[11px]">{u.email}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-mono text-[11px]">{u.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {/* Workload Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-center mb-3">
                    <div className="bg-indigo-50/60 p-2 rounded-xl border border-indigo-100/50">
                      <div className="font-bold text-indigo-700 text-sm">{activeTasks.length}</div>
                      <div className="text-[10px] text-slate-500">Đang xử lý</div>
                    </div>
                    <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100/50">
                      <div className="font-bold text-emerald-700 text-sm">{completedTasks.length}</div>
                      <div className="text-[10px] text-slate-500">Đã hoàn thành</div>
                    </div>
                  </div>

                  {/* Quick Card Action Buttons */}
                  <div
                    className="flex items-center justify-between pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] text-slate-400">
                      Mật khẩu: <span className="font-mono text-slate-600">{u.password || '123'}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Sửa thông tin cán bộ"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.fullName)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa cán bộ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Detail & Tasks Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="font-bold text-slate-800 text-base">Hồ Sơ Cán Bộ & Nhiệm Vụ</span>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Card */}
              <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.fullName}
                  className="w-18 h-18 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-base text-slate-800 truncate">{selectedUser.fullName}</h3>
                    {getRoleLabel(selectedUser.role)}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    {selectedUser.position} &bull; {selectedUser.department}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-2 font-mono">
                    <span>Tài khoản: <strong>{selectedUser.username || selectedUser.email.split('@')[0]}</strong></span>
                    <span>MK: <strong>{selectedUser.password || '123'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Email công vụ</span>
                  <span className="font-mono text-slate-700 font-semibold">{selectedUser.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Số điện thoại</span>
                  <span className="font-mono text-slate-700 font-semibold">{selectedUser.phone || 'Chưa cập nhật'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ngày vào công tác</span>
                  <span className="text-slate-700 font-semibold">{selectedUser.joinDate || 'Không có'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Trạng thái</span>
                  <span className="text-emerald-700 font-bold">
                    {selectedUser.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
                  </span>
                </div>
              </div>

              {/* Bio if any */}
              {selectedUser.bio && (
                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-xs">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block mb-1">
                    Ghi chú / Chuyên môn
                  </span>
                  <p className="text-slate-700 leading-relaxed">{selectedUser.bio}</p>
                </div>
              )}

              {/* Tasks currently assigned to this user */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Công việc được giao ({tasks.filter((t) => t.assigneeId === selectedUser.id || t.coAssigneeIds?.includes(selectedUser.id)).length})
                  </span>
                </div>

                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.assigneeId === selectedUser.id || t.coAssigneeIds?.includes(selectedUser.id))
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedUser(null);
                          onOpenTaskDetail(t.id);
                        }}
                        className="p-3 bg-slate-50 hover:bg-indigo-50/60 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-mono text-[10px] text-slate-400 font-bold block">
                            #{t.code}
                          </span>
                          <span className="font-bold text-slate-800 truncate block text-xs">{t.title}</span>
                          <span className="text-[10px] text-slate-500">
                            Hạn: {t.dueDate} &bull; Tiến độ: {t.progress}%
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg whitespace-nowrap">
                          {t.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions inside drawer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-6">
              <button
                onClick={() => handleDelete(selectedUser.id, selectedUser.fullName)}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa cán bộ</span>
              </button>

              <button
                onClick={() => {
                  const u = selectedUser;
                  setSelectedUser(null);
                  handleOpenEditModal(u);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Chỉnh sửa thông tin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal with Local Computer Photo Upload */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {isEditingExisting
                      ? `Cập Nhật Thông Tin Cán Bộ: ${editingUser.fullName}`
                      : 'Thêm Cán Bộ Công Chức Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Dữ liệu và ảnh đại diện sẽ được lưu trữ trực tiếp vào cơ sở dữ liệu MySQL
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar">
              {/* Photo & Avatar Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={editingUser.avatar || defaultAvatars[0]}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-200 shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[9px] font-bold mt-1">Đổi ảnh</span>
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh đại diện từ máy tính</span>
                    </button>
                  </div>

                  {/* Preset quick selection */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Hoặc chọn ảnh đại diện mẫu:</span>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                      {defaultAvatars.map((avUrl, i) => (
                        <img
                          key={i}
                          src={avUrl}
                          alt="preset"
                          onClick={() => setEditingUser((prev) => ({ ...prev, avatar: avUrl }))}
                          className={`w-7 h-7 rounded-lg object-cover cursor-pointer border-2 transition-all ${
                            editingUser.avatar === avUrl ? 'border-indigo-600 scale-110 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Họ và tên cán bộ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.fullName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                    placeholder="VD: Nguyễn Văn Hùng"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Vai trò hệ thống <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingUser.role || 'STAFF'}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="STAFF">Chuyên viên xử lý nhiệm vụ</option>
                    <option value="LEADER">Lãnh đạo cơ quan (Ký duyệt, chỉ đạo)</option>
                    <option value="CLERK">Văn thư lưu trữ (Tiếp nhận & Vào sổ)</option>
                    <option value="ADMIN">Quản trị hệ thống cấp cao</option>
                  </select>
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên đăng nhập hệ thống <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.username || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    placeholder="VD: hung.nv hoặc nguyenvana"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mật khẩu đăng nhập
                  </label>
                  <input
                    type="text"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="Mặc định: 123"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email công vụ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="VD: hung.nv@ubnd.gov.vn"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    placeholder="VD: 0912 345 678"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Department & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phòng ban công tác</label>
                  <input
                    type="text"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    placeholder="VD: Phòng Hành chính - Tổng hợp"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức danh / Chức vụ</label>
                  <input
                    type="text"
                    value={editingUser.position || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                    placeholder="VD: Trưởng phòng / Chuyên viên"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Join Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày vào công tác</label>
                  <input
                    type="date"
                    value={editingUser.joinDate || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, joinDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái làm việc</label>
                  <select
                    value={editingUser.status || 'ACTIVE'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="ACTIVE">Đang công tác (Hoạt động)</option>
                    <option value="INACTIVE">Nghỉ việc / Tạm dừng</option>
                  </select>
                </div>
              </div>

              {/* Bio & Specialty */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Giới thiệu tóm tắt / Lĩnh vực chuyên môn phụ trách
                </label>
                <textarea
                  rows={2}
                  value={editingUser.bio || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                  placeholder="Ghi chú về chuyên môn, phân công phụ trách lĩnh vực cụ thể..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isEditingExisting ? 'Lưu Thông Tin Cán Bộ' : 'Tạo & Lưu Vào MySQL'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
