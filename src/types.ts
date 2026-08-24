export type Role = 'ADMIN' | 'LEADER' | 'CLERK' | 'STAFF';
export type UserRole = Role; // Alias for convenience

export type UrgencyLevel = 'THUONG' | 'KHAN' | 'THUONG_KHAN' | 'HOA_TOC';
export type SecurityLevel = 'THUONG' | 'MAT' | 'TOI_MAT' | 'TUYET_MAT';

export type IncomingDocStatus = 'PENDING_ASSIGN' | 'PROCESSING' | 'COMPLETED' | 'OVERDUE';
export type OutgoingDocStatus = 'DRAFT' | 'REVIEWING' | 'SIGNED' | 'ISSUED' | 'SENT';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED';

export type DossierStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';

export type FileCategory =
  | 'VAN_BAN_DEN'
  | 'VAN_BAN_DI'
  | 'CONG_VIEC'
  | 'HO_SO'
  | 'NHAN_SU'
  | 'KHAC';

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  managerId?: string;
}

export interface Position {
  id: string;
  name: string;
  code?: string;
  level?: number;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  department?: string;
  departmentId?: string;
  position?: string;
  positionId?: string;
  role: Role;
  status?: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  joinDate?: string;
  bio?: string;
  lastLogin?: string;
}

export interface AuthSession {
  user: User;
  token?: string;
  loginAt: string;
}

export interface AttachmentFile {
  id?: string;
  name?: string;
  fileName?: string;
  fileSize?: number; // bytes
  size?: string;
  fileType?: string;
  fileUrl?: string;
  url?: string;
  category?: FileCategory;
  relatedId?: string;
  dossierId?: string;
  dossierCode?: string;
  uploadedById?: string;
  uploadedByName?: string;
  uploadedAt?: string;
  tags?: string[];
}

export type FileAttachment = AttachmentFile; // Alias

export interface Dossier {
  id: string;
  code: string; // Mã hồ sơ (e.g. HS-2025-VP-01)
  title: string;
  department?: string;
  departmentId?: string;
  managerId?: string;
  leaderId?: string;
  creatorId?: string;
  status: DossierStatus;
  securityLevel?: SecurityLevel;
  startDate: string;
  endDate?: string;
  description: string;
  tags?: string[];
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncomingDocument {
  id: string;
  documentNumber: string; // Số đến (e.g. 124/UBND-VP)
  officialNumber?: string; // Số ký hiệu gốc (e.g. 45/QĐ-BGDĐT)
  receivedDate: string; // YYYY-MM-DD
  issueDate?: string; // Ngày ban hành của cơ quan gửi
  issuingAuthority: string; // Đơn vị ban hành (e.g. UBND Tỉnh / Bộ GD&ĐT)
  summary: string; // Trích yếu nội dung
  docType: string; // Quyết định, Tờ trình, Công văn, Chỉ thị, Thông báo...
  urgency: UrgencyLevel;
  securityLevel: SecurityLevel;
  assigneeId?: string; // Người chủ trì xử lý
  coAssigneeIds?: string[]; // Người phối hợp
  dueDate: string; // Hạn xử lý
  status: IncomingDocStatus;
  resultSummary?: string; // Tóm tắt kết quả xử lý
  dossierId?: string; // Liên kết mã hồ sơ
  attachments: AttachmentFile[];
  linkedTaskIds?: string[];
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OutgoingDocument {
  id: string;
  documentNumber: string; // Số đi (e.g. 88/CV-THCS)
  releaseDate: string; // Ngày phát hành
  docType: string; // Công văn, Tờ trình, Báo cáo, Quyết định...
  recipient: string; // Đơn vị nhận
  summary: string; // Trích yếu
  content?: string; // Toàn văn dự thảo
  drafterId?: string; // Người soạn thảo
  signerId?: string; // Người ký duyệt
  status: OutgoingDocStatus;
  dossierId?: string; // Liên kết mã hồ sơ
  replyToDocId?: string; // Trả lời cho VB Đến nào
  attachments: AttachmentFile[];
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  attachments?: AttachmentFile[];
}

export interface TaskSubItem {
  id: string;
  title: string;
  completed: boolean;
}

export type SubTask = TaskSubItem; // Alias

export interface Task {
  id: string;
  code: string; // Mã công việc (e.g. CV-2025-01)
  title: string;
  description: string;
  dossierId?: string; // Mã hồ sơ liên kết
  incomingDocId?: string; // Văn bản đến liên kết
  linkedDocId?: string; // Văn bản liên kết (Đến hoặc Đi)
  docTypeRelation?: 'INCOMING' | 'OUTGOING';
  createdById?: string;
  creatorId?: string; // Người giao việc
  assigneeId: string; // Người chủ trì
  coAssigneeIds?: string[]; // Người phối hợp
  priority: TaskPriority;
  startDate: string;
  dueDate: string;
  completedDate?: string;
  progress: number; // 0 - 100
  status: TaskStatus;
  resultNotes?: string;
  subTasks?: TaskSubItem[];
  attachments: AttachmentFile[];
  comments?: TaskComment[];
  remindDaysBefore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'ASSIGN' | 'UPLOAD_FILE' | 'COMMENT' | 'AI_QUERY' | 'LOGIN' | 'LOGOUT';
  entityType: 'INCOMING_DOC' | 'OUTGOING_DOC' | 'TASK' | 'USER' | 'DOSSIER' | 'FILE' | 'CATEGORY' | string;
  entityId?: string;
  entityTitle?: string;
  details: string;
}

export interface SystemNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type:
    | 'DEADLINE_TODAY'
    | 'OVERDUE'
    | 'NEW_TASK'
    | 'DOC_ASSIGNED'
    | 'STATUS_UPDATED'
    | 'INFO'
    | 'WARNING';
  linkType?: 'TASK' | 'INCOMING_DOC' | 'OUTGOING_DOC' | 'DOSSIER';
  targetId?: string;
  isRead?: boolean;
  createdAt?: string;
}

export interface MasterData {
  docTypes?: string[];
  authorities?: Array<string | { id: string; name: string; code?: string; level?: string }>;
  departments?: Array<string | Department | { id: string; name: string; code?: string }>;
  positions?: Array<string | Position | { id: string; name: string; code?: string; level?: number }>;
  securityLevels?: string[];
  urgencyLevels?: string[];
  documentTypes?: Array<{ id: string; name: string; code: string }>;
  issuingAuthorities?: string[];
  [key: string]: any;
}
