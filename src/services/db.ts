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

  constructor() {
    this.initIfEmpty();
    this.checkAndSyncMySql();
    this.initFirestoreSync();
  }

  private async initFirestoreSync() {
    if (typeof window === 'undefined') return;
    try {
      this.firestoreConnected = await firestoreSync.checkConnection();

      // Listen to real-time changes from Firestore
      firestoreSync.listenToAll({
        onUsers: (users) => {
          this.firestoreConnected = true;
          localStorage.setItem(DB_STORAGE_KEYS.USERS, JSON.stringify(users));
          this.notify();
        },
        onDossiers: (dossiers) => {
          this.firestoreConnected = true;
          localStorage.setItem(DB_STORAGE_KEYS.DOSSIERS, JSON.stringify(dossiers));
          this.notify();
        },
        onIncomingDocs: (docs) => {
          this.firestoreConnected = true;
          localStorage.setItem(DB_STORAGE_KEYS.INCOMING_DOCS, JSON.stringify(docs));
          this.notify();
        },
        onOutgoingDocs: (docs) => {
          this.firestoreConnected = true;
          localStorage.setItem(DB_STORAGE_KEYS.OUTGOING_DOCS, JSON.stringify(docs));
          this.notify();
        },
        onTasks: (tasks) => {
          this.firestoreConnected = true;
          localStorage.setItem(DB_STORAGE_KEYS.TASKS, JSON.stringify(tasks));
          this.notify();
        },
        onAttachments: (attachments) => {
          this.firestoreConnected = true;
          localStorage.setItem(DB_STORAGE_KEYS.ATTACHMENTS, JSON.stringify(attachments));
          this.notify();
        },
        onAuditLogs: (logs) => {
          this.firestoreConnected = true;
          localStorage.setItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
          this.notify();
        },
        onNotifications: (notifications) => {
          this.firestoreConnected = true;
          localStorage.setItem(DB_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
          this.notify();
        },
      });

      // If Firestore is empty on first run, upload our initial dataset
      const remoteData = await firestoreSync.fetchAllFromFirestore();
      if (remoteData && remoteData.users.length === 0) {
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
          if (Array.isArray(d.users)) localStorage.setItem(DB_STORAGE_KEYS.USERS, JSON.stringify(d.users));
          if (Array.isArray(d.dossiers)) localStorage.setItem(DB_STORAGE_KEYS.DOSSIERS, JSON.stringify(d.dossiers));
          if (Array.isArray(d.incomingDocs)) localStorage.setItem(DB_STORAGE_KEYS.INCOMING_DOCS, JSON.stringify(d.incomingDocs));
          if (Array.isArray(d.outgoingDocs)) localStorage.setItem(DB_STORAGE_KEYS.OUTGOING_DOCS, JSON.stringify(d.outgoingDocs));
          if (Array.isArray(d.tasks)) localStorage.setItem(DB_STORAGE_KEYS.TASKS, JSON.stringify(d.tasks));
          if (Array.isArray(d.attachments)) localStorage.setItem(DB_STORAGE_KEYS.ATTACHMENTS, JSON.stringify(d.attachments));
          if (Array.isArray(d.auditLogs)) localStorage.setItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(d.auditLogs));
          if (Array.isArray(d.notifications)) localStorage.setItem(DB_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(d.notifications));
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
            localStorage.setItem(DB_STORAGE_KEYS.MASTER_DATA, JSON.stringify(newMaster));
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

    if (!localStorage.getItem(DB_STORAGE_KEYS.USERS)) {
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
        const raw = localStorage.getItem(key);
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
          localStorage.setItem(key, updated);
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
            localStorage.setItem(storageKey, JSON.stringify(merged));
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
        localStorage.setItem(DB_STORAGE_KEYS.MASTER_DATA, JSON.stringify(currentMaster));
      }

      this.notify();
    }
  }

  public resetToDefaults() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(DB_STORAGE_KEYS.DOSSIERS, JSON.stringify(INITIAL_DOSSIERS));
    localStorage.setItem(DB_STORAGE_KEYS.INCOMING_DOCS, JSON.stringify(INITIAL_INCOMING_DOCS));
    localStorage.setItem(DB_STORAGE_KEYS.OUTGOING_DOCS, JSON.stringify(INITIAL_OUTGOING_DOCS));
    localStorage.setItem(DB_STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    localStorage.setItem(DB_STORAGE_KEYS.ATTACHMENTS, JSON.stringify(INITIAL_ATTACHMENTS));
    localStorage.setItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(DB_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(DB_STORAGE_KEYS.MASTER_DATA, JSON.stringify(INITIAL_MASTER_DATA));
    localStorage.setItem(DB_STORAGE_KEYS.CURRENT_USER_ID, 'usr-01');
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
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    try {
      return JSON.parse(raw);
    } catch {
      return defaultVal;
    }
  }

  private setList<T>(key: string, items: T[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(items));
    this.notify();
  }

  // --- Current User & Authentication ---
  public isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem(DB_STORAGE_KEYS.AUTH_TOKEN);
    const userId = localStorage.getItem(DB_STORAGE_KEYS.CURRENT_USER_ID);
    return Boolean(token && userId);
  }

  public async login(username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    if (!username || !password) {
      return { success: false, message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.' };
    }

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
      // Backend unreachable, fallback to local storage
    }

    // 2. Fallback check from local users database
    const users = this.getUsers();
    const cleanUser = username.trim().toLowerCase();
    const user = users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanUser) ||
        u.email.toLowerCase() === cleanUser ||
        u.email.split('@')[0].toLowerCase() === cleanUser
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
    localStorage.setItem(DB_STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(DB_STORAGE_KEYS.CURRENT_USER_ID, user.id);
    
    // If the authenticated user is an Admin, record as origin admin
    if (user.role === 'ADMIN') {
      localStorage.setItem(DB_STORAGE_KEYS.ADMIN_ORIGIN_USER_ID, user.id);
    } else {
      localStorage.removeItem(DB_STORAGE_KEYS.ADMIN_ORIGIN_USER_ID);
    }

    this.logAction('LOGIN', 'USER', user.id, user.fullName, `Đăng nhập hệ thống thành công (Tài khoản: ${user.username || user.email})`, user);
    this.notify();
  }

  public logout(actor?: User) {
    if (typeof window === 'undefined') return;
    const current = actor || this.getCurrentUser();
    this.logAction('LOGOUT', 'USER', current.id, current.fullName, `Đăng xuất khỏi hệ thống`, current);
    localStorage.removeItem(DB_STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(DB_STORAGE_KEYS.CURRENT_USER_ID);
    localStorage.removeItem(DB_STORAGE_KEYS.ADMIN_ORIGIN_USER_ID);
    this.notify();
  }

  public getAdminOriginUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(DB_STORAGE_KEYS.ADMIN_ORIGIN_USER_ID);
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
    return currentUser?.role === 'ADMIN' || Boolean(adminId);
  }

  public switchUser(targetUserId: string): boolean {
    if (!this.canSwitchUser()) {
      console.warn('Chỉ có Quản trị viên (Admin) mới có quyền chuyển đổi tài khoản.');
      return false;
    }

    const targetUser = this.getUserById(targetUserId);
    if (!targetUser) return false;

    const currentActor = this.getCurrentUser();
    const adminOrigin = this.getAdminOriginUser() || currentActor;

    // Ensure admin origin is saved if current actor is Admin
    if (currentActor.role === 'ADMIN') {
      localStorage.setItem(DB_STORAGE_KEYS.ADMIN_ORIGIN_USER_ID, currentActor.id);
    }

    localStorage.setItem(DB_STORAGE_KEYS.CURRENT_USER_ID, targetUserId);
    localStorage.setItem(DB_STORAGE_KEYS.AUTH_TOKEN, `tok_switch_${targetUserId}_${Date.now()}`);

    this.logAction(
      'SWITCH_USER',
      'USER',
      targetUser.id,
      targetUser.fullName,
      `Quản trị viên ${adminOrigin.fullName} chuyển sang tài khoản ${targetUser.fullName} (${targetUser.role})`,
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
    localStorage.setItem(DB_STORAGE_KEYS.CURRENT_USER_ID, adminId);
    localStorage.setItem(DB_STORAGE_KEYS.AUTH_TOKEN, `tok_return_${adminId}_${Date.now()}`);

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

  public getCurrentUserId(): string {
    if (typeof window === 'undefined') return 'usr-01';
    return localStorage.getItem(DB_STORAGE_KEYS.CURRENT_USER_ID) || 'usr-01';
  }

  public setCurrentUserId(userId: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_STORAGE_KEYS.CURRENT_USER_ID, userId);
    localStorage.setItem(DB_STORAGE_KEYS.AUTH_TOKEN, `tok_${userId}_${Date.now()}`);
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
    this.setList(DB_STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs]);
    this.apiCall('/api/audit-logs', 'POST', newLog);
    firestoreSync.saveAuditLog(newLog);
  }

  public getAuditLogs(): AuditLog[] {
    return this.getList<AuditLog>(DB_STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  // --- Notifications ---
  public getNotifications(userId?: string): SystemNotification[] {
    const list = this.getList<SystemNotification>(DB_STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    if (!userId) return list;
    return list.filter((n) => !n.userId || n.userId === userId);
  }

  public addNotification(notification: Omit<SystemNotification, 'id' | 'createdAt' | 'isRead'>) {
    const list = this.getNotifications();
    const newNotif: SystemNotification = {
      ...notification,
      id: 'notif-' + Date.now(),
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    this.setList(DB_STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...list]);
    firestoreSync.saveNotification(newNotif);
  }

  public markNotificationAsRead(id: string) {
    const list = this.getNotifications().map((n) => (n.id === id ? { ...n, isRead: true } : n));
    this.setList(DB_STORAGE_KEYS.NOTIFICATIONS, list);
  }

  public markAllNotificationsAsRead(userId?: string) {
    const list = this.getNotifications().map((n) => {
      if (!userId || n.userId === userId) {
        return { ...n, isRead: true };
      }
      return n;
    });
    this.setList(DB_STORAGE_KEYS.NOTIFICATIONS, list);
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

  public saveTask(task: Task, actor?: User) {
    const tasks = this.getTasks();
    const idx = tasks.findIndex((t) => t.id === task.id);
    let updated: Task[];
    if (idx >= 0) {
      updated = [...tasks];
      const prev = tasks[idx];
      updated[idx] = { ...task, updatedAt: new Date().toISOString() };

      let actionDesc = `Cập nhật công việc: ${task.title} (Tiến độ: ${task.progress}%, Trạng thái: ${task.status})`;
      if (prev.progress !== task.progress) {
        actionDesc += ` | Tiến độ thay đổi từ ${prev.progress}% lên ${task.progress}%`;
      }
      this.logAction('UPDATE', 'TASK', task.id, task.title, actionDesc, actor);

      // Notify if completed
      if (task.status === 'COMPLETED' && prev.status !== 'COMPLETED' && task.createdById) {
        this.addNotification({
          userId: task.createdById,
          title: `Công việc đã hoàn thành: ${task.code}`,
          message: `${this.getUserById(task.assigneeId)?.fullName} đã hoàn thành công việc "${task.title}".`,
          type: 'STATUS_UPDATED',
          linkType: 'TASK',
          targetId: task.id,
        });
      }
    } else {
      updated = [{ ...task, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...tasks];
      this.logAction(
        'CREATE',
        'TASK',
        task.id,
        task.title,
        `Giao nhiệm vụ mới mã ${task.code} cho ${this.getUserById(task.assigneeId)?.fullName || 'Cán bộ'} - Hạn chót: ${task.dueDate}`,
        actor
      );

      // Notify assignee
      if (task.assigneeId) {
        this.addNotification({
          userId: task.assigneeId,
          title: `Bạn được giao công việc mới: ${task.code}`,
          message: `Nhiệm vụ: "${task.title}". Hạn hoàn thành: ${task.dueDate}.`,
          type: 'NEW_TASK',
          linkType: 'TASK',
          targetId: task.id,
        });
      }
    }
    this.setList(DB_STORAGE_KEYS.TASKS, updated);
    this.apiCall('/api/tasks', 'POST', task);
    firestoreSync.saveTask(task);

    if (task.attachments && task.attachments.length > 0) {
      const existingAttachments = this.getAttachments();
      const updatedAttachments = [...existingAttachments];

      for (const att of task.attachments) {
        const existingIdx = updatedAttachments.findIndex((a) => a.id === att.id);
        const attachmentToSave: AttachmentFile = {
          ...att,
          relatedId: task.id,
          category: 'HO_SO',
          dossierId: task.dossierId || att.dossierId,
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

    // Notify recipient (Lãnh đạo hoặc Người thực hiện)
    const senderId = comment.userId;
    const recipientId = senderId === task.assigneeId ? (task.creatorId || task.createdById) : task.assigneeId;

    if (recipientId && recipientId !== senderId) {
      this.addNotification({
        userId: recipientId,
        title: `Ý kiến trao đổi mới [${task.code}]`,
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
    const raw = localStorage.getItem(DB_STORAGE_KEYS.MASTER_DATA);
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
    localStorage.setItem(DB_STORAGE_KEYS.MASTER_DATA, JSON.stringify(data));
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
      if (data.users) localStorage.setItem(DB_STORAGE_KEYS.USERS, JSON.stringify(data.users));
      if (data.dossiers) localStorage.setItem(DB_STORAGE_KEYS.DOSSIERS, JSON.stringify(data.dossiers));
      if (data.incomingDocs) localStorage.setItem(DB_STORAGE_KEYS.INCOMING_DOCS, JSON.stringify(data.incomingDocs));
      if (data.outgoingDocs) localStorage.setItem(DB_STORAGE_KEYS.OUTGOING_DOCS, JSON.stringify(data.outgoingDocs));
      if (data.tasks) localStorage.setItem(DB_STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
      if (data.attachments) localStorage.setItem(DB_STORAGE_KEYS.ATTACHMENTS, JSON.stringify(data.attachments));
      if (data.auditLogs) localStorage.setItem(DB_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(data.auditLogs));
      if (data.notifications) localStorage.setItem(DB_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(data.notifications));
      if (data.masterData) localStorage.setItem(DB_STORAGE_KEYS.MASTER_DATA, JSON.stringify(data.masterData));
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
