# Tính Năng Tự Động Tạo Google Calendar Cho Recurring Bookings

## Tổng Quan
Khi tạo recurring bookings (lịch định kỳ), hệ thống sẽ tự động tạo sự kiện trên Google Calendar cho mỗi buổi học và gửi lời mời cho học viên.

## Cách Hoạt Động

### 1. Quy Trình Tạo Recurring Bookings
Khi admin tạo recurring booking qua `RecurringBookingManager`:

1. **Tạo Bookings trong Database** (Bước bắt buộc)
   - Mỗi booking sẽ được tạo trong Firestore database trước
   - Đảm bảo dữ liệu được lưu an toàn

2. **Tạo Google Calendar Events** (Bước tối ưu, không bắt buộc)
   - Nếu trainer đã kết nối Google Calendar, hệ thống sẽ tự động:
     - Tạo sự kiện trên Google Calendar của trainer
     - Thêm học viên vào danh sách attendees
     - Gửi email lời mời tự động cho học viên
     - Lưu `calendarEventId` vào booking record

### 2. Xử Lý Lỗi Thông Minh

#### Nếu Google Calendar Bị Ngắt Kết Nối:
- Hệ thống tự động phát hiện khi refresh token không còn hợp lệ
- Đánh dấu calendar là "disconnected" trong database
- **Bỏ qua** việc tạo calendar events cho các bookings còn lại
- **Bookings vẫn được tạo thành công** - không ảnh hưởng đến dữ liệu

#### Nếu Có Lỗi Mạng hoặc Lỗi Khác:
- Ghi log lỗi chi tiết
- **Bookings vẫn được tạo thành công**
- Có thể tạo thủ công calendar events sau

### 3. Thông Tin Trong Calendar Event

Mỗi calendar event bao gồm:
- **Tiêu đề**: Tên event type + Tên học viên
- **Thời gian**: Ngày giờ học (tự động lặp mỗi tuần)
- **Mô tả chi tiết**:
  - Thông tin học viên (tên, email)
  - Thông tin trainer (tên, email)
  - Giờ Việt Nam và giờ địa phương của học viên
  - Link Zoom meeting (nếu có)
  - Ghi chú (nếu có)
  - Link quản lý lịch học (đổi lịch/hủy lịch)
- **Attendees**: Email học viên (nhận lời mời tự động)
- **Reminders**:
  - Email reminder: 1 ngày trước
  - Popup reminder: 1 giờ trước

## Code Changes

### File: `store.ts`

#### Function: `addRecurringBooking`

**Những thay đổi chính:**

1. **Lấy thông tin trainer và event type:**
   ```typescript
   const { trainers, eventTypes } = get();
   const trainer = trainers.find(t => t.id === bookingData.trainerId);
   const eventType = eventTypes.find(et => et.id === bookingData.eventTypeId);
   ```

2. **Thêm flags để kiểm soát lỗi:**
   ```typescript
   let calendarErrorOccurred = false;
   let calendarDisconnected = false;
   ```

3. **Tạo calendar event cho mỗi booking:**
   ```typescript
   if (!calendarDisconnected && !calendarErrorOccurred && 
       trainer && trainer.email && eventType && trainer.googleCalendarConnected) {
     try {
       const eventId = await createBookingCalendarEvent(...);
       await updateDoc(docRef, { calendarEventId: eventId });
     } catch (calendarError) {
       // Xử lý lỗi nhưng không dừng quá trình tạo booking
     }
   }
   ```

4. **Xử lý CalendarDisconnectedError:**
   - Đánh dấu calendar là disconnected
   - Bỏ qua việc tạo calendar events cho các bookings còn lại
   - Trainer cần kết nối lại Google Calendar

## Lợi Ích

### ✅ Cho Học Viên:
- Nhận email lời mời tự động từ Google Calendar
- Có thể thêm vào lịch cá nhân (Google Calendar, Outlook, Apple Calendar)
- Nhận reminder tự động trước buổi học
- Không cần thao tác thủ công

### ✅ Cho Trainer:
- Lịch dạy được đồng bộ tự động lên Google Calendar
- Dễ dàng quản lý lịch trình
- Có thể xem trên mọi thiết bị (phone, tablet, computer)

### ✅ Cho Admin:
- Không cần tạo thủ công calendar events
- Quy trình tạo recurring bookings nhanh chóng
- Dữ liệu được bảo vệ (bookings luôn được tạo thành công)

## Lưu Ý Quan Trọng

### 1. Yêu Cầu Kết Nối Google Calendar
- Trainer phải kết nối Google Calendar trước để tính năng hoạt động
- Nếu chưa kết nối, bookings vẫn được tạo nhưng không có calendar events

### 2. Xử Lý Khi Calendar Bị Ngắt Kết Nối
- Hệ thống sẽ tự động phát hiện và đánh dấu
- Trainer cần vào Trainer Dashboard để kết nối lại
- Các bookings đã tạo vẫn hợp lệ trong database

### 3. Hiệu Suất
- Mỗi calendar event được tạo tuần tự (không song song)
- Đảm bảo tính nhất quán của dữ liệu
- Có thể mất vài giây với số lượng bookings lớn (8-12 tuần)

### 4. Console Logging
- Tất cả các bước đều được log chi tiết
- Dễ dàng debug nếu có vấn đề
- Kiểm tra browser console để xem tiến trình

## Testing

### Kiểm Tra Tính Năng:

1. **Đảm bảo trainer đã kết nối Google Calendar:**
   - Đăng nhập với tài khoản trainer
   - Vào Trainer Dashboard
   - Kiểm tra trạng thái Google Calendar connection

2. **Tạo recurring booking:**
   - Đăng nhập với tài khoản admin
   - Vào tab "Recurring Bookings"
   - Điền thông tin học viên
   - Chọn trainer (đã kết nối calendar)
   - Chọn event type, ngày giờ, số tuần
   - Bấm "Tạo Bookings"

3. **Kiểm tra kết quả:**
   - Kiểm tra browser console: xem log tạo calendar events
   - Kiểm tra Google Calendar của trainer: xem các events
   - Kiểm tra email của học viên: nhận lời mời
   - Kiểm tra Firestore database: xem `calendarEventId` trong bookings

### Expected Results:
- ✅ Bookings được tạo thành công trong database
- ✅ Calendar events xuất hiện trên Google Calendar của trainer
- ✅ Học viên nhận email lời mời với link Zoom và thông tin chi tiết
- ✅ Mỗi booking có `calendarEventId` được lưu

## Troubleshooting

### Issue: Calendar events không được tạo
**Kiểm tra:**
1. Trainer có kết nối Google Calendar chưa?
2. Check console logs để xem lỗi cụ thể
3. Refresh token có còn hợp lệ không?

**Giải pháp:**
- Yêu cầu trainer kết nối lại Google Calendar
- Kiểm tra Google Cloud Console credentials

### Issue: Một số events được tạo, một số không
**Nguyên nhân:**
- Calendar bị ngắt kết nối giữa chừng
- Lỗi mạng tạm thời

**Giải pháp:**
- Check `calendarEventId` trong Firestore để xem bookings nào thiếu
- Có thể tạo thủ công calendar events cho các bookings thiếu

### Issue: Học viên không nhận được email
**Kiểm tra:**
1. Email học viên có đúng không?
2. Check spam folder
3. Calendar event có attendees chưa?

**Giải pháp:**
- Verify email address
- Check Google Calendar settings (sending notifications)

## Future Enhancements

Có thể cải thiện thêm:
- [ ] Parallel calendar event creation (tạo song song để tăng tốc)
- [ ] Bulk calendar event creation API (Google Calendar API supports batch)
- [ ] Retry logic cho failed calendar events
- [ ] UI notification khi calendar events được tạo thành công
- [ ] Option để tạo lại calendar events cho bookings thiếu

---

**Ngày cập nhật:** 21/12/2025  
**Version:** 1.0  
**Developer:** Cline AI Assistant
