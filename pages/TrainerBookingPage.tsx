
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDataStore } from '../store';
import { Card, Button, Badge } from '../components/ui/Common';
import { Clock, ArrowRight, User as UserIcon, Calendar, CheckCircle, Star, Award, Loader2 } from 'lucide-react';

export const TrainerBookingPage = () => {
  const { slug } = useParams();
  const { eventTypes, trainers, fetchData } = useDataStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    loadData();
  }, [fetchData]);

  // Debug logging
  console.log('🔍 [TrainerBookingPage] Looking for slug:', slug);
  console.log('👥 [TrainerBookingPage] Available trainers:', trainers.map(t => ({ name: t.name, slug: t.slug, id: t.id })));

  // Find trainer by slug
  const trainer = trainers.find(t => t.slug === slug);

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg font-medium">Loading trainer profile...</p>
        </div>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="text-center mt-20 px-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8">
          <div className="w-20 h-20 bg-accent-pale rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-slate-800">Trainer not found</h2>
          <p className="text-slate-600 mb-6">Looking for: <code className="bg-accent-pale px-3 py-1 rounded-lg text-accent font-semibold">{slug}</code></p>
          <div className="mb-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-semibold text-slate-700 mb-3">Available trainers:</p>
            <div className="space-y-2">
              {trainers.map(t => (
                <Link 
                  key={t.id} 
                  to={`/trainer/${t.slug}`} 
                  className="block text-sm px-4 py-2 bg-white rounded-lg hover:bg-accent-pale hover:text-accent transition-all border border-slate-200 hover:border-accent"
                >
                  {t.name} - {t.slug || '(no slug)'}
                </Link>
              ))}
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-accent hover:text-accent-light font-semibold transition-colors">
            <ArrowRight className="w-4 h-4 rotate-180" /> Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Show all active event types for this trainer
  const trainerEvents = eventTypes.filter(et => et.active);

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 py-6">
      {/* Enhanced Profile Header with Orange Theme */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent via-accent-light to-accent-lighter opacity-95"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-lightest/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
        
        {/* Content */}
        <div className="relative p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="bg-white/95 p-1 rounded-3xl shadow-xl backdrop-blur-sm transform hover:scale-105 transition-transform">
                {trainer.photoUrl ? (
                  <img 
                    src={trainer.photoUrl} 
                    alt={trainer.name} 
                    className="w-32 h-32 rounded-3xl object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-32 h-32 rounded-3xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center ${trainer.photoUrl ? 'hidden' : 'flex'}`}
                >
                  <UserIcon className="w-16 h-16 text-white" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                <Award className="w-6 h-6 text-accent" />
              </div>
            </div>
            
            {/* Trainer Info */}
            <div className="text-center md:text-left space-y-4 flex-1">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                  {trainer.name}
                </h1>
                <p className="text-xl text-white/90 font-medium">Professional Trainer at PTE Intensive</p>
              </div>
              
              {/* Status Badges */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                <div className="flex items-center gap-2 bg-white/95 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-semibold text-slate-700">Available Now</span>
                </div>
                {trainer.googleCalendarConnected && (
                  <div className="flex items-center gap-2 bg-white/95 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-semibold text-slate-700">Calendar Synced</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-white/95 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-semibold text-slate-700">Top Rated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Types Section */}
      <div className="space-y-6">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Select a Session Type</h2>
          <p className="text-slate-600">Choose the perfect session for your learning goals</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trainerEvents.length > 0 ? trainerEvents.map((eventType) => (
            <div 
              key={eventType.id} 
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100 hover:border-accent-light"
            >
              {/* Card Top Border */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-accent-light to-accent-lighter"></div>
              
              <div className="p-6 md:p-7">
                <div className="space-y-5">
                  {/* Header */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-2xl text-slate-800 group-hover:text-accent transition-colors">
                        {eventType.name}
                      </h3>
                      <div className="w-12 h-12 rounded-xl bg-accent-pale flex items-center justify-center group-hover:bg-accent group-hover:scale-110 transition-all">
                        <Clock className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{eventType.description}</p>
                  </div>
                  
                  {/* Duration Info */}
                  <div className="flex items-center gap-3 p-4 bg-accent-pale rounded-xl">
                    <Clock className="w-5 h-5 text-accent" />
                    <span className="font-semibold text-slate-700">{eventType.durationMinutes} minutes session</span>
                  </div>
                  
                  {/* Book Button */}
                  <Link to={`/book/${eventType.id}?trainerId=${trainer.id}`} className="block">
                    <button className="w-full group/btn bg-gradient-to-r from-accent to-accent-light hover:from-accent-light hover:to-accent text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3">
                      <span>Book with {trainer.name.split(' ')[0]}</span>
                      <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-2 text-center py-16 bg-gradient-to-br from-slate-50 to-accent-pale/30 rounded-2xl border-2 border-dashed border-slate-300">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <Calendar className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-slate-600">No active session types available</p>
              <p className="text-sm text-slate-500 mt-2">Please check back later</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
