import { FirebaseApp, initializeApp } from "firebase/app";
// Import getFirestore and specific cache options
import { 
    Firestore, 
    getFirestore,
    enableNetwork as enableFirestoreNetworkFn, // Alias to avoid naming conflict if we export enableFirestoreNetwork
    disableNetwork as disableFirestoreNetworkFn // Alias
} from "firebase/firestore"; 
import { Auth, getAuth } from 'firebase/auth';

interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

const firebaseConfig: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY!, 
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID!,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    appId: import.meta.env.VITE_FIREBASE_APP_ID!
};

const app: FirebaseApp = initializeApp(firebaseConfig);

const db: Firestore = getFirestore(app);


const auth: Auth = getAuth(app);

/**
 * Enable Firestore network access
 * @returns Promise that resolves when network is enabled
 */
export const enableFirestoreNetwork = async (): Promise<void> => {
  try {
    await enableFirestoreNetworkFn(db);
  } catch (error) {
    throw error;
  }
};

/**
 * Disable Firestore network access
 * @returns Promise that resolves when network is disabled
 */
export const disableFirestoreNetwork = async (): Promise<void> => {
  try {
    await disableFirestoreNetworkFn(db);
  } catch (error) {
    throw error;
  }
};

export { db, auth, app }; // Export app as well