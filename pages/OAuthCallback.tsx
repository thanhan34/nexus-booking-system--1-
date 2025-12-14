import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { exchangeCodeForTokens, saveTrainerCredentials } from '../services/calendar';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import app from '../services/firebase';

/**
 * OAuth Callback Page
 * Handles the redirect from Google OAuth after user authorizes
 * Exchanges authorization code for tokens and saves refresh token to Firestore
 */
export const OAuthCallback = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        // Handle OAuth errors
        if (error) {
          console.error('❌ OAuth error:', error, errorDescription);
          setErrorMessage(errorDescription || error);
          setStatus('error');
          
          // Redirect back to dashboard after 3 seconds
          setTimeout(() => navigate('/trainer-dashboard'), 3000);
          return;
        }

        // No code means something went wrong
        if (!code) {
          console.error('❌ No authorization code received');
          setErrorMessage('No authorization code received from Google');
          setStatus('error');
          setTimeout(() => navigate('/trainer-dashboard'), 3000);
          return;
        }

        // User must be logged in
        if (!user) {
          console.error('❌ No user logged in');
          setErrorMessage('You must be logged in to connect Google Calendar');
          setStatus('error');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        console.log('🔄 Processing OAuth callback...');
        console.log('👤 User:', user.email);
        console.log('🔑 Authorization code received');

        // Exchange authorization code for tokens
        setStatus('processing');
        const credentials = await exchangeCodeForTokens(code);

        console.log('✅ Tokens exchanged successfully');
        console.log('📧 Calendar email:', credentials.email);

        // Save refresh token to Firestore (in userCredentials collection)
        await saveTrainerCredentials(user.id, credentials);

        // Update user profile to mark calendar as connected
        const db = getFirestore(app);
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          googleCalendarConnected: true,
          googleCalendarEmail: credentials.email,
          googleRefreshToken: credentials.refreshToken, // Also save in user doc for easy access
          calendarDisconnectedReason: null,
          calendarDisconnectedAt: null,
          updatedAt: new Date().toISOString(),
        });

        // Also update trainers collection if exists
        try {
          const trainerRef = doc(db, 'trainers', user.id);
          await updateDoc(trainerRef, {
            googleCalendarConnected: true,
            googleCalendarEmail: credentials.email,
            googleRefreshToken: credentials.refreshToken,
            calendarDisconnectedReason: null,
            calendarDisconnectedAt: null,
          });
        } catch (err) {
          console.log('ℹ️ Trainer doc not found, using users collection only');
        }

        console.log('✅ User profile updated with calendar connection');

        // Update auth store
        useAuthStore.setState({
          user: {
            ...user,
            googleCalendarConnected: true,
            googleCalendarEmail: credentials.email,
            googleRefreshToken: credentials.refreshToken,
            calendarDisconnectedReason: undefined,
            calendarDisconnectedAt: undefined,
          },
        });

        setStatus('success');

        // Redirect to trainer dashboard after 2 seconds
        setTimeout(() => {
          navigate('/trainer-dashboard');
        }, 2000);
      } catch (error: any) {
        console.error('❌ Error processing OAuth callback:', error);
        setErrorMessage(error.message || 'Failed to connect Google Calendar');
        setStatus('error');

        // Redirect back to dashboard after 3 seconds
        setTimeout(() => navigate('/trainer-dashboard'), 3000);
      }
    };

    handleOAuthCallback();
  }, [user, navigate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          backgroundColor: '#fff',
        }}
      >
        {status === 'processing' && (
          <>
            <div
              style={{
                width: '60px',
                height: '60px',
                border: '4px solid #fedac2',
                borderTop: '4px solid #fc5d01',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px',
              }}
            />
            <h2 style={{ color: '#fc5d01', marginBottom: '10px' }}>
              Đang kết nối Google Calendar...
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Vui lòng đợi trong giây lát
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#4caf50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <span style={{ fontSize: '30px', color: '#fff' }}>✓</span>
            </div>
            <h2 style={{ color: '#4caf50', marginBottom: '10px' }}>
              Kết nối thành công!
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Google Calendar đã được kết nối. Đang chuyển hướng...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#f44336',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <span style={{ fontSize: '30px', color: '#fff' }}>✕</span>
            </div>
            <h2 style={{ color: '#f44336', marginBottom: '10px' }}>
              Kết nối thất bại
            </h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
              {errorMessage}
            </p>
            <p style={{ color: '#999', fontSize: '12px' }}>
              Đang chuyển hướng về trang chủ...
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OAuthCallback;
