import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';

// Múi giờ chuẩn của hệ thống (Vietnam)
export const SYSTEM_TIMEZONE = 'Asia/Ho_Chi_Minh'; // GMT+7

/**
 * Lấy múi giờ của học viên (browser timezone)
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Chuyển đổi thời gian từ hệ thống (GMT+7) sang giờ địa phương của học viên
 * @param date - Date object trong timezone hệ thống
 * @param userTimezone - Múi giờ của học viên
 * @returns Date object đã chuyển đổi sang múi giờ học viên
 */
export const convertSystemTimeToUserTime = (date: Date, userTimezone: string): Date => {
  // Date object trong JS luôn là UTC internally
  // Ta cần convert từ system timezone sang user timezone
  const systemZonedTime = toZonedTime(date, SYSTEM_TIMEZONE);
  const userZonedTime = toZonedTime(systemZonedTime, userTimezone);
  return userZonedTime;
};

/**
 * Chuyển đổi thời gian từ giờ địa phương của học viên sang hệ thống (GMT+7)
 * @param date - Date object trong timezone học viên
 * @param userTimezone - Múi giờ của học viên
 * @returns Date object đã chuyển đổi sang múi giờ hệ thống
 */
export const convertUserTimeToSystemTime = (date: Date, userTimezone: string): Date => {
  const systemZonedTime = fromZonedTime(date, userTimezone);
  return systemZonedTime;
};

/**
 * Format thời gian với múi giờ cụ thể
 * @param date - Date object
 * @param formatStr - Format string (e.g., 'HH:mm', 'yyyy-MM-dd HH:mm:ss')
 * @param timezone - Múi giờ để format
 * @returns String thời gian đã format
 */
export const formatInTimezone = (date: Date, formatStr: string, timezone: string): string => {
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, formatStr, { timeZone: timezone });
};

/**
 * Chuyển đổi và format thời gian từ system timezone sang user timezone
 * Slots được tạo bằng fromZonedTime() nên đã là UTC dates
 * @param date - Date object (UTC) được tạo từ system timezone
 * @param formatStr - Format string (e.g., 'HH:mm')
 * @param userTimezone - Múi giờ của user để hiển thị
 * @returns String thời gian đã được chuyển đổi và format
 */
export const formatSystemTimeInUserTimezone = (date: Date, formatStr: string, userTimezone: string): string => {
  // Slots được tạo bằng fromZonedTime(timeStr, SYSTEM_TIMEZONE)
  // Nghĩa là date đã là UTC date object
  // Ta chỉ cần format nó trong user timezone
  return format(date, formatStr, { timeZone: userTimezone });
};

/**
 * Lấy offset giữa user timezone và system timezone (tính bằng giờ)
 * @param userTimezone - Múi giờ của học viên
 * @returns Số giờ chênh lệch (có thể âm hoặc dương)
 */
export const getTimezoneOffset = (userTimezone: string): number => {
  const now = new Date();
  
  // Get offset in minutes for both timezones
  const userOffset = new Date(now.toLocaleString('en-US', { timeZone: userTimezone })).getTime() - 
                     new Date(now.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  const systemOffset = new Date(now.toLocaleString('en-US', { timeZone: SYSTEM_TIMEZONE })).getTime() - 
                       new Date(now.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  
  // Return difference in hours
  return (userOffset - systemOffset) / (1000 * 60 * 60);
};

/**
 * Lấy tên múi giờ hiển thị ngắn gọn
 * @param timezone - Múi giờ
 * @returns String tên múi giờ (e.g., "GMT+7", "GMT-5")
 */
export const getTimezoneDisplayName = (timezone: string): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  });
  
  const parts = formatter.formatToParts(now);
  const timeZonePart = parts.find(part => part.type === 'timeZoneName');
  
  return timeZonePart ? timeZonePart.value : timezone;
};

/**
 * Kiểm tra xem user có đang ở múi giờ khác với hệ thống không
 * @param userTimezone - Múi giờ của học viên
 * @returns true nếu khác múi giờ hệ thống
 */
export const isDifferentTimezone = (userTimezone: string): boolean => {
  return userTimezone !== SYSTEM_TIMEZONE;
};
