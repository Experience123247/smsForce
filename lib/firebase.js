// Import Firebase core
// firebase/config.ts (WEB VERSION)

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";


// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCVWE08NsWw_Dtz91_BnpYHJss9o7v8H0I",
  authDomain: "goldsub-a3d7a.firebaseapp.com",
  projectId: "goldsub-a3d7a",
  storageBucket: "goldsub-a3d7a.firebasestorage.app",
  messagingSenderId: "1048863190673",
  appId: "1:1048863190673:web:cf32d27d7374bc1a4ed930",
  measurementId: "G-YZVQPBQ8ZM"
};

// Prevent Firebase re-initialization errors
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Web uses getAuth (NOT initializeAuth)
export const auth = getAuth(app);

export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
export const adminDb = getFirestore();
export default app;
