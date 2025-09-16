
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, setDoc, doc, serverTimestamp, updateDoc, getDoc, getDocs, query, orderBy, where, limit as firestoreLimit } from "firebase/firestore";
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
        await setDoc(doc(db, `users/${userId}/profile`, "main"), {
            ...profileData,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error saving user profile:", error);
        throw error;
    }
};

export const fetchUserProfile = async (userId) => {
    try {
        const profileDoc = doc(db, `users/${userId}/profile`, "main");
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

// Additional helper functions for the current code structure

export const fetchUserLogs = async (userId, limit = 50) => {
    try {
        console.log('Fetching logs for user:', userId); // Debug log
        const userLogsCollection = collection(db, `users/${userId}/logs`);
        const q = query(userLogsCollection, orderBy("createdAt", "desc"), firestoreLimit(limit));
        const snapshot = await getDocs(q);
        console.log('Snapshot size:', snapshot.size); // Debug log
        
        const logs = snapshot.docs.map(doc => { 
            const data = doc.data();
            console.log('Log data:', data); // Debug log
            return {
                id: doc.id, 
                ...data,
                // Ensure createdAt is properly formatted
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
            };
        });
        
        console.log('Processed logs:', logs); // Debug log
        return logs;
    } catch (error) {
        console.error("Error fetching user logs:", error);
        console.error("Error details:", error.message, error.code); // More detailed error
        throw error;
    }
};

export const fetchRecentLogs = async (userId, days = 7) => {
    try {
        const userLogsCollection = collection(db, `users/${userId}/logs`);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const q = query(
            userLogsCollection, 
            orderBy("createdAt", "desc"),
            where("createdAt", ">=", cutoffDate)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
        }));
    } catch (error) {
        console.error("Error fetching recent logs:", error);
        throw error;
    }
};

export const updateUserProfile = async (userId, updates) => {
    try {
        const profileDoc = doc(db, `users/${userId}/profile`, "main");
        await updateDoc(profileDoc, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
};
