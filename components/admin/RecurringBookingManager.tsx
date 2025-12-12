import React, { useState } from 'react';
import { useDataStore } from '../../store';
import { Card, Button, Input, Select, Badge } from '../ui/Common';
import { Repeat, Calendar, Clock, User, Mail, Phone, AlertCircle, Check } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import toast from 'react-hot-toast';
import { z } from 'zod';

const recurringBookingSchema = z.object({
  studentName: z.string().min(2, "Tên học viên bắt buộc"),
  studentEmail: z.string().email("Email không hợp lệ"),
  studentPhone: z.string().min(8, "Số điện thoại bắt buộc"),
  studentCode: z.string().optional(),
  trainerId: z.string().min(1, "Vui lòng chọn trainer"),
  eventTypeId: z.string().min(1, "Vui lòng chọn event type"),
  startDate: z.string().min(1, "Vui lòng chọn ngày"),
  startTime: z.string().min(1, "Vui lòng chọn giờ"),
  weeks: z.number().min(2, "Tối thiểu 2 tuần").max(12, "Tối đa 12 tuần"),
  note: z.string().optional()
});

export const RecurringBookingManager = () => {
  const { trainers, eventTypes, addRecurringBooking, fetchData } = useDataStore();
  const [formData, setFormData] = useState({
    studentName: '',
    studentEmail: '',
    studentPhone: '',
    studentCode: '',
    trainerId: '',
    eventTypeId: '',
    startDate: format(addDays(startOfToday(), 1), 'yyyy-MM-dd'),
    startTime: '09:00',
    weeks: 4,
    note: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewDates, setPreviewDates] = useState<string[]>([]);

  // Calculate preview dates whenever form changes
  React.useEffect(() => {
    if (formData.startDate && formData.weeks >= 2) {
      const dates = Array.from({ length: formData.weeks }, (_, i) => {
        const date = addDays(new Date(formData.startDate), i * 7);
        return format(date, 'EEEE, dd/MM/yyyy');
      });
      setPreviewDates(dates);
    }
  }, [formData.startDate, formData.weeks]);

  const selectedEventType = eventTypes.find(et => et.id === formData.eventTypeId);
  const selectedTrainer = trainers.find(t => t.id === formData.trainerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = recurringBookingSchema.safeParse({
      ...formData,
      weeks: parseInt(String(formData.weeks))
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      toast.error('Vui lòng kiểm tra lại thông tin');
      return;
    }

    if (!selectedEventType) {
      toast.error('Vui lòng chọn event type');
      return;
    }

    setIsSubmitting(true);

    try {
      const [hours, minutes] = formData.startTime.split(':');
      const startDateTime = new Date(formData.startDate);
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);

      const bookingData = {
        eventTypeId: formData.eventTypeId,
        trainerId: formData.trainerId,
        studentName: formData.studentName,
        studentEmail: formData.studentEmail,
        studentPhone: formData.studentPhone,
        studentCode: formData.studentCode,
        note: formData.note
      };

      await addRecurringBooking(
        bookingData,
        startDateTime,
        selectedEventType.durationMinutes,
        formData.weeks
      );

      toast.success(`Đã tạo ${formData.weeks} bookings định kỳ thành công!`);
      
      // Reset form
      setFormData({
        studentName: '',
        studentEmail: '',
        studentPhone: '',
        studentCode: '',
        trainerId: '',
        eventTypeId: '',
        startDate: format(addDays(startOfToday(), 1), 'yyyy-MM-dd'),
        startTime: '09:00',
        weeks: 4,
        note: ''
      });
      
      await fetchData();
    } catch (error) {
      console.error('Error creating recurring booking:', error);
      toast.error('Lỗi khi tạo recurring bookings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#fc5d01' }}>
            <Repeat className="w-7 h-7" />
            Tạo Recurring Booking (Định Kỳ)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tạo nhiều bookings cho cùng một học viên, lặp lại theo tuần
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#fc5d01' }}>
                  <User className="w-5 h-5" />
                  Thông Tin Học Viên
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tên Học Viên *</label>
                    <Input
                      value={formData.studentName}
                      onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                      placeholder="Nguyễn Văn A"
                    />
                    {errors.studentName && <span className="text-xs text-red-500">{errors.studentName}</span>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Email *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          type="email"
                          value={formData.studentEmail}
                          onChange={e => setFormData({ ...formData, studentEmail: e.target.value })}
                          placeholder="email@example.com"
                          className="pl-10"
                        />
                      </div>
                      {errors.studentEmail && <span className="text-xs text-red-500">{errors.studentEmail}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Số Điện Thoại *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          value={formData.studentPhone}
                          onChange={e => setFormData({ ...formData, studentPhone: e.target.value })}
                          placeholder="+84 xxx xxx xxx"
                          className="pl-10"
                        />
                      </div>
                      {errors.studentPhone && <span className="text-xs text-red-500">{errors.studentPhone}</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Mã Học Viên (Optional)</label>
                    <Input
                      value={formData.studentCode}
                      onChange={e => setFormData({ ...formData, studentCode: e.target.value })}
                      placeholder="ST-12345"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#fc5d01' }}>
                  <Calendar className="w-5 h-5" />
                  Chi Tiết Booking
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Trainer *</label>
                      <Select
                        value={formData.trainerId}
                        onChange={e => setFormData({ ...formData, trainerId: e.target.value })}
                      >
                        <option value="">-- Chọn Trainer --</option>
                        {trainers.map(trainer => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.name || trainer.email}
                          </option>
                        ))}
                      </Select>
                      {errors.trainerId && <span className="text-xs text-red-500">{errors.trainerId}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Event Type *</label>
                      <Select
                        value={formData.eventTypeId}
                        onChange={e => setFormData({ ...formData, eventTypeId: e.target.value })}
                      >
                        <option value="">-- Chọn Event Type --</option>
                        {eventTypes.filter(et => et.active).map(eventType => (
                          <option key={eventType.id} value={eventType.id}>
                            {eventType.name} ({eventType.durationMinutes} phút)
                          </option>
                        ))}
                      </Select>
                      {errors.eventTypeId && <span className="text-xs text-red-500">{errors.eventTypeId}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ngày Bắt Đầu *</label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        min={format(startOfToday(), 'yyyy-MM-dd')}
                      />
                      {errors.startDate && <span className="text-xs text-red-500">{errors.startDate}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Giờ *</label>
                      <Input
                        type="time"
                        value={formData.startTime}
                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      />
                      {errors.startTime && <span className="text-xs text-red-500">{errors.startTime}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Số Tuần *</label>
                      <Input
                        type="number"
                        min="2"
                        max="12"
                        value={formData.weeks}
                        onChange={e => setFormData({ ...formData, weeks: Math.max(2, Math.min(12, parseInt(e.target.value) || 2)) })}
                      />
                      {errors.weeks && <span className="text-xs text-red-500">{errors.weeks}</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Ghi Chú (Optional)</label>
                    <textarea
                      className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:outline-none"
                      style={{ focusRing: '#fc5d01' }}
                      rows={3}
                      value={formData.note}
                      onChange={e => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Thông tin thêm về buổi học..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                  style={{ backgroundColor: '#fc5d01' }}
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Tạo {formData.weeks} Bookings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#fc5d01' }}>
              <AlertCircle className="w-5 h-5" />
              Xem Trước
            </h3>

            {selectedTrainer && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-600 font-medium mb-1">TRAINER</div>
                <div className="font-semibold text-blue-900">{selectedTrainer.name}</div>
              </div>
            )}

            {selectedEventType && (
              <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: '#fedac2', borderColor: '#fdbc94' }}>
                <div className="text-xs font-medium mb-1" style={{ color: '#fc5d01' }}>EVENT TYPE</div>
                <div className="font-semibold" style={{ color: '#fc5d01' }}>{selectedEventType.name}</div>
                <div className="text-xs text-slate-600 mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {selectedEventType.durationMinutes} phút
                </div>
              </div>
            )}

            {formData.startDate && formData.startTime && (
              <div className="mb-4">
                <div className="text-xs font-medium text-slate-600 mb-2">THỜI GIAN</div>
                <div className="text-sm font-medium">{formData.startTime}</div>
              </div>
            )}

            {previewDates.length > 0 && (
              <div>
                <div className="text-xs font-medium text-slate-600 mb-2">
                  {formData.weeks} BUỔI HỌC
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {previewDates.map((date, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 rounded bg-slate-50 border border-slate-200 flex items-center gap-2"
                    >
                      <Badge className="text-xs px-2 py-0.5" style={{ backgroundColor: '#fc5d01', color: '#fff' }}>
                        {index + 1}
                      </Badge>
                      {date}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
