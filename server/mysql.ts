import mysql from 'mysql2/promise';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_POSITIONS,
  INITIAL_USERS,
  INITIAL_DOSSIERS,
  INITIAL_INCOMING_DOCS,
  INITIAL_OUTGOING_DOCS,
  INITIAL_TASKS,
  INITIAL_ATTACHMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../src/data/mockData';

interface DbConfig {
  host: string;
  user: string;
  password?: string;
  database: string;
  port: number;
}

let pool: mysql.Pool | null = null;
let isConnected = false;
let connectionError: string | null = null;

export function getDbConfig(): DbConfig {
  return {
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'vanphong_so',
    port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10),
  };
}

export function getPool(): mysql.Pool | null {
  if (pool) return pool;
  try {
    const config = getDbConfig();
    pool = mysql.createPool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    return pool;
  } catch (err: any) {
    connectionError = err.message;
    return null;
  }
}

export async function checkMySqlConnection(): Promise<{
  connected: boolean;
  config: DbConfig;
  error?: string;
  tablesCount?: number;
}> {
  const config = getDbConfig();
  try {
    const p = getPool();
    if (!p) throw new Error('Cannot create MySQL pool');
    const [rows] = (await p.query('SHOW TABLES')) as any;
    isConnected = true;
    connectionError = null;
    return {
      connected: true,
      config,
      tablesCount: Array.isArray(rows) ? rows.length : 0,
    };
  } catch (err: any) {
    isConnected = false;
    connectionError = err.message;
    return {
      connected: false,
      config,
      error: err.message,
    };
  }
}

export async function initTablesAndSeed(): Promise<{ success: boolean; message: string }> {
  const p = getPool();
  if (!p) throw new Error('Không thể kết nối MySQL pool');

  // 1. Create tables
  await p.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      manager_id VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS positions (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      level INT DEFAULT 5
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      username VARCHAR(100) UNIQUE,
      password VARCHAR(255) DEFAULT '123',
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      avatar TEXT,
      department VARCHAR(255),
      department_id VARCHAR(50),
      position VARCHAR(255),
      position_id VARCHAR(50),
      role VARCHAR(50) DEFAULT 'STAFF',
      status VARCHAR(50) DEFAULT 'ACTIVE',
      join_date DATE,
      bio TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS dossiers (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(100) NOT NULL,
      title VARCHAR(500) NOT NULL,
      department VARCHAR(255),
      department_id VARCHAR(50),
      leader_id VARCHAR(50),
      manager_id VARCHAR(50),
      status VARCHAR(50) DEFAULT 'IN_PROGRESS',
      start_date DATE,
      end_date DATE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS incoming_documents (
      id VARCHAR(50) PRIMARY KEY,
      document_number VARCHAR(100) NOT NULL,
      official_number VARCHAR(100),
      received_date DATE NOT NULL,
      issue_date DATE,
      issuing_authority VARCHAR(255) NOT NULL,
      summary TEXT NOT NULL,
      doc_type VARCHAR(100) DEFAULT 'Công văn',
      urgency VARCHAR(50) DEFAULT 'THUONG',
      security_level VARCHAR(50) DEFAULT 'THUONG',
      assignee_id VARCHAR(50),
      co_assignee_ids LONGTEXT,
      due_date DATE,
      status VARCHAR(50) DEFAULT 'PROCESSING',
      result_summary TEXT,
      dossier_id VARCHAR(50),
      linked_task_ids LONGTEXT,
      created_by_id VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS outgoing_documents (
      id VARCHAR(50) PRIMARY KEY,
      document_number VARCHAR(100) NOT NULL,
      release_date DATE NOT NULL,
      doc_type VARCHAR(100) DEFAULT 'Công văn',
      recipient VARCHAR(255) NOT NULL,
      summary TEXT NOT NULL,
      drafter_id VARCHAR(50),
      signer_id VARCHAR(50),
      status VARCHAR(50) DEFAULT 'DRAFT',
      dossier_id VARCHAR(50),
      reply_to_doc_id VARCHAR(50),
      created_by_id VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(100) NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      dossier_id VARCHAR(50),
      incoming_doc_id VARCHAR(50),
      linked_doc_id VARCHAR(50),
      doc_type_relation VARCHAR(50),
      creator_id VARCHAR(50),
      created_by_id VARCHAR(50),
      assignee_id VARCHAR(50) NOT NULL,
      co_assignee_ids LONGTEXT,
      priority VARCHAR(50) DEFAULT 'MEDIUM',
      start_date DATE NOT NULL,
      due_date DATE NOT NULL,
      progress INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'IN_PROGRESS',
      completed_date DATE,
      result_notes TEXT,
      sub_tasks LONGTEXT,
      comments LONGTEXT,
      remind_days_before INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS attachments (
      id VARCHAR(50) PRIMARY KEY,
      file_name VARCHAR(255) NOT NULL,
      file_size BIGINT NOT NULL,
      file_type VARCHAR(50) NOT NULL,
      file_url TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      related_id VARCHAR(50),
      dossier_code VARCHAR(100),
      dossier_id VARCHAR(50),
      uploaded_by_id VARCHAR(50) NOT NULL,
      uploaded_by_name VARCHAR(255) NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      tags LONGTEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(50) PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_id VARCHAR(50) NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      user_avatar TEXT,
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(50) NOT NULL,
      entity_title VARCHAR(500) NOT NULL,
      details TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      link_type VARCHAR(50),
      target_id VARCHAR(50),
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Check and Seed if empty
  const [uRows] = (await p.query('SELECT COUNT(*) as count FROM users')) as any;
  if (uRows[0].count === 0) {
    for (const d of INITIAL_DEPARTMENTS) {
      await p.query('INSERT IGNORE INTO departments (id, code, name, description, manager_id) VALUES (?, ?, ?, ?, ?)', [
        d.id, d.code, d.name, d.description || '', d.managerId || null
      ]);
    }
    for (const pos of INITIAL_POSITIONS) {
      await p.query('INSERT IGNORE INTO positions (id, name, level) VALUES (?, ?, ?)', [
        pos.id, pos.name, pos.level || 5
      ]);
    }
    for (const u of INITIAL_USERS) {
      await p.query('INSERT IGNORE INTO users (id, username, password, full_name, email, phone, avatar, department, department_id, position, position_id, role, status, join_date, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        u.id, u.username, u.password || '123', u.fullName, u.email, u.phone || '', u.avatar || '', u.department || '', u.departmentId || null, u.position || '', u.positionId || null, u.role, u.status || 'ACTIVE', u.joinDate || null, u.bio || ''
      ]);
    }
    for (const dos of INITIAL_DOSSIERS) {
      await p.query('INSERT IGNORE INTO dossiers (id, code, title, department, department_id, leader_id, manager_id, status, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        dos.id, dos.code, dos.title, dos.department || '', dos.departmentId || null, dos.leaderId || null, dos.managerId || null, dos.status, dos.startDate, dos.endDate || null, dos.description || ''
      ]);
    }
    for (const inc of INITIAL_INCOMING_DOCS) {
      await p.query('INSERT IGNORE INTO incoming_documents (id, document_number, official_number, received_date, issue_date, issuing_authority, summary, doc_type, urgency, security_level, assignee_id, co_assignee_ids, due_date, status, result_summary, dossier_id, linked_task_ids, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        inc.id, inc.documentNumber, inc.officialNumber || '', inc.receivedDate, inc.issueDate || null, inc.issuingAuthority, inc.summary, inc.docType, inc.urgency, inc.securityLevel, inc.assigneeId || null, JSON.stringify(inc.coAssigneeIds || []), inc.dueDate, inc.status, inc.resultSummary || '', inc.dossierId || null, JSON.stringify(inc.linkedTaskIds || []), inc.createdById || null
      ]);
    }
    for (const out of INITIAL_OUTGOING_DOCS) {
      await p.query('INSERT IGNORE INTO outgoing_documents (id, document_number, release_date, doc_type, recipient, summary, drafter_id, signer_id, status, dossier_id, reply_to_doc_id, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        out.id, out.documentNumber, out.releaseDate, out.docType, out.recipient, out.summary, out.drafterId || null, out.signerId || null, out.status, out.dossierId || null, out.replyToDocId || null, out.createdById || null
      ]);
    }
    for (const t of INITIAL_TASKS) {
      await p.query('INSERT IGNORE INTO tasks (id, code, title, description, dossier_id, incoming_doc_id, linked_doc_id, doc_type_relation, creator_id, created_by_id, assignee_id, co_assignee_ids, priority, start_date, due_date, progress, status, completed_date, result_notes, sub_tasks, comments, remind_days_before) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        t.id, t.code, t.title, t.description, t.dossierId || null, t.incomingDocId || null, t.linkedDocId || null, t.docTypeRelation || null, t.creatorId || null, t.createdById || null, t.assigneeId, JSON.stringify(t.coAssigneeIds || []), t.priority, t.startDate, t.dueDate, t.progress || 0, t.status, t.completedDate || null, t.resultNotes || '', JSON.stringify(t.subTasks || []), JSON.stringify(t.comments || []), t.remindDaysBefore || 1
      ]);
    }
    for (const a of INITIAL_ATTACHMENTS) {
      await p.query('INSERT IGNORE INTO attachments (id, file_name, file_size, file_type, file_url, category, related_id, dossier_code, dossier_id, uploaded_by_id, uploaded_by_name, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        a.id, a.fileName, a.fileSize || 0, a.fileType || '', a.fileUrl || '', a.category, a.relatedId || null, a.dossierCode || '', a.dossierId || null, a.uploadedById || '', a.uploadedByName || '', JSON.stringify(a.tags || [])
      ]);
    }
    for (const l of INITIAL_AUDIT_LOGS) {
      await p.query('INSERT IGNORE INTO audit_logs (id, user_id, user_name, user_avatar, action, entity_type, entity_id, entity_title, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        l.id, l.userId || '', l.userName, l.userAvatar || '', l.action, l.entityType, l.entityId, l.entityTitle, l.details
      ]);
    }
    for (const n of INITIAL_NOTIFICATIONS) {
      await p.query('INSERT IGNORE INTO notifications (id, user_id, title, message, type, link_type, target_id, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
        n.id, n.userId || '', n.title, n.message, n.type, n.linkType || null, n.targetId || null, n.isRead ? 1 : 0
      ]);
    }
  }

  return { success: true, message: 'Đã khởi tạo bảng và dữ liệu MySQL thành công' };
}

// Map helper to parse JSON fields safely
const parseJson = (val: any, fallback: any = []) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const formatDate = (val: any) => {
  if (!val) return undefined;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val).split('T')[0];
};

export async function fetchAllDataFromMySql() {
  const p = getPool();
  if (!p) throw new Error('MySQL Pool không khả dụng');

  const [departments] = (await p.query('SELECT * FROM departments')) as any[];
  const [users] = (await p.query('SELECT * FROM users')) as any[];
  const [dossiers] = (await p.query('SELECT * FROM dossiers ORDER BY created_at DESC')) as any[];
  const [incomingDocs] = (await p.query('SELECT * FROM incoming_documents ORDER BY received_date DESC')) as any[];
  const [outgoingDocs] = (await p.query('SELECT * FROM outgoing_documents ORDER BY release_date DESC')) as any[];
  const [tasks] = (await p.query('SELECT * FROM tasks ORDER BY due_date ASC')) as any[];
  const [attachments] = (await p.query('SELECT * FROM attachments ORDER BY uploaded_at DESC')) as any[];
  const [auditLogs] = (await p.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100')) as any[];
  const [notifications] = (await p.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50')) as any[];

  return {
    departments: departments.map((d: any) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      managerId: d.manager_id,
    })),
    users: users.map((u: any) => ({
      id: u.id,
      username: u.username || u.email.split('@')[0],
      password: u.password || '123',
      fullName: u.full_name,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
      department: u.department,
      departmentId: u.department_id,
      position: u.position,
      positionId: u.position_id,
      role: u.role,
      status: u.status,
      joinDate: formatDate(u.join_date),
      bio: u.bio,
    })),
    dossiers: dossiers.map((d: any) => ({
      id: d.id,
      code: d.code,
      title: d.title,
      department: d.department,
      departmentId: d.department_id,
      leaderId: d.leader_id,
      managerId: d.manager_id,
      status: d.status,
      startDate: formatDate(d.start_date),
      endDate: formatDate(d.end_date),
      description: d.description,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    })),
    incomingDocs: incomingDocs.map((doc: any) => ({
      id: doc.id,
      documentNumber: doc.document_number,
      officialNumber: doc.official_number,
      receivedDate: formatDate(doc.received_date),
      issueDate: formatDate(doc.issue_date),
      issuingAuthority: doc.issuing_authority,
      summary: doc.summary,
      docType: doc.doc_type,
      urgency: doc.urgency,
      securityLevel: doc.security_level,
      assigneeId: doc.assignee_id,
      coAssigneeIds: parseJson(doc.co_assignee_ids, []),
      dueDate: formatDate(doc.due_date),
      status: doc.status,
      resultSummary: doc.result_summary,
      dossierId: doc.dossier_id,
      linkedTaskIds: parseJson(doc.linked_task_ids, []),
      attachments: [],
      createdById: doc.created_by_id,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    })),
    outgoingDocs: outgoingDocs.map((doc: any) => ({
      id: doc.id,
      documentNumber: doc.document_number,
      releaseDate: formatDate(doc.release_date),
      docType: doc.doc_type,
      recipient: doc.recipient,
      summary: doc.summary,
      drafterId: doc.drafter_id,
      signerId: doc.signer_id,
      status: doc.status,
      dossierId: doc.dossier_id,
      replyToDocId: doc.reply_to_doc_id,
      attachments: [],
      createdById: doc.created_by_id,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    })),
    tasks: tasks.map((t: any) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      description: t.description,
      dossierId: t.dossier_id,
      incomingDocId: t.incoming_doc_id,
      linkedDocId: t.linked_doc_id,
      docTypeRelation: t.doc_type_relation,
      creatorId: t.creator_id,
      createdById: t.created_by_id,
      assigneeId: t.assignee_id,
      coAssigneeIds: parseJson(t.co_assignee_ids, []),
      priority: t.priority,
      startDate: formatDate(t.start_date),
      dueDate: formatDate(t.due_date),
      progress: t.progress,
      status: t.status,
      completedDate: formatDate(t.completed_date),
      resultNotes: t.result_notes,
      subTasks: parseJson(t.sub_tasks, []),
      attachments: [],
      comments: parseJson(t.comments, []),
      remindDaysBefore: t.remind_days_before,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
    attachments: attachments.map((a: any) => ({
      id: a.id,
      fileName: a.file_name,
      fileSize: Number(a.file_size),
      fileType: a.file_type,
      fileUrl: a.file_url,
      category: a.category,
      relatedId: a.related_id,
      dossierCode: a.dossier_code,
      dossierId: a.dossier_id,
      uploadedById: a.uploaded_by_id,
      uploadedByName: a.uploaded_by_name,
      uploadedAt: a.uploaded_at,
      tags: parseJson(a.tags, []),
    })),
    auditLogs: auditLogs.map((l: any) => ({
      id: l.id,
      timestamp: l.timestamp,
      userId: l.user_id,
      userName: l.user_name,
      userAvatar: l.user_avatar,
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      entityTitle: l.entity_title,
      details: l.details,
    })),
    notifications: notifications.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      linkType: n.link_type,
      targetId: n.target_id,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    })),
  };
}
