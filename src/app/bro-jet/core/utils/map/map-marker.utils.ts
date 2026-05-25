import { Feature, FeatureCollection } from 'geojson';
import { BJ_MAP } from '../../constants/bj-map.constants';

// ============================================================
// Constants
// ============================================================

const DEFAULT_AVATAR = 'assets/images/default-avatar.png';

export const SHARED_USER_LAYER_ID = 'shared-user-marker-layer';
export const SHARED_USER_SOURCE_ID = 'shared-user-marker-source';
export const SHARED_RADIUS_CIRCLE_ID = 'shared-radius-circle';

/**
 * Interface for Map Layer IDs used for car wash markers
 */
export interface BjStationMapLayerIds {
  source: string;
  cluster: string;
  clusterCount: string;
  single: string;
}

// ============================================================
// Image loading helpers
// ============================================================

const imageCache = new Map<string, { image: HTMLImageElement; timestamp: number }>();
const IMAGE_CACHE_TTL = 60 * 60 * 1000;

function loadFallback(resolve: (img: HTMLImageElement) => void, fallbackUrl: string): void {
  const fallback = new Image();
  fallback.crossOrigin = 'anonymous';
  fallback.onload = () => resolve(fallback);
  fallback.onerror = () => {
    const empty = document.createElement('canvas');
    empty.width = 1; empty.height = 1;
    const img = new Image();
    img.src = empty.toDataURL();
    resolve(img);
  };
  fallback.src = fallbackUrl;
}

export function loadImageWithTimeout(
  url: string,
  timeout: number = 5000,
  fallbackUrl: string = DEFAULT_AVATAR,
): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached && Date.now() - cached.timestamp < IMAGE_CACHE_TTL) return Promise.resolve(cached.image);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => loadFallback(resolve, fallbackUrl), timeout);
    img.onload = () => {
      clearTimeout(timer);
      imageCache.set(url, { image: img, timestamp: Date.now() });
      resolve(img);
    };
    img.onerror = () => { clearTimeout(timer); loadFallback(resolve, fallbackUrl); };
    img.src = url;
  });
}

export async function loadImageWithRetry(
  url: string,
  maxRetries: number = 3,
  timeout: number = 3000,
  fallbackUrl: string = DEFAULT_AVATAR,
): Promise<HTMLImageElement> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await loadImageWithTimeout(url, timeout, fallbackUrl);
    } catch {
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return loadImageWithTimeout(fallbackUrl, timeout, fallbackUrl);
}

// ============================================================
// Canvas helpers
// ============================================================

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number, radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// ============================================================
// User marker
// ============================================================

const userMarkerCanvasCache = new Map<string, ImageData>();
let globalAvatarUrl: string = DEFAULT_AVATAR;

export function setGlobalUserAvatarUrl(url: string, forceRefresh: boolean = false): void {
  if (forceRefresh) userMarkerCanvasCache.delete(url);
  if (url !== globalAvatarUrl) {
    userMarkerCanvasCache.delete(globalAvatarUrl);
    globalAvatarUrl = url;
  }
}

export function getGlobalUserAvatarUrl(): string { return globalAvatarUrl; }

export function clearUserMarkerCache(): void { userMarkerCanvasCache.clear(); }

export function createUserMarkerCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const size = 200, arrowHeight = 30, arrowWidth = 70, borderWidth = 13, radius = 48;
  const scale = 1.6;
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = (size + arrowHeight) * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = '#10B981';
  roundRect(ctx, 0, 0, size, size, radius);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(size / 2 - arrowWidth / 2, size);
  ctx.lineTo(size / 2 - 5, size + arrowHeight - 5);
  ctx.quadraticCurveTo(size / 2, size + arrowHeight, size / 2 + 5, size + arrowHeight - 5);
  ctx.lineTo(size / 2 + arrowWidth / 2, size);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, borderWidth, borderWidth, size - borderWidth * 2, size - borderWidth * 2, radius - borderWidth);
  ctx.fill();

  ctx.save();
  roundRect(ctx, borderWidth, borderWidth, size - borderWidth * 2, size - borderWidth * 2, radius - borderWidth);
  ctx.clip();

  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const inner = size - borderWidth * 2;
  let dw: number, dh: number, dx: number, dy: number;
  if (imgH > imgW) {
    dw = inner; dh = (imgH / imgW) * inner; dx = borderWidth; dy = borderWidth - (dh - inner) / 2;
  } else {
    dh = inner; dw = (imgW / imgH) * inner; dx = borderWidth - (dw - inner) / 2; dy = borderWidth;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return canvas;
}

export async function loadUserMarkerImageToMap(
  map: import('maplibre-gl').Map,
  avatarUrl: string = globalAvatarUrl,
  fallbackUrl: string = DEFAULT_AVATAR,
): Promise<boolean> {
  const imageId = 'user-marker-icon';
  if (map.hasImage(imageId)) { try { map.removeImage(imageId); } catch { } }

  const cached = userMarkerCanvasCache.get(avatarUrl);
  if (cached) {
    try { map.addImage(imageId, cached, { pixelRatio: 2 }); return true; } catch { }
  }

  const tryDraw = async (url: string): Promise<boolean> => {
    try {
      const img = await loadImageWithRetry(url);
      const canvas = createUserMarkerCanvas(img);
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      userMarkerCanvasCache.set(url, imageData);
      if (!map.hasImage(imageId)) map.addImage(imageId, imageData, { pixelRatio: 2 });
      return true;
    } catch { return false; }
  };

  if (await tryDraw(avatarUrl)) return true;
  return tryDraw(fallbackUrl);
}

export function addSharedUserMarkerLayer(
  map: any,
  sourceId: string = SHARED_USER_SOURCE_ID,
  layerId: string = SHARED_USER_LAYER_ID,
): void {
  if (!map) return;
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
  map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: layerId, type: 'symbol', source: sourceId,
    layout: {
      'icon-image': 'user-marker-icon', 'icon-size': 0.32,
      'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
    },
  });
}

export function updateSharedUserMarkerPosition(
  map: any, lat: number, lng: number, sourceId: string = SHARED_USER_SOURCE_ID,
): void {
  const source = map?.getSource(sourceId);
  if (!source) return;
  source.setData({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { type: 'user' } }],
  });
}

// ============================================================
// Radius circle
// ============================================================

export function createCircleGeoJSON(center: [number, number], radiusInKm: number): Feature {
  const points = 82;
  const coords: [number, number][] = [];
  const distanceX = radiusInKm / (111.320 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusInKm / 110.574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    coords.push([center[0] + distanceX * Math.cos(theta), center[1] + distanceY * Math.sin(theta)]);
  }
  coords.push(coords[0]);
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
}

export function drawSharedRadiusCircle(
  map: any, lat: number, lng: number, radiusMeters: number,
  circleId: string = SHARED_RADIUS_CIRCLE_ID,
  color: string = '#3B82F6', opacity: number = 0.1,
): void {
  if (!map || radiusMeters <= 0) return;
  const geojson = createCircleGeoJSON([lng, lat], radiusMeters / 1000);
  const existingSource = map.getSource(circleId);
  if (existingSource) { existingSource.setData(geojson); return; }
  map.addSource(circleId, { type: 'geojson', data: geojson });
  map.addLayer({ id: circleId, type: 'fill', source: circleId, paint: { 'fill-color': color, 'fill-opacity': opacity } });
  map.addLayer({ id: `${circleId}-outline`, type: 'line', source: circleId, paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.3 } });
}

// ============================================================
// BJ Station marker
// ============================================================

// ============================================================
// BJ Station marker
// ============================================================

const bjStationMarkerCache = new Map<string, ImageData>();

/**
 * Creates a marker canvas with dynamic color
 */
export function createBjStationMarkerCanvas(color: string): HTMLCanvasElement {
  const size = 96, arrowH = 18, r = size / 2, scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = (size + arrowH) * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const cx = size / 2, cy = size / 2;

  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.moveTo(cx - 10, size - 2);
  ctx.lineTo(cx, size + arrowH - 2);
  ctx.lineTo(cx + 10, size - 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.save();
  ctx.translate(cx - 20, cy - 18);
  ctx.fillStyle = '#FFFFFF';

  ctx.beginPath();
  ctx.roundRect(4, 16, 32, 14, 3);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(10, 16); ctx.lineTo(13, 8); ctx.lineTo(27, 8); ctx.lineTo(30, 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(12, 30, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(28, 30, 4, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [10, 20, 30].forEach((x) => { ctx.beginPath(); ctx.arc(x, 4, 2, 0, Math.PI * 2); ctx.fill(); });

  ctx.restore();
  return canvas;
}

export const BJ_MARKER_COLORS = {
  active: '#10B981',   // Green
  inactive: '#EF4444', // Red
  closed: '#F59E0B',   // Orange
  selected: '#2563EB', // Blue
};

export function registerBjStationMarkerImages(map: import('maplibre-gl').Map): void {
  const markerTypes = Object.keys(BJ_MARKER_COLORS) as (keyof typeof BJ_MARKER_COLORS)[];

  markerTypes.forEach((type) => {
    const imageId = `bj-station-icon-${type}`;
    if (map.hasImage(imageId)) return;

    let imageData = bjStationMarkerCache.get(type);
    if (!imageData) {
      const color = BJ_MARKER_COLORS[type];
      const canvas = createBjStationMarkerCanvas(color);
      const ctx = canvas.getContext('2d')!;
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      bjStationMarkerCache.set(type, imageData);
    }
    try { map.addImage(imageId, imageData, { pixelRatio: 2 }); } catch { }
  });
}

// ============================================================
// Clustering
// ============================================================

/**
 * Adds a GeoJSON source with clustering for stations
 */
export function addBjStationMarkerSource(
  map: any,
  sourceId: string,
  geojson: any,
  clusterRadius: number = 55
): void {
  if (!map) return;
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  map.addSource(sourceId, {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 16,
    clusterRadius: clusterRadius,
  });
}

/**
 * Adds standard cluster and point layers for stations
 */
export function addBjStationMarkerLayers(
  map: any,
  layerIds: BjStationMapLayerIds,
  singleIconSize: number = 0.45
): void {
  if (!map) return;

  // 1. Single points
  map.addLayer({
    id: layerIds.single,
    type: 'symbol',
    source: layerIds.source,
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': [
        'match',
        ['get', 'markerType'],
        'selected', 'bj-station-icon-selected',
        'inactive', 'bj-station-icon-inactive',
        'closed', 'bj-station-icon-closed',
        'bj-station-icon-active' // default to active
      ],
      'icon-size': singleIconSize,
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-ignore-placement': false,
    },
  });

  // 2. Clusters
  map.addLayer({
    id: layerIds.cluster,
    type: 'circle',
    source: layerIds.source,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f59e0b', // Selected cluster color (Amber)
        '#1164ed'  // Normal cluster color (Brand blue)
      ],
      'circle-radius': ['step', ['get', 'point_count'], 18, 5, 22, 12, 26, 25, 30],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.9,
    },
  }, layerIds.single);

  // 3. Cluster count
  map.addLayer({
    id: layerIds.clusterCount,
    type: 'symbol',
    source: layerIds.source,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count}',
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': 14,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#ffffff',
    },
  }, layerIds.single);
}
