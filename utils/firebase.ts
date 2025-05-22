import {getApp, getApps, initializeApp } from '@react-native-firebase/app';
import {getAuth} from '@react-native-firebase/auth';
import {collection, doc, getFirestore} from '@react-native-firebase/firestore';
import Constants from 'expo-constants';

// // Optionally import the services that you want to use
// // import {...} from "firebase/auth";
// // import {...} from "firebase/database";
// // import {...} from "firebase/firestore";
// // import {...} from "firebase/functions";
// // import {...} from "firebase/storage";
// Initialize Firebase
// react native will fill the correct config automatically
const firebaseConfig = {
    apiKey: "",
    appId:"",
    projectId:""
};


const app = getApps()? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const getUserDocRef = () => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    return doc(collection(firestore, "users"), user.uid);
};

export {app, auth, firestore, getUserDocRef};
// For more information on how to access Firebase in your project,
// // see the Firebase documentation: https://firebase.google.com/docs/web/setup#access-firebase

