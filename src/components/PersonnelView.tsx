import React, { useState } from 'react';
import {
  Contact2,
  Plus,
  Search,
  Mail,
  Phone,
  Building,
  CheckSquare,
  AlertTriangle,
  UserCheck,
  Edit2,
  Trash2,
} from 'lucide-react';
import { User, Task, Role } from '../types';

interface PersonnelViewProps {
  users: User[];
  tasks: Task[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

export const PersonnelView: React.FC<PersonnelViewProps> = ({
  users,
  tasks,
  onAddUser,
  onEditUser,
  onDeleteUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Phòng Công nghệ thông tin');
  const [position, setPosition] = useState('Chuyên viên');
  const [role, setRole] = useState<Role>('STAFF');
  const [phone, setPhone] = useState('');

  const filteredUsers = users.filter((u) => {
    return (
      !searchTerm ||
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getWorkload = (userId: string) => {
    const userTasks = tasks.filter((t) => t.assigneeId === userId);
    const inProgress = userTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'NOT_STARTED').length;
    const overdue = userTasks.filter((t) => t.status === 'OVERDUE').length;
    const completed = userTasks.filter((t) => t.status === 'COMPLETED').length;
    return { total: userTasks.length, inProgress, overdue, completed };
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onEditUser({
        ...editingUser,
        fullName,
        email,
        department,
        position,
        role,
        phone,
      });
      setEditingUser(null);
    } else {
      onAddUser({
        username: email.split('@')[0] || `user_${Date.now()}`,
        fullName,
        email,
        department,
        position,
        role,
        phone,
        avatar: `https://images.unsplash.com/photo-${1534528741775 + (users.length % 5)}?w=100`,
      });
      setShowAddModal(false);
    }
    // reset form
    setFullName('');
    setEmail('');
    setPhone('');
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Contact2 className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Quản Lý Nhân Sự & Phân Công Nhiệm Vụ ({users.length})
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi danh sách cán bộ, phòng ban và giám sát tải lượng công việc đang xử lý của từng cá nhân.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setFullName('');
            setEmail('');
            setPhone('');
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Nhân Sự Mới</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, email, chức danh, phòng ban..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.map((user) => {
          const workload = getWorkload(user.id);
          return (
            <div
              key={user.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100"
                    />
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{user.fullName}</h3>
                      <p className="text-xs text-indigo-600 font-semibold">{user.position}</p>
                      <span className="text-[10px] text-slate-400 font-medium">{user.department}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setFullName(user.fullName);
                        setEmail(user.email);
                        setPhone(user.phone || '');
                        setDepartment(user.department);
                        setPosition(user.position);
                        setRole(user.role);
                        setShowAddModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa nhân sự ${user.fullName}?`)) {
                          onDeleteUser(user.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Workload Stats */}
              <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-lg">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Tải lượng công việc
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Đang làm</span>
                    <span className="font-bold text-amber-600">{workload.inProgress}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Quá hạn</span>
                    <span className="font-bold text-rose-600">{workload.overdue}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Đã xong</span>
                    <span className="font-bold text-emerald-600">{workload.completed}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">
                {editingUser ? 'Cập Nhật Thông Tin Nhân Sự' : 'Thêm Cán Bộ / Nhân Sự Mới'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Họ và tên cán bộ *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nguyenvanan@donvi.gov.vn"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0987654321"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phòng ban</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chức danh / Chức vụ</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Vai trò hệ thống</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                >
                  <option value="STAFF">Chuyên viên / Cán bộ xử lý</option>
                  <option value="CLERK">Văn thư cơ quan</option>
                  <option value="LEADER">Lãnh đạo / Thủ trưởng</option>
                  <option value="ADMIN">Quản trị viên hệ thống</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {editingUser ? 'Lưu Thay Đổi' : 'Thêm Cán Bộ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
