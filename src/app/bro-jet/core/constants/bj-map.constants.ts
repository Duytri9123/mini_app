/**
 * BRO JET – Map constants
 * Prefix bj- để không xung đột với dự án cũ
 */
export const BJ_MAP = {
  // MapLibre layer / source IDs
  STATION_SOURCE_ID: 'bj-station-markers-source',
  STATION_CLUSTER_LAYER: 'bj-station-clusters',
  STATION_CLUSTER_COUNT: 'bj-station-cluster-count',
  STATION_SINGLE_LAYER: 'bj-station-single-points',
  USER_SOURCE_ID: 'bj-user-marker-source',
  USER_LAYER_ID: 'bj-user-marker-layer',
  RADIUS_CIRCLE_ID: 'bj-radius-circle',

  // DOM container ID
  MAP_CONTAINER_ID: 'bjMapContainer',

  // Defaults
  DEFAULT_ZOOM: 13,
  DEFAULT_LAT: 21.0285,
  DEFAULT_LNG: 105.8542,
} as const;
