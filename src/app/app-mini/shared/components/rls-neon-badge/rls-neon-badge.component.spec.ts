/**
 * Unit tests for RlsNeonBadgeComponent — verifies the pure presentational
 * getters that derive icon, neon class, and accessibility label from the
 * `badge` input (design.md §9.3, §7.1 badge payload).
 *
 * The component holds no service dependencies, so it is instantiated directly.
 *
 * _Requirements: 3.5, 3.3, 14.5_
 */
import { RlsNeonBadgeComponent } from './rls-neon-badge.component';
import { RlsMarkerBadge } from '../../../core/interfaces';

describe('RlsNeonBadgeComponent', () => {
  let component: RlsNeonBadgeComponent;

  beforeEach(() => {
    component = new RlsNeonBadgeComponent();
  });

  it('is created', () => {
    expect(component).toBeTruthy();
  });

  describe('countdown badge (R3.5)', () => {
    const badge: RlsMarkerBadge = { kind: 'countdown', value: '12:30' };

    beforeEach(() => {
      component.badge = badge;
    });

    it('uses a clock icon', () => {
      expect(component.icon).toBe('⏱');
    });

    it('uses amber neon styling', () => {
      expect(component.badgeClass).toContain('border-amber-400/60');
      expect(component.badgeClass).toContain('shadow-[0_0_12px_rgba(251,191,36,0.55)]');
    });

    it('builds a countdown aria label', () => {
      expect(component.ariaLabel).toBe('Đếm ngược: 12:30');
    });
  });

  describe('count badge (R3.3)', () => {
    const badge: RlsMarkerBadge = { kind: 'count', value: '+12' };

    beforeEach(() => {
      component.badge = badge;
    });

    it('uses a fire icon', () => {
      expect(component.icon).toBe('🔥');
    });

    it('uses fuchsia neon styling', () => {
      expect(component.badgeClass).toContain('border-fuchsia-400/60');
    });

    it('builds an activity aria label', () => {
      expect(component.ariaLabel).toBe('Hoạt động: +12');
    });
  });

  describe('no badge', () => {
    it('returns empty icon and label, and base class only', () => {
      component.badge = null;
      expect(component.icon).toBe('');
      expect(component.ariaLabel).toBe('');
      expect(component.badgeClass).not.toContain('border-amber-400/60');
      expect(component.badgeClass).not.toContain('border-fuchsia-400/60');
    });
  });
});
