import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCZhv1vd2OhnRDfBSplEEURhs86e6IcfAE",
  authDomain: "onlinecoaching-b1298.firebaseapp.com",
  projectId: "onlinecoaching-b1298",
  storageBucket: "onlinecoaching-b1298.firebasestorage.app",
  messagingSenderId: "420470190036",
  appId: "1:420470190036:web:804e09c68762461422f041"
};

import { getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc } from "firebase/firestore";
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export const fetchUsers = async () => {
  try {
    const usersCollection = collection(db, 'users');
    const trainersCollection = collection(db, 'trainers');
    
    const [usersSnapshot, trainersSnapshot] = await Promise.all([
      getDocs(usersCollection),
      getDocs(trainersCollection)
    ]);
    
    // Create a Map to merge users from both collections
    const usersMap = new Map<string, any>();
    
    // Add users from users collection
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log('🔍 [USERS COLLECTION] Doc ID:', doc.id, '| Raw data:', data);
      usersMap.set(doc.id, {
        id: doc.id,
        email: data.email || '',
        name: data.name || data.displayName || data.email?.split('@')[0] || 'Unknown User',
        role: data.role || 'user',
        slug: data.slug || ''
      });
    });
    
    // Merge trainers from trainers collection (update if exists, add if not)
    trainersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const existingUser = usersMap.get(doc.id);
      
      if (existingUser) {
        // Update existing user with trainer data (prioritize non-empty values)
        usersMap.set(doc.id, {
          id: doc.id,
          email: existingUser.email || data.email || '',
          name: existingUser.name || data.name || data.displayName || data.email?.split('@')[0] || 'Unknown User',
          role: existingUser.role || data.role || 'trainer',
          slug: existingUser.slug || data.slug || ''
        });
      } else {
        // Add new trainer
        usersMap.set(doc.id, {
          id: doc.id,
          email: data.email || '',
          name: data.name || data.displayName || data.email?.split('@')[0] || 'Unknown User',
          role: data.role || 'trainer',
          slug: data.slug || ''
        });
      }
    });
    
    const userList = Array.from(usersMap.values());
    console.log('📊 [FETCH USERS] Loaded', userList.length, 'users from both collections');
    userList.forEach(u => console.log('  👤', u.name, '| email:', u.email, '| role:', u.role, '| slug:', u.slug));
    
    return userList;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const updateUserRole = async (userId: string, role: string, email?: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userData: any = { role: role.toLowerCase() };
    
    // Nếu có email, lưu luôn email để dễ query
    if (email) {
      userData.email = email;
    }
    
    await setDoc(userRef, userData, { merge: true });
    console.log("User role updated successfully for:", email || userId);
  } catch (error) {
    console.error("Error updating user role:", error);
  }
};

export const updateUserSlug = async (userId: string, slug: string) => {
  try {
    // Update in users collection
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { slug }, { merge: true });
    console.log("✅ User slug updated in users collection for:", userId, "| slug:", slug);
    
    // Also update in trainers collection if exists
    try {
      const trainerRef = doc(db, 'trainers', userId);
      await setDoc(trainerRef, { slug }, { merge: true });
      console.log("✅ User slug updated in trainers collection for:", userId, "| slug:", slug);
    } catch (trainerError) {
      console.log("⚠️ Trainers collection update skipped (may not exist)");
    }
  } catch (error) {
    console.error("Error updating user slug:", error);
    throw error;
  }
};

export const updateUserInfo = async (userId: string, data: { name?: string; email?: string }) => {
  try {
    // Update in users collection
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, data, { merge: true });
    console.log("✅ User info updated in users collection for:", userId, "| data:", data);
    
    // Also update in trainers collection if exists
    try {
      const trainerRef = doc(db, 'trainers', userId);
      await setDoc(trainerRef, data, { merge: true });
      console.log("✅ User info updated in trainers collection for:", userId, "| data:", data);
    } catch (trainerError) {
      console.log("⚠️ Trainers collection update skipped (may not exist)");
    }
  } catch (error) {
    console.error("Error updating user info:", error);
    throw error;
  }
};

export const deleteUser = async (userId: string) => {
  try {
    const { deleteDoc } = await import("firebase/firestore");
    
    // Delete from users collection
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      console.log("✅ User deleted from users collection:", userId);
    } catch (error) {
      console.log("⚠️ Users collection delete skipped (may not exist)");
    }
    
    // Delete from trainers collection
    try {
      const trainerRef = doc(db, 'trainers', userId);
      await deleteDoc(trainerRef);
      console.log("✅ User deleted from trainers collection:", userId);
    } catch (error) {
      console.log("⚠️ Trainers collection delete skipped (may not exist)");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

export default app;
