# ⚠️ Fix OAuth Error 400: redirect_uri_mismatch

## Vấn đề
Bạn đang gặp lỗi:
```
Access blocked: This app's request is invalid
Error 400: redirect_uri_mismatch
```

## Nguyên nhân
App đang chạy trên `http://localhost:3001` nhưng **Google Cloud Console chưa có redirect URI này**.

---

## 🔧 Cách fix (5 bước):

### Bước 1: Mở Google Cloud Console
1. Truy cập: https://console.cloud.google.com/
2. Chọn project của bạn (ví dụ: "Nexus Booking System")

### Bước 2: Vào Credentials
1. Menu bên trái → **APIs & Services**
2. Click **Credentials**
3. Tìm OAuth 2.0 Client ID của bạn
4. Click vào tên để edit

### Bước 3: Update Authorized JavaScript origins
Thêm các URLs sau:
```
http://localhost:3000
http://localhost:3001
http://localhost:5173
```

**Screenshot vị trí:**
```
┌─────────────────────────────────────────────────┐
│ Authorized JavaScript origins                    │
├─────────────────────────────────────────────────┤
│ + ADD URI                                        │
│                                                  │
│ http://localhost:3000                           │
│ http://localhost:3001                           │
│ http://localhost:5173                           │
│ https://yourdomain.com (production)             │
└─────────────────────────────────────────────────┘
```

### Bước 4: Update Authorized redirect URIs  
Thêm các URLs sau:
```
http://localhost:3000/oauth/callback
http://localhost:3001/oauth/callback
http://localhost:5173/oauth/callback
```

**Screenshot vị trí:**
```
┌─────────────────────────────────────────────────┐
│ Authorized redirect URIs                         │
├─────────────────────────────────────────────────┤
│ + ADD URI                                        │
│                                                  │
│ http://localhost:3000/oauth/callback           │
│ http://localhost:3001/oauth/callback           │
│ http://localhost:5173/oauth/callback           │
│ https://yourdomain.com/oauth/callback          │
└─────────────────────────────────────────────────┘
```

### Bước 5: Save & Test
1. Click **SAVE** ở cuối trang
2. Đợi 10-30 giây để Google apply changes
3. Quay lại app và thử lại

---

## ✅ Checklist trước khi test lại:

- [ ] Đã add `http://localhost:3001` vào **Authorized JavaScript origins**
- [ ] Đã add `http://localhost:3001/oauth/callback` vào **Authorized redirect URIs**
- [ ] Đã click **SAVE**
- [ ] Đã đợi ít nhất 10 giây
- [ ] Clear browser cache/cookies (Ctrl+Shift+Delete)
- [ ] Refresh trang dashboard
- [ ] Click "Connect Google Calendar" lại

---

## 🐛 Vẫn bị lỗi?

### Kiểm tra lại config trong code:

1. **Check .env file có đúng CLIENT_ID không:**
```bash
# File: .env
VITE_GOOGLE_CLIENT_ID=123456789-xxxxxxx.apps.googleusercontent.com
```

2. **Verify redirect URI trong console:**
   - Mở Developer Tools (F12)
   - Check console log khi click "Connect Google Calendar"
   - Xem URL được tạo ra có đúng không

3. **Check port app đang chạy:**
```bash
# Terminal output khi npm run dev:
VITE v6.4.1  ready in 240 ms
➜  Local:   http://localhost:3001/    <-- Phải match với Google Console
```

---

## 📝 Production Setup

Khi deploy lên production, nhớ add:

**Authorized JavaScript origins:**
```
https://yourdomain.com
https://www.yourdomain.com
```

**Authorized redirect URIs:**
```
https://yourdomain.com/oauth/callback
https://www.yourdomain.com/oauth/callback
```

---

## 💡 Tips

### Nếu có nhiều môi trường:
- **Dev**: `http://localhost:3001/oauth/callback`
- **Staging**: `https://staging.yourdomain.com/oauth/callback`
- **Production**: `https://yourdomain.com/oauth/callback`

→ Add tất cả vào Google Console!

### Clear cache nếu cần:
```bash
# Chrome/Edge
Ctrl + Shift + Delete
→ Cookies and other site data
→ Clear data

# Or incognito mode
Ctrl + Shift + N
```

---

## 🎯 Expected Result

Sau khi fix, bạn sẽ thấy:
1. Click "Connect Google Calendar"
2. Redirect đến Google consent screen
3. Chọn account và authorize
4. Redirect về `/oauth/callback`
5. Loading indicator "Đang kết nối Google Calendar..."
6. Success! "Kết nối thành công!"
7. Redirect về dashboard
8. Status hiển thị "Connected ✓"

---

## 📞 Need Help?

Nếu vẫn gặp vấn đề sau khi làm theo guide này:
1. Screenshot Google Cloud Console setup
2. Screenshot console logs
3. Share error message đầy đủ

---

**Last Updated:** December 14, 2025  
**Issue:** OAuth redirect_uri_mismatch  
**Status:** ✅ Fixable trong 5 phút
