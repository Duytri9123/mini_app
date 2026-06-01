/**
 * Unit tests for story-expiry.util.ts — verifies specific examples and edge
 * cases for the pure story-lifecycle helpers.
 *
 * Property-based coverage (Property 5: Story expiry invariants) lives in the
 * dedicated fast-check suite (task 13.5). These unit tests assert concrete,
 * easy-to-reason-about cases plus boundary conditions.
 */
import {
  computeExpiresAt,
  isStoryActive,
  STORY_TTL_HOURS,
  STORY_TTL_MS,
  StoryExpiryView,
} from './story-expiry.util';

describe('story-expiry.util', () => {
  describe('constants', () => {
    it('STORY_TTL_HOURS is 24', () => {
      expect(STORY_TTL_HOURS).toBe(24);
    });

    it('STORY_TTL_MS equals 24h in milliseconds', () => {
      expect(STORY_TTL_MS).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('computeExpiresAt', () => {
    it('adds exactly 24h to an epoch-ms timestamp', () => {
      const createdAt = 1_700_000_000_000;
      expect(computeExpiresAt(createdAt)).toBe(createdAt + STORY_TTL_MS);
    });

    it('adds exactly 24h to an ISO-8601 string', () => {
      const createdIso = '2024-01-01T00:00:00.000Z';
      const expectedIso = Date.parse('2024-01-02T00:00:00.000Z');
      expect(computeExpiresAt(createdIso)).toBe(expectedIso);
    });

    it('adds exactly 24h to a Date instance', () => {
      const created = new Date('2024-06-15T12:30:00.000Z');
      expect(computeExpiresAt(created)).toBe(created.getTime() + STORY_TTL_MS);
    });

    it('is pure: same input always yields the same output', () => {
      const createdAt = 1_700_000_000_000;
      expect(computeExpiresAt(createdAt)).toBe(computeExpiresAt(createdAt));
    });

    it('returns NaN for an invalid timestamp string', () => {
      expect(Number.isNaN(computeExpiresAt('not-a-date'))).toBe(true);
    });
  });

  describe('isStoryActive', () => {
    const createdAt = Date.parse('2024-01-01T00:00:00.000Z');
    const expiresAt = computeExpiresAt(createdAt); // createdAt + 24h
    const activeStory: StoryExpiryView = {
      status: 'active',
      expiresAt,
    };

    it('is active strictly before expiresAt', () => {
      expect(isStoryActive(activeStory, expiresAt - 1)).toBe(true);
    });

    it('is NOT active exactly at expiresAt (strict comparison)', () => {
      expect(isStoryActive(activeStory, expiresAt)).toBe(false);
    });

    it('is NOT active after expiresAt', () => {
      expect(isStoryActive(activeStory, expiresAt + 1)).toBe(false);
    });

    it('is active right at creation time', () => {
      expect(isStoryActive(activeStory, createdAt)).toBe(true);
    });

    it('is NOT active when status is expired, even before expiresAt', () => {
      const expired: StoryExpiryView = { status: 'expired', expiresAt };
      expect(isStoryActive(expired, expiresAt - 1)).toBe(false);
    });

    it('is NOT active when status is removed, even before expiresAt', () => {
      const removed: StoryExpiryView = { status: 'removed', expiresAt };
      expect(isStoryActive(removed, expiresAt - 1)).toBe(false);
    });

    it('accepts ISO-8601 strings for both story.expiresAt and now', () => {
      const story: StoryExpiryView = {
        status: 'active',
        expiresAt: '2024-01-02T00:00:00.000Z',
      };
      expect(isStoryActive(story, '2024-01-01T23:59:59.000Z')).toBe(true);
      expect(isStoryActive(story, '2024-01-02T00:00:01.000Z')).toBe(false);
    });

    it('accepts Date instances for now', () => {
      const story: StoryExpiryView = {
        status: 'active',
        expiresAt: new Date('2024-01-02T00:00:00.000Z'),
      };
      expect(isStoryActive(story, new Date('2024-01-01T12:00:00.000Z'))).toBe(true);
    });

    it('is NOT active when expiresAt is an invalid timestamp', () => {
      const story: StoryExpiryView = { status: 'active', expiresAt: 'invalid' };
      expect(isStoryActive(story, createdAt)).toBe(false);
    });

    it('matches Property 5 definition: active iff status active AND now < expiresAt', () => {
      const now = expiresAt - 1000;
      const expected = activeStory.status === 'active' && now < expiresAt;
      expect(isStoryActive(activeStory, now)).toBe(expected);
    });
  });
});
