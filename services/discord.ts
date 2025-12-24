import { format } from 'date-fns';
import { Booking, EventType, User } from '../types';

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1444027553877721088/tkea8-C4WjP9wQcViKYe4eKQhaNd-OrvwSq9aNUrpXHGxjG23fNwb_j3E5TP4KuMQsbX';

interface BookingNotificationData {
  booking: Booking;
  eventType: EventType;
  trainer: User;
}

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

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('❌ [Discord] Failed to send notification:', response.statusText);
      throw new Error(`Discord webhook failed: ${response.statusText}`);
    }

    console.log('✅ [Discord] Notification sent successfully');
  } catch (error) {
    console.error('❌ [Discord] Error sending notification:', error);
    // Không throw error để không làm gián đoạn quá trình booking
    // Chỉ log lỗi để admin biết
  }
};
