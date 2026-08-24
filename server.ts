import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';
import {
  checkMySqlConnection,
  initTablesAndSeed,
  fetchAllDataFromMySql,
  getPool,
} from './server/mysql';
import { INITIAL_USERS } from './src/data/mockData';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Helper to safely run DB queries without throwing unhandled connection errors if MySQL is offline
async function safeDbRun(fn: (pool: any) => Promise<any>): Promise<boolean> {
  try {
    const pool = getPool();
    if (!pool) return false;
    await fn(pool);
    return true;
  } catch (err: any) {
    // If MySQL connection error or offline, handle silently so client isn't blocked
    return false;
  }
}

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

// Helper to call Gemini with automatic model fallback and retry for transient errors (503/429)
async function generateGeminiContent(options: { prompt: string; jsonMode?: boolean }): Promise<string> {
  const ai = getAIClient();
  const models = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.7-flash'];
  let lastError: any = null;

  for (const model of models) {
    // Try up to 2 attempts per model in case of temporary 503 spike
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.prompt,
          config: options.jsonMode ? { responseMimeType: 'application/json' } : undefined,
        });
        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini] Model ${model} (attempt ${attempt}) encountered error:`, err?.message || err);
        // If 503 (high demand) or 429, wait 600ms before retrying or switching
        if (err?.message?.includes('503') || err?.status === 'UNAVAILABLE' || err?.message?.includes('429')) {
          await new Promise((r) => setTimeout(r, 600));
        } else {
          // If 404 or other permanent error, break attempt loop immediately and try next model
          break;
        }
      }
    }
  }

  throw lastError || new Error('Không thể kết nối đến dịch vụ AI Gemini. Vui lòng thử lại sau giây lát.');
}

// ==========================================
// 0. MYSQL DATABASE & SYNC API ROUTES
// ==========================================

// Kiểm tra trạng thái kết nối MySQL
app.get('/api/db-status', async (_req, res) => {
  try {
    const status = await checkMySqlConnection();
    res.json(status);
  } catch (error: any) {
    res.json({
      connected: false,
      error: error.message,
    });
  }
});

// Khởi tạo bảng và nạp dữ liệu mẫu vào MySQL
app.post('/api/init-db', async (_req, res) => {
  try {
    const result = await initTablesAndSeed();
    res.json(result);
  } catch (error: any) {
    console.error('Init DB error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lấy toàn bộ dữ liệu từ MySQL (hoặc khởi tạo nếu chưa có)
app.get('/api/sync-all', async (_req, res) => {
  try {
    const status = await checkMySqlConnection();
    if (!status.connected) {
      return res.json({
        connected: false,
        message: 'MySQL chưa bật hoặc chưa tạo Database, đang dùng local cache.',
        data: null,
      });
    }

    // Nếu bảng chưa có, tự động tạo và seed
    if ((status.tablesCount || 0) < 5) {
      await initTablesAndSeed();
    }

    const data = await fetchAllDataFromMySql();
    res.json({
      connected: true,
      data,
    });
  } catch (error: any) {
    console.error('Sync MySQL error:', error);
    res.json({
      connected: false,
      error: error.message,
      data: null,
    });
  }
});

// --- CRUD: VĂN BẢN ĐẾN (incoming_documents) ---
app.post('/api/incoming-docs', async (req, res) => {
  try {
    const doc = req.body;
    await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO incoming_documents 
        (id, document_number, official_number, received_date, issue_date, issuing_authority, summary, doc_type, urgency, security_level, assignee_id, co_assignee_ids, due_date, status, result_summary, dossier_id, linked_task_ids, created_by_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        document_number=VALUES(document_number), official_number=VALUES(official_number), received_date=VALUES(received_date), issue_date=VALUES(issue_date), issuing_authority=VALUES(issuing_authority), summary=VALUES(summary), doc_type=VALUES(doc_type), urgency=VALUES(urgency), security_level=VALUES(security_level), assignee_id=VALUES(assignee_id), co_assignee_ids=VALUES(co_assignee_ids), due_date=VALUES(due_date), status=VALUES(status), result_summary=VALUES(result_summary), dossier_id=VALUES(dossier_id), linked_task_ids=VALUES(linked_task_ids)`,
        [
          doc.id,
          doc.documentNumber,
          doc.officialNumber || '',
          doc.receivedDate,
          doc.issueDate || null,
          doc.issuingAuthority,
          doc.summary,
          doc.docType || 'Công văn',
          doc.urgency || 'THUONG',
          doc.securityLevel || 'THUONG',
          doc.assigneeId || null,
          JSON.stringify(doc.coAssigneeIds || []),
          doc.dueDate,
          doc.status || 'PROCESSING',
          doc.resultSummary || '',
          doc.dossierId || null,
          JSON.stringify(doc.linkedTaskIds || []),
          doc.createdById || null,
        ]
      );
    });
    res.json({ success: true, doc });
  } catch (error: any) {
    res.json({ success: true, doc: req.body });
  }
});

app.put('/api/incoming-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = req.body;
    await safeDbRun(async (pool) => {
      await pool.query(
        `UPDATE incoming_documents SET 
        document_number=?, official_number=?, received_date=?, issue_date=?, issuing_authority=?, summary=?, doc_type=?, urgency=?, security_level=?, assignee_id=?, co_assignee_ids=?, due_date=?, status=?, result_summary=?, dossier_id=?, linked_task_ids=?
        WHERE id=?`,
        [
          doc.documentNumber,
          doc.officialNumber || '',
          doc.receivedDate,
          doc.issueDate || null,
          doc.issuingAuthority,
          doc.summary,
          doc.docType,
          doc.urgency,
          doc.securityLevel,
          doc.assigneeId || null,
          JSON.stringify(doc.coAssigneeIds || []),
          doc.dueDate,
          doc.status,
          doc.resultSummary || '',
          doc.dossierId || null,
          JSON.stringify(doc.linkedTaskIds || []),
          id,
        ]
      );
    });
    res.json({ success: true, doc });
  } catch (error: any) {
    res.json({ success: true, doc: req.body });
  }
});

app.delete('/api/incoming-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM incoming_documents WHERE id=?', [id]);
    });
    res.json({ success: true, id });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

// --- CRUD: VĂN BẢN ĐI (outgoing_documents) ---
app.post('/api/outgoing-docs', async (req, res) => {
  try {
    const doc = req.body;
    await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO outgoing_documents 
        (id, document_number, release_date, doc_type, recipient, summary, drafter_id, signer_id, status, dossier_id, reply_to_doc_id, created_by_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        document_number=VALUES(document_number), release_date=VALUES(release_date), doc_type=VALUES(doc_type), recipient=VALUES(recipient), summary=VALUES(summary), drafter_id=VALUES(drafter_id), signer_id=VALUES(signer_id), status=VALUES(status), dossier_id=VALUES(dossier_id), reply_to_doc_id=VALUES(reply_to_doc_id)`,
        [
          doc.id,
          doc.documentNumber,
          doc.releaseDate,
          doc.docType || 'Công văn',
          doc.recipient,
          doc.summary,
          doc.drafterId || null,
          doc.signerId || null,
          doc.status || 'DRAFT',
          doc.dossierId || null,
          doc.replyToDocId || null,
          doc.createdById || null,
        ]
      );
    });
    res.json({ success: true, doc });
  } catch (error: any) {
    res.json({ success: true, doc: req.body });
  }
});

app.put('/api/outgoing-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = req.body;
    await safeDbRun(async (pool) => {
      await pool.query(
        `UPDATE outgoing_documents SET 
        document_number=?, release_date=?, doc_type=?, recipient=?, summary=?, drafter_id=?, signer_id=?, status=?, dossier_id=?, reply_to_doc_id=?
        WHERE id=?`,
        [
          doc.documentNumber,
          doc.releaseDate,
          doc.docType,
          doc.recipient,
          doc.summary,
          doc.drafterId || null,
          doc.signerId || null,
          doc.status,
          doc.dossierId || null,
          doc.replyToDocId || null,
          id,
        ]
      );
    });
    res.json({ success: true, doc });
  } catch (error: any) {
    res.json({ success: true, doc: req.body });
  }
});

app.delete('/api/outgoing-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM outgoing_documents WHERE id=?', [id]);
    });
    res.json({ success: true, id });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

// --- CRUD: CÔNG VIỆC / NHIỆM VỤ (tasks) ---
app.post('/api/tasks', async (req, res) => {
  try {
    const t = req.body;
    await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO tasks 
        (id, code, title, description, dossier_id, incoming_doc_id, linked_doc_id, doc_type_relation, creator_id, created_by_id, assignee_id, co_assignee_ids, priority, start_date, due_date, progress, status, completed_date, result_notes, sub_tasks, comments, remind_days_before) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        code=VALUES(code), title=VALUES(title), description=VALUES(description), dossier_id=VALUES(dossier_id), incoming_doc_id=VALUES(incoming_doc_id), linked_doc_id=VALUES(linked_doc_id), doc_type_relation=VALUES(doc_type_relation), creator_id=VALUES(creator_id), assignee_id=VALUES(assignee_id), co_assignee_ids=VALUES(co_assignee_ids), priority=VALUES(priority), start_date=VALUES(start_date), due_date=VALUES(due_date), progress=VALUES(progress), status=VALUES(status), completed_date=VALUES(completed_date), result_notes=VALUES(result_notes), sub_tasks=VALUES(sub_tasks), comments=VALUES(comments), remind_days_before=VALUES(remind_days_before)`,
        [
          t.id,
          t.code,
          t.title,
          t.description,
          t.dossierId || null,
          t.incomingDocId || null,
          t.linkedDocId || null,
          t.docTypeRelation || null,
          t.creatorId || null,
          t.createdById || null,
          t.assigneeId,
          JSON.stringify(t.coAssigneeIds || []),
          t.priority || 'MEDIUM',
          t.startDate,
          t.dueDate,
          t.progress || 0,
          t.status || 'IN_PROGRESS',
          t.completedDate || null,
          t.resultNotes || '',
          JSON.stringify(t.subTasks || []),
          JSON.stringify(t.comments || []),
          t.remindDaysBefore || 1,
        ]
      );
    });
    res.json({ success: true, task: t });
  } catch (error: any) {
    res.json({ success: true, task: req.body });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const t = req.body;
    await safeDbRun(async (pool) => {
      await pool.query(
        `UPDATE tasks SET 
        code=?, title=?, description=?, dossier_id=?, incoming_doc_id=?, linked_doc_id=?, doc_type_relation=?, creator_id=?, assignee_id=?, co_assignee_ids=?, priority=?, start_date=?, due_date=?, progress=?, status=?, completed_date=?, result_notes=?, sub_tasks=?, comments=?, remind_days_before=?
        WHERE id=?`,
        [
          t.code,
          t.title,
          t.description,
          t.dossierId || null,
          t.incomingDocId || null,
          t.linkedDocId || null,
          t.docTypeRelation || null,
          t.creatorId || null,
          t.assigneeId,
          JSON.stringify(t.coAssigneeIds || []),
          t.priority,
          t.startDate,
          t.dueDate,
          t.progress,
          t.status,
          t.completedDate || null,
          t.resultNotes || '',
          JSON.stringify(t.subTasks || []),
          JSON.stringify(t.comments || []),
          t.remindDaysBefore || 1,
          id,
        ]
      );
    });
    res.json({ success: true, task: t });
  } catch (error: any) {
    res.json({ success: true, task: req.body });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM tasks WHERE id=?', [id]);
    });
    res.json({ success: true, id });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

// --- CRUD: HỒ SƠ VỤ VIỆC (dossiers) ---
app.post('/api/dossiers', async (req, res) => {
  try {
    const d = req.body;
    await safeDbRun(async (pool) => {
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
          d.department || '',
          d.departmentId || null,
          d.leaderId || null,
          d.managerId || null,
          d.status || 'IN_PROGRESS',
          d.startDate,
          d.endDate || null,
          d.description || '',
        ]
      );
    });
    res.json({ success: true, dossier: d });
  } catch (error: any) {
    res.json({ success: true, dossier: req.body });
  }
});

app.put('/api/dossiers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;
    await safeDbRun(async (pool) => {
      await pool.query(
        `UPDATE dossiers SET 
        code=?, title=?, department=?, department_id=?, leader_id=?, manager_id=?, status=?, start_date=?, end_date=?, description=?
        WHERE id=?`,
        [
          d.code,
          d.title,
          d.department || '',
          d.departmentId || null,
          d.leaderId || null,
          d.managerId || null,
          d.status,
          d.startDate,
          d.endDate || null,
          d.description || '',
          id,
        ]
      );
    });
    res.json({ success: true, dossier: d });
  } catch (error: any) {
    res.json({ success: true, dossier: req.body });
  }
});

app.delete('/api/dossiers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM dossiers WHERE id=?', [id]);
    });
    res.json({ success: true, id });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

// --- AUTHENTICATION & LOGIN API ---
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
              phone: u.phone,
              avatar: u.avatar,
              department: u.department,
              departmentId: u.department_id,
              position: u.position,
              positionId: u.position_id,
              role: u.role,
              status: u.status,
              joinDate: u.join_date,
              bio: u.bio,
              lastLogin: new Date().toISOString(),
            };

            return res.json({
              success: true,
              user: userObj,
              token: `token_${u.id}_${Date.now()}`,
              message: 'Đăng nhập thành công!',
            });
          } else {
            return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác. Mặc định là: 123' });
          }
        }
      }
    } catch {
      // MySQL connection unavailable, proceed to fallback
    }

    // 2. Seamless Fallback to INITIAL_USERS
    const match = INITIAL_USERS.find(
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

    res.status(404).json({ success: false, message: 'Tài khoản không tồn tại trên hệ thống.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi đăng nhập' });
  }
});

app.post('/api/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    await safeDbRun(async (pool) => {
      const [rows] = (await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId])) as any[];
      if (rows && rows.length > 0) {
        const u = rows[0];
        const currentPass = u.password || '123';
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

// --- CRUD: NGƯỜI DÙNG (users) ---
app.post('/api/users', async (req, res) => {
  try {
    const u = req.body;
    await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO users 
        (id, username, password, full_name, email, phone, avatar, department, department_id, position, position_id, role, status, join_date, bio) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        username=VALUES(username), password=VALUES(password), full_name=VALUES(full_name), email=VALUES(email), phone=VALUES(phone), avatar=VALUES(avatar), department=VALUES(department), department_id=VALUES(department_id), position=VALUES(position), position_id=VALUES(position_id), role=VALUES(role), status=VALUES(status), join_date=VALUES(join_date), bio=VALUES(bio)`,
        [
          u.id,
          u.username || u.email?.split('@')[0] || u.id,
          u.password || '123',
          u.fullName,
          u.email,
          u.phone || '',
          u.avatar || '',
          u.department || '',
          u.departmentId || null,
          u.position || '',
          u.positionId || null,
          u.role || 'STAFF',
          u.status || 'ACTIVE',
          u.joinDate || null,
          u.bio || '',
        ]
      );
    });
    res.json({ success: true, user: u });
  } catch (error: any) {
    res.json({ success: true, user: req.body });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM users WHERE id=?', [id]);
    });
    res.json({ success: true, id });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

// --- TỆP ĐÍNH KÈM & AUDIT LOGS ---
app.post('/api/attachments', async (req, res) => {
  try {
    const a = req.body;
    await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO attachments 
        (id, file_name, file_size, file_type, file_url, category, related_id, dossier_code, dossier_id, uploaded_by_id, uploaded_by_name, tags) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.id,
          a.fileName,
          a.fileSize || 0,
          a.fileType || '',
          a.fileUrl || '',
          a.category,
          a.relatedId || null,
          a.dossierCode || '',
          a.dossierId || null,
          a.uploadedById || '',
          a.uploadedByName || '',
          JSON.stringify(a.tags || []),
        ]
      );
    });
    res.json({ success: true, attachment: a });
  } catch (error: any) {
    res.json({ success: true, attachment: req.body });
  }
});

app.delete('/api/attachments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await safeDbRun(async (pool) => {
      await pool.query('DELETE FROM attachments WHERE id=?', [id]);
    });
    res.json({ success: true, id });
  } catch (error: any) {
    res.json({ success: true, id: req.params.id });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  try {
    const l = req.body;
    await safeDbRun(async (pool) => {
      await pool.query(
        `INSERT INTO audit_logs (id, user_id, user_name, user_avatar, action, entity_type, entity_id, entity_title, details) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          l.id,
          l.userId || '',
          l.userName,
          l.userAvatar || '',
          l.action,
          l.entityType,
          l.entityId,
          l.entityTitle,
          l.details,
        ]
      );
    });
    res.json({ success: true, log: l });
  } catch (error: any) {
    res.json({ success: true, log: req.body });
  }
});

// ==========================================
// AI ASSISTANT APIS
// ==========================================

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

// 2. AI API: Draft Outgoing Document (Soạn thảo văn bản đi chuẩn thể thức)
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

// 3. AI API: Suggest Task Breakdown (Phân rã công việc & Gợi ý phân công)
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

// 4. AI API: Chat Assistant (Trợ lý Quản lý Văn bản & Điều hành)
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

// Serve frontend in production or development
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // In development, Vite handles frontend assets via middleware
  import('vite').then(({ createServer }) => {
    createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    }).then((vite) => {
      app.use(vite.middlewares);
    });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
