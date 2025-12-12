import React, { useState, useMemo } from 'react';
import { Booking } from '../../types';
import { Search, History } from 'lucide-react';
import { Input, Badge, Button, Dialog } from '../ui/Common';
import { format, parseISO } from 'date-fns';

interface StudentsViewProps {
  bookings: Booking[];
}

export const StudentsView = ({ bookings }: StudentsViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string | null>(null);

  // Group bookings by student email
  const students = useMemo(() => {
    const studentMap = new Map();
    bookings.forEach(b => {
      if (!studentMap.has(b.studentEmail)) {
        studentMap.set(b.studentEmail, {
          email: b.studentEmail,
          name: b.studentName,
          phone: b.studentPhone,
          bookings: []
        });
      }
      studentMap.get(b.studentEmail).bookings.push(b);
    });
    return Array.from(studentMap.values());
  }, [bookings]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudent = selectedStudentEmail ? students.find(s => s.email === selectedStudentEmail) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Student History</h2>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search students..." 
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="grid grid-cols-4 p-4 border-b bg-slate-50 font-medium text-sm text-slate-500">
           <div>Student Name</div>
           <div>Email</div>
           <div>Total Sessions</div>
           <div className="text-right">Actions</div>
        </div>
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No students found.</div>
        ) : (
          <div className="divide-y">
            {filteredStudents.map(student => (
              <div key={student.email} className="grid grid-cols-4 p-4 items-center hover:bg-slate-50 transition-colors">
                <div className="font-medium">{student.name}</div>
                <div className="text-sm text-slate-600">{student.email}</div>
                <div className="text-sm">
                  <Badge variant="outline" className="bg-slate-100">
                    {student.bookings.length} Bookings
                  </Badge>
                </div>
                <div className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelectedStudentEmail(student.email)}>
                    <History className="w-4 h-4 mr-2" />
                    View History
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student History Dialog */}
      <Dialog 
        open={!!selectedStudent} 
        onClose={() => setSelectedStudentEmail(null)} 
        title={`History: ${selectedStudent?.name}`}
      >
        <div className="space-y-4">
           <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded">
              <div><span className="font-bold">Email:</span> {selectedStudent?.email}</div>
              <div><span className="font-bold">Phone:</span> {selectedStudent?.phone}</div>
           </div>
           
           <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
             {selectedStudent?.bookings
               .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
               .map(booking => (
               <div key={booking.id} className="border rounded-lg p-3 text-sm hover:border-slate-400 transition-colors">
                 <div className="flex justify-between items-start mb-1">
                   <div className="font-bold">{format(parseISO(booking.startTime), 'MMM d, yyyy')}</div>
                   <Badge className={booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                     {booking.status}
                   </Badge>
                 </div>
                 <div className="flex justify-between text-slate-600">
                   <span>{format(parseISO(booking.startTime), 'HH:mm')} - {format(parseISO(booking.endTime), 'HH:mm')}</span>
                   {booking.isRecurring && <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">Recurring</span>}
                 </div>
                 {booking.note && <div className="mt-2 text-xs italic text-slate-500 bg-slate-50 p-2 rounded">"{booking.note}"</div>}
               </div>
             ))}
           </div>
        </div>
      </Dialog>
    </div>
  );
};