// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth } from 'firebase/auth';

// Use import.meta.env for Vite OR process.env for Vue CLI
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY, // Vite syntax
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistence settings
initializeFirestore(app, {
    cache: {
        persistence: true,
        cacheMaxSize: CACHE_SIZE_UNLIMITED
    }
});

const db = getFirestore(app);
const auth = getAuth(app);

// Export just what's needed
export { db, auth };