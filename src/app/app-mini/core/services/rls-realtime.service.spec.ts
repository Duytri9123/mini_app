/**
 * Unit tests for RlsRealtimeService.
 *
 * The live WebSocket transport (laravel-echo + pusher-js → Reverb) is the only
 * boundary replaced with a recording test double; everything under test is the
 * service's own logic: the pure connection-status mapping, the viewport channel
 * diff (subscribe/unsubscribe) with its hard cap, and per-event idempotency.
 *
 * Property-based coverage of the idempotency fold lives in the dedicated
 * fast-check suite for `idempotency.util` (task 2.14, Property 9). These unit
 * tests assert concrete behaviours of the service that wires that util to Echo.
 */
import { TestBed } from '@angular/core/testing';

import {
  RlsRealtimeService,
  RlsRealtimeStatus,
  mapConnectionStatus,
} from './rls-realtime.service';
import { RlsAuthService } from './rls-auth.service';
import { RlsMapService } from './rls-map.service';
import { RLS_CHANNELS, RLS_REALTIME } from '../constants/rls-config.constants';
import { RlsNewMarkerEvent } from '../interfaces';

/** Records listeners bound to a channel so tests can fire events into them. */
class FakeChannel {
  readonly listeners = new Map<string, (event: unknown) => void>();
  listen(event: string, cb: (event: unknown) => void): this {
    this.listeners.set(event, cb);
    return this;
  }
  fire(event: string, payload: unknown): void {
    this.listeners.get(event)?.(payload);
  }
}

/** Minimal recording stand-in for the Echo<'reverb'> instance. */
class FakeEcho {
  readonly channels = new Map<string, FakeChannel>();
  readonly privates = new Map<string, FakeChannel>();
  readonly left: string[] = [];
  leftAll = 0;
  disconnected = 0;

  channel(name: string): FakeChannel {
    const ch = new FakeChannel();
    this.channels.set(name, ch);
    return ch;
  }
  private(name: string): FakeChannel {
    const ch = new FakeChannel();
    this.privates.set(name, ch);
    return ch;
  }
  leaveChannel(name: string): void {
    this.left.push(name);
  }
  leaveAllChannels(): void {
    this.leftAll += 1;
  }
  disconnect(): void {
    this.disconnected += 1;
  }
}

describe('RlsRealtimeService', () => {
  let service: RlsRealtimeService;
  let mapService: jasmine.SpyObj<RlsMapService>;
  let authService: jasmine.SpyObj<RlsAuthService>;

  beforeEach(() => {
    mapService = jasmine.createSpyObj<RlsMapService>('RlsMapService', [
      'geohashCellsForViewport',
    ]);
    // viewportChange$ is read in connect(); not exercised by these tests.
    (mapService as unknown as { viewportChange$: unknown }).viewportChange$ = {
      subscribe: () => ({ unsubscribe: () => {} }),
    };

    authService = jasmine.createSpyObj<RlsAuthService>('RlsAuthService', [
      'getAccessToken',
      'getCurrentUser',
    ]);
    authService.getAccessToken.and.returnValue('test-token');
    authService.getCurrentUser.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        RlsRealtimeService,
        { provide: RlsMapService, useValue: mapService },
        { provide: RlsAuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(RlsRealtimeService);
  });

  /** Inject the fake Echo so channel-level logic runs without a real socket. */
  function attachFakeEcho(): FakeEcho {
    const fake = new FakeEcho();
    (service as unknown as { echo: FakeEcho }).echo = fake;
    return fake;
  }

  describe('mapConnectionStatus', () => {
    const cases: Array<[string, RlsRealtimeStatus]> = [
      ['connected', 'connected'],
      ['connecting', 'connecting'],
      ['initialized', 'connecting'],
      ['unavailable', 'disconnected'],
      ['failed', 'disconnected'],
      ['disconnected', 'disconnected'],
      ['anything-else', 'disconnected'],
    ];
    for (const [input, expected] of cases) {
      it(`maps "${input}" -> "${expected}"`, () => {
        expect(mapConnectionStatus(input)).toBe(expected);
      });
    }
  });

  describe('syncViewportChannels (diff + hard cap)', () => {
    it('subscribes one area channel per viewport cell', () => {
      const fake = attachFakeEcho();
      service.syncViewportChannels(['u4pruyd', 'u4pruye']);

      expect([...fake.channels.keys()].sort()).toEqual(
        [RLS_CHANNELS.area('u4pruyd'), RLS_CHANNELS.area('u4pruye')].sort(),
      );
    });

    it('binds the three area event contracts on each channel', () => {
      const fake = attachFakeEcho();
      service.syncViewportChannels(['u4pruyd']);

      const channel = fake.channels.get(RLS_CHANNELS.area('u4pruyd'))!;
      expect(channel.listeners.has('.NewMarker')).toBeTrue();
      expect(channel.listeners.has('.ActivityCounterUpdated')).toBeTrue();
      expect(channel.listeners.has('.NewFeedItem')).toBeTrue();
    });

    it('diffs on viewport change: keeps overlap, leaves stale, adds new', () => {
      const fake = attachFakeEcho();
      service.syncViewportChannels(['a', 'b']);
      // Move viewport: 'a' stays, 'b' leaves, 'c' is new.
      service.syncViewportChannels(['a', 'c']);

      expect(fake.left).toContain(RLS_CHANNELS.area('b'));
      expect(fake.left).not.toContain(RLS_CHANNELS.area('a'));
      expect(fake.channels.has(RLS_CHANNELS.area('c'))).toBeTrue();
    });

    it('does not re-subscribe channels already in the viewport', () => {
      const fake = attachFakeEcho();
      service.syncViewportChannels(['a']);
      const firstChannel = fake.channels.get(RLS_CHANNELS.area('a'));

      service.syncViewportChannels(['a']);
      // No leave for 'a', and the channel instance is untouched (not recreated).
      expect(fake.left).not.toContain(RLS_CHANNELS.area('a'));
      expect(fake.channels.get(RLS_CHANNELS.area('a'))).toBe(firstChannel!);
    });

    it('enforces the hard cap on the number of area channels', () => {
      const fake = attachFakeEcho();
      const tooMany = Array.from(
        { length: RLS_REALTIME.MAX_VIEWPORT_CELLS + 5 },
        (_, i) => `cell${i}`,
      );

      service.syncViewportChannels(tooMany);

      expect(fake.channels.size).toBe(RLS_REALTIME.MAX_VIEWPORT_CELLS);
    });

    it('pulls cells from RlsMapService when none are passed', () => {
      const fake = attachFakeEcho();
      mapService.geohashCellsForViewport.and.returnValue(['x', 'y']);

      service.syncViewportChannels();

      expect(mapService.geohashCellsForViewport).toHaveBeenCalled();
      expect(fake.channels.size).toBe(2);
    });

    it('is a no-op before connect (no echo)', () => {
      expect(() => service.syncViewportChannels(['a'])).not.toThrow();
    });
  });

  describe('per-event idempotency', () => {
    function makeMarker(id: string): RlsNewMarkerEvent {
      return {
        id,
        markerId: `m-${id}`,
        type: 'cafe',
        lat: 21.0,
        lng: 105.8,
        thumbnailUrl: 'https://example.test/x.jpg',
        createdAt: '2024-01-01T00:00:00Z',
      };
    }

    it('emits a NewMarker event only once for a repeated event id', () => {
      const fake = attachFakeEcho();
      service.syncViewportChannels(['a']);
      const channel = fake.channels.get(RLS_CHANNELS.area('a'))!;

      const received: RlsNewMarkerEvent[] = [];
      service.newMarker$.subscribe((e) => received.push(e));

      const event = makeMarker('evt-1');
      channel.fire('.NewMarker', event); // first delivery
      channel.fire('.NewMarker', event); // duplicate (reconnect/replay)

      expect(received.length).toBe(1);
      expect(received[0].id).toBe('evt-1');
    });

    it('emits distinct event ids independently', () => {
      const fake = attachFakeEcho();
      service.syncViewportChannels(['a']);
      const channel = fake.channels.get(RLS_CHANNELS.area('a'))!;

      const received: RlsNewMarkerEvent[] = [];
      service.newMarker$.subscribe((e) => received.push(e));

      channel.fire('.NewMarker', makeMarker('evt-1'));
      channel.fire('.NewMarker', makeMarker('evt-2'));

      expect(received.map((e) => e.id)).toEqual(['evt-1', 'evt-2']);
    });

    it('ignores events missing an id (invalid per contract §7)', () => {
      const fake = attachFakeEcho();
      service.syncViewportChannels(['a']);
      const channel = fake.channels.get(RLS_CHANNELS.area('a'))!;

      const received: RlsNewMarkerEvent[] = [];
      service.newMarker$.subscribe((e) => received.push(e));

      channel.fire('.NewMarker', { ...makeMarker('x'), id: '' });
      channel.fire('.NewMarker', null);

      expect(received.length).toBe(0);
    });
  });

  describe('private user channel', () => {
    it('subscribes private-user.{id} without double-prefixing', () => {
      authService.getCurrentUser.and.returnValue({ id: 42 } as ReturnType<
        RlsAuthService['getCurrentUser']
      >);
      const fake = attachFakeEcho();

      // subscribeUserChannel is private; exercised through connect()'s path.
      (
        service as unknown as { subscribeUserChannel: () => void }
      ).subscribeUserChannel();

      // Echo.private() re-adds the "private-" prefix, so the arg must not have it.
      expect(fake.privates.has('user.42')).toBeTrue();
      const channel = fake.privates.get('user.42')!;
      expect(channel.listeners.has('.NotificationReceived')).toBeTrue();
    });

    it('does nothing when unauthenticated', () => {
      authService.getCurrentUser.and.returnValue(null);
      const fake = attachFakeEcho();

      (
        service as unknown as { subscribeUserChannel: () => void }
      ).subscribeUserChannel();

      expect(fake.privates.size).toBe(0);
    });
  });
});
