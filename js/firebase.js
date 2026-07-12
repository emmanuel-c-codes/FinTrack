// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Replace these with the keys from your Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDxEVqDcUXHz2NSQukAsO2WhKON9BRlv20",
  authDomain: "expense-6f605.firebaseapp.com",
  projectId: "expense-6f605",
  storageBucket: "expense-6f605.firebasestorage.app",
  messagingSenderId: "646593076641",
  appId: "1:646593076641:web:0d9c62b355824fa7be3fe0",
  measurementId: "G-QSES7Q0770"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // Export the database object