  import { initializeApp } from "firebase/app";
import { getAuth,GoogleAuthProvider } from "firebase/auth";
  import { getFirestore } from "firebase/firestore";

  
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDXzQlSHAqXDE7nc5aVDcYp70z6mq9zUbU",
    authDomain: "es6-project-f8c1d.firebaseapp.com",
    projectId: "es6-project-f8c1d",
    storageBucket: "es6-project-f8c1d.firebasestorage.app",
    messagingSenderId: "842745916535",
    appId: "1:842745916535:web:c40ac9b3706d59ee53aa72"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  export const db = getFirestore(app);
  export const auth = getAuth(app);
  export const provider = new GoogleAuthProvider();