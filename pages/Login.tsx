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
      
      const normalizedRole = currentUser?.role?.toLowerCase();
      if (normalizedRole === 'admin') {
        console.log('➡️ [LOGIN] Navigating to /admin dashboard');
        navigate('/admin');
      } else if (normalizedRole === 'support') {
        console.log('➡️ [LOGIN] Navigating to /support dashboard');
        navigate('/support');
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
          
          const normalizedRole = currentUser?.role?.toLowerCase();
          if (normalizedRole === 'admin') {
            console.log('➡️ [LOGIN] Navigating to /admin dashboard');
            navigate('/admin');
          } else if (normalizedRole === 'support') {
            console.log('➡️ [LOGIN] Navigating to /support dashboard');
            navigate('/support');
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
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and Welcome Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent-light blur-2xl opacity-20 rounded-full"></div>
              <img 
                src="/images/white_logo-removebg-preview.png" 
                alt="PTE Intensive Logo" 
                className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-slate-600 text-lg">Sign in to access your trainer dashboard</p>
        </div>

        {/* Login Card */}
        <Card className="p-8 shadow-2xl border-none bg-white/80 backdrop-blur-sm">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}
          
          <Button 
            className="w-full bg-gradient-to-r from-accent to-accent-light hover:from-accent-light hover:to-accent text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 text-base" 
            onClick={handleGoogleSignIn}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
            </svg>
            Sign in with Google
          </Button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Trainers, support, and administrators only
            </p>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            Need help? Contact{' '}
            <a href="mailto:support@pteintensive.com" className="text-accent font-semibold hover:text-accent-light transition-colors">
              support@pteintensive.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
