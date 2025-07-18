// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCEboLBvYMX-vFL9GrY4iqmyyAMoVJ16ZQ",
  authDomain: "payment-manager-matias.firebaseapp.com",
  projectId: "payment-manager-matias",
  storageBucket: "payment-manager-matias.firebasestorage.app",
  messagingSenderId: "1049050572828",
  appId: "1:1049050572828:web:464d0ba8c3f738435b97d9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;