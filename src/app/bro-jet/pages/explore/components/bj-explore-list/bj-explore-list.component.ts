import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BjStationCardComponent } from '../../../../shared/components/bj-station-card/bj-station-card.component';
import { BjStation } from '../../../../core/interfaces/station.interface';

@Component({
  selector: 'app-bj-explore-list',
  standalone: true,
  imports: [CommonModule, BjStationCardComponent],
  templateUrl: './bj-explore-list.component.html',
})
export class BjExploreListComponent {
  @Input() stations: BjStation[] = [];
  @Input() selectedId: string | null = null;
  @Input() loading = false;
  @Input() hasGpsPermission: boolean = false;

  @Output() cardClick = new EventEmitter<BjStation>();
  @Output() bookClick = new EventEmitter<BjStation>();

  onCardClick(station: BjStation): void {
    this.cardClick.emit(station);
  }

  onBookClick(station: BjStation): void {
    this.bookClick.emit(station);
  }
}
