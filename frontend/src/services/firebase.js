
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, setDoc, doc, serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const saveMealLog = async (mealData) => {
    try {
        const { userId, ...rest } = mealData;
        const userLogsCollection = collection(db, `users/${userId}/logs`);
        const docRef = await addDoc(userLogsCollection, {
            ...rest,
            userId,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error saving meal log:", error);
        throw error;
    }
};

export const updateMealLogAnalysis = async (userId, logId, analysis) => {
    try {
        const logDoc = doc(db, `users/${userId}/logs/${logId}`);
        await updateDoc(logDoc, { analysis });
    } catch (error) {
        console.error("Error updating meal log analysis:", error);
        throw error;
    }
};


export const saveUserProfile = async (userId, profileData) => {
    try {
        await setDoc(doc(db, `users/${userId}/profile`, "main"), profileData);
    } catch (error) {
        console.error("Error saving user profile:", error);
        throw error;
    }
};

export const fetchUserProfile = async (userId) => {
    try {
        const profileDoc = await doc(db, `users/${userId}/profile`, "main");
        const snapshot = await getDoc(profileDoc);
        if (snapshot.exists()) {
            return snapshot.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
};
