
import { create } from 'zustand';
import { User, EventType, Booking, BlockedSlot, ExternalBooking } from './types';
import app from './services/firebase';
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, updateDoc, query, where } from "firebase/firestore";
import { addDays } from 'date-fns';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { 
  createBookingCalendarEvent, 
  deleteBookingCalendarEvent,
  CalendarDisconnectedError 
} from './services/calendar';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

interface DataState {
  eventTypes: EventType[];
  trainers: User[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  externalBookings: ExternalBooking[];
  fetchData: () => Promise<void>;
  
  // Bookings
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => Promise<Booking>;
  addRecurringBooking: (bookingData: any, start: Date, duration: number, weeks: number) => Promise<void>;
  syncMissingCalendarEvents: (trainerId: string) => Promise<{ synced: number; failed: number }>;
  updateBookingStatus: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  updateRecurringBooking: (groupId: string, updateData: Partial<Booking>) => Promise<void>;
  deleteRecurringBooking: (groupId: string) => Promise<void>;
  
  // Users/Trainers
  addTrainer: (userData: Partial<User>) => Promise<void>;
  removeTrainer: (id: string) => Promise<void>;
  updateUserAvailability: (userId: string, availability: any) => Promise<void>;
  updateUserProfile: (userId: string, data: Partial<User>) => Promise<void>;
  
  // Event Types
  addEventType: (eventType: Omit<EventType, 'id'>) => Promise<void>;
  updateEventType: (id: string, eventType: Partial<EventType>) => Promise<void>;

  // Blocked Slots
  addBlockedSlot: (data: Omit<BlockedSlot, 'id'>) => Promise<void>;
  removeBlockedSlot: (trainerId: string, date: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  login: async (email) => {
    const auth = getAuth(app);
    const db = getFirestore(app);
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error("No authenticated user");
    }
    
    // Kiểm tra user bằng UID trước (chính xác nhất)
    console.log('🔍 [LOGIN] Checking users collection by UID:', currentUser.uid);
    try {
      const usersCollection = collection(db, "users");
      const allUsersSnapshot = await getDocs(usersCollection);
      const userDoc = allUsersSnapshot.docs.find(doc => doc.id === currentUser.uid);
      
      if (userDoc && userDoc.exists()) {
        const userData = userDoc.data() as User;
        const userRole = (userData.role || 'trainer').toLowerCase();
        console.log('✅ [LOGIN] Found user by UID, role:', userRole);
        set({ 
          user: { 
            id: currentUser.uid, 
            email: currentUser.email || email, 
            name: currentUser.displayName || userData.name || '', 
            role: userRole, 
            availability: userData.availability 
          } 
        });
        return;
      }
    } catch (error) {
      console.error('⚠️ [LOGIN] Error checking users by UID:', error);
    }
    
    // Kiểm tra users collection bằng email
    console.log('🔍 [LOGIN] Checking users collection by email:', email);
    const usersRef = collection(db, "users");
    const userQuery = query(usersRef, where("email", "==", email));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data() as User;
      const userRole = (userData.role || 'trainer').toLowerCase();
      console.log('✅ [LOGIN] Found user by email, role:', userRole);
      set({ 
        user: { 
          id: currentUser.uid, 
          email: currentUser.email || email, 
          name: currentUser.displayName || userData.name || '', 
          role: userRole, 
          availability: userData.availability 
        } 
      });
      return;
    }
    
    // Nếu không tìm thấy trong users, kiểm tra trong trainers
    console.log('🔍 [LOGIN] Checking trainers collection by email:', email);
    const trainersRef = collection(db, "trainers");
    const trainerQuery = query(trainersRef, where("email", "==", email));
    const trainerSnapshot = await getDocs(trainerQuery);

    if (!trainerSnapshot.empty) {
      const trainer = trainerSnapshot.docs[0].data() as User;
      const trainerRole = (trainer.role || 'trainer').toLowerCase();
      console.log('✅ [LOGIN] Found trainer by email, role:', trainerRole);
      set({ 
        user: { 
          id: currentUser.uid, 
          email: currentUser.email || email, 
          name: currentUser.displayName || trainer.name || '', 
          role: trainerRole, 
          availability: trainer.availability 
        } 
      });
    } else {
      throw new Error("Invalid trainer email");
    }
  },
  logout: async () => {
    const auth = getAuth(app);
    await signOut(auth);
    set({ user: null });
  },
  init: async () => {
    console.log('🚀 [INIT] Starting auth initialization...');
    const auth = getAuth(app);
    auth.onAuthStateChanged(async (user) => {
      console.log('🔄 [AUTH STATE CHANGED] User:', user ? user.email : 'null');
      
      if (user) {
        console.log('✅ [USER DETECTED]', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        
        const db = getFirestore(app);
        
        // Helper function to generate slug from name or email
        const generateSlug = (name?: string, email?: string): string => {
          if (name) {
            return name.toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
              .replace(/\s+/g, '-')         // Replace spaces with hyphens
              .replace(/-+/g, '-')          // Replace multiple hyphens with single
              .trim();
          }
          if (email) {
            return email.split('@')[0].toLowerCase()
              .replace(/[^a-z0-9-]/g, '-')
              .replace(/-+/g, '-');
          }
          return 'trainer-' + Date.now();
        };
        
        // Helper function to ensure user has a slug
        const ensureUserSlug = async (userId: string, userData: any, docRef: any) => {
          if (!userData.slug) {
            const newSlug = generateSlug(userData.name, userData.email || user.email);
            console.log('🔧 [AUTO-SLUG] Generating slug for user:', newSlug);
            try {
              const { setDoc } = await import("firebase/firestore");
              await setDoc(docRef, { slug: newSlug }, { merge: true });
              userData.slug = newSlug;
              console.log('✅ [AUTO-SLUG] Slug saved to database:', newSlug);
            } catch (error) {
              console.error('⚠️ [AUTO-SLUG] Failed to save slug:', error);
            }
          }
          return userData;
        };
        
        // Kiểm tra trong collection users bằng userId trước (cho document cũ không có email)
        console.log('🔍 [STEP 1] Checking users collection by UID:', user.uid);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDocs(query(collection(db, "users")));
          console.log('📦 [USERS COLLECTION] Total documents found:', userDocSnap.docs.length);
          
          userDocSnap.docs.forEach(d => {
            console.log('  📄 Document ID:', d.id, '| Data:', d.data());
          });
          
          const userDoc = userDocSnap.docs.find(d => d.id === user.uid);
          
          if (userDoc && userDoc.exists()) {
            let userData = userDoc.data() as User;
            const userRole = userData.role || 'trainer';
            
            // Ensure user has a slug
            userData = await ensureUserSlug(user.uid, userData, userDocRef);
            
            // Save photoUrl to database if available
            if (user.photoURL && user.photoURL !== userData.photoUrl) {
              try {
                const { setDoc } = await import("firebase/firestore");
                await setDoc(userDocRef, { photoUrl: user.photoURL }, { merge: true });
                userData.photoUrl = user.photoURL;
                console.log('💾 [PHOTO SYNC] Saved photoUrl to database:', user.photoURL);
              } catch (error) {
                console.error('⚠️ [PHOTO SYNC] Failed to save photoUrl:', error);
              }
            }
            
            console.log('✅✅✅ [SUCCESS - UID MATCH] Found user by UID!', {
              uid: user.uid,
              role: userRole,
              roleLowerCase: userRole.toLowerCase(),
              email: userData.email,
              slug: userData.slug,
              availability: userData.availability,
              photoUrl: user.photoURL || userData.photoUrl
            });
            set({ 
              user: { 
                id: user.uid, 
                email: user.email || '', 
                name: user.displayName || userData.name || '', 
                role: userRole.toLowerCase(), 
                availability: userData.availability,
                slug: userData.slug,
                googleCalendarConnected: userData.googleCalendarConnected,
                googleCalendarEmail: userData.googleCalendarEmail,
                photoUrl: user.photoURL || userData.photoUrl
              }, 
              loading: false 
            });
            console.log('💾 [STORE UPDATED] User role set to:', userRole.toLowerCase());
            console.log('💾 [SLUG LOADED]:', userData.slug);
            console.log('💾 [AVAILABILITY LOADED]:', userData.availability);
            return;
          } else {
            console.log('❌ [UID MATCH] No document found with UID:', user.uid);
          }
        } catch (error) {
          console.error('⚠️ [ERROR] Error checking user by UID:', error);
        }
        
        // Nếu không tìm thấy bằng UID, kiểm tra bằng email trong collection users
        console.log('🔍 [STEP 2] Checking users collection by email:', user.email);
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("email", "==", user.email));
        const userSnapshot = await getDocs(userQuery);
        console.log('📊 [EMAIL QUERY] Found', userSnapshot.docs.length, 'documents');
        
        if (!userSnapshot.empty) {
          let userData = userSnapshot.docs[0].data() as User;
          const userRole = userData.role || 'trainer';
          const userDocRef = doc(db, "users", userSnapshot.docs[0].id);
          
          // Ensure user has a slug
          userData = await ensureUserSlug(userSnapshot.docs[0].id, userData, userDocRef);
          
          console.log('✅✅✅ [SUCCESS - EMAIL MATCH] Found user by email!', {
            email: user.email,
            role: userRole,
            slug: userData.slug,
            roleLowerCase: userRole.toLowerCase(),
            photoUrl: user.photoURL || userData.photoUrl
          });
          set({ 
            user: { 
              id: user.uid, 
              email: user.email || '', 
              name: user.displayName || userData.name || '', 
              role: userRole.toLowerCase(), 
              availability: userData.availability,
              slug: userData.slug,
              googleCalendarConnected: userData.googleCalendarConnected,
              googleCalendarEmail: userData.googleCalendarEmail,
              photoUrl: user.photoURL || userData.photoUrl
            }, 
            loading: false 
          });
          console.log('💾 [STORE UPDATED] User role set to:', userRole.toLowerCase());
          console.log('💾 [SLUG LOADED]:', userData.slug);
          return;
        }
        
        // Fallback: kiểm tra trong trainers
        console.log('🔍 [STEP 3] Checking trainers collection by email:', user.email);
        const trainersRef = collection(db, "trainers");
        const trainerQuery = query(trainersRef, where("email", "==", user.email));
        const trainerSnapshot = await getDocs(trainerQuery);
        console.log('📊 [TRAINERS QUERY] Found', trainerSnapshot.docs.length, 'documents');
        
        if (!trainerSnapshot.empty) {
          let trainerData = trainerSnapshot.docs[0].data() as User;
          const trainerDocRef = doc(db, "trainers", trainerSnapshot.docs[0].id);
          
          // Ensure trainer has a slug
          trainerData = await ensureUserSlug(trainerSnapshot.docs[0].id, trainerData, trainerDocRef);
          
          console.log('✅ [SUCCESS - TRAINER MATCH] Found trainer by email:', user.email);
          set({ 
            user: { 
              id: user.uid, 
              email: user.email || '', 
              name: user.displayName || trainerData.name || '', 
              role: trainerData.role?.toLowerCase() || 'trainer', 
              availability: trainerData.availability,
              slug: trainerData.slug,
              googleCalendarConnected: trainerData.googleCalendarConnected,
              googleCalendarEmail: trainerData.googleCalendarEmail
            }, 
            loading: false 
          });
          console.log('💾 [STORE UPDATED] User role set to: trainer');
          console.log('💾 [SLUG LOADED]:', trainerData.slug);
        } else {
          // Mặc định là trainer nếu không tìm thấy
          console.log('⚠️ [NO MATCH] No user found in any collection, defaulting to trainer role');
          const defaultSlug = generateSlug(user.displayName, user.email);
          set({ 
            user: { 
              id: user.uid, 
              email: user.email || '', 
              name: user.displayName || '', 
              role: 'trainer',
              slug: defaultSlug
            }, 
            loading: false 
          });
          console.log('💾 [STORE UPDATED] User role set to: trainer (default)');
          console.log('💾 [DEFAULT SLUG]:', defaultSlug);
        }
      } else {
        console.log('❌ [NO USER] User is null, setting user to null');
        set({ user: null, loading: false });
      }
    });
  }
}));

export const useDataStore = create<DataState>((set, get) => ({
  eventTypes: [],
  trainers: [],
  bookings: [],
  blockedSlots: [],
  externalBookings: [],
  
  fetchData: async () => {
    const db = getFirestore(app);
    const eventTypesCol = collection(db, "eventTypes");
    const usersCol = collection(db, "users");
    const trainersCol = collection(db, "trainers");
    const bookingsCol = collection(db, "bookings");
    const blockedSlotsCol = collection(db, "blockedSlots");

    const [eventTypesSnapshot, usersSnapshot, trainersSnapshot, bookingsSnapshot, blockedSlotsSnapshot] = await Promise.all([
      getDocs(eventTypesCol),
      getDocs(usersCol),
      getDocs(trainersCol),
      getDocs(bookingsCol),
      getDocs(blockedSlotsCol)
    ]);

    const eventTypes = eventTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EventType[];
    
    // Lấy trainers từ cả users và trainers collections
    const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
    const trainersData = trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
    
    // Merge cả 2, ưu tiên users collection (vì có thể có thông tin mới hơn)
    const trainersMap = new Map<string, User>();
    
    // Thêm trainers từ trainers collection trước
    trainersData.forEach(trainer => {
      trainersMap.set(trainer.id, trainer);
    });
    
    // Thêm users có role là trainer, admin hoặc support (override nếu đã tồn tại)
    usersData.forEach(user => {
      if (user.role && ['trainer', 'admin', 'support'].includes(user.role.toLowerCase())) {
        trainersMap.set(user.id, user);
      }
    });
    
    const trainers = Array.from(trainersMap.values());
    
    console.log('📊 [FETCH DATA] Loaded trainers:', trainers.length, 'trainers');
    trainers.forEach(t => console.log('  👤', t.name, '| slug:', t.slug, '| role:', t.role));
    
    const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
    const blockedSlots = blockedSlotsSnapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, trainerId: data.trainerId, date: data.date } as BlockedSlot;
    });

    console.log('📊 [FETCH DATA] Loaded blocked slots:', blockedSlots.length);

    set({ eventTypes, trainers, bookings, blockedSlots, externalBookings: [] });
  },

  addBooking: async (bookingData) => {
    const db = getFirestore(app);
    const bookingRef = collection(db, "bookings");
    
    // STEP 1: Always create booking in database first (this must succeed)
    const docRef = await addDoc(bookingRef, bookingData);
    let newBooking = { id: docRef.id, ...bookingData } as Booking;
    
    console.log('✅ Booking created in database:', docRef.id);
    
    // STEP 2: Try to create Google Calendar event (best-effort, non-blocking)
    try {
      const { trainers, eventTypes } = get();
      const trainer = trainers.find(t => t.id === bookingData.trainerId);
      const eventType = eventTypes.find(et => et.id === bookingData.eventTypeId);
      
      // Only attempt calendar event if trainer has connected Google Calendar
      if (trainer && trainer.email && eventType && trainer.googleCalendarConnected) {
        console.log('🗓️ Creating Google Calendar event...');
        console.log('📧 Trainer:', trainer.name, '|', trainer.email);
        console.log('👤 Student:', bookingData.studentName, '|', bookingData.studentEmail);
        console.log('🆔 Booking ID:', docRef.id);
        
        if (trainer.zoomMeetingLink) {
          console.log('🎥 Zoom Link:', trainer.zoomMeetingLink);
        }
        
        const eventId = await createBookingCalendarEvent(
          trainer.id,
          trainer.email,
          bookingData.studentEmail,
          eventType.name,
          trainer.name || 'Trainer',
          bookingData.studentName,
          new Date(bookingData.startTime),
          new Date(bookingData.endTime),
          trainer.zoomMeetingLink,
          bookingData.note,
          bookingData.studentTimezone,
          docRef.id
        );
        
        // Update booking with calendar event ID
        await updateDoc(docRef, {
          calendarEventId: eventId
        });
        
        newBooking = {
          ...newBooking,
          calendarEventId: eventId
        };
        
        console.log('✅ Google Calendar event created and invitation sent to student');
      } else {
        if (!trainer) {
          console.log('ℹ️ Skipping calendar event: trainer not found');
        } else if (!trainer.googleCalendarConnected) {
          console.log('ℹ️ Skipping calendar event: trainer has not connected Google Calendar');
        } else {
          console.log('ℹ️ Skipping calendar event: missing trainer or event type info');
        }
      }
    } catch (calendarError: any) {
      // Handle CalendarDisconnectedError - mark calendar as disconnected
      if (calendarError instanceof CalendarDisconnectedError && calendarError.reason !== 'network_error') {
        console.error('⚠️ Calendar disconnected:', calendarError.message);
        console.log('📝 Marking calendar as disconnected for trainer:', bookingData.trainerId);
        
        try {
          // Update trainer profile to mark calendar as disconnected
          const { setDoc } = await import("firebase/firestore");
          const userRef = doc(db, 'users', bookingData.trainerId);
          await setDoc(userRef, {
            googleCalendarConnected: false,
            calendarDisconnectedReason: calendarError.reason,
            calendarDisconnectedAt: new Date().toISOString(),
          }, { merge: true });
          
          // Also update trainers collection if exists
          try {
            const trainerRef = doc(db, 'trainers', bookingData.trainerId);
            await setDoc(trainerRef, {
              googleCalendarConnected: false,
              calendarDisconnectedReason: calendarError.reason,
              calendarDisconnectedAt: new Date().toISOString(),
            }, { merge: true });
          } catch (err) {
            // Trainer doc might not exist, that's ok
          }
          
          console.log('✅ Calendar marked as disconnected, trainer will need to reconnect');
        } catch (updateError) {
          console.error('❌ Failed to update disconnected status:', updateError);
        }
      } else if (calendarError instanceof CalendarDisconnectedError && calendarError.reason === 'network_error') {
        // IMPORTANT: Temporary network errors should NOT disconnect calendar
        console.warn('🌐 Temporary Google Calendar network error. Keeping calendar connected.');
        console.warn('📝 Booking is saved and can be synced to calendar later.');
      } else {
        // Other errors (network, etc.)
        console.error('❌ Calendar event creation failed:', calendarError);
        console.error('Error details:', calendarError.message);
      }
      
      // IMPORTANT: Booking still succeeds even if calendar fails
      console.log('✅ Booking created successfully (calendar event failed but booking is saved)');
    }
    
    set((state) => ({ bookings: [...state.bookings, newBooking] }));
    return newBooking;
  },

  addRecurringBooking: async (bookingData, start, duration, weeks) => {
    const db = getFirestore(app);
    const bookingRef = collection(db, "bookings");
    const groupId = `grp_${Date.now()}`;
    const newBookings: Booking[] = [];
    const { trainers, eventTypes } = get();
    const trainer = trainers.find(t => t.id === bookingData.trainerId);
    const eventType = eventTypes.find(et => et.id === bookingData.eventTypeId);
    
    let calendarErrorOccurred = false;
    let calendarDisconnected = false;

    for (let i = 0; i < weeks; i++) {
      const currentStart = addDays(start, i * 7);
      const currentEnd = new Date(currentStart.getTime() + duration * 60000);

      const booking = {
        ...bookingData,
        startTime: currentStart.toISOString(),
        endTime: currentEnd.toISOString(),
        status: 'confirmed',
        isRecurring: true,
        recurringGroupId: groupId
      };
      
      // STEP 1: Always create booking in database first (this must succeed)
      const docRef = await addDoc(bookingRef, booking);
      let newBooking = { id: docRef.id, ...booking } as Booking;
      
      console.log(`✅ Recurring booking ${i + 1}/${weeks} created in database:`, docRef.id);
      
      // STEP 2: Try to create Google Calendar event (best-effort, non-blocking)
      // Only attempt if calendar hasn't been marked as disconnected and no errors yet
      if (!calendarDisconnected && !calendarErrorOccurred && trainer && trainer.email && eventType && trainer.googleCalendarConnected) {
        try {
          console.log(`🗓️ Creating Google Calendar event ${i + 1}/${weeks}...`);
          
          const eventId = await createBookingCalendarEvent(
            trainer.id,
            trainer.email,
            bookingData.studentEmail,
            eventType.name,
            trainer.name || 'Trainer',
            bookingData.studentName,
            currentStart,
            currentEnd,
            trainer.zoomMeetingLink,
            bookingData.note,
            bookingData.studentTimezone,
            docRef.id
          );
          
          // Update booking with calendar event ID
          await updateDoc(docRef, {
            calendarEventId: eventId
          });
          
          newBooking = {
            ...newBooking,
            calendarEventId: eventId
          };
          
          console.log(`✅ Google Calendar event ${i + 1}/${weeks} created successfully`);
        } catch (calendarError: any) {
          // Handle CalendarDisconnectedError - mark calendar as disconnected
          if (calendarError instanceof CalendarDisconnectedError && calendarError.reason !== 'network_error') {
            console.error(`⚠️ Calendar disconnected at booking ${i + 1}/${weeks}:`, calendarError.message);
            calendarDisconnected = true;
            
            // Mark calendar as disconnected in database (only once)
            if (i === 0) {
              try {
                const { setDoc } = await import("firebase/firestore");
                const userRef = doc(db, 'users', bookingData.trainerId);
                await setDoc(userRef, {
                  googleCalendarConnected: false,
                  calendarDisconnectedReason: calendarError.reason,
                  calendarDisconnectedAt: new Date().toISOString(),
                }, { merge: true });
                
                // Also update trainers collection if exists
                try {
                  const trainerRef = doc(db, 'trainers', bookingData.trainerId);
                  await setDoc(trainerRef, {
                    googleCalendarConnected: false,
                    calendarDisconnectedReason: calendarError.reason,
                    calendarDisconnectedAt: new Date().toISOString(),
                  }, { merge: true });
                } catch (err) {
                  // Trainer doc might not exist, that's ok
                }
                
                console.log('✅ Calendar marked as disconnected, skipping remaining calendar events');
              } catch (updateError) {
                console.error('❌ Failed to update disconnected status:', updateError);
              }
            }
          } else if (calendarError instanceof CalendarDisconnectedError && calendarError.reason === 'network_error') {
            console.warn(`🌐 Temporary calendar network error at booking ${i + 1}/${weeks}. Will keep calendar connected.`);
            calendarErrorOccurred = true;
          } else {
            // Other errors (network, etc.)
            console.error(`❌ Calendar event ${i + 1}/${weeks} creation failed:`, calendarError.message);
            calendarErrorOccurred = true;
          }
          
          // IMPORTANT: Booking still succeeds even if calendar fails
          console.log(`✅ Recurring booking ${i + 1}/${weeks} saved (calendar event failed but booking is saved)`);
        }
      } else {
        if (!trainer) {
          console.log(`ℹ️ Skipping calendar event ${i + 1}/${weeks}: trainer not found`);
        } else if (calendarDisconnected) {
          console.log(`ℹ️ Skipping calendar event ${i + 1}/${weeks}: calendar already disconnected`);
        } else if (calendarErrorOccurred) {
          console.log(`ℹ️ Skipping calendar event ${i + 1}/${weeks}: previous calendar error occurred`);
        } else if (!trainer.googleCalendarConnected) {
          console.log(`ℹ️ Skipping calendar event ${i + 1}/${weeks}: trainer has not connected Google Calendar`);
        } else {
          console.log(`ℹ️ Skipping calendar event ${i + 1}/${weeks}: missing trainer or event type info`);
        }
      }
      
      newBookings.push(newBooking);
    }
    
    console.log(`✅ All ${weeks} recurring bookings created successfully`);
    if (calendarDisconnected) {
      console.log('⚠️ Note: Calendar events were not created due to disconnected calendar');
    } else if (calendarErrorOccurred) {
      console.log('⚠️ Note: Some calendar events may not have been created due to errors');
    }

    set((state) => ({ bookings: [...state.bookings, ...newBookings] }));
  },

  syncMissingCalendarEvents: async (trainerId: string) => {
    const db = getFirestore(app);
    const { bookings, trainers, eventTypes } = get();

    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer || !trainer.googleCalendarConnected || !trainer.email) {
      return { synced: 0, failed: 0 };
    }

    const pendingBookings = bookings.filter(b =>
      b.trainerId === trainerId &&
      b.status === 'confirmed' &&
      !b.calendarEventId &&
      new Date(b.endTime) > new Date()
    );

    if (pendingBookings.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const booking of pendingBookings) {
      const eventType = eventTypes.find(et => et.id === booking.eventTypeId);
      if (!eventType) {
        failed += 1;
        continue;
      }

      try {
        const eventId = await createBookingCalendarEvent(
          trainer.id,
          trainer.email,
          booking.studentEmail,
          eventType.name,
          trainer.name || 'Trainer',
          booking.studentName,
          new Date(booking.startTime),
          new Date(booking.endTime),
          trainer.zoomMeetingLink,
          booking.note,
          booking.studentTimezone,
          booking.id
        );

        const bookingRef = doc(db, "bookings", booking.id);
        await updateDoc(bookingRef, { calendarEventId: eventId });
        synced += 1;
      } catch (error: any) {
        failed += 1;
        console.error(`❌ Failed to sync calendar event for booking ${booking.id}:`, error);

        if (error instanceof CalendarDisconnectedError && error.reason !== 'network_error') {
          try {
            const { setDoc } = await import("firebase/firestore");
            const userRef = doc(db, 'users', trainerId);
            await setDoc(userRef, {
              googleCalendarConnected: false,
              calendarDisconnectedReason: error.reason,
              calendarDisconnectedAt: new Date().toISOString(),
            }, { merge: true });

            try {
              const trainerRef = doc(db, 'trainers', trainerId);
              await setDoc(trainerRef, {
                googleCalendarConnected: false,
                calendarDisconnectedReason: error.reason,
                calendarDisconnectedAt: new Date().toISOString(),
              }, { merge: true });
            } catch {
              // Trainer doc may not exist
            }
          } catch (disconnectUpdateError) {
            console.error('❌ Failed to mark calendar disconnected while syncing missing events:', disconnectUpdateError);
          }

          // Stop syncing further events if token is invalid/revoked
          break;
        }
      }
    }

    await get().fetchData();
    return { synced, failed };
  },

  updateBookingStatus: async (id, status) => {
    const db = getFirestore(app);
    const bookingRef = doc(db, "bookings", id);
    
    // If cancelling, try to delete Google Calendar event first
    if (status === 'cancelled') {
      const { trainers, bookings } = get();
      const booking = bookings.find(b => b.id === id);
      
      if (booking && booking.calendarEventId) {
        const trainer = trainers.find(t => t.id === booking.trainerId);
        
        if (trainer && trainer.googleCalendarConnected) {
          try {
            console.log('🗓️ Deleting Google Calendar event:', booking.calendarEventId);
            await deleteBookingCalendarEvent(booking.trainerId, booking.calendarEventId);
            console.log('✅ Calendar event deleted, email notification sent to student');
          } catch (calendarError: any) {
            // Don't fail the cancellation if calendar deletion fails
            console.error('⚠️ Failed to delete calendar event:', calendarError);
            console.log('📧 Manual notification may be required');
            
            // If calendar deletion fails (404 or other), still proceed with database update
            if (calendarError.message && !calendarError.message.includes('404')) {
              console.warn('⚠️ Calendar event deletion failed but continuing with cancellation');
            }
          }
        } else {
          console.log('ℹ️ No Google Calendar connected, skipping calendar event deletion');
        }
      } else {
        console.log('ℹ️ No calendar event ID found for this booking');
      }
    }
    
    // Update booking status in database
    await updateDoc(bookingRef, { status });
    console.log(`✅ Booking ${id} status updated to ${status} in database`);
    
    // Update local state immediately
    set((state) => ({
      bookings: state.bookings.map(b => b.id === id ? { ...b, status } : b)
    }));
    
    // Fetch fresh data to ensure sync across all views
    console.log('🔄 Refreshing all booking data to sync status...');
    await get().fetchData();
    console.log('✅ All data refreshed - status should now be visible to all users');
  },

  addTrainer: async (userData) => {
    const db = getFirestore(app);
    const trainerRef = collection(db, "trainers");
    try {
      const docRef = await addDoc(trainerRef, userData);
      const newTrainer = { id: docRef.id, ...userData } as User;
      set((state) => ({ trainers: [...state.trainers, newTrainer] }));
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  },

  removeTrainer: async (id) => {
    const db = getFirestore(app);
    await deleteDoc(doc(db, "trainers", id));
    set((state) => ({ trainers: state.trainers.filter(t => t.id !== id) }));
  },

  updateUserAvailability: async (userId, availability) => {
    const db = getFirestore(app);
    const { setDoc } = await import("firebase/firestore");
    
    // Update in users collection (use setDoc with merge to create if not exists)
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, { availability }, { merge: true });
      console.log('✅ Updated availability in users collection');
    } catch (error) {
      console.log('⚠️ Users collection update failed:', error);
    }
    
    // Also try to update in trainers collection
    try {
      const trainerRef = doc(db, "trainers", userId);
      await setDoc(trainerRef, { availability }, { merge: true });
      console.log('✅ Updated availability in trainers collection');
    } catch (error) {
      console.log('⚠️ Trainers collection update failed:', error);
    }
    
    set((state) => ({
      trainers: state.trainers.map(t => t.id === userId ? { ...t, availability } : t)
    }));
  },

  updateUserProfile: async (userId, data) => {
    const db = getFirestore(app);
    const { setDoc } = await import("firebase/firestore");
    
    // Update in users collection (use setDoc with merge to create if not exists)
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, data, { merge: true });
      console.log('✅ Updated user profile in users collection');
    } catch (error) {
      console.log('⚠️ Users collection update failed:', error);
    }
    
    // Also try to update in trainers collection
    try {
      const trainerRef = doc(db, "trainers", userId);
      await setDoc(trainerRef, data, { merge: true });
      console.log('✅ Updated user profile in trainers collection');
    } catch (error) {
      console.log('⚠️ Trainers collection update failed:', error);
    }
    
    // Update local state
    set((state) => ({
      trainers: state.trainers.map(t => t.id === userId ? { ...t, ...data } : t)
    }));
    
    // Update auth store if this is the current user
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.id === userId) {
      useAuthStore.setState({
        user: { ...currentUser, ...data }
      });
    }
  },

  addEventType: async (eventTypeData) => {
    const db = getFirestore(app);
    const eventTypesRef = collection(db, "eventTypes");
    const docRef = await addDoc(eventTypesRef, eventTypeData);
    const newEventType = { id: docRef.id, ...eventTypeData } as EventType;
    set((state) => ({ eventTypes: [...state.eventTypes, newEventType] }));
  },

  updateEventType: async (id, eventTypeData) => {
    const db = getFirestore(app);
    const eventTypeRef = doc(db, "eventTypes", id);
    await updateDoc(eventTypeRef, eventTypeData);
    set((state) => ({
      eventTypes: state.eventTypes.map(et => et.id === id ? { ...et, ...eventTypeData } : et)
    }));
  },

  addBlockedSlot: async (data) => {
    const db = getFirestore(app);
    const blockedSlotsRef = collection(db, "blockedSlots");
    const docRef = await addDoc(blockedSlotsRef, data);
    const newBlockedSlot = { id: docRef.id, ...data } as any;
    set((state) => ({ blockedSlots: [...state.blockedSlots, newBlockedSlot] }));
  },

  removeBlockedSlot: async (trainerId: string, date: string) => {
    const db = getFirestore(app);
    const blockedSlotsRef = collection(db, "blockedSlots");
    const q = query(blockedSlotsRef, where("trainerId", "==", trainerId), where("date", "==", date));
    const snapshot = await getDocs(q);
    
    snapshot.docs.forEach(async (document) => {
      await deleteDoc(doc(db, "blockedSlots", document.id));
    });
    
    set((state) => ({
      blockedSlots: state.blockedSlots.filter(b => !(b.trainerId === trainerId && b.date === date))
    }));
  },

  updateRecurringBooking: async (groupId: string, updateData: Partial<Booking>) => {
    const db = getFirestore(app);
    const { trainers, bookings, eventTypes } = get();
    const { updateCalendarEvent } = await import('./services/calendar');
    
    // Find all bookings in this recurring group
    const groupBookings = bookings.filter(b => b.recurringGroupId === groupId);
    
    if (groupBookings.length === 0) {
      throw new Error('No bookings found for this recurring group');
    }
    
    console.log(`📝 Updating ${groupBookings.length} recurring bookings in group:`, groupId);
    
    const trainer = trainers.find(t => t.id === groupBookings[0].trainerId);
    const eventType = eventTypes.find(et => et.id === groupBookings[0].eventTypeId);
    
    let calendarErrorOccurred = false;
    let calendarDisconnected = false;
    
    // Update each booking in the group
    for (let i = 0; i < groupBookings.length; i++) {
      const booking = groupBookings[i];
      const bookingRef = doc(db, "bookings", booking.id);
      
      try {
        // Update booking in database
        await updateDoc(bookingRef, updateData);
        console.log(`✅ Booking ${i + 1}/${groupBookings.length} updated in database:`, booking.id);
        
        // Try to update Google Calendar event if it exists
        if (!calendarDisconnected && !calendarErrorOccurred && booking.calendarEventId && trainer?.googleCalendarConnected) {
          try {
            console.log(`🗓️ Updating Google Calendar event ${i + 1}/${groupBookings.length}...`);
            
            const calendarUpdate: any = {};
            
            // Update summary if student name changed
            if (updateData.studentName && eventType) {
              calendarUpdate.summary = `${eventType.name} - ${updateData.studentName}`;
            }
            
            // Update description if note changed
            if (updateData.note !== undefined) {
              // Rebuild description with updated note
              const vietnamTZ = 'Asia/Ho_Chi_Minh';
              const startTime = new Date(booking.startTime);
              const dateFormatOptions: Intl.DateTimeFormatOptions = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                timeZoneName: 'short'
              };
              
              const vietnamTimeStr = startTime.toLocaleString('vi-VN', { ...dateFormatOptions, timeZone: vietnamTZ });
              
              let description = `📚 ${eventType?.name || 'Session'}\n`;
              description += `👤 Học viên: ${updateData.studentName || booking.studentName}\n`;
              description += `📧 Email: ${updateData.studentEmail || booking.studentEmail}\n`;
              description += `👨‍🏫 Giảng viên: ${trainer?.name || 'Trainer'}\n\n`;
              
              description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              description += `⏰ THỜI GIAN HỌC\n`;
              description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              description += `🇻🇳 Giờ Việt Nam: ${vietnamTimeStr}\n`;
              
              if (trainer?.zoomMeetingLink) {
                description += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                description += `🎥 THÔNG TIN THAM GIA ZOOM\n`;
                description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                description += trainer.zoomMeetingLink;
                description += `\n\n💡 Lưu ý: Vui lòng tham gia đúng giờ để không bỏ lỡ buổi học.`;
              }
              
              if (updateData.note) {
                description += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                description += `📝 GHI CHÚ\n`;
                description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                description += updateData.note;
              }
              
              const baseUrl = window.location.origin || 'https://pte-intensive-booking.vercel.app';
              const cancelUrl = `${baseUrl}/cancel-booking/${booking.id}`;
              const rescheduleUrl = `${baseUrl}/reschedule-booking/${booking.id}`;
              
              description += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              description += `📌 QUẢN LÝ LỊCH HỌC\n`;
              description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;     
              description += `📅 Đổi lịch học: ${rescheduleUrl}\n`;
              description += `❌ Hủy lịch học: ${cancelUrl}\n`;
              
              description += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              description += `Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ giảng viên qua email: ${trainer?.email}`;
              
              calendarUpdate.description = description;
            }
            
            // Update attendees if email changed
            if (updateData.studentEmail) {
              calendarUpdate.attendees = [
                { email: updateData.studentEmail, displayName: updateData.studentName || booking.studentName }
              ];
            }
            
            await updateCalendarEvent(booking.trainerId, booking.calendarEventId, calendarUpdate);
            console.log(`✅ Google Calendar event ${i + 1}/${groupBookings.length} updated successfully`);
          } catch (calendarError: any) {
            if (calendarError instanceof CalendarDisconnectedError) {
              console.error(`⚠️ Calendar disconnected at booking ${i + 1}/${groupBookings.length}:`, calendarError.message);
              calendarDisconnected = true;
            } else {
              console.error(`❌ Calendar event ${i + 1}/${groupBookings.length} update failed:`, calendarError.message);
              calendarErrorOccurred = true;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Failed to update booking ${i + 1}/${groupBookings.length}:`, error);
        throw error;
      }
    }
    
    console.log(`✅ All ${groupBookings.length} recurring bookings updated successfully`);
    
    // Refresh data to sync state
    await get().fetchData();
  },

  deleteRecurringBooking: async (groupId: string) => {
    const db = getFirestore(app);
    const { trainers, bookings } = get();
    
    // Find all bookings in this recurring group
    const groupBookings = bookings.filter(b => b.recurringGroupId === groupId);
    
    if (groupBookings.length === 0) {
      throw new Error('No bookings found for this recurring group');
    }
    
    console.log(`🗑️ Deleting ${groupBookings.length} recurring bookings in group:`, groupId);
    
    const trainer = trainers.find(t => t.id === groupBookings[0].trainerId);
    
    let calendarErrorOccurred = false;
    let calendarDisconnected = false;
    
    // Delete each booking in the group
    for (let i = 0; i < groupBookings.length; i++) {
      const booking = groupBookings[i];
      
      try {
        // Try to delete Google Calendar event first
        if (!calendarDisconnected && !calendarErrorOccurred && booking.calendarEventId && trainer?.googleCalendarConnected) {
          try {
            console.log(`🗓️ Deleting Google Calendar event ${i + 1}/${groupBookings.length}...`);
            await deleteBookingCalendarEvent(booking.trainerId, booking.calendarEventId);
            console.log(`✅ Google Calendar event ${i + 1}/${groupBookings.length} deleted successfully`);
          } catch (calendarError: any) {
            if (calendarError instanceof CalendarDisconnectedError) {
              console.error(`⚠️ Calendar disconnected at booking ${i + 1}/${groupBookings.length}:`, calendarError.message);
              calendarDisconnected = true;
            } else {
              console.error(`❌ Calendar event ${i + 1}/${groupBookings.length} deletion failed:`, calendarError.message);
              calendarErrorOccurred = true;
            }
          }
        }
        
        // Delete booking from database
        const bookingRef = doc(db, "bookings", booking.id);
        await deleteDoc(bookingRef);
        console.log(`✅ Booking ${i + 1}/${groupBookings.length} deleted from database:`, booking.id);
      } catch (error) {
        console.error(`❌ Failed to delete booking ${i + 1}/${groupBookings.length}:`, error);
        throw error;
      }
    }
    
    console.log(`✅ All ${groupBookings.length} recurring bookings deleted successfully`);
    
    // Refresh data to sync state
    await get().fetchData();
  }
}));
