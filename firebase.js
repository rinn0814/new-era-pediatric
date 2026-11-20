import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBmjJt58G5XFxykN0MhzzgwzRGeCOekkM",
  authDomain: "new-era-pediatric.firebaseapp.com",
  projectId: "new-era-pediatric",
  storageBucket: "new-era-pediatric.firebasestorage.app",
  messagingSenderId: "441796543456",
  appId: "1:441796543456:web:79e51a79adca6832d1a185",
  measurementId: "G-EKDHPWJV76"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };