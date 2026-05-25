import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter, take } from 'rxjs/operators';

import { BjMapComponent } from '../../shared/components/bj-map/bj-map.component';
import { BjStationCardComponent } from '../../shared/components/bj-station-card/bj-station-card.component';
import { BjSidebarComponent, SheetState } from '../../layout/bj-sidebar/bj-sidebar.component';
import { BjStationService } from '../../core/services/bj-station.service';
import { BjMapService } from '../../core/services/bj-map.service';
import { BjMarkerService } from '../../core/services/bj-marker.service';
import { BjStation, BjStationMarker } from '../../core/interfaces/station.interface';
import { BjLocationService } from '../../core/services/bj-location.service';
import { BjExploreFiltersComponent, ExploreFilter } from './components/bj-explore-filters/bj-explore-filters.component';
import { BjExploreListComponent } from './components/bj-explore-list/bj-explore-list.component';
import { BjExploreSearchComponent } from '../../shared/components/bj-explore-search/bj-explore-search.component';
import { BjStationDetailComponent } from '../../shared/components/bj-station-detail/bj-station-detail.component';

@Component({
  selector: 'bj-explore',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BjMapComponent,
    BjSidebarComponent,
    BjStationCardComponent,
    BjExploreFiltersComponent,
    BjExploreListComponent,
    BjExploreSearchComponent,
    BjStationDetailComponent
  ],
  templateUrl: './bj-explore.page.html',
})
export class BjExplorePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(BjMapComponent) mapComponent?: BjMapComponent;
  @ViewChild(BjSidebarComponent) sidebarComponent?: BjSidebarComponent;

  allStations: BjStation[] = [];
  stationMarkers: BjStationMarker[] = [];
  selectedStation: BjStation | null = null;
  filteredStations: BjStation[] = [];
  activeFilter: ExploreFilter = 'all';
  loading = false;
  searchText = '';
  placeholder = 'Tìm kiếm trạm rửa xe...';
  sheetState: SheetState = 'half';
  clusterStations: BjStation[] | null = null;
  selectedClusterId: number | null = null;
  userLat: number = 21.0285;
  userLng: number = 105.8542;
  hasGpsPermission: boolean = false;

  private _pendingFlyStationId: string | null = null;
  searchLat: number | null = null;
  searchLng: number | null = null;
  isMapSearchActive = false;

  get selectedStationId(): string | null {
    return this.selectedStation?.id ?? null;
  }

  get hasActiveFilters(): boolean {
    return this.activeFilter !== 'all';
  }

  readonly filterChips: { key: ExploreFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'open', label: 'Đang mở' },
    { key: 'top_rated', label: 'Đánh giá cao' },
    { key: 'self_service', label: 'Tự phục vụ' },
    { key: 'ev_charging', label: 'Trạm sạc EV' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private stationService: BjStationService,
    private mapService: BjMapService,
    private markerService: BjMarkerService,
    private locationService: BjLocationService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this._syncSelectedStation();
    this._syncUserLocation();
    this._loadStations();
    this._handleQueryParams();
  }

  ngAfterViewInit(): void {
    if (this._pendingFlyStationId && this.mapComponent) {
      this.mapComponent.flyToStation(this._pendingFlyStationId);
      this._pendingFlyStationId = null;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFilter(f: ExploreFilter): void {
    this.activeFilter = f;
    this.clusterStations = null;
    this.selectedClusterId = null;
    this._applyFilter();
  }

  onSearchClick(): void {
    this.clusterStations = null;
    this.selectedClusterId = null;
    this._applyFilter();

    if (!this.selectedStation) {
      this.sheetState = 'half';
      if (this.sidebarComponent) {
        this.sidebarComponent.openSheet('half');
      }
    }
  }

  clearSearch(): void {
    const wasMapSearch = this.searchLat !== null;
    
    this.searchText = '';
    this.isMapSearchActive = false;
    this.searchLat = null;
    this.searchLng = null;
    
    if (wasMapSearch) {
      this.mapComponent?.flyToUserLocation(this.userLat, this.userLng);
      this._fetchStationsAt(this.userLat, this.userLng);
    } else {
      this._applyFilter();
    }
  }

  removeSearchTag(): void {
    this.clearSearch();
  }

  onSearchTextChange(text: string): void {
    const wasMapSearch = this.searchLat !== null && this.isMapSearchActive;
    
    this.searchText = text;
    this.isMapSearchActive = false;
    
    // If they start typing/editing after a map search, we clear the map pin
    // and reset the list to their user location so they can search locally again
    if (wasMapSearch && text.trim() === '') {
      this.searchLat = null;
      this.searchLng = null;
      this.mapComponent?.flyToUserLocation(this.userLat, this.userLng);
      this._fetchStationsAt(this.userLat, this.userLng);
    }
  }

  onInputChange(): void {}
  onFilterToggle(): void {}

  onSearchFocus(isFocused: boolean): void {
    if (isFocused) {
      this.sheetState = 'hidden';
      if (this.sidebarComponent) {
        this.sidebarComponent.openSheet('hidden');
      }
    } else {
      setTimeout(() => {
        if (!this.selectedStation && !this.searchText) {
          this.sheetState = 'half';
          if (this.sidebarComponent) {
            this.sidebarComponent.openSheet('half');
          }
        }
      }, 300);
    }
  }

  onSearchSelectStation(station: BjStation): void {
    this.onCardClick(station);
  }

  onSearchSelectLocation(loc: {lat: number, lng: number}): void {
    this.isMapSearchActive = true;
    this.searchLat = loc.lat;
    this.searchLng = loc.lng;
    this.mapService.updateCenter(loc.lat, loc.lng);
    this.mapComponent?.flyToUserLocation(loc.lat, loc.lng);
    this.mapService.clearSelection();
    
    this._fetchStationsAt(loc.lat, loc.lng);
  }

  private _fetchStationsAt(lat: number, lng: number): void {
    this.loading = true;
    this.stationService.getStations(lat, lng, 100, true).subscribe({
      next: (stations) => {
        this.allStations = stations;
        this.loading = false;
        this._applyFilter();
        this.onSearchClick();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  clearCluster(): void {
    this.clusterStations = null;
    this.selectedClusterId = null;
    this._applyFilter();
  }

  onClusterClick(event: { stations: BjStationMarker[], clusterId: number }): void {
    const ids = event.stations.map(m => m.id);
    this.clusterStations = this.allStations.filter(s => ids.includes(s.id));
    this.selectedClusterId = event.clusterId;
    
    if (this.selectedStation) {
      this.mapService.clearSelection();
    }

    this._applyFilter();
    
    setTimeout(() => {
      this.sheetState = 'half';
      if (this.sidebarComponent) {
        this.sidebarComponent.openSheet('half');
      }
    }, 50);
  }

  onStationClick(marker: BjStationMarker): void {
    const station = this.allStations.find((s) => s.id === marker.id) ?? null;
    this.mapService.setSelectedStation(station);
  }

  async onMyLocationClick(): Promise<void> {
    const loc = await this.locationService.refresh();
    this.userLat = loc.lat;
    this.userLng = loc.lng;
    this.mapComponent?.flyToUserLocation(loc.lat, loc.lng);
  }

  onCardClick(station: BjStation): void {
    this.mapService.setSelectedStation(station);
  }

  onBookClick(station: BjStation): void {
    this.router.navigate(['/bro-jet/booking/new'], { queryParams: { stationId: station.id } });
  }

  closeBottomSheet(): void {
    this.mapService.clearSelection();
  }

  private _handleQueryParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const stationId = params['stationId'];
        if (!stationId) return;

        if (this.allStations.length > 0) {
          const station = this.allStations.find(s => s.id === stationId);
          if (station) {
            this.mapService.setSelectedStation(station);
            return;
          }
        }

        this.stationService.stations$
          .pipe(
            filter(stations => stations.length > 0),
            take(1),
            takeUntil(this.destroy$)
          )
          .subscribe(stations => {
            const station = stations.find(s => s.id === stationId);
            if (station) {
              this.mapService.setSelectedStation(station);
            }
          });
      });
  }

  private _loadStations(): void {
    this.loading = true;
    const loc = this.locationService.getCurrent();
    const lat = loc?.lat ?? 21.0285;
    const lng = loc?.lng ?? 105.8542;
    this.userLat = lat;
    this.userLng = lng;

    // Dùng lại data đã cache từ BehaviorSubject nếu đã có (tránh gọi API lần nữa)
    const cached = this.stationService.stations$.value;
    if (cached && cached.length > 0) {
      this.allStations = cached;
      this.loading = false;
      this._applyFilter();
      return;
    }

    this.stationService.getStations(lat, lng, 10).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stations) => {
          this.allStations = stations;
          this.loading = false;
          this._applyFilter();
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private _syncUserLocation(): void {
    this.locationService.getLocation()
      .pipe(takeUntil(this.destroy$))
      .subscribe(loc => {
        if (loc) {
          this.userLat = loc.lat;
          this.userLng = loc.lng;
        }
      });

    this.locationService.hasGpsPermission$
      .pipe(takeUntil(this.destroy$))
      .subscribe(has => this.hasGpsPermission = has);
  }

  private _syncSelectedStation(): void {
    this.mapService.selectedStation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(station => {
        this.selectedStation = station;
        if (station) {
          this.sheetState = 'full';
          if (this.mapComponent) {
            this.mapComponent.flyToStation(station.id);
          } else {
            this._pendingFlyStationId = station.id;
          }
        } else {
          // Always go back to 'half' when deselecting a station
          this.sheetState = 'half';
          if (this.sidebarComponent) {
            this.sidebarComponent.openSheet('half');
          }
        }
      });
  }

  private _applyFilter(): void {
    let mapFiltered = [...this.allStations];

    if (this.isMapSearchActive) {
      mapFiltered = mapFiltered.filter(s => (s.distance || 0) <= 100);
    }

    if (this.activeFilter !== 'all') {
      mapFiltered = mapFiltered.filter(s => s.status === 'active');
    }

    switch (this.activeFilter) {
      case 'open':
        mapFiltered = mapFiltered.filter(s => this.stationService.isOpenNow(s));
        break;
      case 'top_rated':
        mapFiltered = mapFiltered.filter(s => (s.rating ?? 0) >= 4.0 || (s.rating === undefined));
        break;
      case 'self_service':
        mapFiltered = mapFiltered.filter(s => s.is_self_service);
        break;
      case 'ev_charging':
        mapFiltered = mapFiltered.filter(s => s.has_ev_charging);
        break;
    }

    if (this.searchText.trim() && !this.isMapSearchActive) {
      const normalize = (str: string) => {
        if (!str) return '';
        return str.normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/\u0111/g, 'd').replace(/\u0110/g, 'D')
                  .toLowerCase();
      };
      const queryWords = normalize(this.searchText.trim()).split(/\s+/).filter(w => w.length > 0);
      mapFiltered = mapFiltered.filter(s => {
        const combined = normalize(s.name) + ' ' + normalize(s.address);
        return queryWords.every(w => combined.includes(w));
      });
    }

    let listFiltered = mapFiltered;
    if (this.clusterStations) {
      const clusterIds = this.clusterStations.map(c => c.id);
      listFiltered = mapFiltered.filter(s => clusterIds.includes(s.id));
    }

    this.filteredStations = listFiltered;
    this.stationMarkers = this.markerService.toMarkers(mapFiltered, this.selectedStation?.id);
  }
}