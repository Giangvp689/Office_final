import React, { useState } from 'react';
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase()) ||
      u.position.toLowerCase().includes(search.toLowerCase());

    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleOpenAddModal = () => {
    setEditingUser({
      id: 'u-' + Date.now(),
      username: `user_${Date.now().toString().slice(-4)}`,
      fullName: '',
      email: '',
      phone: '0901234567',
      role: 'STAFF',
      department: 'Phòng Hành chính - Tổng hợp',
      position: 'Chuyên viên',
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser({ ...u });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.fullName || !editingUser.email) return;

    onSaveUser(editingUser as User);
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded text-[10px]">Quản trị hệ thống</span>;
      case 'LEADER':
        return <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px]">Lãnh đạo cơ quan</span>;
      case 'CLERK':
        return <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">Văn thư lưu trữ</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[10px]">Chuyên viên</span>;
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quản Lý Nhân Sự & Phân Quyền</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách cán bộ công chức, phòng ban, chức vụ và theo dõi khối lượng công việc được giao
          </p>
        </div>

        <button
          id="add-user-btn"
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm cán bộ mới</span>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên, email, phòng ban, chức vụ..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="ALL">Tất cả vai trò</option>
          <option value="LEADER">Lãnh đạo</option>
          <option value="ADMIN">Quản trị</option>
          <option value="CLERK">Văn thư</option>
          <option value="STAFF">Chuyên viên</option>
        </select>
      </div>

      {/* Grid of Users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.map((u) => {
          const userTasks = tasks.filter((t) => t.assigneeId === u.id);
          const activeTasks = userTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
          const completedTasks = userTasks.filter((t) => t.status === 'COMPLETED');

          return (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar}
                      alt={u.fullName}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                    />
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {u.fullName}
                      </h3>
                      <p className="text-[11px] text-slate-500">{u.position}</p>
                    </div>
                  </div>
                  {getRoleLabel(u.role)}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{u.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-mono text-[11px]">{u.email}</span>
                  </div>
                </div>
              </div>

              <div>
                {/* Workload Stats */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-center">
                  <div className="bg-indigo-50/60 p-2 rounded-lg">
                    <div className="font-bold text-indigo-700 text-sm">{activeTasks.length}</div>
                    <div className="text-[10px] text-slate-500">Đang xử lý</div>
                  </div>
                  <div className="bg-emerald-50/60 p-2 rounded-lg">
                    <div className="font-bold text-emerald-700 text-sm">{completedTasks.length}</div>
                    <div className="text-[10px] text-slate-500">Đã hoàn thành</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Detail & Tasks Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <span className="font-bold text-slate-800 text-base">Hồ Sơ Cán Bộ</span>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs flex-1">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.fullName}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-bold text-base text-slate-800">{selectedUser.fullName}</h3>
                  <p className="text-xs text-slate-500">{selectedUser.position} - {selectedUser.department}</p>
                  <div className="mt-2">{getRoleLabel(selectedUser.role)}</div>
                </div>
              </div>

              {/* Tasks currently assigned to this user */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800">
                    Công việc đang phụ trách ({tasks.filter((t) => t.assigneeId === selectedUser.id).length})
                  </span>
                </div>

                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.assigneeId === selectedUser.id)
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedUser(null);
                          onOpenTaskDetail(t.id);
                        }}
                        className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-lg border border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-mono text-[10px] text-slate-400 font-bold block">
                            #{t.code}
                          </span>
                          <span className="font-bold text-slate-800 truncate block">{t.title}</span>
                          <span className="text-[10px] text-slate-500">
                            Hạn: {new Date(t.dueDate).toLocaleDateString('vi-VN')} | Tiến độ: {t.progress}%
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                          {t.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  const u = selectedUser;
                  setSelectedUser(null);
                  handleOpenEditModal(u);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Chỉnh sửa thông tin cán bộ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingUser.id?.startsWith('u-') && !users.some((u) => u.id === editingUser.id)
                  ? 'Thêm Cán Bộ Mới'
                  : `Cập Nhật Cán Bộ: ${editingUser.fullName}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên cán bộ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.fullName || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email công vụ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phòng ban</label>
                  <input
                    type="text"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức vụ</label>
                  <input
                    type="text"
                    value={editingUser.position || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.username || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    placeholder="VD: hung.nv"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
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
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vai trò hệ thống</label>
                <select
                  value={editingUser.role || 'STAFF'}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="STAFF">Chuyên viên xử lý</option>
                  <option value="LEADER">Lãnh đạo cơ quan (Ký duyệt, đôn đốc)</option>
                  <option value="CLERK">Văn thư lưu trữ (Vào sổ văn bản)</option>
                  <option value="ADMIN">Quản trị hệ thống</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
                >
                  Lưu cán bộ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
