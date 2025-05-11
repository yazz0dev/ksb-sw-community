import { FirebaseApp, initializeApp } from "firebase/app";
// Import getFirestore and specific cache options
import { 
    Firestore, 
    initializeFirestore, // Use initializeFirestore for custom cache
    memoryLocalCache 
    // persistentLocalCache, // Keep for reference if you need to switch back
    // persistentMultipleTabManager // Keep for reference
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

// Initialize Firestore with memoryLocalCache to bypass IndexedDB for testing
const db: Firestore = initializeFirestore(app, { 
    localCache: memoryLocalCache() 
});

// To revert to default (IndexedDB persistence) if memory cache doesn't help or for production:
// import { getFirestore } from "firebase/firestore";
// const db: Firestore = getFirestore(app);


const auth: Auth = getAuth(app);

export { db, auth };