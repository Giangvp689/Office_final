import {
  Task,
  User,
  IncomingDocument,
  OutgoingDocument,
  Dossier,
  AttachmentFile,
} from '../types';

/**
 * Kiểm tra xem người dùng có quyền Quản trị / Lãnh đạo cao nhất hay không.
 */
export function isLeaderOrAdmin(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'LEADER';
}

/**
 * Kiểm tra xem người dùng có phải Văn thư cơ quan hay không.
 */
export function isClerk(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'CLERK';
}

/**
 * Kiểm tra xem người dùng có phải Lãnh đạo hay không.
 */
export function isLeader(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'LEADER';
}

/**
 * Kiểm tra xem người dùng có phải Chuyên viên hay không.
 */
export function isStaff(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'STAFF';
}

/**
 * Thẩm quyền Đôn đốc & Nhắc việc tiến độ cho cán bộ chuyên viên:
 * - Theo Hình 3.37 & Bảng 3.10: Cả LÃNH ĐẠO (LEADER/ADMIN) và VĂN THƯ (CLERK) đều có quyền đôn đốc / nhắc việc hạn xử lý.
 * - Chuyên viên (STAFF) không có quyền đôn đốc.
 */
export function canNudgeOrRemindStaff(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'LEADER' || user.role === 'ADMIN' || user.role === 'CLERK';
}

/**
 * Thẩm quyền tải / làm mới toàn bộ dữ liệu từ CSDL MySQL & CSDL hệ thống:
 * - Chỉ LÃNH ĐẠO (LEADER) hoặc Quản trị viên (ADMIN) mới có thẩm quyền nạp lại toàn bộ CSDL.
 * - Chuyên viên và Văn thư không được tự ý thực hiện thao tác nạp lại toàn bộ dữ liệu CSDL.
 */
export function canReloadDatabase(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'LEADER' || user.role === 'ADMIN';
}

/**
 * QUY CHẾ VĂN HÀNH CHÍNH & VĂN THƯ NGHỊ ĐỊNH 30/2020/NĐ-CP:
 * Thẩm quyền Khởi tạo & Giao việc (Nhiệm vụ - Task):
 * - CHỈ LÃNH ĐẠO (LEADER) hoặc Quản trị viên (ADMIN) mới có thẩm quyền phân công và giao việc cho cán bộ.
 * - Chuyên viên và Văn thư không được tự ý giao việc cho nhân sự khác.
 */
export function canCreateOrAssignTask(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'LEADER';
}

/**
 * Thẩm quyền Chỉnh sửa / Điều chỉnh phân công nhiệm vụ:
 * - Chỉ Lãnh đạo (LEADER) hoặc Quản trị viên (ADMIN) mới có thẩm quyền phân công và điều chỉnh nhiệm vụ.
 * - Văn thư (CLERK) và Chuyên viên (STAFF) không có quyền thay đổi phân công nhiệm vụ.
 */
export function canEditTask(task?: Task | null, user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'LEADER';
}

/**
 * Thẩm quyền Xóa nhiệm vụ (Hình 3.28 & Bảng 3.8 & Hình 3.61):
 * - Chỉ Lãnh đạo giao việc (LEADER/creatorId) hoặc Quản trị viên (ADMIN) mới có thẩm quyền xóa.
 */
export function canDeleteTask(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'LEADER';
}

/**
 * Kiểm tra ràng buộc khi Xóa nhiệm vụ (Hình 3.28 & Bảng 3.8 & Hình 3.61):
 * - Nếu nhiệm vụ đã được nghiệm thu (COMPLETED): Hệ thống từ chối xóa và dừng thao tác.
 * - Nếu chưa hoàn tất: Hệ thống yêu cầu xác nhận.
 */
export function canDeleteTaskRecord(
  task?: Task | null,
  user?: User | null
): { allowed: boolean; reason?: string } {
  if (!task || !user) return { allowed: false, reason: 'Dữ liệu nhiệm vụ không hợp lệ.' };
  const isLeaderOrAdminUser = user.role === 'ADMIN' || user.role === 'LEADER';
  const isCreator = task.creatorId === user.id || task.createdById === user.id;
  if (!isLeaderOrAdminUser && !isCreator) {
    return {
      allowed: false,
      reason: 'Chỉ Lãnh đạo giao việc hoặc Quản trị viên mới có thẩm quyền xóa nhiệm vụ (Hình 3.28).',
    };
  }
  if (task.status === 'COMPLETED') {
    return {
      allowed: false,
      reason: 'Nhiệm vụ đã được nghiệm thu hoàn thành, hệ thống từ chối xóa để đảm bảo toàn vẹn dữ liệu và lịch sử công tác (Hình 3.28 & Bảng 3.8).',
    };
  }
  return { allowed: true };
}

/**
 * Thẩm quyền Sửa thông tin văn bản đến (Hình 3.16 & Bảng 3.6 & Hình 3.50):
 * - Chỉ Văn thư (CLERK) hoặc ADMIN phụ trách sổ công văn đến.
 * - Chuyên viên và Lãnh đạo không sửa thông tin sổ văn bản đến.
 */
export function canEditIncomingDoc(
  doc?: IncomingDocument | null,
  user?: User | null
): boolean {
  if (!doc || !user) return false;
  return user.role === 'CLERK' || user.role === 'ADMIN';
}

/**
 * Thẩm quyền và Ràng buộc Xóa văn bản đến (Hình 3.17 & Bảng 3.6 & Hình 3.51):
 * - Tác nhân: Văn thư (CLERK) hoặc ADMIN.
 * - Ràng buộc: Nếu văn bản đến đang gắn với nhiệm vụ xử lý hoặc văn bản đi phúc đáp liên quan,
 *   hệ thống ngăn chặn xóa và thông báo cho người dùng.
 */
export function canDeleteIncomingDoc(
  doc?: IncomingDocument | null,
  user?: User | null,
  tasks: Task[] = [],
  outgoingDocs: OutgoingDocument[] = []
): { allowed: boolean; reason?: string } {
  if (!doc || !user) return { allowed: false, reason: 'Dữ liệu không hợp lệ.' };
  if (user.role !== 'CLERK' && user.role !== 'ADMIN') {
    return {
      allowed: false,
      reason: 'Chỉ Văn thư cơ quan hoặc Quản trị viên mới có thẩm quyền xóa văn bản đến trong sổ công văn (Hình 3.17 & Bảng 3.6).',
    };
  }
  const hasLinkedTask = tasks.some(
    (t) =>
      t.incomingDocId === doc.id ||
      t.linkedDocId === doc.id ||
      (Array.isArray(doc.linkedTaskIds) && doc.linkedTaskIds.includes(t.id))
  );
  if (hasLinkedTask) {
    return {
      allowed: false,
      reason: 'Hệ thống ngăn chặn xóa: Văn bản đến đang gắn với nhiệm vụ phân công công việc (Hình 3.17 & Bảng 3.6).',
    };
  }
  const hasLinkedOutgoing = outgoingDocs.some(
    (o) => o.replyToDocId === doc.id || (o as any).incomingDocId === doc.id
  );
  if (hasLinkedOutgoing) {
    return {
      allowed: false,
      reason: 'Hệ thống ngăn chặn xóa: Văn bản đến đã phát sinh văn bản đi phúc đáp liên quan.',
    };
  }
  return { allowed: true };
}

/**
 * Thẩm quyền Sửa dự thảo văn bản đi (Hình 3.22 & Bảng 3.7 & Hình 3.55):
 * - Tác nhân: Chuyên viên soạn thảo (drafterId/createdById) hoặc Văn thư / ADMIN.
 * - Ràng buộc: Nếu văn bản đã ký hoặc đã phát hành, hệ thống từ chối chỉnh sửa.
 */
export function canEditOutgoingDoc(
  doc?: OutgoingDocument | null,
  user?: User | null
): { allowed: boolean; reason?: string } {
  if (!doc || !user) return { allowed: false, reason: 'Dữ liệu không hợp lệ.' };
  if (doc.status === 'SIGNED' || doc.status === 'ISSUED') {
    return {
      allowed: false,
      reason: 'Văn bản đã được ký duyệt hoặc phát hành chính thức, không thể chỉnh sửa nội dung (Hình 3.22 & Bảng 3.7).',
    };
  }
  const isDrafter = doc.drafterId === user.id || doc.createdById === user.id;
  if (!isDrafter && user.role !== 'ADMIN' && user.role !== 'CLERK') {
    return {
      allowed: false,
      reason: 'Chỉ cán bộ soạn thảo dự thảo hoặc Quản trị viên mới có quyền chỉnh sửa dự thảo văn bản.',
    };
  }
  return { allowed: true };
}

/**
 * Thẩm quyền Xóa dự thảo văn bản đi (Hình 3.23 & Bảng 3.7 & Hình 3.56):
 * - Tác nhân: Người soạn thảo (drafterId/createdById) hoặc Quản trị viên (ADMIN).
 * - Ràng buộc: Nếu văn bản đã ký hoặc đã phát hành, hệ thống từ chối xóa và dừng thao tác;
 *   với bản nháp, hệ thống yêu cầu xác nhận.
 */
export function canDeleteOutgoingDoc(
  doc?: OutgoingDocument | null,
  user?: User | null
): { allowed: boolean; reason?: string } {
  if (!doc || !user) return { allowed: false, reason: 'Dữ liệu không hợp lệ.' };
  if (doc.status === 'SIGNED' || doc.status === 'ISSUED') {
    return {
      allowed: false,
      reason: 'Hệ thống từ chối xóa đối với văn bản đã được phê duyệt hoặc cấp số phát hành chính thức (Hình 3.23 & Bảng 3.7).',
    };
  }
  const isDrafter = doc.drafterId === user.id || doc.createdById === user.id;
  if (!isDrafter && user.role !== 'ADMIN') {
    return {
      allowed: false,
      reason: 'Chỉ cán bộ soạn thảo dự thảo hoặc Quản trị viên mới có thẩm quyền xóa bản nháp này.',
    };
  }
  return { allowed: true };
}

/**
 * Thẩm quyền Xóa hồ sơ công việc (Hình 3.34 & Bảng 3.9 & Hình 3.69):
 * - Tác nhân: Văn thư hoặc Lãnh đạo hoặc Quản trị viên (ADMIN) hoặc cán bộ lập hồ sơ.
 * - Ràng buộc: Nếu hồ sơ đã đóng (CLOSED/ARCHIVED) hoặc có văn bản chính thức/tài liệu liên kết,
 *   hệ thống báo lỗi và từ chối xóa do còn ràng buộc dữ liệu; hồ sơ rỗng/tạo nhầm mới được xóa.
 */
export function canDeleteDossierRecord(
  dossier?: Dossier | null,
  user?: User | null,
  attachments: AttachmentFile[] = [],
  incomingDocs: IncomingDocument[] = [],
  outgoingDocs: OutgoingDocument[] = [],
  tasks: Task[] = []
): { allowed: boolean; reason?: string } {
  if (!dossier || !user) return { allowed: false, reason: 'Dữ liệu hồ sơ không hợp lệ.' };
  const isPermitted =
    user.role === 'ADMIN' ||
    user.role === 'LEADER' ||
    user.role === 'CLERK' ||
    dossier.managerId === user.id ||
    dossier.createdById === user.id;
  if (!isPermitted) {
    return {
      allowed: false,
      reason: 'Chỉ Văn thư cơ quan, Lãnh đạo hoặc Cán bộ lập hồ sơ mới có thẩm quyền xóa hồ sơ vụ việc (Hình 3.34).',
    };
  }
  if (dossier.status === 'CLOSED' || dossier.status === 'ARCHIVED') {
    return {
      allowed: false,
      reason: 'Hệ thống báo lỗi và từ chối xóa: Hồ sơ đã được nghiệm thu đóng hoặc lưu trữ lịch sử (Hình 3.34 & Bảng 3.9).',
    };
  }
  const linkedAttCount = attachments.filter((a) => a.dossierId === dossier.id || a.dossierId === dossier.code).length;
  const linkedInCount = incomingDocs.filter((d) => d.dossierId === dossier.id || d.dossierId === dossier.code).length;
  const linkedOutCount = outgoingDocs.filter((d) => d.dossierId === dossier.id || d.dossierId === dossier.code).length;
  const linkedTaskCount = tasks.filter((t) => t.dossierId === dossier.id || t.dossierId === dossier.code).length;
  const totalLinked = linkedAttCount + linkedInCount + linkedOutCount + linkedTaskCount;
  if (totalLinked > 0) {
    return {
      allowed: false,
      reason: `Hồ sơ đang chứa tài liệu liên kết (${linkedInCount} VB đến, ${linkedOutCount} VB đi, ${linkedTaskCount} công việc, ${linkedAttCount} tệp đính kèm). Hệ thống từ chối xóa do còn ràng buộc dữ liệu (Hình 3.34 & Hình 3.69).`,
    };
  }
  return { allowed: true };
}

/**
 * Thẩm quyền Xóa tệp tài liệu đính kèm (Hình 3.34 & Bảng 3.9):
 * - Tác nhân: Người tải lên (uploadedById), Văn thư, Lãnh đạo hoặc Quản trị viên.
 * - Ràng buộc: Không được gỡ bỏ tệp nằm trong hồ sơ đã đóng.
 */
export function canDeleteAttachmentRecord(
  file?: AttachmentFile | null,
  user?: User | null,
  dossiers: Dossier[] = []
): { allowed: boolean; reason?: string } {
  if (!file || !user) return { allowed: false, reason: 'Dữ liệu không hợp lệ.' };
  const isUploader = file.uploadedById === user.id;
  const isPrivileged = user.role === 'ADMIN' || user.role === 'LEADER' || user.role === 'CLERK';
  if (!isUploader && !isPrivileged) {
    return {
      allowed: false,
      reason: 'Chỉ người tải lên, Văn thư hoặc Lãnh đạo mới có quyền gỡ bỏ tệp tài liệu này.',
    };
  }
  if (file.dossierId) {
    const relatedDossier = dossiers.find((d) => d.id === file.dossierId || d.code === file.dossierId);
    if (relatedDossier && (relatedDossier.status === 'CLOSED' || relatedDossier.status === 'ARCHIVED')) {
      return {
        allowed: false,
        reason: 'Tài liệu nằm trong hồ sơ vụ việc đã đóng hoặc lưu trữ, không thể gỡ bỏ để bảo đảm chứng từ (Hình 3.34).',
      };
    }
  }
  return { allowed: true };
}

/**
 * QUY CHẾ ĐIỀU HÀNH CÔNG VIỆC:
 * Kiểm tra xem một người dùng có thể là ĐỐI TƯỢNG ĐƯỢC GIAO NHIỆM VỤ hay không.
 * - Quy chế hành chính: Lãnh đạo (LEADER) chỉ giao việc cho Chuyên viên (STAFF) hoặc Văn thư (CLERK).
 * - Lãnh đạo (LEADER) và Quản trị viên (ADMIN) là cấp lãnh đạo chỉ đạo/giao việc, KHÔNG phải đối tượng nhận phân công công việc từ lãnh đạo khác.
 */
export function canUserBeAssignedTask(user?: User | null): boolean {
  if (!user || user.status === 'INACTIVE') return false;
  return user.role === 'STAFF' || user.role === 'CLERK';
}

/**
 * Lọc danh sách nhân sự có thể làm Cán bộ Chủ trì hoặc Phối hợp giải quyết công việc.
 * - Chuyên viên (STAFF): Thụ lý các nhiệm vụ chuyên môn, tờ trình, đề án.
 * - Văn thư (CLERK): Thụ lý các nhiệm vụ văn thư lưu trữ, số hóa, nộp lưu, thống kê văn bưu.
 * - LOẠI TRỪ TUYỆT ĐỐI LÃNH ĐẠO (LEADER) và Quản trị viên (ADMIN) khỏi danh sách nhận việc.
 */
export function getAssignableStaffUsers(users: User[] = [], _currentUser?: User | null): User[] {
  if (!Array.isArray(users)) return [];
  return users.filter(
    (u) => u && u.status !== 'INACTIVE' && (u.role === 'STAFF' || u.role === 'CLERK')
  );
}

/**
 * Lọc danh sách CHUYÊN VIÊN CHUYÊN MÔN thuần túy (STAFF only)
 */
export function getSpecialistStaffOnly(users: User[] = []): User[] {
  if (!Array.isArray(users)) return [];
  return users.filter((u) => u && u.status !== 'INACTIVE' && u.role === 'STAFF');
}

/**
 * Lọc danh sách LÃNH ĐẠO có thẩm quyền chỉ đạo, ký số văn bản và phê duyệt nghiệm thu nhiệm vụ.
 */
export function getLeaderUsers(users: User[] = []): User[] {
  if (!Array.isArray(users)) return [];
  return users.filter((u) => u && u.status !== 'INACTIVE' && (u.role === 'LEADER' || u.role === 'ADMIN'));
}

/**
 * Thẩm quyền Phê duyệt Nghiệm thu công việc:
 * - Chỉ Lãnh đạo (LEADER) hoặc Quản trị viên (ADMIN) mới có thẩm quyền nghiệm thu và đóng nhiệm vụ.
 */
export function canApproveTaskCompletion(user?: User | null): boolean {
  return isLeaderOrAdmin(user);
}

/**
 * Thẩm quyền sử dụng Phân Loại Văn Bản AI (Classification Studio & Tiếp nhận số hóa):
 * - Chỉ dành cho Văn thư (CLERK) khi tiếp nhận số hóa và vào sổ,
 *   Lãnh đạo cơ quan (LEADER) khi thẩm định phân luồng văn bản,
 *   và Quản trị viên (ADMIN).
 * - Chuyên viên (STAFF) KHÔNG thực hiện phân loại đầu vào mà chỉ nhận nhiệm vụ chuyên môn.
 */
export function canAccessClassificationStudio(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'CLERK' || user.role === 'LEADER' || user.role === 'ADMIN';
}

/**
 * Thẩm quyền Nộp báo cáo trình nghiệm thu:
 * - Chuyên viên chủ trì hoặc phối hợp thực hiện nhiệm vụ.
 */
export function canSubmitTaskForApproval(task?: Task | null, user?: User | null): boolean {
  if (!task || !user) return false;
  return task.assigneeId === user.id || (Array.isArray(task.coAssigneeIds) && task.coAssigneeIds.includes(user.id));
}

/**
 * QUY CHẾ VĂN THƯ NGHỊ ĐỊNH 30/2020/NĐ-CP:
 * Thẩm quyền Ký số / Phê duyệt văn bản đi:
 * - Chỉ Lãnh đạo cơ quan (LEADER) hoặc Người ký được chỉ định đích danh (signerId)
 *   hoặc Quản trị viên (ADMIN) mới có quyền Ký số.
 * - Chuyên viên không được ký duyệt.
 */
export function canSignOutgoingDoc(doc?: OutgoingDocument | null, user?: User | null): boolean {
  if (!doc || !user) return false;
  if (user.role === 'ADMIN' || user.role === 'LEADER') return true;
  return doc.signerId === user.id;
}

/**
 * QUY CHẾ VĂN THƯ NGHỊ ĐỊNH 30/2020/NĐ-CP:
 * Thẩm quyền Cấp số, Đóng dấu & Phát hành văn bản đi:
 * - DUY NHẤT VĂN THƯ (CLERK) hoặc Quản trị hệ thống (ADMIN) mới có thẩm quyền này.
 * - LÃNH ĐẠO KHÔNG ĐƯỢC TỰ Ý CẤP SỐ VÀ PHÁT HÀNH ĐI MÀ KHÔNG QUA VĂN THƯ!
 */
export function canIssueOutgoingDoc(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'CLERK' || user.role === 'ADMIN';
}

/**
 * Thẩm quyền Tiếp nhận & Vào Sổ Văn bản Đến:
 * - Văn thư cơ quan (CLERK) hoặc ADMIN phụ trách tiếp nhận tài liệu và vào sổ đến.
 */
export function canRegisterIncomingDoc(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'CLERK' || user.role === 'ADMIN';
}

/**
 * Thẩm quyền Chỉ đạo & Giao việc từ Văn bản Đến:
 * - Lãnh đạo cơ quan / đơn vị (LEADER) hoặc ADMIN ghi ý kiến chỉ đạo và giao việc.
 */
export function canDirectIncomingDoc(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'LEADER' || user.role === 'ADMIN';
}

/**
 * ==========================================
 * 1. QUYỀN TRUY CẬP NHIỆM VỤ (TASK PERMISSION)
 * ==========================================
 * - Lãnh đạo / Admin: Có quyền chỉ đạo, giám sát toàn diện.
 * - Nhân viên: CHỈ xem được nhiệm vụ mà mình là Chủ trì (assignee),
 *   Phối hợp (coAssignees), hoặc Người giao việc (creator/createdById).
 */
export function canAccessTask(task?: Task | null, user?: User | null): boolean {
  if (!task || !user) return false;

  // Lãnh đạo & Admin có quyền giám sát
  if (isLeaderOrAdmin(user)) {
    return true;
  }

  // Văn thư cơ quan có quyền theo dõi công việc toàn cơ quan theo dõi sổ văn thư
  if (isClerk(user)) {
    return true;
  }

  // Cán bộ chủ trì
  if (task.assigneeId === user.id) {
    return true;
  }

  // Cán bộ phối hợp
  if (Array.isArray(task.coAssigneeIds) && task.coAssigneeIds.includes(user.id)) {
    return true;
  }

  // Người giao việc / Người tạo nhiệm vụ
  if (task.creatorId === user.id || task.createdById === user.id) {
    return true;
  }

  return false;
}

/**
 * Kiểm tra quyền gửi ý kiến chỉ đạo / báo cáo trong nhiệm vụ.
 */
export function canCommentOnTask(task?: Task | null, user?: User | null): boolean {
  return canAccessTask(task, user);
}

/**
 * Lấy danh sách nhân sự có thẩm quyền tham gia nhiệm vụ.
 */
export function getTaskParticipants(task?: Task | null, users: User[] = []): {
  creator?: User;
  assignee?: User;
  coAssignees: User[];
  allParticipantIds: string[];
} {
  if (!task) {
    return { coAssignees: [], allParticipantIds: [] };
  }

  const creator = users.find((u) => u.id === (task.creatorId || task.createdById));
  const assignee = users.find((u) => u.id === task.assigneeId);
  const coAssignees = (task.coAssigneeIds || [])
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as User[];

  const allParticipantIds = Array.from(
    new Set([
      task.creatorId,
      task.createdById,
      task.assigneeId,
      ...(task.coAssigneeIds || []),
    ].filter(Boolean) as string[])
  );

  return {
    creator,
    assignee,
    coAssignees,
    allParticipantIds,
  };
}

/**
 * ====================================================
 * 2. QUYỀN TRUY CẬP VĂN BẢN ĐẾN (INCOMING DOC PERMISSION)
 * ====================================================
 * - Lãnh đạo & Admin: Giám sát, cho ý kiến chỉ đạo toàn cơ quan.
 * - Văn thư (CLERK): Tiếp nhận, vào sổ văn thư, phân phối văn bản đến.
 * - Chuyên viên / Cán bộ nhân viên (STAFF): CHỈ xem văn bản mình được phân công:
 *    + Cán bộ chủ trì xử lý (assigneeId)
 *    + Cán bộ phối hợp xử lý (coAssigneeIds)
 *    + Người vào sổ/đăng ký (createdById)
 *    + Hoặc có nhiệm vụ liên quan được giao cho mình
 */
export function canAccessIncomingDoc(
  doc?: IncomingDocument | null,
  user?: User | null,
  tasks: Task[] = []
): boolean {
  if (!doc || !user) return false;

  // Lãnh đạo & Admin
  if (isLeaderOrAdmin(user)) return true;

  // Văn thư có trách nhiệm quản lý sổ văn bản đến
  if (isClerk(user)) return true;

  // Cán bộ chủ trì xử lý văn bản
  if (doc.assigneeId === user.id) return true;

  // Cán bộ phối hợp xử lý văn bản
  if (Array.isArray(doc.coAssigneeIds) && doc.coAssigneeIds.includes(user.id)) return true;

  // Người đăng ký / tạo văn bản
  if (doc.createdById === user.id) return true;

  // Kiểm tra nếu có nhiệm vụ liên quan giao cho cán bộ này
  const hasLinkedTaskForUser = tasks.some(
    (t) =>
      (t.incomingDocId === doc.id || t.linkedDocId === doc.id || doc.linkedTaskIds?.includes(t.id)) &&
      (t.assigneeId === user.id || t.coAssigneeIds?.includes(user.id) || t.creatorId === user.id || t.createdById === user.id)
  );

  return hasLinkedTaskForUser;
}

/**
 * ====================================================
 * 3. QUYỀN TRUY CẬP VĂN BẢN ĐI (OUTGOING DOC PERMISSION)
 * ====================================================
 * - Lãnh đạo & Admin: Xem xét, ký duyệt, chỉ đạo.
 * - Văn thư (CLERK): Phát hành, đóng dấu, lưu trữ sổ công văn đi.
 * - Chuyên viên / Nhân viên (STAFF): CHỈ xem văn bản do mình soạn thảo (drafterId/createdById)
 *   hoặc được phân công ký duyệt (signerId), hoặc liên quan đến hồ sơ mình phụ trách.
 */
export function canAccessOutgoingDoc(
  doc?: OutgoingDocument | null,
  user?: User | null,
  dossiers: Dossier[] = []
): boolean {
  if (!doc || !user) return false;

  if (isLeaderOrAdmin(user)) return true;
  if (isClerk(user)) return true;

  // Cán bộ soạn thảo dự thảo
  if (doc.drafterId === user.id || doc.createdById === user.id) return true;

  // Cán bộ ký duyệt
  if (doc.signerId === user.id) return true;

  // Thuộc hồ sơ cán bộ đó quản lý
  if (doc.dossierId) {
    const relatedDossier = dossiers.find((d) => d.id === doc.dossierId || d.code === doc.dossierId);
    if (
      relatedDossier &&
      (relatedDossier.managerId === user.id ||
        relatedDossier.leaderId === user.id ||
        relatedDossier.creatorId === user.id ||
        relatedDossier.createdById === user.id)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * ====================================================
 * 4. QUYỀN TRUY CẬP HỒ SƠ VỤ VIỆC (DOSSIER PERMISSION)
 * ====================================================
 * - Lãnh đạo & Admin: Giám sát toàn bộ hồ sơ nghiệp vụ cơ quan.
 * - Nhân viên: CHỈ xem hồ sơ do mình quản lý (managerId), tạo (creatorId/createdById),
 *   hoặc hồ sơ chứa nhiệm vụ/văn bản mà mình trực tiếp tham gia xử lý.
 */
export function canAccessDossier(
  dossier?: Dossier | null,
  user?: User | null,
  tasks: Task[] = [],
  incomingDocs: IncomingDocument[] = [],
  outgoingDocs: OutgoingDocument[] = []
): boolean {
  if (!dossier || !user) return false;

  if (isLeaderOrAdmin(user)) return true;

  // Cán bộ quản lý / lập hồ sơ
  if (
    dossier.managerId === user.id ||
    dossier.leaderId === user.id ||
    dossier.creatorId === user.id ||
    dossier.createdById === user.id
  ) {
    return true;
  }

  // Cán bộ tham gia nhiệm vụ trong hồ sơ này
  const hasInvolvedTask = tasks.some(
    (t) =>
      (t.dossierId === dossier.id || t.dossierId === dossier.code) &&
      (t.assigneeId === user.id ||
        t.coAssigneeIds?.includes(user.id) ||
        t.creatorId === user.id ||
        t.createdById === user.id)
  );
  if (hasInvolvedTask) return true;

  // Cán bộ tham gia văn bản đến trong hồ sơ này
  const hasInvolvedIncoming = incomingDocs.some(
    (doc) =>
      (doc.dossierId === dossier.id || doc.dossierId === dossier.code) &&
      (doc.assigneeId === user.id ||
        doc.coAssigneeIds?.includes(user.id) ||
        doc.createdById === user.id)
  );
  if (hasInvolvedIncoming) return true;

  // Cán bộ tham gia văn bản đi trong hồ sơ này
  const hasInvolvedOutgoing = outgoingDocs.some(
    (doc) =>
      (doc.dossierId === dossier.id || doc.dossierId === dossier.code) &&
      (doc.drafterId === user.id ||
        doc.signerId === user.id ||
        doc.createdById === user.id)
  );
  if (hasInvolvedOutgoing) return true;

  return false;
}

/**
 * ====================================================
 * 5. QUYỀN TRUY CẬP TỆP / KHO TÀI LIỆU (ATTACHMENTS PERMISSION)
 * ====================================================
 * - Lãnh đạo & Admin: Xem được kho tài liệu cơ quan.
 * - Nhân viên: CHỈ xem tệp do mình tải lên, hoặc tệp thuộc hồ sơ/văn bản/nhiệm vụ mình có quyền truy cập.
 */
export function canAccessAttachment(
  file?: AttachmentFile | null,
  user?: User | null,
  dossiers: Dossier[] = [],
  incomingDocs: IncomingDocument[] = [],
  outgoingDocs: OutgoingDocument[] = [],
  tasks: Task[] = []
): boolean {
  if (!file || !user) return false;

  if (isLeaderOrAdmin(user)) return true;

  // Người trực tiếp tải tệp lên
  if (file.uploadedById === user.id) return true;

  // Nếu thuộc hồ sơ, kiểm tra quyền hồ sơ
  if (file.dossierId) {
    const d = dossiers.find((dos) => dos.id === file.dossierId || dos.code === file.dossierId);
    if (d && canAccessDossier(d, user, tasks, incomingDocs, outgoingDocs)) {
      return true;
    }
  }

  // Nếu tệp thuộc văn bản đến
  if (file.category === 'VAN_BAN_DEN' && file.relatedId) {
    const doc = incomingDocs.find((d) => d.id === file.relatedId);
    if (doc && canAccessIncomingDoc(doc, user, tasks)) return true;
  }

  // Nếu tệp thuộc văn bản đi
  if (file.category === 'VAN_BAN_DI' && file.relatedId) {
    const doc = outgoingDocs.find((d) => d.id === file.relatedId);
    if (doc && canAccessOutgoingDoc(doc, user, dossiers)) return true;
  }

  // Nếu tệp thuộc công việc
  if (file.category === 'CONG_VIEC' && file.relatedId) {
    const task = tasks.find((t) => t.id === file.relatedId);
    if (task && canAccessTask(task, user)) return true;
  }

  // Biểu mẫu công khai / quy định chung
  if (!file.dossierId && !file.relatedId && file.category === 'KHAC') {
    return true;
  }

  return false;
}
