# Hướng dẫn tích hợp Google Calendar

## Tổng quan

Hệ thống booking này đã được tích hợp với Google Calendar API để tự động tạo sự kiện trên lịch của cả trainer và học viên khi có booking mới.

## Tính năng

✅ **Tự động tạo sự kiện trên Google Calendar** cho cả trainer và học viên  
✅ **Thông báo qua email** khi có booking mới  
✅ **Nhắc nhở** trước 1 ngày và 1 giờ trước buổi học  
✅ **Đồng bộ hai chiều** - Attendees có thể xem và quản lý lịch hẹn

## Cách hoạt động

Khi học viên book lịch thành công:
1. Hệ thống tạo booking trong Firebase
2. Tự động tạo event trên Google Calendar của **trainer**
3. Tự động tạo event trên Google Calendar của **học viên** (nếu họ có Gmail)
4. Cả hai nhận email xác nhận và lời mời tham gia event
5. Event ID được lưu vào database để quản lý sau này

## Cấu hình Google Calendar API

### Bước 1: Tạo Project trên Google Cloud Console

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Đặt tên project (ví dụ: "Nexus Booking System")

### Bước 2: Kích hoạt Google Calendar API

1. Trong Google Cloud Console, vào **APIs & Services** > **Library**
2. Tìm kiếm "**Google Calendar API**"
3. Click **Enable** để kích hoạt API

### Bước 3: Tạo API Key

1. Vào **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **API Key**
3. Copy API Key vừa tạo
4. (Khuyến nghị) Click vào API Key và set **Application restrictions**:
   - Chọn **HTTP referrers**
   - Thêm: `http://localhost:3000/*` và domain production của bạn
5. Trong **API restrictions**, chọn **Restrict key** và chỉ chọn **Google Calendar API**

### Bước 4: Tạo OAuth 2.0 Client ID

1. Vẫn ở **Credentials**, click **+ CREATE CREDENTIALS** > **OAuth client ID**
2. Nếu chưa có, bạn sẽ cần cấu hình **OAuth consent screen** trước:
   - User Type: **External**
   - App name: Tên ứng dụng của bạn
   - User support email: Email hỗ trợ
   - Developer contact: Email của bạn
   - Scopes: Thêm `https://www.googleapis.com/auth/calendar.events`
   - Test users: Thêm email của trainers và học viên để test

3. Quay lại tạo OAuth Client ID:
   - Application type: **Web application**
   - Name: "Nexus Booking System Web Client"
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - Domain production của bạn (ví dụ: `https://yourdomain.com`)
   - **Authorized redirect URIs**:
     - `http://localhost:3000`
     - Domain production của bạn
   
4. Click **CREATE** và copy **Client ID**

### Bước 5: Cập nhật file .env

Tạo file `.env` trong thư mục root (nếu chưa có) và thêm:

```env
# Google Calendar API Configuration
VITE_GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

**Lưu ý:** 
- File `.env` không được commit lên Git (đã có trong `.gitignore`)
- Tham khảo `.env.example` để biết cấu trúc đầy đủ

## Cách sử dụng

### Cho người dùng cuối

Khi book lịch, hệ thống sẽ:
1. **Tự động yêu cầu quyền** truy cập Google Calendar lần đầu tiên
2. Hiển thị popup xin quyền từ Google
3. Chọn tài khoản Google muốn sử dụng
4. Chấp nhận quyền truy cập Calendar
5. Booking được tạo và event tự động xuất hiện trên Calendar

### Quyền được yêu cầu

Ứng dụng chỉ yêu cầu quyền **tạo/chỉnh sửa/xóa events** trên Calendar, không có quyền:
- Xem toàn bộ lịch của bạn
- Truy cập các dịch vụ Google khác
- Lưu trữ dữ liệu cá nhân

## Cấu trúc Event trên Calendar

### Event trên Calendar của Trainer:
```
📅 Title: [Event Type Name] - [Student Name]
📝 Description: 
   Session with [Student Name]
   Email: [student@email.com]
   Note: [Student's note]
🔔 Reminders: 
   - Email 1 day before
   - Popup 1 hour before
👥 Attendees: [student@email.com]
```

### Event trên Calendar của Student:
```
📅 Title: [Event Type Name] with [Trainer Name]
📝 Description: 
   Session with trainer [Trainer Name]
   Trainer Email: [trainer@email.com]
   Note: [Student's note]
🔔 Reminders: 
   - Email 1 day before
   - Popup 1 hour before
👥 Attendees: [trainer@email.com]
```

## Xử lý lỗi

Hệ thống được thiết kế để **không fail booking** nếu có lỗi với Calendar:

- ✅ Booking vẫn được tạo trong database
- ⚠️ Calendar events không được tạo
- 📝 Lỗi được log trong console để debug
- 💬 Người dùng vẫn nhận được confirmation

### Các lỗi thường gặp:

1. **"Google Identity Services not initialized"**
   - Nguyên nhân: Thiếu hoặc sai Client ID
   - Giải pháp: Kiểm tra `VITE_GOOGLE_CLIENT_ID` trong `.env`

2. **"User denied permission"**
   - Nguyên nhân: User từ chối quyền truy cập Calendar
   - Giải pháp: User cần accept lại permission

3. **"API Key invalid"**
   - Nguyên nhân: API Key sai hoặc bị giới hạn
   - Giải pháp: Kiểm tra API Key và restrictions

## Testing

### Test trên môi trường Development:

1. Đảm bảo đã cấu hình đúng `.env`
2. Chạy dev server: `npm run dev`
3. Tạo một booking test
4. Kiểm tra console logs để thấy quá trình tạo calendar events
5. Kiểm tra Google Calendar của trainer và student

### Test users

Trong quá trình phát triển, chỉ **test users** được thêm trong OAuth consent screen mới có thể authorize app. Thêm email của:
- Trainers
- Test students
- Developers

## Production Deployment

Trước khi deploy lên production:

1. ✅ Thêm production domain vào:
   - OAuth Client ID Authorized origins
   - OAuth Client ID Authorized redirect URIs
   - API Key restrictions

2. ✅ Cập nhật `.env` với production credentials

3. ✅ Verify OAuth consent screen:
   - Publishing status: In production (nếu muốn public)
   - Hoặc giữ Testing và thêm tất cả users cần dùng

4. ✅ Test thoroughly trước khi release

## Bảo mật

⚠️ **Quan trọng:**
- Không commit file `.env` lên Git
- Không share API Key và Client ID công khai
- Sử dụng HTTPS cho production
- Giới hạn API Key với domain cụ thể
- Thường xuyên rotate credentials nếu bị lộ

## Support

Nếu gặp vấn đề:
1. Kiểm tra console logs trong browser
2. Xem Firebase logs
3. Kiểm tra Google Cloud Console > APIs & Services > Dashboard để xem usage và errors
4. Đọc [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)

---

## Code References

Các file liên quan đến Google Calendar integration:

- `services/calendar.ts` - Google Calendar service với các hàm create/update/delete events
- `store.ts` - addBooking function đã được cập nhật để tạo calendar events
- `types.ts` - Booking interface với `trainerCalendarEventId` và `studentCalendarEventId`
- `.env.example` - Template cho environment variables

## Roadmap

Tính năng có thể thêm trong tương lai:
- [ ] Tự động xóa calendar events khi cancel booking
- [ ] Update calendar events khi reschedule
- [ ] Sync availability từ Google Calendar
- [ ] Support multiple calendars cho mỗi trainer
- [ ] Tích hợp với các calendar services khác (Outlook, Apple Calendar)
