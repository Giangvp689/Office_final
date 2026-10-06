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

export interface DbConfig {
  host: string;
  user: string;
  password?: string;
  database: string;
  port: number;
}

let pool: mysql.Pool | null = null;
let currentConfig: DbConfig | null = null;
let isConnected = false;
let connectionError: string | null = null;
let schemaEnsured = false;

export function isConnectionError(err: any): boolean {
  if (!err) return false;
  const code = err.code || '';
  const msg = err.message || '';
  return (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'EHOSTUNREACH' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ER_ACCESS_DENIED_ERROR' ||
    code === 'ER_DBACCESS_DENIED_ERROR' ||
    code === 'ER_BAD_DB_ERROR' ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('connect ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND')
  );
}

export function isTableEngineCorrupted(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  const errno = err.errno;
  // Only genuine storage engine corruption errors (NOT normal missing table 1146)
  return (
    errno === 1932 ||
    code === 'ER_NO_SUCH_TABLE_IN_ENGINE' ||
    code === 'ER_CRASHED_ON_USAGE' ||
    code === 'ER_CRASHED_ON_REPAIR' ||
    msg.includes("doesn't exist in engine") ||
    msg.includes("does not exist in engine") ||
    msg.includes("is marked as crashed")
  );
}

export function getDbConfig(): DbConfig {
  if (currentConfig) return currentConfig;

  const host = (process.env.DB_HOST || process.env.MYSQL_HOST || '').trim();
  const user = (process.env.DB_USER || process.env.MYSQL_USER || '').trim() || 'root';
  const password = (process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : '')).trim();
  const database = (process.env.DB_NAME || process.env.MYSQL_DATABASE || '').trim() || 'vanphong_so';
  const rawPort = (process.env.DB_PORT || process.env.MYSQL_PORT || '').trim() || '3306';
  const port = parseInt(rawPort, 10) || 3306;

  return { host, user, password, database, port };
}

export function setDbConfig(newConfig: Partial<DbConfig>) {
  const current = getDbConfig();
  currentConfig = {
    host: (newConfig.host ?? current.host).trim() || '127.0.0.1',
    user: (newConfig.user ?? current.user).trim() || 'root',
    password: newConfig.password !== undefined ? newConfig.password.trim() : current.password,
    database: (newConfig.database ?? current.database).trim() || 'vanphong_so',
    port: Number(newConfig.port) || 3306,
  };
  schemaEnsured = false;
  resetPool();
}

export function resetPool() {
  if (pool) {
    try {
      pool.end();
    } catch {
      // ignore
    }
    pool = null;
  }
}

export function getPool(): mysql.Pool | null {
  if (pool) return pool;
  try {
    const config = getDbConfig();
    if (!config.host) {
      connectionError = 'MySQL chưa được cấu hình DB_HOST';
      return null;
    }
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
      connectTimeout: 5000,
    });
    return pool;
  } catch (err: any) {
    connectionError = err.message;
    return null;
  }
}

/**
 * Ensures all tables exist and dynamically adds missing columns to existing tables
 */
export async function ensureAllTableSchemas(p: mysql.Pool): Promise<void> {
  const config = getDbConfig();

  // Test connectivity first before attempting schema updates
  try {
    await p.query('SELECT 1');
  } catch {
    // If not connected, exit immediately without warning spam
    return;
  }

  // Table definitions with required columns
  const tableSchemas: Record<string, { createSql: string; columns: { name: string; type: string }[] }> = {
    departments: {
      createSql: `CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description LONGTEXT,
        manager_id VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'id', type: 'VARCHAR(50) PRIMARY KEY' },
        { name: 'code', type: 'VARCHAR(50) NOT NULL' },
        { name: 'name', type: 'VARCHAR(255) NOT NULL' },
        { name: 'description', type: 'LONGTEXT' },
        { name: 'manager_id', type: 'VARCHAR(50)' },
      ],
    },
    positions: {
      createSql: `CREATE TABLE IF NOT EXISTS positions (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        level INT DEFAULT 5
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'id', type: 'VARCHAR(50) PRIMARY KEY' },
        { name: 'name', type: 'VARCHAR(255) NOT NULL' },
        { name: 'level', type: 'INT DEFAULT 5' },
      ],
    },
    users: {
      createSql: `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100),
        password VARCHAR(255) DEFAULT '123',
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        avatar LONGTEXT,
        department VARCHAR(255),
        department_id VARCHAR(50),
        position VARCHAR(255),
        position_id VARCHAR(50),
        role VARCHAR(50) DEFAULT 'STAFF',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        join_date DATE,
        bio LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'id', type: 'VARCHAR(50) PRIMARY KEY' },
        { name: 'username', type: 'VARCHAR(100)' },
        { name: 'password', type: "VARCHAR(255) DEFAULT '123'" },
        { name: 'full_name', type: 'VARCHAR(255) NOT NULL' },
        { name: 'email', type: 'VARCHAR(255) NOT NULL' },
        { name: 'phone', type: 'VARCHAR(100)' },
        { name: 'avatar', type: 'LONGTEXT' },
        { name: 'department', type: 'VARCHAR(255)' },
        { name: 'department_id', type: 'VARCHAR(50)' },
        { name: 'position', type: 'VARCHAR(255)' },
        { name: 'position_id', type: 'VARCHAR(50)' },
        { name: 'role', type: "VARCHAR(50) DEFAULT 'STAFF'" },
        { name: 'status', type: "VARCHAR(50) DEFAULT 'ACTIVE'" },
        { name: 'join_date', type: 'DATE' },
        { name: 'bio', type: 'LONGTEXT' },
      ],
    },
    dossiers: {
      createSql: `CREATE TABLE IF NOT EXISTS dossiers (
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
        description LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'id', type: 'VARCHAR(50) PRIMARY KEY' },
        { name: 'code', type: 'VARCHAR(100) NOT NULL' },
        { name: 'title', type: 'VARCHAR(500) NOT NULL' },
        { name: 'department', type: 'VARCHAR(255)' },
        { name: 'department_id', type: 'VARCHAR(50)' },
        { name: 'leader_id', type: 'VARCHAR(50)' },
        { name: 'manager_id', type: 'VARCHAR(50)' },
        { name: 'status', type: "VARCHAR(50) DEFAULT 'IN_PROGRESS'" },
        { name: 'start_date', type: 'DATE' },
        { name: 'end_date', type: 'DATE' },
        { name: 'description', type: 'LONGTEXT' },
      ],
    },
    incoming_documents: {
      createSql: `CREATE TABLE IF NOT EXISTS incoming_documents (
        id VARCHAR(50) PRIMARY KEY,
        document_number VARCHAR(100) NOT NULL,
        official_number VARCHAR(100),
        received_date DATE NOT NULL,
        issue_date DATE,
        issuing_authority VARCHAR(255) NOT NULL,
        summary LONGTEXT NOT NULL,
        doc_type VARCHAR(100) DEFAULT 'Công văn',
        urgency VARCHAR(50) DEFAULT 'THUONG',
        security_level VARCHAR(50) DEFAULT 'THUONG',
        assignee_id VARCHAR(50),
        co_assignee_ids LONGTEXT,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'PROCESSING',
        result_summary LONGTEXT,
        dossier_id VARCHAR(50),
        linked_task_ids LONGTEXT,
        created_by_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'id', type: 'VARCHAR(50) PRIMARY KEY' },
        { name: 'document_number', type: 'VARCHAR(100) NOT NULL' },
        { name: 'official_number', type: 'VARCHAR(100)' },
        { name: 'received_date', type: 'DATE NOT NULL' },
        { name: 'issue_date', type: 'DATE' },
        { name: 'issuing_authority', type: 'VARCHAR(255) NOT NULL' },
        { name: 'summary', type: 'LONGTEXT NOT NULL' },
        { name: 'doc_type', type: "VARCHAR(100) DEFAULT 'Công văn'" },
        { name: 'urgency', type: "VARCHAR(50) DEFAULT 'THUONG'" },
        { name: 'security_level', type: "VARCHAR(50) DEFAULT 'THUONG'" },
        { name: 'assignee_id', type: 'VARCHAR(50)' },
        { name: 'co_assignee_ids', type: 'LONGTEXT' },
        { name: 'due_date', type: 'DATE' },
        { name: 'status', type: "VARCHAR(50) DEFAULT 'PROCESSING'" },
        { name: 'result_summary', type: 'LONGTEXT' },
        { name: 'dossier_id', type: 'VARCHAR(50)' },
        { name: 'linked_task_ids', type: 'LONGTEXT' },
        { name: 'created_by_id', type: 'VARCHAR(50)' },
      ],
    },
    outgoing_documents: {
      createSql: `CREATE TABLE IF NOT EXISTS outgoing_documents (
        id VARCHAR(50) PRIMARY KEY,
        document_number VARCHAR(100) NOT NULL,
        release_date DATE NOT NULL,
        doc_type VARCHAR(100) DEFAULT 'Công văn',
        recipient VARCHAR(255) NOT NULL,
        summary LONGTEXT NOT NULL,
        content LONGTEXT,
        drafter_id VARCHAR(50),
        signer_id VARCHAR(50),
        status VARCHAR(50) DEFAULT 'DRAFT',
        dossier_id VARCHAR(50),
        reply_to_doc_id VARCHAR(50),
        created_by_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'id', type: 'VARCHAR(50) PRIMARY KEY' },
        { name: 'document_number', type: 'VARCHAR(100) NOT NULL' },
        { name: 'release_date', type: 'DATE NOT NULL' },
        { name: 'doc_type', type: "VARCHAR(100) DEFAULT 'Công văn'" },
        { name: 'recipient', type: 'VARCHAR(255) NOT NULL' },
        { name: 'summary', type: 'LONGTEXT NOT NULL' },
        { name: 'content', type: 'LONGTEXT' },
        { name: 'drafter_id', type: 'VARCHAR(50)' },
        { name: 'signer_id', type: 'VARCHAR(50)' },
        { name: 'status', type: "VARCHAR(50) DEFAULT 'DRAFT'" },
        { name: 'dossier_id', type: 'VARCHAR(50)' },
        { name: 'reply_to_doc_id', type: 'VARCHAR(50)' },
        { name: 'created_by_id', type: 'VARCHAR(50)' },
      ],
    },
    tasks: {
      createSql: `CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50),
        title VARCHAR(500) NOT NULL,
        description LONGTEXT,
        dossier_id VARCHAR(50),
        incoming_doc_id VARCHAR(50),
        linked_doc_id VARCHAR(50),
        doc_type_relation VARCHAR(50),
        creator_id VARCHAR(50),
        created_by_id VARCHAR(50),
        assignee_id VARCHAR(50) NOT NULL,
        co_assignee_ids LONGTEXT,
        priority VARCHAR(50) DEFAULT 'MEDIUM',
        start_date DATE,
        due_date DATE,
        progress INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'IN_PROGRESS',
        completed_date DATE,
        result_notes LONGTEXT,
        sub_tasks LONGTEXT,
        comments LONGTEXT,
        remind_days_before INT DEFAULT 1,
        submission_note LONGTEXT,
        submitted_at VARCHAR(50),
        approved_by_id VARCHAR(50),
        approved_at VARCHAR(50),
        leader_feedback LONGTEXT,
        attachments LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'id', type: 'VARCHAR(50) PRIMARY KEY' },
        { name: 'code', type: 'VARCHAR(50)' },
        { name: 'title', type: 'VARCHAR(500) NOT NULL' },
        { name: 'description', type: 'LONGTEXT' },
        { name: 'dossier_id', type: 'VARCHAR(50)' },
        { name: 'incoming_doc_id', type: 'VARCHAR(50)' },
        { name: 'linked_doc_id', type: 'VARCHAR(50)' },
        { name: 'doc_type_relation', type: 'VARCHAR(50)' },
        { name: 'creator_id', type: 'VARCHAR(50)' },
        { name: 'created_by_id', type: 'VARCHAR(50)' },
        { name: 'assignee_id', type: 'VARCHAR(50) NOT NULL' },
        { name: 'co_assignee_ids', type: 'LONGTEXT' },
        { name: 'priority', type: "VARCHAR(50) DEFAULT 'MEDIUM'" },
        { name: 'start_date', type: 'DATE' },
        { name: 'due_date', type: 'DATE' },
        { name: 'progress', type: 'INT DEFAULT 0' },
        { name: 'status', type: "VARCHAR(50) DEFAULT 'IN_PROGRESS'" },
        { name: 'completed_date', type: 'DATE' },
        { name: 'result_notes', type: 'LONGTEXT' },
        { name: 'sub_tasks', type: 'LONGTEXT' },
        { name: 'comments', type: 'LONGTEXT' },
        { name: 'remind_days_before', type: 'INT DEFAULT 1' },
        { name: 'submission_note', type: 'LONGTEXT' },
        { name: 'submitted_at', type: 'VARCHAR(50)' },
        { name: 'approved_by_id', type: 'VARCHAR(50)' },
        { name: 'approved_at', type: 'VARCHAR(50)' },
        { name: 'leader_feedback', type: 'LONGTEXT' },
        { name: 'attachments', type: 'LONGTEXT' },
      ],
    },
    attachments: {
      createSql: `CREATE TABLE IF NOT EXISTS attachments (
        id VARCHAR(50) PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT DEFAULT 0,
        file_type VARCHAR(100) DEFAULT 'file',
        file_url LONGTEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'KHAC',
        related_id VARCHAR(50),
        dossier_code VARCHAR(50),
        dossier_id VARCHAR(50),
        uploaded_by_id VARCHAR(50) NOT NULL,
        uploaded_by_name VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tags LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'id', type: 'VARCHAR(50) PRIMARY KEY' },
        { name: 'file_name', type: 'VARCHAR(255) NOT NULL' },
        { name: 'file_size', type: 'BIGINT DEFAULT 0' },
        { name: 'file_type', type: "VARCHAR(100) DEFAULT 'file'" },
        { name: 'file_url', type: 'LONGTEXT NOT NULL' },
        { name: 'category', type: "VARCHAR(50) DEFAULT 'KHAC'" },
        { name: 'related_id', type: 'VARCHAR(50)' },
        { name: 'dossier_code', type: 'VARCHAR(50)' },
        { name: 'dossier_id', type: 'VARCHAR(50)' },
        { name: 'uploaded_by_id', type: 'VARCHAR(50) NOT NULL' },
        { name: 'uploaded_by_name', type: 'VARCHAR(255) NOT NULL' },
        { name: 'tags', type: 'LONGTEXT' },
      ],
    },
    audit_logs: {
      createSql: `CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_avatar LONGTEXT,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(50) NOT NULL,
        entity_title VARCHAR(500) NOT NULL,
        details LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'id', type: 'VARCHAR(50) PRIMARY KEY' },
        { name: 'timestamp', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'user_id', type: 'VARCHAR(50) NOT NULL' },
        { name: 'user_name', type: 'VARCHAR(255) NOT NULL' },
        { name: 'user_avatar', type: 'LONGTEXT' },
        { name: 'action', type: 'VARCHAR(50) NOT NULL' },
        { name: 'entity_type', type: 'VARCHAR(50) NOT NULL' },
        { name: 'entity_id', type: 'VARCHAR(50) NOT NULL' },
        { name: 'entity_title', type: 'VARCHAR(500) NOT NULL' },
        { name: 'details', type: 'LONGTEXT' },
      ],
    },
    notifications: {
      createSql: `CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message LONGTEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        link_type VARCHAR(50),
        target_id VARCHAR(50),
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'id', type: 'VARCHAR(50) PRIMARY KEY' },
        { name: 'user_id', type: 'VARCHAR(50) NOT NULL' },
        { name: 'title', type: 'VARCHAR(255) NOT NULL' },
        { name: 'message', type: 'LONGTEXT NOT NULL' },
        { name: 'type', type: 'VARCHAR(50) NOT NULL' },
        { name: 'link_type', type: 'VARCHAR(50)' },
        { name: 'target_id', type: 'VARCHAR(50)' },
        { name: 'is_read', type: 'TINYINT(1) DEFAULT 0' },
      ],
    },
    system_settings: {
      createSql: `CREATE TABLE IF NOT EXISTS system_settings (
        key_name VARCHAR(100) PRIMARY KEY,
        data_value LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      columns: [
        { name: 'key_name', type: 'VARCHAR(100) PRIMARY KEY' },
        { name: 'data_value', type: 'LONGTEXT NOT NULL' },
      ],
    },
  };

  // Create table if not exists, then ensure all columns exist and types are compatible
  for (const [tableName, schema] of Object.entries(tableSchemas)) {
    // 1. Create table safely if it doesn't exist
    try {
      await p.query(schema.createSql);
    } catch (createErr: any) {
      if (isConnectionError(createErr)) {
        return;
      }
      console.warn(`[Schema Create Table Notice on ${tableName}]:`, createErr.message);
    }

    try {
      const [existingCols] = (await p.query(
        `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [config.database, tableName]
      )) as any;

      const colMap = new Map<string, any>();
      if (Array.isArray(existingCols)) {
        for (const col of existingCols) {
          colMap.set(col.COLUMN_NAME.toLowerCase(), col);
        }
      }

      for (const col of schema.columns) {
        const lowerName = col.name.toLowerCase();
        if (!colMap.has(lowerName)) {
          // Column is missing -> ADD COLUMN
          try {
            const cleanType = col.type.replace(/\bPRIMARY KEY\b/gi, '');
            await p.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${cleanType}`);
            console.log(`[MySQL Migration]: Added missing column \`${col.name}\` to table \`${tableName}\``);
          } catch (addErr: any) {
            if (!isConnectionError(addErr)) {
              console.warn(`[MySQL Migration Add Column Warning on ${tableName}.${col.name}]:`, addErr.message);
            }
          }
        } else {
          // Column exists -> check if it's an enum or needs LONGTEXT
          const current = colMap.get(lowerName);
          if (current) {
            // Convert any enum column to VARCHAR(100) to prevent truncation errors
            if (current.DATA_TYPE === 'enum') {
              try {
                await p.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${col.name}\` VARCHAR(100) DEFAULT NULL`);
                console.log(`[MySQL Migration]: Converted enum column \`${col.name}\` on \`${tableName}\` to VARCHAR(100)`);
              } catch (modErr: any) {
                if (!isConnectionError(modErr)) {
                  console.warn(`[MySQL Migration Enum Mod Warning on ${tableName}.${col.name}]:`, modErr.message);
                }
              }
            } else if (col.type.includes('LONGTEXT') && current.DATA_TYPE !== 'longtext') {
              try {
                await p.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${col.name}\` LONGTEXT DEFAULT NULL`);
              } catch {}
            }
          }
        }
      }
    } catch (colCheckErr: any) {
      if (isConnectionError(colCheckErr)) {
        return;
      }
      console.warn(`[Schema Columns Check Warning on ${tableName}]:`, colCheckErr.message);
    }
  }

  // Remove restrictive UNIQUE constraints that might block inserts or duplicates in test data
  try {
    await p.query(`ALTER TABLE users DROP INDEX username;`);
  } catch {}
  try {
    await p.query(`ALTER TABLE users DROP INDEX username_unique;`);
  } catch {}
  try {
    await p.query(`ALTER TABLE dossiers DROP INDEX dossier_code_unique;`);
  } catch {}

  schemaEnsured = true;
}

export async function checkMySqlConnection(): Promise<{
  connected: boolean;
  config: DbConfig;
  error?: string;
  tablesCount?: number;
}> {
  const config = getDbConfig();
  if (!config.host) {
    isConnected = false;
    connectionError = 'Chưa cấu hình DB_HOST cho MySQL';
    return {
      connected: false,
      config,
      error: connectionError,
    };
  }
  try {
    const p = getPool();
    if (!p) throw new Error('Không thể khởi tạo kết nối MySQL Pool');
    await p.query('SELECT 1');
    const [rows] = (await p.query('SHOW TABLES')) as any;
    isConnected = true;
    connectionError = null;

    // Run schema check
    if (!schemaEnsured) {
      await ensureAllTableSchemas(p);
    }

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

/**
 * Ensures the database and all tables exist, with support for base64 avatars and long content
 */
export async function initTablesAndSeed(): Promise<{ success: boolean; message: string }> {
  const config = getDbConfig();

  // Step 1: Connect to server without database to create database if not exists
  let rootConn: mysql.Connection | null = null;
  try {
    rootConn = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port,
      connectTimeout: 5000,
    });
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();
  } catch (err: any) {
    console.warn('Note: Could not run CREATE DATABASE on root connection, attempting pool:', err.message);
    if (rootConn) {
      try { await rootConn.end(); } catch {}
    }
  }

  // Step 2: Connect via pool to target database
  resetPool();
  const p = getPool();
  if (!p) throw new Error('Không thể kết nối MySQL pool');

  // Ensure tables and columns
  await ensureAllTableSchemas(p);

  // Seed default data if empty
  let userCount = 0;
  try {
    const [userRes] = (await p.query('SELECT COUNT(*) as count FROM users')) as any;
    userCount = userRes[0]?.count ?? 0;
  } catch (countErr: any) {
    console.warn('Count users notice:', countErr.message);
  }

  if (userCount === 0) {
    for (const d of INITIAL_DEPARTMENTS) {
      await p.query(
        'INSERT IGNORE INTO departments (id, code, name, description, manager_id) VALUES (?, ?, ?, ?, ?)',
        [d.id, d.code, d.name, d.description || null, d.managerId || null]
      );
    }

    for (const pos of INITIAL_POSITIONS) {
      await p.query(
        'INSERT IGNORE INTO positions (id, name, level) VALUES (?, ?, ?)',
        [pos.id, pos.name, pos.level || 5]
      );
    }

    for (const u of INITIAL_USERS) {
      await p.query(
        `INSERT IGNORE INTO users 
        (id, username, password, full_name, email, phone, avatar, department, department_id, position, position_id, role, status, join_date, bio) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.id,
          u.username || u.email.split('@')[0],
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
          u.joinDate ? u.joinDate : null,
          u.bio || null,
        ]
      );
    }

    for (const dos of INITIAL_DOSSIERS) {
      await p.query(
        `INSERT IGNORE INTO dossiers 
        (id, code, title, department, department_id, leader_id, manager_id, status, start_date, end_date, description) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dos.id,
          dos.code,
          dos.title,
          dos.department || null,
          dos.departmentId || null,
          dos.leaderId || null,
          dos.managerId || null,
          dos.status || 'IN_PROGRESS',
          dos.startDate ? dos.startDate : null,
          dos.endDate ? dos.endDate : null,
          dos.description || null,
        ]
      );
    }

    for (const doc of INITIAL_INCOMING_DOCS) {
      await p.query(
        `INSERT IGNORE INTO incoming_documents 
        (id, document_number, official_number, received_date, issue_date, issuing_authority, summary, doc_type, urgency, security_level, assignee_id, co_assignee_ids, due_date, status, result_summary, dossier_id, linked_task_ids, created_by_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          doc.documentNumber,
          doc.officialNumber || null,
          doc.receivedDate,
          doc.issueDate ? doc.issueDate : null,
          doc.issuingAuthority,
          doc.summary,
          doc.docType || 'Công văn',
          doc.urgency || 'THUONG',
          doc.securityLevel || 'THUONG',
          doc.assigneeId || null,
          JSON.stringify(doc.coAssigneeIds || []),
          doc.dueDate ? doc.dueDate : null,
          doc.status || 'PROCESSING',
          doc.resultSummary || null,
          doc.dossierId || null,
          JSON.stringify(doc.linkedTaskIds || []),
          doc.createdById || null,
        ]
      );
    }

    for (const doc of INITIAL_OUTGOING_DOCS) {
      await p.query(
        `INSERT IGNORE INTO outgoing_documents 
        (id, document_number, release_date, doc_type, recipient, summary, content, drafter_id, signer_id, status, dossier_id, reply_to_doc_id, created_by_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          doc.documentNumber,
          doc.releaseDate,
          doc.docType || 'Công văn',
          doc.recipient,
          doc.summary,
          (doc as any).content || null,
          doc.drafterId || null,
          doc.signerId || null,
          doc.status || 'DRAFT',
          doc.dossierId || null,
          doc.replyToDocId || null,
          doc.createdById || null,
        ]
      );
    }

    for (const t of INITIAL_TASKS) {
      await p.query(
        `INSERT IGNORE INTO tasks 
        (id, code, title, description, dossier_id, incoming_doc_id, linked_doc_id, doc_type_relation, creator_id, created_by_id, assignee_id, co_assignee_ids, priority, start_date, due_date, progress, status, completed_date, result_notes, sub_tasks, comments, remind_days_before) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          t.code,
          t.title,
          t.description || null,
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
          t.completedDate ? t.completedDate : null,
          t.resultNotes || null,
          JSON.stringify(t.subTasks || []),
          JSON.stringify(t.comments || []),
          t.remindDaysBefore || 1,
        ]
      );
    }

    for (const a of INITIAL_ATTACHMENTS) {
      await p.query(
        `INSERT IGNORE INTO attachments 
        (id, file_name, file_size, file_type, file_url, category, related_id, dossier_code, dossier_id, uploaded_by_id, uploaded_by_name, tags) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.id,
          a.fileName,
          a.fileSize,
          a.fileType,
          a.fileUrl,
          a.category,
          a.relatedId || null,
          a.dossierCode || null,
          a.dossierId || null,
          a.uploadedById,
          a.uploadedByName,
          JSON.stringify(a.tags || []),
        ]
      );
    }

    for (const log of INITIAL_AUDIT_LOGS) {
      await p.query(
        `INSERT IGNORE INTO audit_logs 
        (id, user_id, user_name, user_avatar, action, entity_type, entity_id, entity_title, details) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          log.id,
          log.userId,
          log.userName,
          log.userAvatar || null,
          log.action,
          log.entityType,
          log.entityId,
          log.entityTitle,
          log.details || null,
        ]
      );
    }

    for (const n of INITIAL_NOTIFICATIONS) {
      await p.query(
        `INSERT IGNORE INTO notifications 
        (id, user_id, title, message, type, link_type, target_id, is_read) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          n.id,
          n.userId,
          n.title,
          n.message,
          n.type,
          n.linkType || null,
          n.targetId || null,
          n.isRead ? 1 : 0,
        ]
      );
    }
  }

  return { success: true, message: 'Đã khởi tạo thành công cấu trúc CSDL và nạp dữ liệu mẫu!' };
}

function parseJson(str: any, fallback: any) {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function formatDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.substring(0, 10);
  }
  if (val instanceof Date) {
    return val.toISOString().substring(0, 10);
  }
  return '';
}

export async function fetchAllDataFromMySql() {
  const p = getPool();
  if (!p) throw new Error('MySQL Pool không khả dụng');

  // Ensure schema before reading
  if (!schemaEnsured) {
    await ensureAllTableSchemas(p);
  }

  async function safeQuery(sql: string, tableName: string): Promise<any[]> {
    try {
      const [rows] = (await p!.query(sql)) as any[];
      return Array.isArray(rows) ? rows : [];
    } catch (err: any) {
      console.warn(`[MySQL Query Notice on ${tableName}]:`, err.message);
      return [];
    }
  }

  let departments = await safeQuery('SELECT * FROM departments', 'departments');
  let positions = await safeQuery('SELECT * FROM positions ORDER BY level ASC', 'positions');
  let users = await safeQuery('SELECT * FROM users', 'users');
  let dossiers = await safeQuery('SELECT * FROM dossiers ORDER BY created_at DESC', 'dossiers');
  let incomingDocs = await safeQuery('SELECT * FROM incoming_documents ORDER BY received_date DESC', 'incoming_documents');
  let outgoingDocs = await safeQuery('SELECT * FROM outgoing_documents ORDER BY release_date DESC', 'outgoing_documents');
  let tasks = await safeQuery('SELECT * FROM tasks ORDER BY due_date ASC', 'tasks');
  let attachments = await safeQuery('SELECT * FROM attachments ORDER BY uploaded_at DESC', 'attachments');
  let auditLogs = await safeQuery('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200', 'audit_logs');
  let notifications = await safeQuery('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100', 'notifications');

  // If core tables are empty after recovery, seed them automatically
  if (users.length === 0 && departments.length === 0) {
    try {
      await initTablesAndSeed();
      departments = await safeQuery('SELECT * FROM departments', 'departments');
      positions = await safeQuery('SELECT * FROM positions ORDER BY level ASC', 'positions');
      users = await safeQuery('SELECT * FROM users', 'users');
      dossiers = await safeQuery('SELECT * FROM dossiers ORDER BY created_at DESC', 'dossiers');
      incomingDocs = await safeQuery('SELECT * FROM incoming_documents ORDER BY received_date DESC', 'incoming_documents');
      outgoingDocs = await safeQuery('SELECT * FROM outgoing_documents ORDER BY release_date DESC', 'outgoing_documents');
      tasks = await safeQuery('SELECT * FROM tasks ORDER BY due_date ASC', 'tasks');
    } catch {}
  }

  const mappedAttachments = attachments.map((a: any) => ({
    id: a.id,
    fileName: a.file_name,
    fileSize: Number(a.file_size) || 0,
    fileType: a.file_type || 'file',
    fileUrl: a.file_url || '',
    category: a.category || 'KHAC',
    relatedId: a.related_id || '',
    dossierCode: a.dossier_code || '',
    dossierId: a.dossier_id || '',
    uploadedById: a.uploaded_by_id || '',
    uploadedByName: a.uploaded_by_name || '',
    uploadedAt: a.uploaded_at,
    tags: parseJson(a.tags, []),
  }));

  return {
    departments: departments.map((d: any) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description || '',
      managerId: d.manager_id || undefined,
    })),
    positions: positions.map((pos: any) => ({
      id: pos.id,
      name: pos.name,
      level: pos.level,
    })),
    users: users.map((u: any) => ({
      id: u.id,
      username: u.username || (u.email ? u.email.split('@')[0] : u.id),
      password: u.password || '123',
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
      joinDate: formatDate(u.join_date),
      bio: u.bio || '',
    })),
    dossiers: dossiers.map((d: any) => ({
      id: d.id,
      code: d.code,
      title: d.title,
      department: d.department || '',
      departmentId: d.department_id || '',
      leaderId: d.leader_id || '',
      managerId: d.manager_id || '',
      status: d.status || 'IN_PROGRESS',
      startDate: formatDate(d.start_date),
      endDate: formatDate(d.end_date),
      description: d.description || '',
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    })),
    incomingDocs: incomingDocs.map((doc: any) => ({
      id: doc.id,
      documentNumber: doc.document_number,
      officialNumber: doc.official_number || '',
      receivedDate: formatDate(doc.received_date),
      issueDate: formatDate(doc.issue_date),
      issuingAuthority: doc.issuing_authority,
      summary: doc.summary,
      docType: doc.doc_type || 'Công văn',
      urgency: doc.urgency || 'THUONG',
      securityLevel: doc.security_level || 'THUONG',
      assigneeId: doc.assignee_id || '',
      coAssigneeIds: parseJson(doc.co_assignee_ids, []),
      dueDate: formatDate(doc.due_date),
      status: doc.status || 'PROCESSING',
      resultSummary: doc.result_summary || '',
      dossierId: doc.dossier_id || '',
      linkedTaskIds: parseJson(doc.linked_task_ids, []),
      attachments: mappedAttachments.filter((a: any) => a.relatedId === doc.id),
      createdById: doc.created_by_id || '',
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    })),
    outgoingDocs: outgoingDocs.map((doc: any) => ({
      id: doc.id,
      documentNumber: doc.document_number,
      releaseDate: formatDate(doc.release_date),
      docType: doc.doc_type || 'Công văn',
      recipient: doc.recipient,
      summary: doc.summary,
      content: doc.content || '',
      drafterId: doc.drafter_id || '',
      signerId: doc.signer_id || '',
      status: doc.status || 'DRAFT',
      dossierId: doc.dossier_id || '',
      replyToDocId: doc.reply_to_doc_id || '',
      attachments: mappedAttachments.filter((a: any) => a.relatedId === doc.id),
      createdById: doc.created_by_id || '',
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    })),
    tasks: tasks.map((t: any) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      description: t.description || '',
      dossierId: t.dossier_id || '',
      incomingDocId: t.incoming_doc_id || '',
      linkedDocId: t.linked_doc_id || '',
      docTypeRelation: t.doc_type_relation || undefined,
      creatorId: t.creator_id || '',
      createdById: t.created_by_id || '',
      assigneeId: t.assignee_id,
      coAssigneeIds: parseJson(t.co_assignee_ids, []),
      priority: t.priority || 'MEDIUM',
      startDate: formatDate(t.start_date),
      dueDate: formatDate(t.due_date),
      progress: t.progress || 0,
      status: t.status || 'IN_PROGRESS',
      submissionNote: t.submission_note || '',
      submittedAt: t.submitted_at || '',
      approvedById: t.approved_by_id || '',
      approvedAt: t.approved_at || '',
      leaderFeedback: t.leader_feedback || '',
      completedDate: formatDate(t.completed_date),
      resultNotes: t.result_notes || '',
      subTasks: parseJson(t.sub_tasks, []),
      attachments: (t.attachments ? parseJson(t.attachments, []) : mappedAttachments.filter((a: any) => a.relatedId === t.id)),
      comments: parseJson(t.comments, []),
      remindDaysBefore: t.remind_days_before || 1,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
    attachments: mappedAttachments,
    auditLogs: auditLogs.map((l: any) => ({
      id: l.id,
      timestamp: l.timestamp,
      userId: l.user_id,
      userName: l.user_name,
      userAvatar: l.user_avatar || '',
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      entityTitle: l.entity_title,
      details: l.details || '',
    })),
    notifications: notifications.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      linkType: n.link_type || undefined,
      targetId: n.target_id || undefined,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    })),
    masterData: await (async () => {
      try {
        const [settingsRows] = (await p.query("SELECT data_value FROM system_settings WHERE key_name = 'master_data'")) as any;
        if (Array.isArray(settingsRows) && settingsRows[0]?.data_value) {
          return parseJson(settingsRows[0].data_value, null);
        }
      } catch {}
      return null;
    })(),
  };
}
