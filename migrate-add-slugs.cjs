// Script để thêm slug cho tất cả trainers trong Firebase
// Chạy script này với: node migrate-add-slugs.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

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

// Hàm tạo slug từ tên
function createSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

async function migrateAddSlugs() {
  try {
    console.log('🚀 Starting migration to add slugs...');
    
    // Lấy tất cả users
    const usersCol = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCol);
    
    console.log(`📊 Found ${usersSnapshot.docs.length} users`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Chỉ xử lý trainers/admin (không phải regular users)
      if (!userData.role || !['trainer', 'admin', 'support'].includes(userData.role.toLowerCase())) {
        console.log(`  ⏭️  Skipping user ${userData.email} - not a trainer/admin`);
        skipped++;
        continue;
      }
      
      // Nếu đã có slug, skip
      if (userData.slug) {
        console.log(`  ✓ User ${userData.name || userData.email} already has slug: ${userData.slug}`);
        skipped++;
        continue;
      }
      
      // Tạo slug từ name hoặc email
      const name = userData.name || userData.email?.split('@')[0] || 'trainer';
      const slug = createSlug(name);
      
      // Cập nhật slug
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { slug }, { merge: true });
      
      console.log(`  ✅ Added slug "${slug}" for ${userData.name || userData.email}`);
      updated++;
    }
    
    console.log('\n✨ Migration completed!');
    console.log(`   Updated: ${updated} trainers`);
    console.log(`   Skipped: ${skipped} users`);
    console.log('\n💡 Tip: Bạn có thể tùy chỉnh slug trong Admin Dashboard sau khi đăng nhập.');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

// Chạy migration
migrateAddSlugs();
