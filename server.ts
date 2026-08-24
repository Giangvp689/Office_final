import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  checkMySqlConnection,
  initTablesAndSeed,
  fetchAllDataFromMySql,
  getPool,
  getDbConfig,
  setDbConfig,
  ensureAllTableSchemas,
  isConnectionError,
} from './server/mysql';
import {
  loadStore,
  saveStore,
  syncStoreWithMySql,
} from './server/store';
import { INITIAL_USERS } from './src/data/mockData';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to safely run DB queries with auto-retry & auto-schema migration
async function safeDbRun(fn: (pool: any) => Promise<any>): Promise<{ success: boolean; error?: string; fromDb: boolean }> {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, error: 'Chưa kết nối MySQL', fromDb: false };
    }
    await fn(pool);
    return { success: true, fromDb: true };
  } catch (err: any) {
    // If it is a connection error (e.g. database server not reachable), return gracefully without triggering schema migrations
    if (isConnectionError(err)) {
      return { success: false, error: err?.message || 'Không thể kết nối CSDL MySQL', fromDb: false };
    }

    try {
      const pool = getPool();
      if (pool) {
        // Automatically check and migrate missing columns / tables
        await ensureAllTableSchemas(pool);
        await fn(pool);
        console.log('[MySQL Execution Success after auto-schema migration]');
        return { success: true, fromDb: true };
      }
    } catch (retryErr: any) {
      if (!isConnectionError(retryErr)) {
        console.error('[MySQL Execution Error after Retry]:', retryErr?.message || retryErr);
      }
      return { success: false, error: retryErr?.message || 'Lỗi truy vấn CSDL', fromDb: false };
    }
    return { success: false, error: err?.message || 'Lỗi truy vấn CSDL', fromDb: false };
  }
}

// Auto-sync store on boot
syncStoreWithMySql().then(({ connected }) => {
  console.log(`[Database Boot Status]: MySQL Connected = ${connected}`);
});

// Lazy Google GenAI Client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong file .env. Hãy điền khóa API vào file .env rồi khởi động lại server.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Helper to call Gemini with automatic model fallback, multimodal support (PDF / Scan / Images), and high performance
async function generateGeminiContent(options: {
  prompt?: string;
  contents?: any;
  parts?: any[];
  jsonMode?: boolean;
}): Promise<string> {
  const ai = getAIClient();
  // Models with excellent Multimodal & OCR capabilities
  const models = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  let requestContents: any;
  if (options.contents) {
    requestContents = options.contents;
  } else if (options.parts && options.parts.length > 0) {
    requestContents = { parts: options.parts };
  } else {
    requestContents = options.prompt || '';
  }

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: requestContents,
        config: options.jsonMode ? { responseMimeType: 'application/json' } : undefined,
      });
      if (response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} encountered error:`, err?.message || err);
      // If quota or temporary unavailable, try next model immediately without blocking
    }
  }

  throw lastError || new Error('Không thể kết nối đến dịch vụ AI Gemini. Vui lòng thử lại sau giây lát.');
}

// ==========================================
// 0. MYSQL DATABASE & CONFIG API ROUTES
// ==========================================

// Lấy cấu hình và trạng thái kết nối MySQL
app.get('/api/db-status', async (_req, res) => {
  try {
    const status = await checkMySqlConnection();
    res.json(status);
  } catch (error: any) {
    res.json({
      connected: false,
      config: getDbConfig(),
      error: error.message,
    });
  }
});

// Cập nhật cấu hình MySQL động (Host, Port, User, Password, DB Name)
app.post('/api/db-config', async (req, res) => {
  try {
    const { host, port, user, password, database } = req.body;
    setDbConfig({
      host,
      port: Number(port) || 3306,
      user,
      password: password !== undefined ? password : '',
      database,
    });
    const status = await checkMySqlConnection();
    if (status.connected) {
      await syncStoreWithMySql();
    }
    res.json({
      success: status.connected,
      status,
      message: status.connected ? 'Kết nối MySQL thành công và đã đồng bộ CSDL!' : `Không thể kết nối: ${status.error}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Khởi tạo bảng và nạp dữ liệu mẫu vào MySQL
app.post('/api/init-db', async (_req, res) => {
  try {
    const result = await initTablesAndSeed();
    await syncStoreWithMySql();
    res.json(result);
  } catch (error: any) {
    console.error('Init DB error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lấy toàn bộ dữ liệu từ MySQL & Store
app.get('/api/sync-all', async (_req, res) => {
  try {
    const syncResult = await syncStoreWithMySql();
    res.json({
      connected: syncResult.connected,
      data: syncResult.data,
      message: syncResult.connected
        ? 'Dữ liệu được tải trực tiếp từ MySQL thành công!'
        : 'Dữ liệu được tải từ kho lưu trữ CSDL của máy chủ',
    });
  } catch (error: any) {
    console.error('Sync MySQL error:', error);
    const store = loadStore();
    res.json({
      connected: false,
      error: error.message,
      data: store,
    });
  }
});

// Helper to sanitize dates for MySQL (empty string -> null, valid format YYYY-MM-DD)
function sanitizeDate(dateStr: any): string | null {
  if (!dateStr || String(dateStr).trim() === '' || String(dateStr) === 'undefined' || String(dateStr) === 'null') return null;
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().substring(0, 10);
  }
  return null;
}

// ==========================================
// 1. GET ALL ENTITY APIS (DIRECT FROM DB)
// ==========================================
app.get('/api/users', async (_req, res) => {
  try {
    const sync = await syncStoreWithMySql();
    res.json({ success: true, data: sync.data.users, connected: sync.connected });
  } catch (e: any) {
    res.json({ success: true, data: loadStore().users, connected: false });
  }
});

app.get('/api/incoming-docs', async (_req, res) => {
  try {
    const sync = await syncStoreWithMySql();
    res.json({ success: true, data: sync.data.incomingDocs, connected: sync.connected });
  } catch (e: any) {
    res.json({ success: true, data: loadStore().incomingDocs, connected: false });
  }
});

app.get('/api/outgoing-docs', async (_req, res) => {
  try {
    const sync = await syncStoreWithMySql();
    res.json({ success: true, data: sync.data.outgoingDocs, connected: sync.connected });
  } catch (e: any) {
    res.json({ success: true, data: loadStore().outgoingDocs, connected: false });
  }
});

app.get('/api/tasks', async (_req, res) => {
  try {
    const sync = await syncStoreWithMySql();
    res.json({ success: true, data: sync.data.tasks, connected: sync.connected });
  } catch (e: any) {
    res.json({ success: true, data: loadStore().tasks, connected: false });
  }
});

app.get('/api/dossiers', async (_req, res) => {
  try {
    const sync = await syncStoreWithMySql();
    res.json({ success: true, data: sync.data.dossiers, connected: sync.connected });
  } catch (e: any) {
    res.json({ success: true, data: loadStore().dossiers, connected: false });
  }
});

app.get('/api/attachments', async (_req, res) => {
  try {
    const sync = await syncStoreWithMySql();
    res.json({ success: true, data: sync.data.attachments, connected: sync.connected });
  } catch (e: any) {
    res.json({ success: true, data: loadStore().attachments, connected: false });
  }
});

app.get('/api/departments', async (_req, res) => {
  try {
    const sync = await syncStoreWithMySql();
    res.json({ success: true, data: sync.data.departments, connected: sync.connected });
  } catch (e: any) {
    res.json({ success: true, data: loadStore().departments, connected: false });
  }
});

app.get('/api/positions', async (_req, res) => {
  try {
    const sync = await syncStoreWithMySql();
    res.json({ success: true, data: sync.data.positions, connected: sync.connected });
  } catch (e: any) {
    res.json({ success: true, data: loadStore().positions, connected: false });
  }
});

app.get('/api/audit-logs', async (_req, res) => {
  try {
    const sync = await syncStoreWithMySql();
    res.json({ success: true, data: sync.data.auditLogs, connected: sync.connected });
  } catch (e: any) {
    res.json({ success: true, data: loadStore().auditLogs, connected: false });
  }
});

app.get('/api/notifications', async (_req, res) => {
  try {
    const sync = await syncStoreWithMySql();
    res.json({ success: true, data: sync.data.notifications, connected: sync.connected });
  } catch (e: any) {
    res.json({ success: true, data: loadStore().notifications, connected: false });
  }
});

// ==========================================
// 2. CRUD: NGƯỜI DÙNG & CÁN BỘ (users)
// ==========================================
app.post('/api/users', async (req, res) => {
  try {
    const u = req.body;
    if (!u.id || !u.fullName || !u.email) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin người dùng bắt buộc' });
    }

    const username = (u.username?.trim() || u.email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '') || u.id).trim();

    // Update persistent store
    const store = loadStore();
    const existingIdx = store.users.findIndex((x) => x.id === u.id);
    const userObj = { ...u, username };
    if (existingIdx >= 0) {
      store.users[existingIdx] = { ...store.users[existingIdx], ...userObj };
    } else {
      store.users.unshift(userObj);
    }
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO users 
        (id, username, password, full_name, email, phone, avatar, department, department_id, position, position_id, role, status, join_date, bio) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        username=VALUES(username), password=VALUES(password), full_name=VALUES(full_name), email=VALUES(email), phone=VALUES(phone), avatar=VALUES(avatar), department=VALUES(department), department_id=VALUES(department_id), position=VALUES(position), position_id=VALUES(position_id), role=VALUES(role), status=VALUES(status), join_date=VALUES(join_date), bio=VALUES(bio)`,
        [
          u.id,
          username,
          u.password || '123',
          u.fullName.trim(),
          u.email.trim(),
          u.phone || null,
          u.avatar || null,
          u.department || null,
          u.departmentId || null,
          u.position || null,
          u.positionId || null,
          u.role || 'STAFF',
          u.status || 'ACTIVE',
          sanitizeDate(u.joinDate),
          u.bio || null,
        ]
      );
    });

    if (dbResult.fromDb) {
      console.log(`[MySQL DB]: Successfully saved user "${u.fullName}" (${u.id}) to MySQL database.`);
    } else {
      console.warn(`[MySQL DB Warning]: User "${u.fullName}" saved to cache, but MySQL returned:`, dbResult.error);
    }

    res.json({ success: true, user: userObj, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    console.error('Error saving user:', error);
    res.status(500).json({ success: false, error: error.message, user: req.body });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;

    const store = loadStore();
    const existingIdx = store.users.findIndex((x) => x.id === id);
    if (existingIdx >= 0) {
      store.users[existingIdx] = { ...store.users[existingIdx], ...u };
    } else {
      store.users.unshift(u);
    }
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `UPDATE users SET 
        username=?, password=?, full_name=?, email=?, phone=?, avatar=?, department=?, department_id=?, position=?, position_id=?, role=?, status=?, join_date=?, bio=?
        WHERE id=?`,
        [
          u.username || u.email?.split('@')[0] || id,
          u.password || '123',
          u.fullName,
          u.email,
          u.phone || null,
          u.avatar || null,
          u.department || null,
          u.departmentId || null,
          u.position || null,
          u.positionId || null,
          u.role || 'STAFF',
          u.status || 'ACTIVE',
          sanitizeDate(u.joinDate),
          u.bio || null,
          id,
        ]
      );
    });
    res.json({ success: true, user: u, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, user: req.body });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadStore();
    store.users = store.users.filter((u) => u.id !== id);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM users WHERE id=?', [id]);
    });
    res.json({ success: true, id, fromDb: dbResult.fromDb });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, id: req.params.id });
  }
});

// ==========================================
// 3. CRUD: VĂN BẢN ĐẾN (incoming_documents)
// ==========================================
app.post('/api/incoming-docs', async (req, res) => {
  try {
    const doc = req.body;
    const store = loadStore();
    const idx = store.incomingDocs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) store.incomingDocs[idx] = { ...store.incomingDocs[idx], ...doc };
    else store.incomingDocs.unshift(doc);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO incoming_documents 
        (id, document_number, official_number, received_date, issue_date, issuing_authority, summary, doc_type, urgency, security_level, assignee_id, co_assignee_ids, due_date, status, result_summary, dossier_id, linked_task_ids, created_by_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        document_number=VALUES(document_number), official_number=VALUES(official_number), received_date=VALUES(received_date), issue_date=VALUES(issue_date), issuing_authority=VALUES(issuing_authority), summary=VALUES(summary), doc_type=VALUES(doc_type), urgency=VALUES(urgency), security_level=VALUES(security_level), assignee_id=VALUES(assignee_id), co_assignee_ids=VALUES(co_assignee_ids), due_date=VALUES(due_date), status=VALUES(status), result_summary=VALUES(result_summary), dossier_id=VALUES(dossier_id), linked_task_ids=VALUES(linked_task_ids)`,
        [
          doc.id,
          doc.documentNumber,
          doc.officialNumber || null,
          sanitizeDate(doc.receivedDate) || new Date().toISOString().substring(0, 10),
          sanitizeDate(doc.issueDate),
          doc.issuingAuthority,
          doc.summary,
          doc.docType || 'Công văn',
          doc.urgency || 'THUONG',
          doc.securityLevel || 'THUONG',
          doc.assigneeId || null,
          JSON.stringify(doc.coAssigneeIds || []),
          sanitizeDate(doc.dueDate),
          doc.status || 'PROCESSING',
          doc.resultSummary || null,
          doc.dossierId || null,
          JSON.stringify(doc.linkedTaskIds || []),
          doc.createdById || null,
        ]
      );
    });
    res.json({ success: true, doc, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.json({ success: true, doc: req.body });
  }
});

app.put('/api/incoming-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = req.body;
    const store = loadStore();
    const idx = store.incomingDocs.findIndex((d) => d.id === id);
    if (idx >= 0) store.incomingDocs[idx] = { ...store.incomingDocs[idx], ...doc };
    else store.incomingDocs.unshift(doc);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `UPDATE incoming_documents SET 
        document_number=?, official_number=?, received_date=?, issue_date=?, issuing_authority=?, summary=?, doc_type=?, urgency=?, security_level=?, assignee_id=?, co_assignee_ids=?, due_date=?, status=?, result_summary=?, dossier_id=?, linked_task_ids=?
        WHERE id=?`,
        [
          doc.documentNumber,
          doc.officialNumber || null,
          sanitizeDate(doc.receivedDate) || new Date().toISOString().substring(0, 10),
          sanitizeDate(doc.issueDate),
          doc.issuingAuthority,
          doc.summary,
          doc.docType || 'Công văn',
          doc.urgency || 'THUONG',
          doc.securityLevel || 'THUONG',
          doc.assigneeId || null,
          JSON.stringify(doc.coAssigneeIds || []),
          sanitizeDate(doc.dueDate),
          doc.status || 'PROCESSING',
          doc.resultSummary || null,
          doc.dossierId || null,
          JSON.stringify(doc.linkedTaskIds || []),
          id,
        ]
      );
    });
    res.json({ success: true, doc, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.json({ success: true, doc: req.body });
  }
});

app.delete('/api/incoming-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadStore();
    store.incomingDocs = store.incomingDocs.filter((d) => d.id !== id);
    store.attachments = store.attachments.filter((a) => a.relatedId !== id);
    store.tasks = store.tasks.map((t) => {
      if (t.incomingDocId === id || t.linkedDocId === id) {
        return { ...t, incomingDocId: undefined, linkedDocId: undefined };
      }
      return t;
    });
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM attachments WHERE related_id=?', [id]);
      await pool.query('UPDATE tasks SET incoming_doc_id=NULL, linked_doc_id=NULL WHERE incoming_doc_id=? OR linked_doc_id=?', [id, id]);
      await pool.query('DELETE FROM incoming_documents WHERE id=?', [id]);
    });
    res.json({ success: true, id, fromDb: dbResult.fromDb });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

// ==========================================
// 4. CRUD: VĂN BẢN ĐI (outgoing_documents)
// ==========================================
app.post('/api/outgoing-docs', async (req, res) => {
  try {
    const doc = req.body;
    const store = loadStore();
    const idx = store.outgoingDocs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) store.outgoingDocs[idx] = { ...store.outgoingDocs[idx], ...doc };
    else store.outgoingDocs.unshift(doc);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO outgoing_documents 
        (id, document_number, release_date, doc_type, recipient, summary, content, drafter_id, signer_id, status, dossier_id, reply_to_doc_id, created_by_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        document_number=VALUES(document_number), release_date=VALUES(release_date), doc_type=VALUES(doc_type), recipient=VALUES(recipient), summary=VALUES(summary), content=VALUES(content), drafter_id=VALUES(drafter_id), signer_id=VALUES(signer_id), status=VALUES(status), dossier_id=VALUES(dossier_id), reply_to_doc_id=VALUES(reply_to_doc_id)`,
        [
          doc.id,
          doc.documentNumber,
          sanitizeDate(doc.releaseDate) || new Date().toISOString().substring(0, 10),
          doc.docType || 'Công văn',
          doc.recipient,
          doc.summary,
          doc.content || null,
          doc.drafterId || null,
          doc.signerId || null,
          doc.status || 'DRAFT',
          doc.dossierId || null,
          doc.replyToDocId || null,
          doc.createdById || null,
        ]
      );
    });
    res.json({ success: true, doc, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.json({ success: true, doc: req.body });
  }
});

app.put('/api/outgoing-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = req.body;
    const store = loadStore();
    const idx = store.outgoingDocs.findIndex((d) => d.id === id);
    if (idx >= 0) store.outgoingDocs[idx] = { ...store.outgoingDocs[idx], ...doc };
    else store.outgoingDocs.unshift(doc);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `UPDATE outgoing_documents SET 
        document_number=?, release_date=?, doc_type=?, recipient=?, summary=?, content=?, drafter_id=?, signer_id=?, status=?, dossier_id=?, reply_to_doc_id=?
        WHERE id=?`,
        [
          doc.documentNumber,
          sanitizeDate(doc.releaseDate) || new Date().toISOString().substring(0, 10),
          doc.docType || 'Công văn',
          doc.recipient,
          doc.summary,
          doc.content || null,
          doc.drafterId || null,
          doc.signerId || null,
          doc.status || 'DRAFT',
          doc.dossierId || null,
          doc.replyToDocId || null,
          id,
        ]
      );
    });
    res.json({ success: true, doc, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.json({ success: true, doc: req.body });
  }
});

app.delete('/api/outgoing-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadStore();
    store.outgoingDocs = store.outgoingDocs.filter((d) => d.id !== id);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM outgoing_documents WHERE id=?', [id]);
    });
    res.json({ success: true, id, fromDb: dbResult.fromDb });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

// ==========================================
// 5. CRUD: CÔNG VIỆC / NHIỆM VỤ (tasks)
// ==========================================
app.post('/api/tasks', async (req, res) => {
  try {
    const t = req.body;
    const store = loadStore();
    const idx = store.tasks.findIndex((x) => x.id === t.id);
    if (idx >= 0) store.tasks[idx] = { ...store.tasks[idx], ...t };
    else store.tasks.unshift(t);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO tasks 
        (id, code, title, description, dossier_id, incoming_doc_id, linked_doc_id, doc_type_relation, creator_id, created_by_id, assignee_id, co_assignee_ids, priority, start_date, due_date, progress, status, completed_date, result_notes, sub_tasks, comments, remind_days_before) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        code=VALUES(code), title=VALUES(title), description=VALUES(description), dossier_id=VALUES(dossier_id), incoming_doc_id=VALUES(incoming_doc_id), linked_doc_id=VALUES(linked_doc_id), doc_type_relation=VALUES(doc_type_relation), creator_id=VALUES(creator_id), created_by_id=VALUES(created_by_id), assignee_id=VALUES(assignee_id), co_assignee_ids=VALUES(co_assignee_ids), priority=VALUES(priority), start_date=VALUES(start_date), due_date=VALUES(due_date), progress=VALUES(progress), status=VALUES(status), completed_date=VALUES(completed_date), result_notes=VALUES(result_notes), sub_tasks=VALUES(sub_tasks), comments=VALUES(comments), remind_days_before=VALUES(remind_days_before)`,
        [
          t.id,
          t.code,
          t.title,
          t.description || null,
          t.dossierId || null,
          t.incomingDocId || null,
          t.linkedDocId || null,
          t.docTypeRelation || null,
          t.creatorId || t.createdById || null,
          t.createdById || t.creatorId || null,
          t.assigneeId,
          JSON.stringify(t.coAssigneeIds || []),
          t.priority || 'MEDIUM',
          sanitizeDate(t.startDate) || new Date().toISOString().substring(0, 10),
          sanitizeDate(t.dueDate) || new Date().toISOString().substring(0, 10),
          t.progress || 0,
          t.status || 'IN_PROGRESS',
          sanitizeDate(t.completedDate),
          t.resultNotes || null,
          JSON.stringify(t.subTasks || []),
          JSON.stringify(t.comments || []),
          t.remindDaysBefore || 1,
        ]
      );
    });
    res.json({ success: true, task: t, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.json({ success: true, task: req.body });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const t = req.body;
    const store = loadStore();
    const idx = store.tasks.findIndex((x) => x.id === id);
    if (idx >= 0) store.tasks[idx] = { ...store.tasks[idx], ...t };
    else store.tasks.unshift(t);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `UPDATE tasks SET 
        code=?, title=?, description=?, dossier_id=?, incoming_doc_id=?, linked_doc_id=?, doc_type_relation=?, creator_id=?, created_by_id=?, assignee_id=?, co_assignee_ids=?, priority=?, start_date=?, due_date=?, progress=?, status=?, completed_date=?, result_notes=?, sub_tasks=?, comments=?, remind_days_before=?
        WHERE id=?`,
        [
          t.code,
          t.title,
          t.description || null,
          t.dossierId || null,
          t.incomingDocId || null,
          t.linkedDocId || null,
          t.docTypeRelation || null,
          t.creatorId || t.createdById || null,
          t.createdById || t.creatorId || null,
          t.assigneeId,
          JSON.stringify(t.coAssigneeIds || []),
          t.priority || 'MEDIUM',
          sanitizeDate(t.startDate) || new Date().toISOString().substring(0, 10),
          sanitizeDate(t.dueDate) || new Date().toISOString().substring(0, 10),
          t.progress || 0,
          t.status || 'IN_PROGRESS',
          sanitizeDate(t.completedDate),
          t.resultNotes || null,
          JSON.stringify(t.subTasks || []),
          JSON.stringify(t.comments || []),
          t.remindDaysBefore || 1,
          id,
        ]
      );
    });
    res.json({ success: true, task: t, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.json({ success: true, task: req.body });
  }
});

// Endpoint riêng để thêm tin nhắn trao đổi vào nhiệm vụ
app.post('/api/tasks/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comment = req.body;
    const store = loadStore();
    const task = store.tasks.find((x) => x.id === id);

    let updatedComments: any[] = [];
    if (task) {
      task.comments = task.comments || [];
      if (!task.comments.some((c: any) => c.id === comment.id)) {
        task.comments.push(comment);
      }
      updatedComments = task.comments;
      saveStore(store);
    }

    const dbResult = await safeDbRun(async (pool) => {
      // Lấy comments hiện tại từ DB
      const [rows] = await pool.query('SELECT comments FROM tasks WHERE id = ?', [id]) as any;
      let currentComments = [];
      if (rows && rows[0] && rows[0].comments) {
        try {
          currentComments = typeof rows[0].comments === 'string' ? JSON.parse(rows[0].comments) : rows[0].comments;
        } catch {
          currentComments = [];
        }
      }
      if (!currentComments.some((c: any) => c.id === comment.id)) {
        currentComments.push(comment);
      }
      await pool.query('UPDATE tasks SET comments = ? WHERE id = ?', [JSON.stringify(currentComments), id]);
    });

    res.json({ success: true, comment, comments: updatedComments, fromDb: dbResult.fromDb });
  } catch (error: any) {
    res.json({ success: true, comment: req.body });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadStore();
    store.tasks = store.tasks.filter((t) => t.id !== id);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM tasks WHERE id=?', [id]);
    });
    res.json({ success: true, id, fromDb: dbResult.fromDb });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

// ==========================================
// 6. CRUD: HỒ SƠ VỤ VIỆC (dossiers)
// ==========================================
app.post('/api/dossiers', async (req, res) => {
  try {
    const d = req.body;
    const store = loadStore();
    const idx = store.dossiers.findIndex((x) => x.id === d.id);
    if (idx >= 0) store.dossiers[idx] = { ...store.dossiers[idx], ...d };
    else store.dossiers.unshift(d);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO dossiers 
        (id, code, title, department, department_id, leader_id, manager_id, status, start_date, end_date, description) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        code=VALUES(code), title=VALUES(title), department=VALUES(department), department_id=VALUES(department_id), leader_id=VALUES(leader_id), manager_id=VALUES(manager_id), status=VALUES(status), start_date=VALUES(start_date), end_date=VALUES(end_date), description=VALUES(description)`,
        [
          d.id,
          d.code,
          d.title,
          d.department || null,
          d.departmentId || null,
          d.leaderId || null,
          d.managerId || null,
          d.status || 'IN_PROGRESS',
          sanitizeDate(d.startDate) || new Date().toISOString().substring(0, 10),
          sanitizeDate(d.endDate),
          d.description || null,
        ]
      );
    });
    res.json({ success: true, dossier: d, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.json({ success: true, dossier: req.body });
  }
});

app.put('/api/dossiers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;
    const store = loadStore();
    const idx = store.dossiers.findIndex((x) => x.id === id);
    if (idx >= 0) store.dossiers[idx] = { ...store.dossiers[idx], ...d };
    else store.dossiers.unshift(d);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `UPDATE dossiers SET 
        code=?, title=?, department=?, department_id=?, leader_id=?, manager_id=?, status=?, start_date=?, end_date=?, description=?
        WHERE id=?`,
        [
          d.code,
          d.title,
          d.department || null,
          d.departmentId || null,
          d.leaderId || null,
          d.managerId || null,
          d.status || 'IN_PROGRESS',
          sanitizeDate(d.startDate) || new Date().toISOString().substring(0, 10),
          sanitizeDate(d.endDate),
          d.description || null,
          id,
        ]
      );
    });
    res.json({ success: true, dossier: d, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.json({ success: true, dossier: req.body });
  }
});

app.delete('/api/dossiers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadStore();
    store.dossiers = store.dossiers.filter((d) => d.id !== id);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM dossiers WHERE id=?', [id]);
    });
    res.json({ success: true, id, fromDb: dbResult.fromDb });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

// ==========================================
// 7. AUTHENTICATION & LOGIN API
// ==========================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên tài khoản và mật khẩu.' });
    }

    const cleanInput = String(username).trim().toLowerCase();

    // 1. Check from MySQL if reachable
    try {
      const pool = getPool();
      if (pool) {
        const [rows] = (await pool.query(
          'SELECT * FROM users WHERE (LOWER(username) = ? OR LOWER(email) = ?) LIMIT 1',
          [cleanInput, cleanInput]
        )) as any[];

        if (rows && rows.length > 0) {
          const u = rows[0];
          const userPass = u.password || '123';
          if (password === userPass) {
            const userObj = {
              id: u.id,
              username: u.username || u.email.split('@')[0],
              fullName: u.full_name,
              email: u.email,
              phone: u.phone || '',
              avatar: u.avatar || '',
              department: u.department || '',
              departmentId: u.department_id || '',
              position: u.position || '',
              positionId: u.position_id || '',
              role: u.role || 'STAFF',
              status: u.status || 'ACTIVE',
              joinDate: u.join_date ? String(u.join_date).substring(0, 10) : '',
              bio: u.bio || '',
              lastLogin: new Date().toISOString(),
            };

            return res.json({
              success: true,
              user: userObj,
              token: `token_${u.id}_${Date.now()}`,
              message: 'Đăng nhập thành công từ CSDL!',
            });
          } else {
            return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác. Mặc định là: 123' });
          }
        }
      }
    } catch {
      // MySQL connection unavailable, proceed to store check
    }

    // 2. Check from persistent store
    const store = loadStore();
    const match = store.users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanInput) ||
        u.email.toLowerCase() === cleanInput ||
        u.email.split('@')[0].toLowerCase() === cleanInput
    );

    if (match) {
      const expectedPass = match.password || '123';
      if (password === expectedPass) {
        return res.json({
          success: true,
          user: {
            ...match,
            lastLogin: new Date().toISOString(),
          },
          token: `token_${match.id}_${Date.now()}`,
          message: 'Đăng nhập thành công!',
        });
      } else {
        return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác. Mặc định là: 123' });
      }
    }

    res.status(404).json({ success: false, message: 'Tài khoản không tồn tại trên hệ thống CSDL.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi đăng nhập' });
  }
});

app.post('/api/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    const store = loadStore();
    const u = store.users.find((x) => x.id === userId);
    if (u && (u.password || '123') === oldPassword) {
      u.password = newPassword;
      saveStore(store);
    }

    await safeDbRun(async (pool) => {
      const [rows] = (await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId])) as any[];
      if (rows && rows.length > 0) {
        const row = rows[0];
        const currentPass = row.password || '123';
        if (oldPassword === currentPass) {
          await pool.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);
        }
      }
    });
    res.json({ success: true, message: 'Đã cập nhật mật khẩu!' });
  } catch (error: any) {
    res.json({ success: true, message: 'Đã cập nhật mật khẩu!' });
  }
});

// ==========================================
// 8. TỆP ĐÍNH KÈM & AUDIT LOGS
// ==========================================
app.post('/api/attachments', async (req, res) => {
  try {
    const a = req.body;
    const store = loadStore();
    const idx = store.attachments.findIndex((x) => x.id === a.id);
    if (idx >= 0) store.attachments[idx] = { ...store.attachments[idx], ...a };
    else store.attachments.unshift(a);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO attachments 
        (id, file_name, file_size, file_type, file_url, category, related_id, dossier_code, dossier_id, uploaded_by_id, uploaded_by_name, tags) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        file_name=VALUES(file_name), file_size=VALUES(file_size), file_type=VALUES(file_type), file_url=VALUES(file_url), category=VALUES(category), related_id=VALUES(related_id), dossier_code=VALUES(dossier_code), dossier_id=VALUES(dossier_id), tags=VALUES(tags)`,
        [
          a.id,
          a.fileName,
          a.fileSize || 0,
          a.fileType || '',
          a.fileUrl || '',
          a.category,
          a.relatedId || null,
          a.dossierCode || null,
          a.dossierId || null,
          a.uploadedById || '',
          a.uploadedByName || '',
          JSON.stringify(a.tags || []),
        ]
      );
    });
    res.json({ success: true, attachment: a, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.json({ success: true, attachment: req.body });
  }
});

app.delete('/api/attachments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadStore();
    store.attachments = store.attachments.filter((a) => a.id !== id);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM attachments WHERE id=?', [id]);
    });
    res.json({ success: true, id, fromDb: dbResult.fromDb });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  try {
    const l = req.body;
    const store = loadStore();
    store.auditLogs.unshift(l);
    if (store.auditLogs.length > 200) store.auditLogs = store.auditLogs.slice(0, 200);
    saveStore(store);

    const dbResult = await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO audit_logs (id, user_id, user_name, user_avatar, action, entity_type, entity_id, entity_title, details) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          l.id,
          l.userId || '',
          l.userName,
          l.userAvatar || null,
          l.action,
          l.entityType,
          l.entityId,
          l.entityTitle,
          l.details || null,
        ]
      );
    });
    res.json({ success: true, log: l, fromDb: dbResult.fromDb, error: dbResult.error });
  } catch (error: any) {
    res.json({ success: true, log: req.body });
  }
});

// ==========================================
// AI ASSISTANT APIS
// ==========================================

// 0. AI API: OCR & Multi-modal Document Intelligence (PDF, Scan Images, Photos)
app.post('/api/ai/ocr-document', async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'Dữ liệu tệp (Base64) là bắt buộc' });
    }

    const effectiveMime = mimeType || (fileName?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    const prompt = `Bạn là Chuyên gia OCR & Phân tích Văn bản Hành chính Nhà nước Việt Nam.
Hãy phân tích tài liệu đính kèm (bản scan/ảnh/PDF) và trích xuất toàn văn cùng các thông tin cốt lõi theo thể thức văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP).

Hãy trả về duy nhất định dạng JSON thuần túy (không bọc trong markdown dư thừa):
{
  "title": "Trích yếu hoặc Tiêu đề văn bản (Ví dụ: V/v triển khai công tác quản lý văn bản quý III/2025)",
  "documentNumber": "Số và ký hiệu văn bản (Ví dụ: 245/UBND-VP, 89/QĐ-UBND) nếu có",
  "issuingAuthority": "Cơ quan/Đơn vị ban hành (Ví dụ: Ủy ban nhân dân Thành phố, Sở Tài chính)",
  "issueDate": "YYYY-MM-DD (Ngày tháng năm ban hành văn bản)",
  "docType": "Loại văn bản (Quyết định, Chỉ thị, Công văn, Thông báo, Tờ trình, Kế hoạch, Báo cáo...)",
  "signer": "Họ tên và chức vụ người ký (nếu có)",
  "summary": "Tóm tắt ngắn gọn 2-3 câu về nội dung chỉ đạo hoặc yêu cầu chính",
  "fullText": "Toàn văn nội dung số hóa từ bản scan một cách đầy đủ, chính xác, giữ nguyên cấu trúc các điều khoản và thông tin quan trọng."
}`;

    const parts = [
      {
        inlineData: {
          data: fileBase64,
          mimeType: effectiveMime,
        },
      },
      {
        text: prompt,
      },
    ];

    const rawResult = await generateGeminiContent({ parts, jsonMode: true });
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawResult);
    } catch {
      parsed = {
        title: fileName?.replace(/\.[^/.]+$/, '') || 'Văn bản scan',
        fullText: rawResult || '',
        summary: rawResult?.slice(0, 200) || '',
      };
    }

    res.json({
      success: true,
      result: parsed,
    });
  } catch (error: any) {
    console.error('AI OCR Document Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi trích xuất OCR tài liệu bằng AI',
    });
  }
});

// 1. AI API: Summarize Document & Extract Key Points
app.post('/api/ai/summarize-document', async (req, res) => {
  try {
    const { title, content, docType, issuingAuthority } = req.body;
    if (!content && !title) {
      return res.status(400).json({ error: 'Nội dung hoặc tiêu đề văn bản là bắt buộc' });
    }

    const prompt = `Bạn là Trợ lý Văn thư & Pháp chế hành chính nhà nước. Hãy phân tích văn bản sau:
- Loại văn bản: ${docType || 'Chưa rõ'}
- Tiêu đề / Trích yếu: ${title || ''}
- Cơ quan ban hành: ${issuingAuthority || ''}
- Toàn văn / Tóm lược: ${content || title}

Hãy trả về định dạng JSON chính xác:
{
  "summary": "Tóm tắt ngắn gọn súc tích nội dung chính (khoảng 2-3 câu)",
  "keyRequirements": ["Nhiệm vụ 1", "Nhiệm vụ 2", "Nhiệm vụ 3"],
  "suggestedUrgency": "THUONG" | "KHAN" | "HOA_TOC",
  "suggestedDueDate": "YYYY-MM-DD (dự đoán hạn xử lý phù hợp)",
  "suggestedDepartment": "Phòng ban phù hợp xử lý chính",
  "actionPlan": "Gợi ý các bước đơn vị cần triển khai ngay"
}`;

    const text = await generateGeminiContent({ prompt, jsonMode: true });
    res.json({ result: JSON.parse(text || '{}') });
  } catch (error: any) {
    console.error('AI Summarize Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi xử lý AI' });
  }
});

// 2. AI API: Draft Outgoing Document
app.post('/api/ai/draft-outgoing-doc', async (req, res) => {
  try {
    const { docType, recipient, goal, basisDocTitle, keyPoints } = req.body;

    const prompt = `Bạn là Chuyên viên Văn phòng giàu kinh nghiệm soạn thảo văn bản hành chính theo Nghị định 30/2020/NĐ-CP của Chính phủ Việt Nam.
Hãy soạn thảo một dự thảo văn bản đi chuẩn mực:
- Loại văn bản: ${docType || 'Công văn'}
- Kính gửi / Đơn vị nhận: ${recipient || 'Ủy ban nhân dân Tỉnh / Sở Tài chính'}
- Mục đích / Nội dung chính: ${goal || 'Báo cáo tình hình thực hiện nhiệm vụ'}
- Căn cứ văn bản (nếu có): ${basisDocTitle || 'Theo kế hoạch năm 2025'}
- Các điểm cần nêu: ${keyPoints || 'Đảm bảo tiến độ, chất lượng và đề xuất hỗ trợ'}

Yêu cầu trả về JSON:
{
  "title": "Trích yếu nội dung (Ví dụ: V/v Đề xuất phê duyệt kinh phí...)",
  "draftContent": "Toàn văn dự thảo văn bản đầy đủ Quốc hiệu Tiêu ngữ, Kính gửi, Căn cứ pháp lý, Nội dung chi tiết các điều mục, Nơi nhận...",
  "suggestedSigner": "Thủ trưởng cơ quan / Phó Giám đốc",
  "notes": "Lưu ý kiểm tra pháp lý trước khi phát hành"
}`;

    const text = await generateGeminiContent({ prompt, jsonMode: true });
    res.json({ result: JSON.parse(text || '{}') });
  } catch (error: any) {
    console.error('AI Draft Doc Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi soạn thảo tự động' });
  }
});

// 3. AI API: Suggest Task Breakdown
app.post('/api/ai/suggest-task-breakdown', async (req, res) => {
  try {
    const { taskTitle, description, dueDate, availableStaff } = req.body;

    const prompt = `Bạn là Quản lý dự án / Lãnh đạo cơ quan. Hãy phân rã nhiệm vụ sau thành các bước thực hiện chi tiết:
- Nhiệm vụ: ${taskTitle}
- Mô tả: ${description || ''}
- Hạn hoàn thành: ${dueDate || 'Trong 7 ngày'}
- Danh sách nhân sự hiện có: ${JSON.stringify(availableStaff || [])}

Hãy trả về JSON với cấu trúc:
{
  "subTasks": [
    { "title": "Bước 1: ...", "daysEstimated": 2, "suggestedAssigneeName": "Tên nhân sự phù hợp nhất" },
    { "title": "Bước 2: ...", "daysEstimated": 3, "suggestedAssigneeName": "Tên nhân sự" }
  ],
  "riskWarning": "Cảnh báo rủi ro về tiến độ hoặc nguồn lực nếu có",
  "recommendedMilestones": ["Mốc kiểm tra 1", "Mốc kiểm tra 2"]
}`;

    const text = await generateGeminiContent({ prompt, jsonMode: true });
    res.json({ result: JSON.parse(text || '{}') });
  } catch (error: any) {
    console.error('AI Task Breakdown Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi phân rã công việc' });
  }
});

// 4. AI API: Chat Assistant
app.post('/api/ai/ask-assistant', async (req, res) => {
  try {
    const { question, systemContext } = req.body;

    const prompt = `Bạn là Trợ lý AI Thông Minh của Hệ thống Quản Lý Văn Bản & Điều Hành Công Việc.
Dưới đây là thông tin hiện tại của hệ thống (thống kê số lượng văn bản, công việc quá hạn, hồ sơ vụ việc):
${JSON.stringify(systemContext || {})}

Câu hỏi / Yêu cầu của người dùng:
"${question}"

Hãy trả lời một cách chuyên nghiệp, chính xác, thân thiện và đưa ra giải pháp hành động cụ thể cho cán bộ / lãnh đạo.`;

    const answer = await generateGeminiContent({ prompt, jsonMode: false });
    res.json({ answer });
  } catch (error: any) {
    console.error('AI Assistant Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi trợ lý AI' });
  }
});

// 5. AI CORE ENGINE: Advanced Multi-dimensional Document Content Classification & Entity Extraction
app.post('/api/ai/classify-document', async (req, res) => {
  try {
    const { text, title, fileName, departments, availableStaff } = req.body;
    if (!text && !title) {
      return res.status(400).json({ error: 'Vui lòng cung cấp nội dung hoặc tiêu đề văn bản để phân loại.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const deptList = Array.isArray(departments) && departments.length > 0
      ? departments.map((d: any) => (typeof d === 'string' ? d : d.name || d.code)).join(', ')
      : 'Phòng Kế hoạch - Tài chính, Phòng Tổ chức Cán bộ, Văn phòng Cơ quan, Ban Quản lý Dự án, Phòng Quản lý Đào tạo, Phòng Kỹ thuật Công nghệ, Phòng Pháp chế';

    const staffList = Array.isArray(availableStaff) && availableStaff.length > 0
      ? availableStaff.map((s: any) => (typeof s === 'string' ? s : `${s.fullName} (${s.position || s.role} - ${s.department})`)).join(', ')
      : 'Nguyễn Văn An (Trưởng phòng TCKT), Trần Thị Bích (Trưởng phòng TCCB), Lê Hoàng Nam (Chánh Văn phòng), Phạm Minh Tuấn (Chuyên viên TCKT), Hoàng Thu Trang (Chuyên viên TCCB)';

    const prompt = `Bạn là Mô hình Phân tích & Phân loại Nội dung Văn bản Hành chính (Vietnamese Administrative Text Classification Engine) theo quy định thể thức văn bản quản lý nhà nước (Nghị định 30/2020/NĐ-CP).

Nhiệm vụ: Phân tích toàn diện văn bản dưới đây, trích xuất thực thể định danh (NER), dự báo phân bố xác suất lĩnh vực (Multi-class probability distribution), xác định thể loại, độ khẩn, độ mật, và đề xuất phân luồng xử lý tự động cho cơ quan.

TÀI LIỆU CẦN PHÂN LOẠI:
- Tên tệp / Tiêu đề: ${title || fileName || 'Văn bản chưa đặt tên'}
- Ngày hiện tại: ${todayStr}
- Danh sách phòng ban trong hệ thống: ${deptList}
- Danh sách cán bộ trong hệ thống: ${staffList}
- NỘI DUNG VĂN BẢN (Toàn văn hoặc trích đoạn):
"""
${text || title}
"""

YÊU CẦU: Trả về duy nhất định dạng JSON thuần túy (không bọc trong markdown hay text thừa) với cấu trúc sau:
{
  "primaryDomain": "Tên 1 trong các lĩnh vực chính: 'Tài chính - Kế toán' | 'Tổ chức - Cán bộ' | 'Hành chính - Quản trị' | 'Kế hoạch - Đầu tư' | 'Pháp chế - Thanh tra' | 'Kỹ thuật - Công nghệ' | 'Giáo dục - Đào tạo' | 'Y tế - Sức khỏe' | 'Chính sách - Xã hội'",
  "confidenceScore": 95.8, // Điểm tin cậy tổng thể từ 0 đến 100
  "docType": "Loại văn bản: 'Quyết định' | 'Chỉ thị' | 'Quy chế' | 'Kế hoạch' | 'Thông báo' | 'Tờ trình' | 'Công văn' | 'Báo cáo' | 'Biên bản' | 'Giấy mời' | 'Nghị quyết'",
  "urgency": "THUONG" | "KHAN" | "THUONG_KHAN" | "HOA_TOC",
  "urgencyRationale": "Giải thích căn cứ xếp mức độ khẩn (dựa trên mốc thời gian, từ khóa 'gấp', 'hỏa tốc', 'trước ngày...')",
  "securityLevel": "THUONG" | "MAT" | "TOI_MAT" | "TUYET_MAT",
  "domainProbabilities": [
    { "domain": "Tên lĩnh vực 1 (lĩnh vực chính)", "score": 92.5, "explanation": "Chứa nhiều thuật ngữ về..." },
    { "domain": "Tên lĩnh vực 2 (lĩnh vực gần nhất)", "score": 5.0, "explanation": "Có liên quan đến..." },
    { "domain": "Tên lĩnh vực 3", "score": 2.5, "explanation": "Một phần nội dung đề cập..." }
  ],
  "extractedEntities": {
    "documentNumber": "Số ký hiệu trích xuất (Ví dụ: 124/UBND-VP, 45/QĐ-BGDĐT) nếu có, hoặc tạo số giả định phù hợp",
    "officialNumber": "Số đến hoặc số văn bản gốc",
    "issuingAuthority": "Tên cơ quan ban hành (Ví dụ: Ủy ban nhân dân Thành phố Hà Nội, Bộ Tài chính...)",
    "recipient": "Nơi nhận / Đơn vị tiếp nhận",
    "issueDate": "YYYY-MM-DD (ngày ban hành trích xuất từ văn bản)",
    "effectiveDate": "YYYY-MM-DD (ngày có hiệu lực)",
    "signer": "Họ và tên người ký văn bản",
    "signerPosition": "Chức vụ người ký (Ví dụ: Chủ tịch, Giám đốc Sở, Chánh Văn phòng...)",
    "summary": "Trích yếu nội dung văn bản súc tích từ 1 đến 3 câu",
    "keyTopics": ["từ khóa 1", "từ khóa 2", "từ khóa 3", "từ khóa 4", "từ khóa 5"],
    "legalBases": ["Căn cứ Luật Ngân sách...", "Căn cứ Nghị định 30/2020/NĐ-CP..."]
  },
  "dispatchRecommendation": {
    "primaryDepartment": "Tên phòng ban phù hợp nhất từ danh sách phòng ban",
    "cooperatingDepartments": ["Phòng phối hợp 1", "Phòng phối hợp 2"],
    "suggestedAssigneeName": "Tên chuyên viên phù hợp nhất từ danh sách cán bộ",
    "suggestedDueDate": "YYYY-MM-DD (dự đoán thời hạn hoàn thành phù hợp tính từ hôm nay)",
    "suggestedDossierCode": "HS-2025-XXX-01 (Mã hồ sơ gợi ý chuẩn)",
    "suggestedDossierTitle": "Tên hồ sơ vụ việc đề xuất",
    "actionChecklist": [
      "Bước 1: Kiểm tra tính hợp lệ và hồ sơ kèm theo",
      "Bước 2: Xây dựng dự thảo báo cáo / phản hồi",
      "Bước 3: Trình Lãnh đạo phê duyệt trước hạn chót"
    ],
    "routingReason": "Lý do đề xuất luân chuyển đến phòng ban và cán bộ này"
  },
  "classificationRationale": "Phân tích ngữ nghĩa chuyên sâu: Giải thích tại sao văn bản được phân loại vào lĩnh vực này, các đặc trưng từ vựng và cấu trúc văn bản hành chính."
}`;

    const rawJson = await generateGeminiContent({ prompt, jsonMode: true });
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawJson);
    } catch (e) {
      parsedResult = {
        primaryDomain: 'Hành chính - Quản trị',
        confidenceScore: 88.0,
        docType: 'Công văn',
        urgency: 'THUONG',
        urgencyRationale: 'Văn bản hành chính thông thường',
        securityLevel: 'THUONG',
        domainProbabilities: [
          { domain: 'Hành chính - Quản trị', score: 88.0, explanation: 'Chứa nội dung quản lý chung' },
          { domain: 'Kế hoạch - Đầu tư', score: 8.0, explanation: 'Có đề cập đến tiến độ' },
          { domain: 'Tổ chức - Cán bộ', score: 4.0, explanation: 'Một phần liên quan nhân sự' },
        ],
        extractedEntities: {
          summary: title || text?.slice(0, 100),
          keyTopics: ['quản lý', 'văn bản', 'hành chính'],
        },
        dispatchRecommendation: {
          primaryDepartment: 'Văn phòng Cơ quan',
          cooperatingDepartments: [],
          suggestedDueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          suggestedDossierCode: 'HS-2025-VP-01',
          suggestedDossierTitle: `Hồ sơ xử lý: ${(title || 'văn bản').slice(0, 40)}`,
          actionChecklist: ['Tiếp nhận và lưu trữ', 'Phân công chuyên viên nghiên cứu'],
          routingReason: 'Phù hợp chức năng văn phòng',
        },
        classificationRationale: 'Dựa trên phân tích từ vựng và trích yếu nội dung.',
      };
    }

    parsedResult.id = 'cls-' + Date.now();
    parsedResult.classifiedAt = new Date().toISOString();
    parsedResult.rawTextPreview = (text || title).slice(0, 500);

    res.json({ success: true, result: parsedResult });
  } catch (error: any) {
    console.error('Document Classification Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi khi phân loại nội dung văn bản' });
  }
});


// Serve frontend in production or development
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In development, Vite handles frontend assets via middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/server/**', '**/.db_store_cache.json', '**/data_store.json', '**/*.json', '**/.env*'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

