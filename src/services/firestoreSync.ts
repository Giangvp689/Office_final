import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { firestore, testFirestoreConnection, auth } from './firebase';
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
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class FirestoreSyncService {
  private isOnline = false;
  private unsubscribeListeners: Array<() => void> = [];

  constructor() {
    this.checkConnection();
  }

  public async checkConnection(): Promise<boolean> {
    try {
      this.isOnline = await testFirestoreConnection();
      return this.isOnline;
    } catch {
      this.isOnline = false;
      return false;
    }
  }

  public getStatus() {
    return {
      connected: this.isOnline,
      provider: 'Google Firebase Firestore (Realtime Cloud Database)',
    };
  }

  // Realtime Listeners for synchronization
  public listenToAll(callbacks: {
    onUsers?: (users: User[]) => void;
    onIncomingDocs?: (docs: IncomingDocument[]) => void;
    onOutgoingDocs?: (docs: OutgoingDocument[]) => void;
    onTasks?: (tasks: Task[]) => void;
    onDossiers?: (dossiers: Dossier[]) => void;
    onAttachments?: (attachments: AttachmentFile[]) => void;
    onNotifications?: (notifs: SystemNotification[]) => void;
    onAuditLogs?: (logs: AuditLog[]) => void;
    onMasterData?: (data: MasterData) => void;
  }): () => void {
    // Stop any existing listeners
    this.stopListening();

    try {
      if (callbacks.onUsers) {
        const unsub = onSnapshot(
          collection(firestore, 'users'),
          (snap) => {
            const list: User[] = [];
            snap.forEach((d) => list.push(d.data() as User));
            if (list.length > 0) callbacks.onUsers!(list);
          },
          (err) => {
            if (err?.message?.includes('Missing or insufficient permissions') || (err as any)?.code === 'permission-denied') {
              try {
                handleFirestoreError(err, OperationType.GET, 'users');
              } catch {
                // Caught after logging
              }
            }
            console.warn('[Firestore] users sync error:', err.message);
          }
        );
        this.unsubscribeListeners.push(unsub);
      }

      if (callbacks.onIncomingDocs) {
        const unsub = onSnapshot(
          collection(firestore, 'incoming_documents'),
          (snap) => {
            const list: IncomingDocument[] = [];
            snap.forEach((d) => list.push(d.data() as IncomingDocument));
            if (list.length > 0) callbacks.onIncomingDocs!(list);
          },
          (err) => {
            if (err?.message?.includes('Missing or insufficient permissions') || (err as any)?.code === 'permission-denied') {
              try {
                handleFirestoreError(err, OperationType.GET, 'incoming_documents');
              } catch {
                // Caught after logging
              }
            }
            console.warn('[Firestore] incoming_documents sync error:', err.message);
          }
        );
        this.unsubscribeListeners.push(unsub);
      }

      if (callbacks.onOutgoingDocs) {
        const unsub = onSnapshot(
          collection(firestore, 'outgoing_documents'),
          (snap) => {
            const list: OutgoingDocument[] = [];
            snap.forEach((d) => list.push(d.data() as OutgoingDocument));
            if (list.length > 0) callbacks.onOutgoingDocs!(list);
          },
          (err) => {
            if (err?.message?.includes('Missing or insufficient permissions') || (err as any)?.code === 'permission-denied') {
              try {
                handleFirestoreError(err, OperationType.GET, 'outgoing_documents');
              } catch {
                // Caught after logging
              }
            }
            console.warn('[Firestore] outgoing_documents sync error:', err.message);
          }
        );
        this.unsubscribeListeners.push(unsub);
      }

      if (callbacks.onTasks) {
        const unsub = onSnapshot(
          collection(firestore, 'tasks'),
          (snap) => {
            const list: Task[] = [];
            snap.forEach((d) => list.push(d.data() as Task));
            if (list.length > 0) callbacks.onTasks!(list);
          },
          (err) => {
            if (err?.message?.includes('Missing or insufficient permissions') || (err as any)?.code === 'permission-denied') {
              try {
                handleFirestoreError(err, OperationType.GET, 'tasks');
              } catch {
                // Caught after logging
              }
            }
            console.warn('[Firestore] tasks sync error:', err.message);
          }
        );
        this.unsubscribeListeners.push(unsub);
      }

      if (callbacks.onDossiers) {
        const unsub = onSnapshot(
          collection(firestore, 'dossiers'),
          (snap) => {
            const list: Dossier[] = [];
            snap.forEach((d) => list.push(d.data() as Dossier));
            if (list.length > 0) callbacks.onDossiers!(list);
          },
          (err) => {
            if (err?.message?.includes('Missing or insufficient permissions') || (err as any)?.code === 'permission-denied') {
              try {
                handleFirestoreError(err, OperationType.GET, 'dossiers');
              } catch {
                // Caught after logging
              }
            }
            console.warn('[Firestore] dossiers sync error:', err.message);
          }
        );
        this.unsubscribeListeners.push(unsub);
      }

      if (callbacks.onAttachments) {
        const unsub = onSnapshot(
          collection(firestore, 'attachments'),
          (snap) => {
            const list: AttachmentFile[] = [];
            snap.forEach((d) => list.push(d.data() as AttachmentFile));
            if (list.length > 0) callbacks.onAttachments!(list);
          },
          (err) => {
            if (err?.message?.includes('Missing or insufficient permissions') || (err as any)?.code === 'permission-denied') {
              try {
                handleFirestoreError(err, OperationType.GET, 'attachments');
              } catch {
                // Caught after logging
              }
            }
            console.warn('[Firestore] attachments sync error:', err.message);
          }
        );
        this.unsubscribeListeners.push(unsub);
      }

      if (callbacks.onNotifications) {
        const unsub = onSnapshot(
          collection(firestore, 'notifications'),
          (snap) => {
            const list: SystemNotification[] = [];
            snap.forEach((d) => list.push(d.data() as SystemNotification));
            if (list.length > 0) callbacks.onNotifications!(list);
          },
          (err) => {
            if (err?.message?.includes('Missing or insufficient permissions') || (err as any)?.code === 'permission-denied') {
              try {
                handleFirestoreError(err, OperationType.GET, 'notifications');
              } catch {
                // Caught after logging
              }
            }
            console.warn('[Firestore] notifications sync error:', err.message);
          }
        );
        this.unsubscribeListeners.push(unsub);
      }

      if (callbacks.onAuditLogs) {
        const unsub = onSnapshot(
          collection(firestore, 'audit_logs'),
          (snap) => {
            const list: AuditLog[] = [];
            snap.forEach((d) => list.push(d.data() as AuditLog));
            if (list.length > 0) {
              list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              callbacks.onAuditLogs!(list);
            }
          },
          (err) => {
            if (err?.message?.includes('Missing or insufficient permissions') || (err as any)?.code === 'permission-denied') {
              try {
                handleFirestoreError(err, OperationType.GET, 'audit_logs');
              } catch {
                // Caught after logging
              }
            }
            console.warn('[Firestore] audit_logs sync error:', err.message);
          }
        );
        this.unsubscribeListeners.push(unsub);
      }
    } catch (err: any) {
      console.warn('[Firestore] Initial listen failed:', err);
    }

    return () => this.stopListening();
  }

  public stopListening() {
    this.unsubscribeListeners.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // ignore
      }
    });
    this.unsubscribeListeners = [];
  }

  // --- Realtime Cloud Writing Operations ---
  public async saveUser(user: User): Promise<void> {
    try {
      await setDoc(doc(firestore, 'users', user.id), user, { merge: true });
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.WRITE, `users/${user.id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore saveUser error]:', e);
    }
  }

  public async deleteUser(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'users', id));
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.DELETE, `users/${id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore deleteUser error]:', e);
    }
  }

  public async saveIncomingDoc(d: IncomingDocument): Promise<void> {
    try {
      await setDoc(doc(firestore, 'incoming_documents', d.id), d, { merge: true });
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.WRITE, `incoming_documents/${d.id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore saveIncomingDoc error]:', e);
    }
  }

  public async deleteIncomingDoc(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'incoming_documents', id));
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.DELETE, `incoming_documents/${id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore deleteIncomingDoc error]:', e);
    }
  }

  public async saveOutgoingDoc(d: OutgoingDocument): Promise<void> {
    try {
      await setDoc(doc(firestore, 'outgoing_documents', d.id), d, { merge: true });
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.WRITE, `outgoing_documents/${d.id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore saveOutgoingDoc error]:', e);
    }
  }

  public async deleteOutgoingDoc(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'outgoing_documents', id));
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.DELETE, `outgoing_documents/${id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore deleteOutgoingDoc error]:', e);
    }
  }

  public async saveTask(t: Task): Promise<void> {
    try {
      await setDoc(doc(firestore, 'tasks', t.id), t, { merge: true });
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.WRITE, `tasks/${t.id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore saveTask error]:', e);
    }
  }

  public async deleteTask(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'tasks', id));
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.DELETE, `tasks/${id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore deleteTask error]:', e);
    }
  }

  public async saveDossier(dos: Dossier): Promise<void> {
    try {
      await setDoc(doc(firestore, 'dossiers', dos.id), dos, { merge: true });
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.WRITE, `dossiers/${dos.id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore saveDossier error]:', e);
    }
  }

  public async deleteDossier(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'dossiers', id));
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.DELETE, `dossiers/${id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore deleteDossier error]:', e);
    }
  }

  public async saveAttachment(att: AttachmentFile): Promise<void> {
    if (!att.id) return;
    try {
      await setDoc(doc(firestore, 'attachments', att.id), att, { merge: true });
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.WRITE, `attachments/${att.id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore saveAttachment error]:', e);
    }
  }

  public async deleteAttachment(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'attachments', id));
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.DELETE, `attachments/${id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore deleteAttachment error]:', e);
    }
  }

  public async saveNotification(n: SystemNotification): Promise<void> {
    try {
      await setDoc(doc(firestore, 'notifications', n.id), n, { merge: true });
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.WRITE, `notifications/${n.id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore saveNotification error]:', e);
    }
  }

  public async deleteNotification(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'notifications', id));
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.DELETE, `notifications/${id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore deleteNotification error]:', e);
    }
  }

  public async saveAuditLog(log: AuditLog): Promise<void> {
    try {
      await setDoc(doc(firestore, 'audit_logs', log.id), log, { merge: true });
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.WRITE, `audit_logs/${log.id}`);
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore saveAuditLog error]:', e);
    }
  }

  public async saveMasterData(master: MasterData): Promise<void> {
    try {
      await setDoc(doc(firestore, 'settings', 'master_data'), master, { merge: true });
    } catch (e: any) {
      if (e?.message?.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
        try {
          handleFirestoreError(e, OperationType.WRITE, 'settings/master_data');
        } catch {
          // Handled
        }
      }
      console.warn('[Firestore saveMasterData error]:', e);
    }
  }

  // Seed / Migration of initial or existing data to Firestore Cloud Database
  public async migrateInitialDataToFirestore(dataset: {
    users: User[];
    dossiers: Dossier[];
    incomingDocs: IncomingDocument[];
    outgoingDocs: OutgoingDocument[];
    tasks: Task[];
    attachments: AttachmentFile[];
    auditLogs: AuditLog[];
    notifications: SystemNotification[];
    masterData: MasterData;
  }): Promise<{ success: boolean; count: number; error?: string; isPermissionDenied?: boolean }> {
    try {
      const batch = writeBatch(firestore);
      let count = 0;

      for (const u of dataset.users) {
        batch.set(doc(firestore, 'users', u.id), u, { merge: true });
        count++;
      }
      for (const dos of dataset.dossiers) {
        batch.set(doc(firestore, 'dossiers', dos.id), dos, { merge: true });
        count++;
      }
      for (const d of dataset.incomingDocs) {
        batch.set(doc(firestore, 'incoming_documents', d.id), d, { merge: true });
        count++;
      }
      for (const d of dataset.outgoingDocs) {
        batch.set(doc(firestore, 'outgoing_documents', d.id), d, { merge: true });
        count++;
      }
      for (const t of dataset.tasks) {
        batch.set(doc(firestore, 'tasks', t.id), t, { merge: true });
        count++;
      }
      for (const att of dataset.attachments) {
        if (att.id) {
          batch.set(doc(firestore, 'attachments', att.id), att, { merge: true });
          count++;
        }
      }
      for (const log of dataset.auditLogs.slice(0, 50)) {
        batch.set(doc(firestore, 'audit_logs', log.id), log, { merge: true });
        count++;
      }
      for (const n of dataset.notifications.slice(0, 50)) {
        batch.set(doc(firestore, 'notifications', n.id), n, { merge: true });
        count++;
      }
      batch.set(doc(firestore, 'settings', 'master_data'), dataset.masterData, { merge: true });
      count++;

      await batch.commit();
      this.isOnline = true;
      return { success: true, count };
    } catch (error: any) {
      if (
        error?.message?.includes('Missing or insufficient permissions') ||
        error?.code === 'permission-denied'
      ) {
        try {
          handleFirestoreError(error, OperationType.WRITE, 'batch/migration');
        } catch (jsonErr: any) {
          return {
            success: false,
            count: 0,
            error: 'Missing or insufficient permissions',
            isPermissionDenied: true,
          };
        }
      }
      return { success: false, count: 0, error: error.message || String(error) };
    }
  }

  // Pull all records from Firestore once
  public async fetchAllFromFirestore(): Promise<{
    users: User[];
    dossiers: Dossier[];
    incomingDocs: IncomingDocument[];
    outgoingDocs: OutgoingDocument[];
    tasks: Task[];
    attachments: AttachmentFile[];
    auditLogs: AuditLog[];
    notifications: SystemNotification[];
    masterData?: MasterData;
  } | null> {
    try {
      const [uSnap, dosSnap, inSnap, outSnap, tSnap, attSnap, logSnap, notifSnap] = await Promise.all([
        getDocs(collection(firestore, 'users')),
        getDocs(collection(firestore, 'dossiers')),
        getDocs(collection(firestore, 'incoming_documents')),
        getDocs(collection(firestore, 'outgoing_documents')),
        getDocs(collection(firestore, 'tasks')),
        getDocs(collection(firestore, 'attachments')),
        getDocs(collection(firestore, 'audit_logs')),
        getDocs(collection(firestore, 'notifications')),
      ]);

      const users: User[] = [];
      uSnap.forEach((d) => users.push(d.data() as User));

      const dossiers: Dossier[] = [];
      dosSnap.forEach((d) => dossiers.push(d.data() as Dossier));

      const incomingDocs: IncomingDocument[] = [];
      inSnap.forEach((d) => incomingDocs.push(d.data() as IncomingDocument));

      const outgoingDocs: OutgoingDocument[] = [];
      outSnap.forEach((d) => outgoingDocs.push(d.data() as OutgoingDocument));

      const tasks: Task[] = [];
      tSnap.forEach((d) => tasks.push(d.data() as Task));

      const attachments: AttachmentFile[] = [];
      attSnap.forEach((d) => attachments.push(d.data() as AttachmentFile));

      const auditLogs: AuditLog[] = [];
      logSnap.forEach((d) => auditLogs.push(d.data() as AuditLog));

      const notifications: SystemNotification[] = [];
      notifSnap.forEach((d) => notifications.push(d.data() as SystemNotification));

      this.isOnline = true;
      return {
        users,
        dossiers,
        incomingDocs,
        outgoingDocs,
        tasks,
        attachments,
        auditLogs,
        notifications,
      };
    } catch (err: any) {
      if (
        err?.message?.includes('Missing or insufficient permissions') ||
        err?.code === 'permission-denied'
      ) {
        try {
          handleFirestoreError(err, OperationType.GET, 'all_collections');
        } catch {
          // Handled
        }
      }
      console.warn('Failed to fetch from Firestore:', err);
      return null;
    }
  }

  // Fetch users directly from Firestore
  public async fetchUsersFromFirestore(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(firestore, 'users'));
      const list: User[] = [];
      snap.forEach((d) => list.push(d.data() as User));
      return list;
    } catch (err: any) {
      if (
        err?.message?.includes('Missing or insufficient permissions') ||
        err?.code === 'permission-denied'
      ) {
        try {
          handleFirestoreError(err, OperationType.GET, 'users');
        } catch {}
      }
      console.warn('[Firestore] fetchUsersFromFirestore error:', err);
      return [];
    }
  }

  // Find user by username, email, or ID directly in Firestore
  public async findUserByLogin(loginInput: string): Promise<User | null> {
    const clean = loginInput.trim().toLowerCase();
    try {
      const users = await this.fetchUsersFromFirestore();
      for (const u of users) {
        const uName = (u.username || '').toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        const uEmailPrefix = uEmail.split('@')[0];
        const uId = (u.id || '').toLowerCase();
        if (uName === clean || uEmail === clean || uEmailPrefix === clean || uId === clean) {
          return u;
        }
      }
      return null;
    } catch (err) {
      console.warn('[Firestore] findUserByLogin error:', err);
      return null;
    }
  }
}

export const firestoreSync = new FirestoreSyncService();
