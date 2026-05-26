const cache = new Map<string, unknown>();

export function setMapCache<T>(key: string, value: T): void {
  cache.set(key, value);
}

export function getMapCache<T>(key: string): T | null {
  return (cache.get(key) as T | undefined) ?? null;
}

export function clearMapCache(): void {
  cache.clear();
}
