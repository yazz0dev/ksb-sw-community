import { type FirebaseApp, initializeApp } from "firebase/app";
// Import getFirestore and specific cache options
import { 
    Firestore, 
    getFirestore
} from "firebase/firestore"; 
import { type Auth, getAuth } from 'firebase/auth';

// Firebase config and initialization
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY!, 
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID!,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    appId: import.meta.env.VITE_FIREBASE_APP_ID!
};

// Initialize Firebase app
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firestore
const db: Firestore = getFirestore(app);

// Initialize Auth
const auth: Auth = getAuth(app);

export { db, auth, app };