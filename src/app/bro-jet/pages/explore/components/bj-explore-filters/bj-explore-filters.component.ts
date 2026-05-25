import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ExploreFilter = 'all' | 'open' | 'top_rated' | 'self_service' | 'ev_charging';

@Component({
  selector: 'app-bj-explore-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-explore-filters.component.html',
})
export class BjExploreFiltersComponent {
  @Input() chips: { key: ExploreFilter; label: string }[] = [];
  @Input() activeFilters: ExploreFilter[] = ['all'];
  @Input() variant: 'overlay' | 'inline' = 'inline';

  @Output() filtersChange = new EventEmitter<ExploreFilter[]>();
  /** Backward compat */
  @Output() filterChange = new EventEmitter<ExploreFilter>();

  @Input() set activeFilter(val: ExploreFilter) {
    this.activeFilters = val === 'all' ? ['all'] : [val];
  }

  isActive(key: ExploreFilter): boolean {
    if (key === 'all') return this.activeFilters.length === 0 || this.activeFilters.includes('all');
    return this.activeFilters.includes(key);
  }

  onChipClick(key: ExploreFilter): void {
    if (key === 'all') {
      this.activeFilters = ['all'];
    } else {
      let next = this.activeFilters.filter(f => f !== 'all');
      next = next.includes(key) ? next.filter(f => f !== key) : [...next, key];
      this.activeFilters = next.length === 0 ? ['all'] : next;
    }
    this.filtersChange.emit(this.activeFilters);
    this.filterChange.emit(this.activeFilters.includes('all') ? 'all' : this.activeFilters[0]);
  }
}
