import React, { useState } from 'react';
import {
  X,
  Inbox,
  Send,
  CheckSquare,
  FolderArchive,
  Plus,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { User, Dossier, MasterData, UrgencyLevel, TaskPriority } from '../types';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  dossiers: Dossier[];
  masterData: MasterData;
  currentUser: User;
  onSaveIncomingDoc: (doc: any) => void;
  onSaveOutgoingDoc: (doc: any) => void;
  onSaveTask: (task: any) => void;
  onSaveDossier: (dossier: any) => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  users,
  dossiers,
  masterData,
  currentUser,
  onSaveIncomingDoc,
  onSaveOutgoingDoc,
  onSaveTask,
  onSaveDossier,
}) => {
  const [activeTab, setActiveTab] = useState<'INCOMING' | 'OUTGOING' | 'TASK' | 'DOSSIER'>('INCOMING');

  // Form states - Incoming Doc
  const [incDocNum, setIncDocNum] = useState('');
  const [incOfficialNum, setIncOfficialNum] = useState('');
  const [incAuthority, setIncAuthority] = useState(masterData.authorities[0]?.name || 'UBND Tỉnh');
  const [incDocType, setIncDocType] = useState(masterData.documentTypes[0]?.name || 'Công văn');
  const [incSummary, setIncSummary] = useState('');
  const [incUrgency, setIncUrgency] = useState<UrgencyLevel>('THUONG');
  const [incAssigneeId, setIncAssigneeId] = useState(users[0]?.id || '');
  const [incDueDate, setIncDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [incDossierId, setIncDossierId] = useState(dossiers[0]?.code || '');

  // Form states - Outgoing Doc
  const [outDocNum, setOutDocNum] = useState('');
  const [outRecipient, setOutRecipient] = useState('');
  const [outDocType, setOutDocType] = useState(masterData.documentTypes[0]?.name || 'Công văn');
  const [outSummary, setOutSummary] = useState('');
  const [outDrafterId, setOutDrafterId] = useState(currentUser.id);
  const [outSignerId, setOutSignerId] = useState(users.find((u) => u.role === 'LEADER')?.id || users[0]?.id || '');
  const [outDossierId, setOutDossierId] = useState(dossiers[0]?.code || '');

  // Form states - Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState(users[0]?.id || '');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState(new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]);
  const [taskDossierId, setTaskDossierId] = useState(dossiers[0]?.code || '');

  // Form states - Dossier
  const [dosCode, setDosCode] = useState(`HS-2025-${Math.floor(Math.random() * 900 + 100)}`);
  const [dosTitle, setDosTitle] = useState('');
  const [dosDepartment, setDosDepartment] = useState('Phòng Công nghệ thông tin');
  const [dosDescription, setDosDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'INCOMING') {
      onSaveIncomingDoc({
        documentNumber: incDocNum || ` đến-${Math.floor(Math.random() * 900 + 100)}`,
        officialNumber: incOfficialNum || `Số ${Math.floor(Math.random() * 500 + 1)}/UBND-VP`,
        issuingAuthority: incAuthority,
        issueDate: new Date().toISOString().split('T')[0],
        receivedDate: new Date().toISOString().split('T')[0],
        docType: incDocType,
        summary: incSummary,
        urgency: incUrgency,
        securityLevel: 'THUONG',
        assigneeId: incAssigneeId,
        dueDate: incDueDate,
        dossierId: incDossierId,
        status: 'PROCESSING',
        attachments: [
          {
            name: `Van_ban_den_${incDocNum || 'Scan'}.pdf`,
            url: '#',
            size: '1.8 MB',
          },
        ],
      });
    } else if (activeTab === 'OUTGOING') {
      onSaveOutgoingDoc({
        documentNumber: outDocNum || `${Math.floor(Math.random() * 500 + 1)}/UBND-TH`,
        docType: outDocType,
        recipient: outRecipient,
        summary: outSummary,
        drafterId: outDrafterId,
        signerId: outSignerId,
        releaseDate: new Date().toISOString().split('T')[0],
        dossierId: outDossierId,
        status: 'DRAFT',
        attachments: [
          {
            name: `Du_thao_van_ban_di_${outDocNum || 'Moi'}.docx`,
            url: '#',
            size: '1.2 MB',
          },
        ],
      });
    } else if (activeTab === 'TASK') {
      onSaveTask({
        code: `CV-2025-${Math.floor(Math.random() * 900 + 100)}`,
        title: taskTitle,
        description: taskDescription,
        creatorId: currentUser.id,
        assigneeId: taskAssigneeId,
        dossierId: taskDossierId,
        priority: taskPriority,
        startDate: new Date().toISOString().split('T')[0],
        dueDate: taskDueDate,
        status: 'IN_PROGRESS',
        progress: 0,
        subTasks: [
          { id: 'st_1', title: 'Thu thập tài liệu và rà soát quy định', completed: false },
          { id: 'st_2', title: 'Soạn thảo báo cáo kết quả và trình duyệt', completed: false },
        ],
        comments: [],
        attachments: [],
      });
    } else if (activeTab === 'DOSSIER') {
      onSaveDossier({
        code: dosCode,
        title: dosTitle,
        department: dosDepartment,
        description: dosDescription,
        creatorId: currentUser.id,
        startDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        tags: ['Hồ sơ vụ việc', '2025'],
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              +
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Tạo Mới Nghiệp Vụ Hành Chính</h2>
              <p className="text-[11px] text-slate-400">Chọn loại nội dung bạn muốn lập vào hệ thống</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Type Selector */}
        <div className="grid grid-cols-4 p-3 bg-slate-100/70 gap-2 border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('INCOMING')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'INCOMING' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span className="truncate">Văn bản đến</span>
          </button>
          <button
            onClick={() => setActiveTab('OUTGOING')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'OUTGOING' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Send className="w-4 h-4" />
            <span className="truncate">Văn bản đi</span>
          </button>
          <button
            onClick={() => setActiveTab('TASK')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'TASK' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="truncate">Giao việc</span>
          </button>
          <button
            onClick={() => setActiveTab('DOSSIER')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'DOSSIER' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span className="truncate">Mã hồ sơ</span>
          </button>
        </div>

        {/* Dynamic Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: INCOMING DOC */}
          {activeTab === 'INCOMING' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số đến nội bộ *</label>
                  <input
                    type="text"
                    required
                    value={incDocNum}
                    onChange={(e) => setIncDocNum(e.target.value)}
                    placeholder="VD: 142/Đ-2025"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số & Ký hiệu gốc của văn bản *</label>
                  <input
                    type="text"
                    required
                    value={incOfficialNum}
                    onChange={(e) => setIncOfficialNum(e.target.value)}
                    placeholder="VD: 852/UBND-NC"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cơ quan ban hành *</label>
                  <input
                    type="text"
                    required
                    value={incAuthority}
                    onChange={(e) => setIncAuthority(e.target.value)}
                    placeholder="UBND Tỉnh, Sở Nội Vụ..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Loại văn bản</label>
                  <select
                    value={incDocType}
                    onChange={(e) => setIncDocType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  >
                    {masterData.documentTypes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Trích yếu nội dung văn bản *</label>
                <textarea
                  required
                  rows={3}
                  value={incSummary}
                  onChange={(e) => setIncSummary(e.target.value)}
                  placeholder="Ghi rõ tóm tắt nội dung chỉ đạo, nhiệm vụ được giao trong văn bản..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Độ khẩn</label>
                  <select
                    value={incUrgency}
                    onChange={(e) => setIncUrgency(e.target.value as UrgencyLevel)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-bold text-indigo-700"
                  >
                    <option value="THUONG">Thường</option>
                    <option value="KHAN">Khẩn</option>
                    <option value="THUONG_KHAN">Thượng khẩn</option>
                    <option value="HOA_TOC">Hỏa tốc</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Người chủ trì xử lý</label>
                  <select
                    value={incAssigneeId}
                    onChange={(e) => setIncAssigneeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hạn xử lý *</label>
                  <input
                    type="date"
                    required
                    value={incDueDate}
                    onChange={(e) => setIncDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Gán vào Mã Hồ Sơ vụ việc</label>
                <select
                  value={incDossierId}
                  onChange={(e) => setIncDossierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono text-indigo-700 font-bold"
                >
                  {dossiers.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} - {d.title}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* TAB 2: OUTGOING DOC */}
          {activeTab === 'OUTGOING' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số đi / Ký hiệu *</label>
                  <input
                    type="text"
                    required
                    value={outDocNum}
                    onChange={(e) => setOutDocNum(e.target.value)}
                    placeholder="VD: 58/UBND-TH"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Đơn vị nhận văn bản *</label>
                  <input
                    type="text"
                    required
                    value={outRecipient}
                    onChange={(e) => setOutRecipient(e.target.value)}
                    placeholder="VD: Sở Thông tin và Truyền thông"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Loại văn bản</label>
                  <select
                    value={outDocType}
                    onChange={(e) => setOutDocType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  >
                    {masterData.documentTypes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Người ký phê duyệt</label>
                  <select
                    value={outSignerId}
                    onChange={(e) => setOutSignerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.position})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Trích yếu nội dung văn bản phát hành *</label>
                <textarea
                  required
                  rows={3}
                  value={outSummary}
                  onChange={(e) => setOutSummary(e.target.value)}
                  placeholder="Tóm tắt nội dung thông báo, quyết định hoặc công văn gửi đi..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Gán vào Mã Hồ Sơ</label>
                <select
                  value={outDossierId}
                  onChange={(e) => setOutDossierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono text-indigo-700 font-bold"
                >
                  {dossiers.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} - {d.title}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* TAB 3: TASK */}
          {activeTab === 'TASK' && (
            <>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên nội dung nhiệm vụ *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="VD: Tham mưu dự thảo Kế hoạch chuyển đổi số quý 3"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả chi tiết yêu cầu công việc</label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Yêu cầu cụ thể, căn cứ pháp lý, sản phẩm đầu ra..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cán bộ chủ trì *</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mức độ ưu tiên</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Ưu tiên cao</option>
                    <option value="URGENT">Rất khẩn cấp</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hạn hoàn thành *</label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mã hồ sơ liên kết</label>
                <select
                  value={taskDossierId}
                  onChange={(e) => setTaskDossierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono text-indigo-700 font-bold"
                >
                  {dossiers.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} - {d.title}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* TAB 4: DOSSIER */}
          {activeTab === 'DOSSIER' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã hồ sơ điện tử *</label>
                  <input
                    type="text"
                    required
                    value={dosCode}
                    onChange={(e) => setDosCode(e.target.value)}
                    placeholder="VD: HS-2025-CDS-03"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono font-bold text-indigo-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phòng ban quản lý</label>
                  <input
                    type="text"
                    required
                    value={dosDepartment}
                    onChange={(e) => setDosDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề vụ việc / Tên hồ sơ *</label>
                <input
                  type="text"
                  required
                  value={dosTitle}
                  onChange={(e) => setDosTitle(e.target.value)}
                  placeholder="VD: Hồ sơ Xây dựng Đề án Chuyển đổi số tỉnh năm 2025-2030"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mục đích & Ghi chú hồ sơ</label>
                <textarea
                  rows={3}
                  value={dosDescription}
                  onChange={(e) => setDosDescription(e.target.value)}
                  placeholder="Mô tả phạm vi, đối tượng áp dụng và căn cứ lập hồ sơ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                ></textarea>
              </div>
            </>
          )}

          {/* Submit buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-all"
            >
              Lưu Vào Hệ Thống
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
