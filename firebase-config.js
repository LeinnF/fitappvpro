// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCddSMVKdnil-vGfYoHjCSysWRbBaV8iWk",
    authDomain: "fitapp-36e05.firebaseapp.com",
    projectId: "fitapp-36e05",
    storageBucket: "fitapp-36e05.firebasestorage.app",
    messagingSenderId: "240674207071",
    appId: "1:240674207071:web:974f60577b85de56f632ea"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();
