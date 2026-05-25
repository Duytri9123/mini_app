import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { BjHomePage } from './bj-home.page';
import { BjStationService } from '../../core/services/bj-station.service';
import { LocationService } from 'src/app/services/location.service';
import { BjStation } from '../../core/interfaces/station.interface';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStation(overrides: Partial<BjStation> = {}): BjStation {
  return {
    id: 'st-1',
    name: 'Test Station',
    address: '123 Test St',
    latitude: 21.0,
    longitude: 105.8,
    status: 'active',
    openTime: '07:00',
    closeTime: '21:00',
    totalBays: 4,
    availableBays: 2,
    images: [],
    rating: 4.0,
    distance: 1.0,
    packages: [],
    ...overrides,
  };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockStationService = {
  getStations: jasmine.createSpy('getStations').and.returnValue(of([])),
  searchStations: jasmine.createSpy('searchStations').and.returnValue(of([])),
};

const mockLocationService = {
  getCurrent: jasmine.createSpy('getCurrent').and.returnValue({ lat: 21.0, lng: 105.8 }),
};

const mockRouter = {
  navigate: jasmine.createSpy('navigate'),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('BjHomePage', () => {
  let component: BjHomePage;

  beforeEach(async () => {
    mockStationService.getStations.calls.reset();
    mockStationService.searchStations.calls.reset();
    mockRouter.navigate.calls.reset();

    await TestBed.configureTestingModule({
      imports: [BjHomePage],
      providers: [
        { provide: BjStationService, useValue: mockStationService },
        { provide: LocationService, useValue: mockLocationService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BjHomePage);
    component = fixture.componentInstance;
  });

  // ── Filter: active status ──────────────────────────────────────────────────

  describe('filter by active status', () => {
    it('should only show stations with status active', () => {
      const stations: BjStation[] = [
        makeStation({ id: '1', status: 'active' }),
        makeStation({ id: '2', status: 'inactive' }),
        makeStation({ id: '3', status: 'maintenance' }),
        makeStation({ id: '4', status: 'active' }),
      ];

      mockStationService.getStations.and.returnValue(of(stations));
      component.ngOnInit();

      expect(component.allStations.length).toBe(2);
      expect(component.allStations.every(s => s.status === 'active')).toBeTrue();
    });

    it('should show empty list when no active stations exist', () => {
      const stations: BjStation[] = [
        makeStation({ id: '1', status: 'inactive' }),
        makeStation({ id: '2', status: 'maintenance' }),
      ];

      mockStationService.getStations.and.returnValue(of(stations));
      component.ngOnInit();

      expect(component.allStations.length).toBe(0);
      expect(component.displayedStations.length).toBe(0);
    });

    it('should show all stations when all are active', () => {
      const stations: BjStation[] = [
        makeStation({ id: '1', status: 'active' }),
        makeStation({ id: '2', status: 'active' }),
        makeStation({ id: '3', status: 'active' }),
      ];

      mockStationService.getStations.and.returnValue(of(stations));
      component.ngOnInit();

      expect(component.allStations.length).toBe(3);
    });
  });

  // ── Sort: by distance ──────────────────────────────────────────────────────

  describe('sort by distance', () => {
    beforeEach(() => {
      const stations: BjStation[] = [
        makeStation({ id: '1', distance: 5.0 }),
        makeStation({ id: '2', distance: 1.2 }),
        makeStation({ id: '3', distance: 3.7 }),
      ];
      mockStationService.getStations.and.returnValue(of(stations));
      component.ngOnInit();
    });

    it('should sort stations ascending by distance when "distance" filter is active', () => {
      component.toggleFilter('distance');

      const distances = component.displayedStations.map(s => s.distance!);
      expect(distances).toEqual([1.2, 3.7, 5.0]);
    });

    it('should place stations with undefined distance last', () => {
      component.allStations = [
        makeStation({ id: '1', distance: undefined }),
        makeStation({ id: '2', distance: 2.0 }),
        makeStation({ id: '3', distance: 0.5 }),
      ];

      component.toggleFilter('distance');

      expect(component.displayedStations[0].distance).toBe(0.5);
      expect(component.displayedStations[1].distance).toBe(2.0);
      // undefined treated as Infinity → last
      expect(component.displayedStations[2].distance).toBeUndefined();
    });

    it('should deactivate distance filter on second toggle', () => {
      component.toggleFilter('distance');
      expect(component.activeFilter).toBe('distance');

      component.toggleFilter('distance');
      expect(component.activeFilter).toBeNull();
    });
  });

  // ── Sort: by rating ────────────────────────────────────────────────────────

  describe('sort by rating', () => {
    beforeEach(() => {
      const stations: BjStation[] = [
        makeStation({ id: '1', rating: 3.5 }),
        makeStation({ id: '2', rating: 4.8 }),
        makeStation({ id: '3', rating: 4.2 }),
      ];
      mockStationService.getStations.and.returnValue(of(stations));
      component.ngOnInit();
    });

    it('should sort stations descending by rating when "rating" filter is active', () => {
      component.toggleFilter('rating');

      const ratings = component.displayedStations.map(s => s.rating!);
      expect(ratings).toEqual([4.8, 4.2, 3.5]);
    });

    it('should treat undefined rating as 0 (lowest)', () => {
      component.allStations = [
        makeStation({ id: '1', rating: undefined }),
        makeStation({ id: '2', rating: 4.0 }),
        makeStation({ id: '3', rating: 2.5 }),
      ];

      component.toggleFilter('rating');

      expect(component.displayedStations[0].rating).toBe(4.0);
      expect(component.displayedStations[1].rating).toBe(2.5);
      expect(component.displayedStations[2].rating).toBeUndefined();
    });

    it('should deactivate rating filter on second toggle', () => {
      component.toggleFilter('rating');
      expect(component.activeFilter).toBe('rating');

      component.toggleFilter('rating');
      expect(component.activeFilter).toBeNull();
    });
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  describe('navigation', () => {
    it('should navigate to station detail on card click', () => {
      const station = makeStation({ id: 'abc' });
      component.onCardClick(station);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/bro-jet/station', 'abc']);
    });

    it('should navigate to booking with stationId query param on book click', () => {
      const station = makeStation({ id: 'xyz' });
      component.onBookClick(station);
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/bro-jet/booking/new'],
        { queryParams: { stationId: 'xyz' } },
      );
    });
  });

  // ── Infinite scroll ────────────────────────────────────────────────────────

  describe('infinite scroll', () => {
    it('should initially show at most PAGE_SIZE stations', () => {
      const stations = Array.from({ length: 25 }, (_, i) =>
        makeStation({ id: `st-${i}` }),
      );
      mockStationService.getStations.and.returnValue(of(stations));
      component.ngOnInit();

      expect(component.visibleStations.length).toBe(10);
    });

    it('hasMore should be true when there are more stations to load', () => {
      const stations = Array.from({ length: 15 }, (_, i) =>
        makeStation({ id: `st-${i}` }),
      );
      mockStationService.getStations.and.returnValue(of(stations));
      component.ngOnInit();

      expect(component.hasMore).toBeTrue();
    });

    it('hasMore should be false when all stations are visible', () => {
      const stations = Array.from({ length: 5 }, (_, i) =>
        makeStation({ id: `st-${i}` }),
      );
      mockStationService.getStations.and.returnValue(of(stations));
      component.ngOnInit();

      expect(component.hasMore).toBeFalse();
    });
  });
});
