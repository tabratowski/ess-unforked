import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBUOuz-pbt0RP4ajPn5ptG7W84Uw89u6Rc",
  authDomain: "wp-engine-headless-dev.firebaseapp.com",
  databaseURL: "https://wp-engine-headless-dev.firebaseio.com",
  projectId: "wp-engine-headless-dev",
  storageBucket: "wp-engine-headless-dev.firebasestorage.app",
  messagingSenderId: "802264855197",
  appId: "1:802264855197:web:b32fba5c9345ec19cb1a74",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
