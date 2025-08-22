import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../services/firebase";

const saveLog = async (inputData, result) => {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, "logs"), {
      userId: user?.uid || "guest",
      ...inputData,
      ...result,
      createdAt: new Date()
    });
  } catch (error) {
    console.error("Error saving log: ", error);
  }
};
