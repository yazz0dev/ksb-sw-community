import { FirebaseApp, initializeApp } from "firebase/app";
// Update imports to include initializeFirestore and needed types
import { 
  Firestore, 
  getFirestore, 
  initializeFirestore,
  connectFirestoreEmulator,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  persistentMultipleTabManager,
  FirestoreSettings,
  enableIndexedDbPersistence,
  clearIndexedDbPersistence, 
  memoryLocalCache,          
} from "firebase/firestore"; 
import { Auth, getAuth, connectAuthEmulator } from 'firebase/auth';

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

// Consider adding checks or fallbacks if env vars might be missing
const firebaseConfig: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY!, 
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID!,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    appId: import.meta.env.VITE_FIREBASE_APP_ID!
};

const app: FirebaseApp = initializeApp(firebaseConfig);

// Helper function to clear corrupted IndexedDB persistence
async function clearCorruptedPersistence(): Promise<void> {
  const tempDb = getFirestore(app);
  try {
    console.warn('Attempting to clear corrupted Firestore IndexedDB persistence...');
    await clearIndexedDbPersistence(tempDb);
    console.log('Successfully cleared Firestore persistence.');
  } catch (err) {
    console.error('Failed to clear Firestore persistence:', err);
    // We'll continue anyway and let the fallback logic work
  }
}

// Helper function to detect corrupted IndexedDB
async function isIndexedDBCorrupted(): Promise<boolean> {
  try {
    // Try a simple IndexedDB operation as a test
    const testDbName = 'firestore-corruption-test';
    const request = indexedDB.open(testDbName, 1);
    
    await new Promise<void>((resolve, reject) => {
      request.onerror = () => {
        console.error('IndexedDB access error - possible corruption detected');
        reject(new Error('IndexedDB access failed'));
      };
      
      request.onsuccess = () => {
        const db = request.result;
        db.close();
        resolve();
      };
    });
    
    // Clean up test database
    indexedDB.deleteDatabase(testDbName);
    return false; // IndexedDB seems to be working
  } catch (err) {
    console.warn('IndexedDB corruption test failed:', err);
    return true; // Consider it corrupted if any errors occur
  }
}

// Initialize Firestore with config to handle connection issues better
let db: Firestore;
let persistenceEnabled = false;

async function initializeFirestoreWithFallbacks() {
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    // EMULATOR PATH - Simple initialization is fine here
    db = getFirestore(app);
    const firestoreEmulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
    const firestoreEmulatorPort = parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || '8080', 10);
    connectFirestoreEmulator(db, firestoreEmulatorHost, firestoreEmulatorPort);
    console.log(`🔥 Firestore initialized with emulator at ${firestoreEmulatorHost}:${firestoreEmulatorPort}`);
    return;
  }

  // Check for IndexedDB corruption first
  if (await isIndexedDBCorrupted()) {
    console.warn('IndexedDB corruption detected, clearing persistence');
    try {
      await clearCorruptedPersistence();
    } catch (err) {
      console.error('Failed to clear corrupted persistence:', err);
    }
  }

  // Try different persistence strategies with fallbacks
  // Strategy 1: Multi-tab persistent cache (preferred)
  try {
    const settings: FirestoreSettings = {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      })
    };
    
    db = initializeFirestore(app, settings);
    persistenceEnabled = true;
    console.log('Firestore initialized with multi-tab persistent cache.');
    return;
  } catch (err1) {
    console.warn('Failed to initialize Firestore with multi-tab persistence:', err1);
    
    // Strategy 2: Single-tab persistence as fallback
    try {
      // Clear any corrupted persistence first
      await clearCorruptedPersistence();
      
      // Basic initialization
      db = getFirestore(app);
      
      // Then enable single-tab persistence
      await enableIndexedDbPersistence(db);
      persistenceEnabled = true;
      console.log('Firestore initialized with single-tab persistence (fallback 1).');
      return;
    } catch (err2) {
      console.warn('Failed to initialize Firestore with single-tab persistence:', err2);
      
      // Strategy 3: Memory-only cache (last resort)
      try {
        const memorySettings: FirestoreSettings = {
          localCache: memoryLocalCache()
        };
        
        db = initializeFirestore(app, memorySettings);
        console.log('Firestore initialized with memory-only cache (fallback 2).');
        return;
      } catch (err3) {
        console.error('All persistence strategies failed:', err3);
        
        // Final fallback: No special settings
        db = getFirestore(app);
        console.log('Firestore initialized with default settings (all fallbacks failed).');
      }
    }
  }
}

// Initialize Firestore asynchronously
initializeFirestoreWithFallbacks().catch(err => {
  console.error('Critical error during Firestore initialization:', err);
  // Ultimate fallback if everything else fails
  db = getFirestore(app);
});

const auth: Auth = getAuth(app);

// Setup Auth emulator if configured
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  const authEmulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
  const authEmulatorPort = import.meta.env.VITE_AUTH_EMULATOR_PORT || '9099';
  connectAuthEmulator(auth, `http://${authEmulatorHost}:${authEmulatorPort}`);
  console.log(`🔑 Using Auth emulator at ${authEmulatorHost}:${authEmulatorPort}`);
}

export { db, auth, persistenceEnabled };
