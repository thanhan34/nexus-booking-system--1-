
import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDataStore } from '../store';
import { Card, Button, Badge } from '../components/ui/Common';
import { Clock, ArrowRight, User as UserIcon, Calendar, CheckCircle } from 'lucide-react';

export const TrainerBookingPage = () => {
  const { slug } = useParams();
  const { eventTypes, trainers, fetchData } = useDataStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debug logging
  console.log('🔍 [TrainerBookingPage] Looking for slug:', slug);
  console.log('👥 [TrainerBookingPage] Available trainers:', trainers.map(t => ({ name: t.name, slug: t.slug, id: t.id })));

  // Find trainer by slug
  const trainer = trainers.find(t => t.slug === slug);

  if (!trainer) {
    return (
      <div className="text-center mt-20">
        <h2 className="text-xl font-bold mb-4">Trainer not found</h2>
        <p className="text-slate-600 mb-4">Looking for slug: <code className="bg-slate-100 px-2 py-1 rounded">{slug}</code></p>
        <div className="mb-4">
          <p className="text-sm text-slate-500">Available trainers:</p>
          <div className="space-y-1 mt-2">
            {trainers.map(t => (
              <div key={t.id} className="text-xs">
                <Link to={`/trainer/${t.slug}`} className="text-blue-600 hover:underline">
                  {t.name} - slug: {t.slug || '(no slug)'}
                </Link>
              </div>
            ))}
          </div>
        </div>
        <Link to="/" className="text-blue-600 underline">Return to Home</Link>
      </div>
    );
  }

  // Show all active event types for this trainer
  const trainerEvents = eventTypes.filter(et => et.active);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <Card className="p-8 flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none">
        <div className="bg-white/10 p-4 rounded-full">
          <UserIcon className="w-16 h-16 text-white" />
        </div>
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-3xl font-bold">{trainer.name}</h1>
          <p className="text-slate-300">Professional Trainer at PTE Intensive</p>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
            <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/30 border-none">
              <CheckCircle className="w-3 h-3 mr-1" /> Available
            </Badge>
            {trainer.googleCalendarConnected && (
              <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-none">
                <Calendar className="w-3 h-3 mr-1" /> Google Calendar Synced
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Select a Session Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trainerEvents.length > 0 ? trainerEvents.map((eventType) => (
            <Card key={eventType.id} className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer border-l-4" style={{ borderLeftColor: eventType.color.includes('blue') ? '#3b82f6' : eventType.color.includes('purple') ? '#a855f7' : '#22c55e' }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-xl">{eventType.name}</h3>
                  <p className="text-sm text-slate-500">{eventType.description}</p>
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{eventType.durationMinutes} mins</span>
                </div>
              </div>
              
              <Link to={`/book/${eventType.id}?trainerId=${trainer.id}`} className="mt-6">
                <Button className="w-full group">
                  Book with {trainer.name.split(' ')[0]}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </Card>
          )) : (
            <div className="col-span-2 text-center py-12 text-slate-500 bg-slate-50 rounded-lg">
              No active session types available for this trainer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
