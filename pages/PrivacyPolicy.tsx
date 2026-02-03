import React from 'react';

export const PrivacyPolicy = () => {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Chính sách bảo mật</h1>
        <p className="text-sm text-slate-500">Cập nhật lần cuối: 03/02/2026</p>
        <p className="text-base text-slate-600">
          PTE Intensive cam kết bảo vệ dữ liệu cá nhân của học viên khi sử dụng nền tảng đặt lịch
          học với trainers. Vui lòng đọc kỹ chính sách này để hiểu cách chúng tôi thu thập, sử dụng
          và bảo vệ thông tin của bạn.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">1. Thông tin chúng tôi thu thập</h2>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Thông tin cá nhân: họ tên, email, số điện thoại, múi giờ và mục tiêu học tập.</li>
          <li>Thông tin đặt lịch: lịch học đã chọn, trainer, thời lượng, địa điểm học (nếu có).</li>
          <li>Dữ liệu kỹ thuật: địa chỉ IP, thiết bị, trình duyệt, nhật ký hệ thống phục vụ bảo mật.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">2. Mục đích sử dụng dữ liệu</h2>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Xác nhận và quản lý lịch học giữa học viên và trainer.</li>
          <li>Gửi thông báo, nhắc lịch, cập nhật thay đổi hoặc yêu cầu bổ sung thông tin.</li>
          <li>Cải thiện chất lượng dịch vụ, tối ưu trải nghiệm học tập và vận hành hệ thống.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">3. Chia sẻ thông tin</h2>
        <p className="text-slate-600">
          Chúng tôi chỉ chia sẻ dữ liệu cần thiết với trainer để phục vụ việc giảng dạy và với các
          nhà cung cấp dịch vụ (ví dụ: hệ thống lịch, email) theo tiêu chuẩn bảo mật. PTE Intensive
          không bán hoặc trao đổi dữ liệu cá nhân cho bên thứ ba.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">4. Lưu trữ và bảo mật</h2>
        <p className="text-slate-600">
          Dữ liệu được lưu trữ trên hệ thống bảo mật, có phân quyền truy cập và mã hóa khi cần thiết.
          Chúng tôi áp dụng các biện pháp kỹ thuật để giảm rủi ro truy cập trái phép, mất mát hoặc
          rò rỉ dữ liệu.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. Quyền của học viên</h2>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Yêu cầu xem, chỉnh sửa hoặc cập nhật thông tin cá nhân.</li>
          <li>Yêu cầu xóa dữ liệu khi không còn sử dụng dịch vụ, trừ khi pháp luật yêu cầu lưu trữ.</li>
          <li>Phản hồi về việc sử dụng dữ liệu hoặc rút lại sự đồng ý trong phạm vi cho phép.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. Liên hệ</h2>
        <p className="text-slate-600">
          Nếu bạn có câu hỏi về chính sách bảo mật, vui lòng liên hệ PTE Intensive qua kênh hỗ trợ
          chính thức hoặc email được cung cấp trong hệ thống.
        </p>
      </section>
    </div>
  );
};