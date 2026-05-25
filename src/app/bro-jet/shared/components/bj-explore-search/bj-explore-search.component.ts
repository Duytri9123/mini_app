import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { BjGeocodingService } from '../../../core/services/bj-geocoding.service';

@Component({
  selector: 'app-bj-explore-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bj-explore-search.component.html',
})
export class BjExploreSearchComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Tìm kiếm...';
  @Input() searchText = '';
  @Input() hasActiveFilters = false;
  @Input() stations: any[] = [];

  isFocused = false;
  mapAddresses: {address: string, lat: number, lng: number}[] = [];
  matchedStations: any[] = [];

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  constructor(private geocodeService: BjGeocodingService) {}

  ngOnInit() {
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.trim().length < 2) {
          return of([]);
        }
        return this.geocodeService.searchAddress(query).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe(results => {
      this.mapAddresses = results.slice(0, 3);
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  @Output() search = new EventEmitter<string>();
  @Output() filterToggle = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() searchTextChange = new EventEmitter<string>();
  @Output() focusChange = new EventEmitter<boolean>();
  @Output() selectStation = new EventEmitter<any>();
  @Output() selectMapLocation = new EventEmitter<{lat: number, lng: number}>();

  onSearchClick(): void {
    this.search.emit(this.searchText);
  }

  onFocus(): void {
    this.isFocused = true;
    this.focusChange.emit(true);
    this.updateStationsLocal();
    this.searchSubject.next(this.searchText);
  }

  onBlur(): void {
    setTimeout(() => {
      this.isFocused = false;
      this.focusChange.emit(false);
    }, 200);
  }

  onInputChange(): void {
    this.searchTextChange.emit(this.searchText);
    this.updateStationsLocal();
    this.searchSubject.next(this.searchText);
  }

  clearSearch(): void {
    this.searchText = '';
    this.searchTextChange.emit(this.searchText);
    this.clear.emit();
    this.updateStationsLocal();
    this.searchSubject.next(this.searchText);
  }

  onFilterClick(): void {
    this.filterToggle.emit();
  }

  private normalize(str: string): string {
    if (!str) return '';
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\u0111/g, 'd').replace(/\u0110/g, 'D')
              .toLowerCase();
  }

  updateStationsLocal() {
    if (!this.searchText || !this.searchText.trim() || !this.stations || this.stations.length === 0) {
      this.matchedStations = [];
      return;
    }
    const query = this.normalize(this.searchText.trim());
    const words = query.split(/\s+/).filter(w => w.length > 0);

    // Filter stations using token-based similarity (all words must be present)
    this.matchedStations = this.stations.filter(s => {
      if (!s.name) return false;
      const normName = this.normalize(s.name);
      return words.every(w => normName.includes(w));
    }).slice(0, 5); // top 5 stations
  }

  onSelectMapAddress(loc: {address: string, lat: number, lng: number}) {
    this.searchText = loc.address;
    this.searchTextChange.emit(this.searchText);
    this.selectMapLocation.emit(loc);
    this.isFocused = false;
  }

  onSelectStation(station: any) {
    this.searchText = station.name;
    this.searchTextChange.emit(this.searchText);
    this.selectStation.emit(station);
    this.isFocused = false;
  }
}
