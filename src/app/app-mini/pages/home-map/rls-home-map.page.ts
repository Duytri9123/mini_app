import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * RlsHomeMapPage — placeholder tối thiểu cho màn bản đồ chính của app-mini.
 *
 * Đây chỉ là placeholder để lazy route `/app-mini` tải được mà không lỗi (task 10.1).
 * UI bản đồ realtime đầy đủ (Leaflet + heatmap + bottom sheet) sẽ được triển khai ở task 16.1.
 */
@Component({
  selector: 'rls-home-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rls-home-map.page.html',
})
export class RlsHomeMapPage {}
