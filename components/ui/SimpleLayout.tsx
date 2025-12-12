import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

export const SimpleLayout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-accent-pale text-slate-900">
      {/* Simple Header - Only Logo, No Login */}
      <nav className="border-b border-accent-pale/50 bg-white/80 backdrop-blur-md px-4 py-4 shadow-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl flex items-center justify-center">
          {/* Logo Section - Centered */}
          <Link to="/" className="flex items-center gap-3 font-bold text-2xl group transition-transform hover:scale-105">
            <div className="p-2 bg-gradient-to-br from-accent to-accent-light rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              PTE<span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">Intensive</span>
            </span>
          </Link>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};
