// ============================================================
// Cache Layer 1 — In-memory (mất khi reload)
// ============================================================

/** Cache Promise<object> theo URL — dedup mọi request trong cùng session */
export const styleCache = new Map<string, Promise<object>>();

/** Cache asset (JSON + binary) theo URL — dedup mọi request trong cùng session */
export const styleAssetCache = new Map<string, Promise<unknown>>();

// ============================================================
// Cache Layer 2 — Cache API (persist qua reload, lưu trên disk)
// ============================================================

/**
 * Tên cache — bump version này khi tile server cập nhật style để invalidate cache cũ.
 */
const CACHE_STORAGE_NAME = 'map-assets-v1';

/** TTL 7 ngày */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isCacheStorageAvailable(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/** Xoá các cache version cũ khi app khởi động. Fire and forget. */
export function cleanOldCaches(): void {
  if (!isCacheStorageAvailable()) return;
  caches.keys().then((keys) => {
    keys
      .filter((k) => k.startsWith('map-assets-') && k !== CACHE_STORAGE_NAME)
      .forEach((k) => caches.delete(k));
  }).catch(() => {});
}

function copyHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => { result[key] = value; });
  return result;
}

export async function fetchJsonWithPersistentCache(url: string): Promise<unknown> {
  if (isCacheStorageAvailable()) {
    try {
      const cache = await caches.open(CACHE_STORAGE_NAME);
      const cached = await cache.match(url);
      if (cached) {
        const age = Date.now() - Number(cached.headers.get('X-Cached-At') ?? 0);
        if (age < CACHE_TTL_MS) return cached.json();
        await cache.delete(url);
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch failed (${response.status}): ${url}`);
      cache.put(url, new Response(response.clone().body, {
        headers: { ...copyHeaders(response.headers), 'X-Cached-At': String(Date.now()) },
      }));
      return response.json();
    } catch {}
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed (${response.status}): ${url}`);
  return response.json();
}

export async function fetchBinaryWithPersistentCache(url: string): Promise<unknown> {
  if (isCacheStorageAvailable()) {
    try {
      const cache = await caches.open(CACHE_STORAGE_NAME);
      const cached = await cache.match(url);
      if (cached) {
        const age = Date.now() - Number(cached.headers.get('X-Cached-At') ?? 0);
        if (age < CACHE_TTL_MS) return cached.blob();
        await cache.delete(url);
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch failed (${response.status}): ${url}`);
      cache.put(url, new Response(response.clone().body, {
        headers: { ...copyHeaders(response.headers), 'X-Cached-At': String(Date.now()) },
      }));
      return response.blob();
    } catch {}
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed (${response.status}): ${url}`);
  return response.blob();
}

export function getOrFetchJsonAsset(url: string): Promise<unknown> {
  if (!styleAssetCache.has(url)) {
    styleAssetCache.set(url, fetchJsonWithPersistentCache(url));
  }
  return styleAssetCache.get(url)!;
}

export function getOrFetchBinaryAsset(url: string): Promise<unknown> {
  if (!styleAssetCache.has(url)) {
    styleAssetCache.set(url, fetchBinaryWithPersistentCache(url));
  }
  return styleAssetCache.get(url)!;
}
