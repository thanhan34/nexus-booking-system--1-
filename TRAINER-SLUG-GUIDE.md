# Hướng dẫn quản lý Trainer Slug

## Slug là gì?
Slug là định danh duy nhất được dùng trong URL để truy cập trang booking của trainer. Ví dụ:
- URL: `http://localhost:3006/#/trainer/pte-intensive`
- Slug: `pte-intensive`

## Cách thêm/cập nhật Slug cho Trainer

### Cách 1: Qua Admin Dashboard (Khuyên dùng)
1. Đăng nhập với tài khoản Admin
2. Vào Admin Dashboard
3. Tại tab "User Management", bạn sẽ thấy cột "Booking Slug"
4. Nhập slug cho trainer (vd: `pte-intensive`, `ielts-expert`, v.v.)
5. Slug sẽ tự động được lưu khi bạn click ra ngoài input field

**Lưu ý:** 
- Slug chỉ chấp nhận chữ thường, số và dấu gạch ngang (-)
- Mỗi trainer nên có slug riêng để tránh nhầm lẫn

### Cách 2: Qua Firebase Console
1. Truy cập https://console.firebase.google.com
2. Chọn project `onlinecoaching-b1298`
3. Vào Firestore Database
4. Vào collection `users`
5. Chọn document của trainer cần cập nhật
6. Thêm hoặc sửa field `slug` (type: string)
7. Save

### Cách 3: Chạy Migration Script (Tự động cho tất cả trainers)
```bash
node migrate-add-slugs.cjs
```
Script này sẽ tự động tạo slug dựa trên tên của trainer.

## Kiểm tra Slug hoạt động
Sau khi thêm slug, truy cập URL:
```
http://localhost:3006/#/trainer/[slug-của-bạn]
```

Ví dụ:
- http://localhost:3006/#/trainer/pte-intensive
- http://localhost:3006/#/trainer/ielts-expert
- http://localhost:3006/#/trainer/john-doe

## Troubleshooting

### Lỗi "Trainer not found"
**Nguyên nhân:** 
- Trainer chưa có slug trong database
- Slug không khớp với URL

**Giải pháp:**
1. Kiểm tra trainer có slug trong Firebase/Admin Dashboard
2. Đảm bảo slug trong URL khớp chính xác với slug trong database
3. Refresh page sau khi cập nhật slug

### Trainers không xuất hiện trong danh sách
**Nguyên nhân:** 
- Dữ liệu trainer được lưu ở collection `trainers` thay vì `users`
- Role không được set đúng

**Giải pháp:**
- Hệ thống đã được cập nhật để load trainers từ cả 2 collections (`users` và `trainers`)
- Đảm bảo trainer có field `role` = `trainer`, `admin`, hoặc `support`

## Các thay đổi đã được thực hiện

1. **store.ts**: Cập nhật `fetchData()` để load trainers từ cả `users` và `trainers` collections
2. **services/firebase.ts**: Thêm hàm `updateUserSlug()` và cập nhật `fetchUsers()` để lấy slug
3. **pages/AdminDashboard.tsx**: Thêm cột "Booking Slug" trong User Management để admin có thể cập nhật slug
4. **pages/TrainerBookingPage.tsx**: Sử dụng slug để tìm trainer thay vì ID
5. **migrate-add-slugs.cjs**: Script tự động tạo slug cho tất cả trainers

## Lưu ý quan trọng
- Mỗi trainer nên có slug riêng biệt
- Slug nên ngắn gọn, dễ nhớ và liên quan đến tên trainer
- Sau khi cập nhật slug, URL cũ sẽ không hoạt động nữa (nếu có)
