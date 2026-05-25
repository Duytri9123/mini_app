import * as maplibregl from 'maplibre-gl';
import { getOrFetchStyle, filterStyleToLabelsOnly } from './map-style.utils';

export interface MapBaseEventHandlers {
  moveEndHandler: () => void;
  errorHandler: (e: any) => void;
  contextLostHandler: () => void;
  contextRestoredHandler: () => void;
}

export function isMobile(): boolean {
  return window.innerWidth < 768;
}

export function calculateZoomLevel(radiusMeters: number): number {
  const radiusKm = radiusMeters / 1000;
  const mobile = isMobile();
  if (radiusKm <= 5) return mobile ? 11.5 : 12.3;
  if (radiusKm <= 10) return mobile ? 10 : 11.6;
  if (radiusKm <= 20) return mobile ? 9 : 10.6;
  if (radiusKm <= 30) return mobile ? 9 : 10;
  return mobile ? 8 : 9;
}

function buildMapOptions(
  container: string,
  style: any,
  center: [number, number],
  zoom: number,
): maplibregl.MapOptions {
  return {
    container,
    style,
    center,
    zoom,
    pitch: 0,
    bearing: 0,
    attributionControl: { compact: true },
    maxZoom: 18,
    minZoom: 6,
    maxBounds: [[92, -12], [135, 35]],
    fadeDuration: 300,
    interactive: true,
    trackResize: true,
    pixelRatio: window.devicePixelRatio || 2,
  };
}

function applyMapInteractions(map: maplibregl.Map): void {
  map.scrollZoom.setWheelZoomRate(1 / 150);
  map.dragPan.disable();
  map.dragPan.enable({ linearity: 0.3, maxSpeed: 1800, deceleration: 3500 });
}

export async function createMapInstanceAsync(
  container: string,
  styleUrl: string,
  center: [number, number],
  zoom: number,
): Promise<maplibregl.Map> {
  const styleObj = await getOrFetchStyle(styleUrl);
  const map = new maplibregl.Map(buildMapOptions(container, filterStyleToLabelsOnly(styleObj), center, zoom));
  applyMapInteractions(map);
  return map;
}

export async function setMapStyleAsync(map: maplibregl.Map, styleUrl: string): Promise<void> {
  try {
    const styleObj = await getOrFetchStyle(styleUrl);
    map.setStyle(filterStyleToLabelsOnly(styleObj) as any);
  } catch {
    map.setStyle(styleUrl);
  }
}

export function addNavigationControl(map: maplibregl.Map): void {
  map.addControl(
    new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: false }),
    'top-left',
  );
}

export function setupBaseMapEvents(
  map: maplibregl.Map,
  onMoveEnd: () => void,
  onContextRestored: () => void,
  moveEndDelay: number = 300,
): MapBaseEventHandlers {
  let moveEndTimeout: ReturnType<typeof setTimeout> | null = null;

  const moveEndHandler = () => {
    if (moveEndTimeout) clearTimeout(moveEndTimeout);
    moveEndTimeout = setTimeout(() => onMoveEnd(), moveEndDelay);
  };
  const errorHandler = (_e: any) => {};
  const contextLostHandler = () => {};
  const contextRestoredHandler = () => onContextRestored();

  map.on('moveend', moveEndHandler);
  map.on('error', errorHandler);
  map.on('webglcontextlost', contextLostHandler);
  map.on('webglcontextrestored', contextRestoredHandler);

  return { moveEndHandler, errorHandler, contextLostHandler, contextRestoredHandler };
}
