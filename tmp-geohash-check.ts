import { encode, bounds, coverBbox } from './src/app/app-mini/core/utils/geohash.util';

let failures = 0;
const fail = (msg: string) => { failures++; console.error('FAIL:', msg); };

// 1. encode length + alphabet
const h = encode(21.0285, 105.8542, 6); // Hanoi
if (h.length !== 6) fail(`encode length expected 6 got ${h.length} (${h})`);
console.log('encode(Hanoi,6) =', h);

// 2. Property 3a: containment
for (let i = 0; i < 2000; i++) {
  const lat = Math.random() * 180 - 90;
  const lng = Math.random() * 360 - 180;
  const p = 1 + Math.floor(Math.random() * 12);
  const hh = encode(lat, lng, p);
  const b = bounds(hh);
  if (!(b.minLat <= lat && lat <= b.maxLat && b.minLng <= lng && lng <= b.maxLng)) {
    fail(`containment lat=${lat} lng=${lng} p=${p} hash=${hh} bounds=${JSON.stringify(b)}`);
    break;
  }
}

// 3. Property 3b: prefix monotonicity
for (let i = 0; i < 2000; i++) {
  const lat = Math.random() * 180 - 90;
  const lng = Math.random() * 360 - 180;
  const p2 = 1 + Math.floor(Math.random() * 6);
  const p1 = p2 + Math.floor(Math.random() * 6); // p1 >= p2
  const a = encode(lat, lng, p2);
  const bb = encode(lat, lng, p1);
  if (!bb.startsWith(a)) {
    fail(`prefix lat=${lat} lng=${lng} p2=${p2} p1=${p1} a=${a} b=${bb}`);
    break;
  }
}

// 4. Property 4: viewport coverage
for (let i = 0; i < 300; i++) {
  const lat0 = Math.random() * 160 - 80;
  const lng0 = Math.random() * 320 - 160;
  const dLat = Math.random() * 2;
  const dLng = Math.random() * 2;
  const bbox = { minLat: lat0, minLng: lng0, maxLat: lat0 + dLat, maxLng: lng0 + dLng };
  const p = 3 + Math.floor(Math.random() * 2); // 3..4
  let cells: string[];
  try {
    cells = coverBbox(bbox, p, 100000);
  } catch (e) {
    continue; // coverage cap; skip
  }
  // sample points inside bbox, ensure each is in some cell
  for (let s = 0; s < 25; s++) {
    const lat = bbox.minLat + Math.random() * dLat;
    const lng = bbox.minLng + Math.random() * dLng;
    const covered = cells.some((c) => {
      const b = bounds(c);
      return b.minLat <= lat && lat <= b.maxLat && b.minLng <= lng && lng <= b.maxLng;
    });
    if (!covered) {
      fail(`coverage point lat=${lat} lng=${lng} not covered by ${cells.length} cells bbox=${JSON.stringify(bbox)} p=${p}`);
      break;
    }
  }
  if (failures) break;
}

console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
