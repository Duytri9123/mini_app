import { GmAdditionalServiceKey, GmBookingType } from '../interfaces/booking.interface';
import { GmVehicleType } from '../interfaces/vehicle.interface';

export interface GmServiceOption {
  id: GmBookingType;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  vehicleType: GmVehicleType;
  accent: 'teal' | 'orange' | 'slate' | 'green';
}

export interface GmVehicleOption {
  id: GmVehicleType;
  title: string;
  subtitle: string;
  maxWeightKg: number;
  dimensions: string;
  driverIncluded: boolean;
  recommendedFor: string;
}

export interface GmAdditionalServiceOption {
  id: GmAdditionalServiceKey;
  title: string;
  subtitle: string;
  priceHint: string;
}

export const GM_SERVICE_OPTIONS: GmServiceOption[] = [
  {
    id: 'delivery',
    title: 'Giao hàng nhanh',
    subtitle: 'Tài liệu, hàng nhỏ, giao nhiều điểm',
    description: 'Dịch vụ chính của GapMove: giao hàng theo yêu cầu với xác nhận nhận/giao, COD và ảnh bằng chứng.',
    icon: 'cube-outline',
    vehicleType: 'motorbike',
    accent: 'teal',
  },
  {
    id: 'multi_stop',
    title: 'Đa đơn - Đa điểm',
    subtitle: 'Nhập nhiều điểm giao trong một bảng',
    description: 'Tạo nhiều điểm giao, quản lý thông tin người nhận, COD, kích thước và mã vận đơn trong một phiên đặt đơn.',
    icon: 'git-network-outline',
    vehicleType: 'motorbike',
    accent: 'orange',
  },
  {
    id: 'ride',
    title: 'Đặt xe',
    subtitle: 'Xe máy, ô tô, đặt ngay hoặc đặt lịch',
    description: 'Di chuyển nội thành với tài xế xác minh, theo dõi hành trình và thanh toán linh hoạt.',
    icon: 'navigate-outline',
    vehicleType: 'motorbike',
    accent: 'green',
  },
  {
    id: 'truck',
    title: 'Xe tải / xe van',
    subtitle: 'Van, bán tải, tải 500kg đến 2 tấn',
    description: 'Chở hàng cồng kềnh, hàng doanh nghiệp, nội thành hoặc liên tỉnh gần.',
    icon: 'bus-outline',
    vehicleType: 'truck',
    accent: 'orange',
  },
  {
    id: 'moving',
    title: 'Chuyển nhà mini',
    subtitle: 'Đóng gói, tháo lắp, bốc xếp, vận chuyển',
    description: 'Gói chuyển phòng trọ, căn hộ nhỏ và văn phòng nhỏ với đội hỗ trợ.',
    icon: 'home-outline',
    vehicleType: 'truck',
    accent: 'slate',
  },
  {
    id: 'porter',
    title: 'Bê hộ hàng',
    subtitle: 'Thuê người bê hàng độc lập hoặc kèm chuyến xe',
    description: 'Chọn số người bê, số tầng, thang máy, quãng đường bê và hàng nặng/cồng kềnh.',
    icon: 'barbell-outline',
    vehicleType: 'motorbike',
    accent: 'orange',
  },
];

export const GM_VEHICLE_OPTIONS: GmVehicleOption[] = [
  {
    id: 'motorbike',
    title: 'Xe máy',
    subtitle: 'Hàng nhỏ, tài liệu, đi nhanh',
    maxWeightKg: 30,
    dimensions: '50 x 50 x 50 cm',
    driverIncluded: true,
    recommendedFor: 'Đặt xe, giao tài liệu, đơn nhỏ',
  },
  {
    id: 'car',
    title: 'Ô tô',
    subtitle: 'Hành khách hoặc hàng gọn',
    maxWeightKg: 80,
    dimensions: 'Cốp xe tiêu chuẩn',
    driverIncluded: true,
    recommendedFor: 'Đi sân bay, đi nhóm nhỏ',
  },
  {
    id: 'bagac',
    title: 'Xe ba gác',
    subtitle: 'Hàng cồng kềnh, vật liệu, đồ gỗ',
    maxWeightKg: 600,
    dimensions: '2.0 x 1.2 x 1.2 m',
    driverIncluded: true,
    recommendedFor: 'Vật liệu xây dựng, đồ cũ, hàng cồng kềnh',
  },
  {
    id: 'van',
    title: 'Xe van 500kg',
    subtitle: 'Hàng trung bình, cần kín mưa',
    maxWeightKg: 500,
    dimensions: '1.7 x 1.2 x 1.2 m',
    driverIncluded: true,
    recommendedFor: 'Shop online, thiết bị, thùng carton',
  },
  {
    id: 'truck',
    title: 'Xe tải 1-2 tấn',
    subtitle: 'Hàng lớn, chuyển nhà mini',
    maxWeightKg: 2000,
    dimensions: '3.0 x 1.7 x 1.7 m',
    driverIncluded: true,
    recommendedFor: 'Nội thất, văn phòng, kho hàng',
  },
];

export const GM_ADDITIONAL_SERVICES: GmAdditionalServiceOption[] = [
  {
    id: 'porter',
    title: 'Bê hộ hàng',
    subtitle: 'Bê từ nhà xuống xe, từ xe lên nhà hoặc cả hai chiều',
    priceHint: 'Tính theo số người, số tầng và hàng nặng',
  },
  {
    id: 'extended_duration',
    title: 'Thêm thời gian chờ',
    subtitle: 'Phù hợp khi cần chờ lấy hàng, kiểm hàng hoặc bốc hàng lâu',
    priceHint: '+15.000đ mỗi 15 phút',
  },
  {
    id: 'packing',
    title: 'Đóng gói',
    subtitle: 'Hỗ trợ bọc màng, đóng thùng, dán nhãn',
    priceHint: 'Từ 50.000đ',
  },
  {
    id: 'assembly',
    title: 'Tháo lắp',
    subtitle: 'Hỗ trợ tháo/lắp giường, bàn, kệ đơn giản',
    priceHint: 'Từ 80.000đ',
  },
  {
    id: 'fragile',
    title: 'Hàng dễ vỡ',
    subtitle: 'Tài xế nhận cảnh báo và yêu cầu chụp ảnh xác nhận',
    priceHint: '+10.000đ',
  },
  {
    id: 'insurance',
    title: 'Bảo hiểm hàng hóa',
    subtitle: 'Tùy chọn bảo vệ đơn hàng giá trị cao',
    priceHint: 'Theo giá trị khai báo',
  },
  {
    id: 'cod',
    title: 'Thu hộ COD',
    subtitle: 'Tài xế thu tiền người nhận và đối soát về ví',
    priceHint: 'Theo số tiền thu hộ',
  },
  {
    id: 'cold_chain',
    title: 'Giữ lạnh',
    subtitle: 'Ghi chú bảo quản lạnh cho thực phẩm hoặc dược phẩm',
    priceHint: 'Theo đối tác hỗ trợ',
  },
];
