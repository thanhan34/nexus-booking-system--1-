# Hướng dẫn tích hợp Google Calendar

## Tổng quan

Hệ thống booking này đã được tích hợp với Google Calendar API để tự động tạo sự kiện và gửi email invitation khi có booking mới.

## Tính năng

✅ **Trainer Authorization** - Trainer connect Google Calendar một lần trong Settings  
✅ **Tự động tạo Calendar Events** - Events được tạo trên calendar của trainer  
✅ **Email Invitations** - Student nhận email invite tự động, không cần có Google account  
✅ **Auto Reminders** - Nhắc nhở trước 1 ngày và 1 giờ trước buổi học  
✅ **Two-way Sync** - Khi student accept invite, event xuất hiện trên calendar của họ  
✅ **Token Management** - Tự động refresh tokens khi hết hạn  

---

## Cách hoạt động

### Flow chính:

```
1. TRAINER SETUP (One-time):
   └─> Trainer Dashboard → Settings → Connect Google Calendar
       └─> OAuth popup opens
           └─> Trainer authorizes access
               └─> Tokens saved securely in Firestore
                   └─> Status: Connected ✓

2. BOOKING FLOW:
   └─> Student books session
       └─> System checks: trainer.googleCalendarConnected?
           ├─> YES: Create calendar event
           │   ├─> Get trainer's access token (refresh if needed)
           │   ├─> Create event on trainer's calendar
           │   ├─> Add student as attendee
           │   ├─> Google sends email invitation to student ✉️
           │   └─> Student can accept/decline in email
           │
           └─> NO: Just save booking in database
```

### Lợi ích của approach này:

✅ **Student không cần Google account** - Họ chỉ nhận email invite thường  
✅ **Trainer control** - Mỗi trainer tự quyết định có dùng calendar hay không  
✅ **Professional** - Email invitations trông chuyên nghiệp, có logo Google  
✅ **Easy management** - Trainer quản lý tất cả bookings trên một calendar  
✅ **Automatic notifications** - Cả hai bên đều nhận reminders  

---

## Cấu hình Google Calendar API

### Bước 1: Tạo Project trên Google Cloud Console

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Đặt tên project (ví dụ: "Nexus Booking System")

### Bước 2: Kích hoạt Google Calendar API

1. Trong Google Cloud Console, vào **APIs & Services** > **Library**
2. Tìm kiếm "**Google Calendar API**"
3. Click **Enable** để kích hoạt API

### Bước 3: Tạo OAuth 2.0 Client ID

**Quan trọng:** Bạn cần OAuth Client ID, không cần API Key cho flow này.

1. Vào **APIs & Services** > **Credentials**
2. Nếu chưa có, cấu hình **OAuth consent screen** trước:
   - **User Type:** External (hoặc Internal nếu có Google Workspace)
   - **App name:** PTE Intensive Booking System
   - **User support email:** Email hỗ trợ của bạn
   - **Developer contact:** Email của bạn
   - **Scopes:** Click "Add or Remove Scopes" và thêm:
     - `https://www.googleapis.com/auth/calendar` (xem và quản lý calendar)
     - `https://www.googleapis.com/auth/calendar.events` (tạo events)
   - **Test users:** (Nếu app ở trạng thái Testing)
     - Thêm email của tất cả trainers sẽ dùng hệ thống
     - Sau khi test xong, publish app để mọi người dùng được

3. Quay lại **Credentials** → Click **+ CREATE CREDENTIALS** > **OAuth client ID**
   - **Application type:** Web application
   - **Name:** "Nexus Booking System Web Client"
   - **Authorized JavaScript origins:**
     - `http://localhost:5173` (dev)
     - `http://localhost:3000` (nếu dùng port khác)
     - `https://yourdomain.com` (production domain)
   - **Authorized redirect URIs:**
     - `http://localhost:5173` (dev)
     - `https://yourdomain.com` (production)
   
4. Click **CREATE** và copy **Client ID**

### Bước 4: Cấu hình Firestore Security Rules

Để bảo vệ tokens, thêm rules sau vào Firestore:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... existing rules ...
    
    // Secure token storage - chỉ trainer mới đọc được token của mình
    match /userCredentials/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Bước 5: Cập nhật file .env

```env
# Google Calendar API Configuration
VITE_GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# Note: Không cần VITE_GOOGLE_API_KEY cho OAuth flow
```

**Lưu ý:** 
- File `.env` không được commit lên Git (đã có trong `.gitignore`)
- Tham khảo `.env.example` để biết cấu trúc đầy đủ

---

## Cách sử dụng

### Cho Trainer:

1. **Login** vào hệ thống
2. Vào **Trainer Dashboard** → **Settings** tab
3. Click **"Connect Google Calendar"**
4. Popup Google authorization sẽ mở
5. **Chọn tài khoản Google** muốn kết nối
6. **Cho phép quyền** truy cập Calendar
7. Đợi vài giây → Thấy status "Connected ✓"

**Lưu ý:** Chỉ cần làm một lần. Tokens sẽ tự động refresh khi hết hạn.

### Cho Student:

Khi student book lịch:
1. **Điền thông tin** và confirm booking
2. **Nếu trainer đã connect calendar:**
   - System tự động tạo calendar event
   - Student nhận **email invitation** từ Google Calendar
   - Email có link "Yes/No/Maybe" để accept
   - Có thông tin chi tiết session, thời gian, trainer
   - Có reminders tự động
3. **Student không cần làm gì thêm** - chỉ cần check email

---

## Cấu trúc Calendar Event

### Event được tạo trên Calendar của Trainer:

```
📅 Title: [Event Type Name] - [Student Name]
   Ví dụ: "PTE Speaking Session - Nguyen Van A"

📝 Description: 
   Session with [Student Name]
   Student Email: [student@email.com]
   Note: [Student's note nếu có]

🔔 Reminders: 
   - Email: 1 day before (24 giờ trước)
   - Popup: 1 hour before (1 giờ trước)

👥 Attendees: 
   - [student@email.com] → Nhận email invite

⏰ Time: 
   - Start: [booking start time]
   - End: [booking end time]
   - Timezone: Auto-detected
```

### Email mà Student nhận được:

- **Subject:** "Invitation: [Event Title]"
- **From:** Google Calendar (via trainer's email)
- **Content:**
  - Event details
  - Time và location
  - Buttons: Yes / No / Maybe
  - Add to Calendar link
  - Join with Google Meet (nếu có)

---

## Quyền được yêu cầu

Trainer authorize app với các quyền sau:

✅ **See, edit, share, and permanently delete calendars** - Cần để tạo/sửa events  
✅ **View and edit events on all your calendars** - Cần để manage bookings  

❌ **Không có quyền:**
- Xem emails
- Truy cập Drive
- Xem contacts
- Bất kỳ dịch vụ Google nào khác

---

## Xử lý lỗi

Hệ thống được thiết kế để **không fail booking** nếu có lỗi với Calendar:

- ✅ Booking vẫn được tạo trong database
- ⚠️ Calendar event không được tạo (logged in console)
- 📝 Lỗi được log để admin debug
- 💬 Student vẫn nhận được booking confirmation

### Các lỗi thường gặp:

#### 1. "Google Identity Services not loaded"
**Nguyên nhân:** Script chưa load xong hoặc bị block  
**Giải pháp:** 
- Check console có lỗi network không
- Kiểm tra ad blockers/privacy extensions
- Thử browser khác

#### 2. "Failed to exchange code for tokens"
**Nguyên nhân:** OAuth redirect URI không match  
**Giải pháp:**
- Kiểm tra Authorized redirect URIs trong Google Cloud Console
- Phải match chính xác với domain đang chạy
- Thêm cả `http://localhost:5173` cho dev

#### 3. "Trainer has not connected Google Calendar"
**Nguyên nhân:** Trainer chưa authorize  
**Giải pháp:**
- Trainer vào Settings và click "Connect Google Calendar"
- Hoàn thành OAuth flow

#### 4. "Token expired" / "Invalid credentials"
**Nguyên nhân:** Access token hết hạn và refresh token failed  
**Giải pháp:**
- System tự động refresh token
- Nếu vẫn lỗi, trainer cần disconnect và reconnect lại

---

## Token Management

### Token Storage (Secure):

```javascript
// Stored in Firestore: collection "userCredentials"
{
  accessToken: "ya29.xxx...",      // Short-lived (1 hour)
  refreshToken: "1//xxx...",       // Long-lived (permanent)
  expiryDate: 1702345678900,       // Timestamp
  email: "trainer@gmail.com",      // Verified email
  updatedAt: "2024-12-12T..."      // Last update
}
```

### Auto Token Refresh:

System tự động kiểm tra token expiry trước mỗi API call:
- Nếu token sắp hết hạn (< 5 phút) → Tự động refresh
- Sử dụng refresh token để lấy access token mới
- Update lại Firestore với token mới
- Transparent cho user - không cần làm gì

---

## Security Best Practices

⚠️ **Đã implement:**

✅ Tokens lưu trong Firestore collection riêng (`userCredentials`)  
✅ Firestore rules chỉ cho phép user đọc token của chính họ  
✅ Access tokens có expiry time ngắn (1 hour)  
✅ Refresh tokens được bảo vệ bởi Firestore security  
✅ OAuth flow sử dụng authorization code (không phải implicit)  

⚠️ **Cần lưu ý:**

- Không commit `.env` file lên Git
- Không share Client ID công khai (tuy không quá nguy hiểm)
- Thường xuyên review Firestore rules
- Monitor token usage trong Google Cloud Console
- Nếu nghi ngờ token bị leak → Revoke trong Google Account settings

---

## Testing

### Test trên Development:

1. **Setup:**
   - Đảm bảo đã cấu hình đúng `VITE_GOOGLE_CLIENT_ID`
   - Thêm `http://localhost:5173` vào Authorized origins
   - Thêm trainer email vào Test users (nếu app đang Testing)

2. **Test Flow:**
   ```
   Step 1: Login as trainer
   Step 2: Vào Settings → Click "Connect Google Calendar"
   Step 3: Authorize với Google account
   Step 4: Verify status hiển thị "Connected"
   Step 5: Tạo một test booking (dùng email thật)
   Step 6: Check console logs
   Step 7: Check trainer's Google Calendar
   Step 8: Check student email cho invitation
   ```

3. **Verify:**
   - ✅ Event xuất hiện trên trainer's calendar
   - ✅ Student nhận email invitation
   - ✅ Event có đúng thời gian, tên, mô tả
   - ✅ Reminders được set up
   - ✅ Student có thể accept/decline

### Debug Checklist:

```javascript
// Check in browser console:
console.log('✅ Google API loaded?');
console.log('✅ GIS loaded?');
console.log('✅ Token received?');
console.log('✅ Event created? ID:', eventId);

// Check in Firestore:
// → Collection: userCredentials
// → Document: [trainerId]
// → Fields: accessToken, refreshToken, email, expiryDate

// Check in Google Cloud Console:
// → APIs & Services → Dashboard
// → Xem Calendar API usage
// → Xem error logs nếu có
```

---

## Production Deployment

### Checklist trước khi deploy:

1. ✅ **Update OAuth settings:**
   - Thêm production domain vào Authorized JavaScript origins
   - Thêm production domain vào Authorized redirect URIs
   - Ví dụ: `https://booking.pteintensive.com`

2. ✅ **Publish OAuth Consent Screen:**
   - Nếu muốn public → Submit cho Google review (có thể mất vài ngày)
   - Hoặc giữ Testing và add tất cả trainer emails vào Test users

3. ✅ **Environment Variables:**
   - Set `VITE_GOOGLE_CLIENT_ID` trong production environment
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Build & Deploy → Environment

4. ✅ **Firestore Rules:**
   - Deploy security rules lên production
   - Test với production Firestore

5. ✅ **SSL Certificate:**
   - Đảm bảo production domain có HTTPS
   - Google OAuth yêu cầu HTTPS cho production

### Post-deployment Testing:

- Test với real Google accounts
- Verify emails được gửi đúng
- Check calendar events created correctly
- Monitor errors trong Google Cloud Console

---

## Troubleshooting Guide

### Problem: "Popup was blocked"
**Solution:** Cho phép popups cho domain này trong browser settings

### Problem: "Access denied" sau khi authorize
**Solution:** 
- Check app có trong "Testing" mode không
- User email có trong Test users list không
- Hoặc publish app để public

### Problem: "Calendar event not created"
**Solution:**
- Check browser console logs
- Verify token trong Firestore
- Test manual API call với token
- Check Calendar API quota

### Problem: Student không nhận email
**Solution:**
- Check spam folder
- Verify student email đúng
- Check Google Calendar notification settings
- Try với Gmail address để test

---

## Code References

Các file liên quan:

| File | Chức năng |
|------|-----------|
| `services/calendar.ts` | Core calendar service - OAuth, token management, API calls |
| `pages/TrainerDashboard.tsx` | UI cho Connect/Disconnect Google Calendar |
| `store.ts` | `addBooking()` - Integration với calendar service |
| `types.ts` | Type definitions cho User, Booking, Tokens |
| `.env.example` | Template cho environment variables |

### Key Functions:

```typescript
// services/calendar.ts
- authorizeTrainerCalendar()      // Trainer OAuth flow
- saveTrainerTokens()              // Save tokens to Firestore
- getValidTrainerToken()           // Get token (auto-refresh)
- createBookingCalendarEvent()     // Create event + send invite
- deleteBookingCalendarEvent()     // Delete event + notify

// store.ts
- addBooking()                     // Create booking + calendar event
```

---

## Roadmap / Future Enhancements

Tính năng có thể thêm trong tương lai:

- [ ] Tự động delete calendar events khi booking bị cancel
- [ ] Update calendar events khi reschedule booking
- [ ] Sync blocked days từ Google Calendar về hệ thống
- [ ] Support Google Meet link tự động cho sessions
- [ ] Export bookings sang ICS file
- [ ] Multiple calendar support (một trainer có nhiều calendars)
- [ ] Tích hợp với Outlook Calendar, Apple Calendar

---

## Support & Resources

### Documentation:
- [Google Calendar API Docs](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Web Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Calendar API Reference](https://developers.google.com/calendar/api/v3/reference)

### Nếu gặp vấn đề:
1. Check browser console logs
2. Check Firestore data (userCredentials collection)
3. Check Google Cloud Console → APIs & Services → Calendar API usage
4. Review security rules
5. Test với different browsers/accounts

### Contact:
- Email: support@pteintensive.com
- Developer: [Your contact info]

---

**Last Updated:** December 2024  
**Version:** 2.0 - New OAuth Flow Implementation
