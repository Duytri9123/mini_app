import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BjStation } from '../../../core/interfaces/station.interface';
import { BjStationService } from '../../../core/services/bj-station.service';

@Component({
  selector: 'bj-station-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-station-bottom-sheet.component.html',
})
export class BjStationBottomSheetComponent implements OnChanges {
  @Input() station: BjStation | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() bookNow = new EventEmitter<BjStation>();

  detail: BjStation | null = null;
  loadingDetail = false;
  activeTab: 'info' | 'images' = 'info';

  private destroy$ = new Subject<void>();

  constructor(public stationService: BjStationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['station']) {
      this.detail = null;
      this.activeTab = 'info';
      if (this.station) {
        this._loadDetail(this.station.id);
      }
    }
  }

  close(): void {
    this.closed.emit();
  }

  onBookNow(): void {
    if (this.station) this.bookNow.emit(this.station);
  }

  getPrimaryImage(): string {
    if (this.detail) return this.stationService.getPrimaryImageUrl(this.detail);
    if (this.station) return this.stationService.getPrimaryImageUrl(this.station);
    return 'assets/images/station-placeholder.jpg';
  }

  get formattedOpenHours(): string {
    if (!this.detail) return '';
    return `${this.detail.openTime} – ${this.detail.closeTime}`;
  }

  get availabilityText(): string {
    if (this.detail?.availableBays != null) {
      return this.detail.availableBays > 0 ? `Còn ${this.detail.availableBays} chỗ` : 'Hết chỗ';
    }
    return '';
  }

  private _loadDetail(id: string): void {
    this.loadingDetail = true;
    this.destroy$.next();
    this.stationService.getStationDetail(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detail) => { this.detail = detail; this.loadingDetail = false; },
        error: () => { this.loadingDetail = false; },
      });
  }
}
