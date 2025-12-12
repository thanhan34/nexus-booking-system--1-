// Script để fix missing name và email cho users/trainers trong Firebase
// Chạy script này với: node fix-user-data.cjs

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyCZhv1vd2OhnRDfBSplEEURhs86e6IcfAE",
  authDomain: "onlinecoaching-b1298.firebaseapp.com",
  projectId: "onlinecoaching-b1298",
  storageBucket: "onlinecoaching-b1298.firebasestorage.app",
  messagingSenderId: "420470190036",
  appId: "1:420470190036:web:804e09c68762461422f041"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixUserData() {
  try {
    console.log('🚀 Starting data fix for users and trainers...\n');
    
    // Lấy dữ liệu từ cả 2 collections
    const usersCol = collection(db, 'users');
    const trainersCol = collection(db, 'trainers');
    
    const [usersSnapshot, trainersSnapshot] = await Promise.all([
      getDocs(usersCol),
      getDocs(trainersCol)
    ]);
    
    console.log(`📊 Found ${usersSnapshot.docs.length} documents in users collection`);
    console.log(`📊 Found ${trainersSnapshot.docs.length} documents in trainers collection\n`);
    
    // Tạo map để merge dữ liệu
    const userDataMap = new Map();
    
    // Thu thập data từ users collection
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`\n🔍 [USERS] Doc ID: ${doc.id}`);
      console.log(`   Name: ${data.name || '(empty)'}`);
      console.log(`   Email: ${data.email || '(empty)'}`);
      console.log(`   Role: ${data.role || '(empty)'}`);
      console.log(`   Slug: ${data.slug || '(empty)'}`);
      
      userDataMap.set(doc.id, {
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        role: data.role || 'user',
        slug: data.slug || '',
        source: 'users'
      });
    });
    
    // Thu thập data từ trainers collection
    trainersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`\n🔍 [TRAINERS] Doc ID: ${doc.id}`);
      console.log(`   Name: ${data.name || '(empty)'}`);
      console.log(`   Email: ${data.email || '(empty)'}`);
      console.log(`   Role: ${data.role || '(empty)'}`);
      console.log(`   Slug: ${data.slug || '(empty)'}`);
      
      const existing = userDataMap.get(doc.id);
      if (existing) {
        // Merge data, ưu tiên giá trị không rỗng
        userDataMap.set(doc.id, {
          id: doc.id,
          name: existing.name || data.name || '',
          email: existing.email || data.email || '',
          role: existing.role || data.role || 'trainer',
          slug: existing.slug || data.slug || '',
          source: 'both'
        });
      } else {
        userDataMap.set(doc.id, {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'trainer',
          slug: data.slug || '',
          source: 'trainers'
        });
      }
    });
    
    console.log('\n\n📝 MERGED DATA:');
    console.log('=====================================');
    
    let needsFix = 0;
    const fixes = [];
    
    userDataMap.forEach((userData, userId) => {
      console.log(`\n👤 User ID: ${userId}`);
      console.log(`   Name: ${userData.name || '❌ MISSING'}`);
      console.log(`   Email: ${userData.email || '❌ MISSING'}`);
      console.log(`   Role: ${userData.role}`);
      console.log(`   Slug: ${userData.slug || '(will auto-generate)'}`);
      console.log(`   Source: ${userData.source}`);
      
      if (!userData.name || !userData.email) {
        needsFix++;
        fixes.push({
          userId,
          missingName: !userData.name,
          missingEmail: !userData.email,
          currentData: userData
        });
      }
    });
    
    console.log('\n\n📊 SUMMARY:');
    console.log('=====================================');
    console.log(`Total users/trainers: ${userDataMap.size}`);
    console.log(`Users needing fixes: ${needsFix}`);
    
    if (needsFix > 0) {
      console.log('\n\n⚠️  ATTENTION REQUIRED:');
      console.log('=====================================');
      console.log('The following users are missing name or email:');
      fixes.forEach((fix, index) => {
        console.log(`\n${index + 1}. User ID: ${fix.userId}`);
        if (fix.missingName) console.log('   ❌ Missing NAME');
        if (fix.missingEmail) console.log('   ❌ Missing EMAIL');
        console.log(`   Current name: ${fix.currentData.name || '(none)'}`);
        console.log(`   Current email: ${fix.currentData.email || '(none)'}`);
      });
      
      console.log('\n\n💡 SOLUTIONS:');
      console.log('=====================================');
      console.log('1. Manually add name and email to these users in Firebase Console');
      console.log('2. Or, when they login with Google, their info will be auto-populated');
      console.log('3. Or, admin can edit their info in the Admin Dashboard');
    } else {
      console.log('\n✅ All users have complete data!');
    }
    
    console.log('\n\n✅ Data check completed!');
    
  } catch (error) {
    console.error('❌ Error during data check:', error);
  }
  
  process.exit(0);
}

// Chạy script
fixUserData();
