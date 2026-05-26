import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface GmArticle {
  slug: string;
  title: string;
  summary: string;
  category: string;
  imageUrl: string;
  readTime: string;
  publishedAt: string;
}

@Injectable({ providedIn: 'root' })
export class GmArticleService {
  getArticles(): Observable<GmArticle[]> {
    return of([
      {
        slug: 'gui-hang-noi-thanh-nhanh',
        title: 'Cách tạo đơn giao hàng nội thành nhanh hơn',
        summary: 'Chuẩn bị điểm lấy, điểm giao, mô tả hàng và ghi chú tài xế để đơn được nhận nhanh.',
        category: 'Giao hàng',
        imageUrl: 'assets/images/gapmove-1.jpg',
        readTime: '3 phút',
        publishedAt: new Date().toISOString(),
      },
      {
        slug: 'chon-xe-tai-van',
        title: 'Khi nào nên chọn xe tải hoặc xe van?',
        summary: 'Gợi ý chọn tải trọng theo kích thước hàng, quãng đường và nhu cầu bốc xếp.',
        category: 'Xe tải',
        imageUrl: 'assets/images/gapmove-3.jpg',
        readTime: '4 phút',
        publishedAt: new Date().toISOString(),
      },
      {
        slug: 'be-ho-hang-an-toan',
        title: 'Bê hộ hàng an toàn cho shop và gia đình',
        summary: 'Cách ước lượng số người bê, số tầng, thang máy và khoảng cách từ cửa ra xe.',
        category: 'Bê hộ hàng',
        imageUrl: 'assets/images/gapmove-4.jpg',
        readTime: '5 phút',
        publishedAt: new Date().toISOString(),
      },
    ]);
  }
}
