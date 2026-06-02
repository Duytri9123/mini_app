import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { RlsLocation, RlsNearbyLocation } from '../../../core/interfaces';
import { RlsPlaceInlineDetailComponent } from '../rls-place-inline-detail/rls-place-inline-detail.component';

@Component({
  selector: 'rls-nearby-panel',
  standalone: true,
  imports: [CommonModule, RlsPlaceInlineDetailComponent],
  templateUrl: './rls-nearby-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RlsNearbyPanelComponent {
  @Input() places: RlsNearbyLocation[] = [];
  @Input() loading = false;
  @Input() radiusM = 5000;
  @Input() selectedPlaceId: number | null = null;
  @Input() detailLoading = false;
  @Input() detail: any = null;

  @Output() select = new EventEmitter<RlsLocation>();
  @Output() closeDetail = new EventEmitter<void>();

  readonly fallbackImageUrl = 'assets/images/No_Image_Available.jpg';

  get radiusLabel(): string {
    return this.formatDistance(this.radiusM);
  }

  trackById(_index: number, place: RlsLocation): number {
    return place.id;
  }

  onSelect(place: RlsLocation): void {
    this.select.emit(place);
  }

  onCloseDetail(): void {
    this.closeDetail.emit();
  }

  placeImageUrl(place: RlsNearbyLocation): string {
    const raw = place as any;
    return (
      raw.thumbnailUrl ||
      raw.thumbnail_url ||
      raw.imageUrl ||
      raw.image_url ||
      raw.photoUrl ||
      raw.photo_url ||
      raw.coverUrl ||
      raw.cover_url ||
      this.fallbackImageUrl
    );
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.endsWith(this.fallbackImageUrl)) return;
    img.src = this.fallbackImageUrl;
  }

  categoryLabel(category: string): string {
    const labels: Record<string, string> = {
      food: 'Đồ ăn',
      cafe: 'Cafe',
      event: 'Sự kiện',
      nightlife: 'Nightlife',
      campus: 'Campus',
      other: 'Địa điểm',
    };
    return labels[category] ?? category;
  }

  formatDistance(meters?: number): string {
    if (meters == null || !Number.isFinite(meters) || meters < 0) {
      return '';
    }
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    const km = meters / 1000;
    return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
  }
}
