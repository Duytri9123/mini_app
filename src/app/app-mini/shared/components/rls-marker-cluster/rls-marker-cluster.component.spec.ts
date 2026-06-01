/**
 * Unit tests for RlsMarkerClusterComponent — verifies the pure getters that
 * sanitize the cluster count, format the display label, and pick a size/glow
 * tier from the member count (design.md §9.3, §11.6 / Property 7).
 *
 * _Requirements: 3.4, 14.5_
 */
import { RlsMarkerClusterComponent } from './rls-marker-cluster.component';
import { RlsMarkerCluster } from '../../../core/interfaces';

function makeCluster(count: number): RlsMarkerCluster {
  return { lat: 21.0, lng: 105.8, count, members: [] };
}

describe('RlsMarkerClusterComponent', () => {
  let component: RlsMarkerClusterComponent;

  beforeEach(() => {
    component = new RlsMarkerClusterComponent();
  });

  it('is created', () => {
    expect(component).toBeTruthy();
  });

  describe('count sanitization', () => {
    it('passes through a non-negative integer', () => {
      component.cluster = makeCluster(8);
      expect(component.count).toBe(8);
    });

    it('clamps negative / non-finite counts to 0', () => {
      component.cluster = makeCluster(-3);
      expect(component.count).toBe(0);
      component.cluster = makeCluster(NaN);
      expect(component.count).toBe(0);
    });
  });

  describe('displayCount formatting', () => {
    it('shows the raw number below 1000', () => {
      component.cluster = makeCluster(42);
      expect(component.displayCount).toBe('42');
    });

    it('abbreviates thousands without decimals when remainder is small', () => {
      component.cluster = makeCluster(1000);
      expect(component.displayCount).toBe('1k');
    });

    it('abbreviates thousands with one decimal when remainder >= 100', () => {
      component.cluster = makeCluster(1200);
      expect(component.displayCount).toBe('1.2k');
    });
  });

  describe('size tiers', () => {
    it('is sm below 10', () => {
      component.cluster = makeCluster(9);
      expect(component.sizeTier).toBe('sm');
      expect(component.sizeClass).toContain('h-10');
    });

    it('is md at 10', () => {
      component.cluster = makeCluster(10);
      expect(component.sizeTier).toBe('md');
    });

    it('is lg at 25', () => {
      component.cluster = makeCluster(25);
      expect(component.sizeTier).toBe('lg');
    });

    it('is xl at 100 with rose glow', () => {
      component.cluster = makeCluster(100);
      expect(component.sizeTier).toBe('xl');
      expect(component.glowClass).toContain('border-rose-400/70');
    });
  });

  it('emits the cluster on tap', () => {
    const cluster = makeCluster(5);
    component.cluster = cluster;
    let emitted: RlsMarkerCluster | undefined;
    component.tap.subscribe((c) => (emitted = c));
    component.onTap();
    expect(emitted).toBe(cluster);
  });
});
