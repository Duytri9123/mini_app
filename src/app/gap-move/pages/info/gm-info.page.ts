import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

interface GmInfoContent {
  eyebrow: string;
  title: string;
  summary: string;
  points: string[];
  ctaLabel: string;
  ctaRoute: string;
  imageUrl: string;
}

const INFO_CONTENT: Record<string, GmInfoContent> = {
  delivery: {
    eyebrow: 'Dịch vụ chính',
    title: 'Giao hàng nhanh cho tài liệu, hàng nhỏ và đơn nhiều điểm.',
    summary: 'Tạo đơn từ địa chỉ hiện tại, chọn người nhận, theo dõi trạng thái và lưu lại lịch sử vận hành trên cùng một hệ thống.',
    points: ['Gợi ý địa chỉ và chọn điểm trên bản đồ.', 'Hỗ trợ COD, ghi chú hàng hóa và bằng chứng giao nhận.', 'Phù hợp cá nhân, shop online và đội vận hành nhỏ.'],
    ctaLabel: 'Tạo đơn giao hàng',
    ctaRoute: '/gap-move/booking/new',
    imageUrl: 'assets/images/gapmove-1.jpg',
  },
  truck: {
    eyebrow: 'Xe tải / xe van',
    title: 'Chở hàng cồng kềnh bằng van, bán tải và xe tải nhẹ.',
    summary: 'Dành cho shop, kho vận, đồ nội thất nhỏ và những đơn cần tải trọng lớn hơn xe máy.',
    points: ['Chọn van 500kg hoặc xe tải 1-2 tấn.', 'Có thể thêm bê hộ hàng, đóng gói và tháo lắp.', 'Tối ưu cho giao hàng nội thành và liên tỉnh gần.'],
    ctaLabel: 'Đặt xe tải',
    ctaRoute: '/gap-move/truck',
    imageUrl: 'assets/images/gapmove-3.jpg',
  },
  porter: {
    eyebrow: 'Bê hộ hàng',
    title: 'Thuê người bê hàng độc lập hoặc đi kèm chuyến xe.',
    summary: 'Tính phí theo số người bê, số tầng, thang máy, hàng nặng/cồng kềnh và khoảng cách bê từ cửa tới xe.',
    points: ['Chọn số người bê và số tầng rõ ràng.', 'Bật theo chuyến xe hoặc dùng như dịch vụ riêng.', 'Phù hợp chuyển phòng, lấy hàng kho và đồ nặng.'],
    ctaLabel: 'Đặt bê hộ hàng',
    ctaRoute: '/gap-move/carry',
    imageUrl: 'assets/images/gapmove-4.jpg',
  },
  moving: {
    eyebrow: 'Chuyển nhà mini',
    title: 'Đóng gói, tháo lắp, bốc xếp và vận chuyển trong một luồng đặt đơn.',
    summary: 'Gói chuyển phòng trọ, căn hộ nhỏ và văn phòng nhỏ với xe tải/van và đội hỗ trợ bê hàng.',
    points: ['Tự động gợi ý bê hộ, đóng gói và tháo lắp.', 'Theo dõi chi phí xe và nhân sự trong một báo giá.', 'Phù hợp đơn chuyển nhanh trong ngày.'],
    ctaLabel: 'Đặt chuyển nhà',
    ctaRoute: '/gap-move/moving',
    imageUrl: 'assets/images/gapmove-2.jpg',
  },
  personal: {
    eyebrow: 'Khách hàng cá nhân',
    title: 'Gửi đồ, đặt xe và theo dõi đơn hằng ngày nhanh hơn.',
    summary: 'GapMove giữ trải nghiệm mobile như app, còn web desktop dành cho thao tác địa chỉ và đơn hàng rõ ràng hơn.',
    points: ['Lưu địa chỉ thường dùng.', 'Theo dõi đơn đang xử lý.', 'Thanh toán bằng ví, tiền mặt hoặc cổng thanh toán.'],
    ctaLabel: 'Bắt đầu đặt đơn',
    ctaRoute: '/gap-move/home',
    imageUrl: 'assets/images/gapmove-1.jpg',
  },
  business: {
    eyebrow: 'Khách hàng doanh nghiệp',
    title: 'Quản lý giao nhận, xe tải và bê hộ hàng cho shop/kho vận.',
    summary: 'Dành cho đội bán hàng, kho vận và doanh nghiệp cần điều phối nhiều đơn trong ngày.',
    points: ['Quản lý đơn, chi phí và thanh toán.', 'Hỗ trợ đa điểm và đội tài xế mock để demo vận hành.', 'Tách rõ dịch vụ giao hàng, xe tải và bê hộ.'],
    ctaLabel: 'Xem giải pháp doanh nghiệp',
    ctaRoute: '/gap-move/business',
    imageUrl: 'assets/images/gapmove-3.jpg',
  },
  rewards: {
    eyebrow: 'Ưu đãi & thành viên',
    title: 'Theo dõi ưu đãi, quyền lợi thành viên và chiến dịch hoàn tiền.',
    summary: 'Khu vực dành cho mã giảm giá, gói hội viên, điểm thưởng và ưu đãi theo dịch vụ.',
    points: ['Ưu đãi giao hàng nhanh.', 'Mã giảm cho xe tải/van.', 'Quyền lợi thành viên và đổi quà.'],
    ctaLabel: 'Xem ưu đãi',
    ctaRoute: '/gap-move/rewards',
    imageUrl: 'assets/images/gapmove-4.jpg',
  },
  support: {
    eyebrow: 'Trung tâm hỗ trợ',
    title: 'Hỗ trợ đơn hàng, thanh toán, tài xế và khiếu nại vận hành.',
    summary: 'Điểm vào cho câu hỏi thường gặp, chat hỗ trợ và chính sách dịch vụ GapMove.',
    points: ['FAQ theo dịch vụ.', 'Hỗ trợ sự cố đơn hàng.', 'Điều khoản, chính sách và bảo mật.'],
    ctaLabel: 'Mở trung tâm hỗ trợ',
    ctaRoute: '/gap-move/faq',
    imageUrl: 'assets/images/gapmove-2.jpg',
  },
  register: {
    eyebrow: 'Tài xế',
    title: 'Đăng ký tài xế GapMove cho giao hàng, xe tải và bê hộ.',
    summary: 'Khu vực giới thiệu hồ sơ tài xế, phương tiện, quy trình xác minh và cách nhận đơn.',
    points: ['Hồ sơ cá nhân và phương tiện.', 'Khu vực hoạt động và loại dịch vụ.', 'Đánh giá, chuyến hoàn tất và ví tài xế.'],
    ctaLabel: 'Xem tài xế hoạt động',
    ctaRoute: '/gap-move/drivers',
    imageUrl: 'assets/images/gapmove-2.jpg',
  },
  community: {
    eyebrow: 'Cộng đồng tài xế',
    title: 'Thông tin vận hành và chương trình dành cho tài xế.',
    summary: 'Cập nhật quy trình nhận đơn, tiêu chuẩn giao hàng, hỗ trợ tài xế và quyền lợi cộng đồng.',
    points: ['Hướng dẫn nhận đơn.', 'Cập nhật chính sách.', 'Kênh hỗ trợ tài xế.'],
    ctaLabel: 'Xem tài xế',
    ctaRoute: '/gap-move/drivers',
    imageUrl: 'assets/images/gapmove-1.jpg',
  },
  guide: {
    eyebrow: 'Cẩm nang tài xế',
    title: 'Quy chuẩn nhận hàng, giao hàng và xử lý sự cố.',
    summary: 'Hướng dẫn demo cho tài xế GapMove trong các luồng giao hàng, xe tải và bê hộ hàng.',
    points: ['Kiểm hàng và ảnh bằng chứng.', 'Quy trình COD.', 'Giao tiếp với khách hàng.'],
    ctaLabel: 'Mở FAQ',
    ctaRoute: '/gap-move/faq',
    imageUrl: 'assets/images/gapmove-4.jpg',
  },
  'ev-2026': {
    eyebrow: 'Chương trình mới',
    title: 'Chương trình xe điện 2026 cho đội giao hàng đô thị.',
    summary: 'Trang giới thiệu thử nghiệm cho nhóm tài xế dùng phương tiện điện trong nội thành.',
    points: ['Giao hàng xanh.', 'Tối ưu chi phí vận hành.', 'Ưu tiên khu vực trung tâm.'],
    ctaLabel: 'Đăng ký quan tâm',
    ctaRoute: '/gap-move/drivers',
    imageUrl: 'assets/images/gapmove-3.jpg',
  },
  about: {
    eyebrow: 'Tuyển dụng',
    title: 'GapMove xây nền tảng giao hàng-first cho cá nhân và doanh nghiệp.',
    summary: 'Trang giới thiệu định hướng sản phẩm, đội ngũ và nguyên tắc thiết kế vận hành.',
    points: ['Delivery-first.', 'Bản đồ và địa chỉ là trung tâm.', 'Tối ưu cho mobile app và desktop vận hành.'],
    ctaLabel: 'Xem Home',
    ctaRoute: '/gap-move/home',
    imageUrl: 'assets/images/gapmove-1.jpg',
  },
  stories: {
    eyebrow: 'Câu chuyện GapMovers',
    title: 'Những vai trò đang xây dựng trải nghiệm giao nhận GapMove.',
    summary: 'Nội dung mock cho tuyển dụng, kể về sản phẩm, vận hành, tài xế và hỗ trợ khách hàng.',
    points: ['Product & Design.', 'Operations.', 'Customer Support.'],
    ctaLabel: 'Gia nhập',
    ctaRoute: '/gap-move/careers/join',
    imageUrl: 'assets/images/gapmove-2.jpg',
  },
  join: {
    eyebrow: 'Gia nhập GapMove',
    title: 'Tìm người cùng xây hệ thống giao hàng, xe tải và bê hộ hàng.',
    summary: 'Khu vực tuyển dụng mock để hoàn thiện cấu trúc web header và dropdown.',
    points: ['Frontend mobile/web.', 'Operations.', 'Partnership.'],
    ctaLabel: 'Liên hệ hỗ trợ',
    ctaRoute: '/gap-move/support-chat',
    imageUrl: 'assets/images/gapmove-4.jpg',
  },
  latest: {
    eyebrow: 'Tin tức',
    title: 'Cập nhật mới từ GapMove.',
    summary: 'Tập hợp tin vận hành, thông tin dịch vụ, ưu đãi và bài viết cho shop/doanh nghiệp.',
    points: ['Thông báo dịch vụ.', 'Mẹo giao hàng.', 'Câu chuyện vận hành.'],
    ctaLabel: 'Tạo đơn',
    ctaRoute: '/gap-move/home',
    imageUrl: 'assets/images/gapmove-3.jpg',
  },
  service: {
    eyebrow: 'Thông tin dịch vụ',
    title: 'Quy định và hướng dẫn sử dụng các dịch vụ GapMove.',
    summary: 'Nội dung mock cho giao hàng nhanh, xe tải, chuyển nhà mini, bê hộ hàng và đa đơn đa điểm.',
    points: ['Điểm lấy/giao.', 'Phí dịch vụ.', 'Chính sách hàng hóa.'],
    ctaLabel: 'Xem dịch vụ',
    ctaRoute: '/gap-move/services/delivery',
    imageUrl: 'assets/images/gapmove-1.jpg',
  },
  'business-blog': {
    eyebrow: 'Blog kinh doanh',
    title: 'Gợi ý vận hành giao hàng cho shop online và kho nhỏ.',
    summary: 'Các bài viết mock giúp chủ shop tổ chức nhiều điểm giao, COD, xe tải và bê hộ hàng trong cùng một quy trình.',
    points: ['Tối ưu tuyến nhiều điểm.', 'Theo dõi chi phí giao nhận.', 'Khi nào nên dùng xe tải hoặc bê hộ hàng.'],
    ctaLabel: 'Tạo đơn đa điểm',
    ctaRoute: '/gap-move/multi-stop',
    imageUrl: 'assets/images/gapmove-4.jpg',
  },
  reports: {
    eyebrow: 'Báo cáo',
    title: 'Báo cáo vận hành và xu hướng giao nhận.',
    summary: 'Trang báo cáo mock để hoàn thiện điều hướng tin tức.',
    points: ['Hiệu suất giao hàng.', 'Xu hướng xe tải.', 'Dịch vụ bê hộ hàng.'],
    ctaLabel: 'Xem doanh nghiệp',
    ctaRoute: '/gap-move/business',
    imageUrl: 'assets/images/gapmove-2.jpg',
  },
};

@Component({
  selector: 'app-gm-info',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './gm-info.page.html',
})
export class GmInfoPage implements OnInit {
  content: GmInfoContent = INFO_CONTENT['latest'];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = this.route.snapshot.data['infoSlug'] || params.get('slug') || 'latest';
      this.content = INFO_CONTENT[slug] ?? INFO_CONTENT['latest'];
    });
  }
}
