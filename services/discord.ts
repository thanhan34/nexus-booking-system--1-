import { format } from 'date-fns';
import { Booking, EventType, User } from '../types';

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1444027553877721088/tkea8-C4WjP9wQcViKYe4eKQhaNd-OrvwSq9aNUrpXHGxjG23fNwb_j3E5TP4KuMQsbX';
const DISCORD_ALERT_WEBHOOK_URL = 'https://discord.com/api/webhooks/1479871950586384558/PYfIh100H5IaiC0aJaPygay64gG-Ief2i4qsfhSmr27SrtbL-nWQp_D4RecqqsQxxL5v';

interface BookingNotificationData {
  booking: Booking;
  eventType: EventType;
  trainer: User;
}

interface CalendarEventFailureNotificationData {
  context: 'student_booking' | 'support_booking';
  bookingId?: string;
  trainerName?: string;
  trainerEmail?: string;
  studentName?: string;
  studentEmail?: string;
  eventTypeName?: string;
  startTime?: string;
  endTime?: string;
  supportByName?: string;
  supportByEmail?: string;
  reason?: string;
}

interface ZoomConflictNotificationData {
  bookingId: string;
  trainerName: string;
  trainerEmail?: string;
  zoomLink?: string;
  startTime: string;
  endTime: string;
  conflictBookingIds: string[];
  conflictTrainerNames: string[];
}

const postDiscordWebhook = async (payload: any, webhookUrl: string, label: string): Promise<void> => {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`❌ [Discord] Failed to send ${label}:`, response.statusText);
      throw new Error(`Discord webhook failed: ${response.statusText}`);
    }

    console.log(`✅ [Discord] ${label} sent successfully`);
  } catch (error) {
    console.error(`❌ [Discord] Error sending ${label}:`, error);
  }
};

export const sendBookingNotificationToDiscord = async (data: BookingNotificationData): Promise<void> => {
  const { booking, eventType, trainer } = data;
  
  try {
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    
    // Tạo embed message với màu cam
    const embed = {
      title: '📚 Booking Mới Được Tạo!',
      color: 0xfc5d01, // Màu cam đậm từ color scheme
      fields: [
        {
          name: '👤 Học Viên',
          value: booking.studentName,
          inline: true
        },
        {
          name: '📧 Email',
          value: booking.studentEmail,
          inline: true
        },
        {
          name: '📞 Số Điện Thoại',
          value: booking.studentPhone,
          inline: true
        },
        {
          name: '👨‍🏫 Trainer',
          value: trainer.name,
          inline: true
        },
        {
          name: '📖 Loại Sự Kiện',
          value: eventType.name,
          inline: true
        },
        {
          name: '⏱️ Thời Lượng',
          value: `${eventType.durationMinutes} phút`,
          inline: true
        },
        {
          name: '📅 Ngày',
          value: format(startTime, 'EEEE, dd/MM/yyyy'),
          inline: false
        },
        {
          name: '🕐 Giờ',
          value: `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`,
          inline: true
        },
        {
          name: '🌍 Múi Giờ',
          value: booking.studentTimezone || 'Asia/Bangkok',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'PTE Intensive Booking System'
      }
    };

    // Thêm Student Code nếu có
    if (booking.studentCode) {
      embed.fields.splice(3, 0, {
        name: '🎫 Mã Học Viên',
        value: booking.studentCode,
        inline: true
      });
    }

    // Thêm Note nếu có
    if (booking.note) {
      embed.fields.push({
        name: '📝 Ghi Chú',
        value: booking.note,
        inline: false
      });
    }

    const payload = {
      content: '🎉 **Booking mới vừa được xác nhận!**',
      embeds: [embed]
    };

    await postDiscordWebhook(payload, DISCORD_WEBHOOK_URL, 'booking notification');
  } catch (error) {
    console.error('❌ [Discord] Error sending notification:', error);
    // Không throw error để không làm gián đoạn quá trình booking
    // Chỉ log lỗi để admin biết
  }
};

export const sendCalendarEventFailureNotificationToDiscord = async (
  data: CalendarEventFailureNotificationData
): Promise<void> => {
  try {
    const {
      context,
      bookingId,
      trainerName,
      trainerEmail,
      studentName,
      studentEmail,
      eventTypeName,
      startTime,
      endTime,
      supportByName,
      supportByEmail,
      reason,
    } = data;

    const start = startTime ? new Date(startTime) : null;
    const end = endTime ? new Date(endTime) : null;

    const title = context === 'student_booking'
      ? '❌ Không tạo được Google Calendar event (học viên tự book)'
      : '❌ Không tạo được Google Calendar event (support hỗ trợ book)';

    const embed = {
      title,
      color: 0xff4d4f,
      fields: [
        {
          name: '🆔 Booking ID',
          value: bookingId || 'N/A',
          inline: false,
        },
        {
          name: '👨‍🏫 Trainer',
          value: trainerName || trainerEmail || 'N/A',
          inline: true,
        },
        {
          name: '👤 Học viên',
          value: studentName || studentEmail || 'N/A',
          inline: true,
        },
        {
          name: '📚 Loại buổi học',
          value: eventTypeName || 'N/A',
          inline: true,
        },
        {
          name: '📅 Ngày',
          value: start ? format(start, 'EEEE, dd/MM/yyyy') : 'N/A',
          inline: true,
        },
        {
          name: '🕐 Giờ',
          value: start && end ? `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}` : 'N/A',
          inline: true,
        },
        {
          name: '⚠️ Lý do lỗi',
          value: reason || 'Unknown error',
          inline: false,
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'PTE Intensive Booking System - Calendar Alert'
      }
    } as any;

    if (context === 'support_booking') {
      embed.fields.push({
        name: '🛟 Support thực hiện',
        value: supportByName || supportByEmail || 'N/A',
        inline: false,
      });
    }

    const payload = {
      content: '🚨 **Google Calendar event tạo thất bại**',
      embeds: [embed],
    };

    await postDiscordWebhook(payload, DISCORD_ALERT_WEBHOOK_URL, 'calendar failure alert');
  } catch (error) {
    console.error('❌ [Discord] Error sending calendar failure alert:', error);
  }
};

export const sendZoomConflictNotificationToDiscord = async (
  data: ZoomConflictNotificationData
): Promise<void> => {
  try {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    const embed = {
      title: '⚠️ Cảnh báo trùng lịch Zoom của giảng viên',
      color: 0xffa940,
      fields: [
        {
          name: '🆔 Booking mới',
          value: data.bookingId,
          inline: false,
        },
        {
          name: '👨‍🏫 Trainer',
          value: data.trainerName,
          inline: true,
        },
        {
          name: '🔗 Zoom Link',
          value: data.zoomLink || 'N/A',
          inline: true,
        },
        {
          name: '📅 Ngày',
          value: format(start, 'EEEE, dd/MM/yyyy'),
          inline: true,
        },
        {
          name: '🕐 Giờ',
          value: `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
          inline: true,
        },
        {
          name: '⚔️ Trùng với booking',
          value: data.conflictBookingIds.join(', ') || 'N/A',
          inline: false,
        },
        {
          name: '👥 Trainer liên quan',
          value: data.conflictTrainerNames.join(', ') || 'N/A',
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'PTE Intensive Booking System - Zoom Conflict Alert'
      }
    };

    const payload = {
      content: '🚨 **Phát hiện trùng lịch Zoom**',
      embeds: [embed],
    };

    await postDiscordWebhook(payload, DISCORD_ALERT_WEBHOOK_URL, 'zoom conflict alert');
  } catch (error) {
    console.error('❌ [Discord] Error sending zoom conflict alert:', error);
  }
};
