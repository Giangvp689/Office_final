import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const firestore = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined
);

// Initialize Auth
export const auth = getAuth(app);

// Connection test helper
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Attempt a live fetch test to verify connectivity
    await getDocFromServer(doc(firestore, '__connectivity__', 'ping'));
    return true;
  } catch (error: any) {
    // Note: permission-denied still proves we reached the firestore server!
    if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
      return true;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase Firestore] Client is offline or network is disconnected.');
      return false;
    }
    return false;
  }
}

export { app };
