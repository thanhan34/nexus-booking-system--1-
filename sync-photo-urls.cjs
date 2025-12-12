const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function syncPhotoUrls() {
  console.log('🚀 Starting photoURL sync...');
  
  try {
    // Get all users from Firebase Authentication
    const listUsersResult = await auth.listUsers();
    console.log(`📊 Found ${listUsersResult.users.length} users in Firebase Auth`);
    
    // Get all trainers from Firestore
    const usersSnapshot = await db.collection('users').get();
    const trainersSnapshot = await db.collection('trainers').get();
    
    console.log(`📊 Found ${usersSnapshot.size} users in Firestore users collection`);
    console.log(`📊 Found ${trainersSnapshot.size} trainers in Firestore trainers collection`);
    
    let updateCount = 0;
    
    // Sync photoURL for each Firebase Auth user
    for (const authUser of listUsersResult.users) {
      if (authUser.photoURL) {
        console.log(`\n👤 Processing: ${authUser.displayName || authUser.email}`);
        console.log(`   📸 Photo URL: ${authUser.photoURL}`);
        
        // Update in users collection by UID
        try {
          const userDocRef = db.collection('users').doc(authUser.uid);
          const userDoc = await userDocRef.get();
          
          if (userDoc.exists) {
            await userDocRef.set({ photoUrl: authUser.photoURL }, { merge: true });
            console.log(`   ✅ Updated photoUrl in users collection (by UID)`);
            updateCount++;
          }
        } catch (error) {
          console.log(`   ⚠️ Failed to update users collection:`, error.message);
        }
        
        // Also try to update by email in both collections
        if (authUser.email) {
          // Update in users collection by email
          try {
            const usersQuery = await db.collection('users')
              .where('email', '==', authUser.email)
              .get();
            
            if (!usersQuery.empty) {
              for (const doc of usersQuery.docs) {
                await doc.ref.set({ photoUrl: authUser.photoURL }, { merge: true });
                console.log(`   ✅ Updated photoUrl in users collection (by email)`);
                updateCount++;
              }
            }
          } catch (error) {
            console.log(`   ⚠️ Failed to update users by email:`, error.message);
          }
          
          // Update in trainers collection
          try {
            const trainersQuery = await db.collection('trainers')
              .where('email', '==', authUser.email)
              .get();
            
            if (!trainersQuery.empty) {
              for (const doc of trainersQuery.docs) {
                await doc.ref.set({ photoUrl: authUser.photoURL }, { merge: true });
                console.log(`   ✅ Updated photoUrl in trainers collection`);
                updateCount++;
              }
            }
          } catch (error) {
            console.log(`   ⚠️ Failed to update trainers:`, error.message);
          }
        }
      } else {
        console.log(`\n👤 ${authUser.displayName || authUser.email} - No photo URL`);
      }
    }
    
    console.log(`\n✅ Sync completed! Updated ${updateCount} documents`);
    
  } catch (error) {
    console.error('❌ Error syncing photo URLs:', error);
  }
  
  process.exit(0);
}

syncPhotoUrls();
