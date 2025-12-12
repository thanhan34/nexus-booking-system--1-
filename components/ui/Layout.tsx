
import React from 'react';
import { useAuthStore } from '../../store';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Calendar, LayoutDashboard, User, Menu } from 'lucide-react';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-accent-pale text-slate-900">
      {/* Header with gradient background */}
      <nav className="border-b border-accent-pale/50 bg-white/80 backdrop-blur-md px-4 py-4 shadow-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-3 font-bold text-2xl group transition-transform hover:scale-105">
            <img 
              src="/images/white_logo-removebg-preview.png" 
              alt="PTE Intensive Logo" 
              className="w-24 h-24 object-contain transition-transform group-hover:scale-110"
            />
            <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              PTE<span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">Intensive</span>
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                {/* User Info */}
                <div className="flex items-center gap-3 px-4 py-2 bg-accent-pale/30 rounded-full border border-accent-pale">
                  <div className="p-1.5 bg-gradient-to-br from-accent-lighter to-accent-lightest rounded-full">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{user.name}</span>
                  <span className="px-2 py-0.5 bg-white rounded-full text-xs font-semibold text-accent">{user.role}</span>
                </div>
                
                {/* Navigation Links */}
                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-700 hover:bg-accent hover:text-white transition-all duration-200 hover:shadow-md"
                  >
                    Admin
                  </Link>
                )}
                {(user.role === 'trainer' || user.role === 'admin') && (
                  <Link 
                    to="/dashboard" 
                    className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-700 hover:bg-accent hover:text-white transition-all duration-200 hover:shadow-md"
                  >
                    Dashboard
                  </Link>
                )}
                
                {/* Logout Button */}
                <button 
                  onClick={handleLogout}
                  className="p-2.5 rounded-lg bg-gradient-to-br from-red-50 to-red-100 hover:from-red-500 hover:to-red-600 text-red-600 hover:text-white transition-all duration-200 hover:shadow-md group"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent to-accent-light text-white hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Trainer Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-accent-pale transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-accent-pale/50 animate-in slide-in-from-top duration-200">
            {user ? (
              <div className="flex flex-col gap-3">
                {/* User Info Mobile */}
                <div className="flex items-center gap-3 px-4 py-3 bg-accent-pale/30 rounded-lg border border-accent-pale">
                  <div className="p-1.5 bg-gradient-to-br from-accent-lighter to-accent-lightest rounded-full">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{user.name}</span>
                    <span className="text-xs text-slate-500 capitalize">{user.role}</span>
                  </div>
                </div>
                
                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 text-sm font-semibold rounded-lg text-slate-700 hover:bg-accent hover:text-white transition-all"
                  >
                    Admin
                  </Link>
                )}
                {(user.role === 'trainer' || user.role === 'admin') && (
                  <Link 
                    to="/dashboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 text-sm font-semibold rounded-lg text-slate-700 hover:bg-accent hover:text-white transition-all"
                  >
                    Dashboard
                  </Link>
                )}
                
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all text-left"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent to-accent-light text-white text-center"
              >
                Trainer Login
              </Link>
            )}
          </div>
        )}
      </nav>
      
      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};
