import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
import {
  checkMySqlConnection,
  fetchAllDataFromMySql,
  initTablesAndSeed,
} from './mysql';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE = process.env.VERCEL
  ? path.join('/tmp', '.db_store_cache.json')
  : path.join(__dirname, '.db_store_cache.json');

export interface FullDbState {
  departments: any[];
  positions: any[];
  users: any[];
  dossiers: any[];
  incomingDocs: any[];
  outgoingDocs: any[];
  tasks: any[];
  attachments: any[];
  auditLogs: any[];
  notifications: any[];
  lastSyncedAt?: string;
}

let inMemoryState: FullDbState | null = null;

function getInitialState(): FullDbState {
  return {
    departments: [...INITIAL_DEPARTMENTS],
    positions: [...INITIAL_POSITIONS],
    users: [...INITIAL_USERS],
    dossiers: [...INITIAL_DOSSIERS],
    incomingDocs: [...INITIAL_INCOMING_DOCS],
    outgoingDocs: [...INITIAL_OUTGOING_DOCS],
    tasks: [...INITIAL_TASKS],
    attachments: [...INITIAL_ATTACHMENTS],
    auditLogs: [...INITIAL_AUDIT_LOGS],
    notifications: [...INITIAL_NOTIFICATIONS],
    lastSyncedAt: new Date().toISOString(),
  };
}

export function loadStore(): FullDbState {
  if (inMemoryState) return inMemoryState;

  if (fs.existsSync(STORE_FILE)) {
    try {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      inMemoryState = JSON.parse(content);
      if (inMemoryState) {
        const initial = getInitialState();
        const mergeMissing = (existingList: any[] = [], initList: any[] = []) => {
          const idSet = new Set(existingList.map(item => item.id));
          const missing = initList.filter(item => !idSet.has(item.id));
          return [...existingList, ...missing];
        };
        inMemoryState.departments = mergeMissing(inMemoryState.departments, initial.departments);
        inMemoryState.positions = mergeMissing(inMemoryState.positions, initial.positions);
        inMemoryState.users = mergeMissing(inMemoryState.users, initial.users);
        inMemoryState.dossiers = mergeMissing(inMemoryState.dossiers, initial.dossiers);
        inMemoryState.incomingDocs = mergeMissing(inMemoryState.incomingDocs, initial.incomingDocs);
        inMemoryState.outgoingDocs = mergeMissing(inMemoryState.outgoingDocs, initial.outgoingDocs);
        inMemoryState.tasks = mergeMissing(inMemoryState.tasks, initial.tasks);
        inMemoryState.attachments = mergeMissing(inMemoryState.attachments, initial.attachments);
        inMemoryState.auditLogs = mergeMissing(inMemoryState.auditLogs, initial.auditLogs);
        inMemoryState.notifications = mergeMissing(inMemoryState.notifications, initial.notifications);
      }
      return inMemoryState!;
    } catch (e) {
      console.warn('Failed to parse cache store, creating initial store:', e);
    }
  }

  inMemoryState = getInitialState();
  return inMemoryState;
}

export function saveStore(state: FullDbState) {
  inMemoryState = state;
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(state), 'utf-8');
  } catch (e) {
    console.error('Error saving cache store:', e);
  }
}

/**
 * Syncs memory store with MySQL. If MySQL is connected, fetches everything directly from MySQL.
 */
export async function syncStoreWithMySql(): Promise<{ connected: boolean; data: FullDbState }> {
  try {
    const status = await checkMySqlConnection();
    if (status.connected) {
      try {
        await initTablesAndSeed();
      } catch (seedErr) {
        console.warn('Init tables warning:', seedErr);
      }
      const mySqlData = await fetchAllDataFromMySql();
      if (mySqlData) {
        const full: FullDbState = {
          departments: mySqlData.departments || [],
          positions: mySqlData.positions || [],
          users: mySqlData.users || [],
          dossiers: mySqlData.dossiers || [],
          incomingDocs: mySqlData.incomingDocs || [],
          outgoingDocs: mySqlData.outgoingDocs || [],
          tasks: mySqlData.tasks || [],
          attachments: mySqlData.attachments || [],
          auditLogs: mySqlData.auditLogs || [],
          notifications: mySqlData.notifications || [],
          lastSyncedAt: new Date().toISOString(),
        };
        inMemoryState = full;
        return { connected: true, data: full };
      }
    }
  } catch (err) {
    console.warn('Sync with MySQL notice:', err);
  }

  const current = loadStore();
  return { connected: false, data: current };
}
