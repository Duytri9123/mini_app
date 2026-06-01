/**
 * Unit tests for RlsActivityCounterComponent — verifies the pure getters that
 * sanitize the live activity count and map it to a neon intensity tier.
 *
 * Key invariant under test: the displayed count is NEVER negative (R4.6).
 *
 * _Requirements: 3.3, 4.6, 14.5_
 */
import { RlsActivityCounterComponent } from './rls-activity-counter.component';
import { RLS_HOT_THRESHOLD } from '../../../core/constants/rls-config.constants';

describe('RlsActivityCounterComponent', () => {
  let component: RlsActivityCounterComponent;

  beforeEach(() => {
    component = new RlsActivityCounterComponent();
  });

  it('is created', () => {
    expect(component).toBeTruthy();
  });

  describe('safeCount — never negative (R4.6)', () => {
    it('passes through a non-negative integer', () => {
      component.count = 5;
      expect(component.safeCount).toBe(5);
    });

    it('clamps a negative count to 0', () => {
      component.count = -7;
      expect(component.safeCount).toBe(0);
    });

    it('clamps NaN / non-finite to 0', () => {
      component.count = NaN;
      expect(component.safeCount).toBe(0);
      component.count = Infinity;
      expect(component.safeCount).toBe(0);
    });

    it('floors fractional counts', () => {
      component.count = 3.9;
      expect(component.safeCount).toBe(3);
    });
  });

  describe('intensity tiers (R3.3)', () => {
    it('is idle when count is 0 and no heat score', () => {
      component.count = 0;
      expect(component.intensity).toBe('idle');
      expect(component.isPulsing).toBeFalse();
    });

    it('is low for a small positive count', () => {
      component.count = 1;
      expect(component.intensity).toBe('low');
      expect(component.isPulsing).toBeTrue();
    });

    it('is medium at half the hot threshold', () => {
      component.count = Math.ceil(RLS_HOT_THRESHOLD / 2);
      expect(component.intensity).toBe('medium');
    });

    it('is hot at or above the hot threshold (R3.3 / design §4.3)', () => {
      component.count = RLS_HOT_THRESHOLD;
      expect(component.intensity).toBe('hot');
    });

    it('escalates to hot when heatScore exceeds the threshold even with low count', () => {
      component.count = 1;
      component.heatScore = RLS_HOT_THRESHOLD + 5;
      expect(component.intensity).toBe('hot');
    });
  });

  describe('class derivation', () => {
    it('uses rose neon classes when hot', () => {
      component.count = RLS_HOT_THRESHOLD;
      expect(component.containerClass).toContain('border-rose-400/60');
      expect(component.dotClass).toContain('bg-rose-400');
      expect(component.dotClass).toContain('animate-ping');
    });

    it('uses muted slate classes and no pulse when idle', () => {
      component.count = 0;
      expect(component.containerClass).toContain('border-slate-600/50');
      expect(component.dotClass).not.toContain('animate-ping');
    });
  });
});
