const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, setDoc } = require("firebase/firestore");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2s_JlvvzVkdLnz2p9VkvXPm-Y8vQk7is",
  authDomain: "nexus-booking-c61b4.firebaseapp.com",
  projectId: "nexus-booking-c61b4",
  storageBucket: "nexus-booking-c61b4.firebasestorage.app",
  messagingSenderId: "668480168404",
  appId: "1:668480168404:web:f8f9b0b5fd1b2cf0a3e4db"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Default availability - Monday to Friday 9am-5pm, multiple time slots
const defaultAvailability = [
  {
    day: 'monday',
    active: true,
    timeSlots: [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' }
    ]
  },
  {
    day: 'tuesday',
    active: true,
    timeSlots: [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' }
    ]
  },
  {
    day: 'wednesday',
    active: true,
    timeSlots: [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' }
    ]
  },
  {
    day: 'thursday',
    active: true,
    timeSlots: [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' }
    ]
  },
  {
    day: 'friday',
    active: true,
    timeSlots: [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' }
    ]
  },
  {
    day: 'saturday',
    active: false,
    timeSlots: []
  },
  {
    day: 'sunday',
    active: false,
    timeSlots: []
  }
];

async function fixTrainerAvailability() {
  console.log('🔧 [FIX] Starting trainer availability fix...\n');

  try {
    // Get all users
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);
    
    console.log('📊 [INFO] Found', usersSnapshot.docs.length, 'users in database\n');
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      console.log(`\n👤 [USER] ${userData.name || userData.email || userId}`);
      console.log(`   ID: ${userId}`);
      console.log(`   Email: ${userData.email || 'N/A'}`);
      console.log(`   Role: ${userData.role || 'N/A'}`);
      console.log(`   Has Availability: ${userData.availability ? 'YES' : 'NO'}`);
      
      // Check if user is a trainer and doesn't have availability
      if (!userData.availability || userData.availability.length === 0) {
        console.log(`   ⚠️ [ACTION] Adding default availability...`);
        
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, { availability: defaultAvailability }, { merge: true });
        
        console.log(`   ✅ [SUCCESS] Default availability added!`);
        fixedCount++;
      } else {
        console.log(`   ℹ️ [SKIP] User already has availability configured`);
        if (userData.availability) {
          // Show current availability summary
          const activeDays = userData.availability.filter(a => a.active).map(a => a.day);
          console.log(`   📅 Active days: ${activeDays.join(', ') || 'None'}`);
        }
        skippedCount++;
      }
    }
    
    // Also check trainers collection
    const trainersCollection = collection(db, "trainers");
    const trainersSnapshot = await getDocs(trainersCollection);
    
    console.log('\n📊 [INFO] Found', trainersSnapshot.docs.length, 'trainers in trainers collection\n');
    
    for (const trainerDoc of trainersSnapshot.docs) {
      const trainerData = trainerDoc.data();
      const trainerId = trainerDoc.id;
      
      console.log(`\n👤 [TRAINER] ${trainerData.name || trainerData.email || trainerId}`);
      console.log(`   ID: ${trainerId}`);
      console.log(`   Email: ${trainerData.email || 'N/A'}`);
      console.log(`   Has Availability: ${trainerData.availability ? 'YES' : 'NO'}`);
      
      if (!trainerData.availability || trainerData.availability.length === 0) {
        console.log(`   ⚠️ [ACTION] Adding default availability...`);
        
        const trainerRef = doc(db, "trainers", trainerId);
        await setDoc(trainerRef, { availability: defaultAvailability }, { merge: true });
        
        console.log(`   ✅ [SUCCESS] Default availability added!`);
        fixedCount++;
      } else {
        console.log(`   ℹ️ [SKIP] Trainer already has availability configured`);
        if (trainerData.availability) {
          const activeDays = trainerData.availability.filter(a => a.active).map(a => a.day);
          console.log(`   📅 Active days: ${activeDays.join(', ') || 'None'}`);
        }
        skippedCount++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 [COMPLETE] Availability fix completed!');
    console.log('='.repeat(50));
    console.log(`✅ Fixed: ${fixedCount} trainers`);
    console.log(`⏭️ Skipped: ${skippedCount} trainers (already configured)`);
    console.log('='.repeat(50));
    console.log('\n📋 [DEFAULT SCHEDULE]');
    console.log('Monday-Friday: 9:00-12:00, 13:00-17:00');
    console.log('Saturday-Sunday: Not available');
    console.log('\n💡 [TIP] Trainers can customize their availability in the Trainer Dashboard.');
    
  } catch (error) {
    console.error('❌ [ERROR] Failed to fix trainer availability:', error);
    throw error;
  }
}

// Run the fix
fixTrainerAvailability()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
