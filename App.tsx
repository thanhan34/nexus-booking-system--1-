
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { BookingPage } from './pages/BookingPage';
import { TrainerBookingPage } from './pages/TrainerBookingPage';
import { SuccessPage } from './pages/SuccessPage';
import { TrainerDashboard } from './pages/TrainerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { Login } from './pages/Login';
import { useAuthStore } from './store';
import { Layout } from './components/ui/Layout';
import { SimpleLayout } from './components/ui/SimpleLayout';
import { Toaster } from 'react-hot-toast';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode, allowedRoles: string[] }) => {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role (case-insensitive)
  const userRoleLower = user.role.toLowerCase();
  const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRoleLower);
  
  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <HashRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        
        {/* Standard Flow: Select Event -> Select Trainer - Use SimpleLayout for students */}
        <Route path="/book/:eventTypeId" element={<SimpleLayout><BookingPage /></SimpleLayout>} />
        
        {/* New Flow: Trainer Specific Page via Slug - Use SimpleLayout for students */}
        <Route path="/trainer/:slug" element={<SimpleLayout><TrainerBookingPage /></SimpleLayout>} />
        
        <Route path="/success/:bookingId" element={<SimpleLayout><SuccessPage /></SimpleLayout>} />
        <Route path="/login" element={<Layout><Login /></Layout>} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['trainer', 'admin', 'support']}>
              <Layout><TrainerDashboard /></Layout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'support']}>
              <Layout><AdminDashboard /></Layout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </HashRouter>
  );
};

export default App;
