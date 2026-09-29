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
