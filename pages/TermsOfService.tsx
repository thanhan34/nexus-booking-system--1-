import React from 'react';

export const TermsOfService = () => {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Điều khoản sử dụng</h1>
        <p className="text-sm text-slate-500">Cập nhật lần cuối: 03/02/2026</p>
        <p className="text-base text-slate-600">
          Chào mừng bạn đến với PTE Intensive. Khi sử dụng nền tảng đặt lịch học với trainers, bạn
          đồng ý tuân thủ các điều khoản dưới đây để đảm bảo trải nghiệm học tập hiệu quả và an toàn.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">1. Phạm vi dịch vụ</h2>
        <p className="text-slate-600">
          PTE Intensive cung cấp nền tảng để học viên đặt lịch học, quản lý buổi học và nhận hỗ trợ
          từ trainers. Chúng tôi không đảm bảo kết quả điểm số, nhưng cam kết cung cấp chương trình
          học tập và hỗ trợ phù hợp.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">2. Tài khoản và thông tin chính xác</h2>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Học viên cần cung cấp thông tin chính xác khi đặt lịch.</li>
          <li>Không chia sẻ tài khoản hoặc sử dụng tài khoản của người khác.</li>
          <li>Thông báo ngay khi phát hiện truy cập trái phép hoặc sai lệch dữ liệu.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">3. Quy định đặt lịch và tham gia buổi học</h2>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Học viên cần xác nhận lịch và có mặt đúng giờ theo khung thời gian đã chọn.</li>
          <li>Việc hủy/đổi lịch cần thực hiện theo chính sách đã công bố trong hệ thống.</li>
          <li>Trainer có quyền từ chối buổi học nếu học viên vi phạm quy định hoặc thiếu tôn trọng.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">4. Nghĩa vụ và hành vi bị cấm</h2>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Không sử dụng nền tảng cho mục đích trái pháp luật hoặc gây hại cho người khác.</li>
          <li>Không xâm nhập, phá hoại, hoặc can thiệp trái phép vào hệ thống.</li>
          <li>Tôn trọng quyền sở hữu trí tuệ và nội dung do PTE Intensive cung cấp.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. Giới hạn trách nhiệm</h2>
        <p className="text-slate-600">
          PTE Intensive không chịu trách nhiệm cho các tổn thất gián tiếp phát sinh do gián đoạn
          dịch vụ, sự cố kỹ thuật hoặc hành vi vi phạm từ bên thứ ba. Chúng tôi sẽ nỗ lực khắc phục
          sự cố trong thời gian sớm nhất.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. Thay đổi điều khoản</h2>
        <p className="text-slate-600">
          Chúng tôi có thể cập nhật điều khoản để phù hợp với quy định và hoạt động thực tế. Mọi thay
          đổi sẽ được thông báo trên hệ thống và có hiệu lực kể từ thời điểm công bố.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">7. Liên hệ</h2>
        <p className="text-slate-600">
          Nếu bạn có câu hỏi về điều khoản sử dụng, vui lòng liên hệ PTE Intensive qua kênh hỗ trợ
          chính thức hoặc email được cung cấp trong hệ thống.
        </p>
      </section>
    </div>
  );
};