import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db, auth } from "../services/firebase";

const fetchLogs = async () => {
  const user = auth.currentUser;
  const q = query(
    collection(db, "logs"),
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
