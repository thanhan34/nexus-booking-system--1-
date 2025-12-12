import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Card, Button } from '../components/ui/Common';
import { auth, googleAuthProvider } from '../services/firebase';
import { signInWithPopup, getRedirectResult, GoogleAuthProvider, User } from 'firebase/auth';
import { updateUserRole } from '../services/firebase';

export const Login = () => {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleGoogleSignIn = async () => {
    console.log('🔵 [LOGIN] Sign In button clicked');
    try {
      console.log('🔵 [LOGIN] Calling signInWithPopup...');
      const result = await signInWithPopup(auth, googleAuthProvider);
      console.log('🟢 [LOGIN] signInWithPopup SUCCESS! User:', result.user.email);
      
      // Xử lý ngay sau khi đăng nhập thành công
      const user = result.user;
      
      // Auto-save user info from Google to Firebase
      console.log('💾 [LOGIN] Auto-saving user info from Google:', {
        name: user.displayName,
        email: user.email
      });
      
      const { updateUserInfo } = await import('../services/firebase');
      if (user.displayName || user.email) {
        await updateUserInfo(user.uid, {
          name: user.displayName || undefined,
          email: user.email || undefined
        });
      }
      
      if (user.email === 'dtan42@gmail.com') {
        console.log('👑 [LOGIN] Admin detected! Updating user role to admin');
        await updateUserRole(user.uid, 'admin', user.email);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('🔄 [LOGIN] Calling login function');
      await login(user.email || '');
      
      const currentUser = useAuthStore.getState().user;
      console.log('📊 [LOGIN] Current user from store:', currentUser);
      
      if (currentUser?.role === 'admin' || currentUser?.role?.toLowerCase() === 'admin') {
        console.log('➡️ [LOGIN] Navigating to /admin dashboard');
        navigate('/admin');
      } else {
        console.log('➡️ [LOGIN] Navigating to /dashboard, role:', currentUser?.role);
        navigate('/dashboard');
      }
      
    } catch (err: any) {
      console.error('🔴 [LOGIN ERROR]', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    console.log('🟡 [LOGIN useEffect] Hook triggered');
    
    // Kiểm tra redirect result
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('🟢 [REDIRECT RESULT] Got redirect result:', result.user?.email);
        } else {
          console.log('🟡 [REDIRECT RESULT] No redirect result (this is normal on first load)');
        }
      })
      .catch((error) => {
        console.error('🔴 [REDIRECT ERROR]', error);
        setError(error.message);
      });
    
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      console.log('🟣 [LOGIN onAuthStateChanged] User:', user ? user.email : 'null');
      
      if (user) {
        console.log('🟢 [LOGIN] User authenticated:', user.email);
        
        // Auto-save user info from Google to Firebase
        console.log('💾 [LOGIN onAuth] Auto-saving user info from Google:', {
          name: user.displayName,
          email: user.email
        });
        
        const { updateUserInfo } = await import('../services/firebase');
        if (user.displayName || user.email) {
          await updateUserInfo(user.uid, {
            name: user.displayName || undefined,
            email: user.email || undefined
          });
        }
        
        // Đặc biệt xử lý cho admin
        if (user.email === 'dtan42@gmail.com') {
          console.log('👑 [LOGIN] Admin detected! Updating user role to admin for dtan42@gmail.com');
          await updateUserRole(user.uid, 'admin', user.email);
          
          // Thêm một delay nhỏ để đảm bảo Firestore đã cập nhật
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('🔄 [LOGIN] Calling login function with email:', user.email);
        try {
          await login(user.email || '');
          
          // Lấy user role từ store sau khi login
          const currentUser = useAuthStore.getState().user;
          console.log('📊 [LOGIN] Current user from store:', currentUser);
          
          if (currentUser?.role === 'admin') {
            console.log('➡️ [LOGIN] Navigating to /admin dashboard');
            navigate('/admin');
          } else {
            console.log('➡️ [LOGIN] Navigating to /dashboard, role:', currentUser?.role);
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('🔴 [LOGIN] Login error:', error);
        }
      }
    });

    return () => unsubscribeAuth();
  }, [navigate, login]);

  return (
    <div className="flex justify-center items-center mt-20">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Trainer Login</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button className="w-full" onClick={handleGoogleSignIn}>Sign In with Google</Button>
      </Card>
    </div>
  );
};
