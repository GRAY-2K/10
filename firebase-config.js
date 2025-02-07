const firebaseConfig = {
    apiKey: "AIzaSyCKX_fhVS7wuXysk1ddCg6m3cVtYpdcWO0",
    authDomain: "medical-equipment-details.firebaseapp.com",
    projectId: "medical-equipment-details",
    storageBucket: "medical-equipment-details.firebasestorage.app",
    messagingSenderId: "863027184737",
    appId: "1:863027184737:web:2afc922df244c6dd2e5620"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Optional: Enable offline persistence
db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
      console.log('The current browser does not support persistence.');
    }
  }); 
