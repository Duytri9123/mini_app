import {
  styleCache,
  styleAssetCache,
  fetchJsonWithPersistentCache,
  fetchBinaryWithPersistentCache,
  getOrFetchJsonAsset,
  getOrFetchBinaryAsset,
  cleanOldCaches,
} from './map-cache.utils';

export const DEFAULT_HANOI_LAT = 21.0285;
export const DEFAULT_HANOI_LNG = 105.8542;
export const MAPTILER_API_KEY = 'EEIC7Jm9qNPD0L5HpyasquCJ7bnHjhdv';

const MAP_PREWARM_STYLES = ['satellite-v1', 'day-v1'] as const;
const MAP_PREWARM_JSON_ASSETS = [
  `https://maptiles.openmap.vn/data/base.json?apikey=${MAPTILER_API_KEY}`,
] as const;

let mapStylesPrewarmed = false;

export function getStyleUrl(styleName: string, hiRes: boolean = false): string {
  const base = `https://maptiles.openmap.vn/styles/${styleName}/style.json?apikey=${MAPTILER_API_KEY}`;
  return hiRes ? `${base}&highres=true&scale=2` : base;
}

export function getOrFetchStyle(styleUrl: string): Promise<object> {
  if (!styleCache.has(styleUrl)) {
    styleCache.set(styleUrl, fetchJsonWithPersistentCache(styleUrl) as Promise<object>);
  }
  return styleCache.get(styleUrl)!;
}

export function filterStyleToLabelsOnly(style: any): any {
  if (!style?.layers) return style;
  style.layers = style.layers.filter((layer: any) => {
    const id = (layer.id || '').toLowerCase();
    const sourceLayer = (layer['source-layer'] || '').toLowerCase();
    if (layer.type === 'background' || layer.type === 'raster') return true;
    const isBoundaryLine = layer.type === 'line' && (
      id.includes('boundary') || id.includes('admin') || id.includes('border') ||
      sourceLayer.includes('boundary') || sourceLayer.includes('admin') || sourceLayer.includes('border')
    );
    if (isBoundaryLine) return true;
    if (id.includes('water')) return true;
    const isRoad = id.includes('road') || id.includes('highway') || id.includes('bridge') || id.includes('tunnel');
    const isRoadLabel = id.includes('road') || id.includes('highway') || id.includes('street');
    const isLabel = (id.includes('label') || layer.type === 'symbol') && isRoadLabel;
    const isBuilding = id.includes('building');
    const isExcluded = id.includes('poi') || id.includes('park') || id.includes('landuse') ||
      id.includes('natural') || id.includes('mountain') || (id.includes('place') && !isRoadLabel);
    return (isRoad || isLabel || isBuilding) && !isExcluded;
  });
  return style;
}

// ── Prewarm helpers ──────────────────────────────────────────

function isHiResStyleUrl(styleUrl: string): boolean {
  const url = new URL(styleUrl);
  return url.searchParams.get('highres') === 'true' || url.searchParams.get('scale') === '2';
}

function resolveAssetUrl(baseUrl: string, assetUrl: string): string {
  return new URL(assetUrl, baseUrl).toString();
}

function buildSpriteAssetUrl(spriteBaseUrl: string, suffix: string, ext: 'json' | 'png'): string {
  const url = new URL(spriteBaseUrl);
  url.pathname = `${url.pathname}${suffix}.${ext}`;
  return url.toString();
}

function buildSpriteBaseUrlFromStyleUrl(styleUrl: string): string {
  const url = new URL(styleUrl);
  url.pathname = url.pathname.replace(/\/style\.json$/, '/sprite');
  const apikey = url.searchParams.get('apikey');
  url.search = '';
  if (apikey) url.searchParams.set('apikey', apikey);
  return url.toString();
}

function prewarmSpriteAssets(spriteBaseUrl: string): void {
  const tasks: Promise<unknown>[] = [];
  for (const suffix of ['', '@2x']) {
    tasks.push(getOrFetchJsonAsset(buildSpriteAssetUrl(spriteBaseUrl, suffix, 'json')));
    tasks.push(getOrFetchBinaryAsset(buildSpriteAssetUrl(spriteBaseUrl, suffix, 'png')));
  }
  Promise.allSettled(tasks).catch(() => {});
}

function prewarmStyleDependencies(styleObj: any, styleUrl: string): void {
  const tasks: Promise<unknown>[] = [];
  for (const item of (Array.isArray(styleObj?.imports) ? styleObj.imports : [])) {
    if (typeof item?.url === 'string') tasks.push(getOrFetchJsonAsset(resolveAssetUrl(styleUrl, item.url)));
  }
  if (typeof styleObj?.sprite === 'string') {
    const spriteBaseUrl = resolveAssetUrl(styleUrl, styleObj.sprite);
    const suffixes = isHiResStyleUrl(styleUrl) ? ['@2x', ''] : ['', '@2x'];
    for (const suffix of suffixes) {
      tasks.push(getOrFetchJsonAsset(buildSpriteAssetUrl(spriteBaseUrl, suffix, 'json')));
      tasks.push(getOrFetchBinaryAsset(buildSpriteAssetUrl(spriteBaseUrl, suffix, 'png')));
    }
  }
  if (tasks.length) Promise.allSettled(tasks).catch(() => {});
}

function prewarmMapTilesForViewport(lat: number, lng: number, zoom: number = 11): void {
  const tileSize = 1 << zoom;
  const centerX = Math.floor(((lng + 180) / 360) * tileSize);
  const centerY = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * tileSize
  );
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const x = (centerX + dx + tileSize) % tileSize;
      const y = Math.max(0, Math.min(tileSize - 1, centerY + dy));
      const url = `https://maptiles.openmap.vn/data/base/${zoom}/${x}/${y}.pbf?apikey=${MAPTILER_API_KEY}`;
      fetchBinaryWithPersistentCache(url).catch(() => {});
    }
  }
}

/** Tải sẵn style + sprite + base.json song song khi app khởi động. Fire and forget. */
export function prewarmMapStyles(): void {
  if (mapStylesPrewarmed) return;
  mapStylesPrewarmed = true;
  cleanOldCaches();
  MAP_PREWARM_JSON_ASSETS.forEach((url) => getOrFetchJsonAsset(url));
  for (const styleName of MAP_PREWARM_STYLES) {
    const url = getStyleUrl(styleName, true);
    prewarmSpriteAssets(buildSpriteBaseUrlFromStyleUrl(url));
    getOrFetchStyle(url).then((s) => prewarmStyleDependencies(s, url)).catch(() => {});
  }
  prewarmMapTilesForViewport(DEFAULT_HANOI_LAT, DEFAULT_HANOI_LNG, 11);
}
