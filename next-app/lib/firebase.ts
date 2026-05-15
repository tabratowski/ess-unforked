import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:
    process.env.FIREBASE_API_KEY || "AIzaSyBUOuz-pbt0RP4ajPn5ptG7W84Uw89u6Rc",
  authDomain:
    process.env.FIREBASE_AUTH_DOMAIN ||
    "wp-engine-headless-dev.firebaseapp.com",
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    "https://wp-engine-headless-dev.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "wp-engine-headless-dev",
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    "wp-engine-headless-dev.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "802264855197",
  appId:
    process.env.FIREBASE_APP_ID || "1:802264855197:web:b32fba5c9345ec19cb1a74",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
