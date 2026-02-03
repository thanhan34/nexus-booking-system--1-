import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

export const SimpleLayout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-accent-pale text-slate-900 flex flex-col">
      {/* Simple Header - Only Logo, No Login */}
      <nav className="border-b border-accent-pale/50 bg-white/80 backdrop-blur-md px-4 py-4 shadow-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl flex items-center justify-center">
          {/* Logo Section - Centered */}
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
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="mx-auto max-w-7xl flex-1 p-4 md:p-6 lg:p-8">
        {children}
      </main>

      <footer className="border-t border-[#fedac2] bg-[#ffffff]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-[#fc5d01] md:flex-row">
          <span className="font-medium">© {new Date().getFullYear()} PTE Intensive. All rights reserved.</span>
          <div className="flex items-center gap-3 rounded-full border border-[#fdbc94] bg-[#fedac2] px-4 py-2">
            <Link
              to="/privacy-policy"
              className="font-semibold text-[#fc5d01] transition-colors hover:text-[#fd7f33]"
            >
              Chính sách bảo mật
            </Link>
            <span className="h-4 w-px bg-[#fdbc94]" aria-hidden="true" />
            <Link
              to="/terms-of-service"
              className="font-semibold text-[#fc5d01] transition-colors hover:text-[#fd7f33]"
            >
              Điều khoản sử dụng
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
