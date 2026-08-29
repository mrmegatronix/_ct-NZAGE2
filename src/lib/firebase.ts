import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "ct-id-scanner-2026",
  appId: "1:267111315007:web:c7dd4217978fc1a4b12a8a",
  storageBucket: "ct-id-scanner-2026.firebasestorage.app",
  apiKey: "AIzaSyB5bUf6EWYrpGeMfxmqq96xQmUTqCzSioc",
  authDomain: "ct-id-scanner-2026.firebaseapp.com",
  messagingSenderId: "267111315007",
  projectNumber: "267111315007"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
