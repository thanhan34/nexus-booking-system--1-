import React, { useEffect } from 'react';
import { useDataStore } from '../store';
import { Card, Button, Badge } from '../components/ui/Common';
import { Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Home = () => {
  const { eventTypes, fetchData } = useDataStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <Badge className="mx-auto w-fit bg-[#fedac2] text-[#fc5d01]">PTE Intensive Booking</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Book a Session</h1>
        <p className="text-lg text-slate-600">Select a learning activity to get started.</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-[#fc5d01]">
          <Link
            to="/privacy-policy"
            className="rounded-full border border-[#fdbc94] bg-[#fedac2] px-4 py-2 transition-colors hover:text-[#fd7f33]"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms-of-service"
            className="rounded-full border border-[#fdbc94] bg-[#fedac2] px-4 py-2 transition-colors hover:text-[#fd7f33]"
          >
            Terms of Service
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventTypes.filter(et => et.active).map((eventType) => (
          <Card key={eventType.id} className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer border-t-4" style={{ borderTopColor: eventType.color.includes('blue') ? '#3b82f6' : eventType.color.includes('purple') ? '#a855f7' : '#22c55e' }}>
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
            
            <Link to={`/book/${eventType.id}`} className="mt-6">
              <Button className="w-full group">
                Book Now
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};