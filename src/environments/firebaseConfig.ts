// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAoBnPVOtY2amH8fcoAyKNHlZKkUwZpoBE",
  authDomain: "jobgogo-1b83c.firebaseapp.com",
  projectId: "jobgogo-1b83c",
  storageBucket: "jobgogo-1b83c.firebasestorage.app",
  messagingSenderId: "123818017020",
  appId: "1:123818017020:web:95f2ee20ffe06ed952d779",
  measurementId: "G-7P37C2ZVZZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);