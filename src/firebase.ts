import { FirebaseApp, initializeApp } from "firebase/app";
import { Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
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
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app: FirebaseApp = initializeApp(firebaseConfig);

initializeFirestore(app, {
    cache: {
        persistence: true,
        cacheMaxSize: CACHE_SIZE_UNLIMITED
    }
});

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

export { db, auth };
