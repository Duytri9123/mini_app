/**
 * Unit tests for RlsMapMarkerComponent — verifies the pure getters that derive
 * the effective visual state from activity count, the neon ring/pulse classes
 * per marker type, and the activity-count sanitization (design.md §6.2, §9.3).
 *
 * _Requirements: 3.1, 3.2, 3.3, 3.5, 14.5_
 */
import { RlsMapMarkerComponent } from './rls-map-marker.component';
import { RlsMapMarker } from '../../../core/interfaces';
import { RLS_HOT_THRESHOLD } from '../../../core/constants/rls-config.constants';

function makeMarker(partial: Partial<RlsMapMarker> = {}): RlsMapMarker {
  return {
    id: 'm1',
    lat: 21.0,
    lng: 105.8,
    type: 'food',
    ...partial,
  };
}

describe('RlsMapMarkerComponent', () => {
  let component: RlsMapMarkerComponent;

  beforeEach(() => {
    component = new RlsMapMarkerComponent();
  });

  it('is created', () => {
    expect(component).toBeTruthy();
  });

  describe('safeActivityCount', () => {
    it('defaults to 0 when undefined', () => {
      component.marker = makeMarker();
      expect(component.safeActivityCount).toBe(0);
    });

    it('clamps negative / non-finite to 0', () => {
      component.marker = makeMarker({ activityCount: -5 });
      expect(component.safeActivityCount).toBe(0);
      component.marker = makeMarker({ activityCount: NaN });
      expect(component.safeActivityCount).toBe(0);
    });

    it('floors fractional counts', () => {
      component.marker = makeMarker({ activityCount: 4.7 });
      expect(component.safeActivityCount).toBe(4);
    });
  });

  describe('effectiveState (R3.3)', () => {
    it('prefers an explicit visualState', () => {
      component.marker = makeMarker({ visualState: 'selected', activityCount: 0 });
      expect(component.effectiveState).toBe('selected');
    });

    it('is default with no activity', () => {
      component.marker = makeMarker({ activityCount: 0 });
      expect(component.effectiveState).toBe('default');
    });

    it('is active with some activity below the hot threshold', () => {
      component.marker = makeMarker({ activityCount: 2 });
      expect(component.effectiveState).toBe('active');
    });

    it('is hot at or above the hot threshold', () => {
      component.marker = makeMarker({ activityCount: RLS_HOT_THRESHOLD });
      expect(component.effectiveState).toBe('hot');
    });
  });

  describe('type styling (R3.2)', () => {
    it('uses amber glow for food', () => {
      component.marker = makeMarker({ type: 'food' });
      expect(component.ringClass).toContain('border-amber-400');
    });

    it('uses rose glow for hot_area', () => {
      component.marker = makeMarker({ type: 'hot_area' });
      expect(component.ringClass).toContain('border-rose-500');
    });

    it('maps each type to a fallback icon', () => {
      component.marker = makeMarker({ type: 'cafe' });
      expect(component.typeIcon).toBe('☕');
      component.marker = makeMarker({ type: 'event' });
      expect(component.typeIcon).toBe('🎉');
    });
  });

  describe('pulse class (R3.3)', () => {
    it('pings when hot', () => {
      component.marker = makeMarker({ activityCount: RLS_HOT_THRESHOLD });
      expect(component.pulseClass).toBe('animate-ping');
    });

    it('pulses when active', () => {
      component.marker = makeMarker({ activityCount: 2 });
      expect(component.pulseClass).toBe('animate-pulse');
    });

    it('has no pulse when default', () => {
      component.marker = makeMarker({ activityCount: 0 });
      expect(component.pulseClass).toBe('');
      expect(component.showPulseRing).toBeFalse();
    });
  });

  describe('image handling (R3.1)', () => {
    it('prefers the marker thumbnail', () => {
      component.marker = makeMarker({ thumbnailUrl: 'a.jpg' });
      expect(component.imageUrl).toBe('a.jpg');
    });

    it('falls back to the provided fallback url', () => {
      component.marker = makeMarker({ thumbnailUrl: '' });
      component.fallbackThumbnailUrl = 'fallback.jpg';
      expect(component.imageUrl).toBe('fallback.jpg');
    });
  });

  it('emits the marker on tap', () => {
    const marker = makeMarker();
    component.marker = marker;
    let emitted: RlsMapMarker | undefined;
    component.tap.subscribe((m) => (emitted = m));
    component.onTap();
    expect(emitted).toBe(marker);
  });
});
