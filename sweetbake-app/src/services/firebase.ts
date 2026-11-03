import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web & Client Firebase configuration for project sweetbake-e8a2d
const firebaseConfig = {
  projectId: "sweetbake-e8a2d",
  appId: "1:797419622937:web:0a26415a1cb9c7d1d6d088",
  storageBucket: "sweetbake-e8a2d.firebasestorage.app",
  apiKey: "AIzaSyBVIt8GAoiE1vjghQ48Qox1K9PlaqdVNzQ",
  authDomain: "sweetbake-e8a2d.firebaseapp.com",
  messagingSenderId: "797419622937",
  measurementId: "G-TF2KDWQN7X"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence for React Native / Expo
let auth: Auth;
try {
  const getPersistence = (FirebaseAuth as any).getReactNativePersistence;
  if (typeof getPersistence === 'function') {
    auth = initializeAuth(app, {
      persistence: getPersistence(AsyncStorage),
    });
  } else {
    auth = getAuth(app);
  }
} catch {
  auth = getAuth(app);
}

// Initialize Cloud Firestore
const db = getFirestore(app);

export { app, auth, db };
