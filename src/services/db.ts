import {
  User,
  Dossier,
  IncomingDocument,
  OutgoingDocument,
  Task,
  AttachmentFile,
  AuditLog,
  SystemNotification,
  MasterData,
  TaskStatus,
  TaskSubItem,
  TaskComment,
  DossierStatus,
} from '../types';

import {
  INITIAL_USERS,
  INITIAL_DOSSIERS,
  INITIAL_INCOMING_DOCS,
  INITIAL_OUTGOING_DOCS,
  INITIAL_TASKS,
  INITIAL_ATTACHMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_MASTER_DATA,
} from '../data/mockData';
import { firestoreSync } from './firestoreSync';

const DB_STORAGE_KEYS = {
  USERS: 'qlvb_users_v2',
  DOSSIERS: 'qlvb_dossiers_v2',
  INCOMING_DOCS: 'qlvb_incoming_docs_v2',
  OUTGOING_DOCS: 'qlvb_outgoing_docs_v2',
  TASKS: 'qlvb_tasks_v2',
  ATTACHMENTS: 'qlvb_attachments_v2',
  AUDIT_LOGS: 'qlvb_audit_logs_v2',
  NOTIFICATIONS: 'qlvb_notifications_v2',
  MASTER_DATA: 'qlvb_master_data_v2',
  CURRENT_USER_ID: 'qlvb_current_user_id_v2',
  AUTH_TOKEN: 'qlvb_auth_token_v2',
  ADMIN_ORIGIN_USER_ID: 'qlvb_admin_origin_user_id_v2',
};

class DatabaseService {
  private listeners: Array<() => void> = [];
  private mySqlConnected: boolean = false;
  private mySqlInfo: any = null;
  private firestoreConnected: boolean = false;
  private memoryStore: Record<string, string> = {};

  constructor() {
    this.cleanStorageOnBoot();
    this.initIfEmpty();
    this.checkAndSyncMySql();
    this.initFirestoreSync();
    this.fetchAndRefreshAuditLogs();
  }

  /**
   * Safe setItem wrapper with in-memory fallback and quota recovery
   */
  private safeSetItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    this.memoryStore[key] = value;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.warn(`[Storage] localStorage.setItem failed for key "${key}". Running quota recovery...`, err);
      return this.handleStorageQuotaExceeded(key, value);
    }
  }

  /**
   * Safe getItem wrapper with fallback to memory store
   */
  private safeGetItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      if (item !== null) return item;
    } catch (err) {
      console.warn(`[Storage] localStorage.getItem failed for key "${key}":`, err);
    }
    return this.memoryStore[key] ?? null;
  }

  /**
   * Safe removeItem wrapper
   */
  private safeRemoveItem(key: string): void {
    if (typeof window === 'undefined') return;
    delete this.memoryStore[key];
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  /**
   * Recovers from QuotaExceededError by trimming oversized attachment base64 caches
   */
  private handleStorageQuotaExceeded(key: string, value: string): boolean {
    try {
      this.memoryStore[key] = value;

      // 1. Free quota by stripping oversized base64 data URLs in attachments
      try {
        const rawAtt = localStorage.getItem(DB_STORAGE_KEYS.ATTACHMENTS);
        if (rawAtt) {
          const atts = JSON.parse(rawAtt);
          if (Array.isArray(atts)) {
            const sanitized = atts.map((a: any) => {
              if (a.fileUrl && typeof a.fileUrl === 'string' && a.fileUrl.startsWith('data:') && a.fileUrl.length > 5000) {
                return { ...a, fileUrl: '' };
              }
              return a;
            });
            localStorage.setItem(DB_STORAGE_KEYS.ATTACHMENTS, JSON.stringify(sanitized));
          }
        }
      } catch {}

      // 2. Retry saving key directly
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        // If still fails, try keeping up to 500 logs if key is audit logs
        if (key === DB_STORAGE_KEYS.AUDIT_LOGS) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              const trimmed = parsed.slice(0, 500);
              localStorage.setItem(key, JSON.stringify(trimmed));
              return true;
            }
          } catch {}
        }
        return false;
      }
    } catch (e) {
      console.warn('[Storage] Quota recovery failed, continuing with memoryStore:', e);
      return false;
    }
  }

  /**
   * Boot-time sanity check to prevent QuotaExceeded on launch
   */
  private cleanStorageOnBoot() {
    if (typeof window === 'undefined') return;
    try {
      const rawAudit = localStorage.getItem(DB_STORAGE_KEYS.AUDIT_LOGS);
      if (rawAudit) {
        try {
          const logs = JSON.parse(rawAudit);
          if (Array.isArray(logs) && logs.length > 500) {
            localStorage.setItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 500)));
          }
        } catch {
          localStorage.removeItem(DB_STORAGE_KEYS.AUDIT_LOGS);
        }
      }
    } catch {
      try { localStorage.removeItem(DB_STORAGE_KEYS.AUDIT_LOGS); } catch {}
    }

    try {
      const rawNotifs = localStorage.getItem(DB_STORAGE_KEYS.NOTIFICATIONS);
      if (rawNotifs) {
        try {
          const notifs = JSON.parse(rawNotifs);
          if (Array.isArray(notifs) && notifs.length > 40) {
            localStorage.setItem(DB_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs.slice(0, 40)));
          }
        } catch {
          localStorage.removeItem(DB_STORAGE_KEYS.NOTIFICATIONS);
        }
      }
    } catch {
      try { localStorage.removeItem(DB_STORAGE_KEYS.NOTIFICATIONS); } catch {}
    }

    try {
      const rawAtt = localStorage.getItem(DB_STORAGE_KEYS.ATTACHMENTS);
      if (rawAtt && rawAtt.length > 300000) {
        try {
          const atts = JSON.parse(rawAtt);
          if (Array.isArray(atts)) {
            let changed = false;
            const sanitized = atts.map((a: any) => {
              if (a.fileUrl && typeof a.fileUrl === 'string' && a.fileUrl.startsWith('data:') && a.fileUrl.length > 15000) {
                changed = true;
                return { ...a, fileUrl: '' };
              }
              return a;
            });
            if (changed) {
              localStorage.setItem(DB_STORAGE_KEYS.ATTACHMENTS, JSON.stringify(sanitized));
            }
          }
        } catch {}
      }
    } catch {}
  }

  private async initFirestoreSync() {
    if (typeof window === 'undefined') return;
    try {
      this.firestoreConnected = await firestoreSync.checkConnection();

      // Listen to real-time changes from Firestore
      firestoreSync.listenToAll({
        onUsers: (users) => {
          this.firestoreConnected = true;
          this.safeSetItem(DB_STORAGE_KEYS.USERS, JSON.stringify(users));
          this.notify();
        },
        onDossiers: (dossiers) => {
          this.firestoreConnected = true;
          this.safeSetItem(DB_STORAGE_KEYS.DOSSIERS, JSON.stringify(dossiers));
          this.notify();
        },
        onIncomingDocs: (docs) => {
          this.firestoreConnected = true;
          this.safeSetItem(DB_STORAGE_KEYS.INCOMING_DOCS, JSON.stringify(docs));
          this.notify();
        },
        onOutgoingDocs: (docs) => {
          this.firestoreConnected = true;
          this.safeSetItem(DB_STORAGE_KEYS.OUTGOING_DOCS, JSON.stringify(docs));
          this.notify();
        },
        onTasks: (tasks) => {
          this.firestoreConnected = true;
          this.safeSetItem(DB_STORAGE_KEYS.TASKS, JSON.stringify(tasks));
          this.notify();
        },
        onAttachments: (attachments) => {
          this.firestoreConnected = true;
          this.safeSetItem(DB_STORAGE_KEYS.ATTACHMENTS, JSON.stringify(attachments));
          this.notify();
        },
        onAuditLogs: (logs) => {
          this.firestoreConnected = true;
          const nonLogout = (logs || []).filter((l) => l.action !== 'LOGOUT');
          const sorted = nonLogout.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          const cappedLogs = sorted.slice(0, 500);
          this.safeSetItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(cappedLogs));
          this.notify();
        },
        onNotifications: (notifications) => {
          this.firestoreConnected = true;
          const readIds = this.getPersistentReadNotifIds();
          const current = this.getList<SystemNotification>(DB_STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
          const map = new Map<string, SystemNotification>();
          current.forEach((n) => map.set(n.id, n));
          (notifications || []).forEach((n) => map.set(n.id, n));
          const merged = Array.from(map.values())
            .map((n) => (readIds.has(n.id) ? { ...n, isRead: true } : n))
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 200);
          this.safeSetItem(DB_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(merged));
          this.notify();
        },
      });

      // If Firestore has data, sync into local storage
      const remoteData = await firestoreSync.fetchAllFromFirestore();
      if (remoteData) {
        if (remoteData.users && remoteData.users.length > 0) {
          this.safeSetItem(DB_STORAGE_KEYS.USERS, JSON.stringify(remoteData.users));
        }
        if (remoteData.auditLogs && remoteData.auditLogs.length > 0) {
          const nonLogout = remoteData.auditLogs.filter((l) => l.action !== 'LOGOUT');
          const sortedAuditLogs = nonLogout.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ).slice(0, 500);
          this.safeSetItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(sortedAuditLogs));
        }
        this.notify();
      } else if (remoteData && remoteData.users.length === 0) {
        console.log('[Firestore] Cloud database initialized, seeding data...');
        await firestoreSync.migrateInitialDataToFirestore({
          users: this.getUsers(),
          dossiers: this.getDossiers(),
          incomingDocs: this.getIncomingDocs(),
          outgoingDocs: this.getOutgoingDocs(),
          tasks: this.getTasks(),
          attachments: this.getAttachments(),
          auditLogs: this.getAuditLogs(),
          notifications: this.getNotifications(),
          masterData: this.getMasterData(),
        });
      }
    } catch (err) {
      console.warn('[Firestore] Initialization notice:', err);
    }
  }

  public getFirestoreStatus() {
    return {
      connected: this.firestoreConnected,
      info: firestoreSync.getStatus(),
    };
  }

  public async syncAllToFirestore() {
    return await firestoreSync.migrateInitialDataToFirestore({
      users: this.getUsers(),
      dossiers: this.getDossiers(),
      incomingDocs: this.getIncomingDocs(),
      outgoingDocs: this.getOutgoingDocs(),
      tasks: this.getTasks(),
      attachments: this.getAttachments(),
      auditLogs: this.getAuditLogs(),
      notifications: this.getNotifications(),
      masterData: this.getMasterData(),
    });
  }

  public async checkAndSyncMySql(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const statusRes = await fetch('/api/db-status');
      if (statusRes.ok) {
        const status = await statusRes.json();
        this.mySqlConnected = Boolean(status.connected);
        this.mySqlInfo = status;
      }

      const syncRes = await fetch('/api/sync-all');
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData && syncData.data) {
          const d = syncData.data;
          if (Array.isArray(d.users)) this.safeSetItem(DB_STORAGE_KEYS.USERS, JSON.stringify(d.users));
          if (Array.isArray(d.dossiers)) this.safeSetItem(DB_STORAGE_KEYS.DOSSIERS, JSON.stringify(d.dossiers));
          if (Array.isArray(d.incomingDocs)) this.safeSetItem(DB_STORAGE_KEYS.INCOMING_DOCS, JSON.stringify(d.incomingDocs));
          if (Array.isArray(d.outgoingDocs)) this.safeSetItem(DB_STORAGE_KEYS.OUTGOING_DOCS, JSON.stringify(d.outgoingDocs));
          if (Array.isArray(d.tasks)) this.safeSetItem(DB_STORAGE_KEYS.TASKS, JSON.stringify(d.tasks));
          if (Array.isArray(d.attachments)) this.safeSetItem(DB_STORAGE_KEYS.ATTACHMENTS, JSON.stringify(d.attachments));
          if (Array.isArray(d.auditLogs)) {
            const currentLogs = this.getAuditLogs();
            const idMap = new Map<string, AuditLog>();
            currentLogs.forEach((l) => { if (l.action !== 'LOGOUT') idMap.set(l.id, l); });
            d.auditLogs.forEach((l: AuditLog) => {
              if (l.action !== 'LOGOUT' && !idMap.has(l.id)) idMap.set(l.id, l);
            });
            const merged = Array.from(idMap.values())
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 500);
            this.safeSetItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(merged));
          }
          if (Array.isArray(d.notifications)) {
            const readIds = this.getPersistentReadNotifIds();
            const current = this.getList<SystemNotification>(DB_STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
            const map = new Map<string, SystemNotification>();
            current.forEach((n) => map.set(n.id, n));
            d.notifications.forEach((n: SystemNotification) => map.set(n.id, n));
            const merged = Array.from(map.values())
              .map((n) => (readIds.has(n.id) ? { ...n, isRead: true } : n))
              .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
              .slice(0, 200);
            this.safeSetItem(DB_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(merged));
          }
          if (Array.isArray(d.departments) || Array.isArray(d.positions)) {
            const currentMaster = this.getMasterData();
            const normalizedDepts = Array.isArray(d.departments) && d.departments.length > 0
              ? d.departments.map((x: any) => typeof x === 'string' ? x : x.name || x.code || String(x))
              : currentMaster.departments;
            const normalizedPositions = Array.isArray(d.positions) && d.positions.length > 0
              ? d.positions.map((x: any) => typeof x === 'string' ? x : x.name || x.code || String(x))
              : currentMaster.positions;

            const newMaster = {
              ...currentMaster,
              departments: normalizedDepts,
              positions: normalizedPositions,
            };
            this.safeSetItem(DB_STORAGE_KEYS.MASTER_DATA, JSON.stringify(newMaster));
          }
          this.notify();
          return true;
        }
      }
    } catch (err) {
      console.warn('Database auto-sync notice:', err);
    }
    return false;
  }

  public async reloadFromDatabase(): Promise<{ success: boolean; connected: boolean; message: string }> {
    const success = await this.checkAndSyncMySql();
    return {
      success,
      connected: this.mySqlConnected,
      message: this.mySqlConnected
        ? 'Đã tải toàn bộ dữ liệu trực tiếp từ CSDL MySQL!'
        : 'Đã làm mới dữ liệu từ CSDL máy chủ!',
    };
  }

  public getMySqlStatus() {
    return {
      connected: this.mySqlConnected,
      info: this.mySqlInfo,
    };
  }

  public async initMySqlDatabase() {
    try {
      const res = await fetch('/api/init-db', { method: 'POST' });
      const result = await res.json();
      await this.checkAndSyncMySql();
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private async apiCall(url: string, method: string, body?: any) {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.fromDb !== undefined) {
          this.mySqlConnected = Boolean(data.fromDb);
        }
      } else {
        console.warn(`[API ${method} ${url} responded with status ${res.status}]`);
      }
    } catch (e) {
      console.warn(`[API ${method} ${url} network error]:`, e);
    }
  }

  private initIfEmpty() {
    if (typeof window === 'undefined') return;

    if (!this.safeGetItem(DB_STORAGE_KEYS.USERS)) {
      this.resetToDefaults();
    } else {
      // Auto-migrate legacy 2025 dates to 2026 across stored items if needed
      const keysToMigrate = [
        DB_STORAGE_KEYS.TASKS,
        DB_STORAGE_KEYS.INCOMING_DOCS,
        DB_STORAGE_KEYS.OUTGOING_DOCS,
        DB_STORAGE_KEYS.DOSSIERS,
        DB_STORAGE_KEYS.ATTACHMENTS,
        DB_STORAGE_KEYS.AUDIT_LOGS,
        DB_STORAGE_KEYS.NOTIFICATIONS,
      ];
      for (const key of keysToMigrate) {
        const raw = this.safeGetItem(key);
        if (raw && raw.includes('2025-08-')) {
          const updated = raw
            .replace(/2025-08-/g, '2026-08-')
            .replace(/2025-09-/g, '2026-09-')
            .replace(/2025-07-/g, '2026-07-')
            .replace(/2025-01-/g, '2026-01-')
            .replace(/2025-02-/g, '2026-02-')
            .replace(/2025-04-/g, '2026-04-')
            .replace(/2025-06-/g, '2026-06-')
            .replace(/2025-12-/g, '2026-12-');
          this.safeSetItem(key, updated);
        }
      }

      // Ensure all initial items across all collections are present if stored array has fewer
      const syncCollection = <T extends { id?: string }>(storageKey: string, initialList: T[]) => {
        const existing = this.getList<T>(storageKey, []);
        if (existing.length < initialList.length) {
          const existingIds = new Set(existing.map((d) => d.id || (d as any).fileName));
          const missing = initialList.filter((d) => !existingIds.has(d.id || (d as any).fileName));
          if (missing.length > 0) {
            const merged = [...existing, ...missing];
            this.setList(storageKey, merged);
          }
        }
      };

      syncCollection(DB_STORAGE_KEYS.USERS, INITIAL_USERS);
      syncCollection(DB_STORAGE_KEYS.DOSSIERS, INITIAL_DOSSIERS);
      syncCollection(DB_STORAGE_KEYS.INCOMING_DOCS, INITIAL_INCOMING_DOCS);
      syncCollection(DB_STORAGE_KEYS.OUTGOING_DOCS, INITIAL_OUTGOING_DOCS);
      syncCollection(DB_STORAGE_KEYS.TASKS, INITIAL_TASKS);
      syncCollection(DB_STORAGE_KEYS.ATTACHMENTS, INITIAL_ATTACHMENTS);
      syncCollection(DB_STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
      syncCollection(DB_STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);

      // Ensure master data has all updated departments
      const currentMaster = this.getMasterData();
      const existingDepts = new Set(currentMaster.departments);
      const missingDepts = INITIAL_MASTER_DATA.departments.filter((d) => !existingDepts.has(d));
      if (missingDepts.length > 0) {
        currentMaster.departments = [...currentMaster.departments, ...missingDepts];
        this.safeSetItem(DB_STORAGE_KEYS.MASTER_DATA, JSON.stringify(currentMaster));
      }

      this.notify();
    }
  }

  public resetToDefaults() {
    if (typeof window === 'undefined') return;
    this.safeSetItem(DB_STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    this.safeSetItem(DB_STORAGE_KEYS.DOSSIERS, JSON.stringify(INITIAL_DOSSIERS));
    this.safeSetItem(DB_STORAGE_KEYS.INCOMING_DOCS, JSON.stringify(INITIAL_INCOMING_DOCS));
    this.safeSetItem(DB_STORAGE_KEYS.OUTGOING_DOCS, JSON.stringify(INITIAL_OUTGOING_DOCS));
    this.safeSetItem(DB_STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    this.safeSetItem(DB_STORAGE_KEYS.ATTACHMENTS, JSON.stringify(INITIAL_ATTACHMENTS));
    this.safeSetItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS.slice(0, 60)));
    this.safeSetItem(DB_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS.slice(0, 60)));
    this.safeSetItem(DB_STORAGE_KEYS.MASTER_DATA, JSON.stringify(INITIAL_MASTER_DATA));
    this.safeSetItem(DB_STORAGE_KEYS.CURRENT_USER_ID, 'usr-01');
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error notifying listener', err);
      }
    });
  }

  private getList<T>(key: string, defaultVal: T[]): T[] {
    if (typeof window === 'undefined') return defaultVal;
    const raw = this.safeGetItem(key);
    if (!raw) return defaultVal;
    try {
      return JSON.parse(raw);
    } catch {
      return defaultVal;
    }
  }

  private setList<T>(key: string, items: T[]) {
    if (typeof window === 'undefined') return;
    let itemsToStore = items;
    if (key === DB_STORAGE_KEYS.AUDIT_LOGS && items.length > 500) {
      itemsToStore = items.slice(0, 500) as T[];
    } else if (key === DB_STORAGE_KEYS.NOTIFICATIONS) {
      const sorted = [...items].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      itemsToStore = sorted.slice(0, 200) as T[];
    }
    this.safeSetItem(key, JSON.stringify(itemsToStore));
    this.notify();
  }

  // --- Current User & Authentication ---
  public isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = this.safeGetItem(DB_STORAGE_KEYS.AUTH_TOKEN);
    const userId = this.safeGetItem(DB_STORAGE_KEYS.CURRENT_USER_ID);
    return Boolean(token && userId);
  }

  public async login(username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    if (!username || !password) {
      return { success: false, message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.' };
    }

    const cleanInput = username.trim().toLowerCase();

    // 1. Try real server API endpoint
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        this.saveUserSession(data.user, data.token || `tok_${Date.now()}`);
        return { success: true, user: data.user, message: data.message };
      } else if (res.status === 401) {
        return { success: false, message: data.message || 'Mật khẩu không đúng.' };
      }
    } catch {
      // Backend unreachable, fallback to Firestore / local storage
    }

    // 2. Direct Firestore Cloud Query (fetches live updates from Firebase Console)
    try {
      const firestoreUser = await firestoreSync.findUserByLogin(cleanInput);
      if (firestoreUser) {
        const expectedPass = firestoreUser.password || '123';
        if (password !== expectedPass) {
          return { success: false, message: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.' };
        }

        // Cache in local storage
        const currentUsers = this.getUsers();
        const existingIdx = currentUsers.findIndex((u) => u.id === firestoreUser.id);
        if (existingIdx >= 0) {
          currentUsers[existingIdx] = { ...currentUsers[existingIdx], ...firestoreUser };
        } else {
          currentUsers.unshift(firestoreUser);
        }
        this.safeSetItem(DB_STORAGE_KEYS.USERS, JSON.stringify(currentUsers));

        // Sync with backend API
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firestoreUser),
        }).catch(() => {});

        const updatedUser = { ...firestoreUser, lastLogin: new Date().toISOString() };
        this.saveUserSession(updatedUser, `tok_${firestoreUser.id}_${Date.now()}`);
        return { success: true, user: updatedUser, message: 'Đăng nhập thành công từ CSDL Firestore!' };
      }
    } catch (fsErr) {
      console.warn('[Firestore Login Check Error]:', fsErr);
    }

    // 3. Fallback check from local users database
    const users = this.getUsers();
    const cleanNoDiacritics = cleanInput.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    const user = users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanInput) ||
        u.email.toLowerCase() === cleanInput ||
        u.email.split('@')[0].toLowerCase() === cleanInput ||
        (u.fullName && u.fullName.toLowerCase() === cleanInput) ||
        (u.fullName && u.fullName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd') === cleanNoDiacritics) ||
        u.id.toLowerCase() === cleanInput
    );

    if (!user) {
      return { success: false, message: 'Tên tài khoản hoặc email không tồn tại trong hệ thống.' };
    }

    // Default password if not defined is '123'
    const expectedPass = user.password || '123';
    if (password !== expectedPass) {
      return { success: false, message: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.' };
    }

    const updatedUser = { ...user, lastLogin: new Date().toISOString() };
    this.saveUserSession(updatedUser, `tok_${user.id}_${Date.now()}`);
    return { success: true, user: updatedUser, message: 'Đăng nhập thành công!' };
  }

  public saveUserSession(user: User, token: string) {
    if (typeof window === 'undefined') return;
    this.safeSetItem(DB_STORAGE_KEYS.AUTH_TOKEN, token);
    this.safeSetItem(DB_STORAGE_KEYS.CURRENT_USER_ID, user.id);
    
    // If the authenticated user is an Admin, record as origin admin
    if (user.role === 'ADMIN') {
      this.safeSetItem(DB_STORAGE_KEYS.ADMIN_ORIGIN_USER_ID, user.id);
    } else {
      this.safeRemoveItem(DB_STORAGE_KEYS.ADMIN_ORIGIN_USER_ID);
    }

    this.logAction('LOGIN', 'USER', user.id, user.fullName, `Đăng nhập hệ thống thành công (Tài khoản: ${user.username || user.email})`, user);
    this.notify();
  }

  public logout(_actor?: User) {
    if (typeof window === 'undefined') return;
    this.safeRemoveItem(DB_STORAGE_KEYS.AUTH_TOKEN);
    this.safeRemoveItem(DB_STORAGE_KEYS.CURRENT_USER_ID);
    this.safeRemoveItem(DB_STORAGE_KEYS.ADMIN_ORIGIN_USER_ID);
    this.notify();
  }

  public getAdminOriginUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return this.safeGetItem(DB_STORAGE_KEYS.ADMIN_ORIGIN_USER_ID);
  }

  public getAdminOriginUser(): User | null {
    const adminId = this.getAdminOriginUserId();
    if (!adminId) return null;
    return this.getUserById(adminId) || null;
  }

  public isImpersonating(): boolean {
    const adminId = this.getAdminOriginUserId();
    const currentId = this.getCurrentUserId();
    return Boolean(adminId && currentId && adminId !== currentId);
  }

  public canSwitchUser(): boolean {
    const currentUser = this.getCurrentUser();
    const adminId = this.getAdminOriginUserId();
    return currentUser?.role === 'ADMIN' || currentUser?.role === 'LEADER' || Boolean(adminId);
  }

  public switchUser(targetUserId: string): boolean {
    if (!this.canSwitchUser()) {
      console.warn('Chỉ có Quản trị viên (Admin) hoặc Lãnh đạo mới có quyền chuyển đổi tài khoản.');
      return false;
    }

    const targetUser = this.getUserById(targetUserId);
    if (!targetUser) return false;

    const currentActor = this.getCurrentUser();
    const adminOrigin = this.getAdminOriginUser() || currentActor;

    // Ensure origin is saved if current actor is Admin or Leader
    if (currentActor.role === 'ADMIN' || currentActor.role === 'LEADER') {
      this.safeSetItem(DB_STORAGE_KEYS.ADMIN_ORIGIN_USER_ID, currentActor.id);
    }

    this.safeSetItem(DB_STORAGE_KEYS.CURRENT_USER_ID, targetUserId);
    this.safeSetItem(DB_STORAGE_KEYS.AUTH_TOKEN, `tok_switch_${targetUserId}_${Date.now()}`);

    this.logAction(
      'SWITCH_USER',
      'USER',
      targetUser.id,
      targetUser.fullName,
      `${currentActor.role === 'LEADER' ? 'Lãnh đạo' : 'Quản trị viên'} ${adminOrigin.fullName} chuyển sang tài khoản ${targetUser.fullName} (${targetUser.role})`,
      adminOrigin
    );

    this.notify();
    return true;
  }

  public returnToAdminAccount(): boolean {
    const adminId = this.getAdminOriginUserId();
    if (!adminId) return false;

    const adminUser = this.getUserById(adminId);
    if (!adminUser) return false;

    const previousUser = this.getCurrentUser();
    this.safeSetItem(DB_STORAGE_KEYS.CURRENT_USER_ID, adminId);
    this.safeSetItem(DB_STORAGE_KEYS.AUTH_TOKEN, `tok_return_${adminId}_${Date.now()}`);

    this.logAction(
      'SWITCH_USER',
      'USER',
      adminUser.id,
      adminUser.fullName,
      `Quản trị viên kết thúc chuyển tài khoản từ ${previousUser.fullName} quay về tài khoản chính`,
      adminUser
    );

    this.notify();
    return true;
  }

  public async changePassword(userId: string, oldPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const user = this.getUserById(userId);
    if (!user) return { success: false, message: 'Người dùng không tồn tại.' };

    const expectedPass = user.password || '123';
    if (oldPass !== expectedPass) {
      return { success: false, message: 'Mật khẩu cũ không chính xác.' };
    }

    user.password = newPass;
    this.saveUser(user);

    try {
      await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, oldPassword: oldPass, newPassword: newPass }),
      });
    } catch {
      // ignore
    }

    this.logAction('UPDATE', 'USER', user.id, user.fullName, 'Đổi mật khẩu tài khoản thành công', user);
    return { success: true, message: 'Đổi mật khẩu thành công!' };
  }

  public async resetPassword(emailOrUsername: string, newPassword: string): Promise<{ success: boolean; message: string; user?: User }> {
    const clean = emailOrUsername.trim().toLowerCase();

    // 1. Check & Update in Firestore
    let matchedUser: User | null = null;
    try {
      matchedUser = await firestoreSync.findUserByLogin(clean);
      if (matchedUser) {
        matchedUser.password = newPassword;
        await firestoreSync.saveUser(matchedUser);
      }
    } catch (e) {
      console.warn('[Firestore resetPassword Error]:', e);
    }

    // 2. Update local storage users
    const users = this.getUsers();
    const idx = users.findIndex(
      (u) =>
        (u.username && u.username.toLowerCase() === clean) ||
        (u.email && u.email.toLowerCase() === clean) ||
        (u.id && u.id.toLowerCase() === clean)
    );

    if (idx !== -1) {
      users[idx] = { ...users[idx], password: newPassword };
      this.safeSetItem(DB_STORAGE_KEYS.USERS, JSON.stringify(users));
      matchedUser = matchedUser || users[idx];
    } else if (matchedUser) {
      users.unshift(matchedUser);
      this.safeSetItem(DB_STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    // 3. Call server reset API
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, newPassword }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        matchedUser = matchedUser || data.user;
      }
    } catch (apiErr) {
      console.warn('[Server resetPassword API Notice]:', apiErr);
    }

    if (matchedUser) {
      this.logAction('UPDATE', 'USER', matchedUser.id, matchedUser.fullName, `Khôi phục và đặt lại mật khẩu mới cho tài khoản ${matchedUser.username || matchedUser.email}`);
      this.notify();
      return { success: true, message: 'Đặt lại mật khẩu thành công!', user: matchedUser };
    }

    return { success: false, message: 'Không tìm thấy tài khoản với email hoặc tên đăng nhập này.' };
  }

  public getCurrentUserId(): string {
    if (typeof window === 'undefined') return 'usr-01';
    return this.safeGetItem(DB_STORAGE_KEYS.CURRENT_USER_ID) || 'usr-01';
  }

  public setCurrentUserId(userId: string) {
    if (typeof window === 'undefined') return;
    this.safeSetItem(DB_STORAGE_KEYS.CURRENT_USER_ID, userId);
    this.safeSetItem(DB_STORAGE_KEYS.AUTH_TOKEN, `tok_${userId}_${Date.now()}`);
    this.notify();
  }

  public setCurrentUser(userId: string) {
    this.setCurrentUserId(userId);
  }

  public getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = this.getCurrentUserId();
    return users.find((u) => u.id === currentId) || users[0] || INITIAL_USERS[0];
  }

  // --- Audit Logging ---
  public logAction(
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    entityId: string,
    entityTitle: string,
    details: string,
    performedBy?: User
  ) {
    const actor = performedBy || this.getCurrentUser();
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      userId: actor?.id,
      userName: actor?.fullName || 'Hệ thống',
      userAvatar: actor?.avatar,
      action,
      entityType,
      entityId,
      entityTitle,
      details,
    };
    const updatedLogs = [newLog, ...logs.filter((l) => l.id !== newLog.id)]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 500);
    this.setList(DB_STORAGE_KEYS.AUDIT_LOGS, updatedLogs);
    this.apiCall('/api/audit-logs', 'POST', newLog);
    firestoreSync.saveAuditLog(newLog);
  }

  public getAuditLogs(): AuditLog[] {
    const list = this.getList<AuditLog>(DB_STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    return [...list]
      .filter((l) => l.action !== 'LOGOUT')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async fetchAndRefreshAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const nonLogout = json.data.filter((l: any) => l.action !== 'LOGOUT');
          const sorted = nonLogout.sort(
            (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ).slice(0, 500);
          this.memoryStore[DB_STORAGE_KEYS.AUDIT_LOGS] = JSON.stringify(sorted);
          try {
            localStorage.setItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(sorted));
          } catch {
            this.handleStorageQuotaExceeded(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(sorted));
          }
          this.notify();
          return sorted;
        }
      }
    } catch (e) {
      console.warn('Could not fetch audit logs from API:', e);
    }
    return this.getAuditLogs();
  }

  public clearAuditLogs(actor?: User) {
    const currentActor = actor || this.getCurrentUser();
    const defaultLog: AuditLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: currentActor?.id,
      userName: currentActor?.fullName || 'Hệ thống',
      userAvatar: currentActor?.avatar,
      action: 'DELETE',
      entityType: 'USER',
      entityId: 'audit-logs',
      entityTitle: 'Nhật ký truy vết',
      details: 'Đã dọn dẹp bộ nhớ đệm nhật ký hệ thống',
    };
    this.setList(DB_STORAGE_KEYS.AUDIT_LOGS, [defaultLog]);
  }

  // --- Notifications Helper: Persistent Read IDs ---
  private getPersistentReadNotifIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = this.safeGetItem('vanphong_so_read_notif_ids');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  private savePersistentReadNotifIds(idsToAdd: string[]) {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getPersistentReadNotifIds();
      idsToAdd.forEach((id) => current.add(id));
      const capped = Array.from(current).slice(-60);
      this.safeSetItem('vanphong_so_read_notif_ids', JSON.stringify(capped));
    } catch {}
  }

  // --- Notifications ---
  public getNotifications(userId?: string): SystemNotification[] {
    const rawList = this.getList<SystemNotification>(DB_STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const readIds = this.getPersistentReadNotifIds();
    const list = rawList.map((n) => (readIds.has(n.id) ? { ...n, isRead: true } : n));
    if (!userId) return list;
    const user = this.getUserById(userId);
    return list.filter((n) => {
      if (n.userId) return n.userId === userId;
      if (n.targetRole && user) return n.targetRole === user.role;
      return false;
    });
  }

  public addNotification(
    notification: Omit<SystemNotification, 'id' | 'createdAt' | 'isRead'>,
    actor?: User
  ) {
    // Crucial rule: A user must NEVER receive a notification for an action they themselves performed!
    if (actor && notification.userId && notification.userId === actor.id) {
      return;
    }

    const senderId = notification.senderId || actor?.id;
    const senderName = notification.senderName || actor?.fullName;
    const senderRole =
      notification.senderRole ||
      (actor ? (actor.role === 'LEADER' ? 'Lãnh đạo' : actor.role === 'CLERK' ? 'Văn thư' : 'Chuyên viên') : undefined);

    const list = this.getList<SystemNotification>(DB_STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const newNotif: SystemNotification = {
      ...notification,
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      isRead: false,
      senderId,
      senderName,
      senderRole,
    };
    this.setList(DB_STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...list]);
    this.apiCall('/api/notifications', 'POST', newNotif);
    firestoreSync.saveNotification(newNotif);
  }

  public deleteNotification(id: string) {
    const current = this.getList<SystemNotification>(DB_STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const updated = current.filter((n) => n.id !== id);
    this.setList(DB_STORAGE_KEYS.NOTIFICATIONS, updated);
    this.apiCall(`/api/notifications/${id}`, 'DELETE');
    try {
      firestoreSync.deleteNotification?.(id);
    } catch {}
  }

  public clearAllNotifications(userId?: string) {
    const current = this.getList<SystemNotification>(DB_STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const user = userId ? this.getUserById(userId) : undefined;
    const updated = current.filter((n) => {
      if (!userId) return false;
      if (n.userId === userId) return false;
      if (n.targetRole && user && n.targetRole === user.role) return false;
      return true;
    });
    this.setList(DB_STORAGE_KEYS.NOTIFICATIONS, updated);
    this.apiCall('/api/notifications/clear-all', 'POST', { userId });
  }

  public markNotificationAsRead(id: string) {
    this.savePersistentReadNotifIds([id]);
    const list = this.getList<SystemNotification>(DB_STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS).map((n) => (n.id === id ? { ...n, isRead: true } : n));
    this.setList(DB_STORAGE_KEYS.NOTIFICATIONS, list);
    this.apiCall('/api/notifications/mark-read', 'POST', { id });
    const target = list.find((n) => n.id === id);
    if (target) {
      firestoreSync.saveNotification({ ...target, isRead: true });
    }
  }

  public markAllNotificationsAsRead(userId?: string) {
    const current = this.getList<SystemNotification>(DB_STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const user = userId ? this.getUserById(userId) : undefined;
    const isTarget = (n: SystemNotification) => {
      if (!userId) return true;
      if (n.userId === userId) return true;
      if (n.targetRole && user && n.targetRole === user.role) return true;
      return false;
    };
    const idsToMark = current.filter(isTarget).map((n) => n.id);
    this.savePersistentReadNotifIds(idsToMark);
    const list = current.map((n) => {
      if (isTarget(n)) {
        return { ...n, isRead: true };
      }
      return n;
    });
    this.setList(DB_STORAGE_KEYS.NOTIFICATIONS, list);
    this.apiCall('/api/notifications/mark-all-read', 'POST', { userId });
    list.forEach((n) => {
      if (isTarget(n)) {
        firestoreSync.saveNotification(n);
      }
    });
  }

  // --- Users & Personnel ---
  public getUsers(): User[] {
    return this.getList<User>(DB_STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public getUserById(id?: string): User | undefined {
    if (!id) return undefined;
    return this.getUsers().find((u) => u.id === id);
  }

  public saveUser(user: User, actor?: User) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    let updated: User[];
    if (idx >= 0) {
      updated = [...users];
      updated[idx] = user;
      this.logAction('UPDATE', 'USER', user.id, user.fullName, `Cập nhật thông tin cán bộ: ${user.fullName} (${user.role})`, actor);
    } else {
      updated = [user, ...users];
      this.logAction('CREATE', 'USER', user.id, user.fullName, `Thêm mới cán bộ/nhân sự: ${user.fullName}`, actor);
    }
    this.setList(DB_STORAGE_KEYS.USERS, updated);
    this.apiCall('/api/users', 'POST', user);
    firestoreSync.saveUser(user);
  }

  public deleteUser(id: string, actor?: User) {
    const users = this.getUsers();
    const target = users.find((u) => u.id === id);
    if (target) {
      this.setList(DB_STORAGE_KEYS.USERS, users.filter((u) => u.id !== id));
      this.logAction('DELETE', 'USER', id, target.fullName, `Xóa nhân sự: ${target.fullName}`, actor);
      this.apiCall(`/api/users/${id}`, 'DELETE');
      firestoreSync.deleteUser(id);
    }
  }

  // --- Dossiers (Hồ sơ vụ việc) ---
  public getDossiers(): Dossier[] {
    return this.getList<Dossier>(DB_STORAGE_KEYS.DOSSIERS, INITIAL_DOSSIERS);
  }

  public getDossierById(id?: string): Dossier | undefined {
    if (!id) return undefined;
    return this.getDossiers().find((d) => d.id === id || d.code === id);
  }

  public saveDossier(dossier: Dossier, actor?: User) {
    const dossiers = this.getDossiers();
    const idx = dossiers.findIndex((d) => d.id === dossier.id);
    let updated: Dossier[];
    if (idx >= 0) {
      updated = [...dossiers];
      updated[idx] = { ...dossier, updatedAt: new Date().toISOString() };
      this.logAction('UPDATE', 'DOSSIER', dossier.id, dossier.title, `Cập nhật hồ sơ mã: ${dossier.code}`, actor);
    } else {
      updated = [{ ...dossier, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...dossiers];
      this.logAction('CREATE', 'DOSSIER', dossier.id, dossier.title, `Mở mới hồ sơ vụ việc: ${dossier.code} - ${dossier.title}`, actor);
    }
    this.setList(DB_STORAGE_KEYS.DOSSIERS, updated);
    this.apiCall('/api/dossiers', 'POST', dossier);
    firestoreSync.saveDossier(dossier);
  }

  public deleteDossier(id: string, actor?: User) {
    const dossiers = this.getDossiers();
    const target = dossiers.find((d) => d.id === id);
    if (target) {
      this.setList(DB_STORAGE_KEYS.DOSSIERS, dossiers.filter((d) => d.id !== id));
      this.logAction('DELETE', 'DOSSIER', id, target.title, `Xóa hồ sơ vụ việc: ${target.code}`, actor);
      this.apiCall(`/api/dossiers/${id}`, 'DELETE');
      firestoreSync.deleteDossier(id);
    }
  }

  // --- Incoming Documents (Văn bản đến) ---
  public getIncomingDocs(): IncomingDocument[] {
    return this.getList<IncomingDocument>(DB_STORAGE_KEYS.INCOMING_DOCS, INITIAL_INCOMING_DOCS);
  }

  public getIncomingDocById(id?: string): IncomingDocument | undefined {
    if (!id) return undefined;
    return this.getIncomingDocs().find((d) => d.id === id);
  }

  public saveIncomingDoc(doc: IncomingDocument, actor?: User) {
    const docs = this.getIncomingDocs();
    const idx = docs.findIndex((d) => d.id === doc.id);
    let updated: IncomingDocument[];
    if (idx >= 0) {
      updated = [...docs];
      updated[idx] = { ...doc, updatedAt: new Date().toISOString() };
      this.logAction(
        'UPDATE',
        'INCOMING_DOC',
        doc.id,
        `${doc.documentNumber} - ${doc.summary.slice(0, 40)}...`,
        `Cập nhật văn bản đến số ${doc.documentNumber}, người phụ trách: ${this.getUserById(doc.assigneeId)?.fullName || 'Chưa giao'}`,
        actor
      );
    } else {
      updated = [{ ...doc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...docs];
      this.logAction(
        'CREATE',
        'INCOMING_DOC',
        doc.id,
        `${doc.documentNumber} - ${doc.summary.slice(0, 40)}...`,
        `Tiếp nhận văn bản đến số ${doc.documentNumber} từ ${doc.issuingAuthority}`,
        actor
      );

      // Create notification for assignee
      if (doc.assigneeId) {
        this.addNotification({
          userId: doc.assigneeId,
          title: `Văn bản đến mới được phân công: ${doc.documentNumber}`,
          message: `Bạn được giao chủ trì xử lý văn bản: "${doc.summary}". Hạn xử lý: ${doc.dueDate}.`,
          type: 'DOC_ASSIGNED',
          linkType: 'INCOMING_DOC',
          targetId: doc.id,
        });
      }
    }
    this.setList(DB_STORAGE_KEYS.INCOMING_DOCS, updated);
    this.apiCall('/api/incoming-docs', 'POST', doc);
    firestoreSync.saveIncomingDoc(doc);

    // Save attachments to central attachments storage and MySQL
    if (doc.attachments && doc.attachments.length > 0) {
      const existingAttachments = this.getAttachments();
      const updatedAttachments = [...existingAttachments];

      for (const att of doc.attachments) {
        const existingIdx = updatedAttachments.findIndex((a) => a.id === att.id);
        const attachmentToSave: AttachmentFile = {
          ...att,
          relatedId: doc.id,
          category: 'VAN_BAN_DEN',
          dossierId: doc.dossierId || att.dossierId,
        };

        if (existingIdx >= 0) {
          updatedAttachments[existingIdx] = attachmentToSave;
        } else {
          updatedAttachments.unshift(attachmentToSave);
        }
        this.apiCall('/api/attachments', 'POST', attachmentToSave);
      }
      this.setList(DB_STORAGE_KEYS.ATTACHMENTS, updatedAttachments);
    }
  }

  public deleteIncomingDoc(id: string, actor?: User) {
    const docs = this.getIncomingDocs();
    const target = docs.find((d) => d.id === id);
    const updatedDocs = docs.filter((d) => d.id !== id);
    this.setList(DB_STORAGE_KEYS.INCOMING_DOCS, updatedDocs);

    // Also remove related attachments
    const attachments = this.getAttachments();
    this.setList(
      DB_STORAGE_KEYS.ATTACHMENTS,
      attachments.filter((a) => a.relatedId !== id)
    );

    // Also unlink from tasks
    const tasks = this.getTasks();
    const updatedTasks = tasks.map((t) => {
      if (t.incomingDocId === id || t.linkedDocId === id) {
        return { ...t, incomingDocId: undefined, linkedDocId: undefined };
      }
      return t;
    });
    this.setList(DB_STORAGE_KEYS.TASKS, updatedTasks);

    if (target) {
      this.logAction(
        'DELETE',
        'INCOMING_DOC',
        id,
        target.documentNumber,
        `Xóa văn bản đến số ${target.documentNumber}`,
        actor
      );
    }
    this.apiCall(`/api/incoming-docs/${id}`, 'DELETE');
    firestoreSync.deleteIncomingDoc(id);
  }

  /**
   * LÃNH ĐẠO phê duyệt bút phê chỉ đạo và giao việc từ Văn bản đến
   * Theo NĐ 30/2020/NĐ-CP: Tự động khởi tạo Nhiệm vụ (Task) gắn với Hồ sơ vụ việc (Dossier) và phân công cán bộ
   */
  public leaderAssignIncomingDoc(
    docId: string,
    leader: User,
    assignment: {
      assigneeId: string;
      coAssigneeIds?: string[];
      dueDate: string;
      directive: string;
      dossierId?: string;
    }
  ): { doc: IncomingDocument; task: Task } | undefined {
    const docs = this.getIncomingDocs();
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return undefined;

    const now = new Date().toISOString();
    const assignee = this.getUserById(assignment.assigneeId);
    const assigneeName = assignee?.fullName || 'Cán bộ';

    // 1. Tự động tạo Nhiệm vụ mới liên kết chặt chẽ
    const taskCode = `CV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      code: taskCode,
      title: `Thực hiện chỉ đạo VB [${doc.documentNumber}]: ${doc.summary.slice(0, 80)}`,
      description: `[Ý KIẾN CHỈ ĐẠO CỦA LÃNH ĐẠO ${leader.fullName}]:\n${assignment.directive}\n\n[Trích yếu văn bản đến]: ${doc.summary}\n[Cơ quan gửi]: ${doc.issuingAuthority}\n[Số ký hiệu đến]: ${doc.documentNumber}`,
      incomingDocId: doc.id,
      linkedDocId: doc.id,
      docTypeRelation: 'INCOMING',
      dossierId: assignment.dossierId || doc.dossierId,
      creatorId: leader.id,
      createdById: leader.id,
      assigneeId: assignment.assigneeId,
      coAssigneeIds: assignment.coAssigneeIds || [],
      priority: doc.urgency === 'HOA_TOC' || doc.urgency === 'THUONG_KHAN' ? 'URGENT' : doc.urgency === 'KHAN' ? 'HIGH' : 'MEDIUM',
      startDate: now.split('T')[0],
      dueDate: assignment.dueDate || doc.dueDate,
      progress: 0,
      status: 'IN_PROGRESS',
      attachments: doc.attachments || [],
      comments: [
        {
          id: `cm-assign-${Date.now()}`,
          userId: leader.id,
          userName: leader.fullName,
          userAvatar: leader.avatar || '',
          content: `📌 [BÚT PHÊ CHỈ ĐẠO CỦA LÃNH ĐẠO]: ${assignment.directive}. Giao đồng chí ${assigneeName} chủ trì triển khai theo đúng thời hạn.`,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    // 1. Tự động tạo Nhiệm vụ mới liên kết chặt chẽ (skip generic notification so custom directive notification is sent)
    this.saveTask(newTask, leader, true);

    // 2. Cập nhật Văn bản đến
    const updatedDoc: IncomingDocument = {
      ...doc,
      status: 'PROCESSING',
      assigneeId: assignment.assigneeId,
      coAssigneeIds: assignment.coAssigneeIds || [],
      dueDate: assignment.dueDate || doc.dueDate,
      leaderDirective: assignment.directive,
      leaderId: leader.id,
      assignedAt: now,
      dossierId: assignment.dossierId || doc.dossierId,
      linkedTaskIds: Array.from(new Set([...(doc.linkedTaskIds || []), newTask.id])),
      updatedAt: now,
    };

    this.saveIncomingDoc(updatedDoc, leader);

    // 3. Nếu có hồ sơ vụ việc, kích hoạt trạng thái mở/đang thực hiện
    if (updatedDoc.dossierId) {
      const dossiers = this.getDossiers();
      const targetDossier = dossiers.find((d) => d.id === updatedDoc.dossierId || d.code === updatedDoc.dossierId);
      if (targetDossier && targetDossier.status === 'OPEN') {
        this.saveDossier({ ...targetDossier, status: 'IN_PROGRESS' }, leader);
      }
    }

    // 4. Gửi thông báo đến Cán bộ chủ trì & phối hợp (Người giao - Leader - không bao giờ tự nhận thông báo này)
    if (assignment.assigneeId && assignment.assigneeId !== leader.id) {
      this.addNotification(
        {
          userId: assignment.assigneeId,
          title: `⚡ Lãnh đạo giao việc xử lý VB đến: ${doc.documentNumber}`,
          message: `Lãnh đạo ${leader.fullName} đã chỉ đạo: "${assignment.directive}". Bạn được giao chủ trì nhiệm vụ [${taskCode}]. Hạn chót: ${assignment.dueDate || doc.dueDate}.`,
          type: 'DOC_ASSIGNED',
          linkType: 'TASK',
          targetId: newTask.id,
        },
        leader
      );
    }

    if (assignment.coAssigneeIds) {
      for (const coId of assignment.coAssigneeIds) {
        if (coId && coId !== assignment.assigneeId && coId !== leader.id) {
          this.addNotification(
            {
              userId: coId,
              title: `👥 Phối hợp xử lý VB đến: ${doc.documentNumber}`,
              message: `Lãnh đạo ${leader.fullName} phân công bạn phối hợp cùng ${assigneeName} thực hiện nhiệm vụ [${taskCode}].`,
              type: 'DOC_ASSIGNED',
              linkType: 'TASK',
              targetId: newTask.id,
            },
            leader
          );
        }
      }
    }

    // 5. Thông báo ngược lại cho Văn thư để biết Lãnh đạo đã chỉ đạo phân luồng xong
    const clerks = this.getUsers().filter((u) => u.role === 'CLERK' && u.id !== leader.id);
    for (const clerk of clerks) {
      this.addNotification(
        {
          userId: clerk.id,
          title: `✅ Lãnh đạo đã bút phê giao việc: VB đến [${doc.documentNumber}]`,
          message: `Lãnh đạo ${leader.fullName} đã phê duyệt bút phê: "${assignment.directive}" và giao cán bộ ${assigneeName} chủ trì thực hiện nhiệm vụ [${taskCode}].`,
          type: 'STATUS_UPDATED',
          linkType: 'INCOMING_DOC',
          targetId: doc.id,
        },
        leader
      );
    }

    return { doc: updatedDoc, task: newTask };
  }

  // --- Outgoing Documents (Văn bản đi) ---
  public getOutgoingDocs(): OutgoingDocument[] {
    return this.getList<OutgoingDocument>(DB_STORAGE_KEYS.OUTGOING_DOCS, INITIAL_OUTGOING_DOCS);
  }

  public getOutgoingDocById(id?: string): OutgoingDocument | undefined {
    if (!id) return undefined;
    return this.getOutgoingDocs().find((d) => d.id === id);
  }

  public saveOutgoingDoc(doc: OutgoingDocument, actor?: User) {
    const docs = this.getOutgoingDocs();
    const idx = docs.findIndex((d) => d.id === doc.id);
    let updated: OutgoingDocument[];
    if (idx >= 0) {
      updated = [...docs];
      updated[idx] = { ...doc, updatedAt: new Date().toISOString() };
      this.logAction(
        'UPDATE',
        'OUTGOING_DOC',
        doc.id,
        `${doc.documentNumber} - ${doc.summary.slice(0, 40)}...`,
        `Cập nhật văn bản đi số ${doc.documentNumber} (Trạng thái: ${doc.status})`,
        actor
      );
    } else {
      updated = [{ ...doc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...docs];
      this.logAction(
        'CREATE',
        'OUTGOING_DOC',
        doc.id,
        `${doc.documentNumber} - ${doc.summary.slice(0, 40)}...`,
        `Soạn thảo & tạo mới văn bản đi số ${doc.documentNumber} gửi ${doc.recipient}`,
        actor
      );
    }
    this.setList(DB_STORAGE_KEYS.OUTGOING_DOCS, updated);
    this.apiCall('/api/outgoing-docs', 'POST', doc);
    firestoreSync.saveOutgoingDoc(doc);

    if (doc.attachments && doc.attachments.length > 0) {
      const existingAttachments = this.getAttachments();
      const updatedAttachments = [...existingAttachments];

      for (const att of doc.attachments) {
        const existingIdx = updatedAttachments.findIndex((a) => a.id === att.id);
        const attachmentToSave: AttachmentFile = {
          ...att,
          relatedId: doc.id,
          category: 'VAN_BAN_DI',
          dossierId: doc.dossierId || att.dossierId,
        };

        if (existingIdx >= 0) {
          updatedAttachments[existingIdx] = attachmentToSave;
        } else {
          updatedAttachments.unshift(attachmentToSave);
        }
        this.apiCall('/api/attachments', 'POST', attachmentToSave);
      }
      this.setList(DB_STORAGE_KEYS.ATTACHMENTS, updatedAttachments);
    }
  }

  public deleteOutgoingDoc(id: string, actor?: User) {
    const docs = this.getOutgoingDocs();
    const target = docs.find((d) => d.id === id);
    const updatedDocs = docs.filter((d) => d.id !== id);
    this.setList(DB_STORAGE_KEYS.OUTGOING_DOCS, updatedDocs);

    // Also remove related attachments
    const attachments = this.getAttachments();
    this.setList(
      DB_STORAGE_KEYS.ATTACHMENTS,
      attachments.filter((a) => a.relatedId !== id)
    );

    if (target) {
      this.logAction(
        'DELETE',
        'OUTGOING_DOC',
        id,
        target.documentNumber,
        `Xóa văn bản đi số ${target.documentNumber}`,
        actor
      );
    }
    this.apiCall(`/api/outgoing-docs/${id}`, 'DELETE');
    firestoreSync.deleteOutgoingDoc(id);
  }

  // --- Tasks (Công việc) ---
  public getTasks(): Task[] {
    const tasks = this.getList<Task>(DB_STORAGE_KEYS.TASKS, INITIAL_TASKS);
    const today = new Date().toISOString().split('T')[0];
    return tasks.map((t) => {
      if (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate < today) {
        return { ...t, status: 'OVERDUE' };
      }
      return t;
    });
  }

  public getTaskById(id?: string): Task | undefined {
    if (!id) return undefined;
    return this.getTasks().find((t) => t.id === id);
  }

  public saveTask(task: Task, actor?: User, skipAssigneeNotification = false) {
    const tasks = this.getTasks();
    const idx = tasks.findIndex((t) => t.id === task.id);
    let updated: Task[];
    const isLeaderOrAdminUser = actor ? (actor.role === 'ADMIN' || actor.role === 'LEADER') : false;

    // Workflow protection: If a non-leader tries to mark task as COMPLETED directly,
    // intercept and set status to WAITING_APPROVAL so leader must approve!
    let enforcedStatus = task.status;
    let enforcedProgress = task.progress;

    if (!isLeaderOrAdminUser && actor) {
      if (enforcedStatus === 'COMPLETED' || enforcedProgress >= 100) {
        enforcedStatus = 'WAITING_APPROVAL';
      } else if (enforcedProgress > 0 && enforcedStatus === 'NOT_STARTED') {
        enforcedStatus = 'IN_PROGRESS';
      }
    }

    const taskToPersist: Task = {
      ...task,
      status: enforcedStatus,
      progress: enforcedProgress,
    };

    if (idx >= 0) {
      updated = [...tasks];
      const prev = tasks[idx];
      updated[idx] = { ...taskToPersist, updatedAt: new Date().toISOString() };

      let actionDesc = `Cập nhật công việc: ${taskToPersist.title} (Tiến độ: ${taskToPersist.progress}%, Trạng thái: ${taskToPersist.status})`;
      if (prev.progress !== taskToPersist.progress) {
        actionDesc += ` | Tiến độ: ${prev.progress}% -> ${taskToPersist.progress}%`;
      }
      this.logAction('UPDATE', 'TASK', taskToPersist.id, taskToPersist.title, actionDesc, actor);

      // Notify if completed
      if (taskToPersist.status === 'COMPLETED' && prev.status !== 'COMPLETED') {
        const creatorId = taskToPersist.creatorId || taskToPersist.createdById;
        if (creatorId && creatorId !== actor?.id) {
          this.addNotification(
            {
              userId: creatorId,
              title: `🎉 Công việc đã hoàn thành: ${taskToPersist.code}`,
              message: `${actor?.fullName || this.getUserById(taskToPersist.assigneeId)?.fullName || 'Cán bộ'} đã hoàn thành công việc "${taskToPersist.title}".`,
              type: 'TASK_APPROVED',
              linkType: 'TASK',
              targetId: taskToPersist.id,
            },
            actor
          );
        }
      } else if (taskToPersist.status === 'WAITING_APPROVAL' && prev.status !== 'WAITING_APPROVAL') {
        const leaderId = taskToPersist.creatorId || taskToPersist.createdById;
        const targetLeaderId =
          leaderId && leaderId !== actor?.id
            ? leaderId
            : this.getUsers().find((u) => u.role === 'LEADER' && u.id !== actor?.id)?.id || 'usr-01';
        if (targetLeaderId && targetLeaderId !== actor?.id) {
          this.addNotification(
            {
              userId: targetLeaderId,
              title: `📋 Yêu cầu nghiệm thu nhiệm vụ: ${taskToPersist.code}`,
              message: `Cán bộ ${actor?.fullName || this.getUserById(taskToPersist.assigneeId)?.fullName || 'Chuyên viên'} đã nộp báo cáo hoàn thành và kính trình Lãnh đạo phê duyệt nghiệm thu: "${taskToPersist.title}".`,
              type: 'TASK_APPROVAL_REQUEST',
              linkType: 'TASK',
              targetId: taskToPersist.id,
            },
            actor
          );
        }
      }
      // Notify if reassigned or updated by leader
      if (prev.assigneeId !== taskToPersist.assigneeId && taskToPersist.assigneeId && taskToPersist.assigneeId !== actor?.id) {
        this.addNotification(
          {
            userId: taskToPersist.assigneeId,
            title: `⚡ Phân công nhiệm vụ: ${taskToPersist.code}`,
            message: `${actor ? `Lãnh đạo ${actor.fullName}` : 'Cơ quan'} đã giao bạn chủ trì nhiệm vụ: "${taskToPersist.title}". Hạn hoàn thành: ${taskToPersist.dueDate}.`,
            type: 'TASK_ASSIGNED',
            linkType: 'TASK',
            targetId: taskToPersist.id,
          },
          actor
        );
      } else if (
        prev.assigneeId === taskToPersist.assigneeId &&
        taskToPersist.assigneeId &&
        taskToPersist.assigneeId !== actor?.id &&
        actor &&
        (actor.role === 'LEADER' || actor.role === 'ADMIN') &&
        (prev.dueDate !== taskToPersist.dueDate || prev.title !== taskToPersist.title || prev.priority !== taskToPersist.priority || prev.description !== taskToPersist.description)
      ) {
        this.addNotification(
          {
            userId: taskToPersist.assigneeId,
            title: `📝 Lãnh đạo cập nhật nhiệm vụ: ${taskToPersist.code}`,
            message: `Lãnh đạo ${actor.fullName} đã cập nhật thông tin nhiệm vụ "${taskToPersist.title}". Hạn hoàn thành: ${taskToPersist.dueDate}, Tiến độ: ${taskToPersist.progress}%.`,
            type: 'TASK_ASSIGNED',
            linkType: 'TASK',
            targetId: taskToPersist.id,
          },
          actor
        );
      }
    } else {
      updated = [{ ...taskToPersist, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...tasks];
      this.logAction(
        'CREATE',
        'TASK',
        taskToPersist.id,
        taskToPersist.title,
        `Giao nhiệm vụ mới mã ${taskToPersist.code} cho ${this.getUserById(taskToPersist.assigneeId)?.fullName || 'Cán bộ'} - Hạn chót: ${taskToPersist.dueDate}`,
        actor
      );

      // Notify assignee ONLY (The creator/leader will never receive this notification)
      if (!skipAssigneeNotification && taskToPersist.assigneeId && taskToPersist.assigneeId !== actor?.id) {
        const creatorName = actor ? `Lãnh đạo ${actor.fullName}` : 'Cơ quan';
        this.addNotification(
          {
            userId: taskToPersist.assigneeId,
            title: `⚡ Bạn được giao công việc mới: ${taskToPersist.code}`,
            message: `${creatorName} đã giao bạn chủ trì nhiệm vụ: "${taskToPersist.title}". Hạn hoàn thành: ${taskToPersist.dueDate}.`,
            type: 'NEW_TASK',
            linkType: 'TASK',
            targetId: taskToPersist.id,
          },
          actor
        );
      }

      // Notify co-assignees if any
      if (!skipAssigneeNotification && Array.isArray(taskToPersist.coAssigneeIds)) {
        for (const coId of taskToPersist.coAssigneeIds) {
          if (coId && coId !== taskToPersist.assigneeId && coId !== actor?.id) {
            this.addNotification(
              {
                userId: coId,
                title: `👥 Phối hợp thực hiện nhiệm vụ: ${taskToPersist.code}`,
                message: `${actor ? `Lãnh đạo ${actor.fullName}` : 'Cơ quan'} phân công bạn phối hợp cùng ${this.getUserById(taskToPersist.assigneeId)?.fullName || 'chuyên viên'} thực hiện nhiệm vụ: "${taskToPersist.title}".`,
                type: 'NEW_TASK',
                linkType: 'TASK',
                targetId: taskToPersist.id,
              },
              actor
            );
          }
        }
      }
    }
    this.setList(DB_STORAGE_KEYS.TASKS, updated);
    this.apiCall('/api/tasks', 'POST', taskToPersist);
    firestoreSync.saveTask(taskToPersist);

    if (taskToPersist.attachments && taskToPersist.attachments.length > 0) {
      const existingAttachments = this.getAttachments();
      const updatedAttachments = [...existingAttachments];

      for (const att of taskToPersist.attachments) {
        const existingIdx = updatedAttachments.findIndex((a) => a.id === att.id);
        const attachmentToSave: AttachmentFile = {
          ...att,
          relatedId: taskToPersist.id,
          category: 'HO_SO',
          dossierId: taskToPersist.dossierId || att.dossierId,
        };

        if (existingIdx >= 0) {
          updatedAttachments[existingIdx] = attachmentToSave;
        } else {
          updatedAttachments.unshift(attachmentToSave);
        }
        this.apiCall('/api/attachments', 'POST', attachmentToSave);
      }
      this.setList(DB_STORAGE_KEYS.ATTACHMENTS, updatedAttachments);
    }
  }

  /**
   * Chuyên viên nộp báo cáo hoàn thành kèm tài liệu kết quả/minh chứng và trình Lãnh đạo phê duyệt nghiệm thu
   */
  public submitTaskForApproval(
    taskId: string,
    staff: User,
    submissionNote?: string,
    resultAttachments?: AttachmentFile[]
  ): Task | undefined {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return undefined;

    const note = submissionNote?.trim() || 'Báo cáo Lãnh đạo: Tôi đã hoàn thành toàn bộ các hạng mục công việc theo yêu cầu và kính trình Thủ trưởng xem xét, phê duyệt nghiệm thu.';
    const now = new Date().toISOString();

    // Merge attachments if provided
    let finalAttachments = [...(task.attachments || [])];
    if (resultAttachments && resultAttachments.length > 0) {
      for (const resAtt of resultAttachments) {
        if (!finalAttachments.some((a) => a.id === resAtt.id || (a.fileName === resAtt.fileName && a.fileSize === resAtt.fileSize))) {
          finalAttachments.push({
            ...resAtt,
            relatedId: task.id,
            dossierId: task.dossierId || resAtt.dossierId,
            uploadedById: staff.id,
            uploadedByName: staff.fullName,
            uploadedAt: resAtt.uploadedAt || now,
            category: 'CONG_VIEC',
          });
        }
      }
    }

    const fileCount = finalAttachments.length;
    const commentObj: TaskComment = {
      id: `cm-sub-${Date.now()}`,
      userId: staff.id,
      userName: staff.fullName,
      userAvatar: staff.avatar || '',
      content: `📋 [TRÌNH BÁO CÁO NGHIỆM THU]: ${note}${fileCount > 0 ? ` (Kèm ${fileCount} tệp tài liệu kết quả/báo cáo)` : ''}`,
      createdAt: now,
      attachments: resultAttachments && resultAttachments.length > 0 ? resultAttachments : undefined,
    };

    const updatedTask: Task = {
      ...task,
      status: 'WAITING_APPROVAL',
      progress: 100,
      submissionNote: note,
      submittedAt: now,
      attachments: finalAttachments,
      comments: [...(task.comments || []), commentObj],
      updatedAt: now,
    };

    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      tasks[idx] = updatedTask;
      this.setList(DB_STORAGE_KEYS.TASKS, tasks);
    }

    // Persist new attachments to global attachments table & dossier
    if (resultAttachments && resultAttachments.length > 0) {
      const existingAtts = this.getAttachments();
      const updatedAtts = [...existingAtts];
      for (const att of resultAttachments) {
        const attToSave: AttachmentFile = {
          ...att,
          relatedId: task.id,
          category: 'HO_SO',
          dossierId: task.dossierId || att.dossierId,
          uploadedById: staff.id,
          uploadedByName: staff.fullName,
          uploadedAt: att.uploadedAt || now,
        };
        const eIdx = updatedAtts.findIndex((a) => a.id === att.id);
        if (eIdx >= 0) {
          updatedAtts[eIdx] = attToSave;
        } else {
          updatedAtts.unshift(attToSave);
        }
        this.apiCall('/api/attachments', 'POST', attToSave);
      }
      this.setList(DB_STORAGE_KEYS.ATTACHMENTS, updatedAtts);
    }

    this.logAction(
      'STATUS_CHANGE',
      'TASK',
      task.id,
      task.title,
      `Cán bộ ${staff.fullName} nộp báo cáo hoàn thành (kèm ${fileCount} tài liệu kết quả) và trình Lãnh đạo nghiệm thu nhiệm vụ ${task.code}`,
      staff
    );

    this.apiCall('/api/tasks', 'POST', updatedTask);
    this.apiCall(`/api/tasks/${taskId}/submit-approval`, 'POST', { submissionNote: note, staff, attachments: finalAttachments });
    firestoreSync.saveTask(updatedTask);

    // Notify Leader / Creator (Leader receives request for approval; Staff does not receive this notification)
    const leaderId = task.creatorId || task.createdById;
    const leaders = this.getUsers().filter((u) => (u.role === 'LEADER' || u.role === 'ADMIN') && u.id !== staff.id);
    const targetLeaders = leaderId && leaderId !== staff.id
      ? leaders.filter((l) => l.id === leaderId)
      : leaders;
    const finalLeaders = targetLeaders.length > 0 ? targetLeaders : leaders;
    for (const l of finalLeaders) {
      this.addNotification(
        {
          userId: l.id,
          title: `📋 Yêu cầu nghiệm thu nhiệm vụ: [${task.code}]`,
          message: `Đồng chí ${staff.fullName} đã báo cáo hoàn thành công việc "${task.title}" (kèm ${fileCount} tệp tài liệu kết quả) và kính trình Lãnh đạo thẩm định, phê duyệt nghiệm thu.`,
          type: 'TASK_APPROVAL_REQUEST',
          linkType: 'TASK',
          targetId: task.id,
          subTarget: 'APPROVAL',
        },
        staff
      );
    }

    return updatedTask;
  }

  /**
   * LÃNH ĐẠO phê duyệt & nghiệm thu công việc hoàn thành
   */
  public approveTaskCompletion(taskId: string, leader: User, feedback?: string): Task | undefined {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return undefined;

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const praise = feedback?.trim() || 'Lãnh đạo đã xem xét kết quả, nhất trí nghiệm thu và đồng ý đóng nhiệm vụ.';

    const commentObj: TaskComment = {
      id: `cm-appr-${Date.now()}`,
      userId: leader.id,
      userName: leader.fullName,
      userAvatar: leader.avatar || '',
      content: `✅ [LÃNH ĐẠO PHÊ DUYỆT NGHIỆM THU]: ${praise}`,
      createdAt: now,
    };

    const updatedTask: Task = {
      ...task,
      status: 'COMPLETED',
      progress: 100,
      completedDate: today,
      approvedById: leader.id,
      approvedAt: now,
      leaderFeedback: praise,
      comments: [...(task.comments || []), commentObj],
      updatedAt: now,
    };

    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      tasks[idx] = updatedTask;
      this.setList(DB_STORAGE_KEYS.TASKS, tasks);
    }

    this.logAction(
      'STATUS_CHANGE',
      'TASK',
      task.id,
      task.title,
      `Lãnh đạo ${leader.fullName} đã nghiệm thu và phê duyệt hoàn thành nhiệm vụ ${task.code}`,
      leader
    );

    this.apiCall('/api/tasks', 'POST', updatedTask);
    this.apiCall(`/api/tasks/${taskId}/approve`, 'POST', { leader, feedback: praise });
    firestoreSync.saveTask(updatedTask);

    // Notify Assignee & Co-assignees & Drafter (Leader who approved will NOT receive this notification)
    const participantIds = [task.assigneeId, task.createdById, ...(task.coAssigneeIds || [])].filter((id): id is string => Boolean(id && id !== leader.id));
    const uniqueParticipants = Array.from(new Set(participantIds));
    for (const pId of uniqueParticipants) {
      this.addNotification(
        {
          userId: pId,
          title: `🎉 Nhiệm vụ đã được Lãnh đạo phê duyệt nghiệm thu: [${task.code}]`,
          message: `Lãnh đạo ${leader.fullName} đã chấp thuận và phê duyệt nghiệm thu nhiệm vụ "${task.title}". Nhận xét: "${praise}"`,
          type: 'TASK_APPROVED',
          linkType: 'TASK',
          targetId: task.id,
        },
        leader
      );
    }

    // Auto-complete linked Incoming Document if all its tasks are now completed!
    if (task.incomingDocId) {
      const allTasks = this.getTasks();
      const otherLinkedTasks = allTasks.filter(
        (t) => t.id !== task.id && (t.incomingDocId === task.incomingDocId || t.linkedDocId === task.incomingDocId)
      );
      const allDone = otherLinkedTasks.every((t) => t.status === 'COMPLETED');
      if (allDone) {
        const inDoc = this.getIncomingDocById(task.incomingDocId);
        if (inDoc && inDoc.status !== 'COMPLETED') {
          this.saveIncomingDoc(
            {
              ...inDoc,
              status: 'COMPLETED',
              resultSummary: inDoc.resultSummary || `Đã hoàn thành toàn diện theo nhiệm vụ chỉ đạo [${task.code}]. Lãnh đạo đã nghiệm thu.`,
            },
            leader
          );
        }
      }
    }

    // Auto update dossier if linked
    if (task.dossierId) {
      const dossier = this.getDossiers().find((d) => d.id === task.dossierId || d.code === task.dossierId);
      if (dossier && dossier.status === 'OPEN') {
        this.saveDossier({ ...dossier, status: 'IN_PROGRESS' }, leader);
      }
    }

    return updatedTask;
  }

  /**
   * LÃNH ĐẠO trả lại yêu cầu chỉnh sửa / bổ sung
   */
  public rejectTaskCompletion(taskId: string, leader: User, feedback: string): Task | undefined {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return undefined;

    const now = new Date().toISOString();
    const commentObj: TaskComment = {
      id: `cm-rej-${Date.now()}`,
      userId: leader.id,
      userName: leader.fullName,
      userAvatar: leader.avatar || '',
      content: `⚠️ [LÃNH ĐẠO YÊU CẦU LÀM LẠI / BỔ SUNG]: ${feedback}`,
      createdAt: now,
    };

    const updatedTask: Task = {
      ...task,
      status: 'IN_PROGRESS',
      progress: Math.min(task.progress, 80), // Set back to 80% to indicate revision needed
      leaderFeedback: feedback,
      comments: [...(task.comments || []), commentObj],
      updatedAt: now,
    };

    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      tasks[idx] = updatedTask;
      this.setList(DB_STORAGE_KEYS.TASKS, tasks);
    }

    this.logAction(
      'STATUS_CHANGE',
      'TASK',
      task.id,
      task.title,
      `Lãnh đạo ${leader.fullName} yêu cầu chỉnh sửa / làm lại nhiệm vụ ${task.code}: "${feedback}"`,
      leader
    );

    this.apiCall('/api/tasks', 'POST', updatedTask);
    this.apiCall(`/api/tasks/${taskId}/reject`, 'POST', { leader, feedback });
    firestoreSync.saveTask(updatedTask);

    // Notify Assignee (Leader who rejected will NOT receive this notification)
    if (task.assigneeId && task.assigneeId !== leader.id) {
      this.addNotification(
        {
          userId: task.assigneeId,
          title: `⚠️ Yêu cầu bổ sung / hoàn thiện lại: [${task.code}]`,
          message: `Lãnh đạo ${leader.fullName} chưa chấp thuận nghiệm thu công việc "${task.title}". Lý do: "${feedback}". Vui lòng xử lý lại.`,
          type: 'TASK_REJECTED',
          linkType: 'TASK',
          targetId: task.id,
        },
        leader
      );
    }

    return updatedTask;
  }

  /**
   * Chuyên viên trình ký dự thảo Văn bản đi lên Lãnh đạo
   */
  public submitOutgoingDocForSign(docId: string, actor: User): OutgoingDocument | undefined {
    const docs = this.getOutgoingDocs();
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return undefined;

    const updatedDoc: OutgoingDocument = {
      ...doc,
      status: 'REVIEWING',
      updatedAt: new Date().toISOString(),
    };

    this.saveOutgoingDoc(updatedDoc, actor);

    // Notify Signer (Leader) - Leader receives notification; Drafter/Actor does NOT receive it
    const targetLeaderId =
      doc.signerId && doc.signerId !== actor.id
        ? doc.signerId
        : this.getUsers().find((u) => u.role === 'LEADER' && u.id !== actor.id)?.id || 'usr-01';
    if (targetLeaderId && targetLeaderId !== actor.id) {
      this.addNotification(
        {
          userId: targetLeaderId,
          title: `🖊️ Trình ký dự thảo văn bản đi: ${doc.documentNumber}`,
          message: `Chuyên viên ${actor.fullName} kính trình Lãnh đạo xem xét, phê duyệt & ký số văn bản "${doc.summary}".`,
          type: 'DOC_SIGN_REQUEST',
          linkType: 'OUTGOING_DOC',
          targetId: doc.id,
        },
        actor
      );
    }

    return updatedDoc;
  }

  /**
   * Sinh số thứ tự tiếp theo cho Sổ văn bản đi theo Nghị định 30/2020/NĐ-CP
   */
  public generateNextOutgoingDocNumber(docType: string = 'Công văn'): string {
    const currentYear = new Date().getFullYear();
    const docs = this.getOutgoingDocs();
    const typeMap: Record<string, string> = {
      'Công văn': 'CV-VP',
      'Tờ trình': 'TTr-VP',
      'Báo cáo': 'BC-VP',
      'Quyết định': 'QĐ-UBND',
      'Thông báo': 'TB-VP',
      'Kế hoạch': 'KH-UBND',
      'Giấy mời': 'GM-VP',
      'Chỉ thị': 'CT-UBND',
    };
    const suffix = typeMap[docType] || 'CV-VP';

    // Đếm các văn bản đã phát hành chính thức trong năm hiện tại
    const issuedDocs = docs.filter((d) => d.status === 'ISSUED' || d.status === 'SENT');
    let maxSeq = 0;
    for (const d of issuedDocs) {
      const match = d.documentNumber.match(/^(\d+)\//);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxSeq) maxSeq = n;
      }
    }
    const nextSeq = maxSeq > 0 ? maxSeq + 1 : issuedDocs.length + 1;
    return `${nextSeq}/${suffix}`;
  }

  /**
   * Sinh mã dự thảo cho văn bản đi khi đang soạn thảo
   */
  public generateDraftOutgoingDocNumber(): string {
    const currentYear = new Date().getFullYear();
    const docs = this.getOutgoingDocs();
    const drafts = docs.filter((d) => d.status === 'DRAFT' || d.status === 'REVIEWING' || d.status === 'SIGNED');
    const seq = drafts.length + 1;
    return `DT-${currentYear}/${String(seq).padStart(2, '0')}`;
  }

  /**
   * LÃNH ĐẠO phê duyệt & Ký số văn bản đi (theo NĐ 30/2020/NĐ-CP)
   * Lưu ý: Lãnh đạo chỉ KÝ DUYỆT, sau đó văn bản chuyển sang Văn thư chờ cấp số và phát hành.
   */
  public signOutgoingDoc(docId: string, leader: User, signerNote?: string): OutgoingDocument | undefined {
    const docs = this.getOutgoingDocs();
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return undefined;

    // Kiểm tra thẩm quyền ký
    const canSign = leader.role === 'ADMIN' || leader.role === 'LEADER' || doc.signerId === leader.id;
    if (!canSign) {
      console.warn('Người dùng không có thẩm quyền ký duyệt văn bản này.');
      return undefined;
    }

    const now = new Date().toISOString();
    const updatedDoc: OutgoingDocument = {
      ...doc,
      status: 'SIGNED',
      signedAt: now,
      signerNote: signerNote || 'Đã kiểm tra thể thức và nội dung, phê duyệt ký số điện tử ban hành.',
      updatedAt: now,
    };

    this.saveOutgoingDoc(updatedDoc, leader);

    // Notify Clerk (Văn thư) to assign official number and dispatch (Leader will not receive this notification)
    const users = this.getUsers();
    const clerks = users.filter((u) => u.role === 'CLERK' && u.id !== leader.id);
    clerks.forEach((clerk) => {
      this.addNotification(
        {
          userId: clerk.id,
          title: `✍️ Lãnh đạo đã ký duyệt văn bản đi: ${doc.documentNumber}`,
          message: `Lãnh đạo ${leader.fullName} đã ký số văn bản "${doc.summary}". Đề nghị Văn thư kiểm tra thể thức, cấp số văn bản đi, đóng dấu và phát hành.`,
          type: 'DOC_SIGNED',
          linkType: 'OUTGOING_DOC',
          targetId: doc.id,
        },
        leader
      );
    });

    // Also notify drafter (chuyên viên đề xuất lên) so they know leader signed
    const drafterId = doc.drafterId || doc.createdById;
    if (drafterId && drafterId !== leader.id) {
      this.addNotification(
        {
          userId: drafterId,
          title: `🎉 Dự thảo văn bản đi đã được Lãnh đạo ký duyệt: ${doc.documentNumber}`,
          message: `Lãnh đạo ${leader.fullName} đã ký số phê duyệt văn bản "${doc.summary}". Văn bản đã chuyển sang Văn thư để cấp số phát hành.`,
          type: 'DOC_SIGNED',
          linkType: 'OUTGOING_DOC',
          targetId: doc.id,
        },
        leader
      );
    }

    return updatedDoc;
  }

  /**
   * VĂN THƯ kiểm tra thể thức, cấp số, đóng dấu và phát hành văn bản đi (theo NĐ 30/2020/NĐ-CP)
   * DUY NHẤT VĂN THƯ HOẶC QUẢN TRỊ VIÊN MỚI ĐƯỢC THỰC HIỆN BƯỚC NÀY.
   */
  public issueOutgoingDoc(docId: string, clerk: User, officialNumber?: string): OutgoingDocument | undefined {
    // Ràng buộc quy định văn thư: Lãnh đạo và nhân viên thông thường KHÔNG ĐƯỢC tự ý cấp số phát hành
    if (clerk.role !== 'CLERK' && clerk.role !== 'ADMIN') {
      console.warn('Vi phạm quy chế văn thư NĐ 30/2020/NĐ-CP: Chỉ Văn thư cơ quan hoặc Quản trị viên mới có thẩm quyền cấp số và phát hành văn bản đi.');
      return undefined;
    }

    const docs = this.getOutgoingDocs();
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return undefined;

    const now = new Date().toISOString();
    const assignedNumber = officialNumber?.trim() || (doc.documentNumber.startsWith('DT-') ? this.generateNextOutgoingDocNumber(doc.docType) : doc.documentNumber);

    const updatedDoc: OutgoingDocument = {
      ...doc,
      documentNumber: assignedNumber,
      status: 'ISSUED',
      issuedAt: now,
      clerkId: clerk.id,
      updatedAt: now,
    };

    this.saveOutgoingDoc(updatedDoc, clerk);

    // Notify Drafter & Signer (Clerk will not receive this notification)
    const recipients = [doc.drafterId, doc.signerId].filter((id) => id && id !== clerk.id);
    recipients.forEach((uid) => {
      this.addNotification(
        {
          userId: uid,
          title: `📬 Văn bản đi đã phát hành chính thức: ${updatedDoc.documentNumber}`,
          message: `Văn thư ${clerk.fullName} đã cấp số chính thức ${updatedDoc.documentNumber}, đóng dấu và chuyển phát hành văn bản "${doc.summary}" đến ${doc.recipient}.`,
          type: 'DOC_ISSUED',
          linkType: 'OUTGOING_DOC',
          targetId: doc.id,
        },
        clerk
      );
    });

    // If replyToDocId: check if replying to an incoming document
    if (doc.replyToDocId) {
      const inDoc = this.getIncomingDocById(doc.replyToDocId);
      if (inDoc && inDoc.status !== 'COMPLETED') {
        this.saveIncomingDoc(
          {
            ...inDoc,
            status: 'COMPLETED',
            resultSummary: inDoc.resultSummary || `Đã phát hành văn bản trả lời số ${updatedDoc.documentNumber} gửi ${doc.recipient}.`,
          },
          clerk
        );
      }
    }

    return updatedDoc;
  }

  public deleteTask(id: string, actor?: User) {
    const tasks = this.getTasks();
    const target = tasks.find((t) => t.id === id);
    if (target) {
      this.setList(DB_STORAGE_KEYS.TASKS, tasks.filter((t) => t.id !== id));
      this.logAction('DELETE', 'TASK', id, target.title, `Hủy / Xóa công việc: ${target.title}`, actor);
      this.apiCall(`/api/tasks/${id}`, 'DELETE');
      firestoreSync.deleteTask(id);
    }
  }

  public addTaskComment(taskId: string, comment: TaskComment, actor?: User): Task | undefined {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return undefined;

    const existingComments = task.comments || [];
    // Ensure no duplicate by id
    const isDuplicate = existingComments.some((c) => c.id === comment.id);
    const updatedComments = isDuplicate ? existingComments : [...existingComments, comment];

    const updatedTask: Task = {
      ...task,
      comments: updatedComments,
      updatedAt: new Date().toISOString(),
    };

    const taskIdx = tasks.findIndex((t) => t.id === taskId);
    if (taskIdx >= 0) {
      tasks[taskIdx] = updatedTask;
      this.setList(DB_STORAGE_KEYS.TASKS, tasks);
    }

    this.logAction('COMMENT', 'TASK', taskId, task.title, `${comment.userName} đã gửi ý kiến trao đổi trong công việc ${task.code}: "${comment.content.slice(0, 50)}..."`, actor);

    this.apiCall(`/api/tasks/${taskId}/comments`, 'POST', comment);

    // Notify all participants except the sender
    const senderId = comment.userId;
    const allParticipants = [task.assigneeId, task.creatorId, task.createdById, ...(task.coAssigneeIds || [])]
      .filter((uid): uid is string => Boolean(uid && uid !== senderId));
    const uniqueRecipients = Array.from(new Set(allParticipants));

    for (const recipientId of uniqueRecipients) {
      this.addNotification({
        userId: recipientId,
        title: `💬 Ý kiến trao đổi mới [${task.code}]`,
        message: `${comment.userName}: "${comment.content.slice(0, 90)}${comment.content.length > 90 ? '...' : ''}"`,
        type: 'STATUS_UPDATED',
        linkType: 'TASK',
        targetId: task.id,
      });
    }

    return updatedTask;
  }

  // --- Attachments & Document Vault ---
  public getAttachments(): AttachmentFile[] {
    return this.getList<AttachmentFile>(DB_STORAGE_KEYS.ATTACHMENTS, INITIAL_ATTACHMENTS);
  }

  public saveAttachment(file: AttachmentFile, actor?: User) {
    const list = this.getAttachments();
    this.setList(DB_STORAGE_KEYS.ATTACHMENTS, [file, ...list]);
    this.logAction('UPLOAD_FILE', 'FILE', file.id, file.fileName, `Tải lên tài liệu: ${file.fileName}`, actor);
    this.apiCall('/api/attachments', 'POST', file);
    firestoreSync.saveAttachment(file);
  }

  public addAttachment(file: AttachmentFile, actor?: User) {
    this.saveAttachment(file, actor);
  }

  public deleteAttachment(id: string, actor?: User) {
    const list = this.getAttachments();
    const target = list.find((f) => f.id === id);
    if (target) {
      this.setList(DB_STORAGE_KEYS.ATTACHMENTS, list.filter((f) => f.id !== id));
      this.logAction('DELETE', 'FILE', id, target.fileName, `Xóa tài liệu: ${target.fileName}`, actor);
      this.apiCall(`/api/attachments/${id}`, 'DELETE');
      firestoreSync.deleteAttachment(id);
    }
  }

  // --- Master Data ---
  public getMasterData(): MasterData {
    if (typeof window === 'undefined') return INITIAL_MASTER_DATA;
    const raw = this.safeGetItem(DB_STORAGE_KEYS.MASTER_DATA);
    if (!raw) return INITIAL_MASTER_DATA;
    try {
      const parsed = JSON.parse(raw);
      const toStringArray = (list: any, fallback: any[] = []): string[] => {
        const source = Array.isArray(list) ? list : fallback;
        if (!Array.isArray(source)) return [];
        return source.map((item: any) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item.name || item.title || item.code || String(item.id || '');
          return String(item ?? '');
        }).filter(Boolean);
      };

      const docTypes = toStringArray(parsed.docTypes, INITIAL_MASTER_DATA.docTypes);
      const authorities = toStringArray(parsed.authorities, INITIAL_MASTER_DATA.authorities);
      const departments = toStringArray(parsed.departments, INITIAL_MASTER_DATA.departments);
      const positions = toStringArray(parsed.positions, INITIAL_MASTER_DATA.positions);

      const documentTypes = Array.isArray(parsed.documentTypes) && parsed.documentTypes.length > 0
        ? parsed.documentTypes.map((dt: any, idx: number) => {
            if (typeof dt === 'string') return { id: `dt-${idx}`, name: dt, code: dt.substring(0, 3).toUpperCase() };
            return {
              id: dt.id || `dt-${idx}`,
              name: dt.name || dt.title || `Loại ${idx + 1}`,
              code: dt.code || (dt.name ? dt.name.substring(0, 3).toUpperCase() : `CV${idx}`),
            };
          })
        : (INITIAL_MASTER_DATA.documentTypes || docTypes.map((dt, idx) => ({ id: `dt-${idx}`, name: dt, code: dt.substring(0, 3).toUpperCase() })));

      return {
        ...INITIAL_MASTER_DATA,
        ...parsed,
        docTypes,
        authorities,
        departments,
        positions,
        documentTypes,
      };
    } catch {
      return INITIAL_MASTER_DATA;
    }
  }

  public saveMasterData(data: MasterData, actor?: User) {
    if (typeof window === 'undefined') return;
    this.safeSetItem(DB_STORAGE_KEYS.MASTER_DATA, JSON.stringify(data));
    this.notify();
    this.logAction('UPDATE', 'CATEGORY', 'master-data', 'Danh mục dùng chung', 'Cập nhật danh mục hệ thống', actor);
    firestoreSync.saveMasterData(data);
  }

  public updateMasterData(data: MasterData, actor?: User) {
    this.saveMasterData(data, actor);
  }

  // --- Additional Helper Methods & Aliases ---
  public addUser(user: Omit<User, 'id'>, actor?: User) {
    const newUser: User = {
      ...user,
      id: 'usr-' + Date.now(),
    };
    this.saveUser(newUser, actor);
    return newUser;
  }

  public updateUser(user: User, actor?: User) {
    this.saveUser(user, actor);
  }

  public addIncomingDoc(doc: Omit<IncomingDocument, 'id'>, actor?: User) {
    const newDoc: IncomingDocument = {
      ...doc,
      id: 'vbd-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: doc.attachments || [],
    };
    this.saveIncomingDoc(newDoc, actor);
    return newDoc;
  }

  public addOutgoingDoc(doc: Omit<OutgoingDocument, 'id'>, actor?: User) {
    const newDoc: OutgoingDocument = {
      ...doc,
      id: 'vbdi-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: doc.attachments || [],
    };
    this.saveOutgoingDoc(newDoc, actor);
    return newDoc;
  }

  public addTask(task: Omit<Task, 'id'>, actor?: User) {
    const newTask: Task = {
      ...task,
      id: 'task-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: task.attachments || [],
    };
    this.saveTask(newTask, actor);
    return newTask;
  }

  public updateTaskProgress(taskId: string, progress: number, status?: TaskStatus, note?: string, actor?: User) {
    const task = this.getTaskById(taskId);
    if (!task) return;
    const computedStatus = status || (progress >= 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');
    this.saveTask(
      {
        ...task,
        progress,
        status: computedStatus,
        resultNotes: note || task.resultNotes,
        completedDate: progress >= 100 ? new Date().toISOString().split('T')[0] : undefined,
      },
      actor
    );
  }

  public toggleSubtask(taskId: string, subtaskId: string, actor?: User) {
    const task = this.getTaskById(taskId);
    if (!task) return;
    const subTasks = (task.subTasks || []).map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const completedCount = subTasks.filter((s) => s.completed).length;
    const progress = subTasks.length > 0 ? Math.round((completedCount / subTasks.length) * 100) : task.progress;
    this.saveTask(
      {
        ...task,
        subTasks,
        progress,
        status: progress >= 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : task.status,
      },
      actor
    );
  }

  public addSubtask(taskId: string, title: string, actor?: User) {
    const task = this.getTaskById(taskId);
    if (!task) return;
    const newSub: TaskSubItem = {
      id: 'sub-' + Date.now(),
      title,
      completed: false,
    };
    this.saveTask(
      {
        ...task,
        subTasks: [...(task.subTasks || []), newSub],
      },
      actor
    );
  }

  public addComment(taskId: string, content: string, actor?: User) {
    const task = this.getTaskById(taskId);
    if (!task) return;
    const currentUser = actor || this.getCurrentUser();
    const comment: TaskComment = {
      id: 'cmt-' + Date.now(),
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.fullName || 'Người dùng',
      userAvatar: currentUser?.avatar || '',
      content,
      createdAt: new Date().toISOString(),
    };
    this.saveTask(
      {
        ...task,
        comments: [...(task.comments || []), comment],
      },
      actor
    );
  }

  public addDossier(dossier: Omit<Dossier, 'id'>, actor?: User) {
    const newDossier: Dossier = {
      ...dossier,
      id: 'dos-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveDossier(newDossier, actor);
    return newDossier;
  }

  public updateDossierStatus(id: string, status: DossierStatus, actor?: User) {
    const dossier = this.getDossierById(id);
    if (!dossier) return;
    this.saveDossier({ ...dossier, status }, actor);
  }

  public createNotification(notification: Omit<SystemNotification, 'id' | 'createdAt' | 'isRead'>) {
    this.addNotification(notification);
  }

  public exportAllData(): any {
    return {
      users: this.getUsers(),
      dossiers: this.getDossiers(),
      incomingDocs: this.getIncomingDocs(),
      outgoingDocs: this.getOutgoingDocs(),
      tasks: this.getTasks(),
      attachments: this.getAttachments(),
      auditLogs: this.getAuditLogs(),
      notifications: this.getNotifications(),
      masterData: this.getMasterData(),
    };
  }

  public importData(data: any): boolean {
    return this.importDatabaseJSON(typeof data === 'string' ? data : JSON.stringify(data));
  }

  public resetToMockData() {
    this.resetToDefaults();
  }

  public getDashboardStats() {
    const incoming = this.getIncomingDocs();
    const outgoing = this.getOutgoingDocs();
    const tasks = this.getTasks();
    const dossiers = this.getDossiers();
    const users = this.getUsers();
    const attachments = this.getAttachments();

    const overdueTasks = tasks.filter((t) => t.status === 'OVERDUE').length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'WAITING_APPROVAL').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
      taskCount: totalTasks,
      personnelCount: users.length,
      documentCount: attachments.length,
      overdueTaskCount: overdueTasks,
      inProgressTaskCount: inProgressTasks,
      completedTaskCount: completedTasks,
      completionRate,
      dossierCount: dossiers.length,
    };
  }

  public exportDatabaseSQL(): string {
    const esc = (val: any) => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val.toString();
      if (typeof val === 'boolean') return val ? '1' : '0';
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/[\\]/g, '\\\\').replace(/[']/g, "\\'")}'`;
      return `'${String(val).replace(/[\\]/g, '\\\\').replace(/[']/g, "\\'")}'`;
    };

    let sql = `-- =======================================================================
-- FILE: vanphong_so_export_${new Date().toISOString().split('T')[0]}.sql
-- DATABASE DUMP: QUẢN LÝ VĂN BẢN VÀ ĐIỀU HÀNH CÔNG VIỆC
-- Hỗ trợ import thẳng vào MySQL / phpMyAdmin (XAMPP)
-- =======================================================================

CREATE DATABASE IF NOT EXISTS \`vanphong_so\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`vanphong_so\`;

-- 1. DEPARTMENTS
DROP TABLE IF EXISTS \`departments\`;
CREATE TABLE \`departments\` (
  \`id\` varchar(50) NOT NULL,
  \`code\` varchar(50) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`description\` text,
  \`manager_id\` varchar(50) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. POSITIONS
DROP TABLE IF EXISTS \`positions\`;
CREATE TABLE \`positions\` (
  \`id\` varchar(50) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`level\` int(11) DEFAULT 5,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. USERS
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` varchar(50) NOT NULL,
  \`username\` varchar(100) NOT NULL,
  \`password\` varchar(255) NOT NULL DEFAULT '123',
  \`full_name\` varchar(255) NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`phone\` varchar(50) DEFAULT NULL,
  \`avatar\` text,
  \`department\` varchar(255) DEFAULT NULL,
  \`department_id\` varchar(50) DEFAULT NULL,
  \`position\` varchar(255) DEFAULT NULL,
  \`position_id\` varchar(50) DEFAULT NULL,
  \`role\` enum('LEADER','CLERK','STAFF','ADMIN') NOT NULL DEFAULT 'STAFF',
  \`status\` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  \`join_date\` date DEFAULT NULL,
  \`bio\` text,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`username_unique\` (\`username\`),
  UNIQUE KEY \`email_unique\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. DOSSIERS
DROP TABLE IF EXISTS \`dossiers\`;
CREATE TABLE \`dossiers\` (
  \`id\` varchar(50) NOT NULL,
  \`code\` varchar(100) NOT NULL,
  \`title\` varchar(500) NOT NULL,
  \`department\` varchar(255) DEFAULT NULL,
  \`department_id\` varchar(50) DEFAULT NULL,
  \`leader_id\` varchar(50) DEFAULT NULL,
  \`manager_id\` varchar(50) DEFAULT NULL,
  \`status\` enum('OPEN','IN_PROGRESS','CLOSED','ARCHIVED') NOT NULL DEFAULT 'IN_PROGRESS',
  \`start_date\` date DEFAULT NULL,
  \`end_date\` date DEFAULT NULL,
  \`description\` text,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`dossier_code_unique\` (\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. INCOMING_DOCUMENTS
DROP TABLE IF EXISTS \`incoming_documents\`;
CREATE TABLE \`incoming_documents\` (
  \`id\` varchar(50) NOT NULL,
  \`document_number\` varchar(100) NOT NULL,
  \`official_number\` varchar(100) DEFAULT NULL,
  \`received_date\` date NOT NULL,
  \`issue_date\` date NOT NULL,
  \`issuing_authority\` varchar(255) NOT NULL,
  \`summary\` text NOT NULL,
  \`doc_type\` varchar(100) DEFAULT 'Công văn',
  \`urgency\` enum('THUONG','KHAN','THUONG_KHAN','HOA_TOC') NOT NULL DEFAULT 'THUONG',
  \`security_level\` enum('THUONG','MAT','TOI_MAT','TUYET_MAT') NOT NULL DEFAULT 'THUONG',
  \`assignee_id\` varchar(50) DEFAULT NULL,
  \`co_assignee_ids\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  \`due_date\` date DEFAULT NULL,
  \`status\` enum('PENDING_ASSIGN','PROCESSING','PROCESSED','OVERDUE','REJECTED') NOT NULL DEFAULT 'PROCESSING',
  \`result_summary\` text,
  \`dossier_id\` varchar(50) DEFAULT NULL,
  \`linked_task_ids\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  \`created_by_id\` varchar(50) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. OUTGOING_DOCUMENTS
DROP TABLE IF EXISTS \`outgoing_documents\`;
CREATE TABLE \`outgoing_documents\` (
  \`id\` varchar(50) NOT NULL,
  \`document_number\` varchar(100) NOT NULL,
  \`release_date\` date NOT NULL,
  \`doc_type\` varchar(100) DEFAULT 'Công văn',
  \`recipient\` varchar(255) NOT NULL,
  \`summary\` text NOT NULL,
  \`drafter_id\` varchar(50) NOT NULL,
  \`signer_id\` varchar(50) NOT NULL,
  \`status\` enum('DRAFT','PENDING_APPROVAL','APPROVED','SIGNED','ISSUED','SENT','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  \`dossier_id\` varchar(50) DEFAULT NULL,
  \`reply_to_doc_id\` varchar(50) DEFAULT NULL,
  \`created_by_id\` varchar(50) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TASKS
DROP TABLE IF EXISTS \`tasks\`;
CREATE TABLE \`tasks\` (
  \`id\` varchar(50) NOT NULL,
  \`code\` varchar(100) NOT NULL,
  \`title\` varchar(500) NOT NULL,
  \`description\` text,
  \`dossier_id\` varchar(50) DEFAULT NULL,
  \`incoming_doc_id\` varchar(50) DEFAULT NULL,
  \`linked_doc_id\` varchar(50) DEFAULT NULL,
  \`doc_type_relation\` enum('INCOMING','OUTGOING') DEFAULT NULL,
  \`creator_id\` varchar(50) DEFAULT NULL,
  \`created_by_id\` varchar(50) DEFAULT NULL,
  \`assignee_id\` varchar(50) NOT NULL,
  \`co_assignee_ids\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  \`priority\` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  \`start_date\` date NOT NULL,
  \`due_date\` date NOT NULL,
  \`progress\` int(11) NOT NULL DEFAULT 0,
  \`status\` enum('TODO','IN_PROGRESS','WAITING_APPROVAL','COMPLETED','OVERDUE','CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
  \`completed_date\` date DEFAULT NULL,
  \`result_notes\` text,
  \`sub_tasks\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  \`comments\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  \`remind_days_before\` int(11) DEFAULT 1,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. ATTACHMENTS
DROP TABLE IF EXISTS \`attachments\`;
CREATE TABLE \`attachments\` (
  \`id\` varchar(50) NOT NULL,
  \`file_name\` varchar(255) NOT NULL,
  \`file_size\` bigint(20) NOT NULL,
  \`file_type\` varchar(50) NOT NULL,
  \`file_url\` text NOT NULL,
  \`category\` enum('VAN_BAN_DEN','VAN_BAN_DI','CONG_VIEC','HO_SO','KHAC') NOT NULL,
  \`related_id\` varchar(50) DEFAULT NULL,
  \`dossier_code\` varchar(100) DEFAULT NULL,
  \`dossier_id\` varchar(50) DEFAULT NULL,
  \`uploaded_by_id\` varchar(50) NOT NULL,
  \`uploaded_by_name\` varchar(255) NOT NULL,
  \`uploaded_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`tags\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. AUDIT LOGS
DROP TABLE IF EXISTS \`audit_logs\`;
CREATE TABLE \`audit_logs\` (
  \`id\` varchar(50) NOT NULL,
  \`timestamp\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`user_id\` varchar(50) NOT NULL,
  \`user_name\` varchar(255) NOT NULL,
  \`user_avatar\` text,
  \`action\` enum('CREATE','UPDATE','DELETE','STATUS_CHANGE','ASSIGN','UPLOAD_FILE','DOWNLOAD_FILE','EXPORT','LOGIN') NOT NULL,
  \`entity_type\` enum('INCOMING_DOC','OUTGOING_DOC','TASK','DOSSIER','USER','FILE','MASTER_DATA') NOT NULL,
  \`entity_id\` varchar(50) NOT NULL,
  \`entity_title\` varchar(500) NOT NULL,
  \`details\` text,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. NOTIFICATIONS
DROP TABLE IF EXISTS \`notifications\`;
CREATE TABLE \`notifications\` (
  \`id\` varchar(50) NOT NULL,
  \`user_id\` varchar(50) NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`message\` text NOT NULL,
  \`type\` enum('DEADLINE_TODAY','OVERDUE','DOC_ASSIGNED','TASK_ASSIGNED','STATUS_UPDATE','GENERAL') NOT NULL,
  \`link_type\` enum('INCOMING_DOC','OUTGOING_DOC','TASK','DOSSIER') DEFAULT NULL,
  \`target_id\` varchar(50) DEFAULT NULL,
  \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;

    // Insert Users
    const users = this.getUsers();
    if (users.length > 0) {
      sql += '\n-- INSERT USERS\n';
      users.forEach((u) => {
        sql += `INSERT INTO \`users\` (\`id\`, \`username\`, \`password\`, \`full_name\`, \`email\`, \`phone\`, \`avatar\`, \`department\`, \`department_id\`, \`position\`, \`position_id\`, \`role\`, \`status\`, \`join_date\`, \`bio\`) VALUES (${esc(u.id)}, ${esc(u.username || u.email.split('@')[0])}, ${esc(u.password || '123')}, ${esc(u.fullName)}, ${esc(u.email)}, ${esc(u.phone)}, ${esc(u.avatar)}, ${esc(u.department)}, ${esc(u.departmentId)}, ${esc(u.position)}, ${esc(u.positionId)}, ${esc(u.role)}, ${esc(u.status)}, ${esc(u.joinDate)}, ${esc(u.bio)});\n`;
      });
    }

    // Insert Dossiers
    const dossiers = this.getDossiers();
    if (dossiers.length > 0) {
      sql += '\n-- INSERT DOSSIERS\n';
      dossiers.forEach((d) => {
        sql += `INSERT INTO \`dossiers\` (\`id\`, \`code\`, \`title\`, \`department\`, \`department_id\`, \`leader_id\`, \`manager_id\`, \`status\`, \`start_date\`, \`end_date\`, \`description\`) VALUES (${esc(d.id)}, ${esc(d.code)}, ${esc(d.title)}, ${esc(d.department)}, ${esc(d.departmentId)}, ${esc(d.leaderId)}, ${esc(d.managerId)}, ${esc(d.status)}, ${esc(d.startDate)}, ${esc(d.endDate)}, ${esc(d.description)});\n`;
      });
    }

    // Insert Incoming Docs
    const incoming = this.getIncomingDocs();
    if (incoming.length > 0) {
      sql += '\n-- INSERT INCOMING DOCUMENTS\n';
      incoming.forEach((doc) => {
        sql += `INSERT INTO \`incoming_documents\` (\`id\`, \`document_number\`, \`official_number\`, \`received_date\`, \`issue_date\`, \`issuing_authority\`, \`summary\`, \`doc_type\`, \`urgency\`, \`security_level\`, \`assignee_id\`, \`co_assignee_ids\`, \`due_date\`, \`status\`, \`result_summary\`, \`dossier_id\`, \`linked_task_ids\`, \`created_by_id\`) VALUES (${esc(doc.id)}, ${esc(doc.documentNumber)}, ${esc(doc.officialNumber)}, ${esc(doc.receivedDate)}, ${esc(doc.issueDate)}, ${esc(doc.issuingAuthority)}, ${esc(doc.summary)}, ${esc(doc.docType)}, ${esc(doc.urgency)}, ${esc(doc.securityLevel)}, ${esc(doc.assigneeId)}, ${esc(doc.coAssigneeIds)}, ${esc(doc.dueDate)}, ${esc(doc.status)}, ${esc(doc.resultSummary)}, ${esc(doc.dossierId)}, ${esc(doc.linkedTaskIds)}, ${esc(doc.createdById)});\n`;
      });
    }

    // Insert Outgoing Docs
    const outgoing = this.getOutgoingDocs();
    if (outgoing.length > 0) {
      sql += '\n-- INSERT OUTGOING DOCUMENTS\n';
      outgoing.forEach((doc) => {
        sql += `INSERT INTO \`outgoing_documents\` (\`id\`, \`document_number\`, \`release_date\`, \`doc_type\`, \`recipient\`, \`summary\`, \`drafter_id\`, \`signer_id\`, \`status\`, \`dossier_id\`, \`reply_to_doc_id\`, \`created_by_id\`) VALUES (${esc(doc.id)}, ${esc(doc.documentNumber)}, ${esc(doc.releaseDate)}, ${esc(doc.docType)}, ${esc(doc.recipient)}, ${esc(doc.summary)}, ${esc(doc.drafterId)}, ${esc(doc.signerId)}, ${esc(doc.status)}, ${esc(doc.dossierId)}, ${esc(doc.replyToDocId)}, ${esc(doc.createdById)});\n`;
      });
    }

    // Insert Tasks
    const tasks = this.getTasks();
    if (tasks.length > 0) {
      sql += '\n-- INSERT TASKS\n';
      tasks.forEach((t) => {
        sql += `INSERT INTO \`tasks\` (\`id\`, \`code\`, \`title\`, \`description\`, \`dossier_id\`, \`incoming_doc_id\`, \`linked_doc_id\`, \`doc_type_relation\`, \`creator_id\`, \`created_by_id\`, \`assignee_id\`, \`co_assignee_ids\`, \`priority\`, \`start_date\`, \`due_date\`, \`progress\`, \`status\`, \`completed_date\`, \`result_notes\`, \`sub_tasks\`, \`comments\`, \`remind_days_before\`) VALUES (${esc(t.id)}, ${esc(t.code)}, ${esc(t.title)}, ${esc(t.description)}, ${esc(t.dossierId)}, ${esc(t.incomingDocId)}, ${esc(t.linkedDocId)}, ${esc(t.docTypeRelation)}, ${esc(t.creatorId)}, ${esc(t.createdById)}, ${esc(t.assigneeId)}, ${esc(t.coAssigneeIds)}, ${esc(t.priority)}, ${esc(t.startDate)}, ${esc(t.dueDate)}, ${esc(t.progress)}, ${esc(t.status)}, ${esc(t.completedDate)}, ${esc(t.resultNotes)}, ${esc(t.subTasks)}, ${esc(t.comments)}, ${esc(t.remindDaysBefore)});\n`;
      });
    }

    // Insert Attachments
    const attachments = this.getAttachments();
    if (attachments.length > 0) {
      sql += '\n-- INSERT ATTACHMENTS\n';
      attachments.forEach((a) => {
        sql += `INSERT INTO \`attachments\` (\`id\`, \`file_name\`, \`file_size\`, \`file_type\`, \`file_url\`, \`category\`, \`related_id\`, \`dossier_code\`, \`dossier_id\`, \`uploaded_by_id\`, \`uploaded_by_name\`, \`tags\`) VALUES (${esc(a.id)}, ${esc(a.fileName)}, ${esc(a.fileSize)}, ${esc(a.fileType)}, ${esc(a.fileUrl)}, ${esc(a.category)}, ${esc(a.relatedId)}, ${esc(a.dossierCode)}, ${esc(a.dossierId)}, ${esc(a.uploadedById)}, ${esc(a.uploadedByName)}, ${esc(a.tags)});\n`;
      });
    }

    return sql;
  }

  // --- Export & Import ---
  public exportDatabaseJSON(): string {
    const dump = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      data: {
        users: this.getUsers(),
        dossiers: this.getDossiers(),
        incomingDocs: this.getIncomingDocs(),
        outgoingDocs: this.getOutgoingDocs(),
        tasks: this.getTasks(),
        attachments: this.getAttachments(),
        auditLogs: this.getAuditLogs(),
        notifications: this.getNotifications(),
        masterData: this.getMasterData(),
      },
    };
    return JSON.stringify(dump, null, 2);
  }

  public importDatabaseJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;
      if (data.users) this.safeSetItem(DB_STORAGE_KEYS.USERS, JSON.stringify(data.users));
      if (data.dossiers) this.safeSetItem(DB_STORAGE_KEYS.DOSSIERS, JSON.stringify(data.dossiers));
      if (data.incomingDocs) this.safeSetItem(DB_STORAGE_KEYS.INCOMING_DOCS, JSON.stringify(data.incomingDocs));
      if (data.outgoingDocs) this.safeSetItem(DB_STORAGE_KEYS.OUTGOING_DOCS, JSON.stringify(data.outgoingDocs));
      if (data.tasks) this.safeSetItem(DB_STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
      if (data.attachments) this.safeSetItem(DB_STORAGE_KEYS.ATTACHMENTS, JSON.stringify(data.attachments));
      if (data.auditLogs) {
        const capped = Array.isArray(data.auditLogs) ? data.auditLogs.slice(0, 60) : [];
        this.safeSetItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(capped));
      }
      if (data.notifications) {
        const capped = Array.isArray(data.notifications) ? data.notifications.slice(0, 60) : [];
        this.safeSetItem(DB_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(capped));
      }
      if (data.masterData) this.safeSetItem(DB_STORAGE_KEYS.MASTER_DATA, JSON.stringify(data.masterData));
      this.notify();
      return true;
    } catch (err) {
      console.error('Import database failed:', err);
      return false;
    }
  }
}

export const db = new DatabaseService();
export const dbService = db;
