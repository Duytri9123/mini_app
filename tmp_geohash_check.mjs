// Throwaway sanity check (mirrors geohash.util.ts logic) — deleted after run.
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const IDX = {}; for (let i=0;i<BASE32.length;i++) IDX[BASE32[i]]=i;

function encode(lat,lng,precision){
  let latLow=-90,latHigh=90,lngLow=-180,lngHigh=180;
  let hash='',bits=0,bitCount=0,evenBit=true;
  while(hash.length<precision){
    if(evenBit){const mid=(lngLow+lngHigh)/2; if(lng>=mid){bits=(bits<<1)|1;lngLow=mid;}else{bits=bits<<1;lngHigh=mid;}}
    else{const mid=(latLow+latHigh)/2; if(lat>=mid){bits=(bits<<1)|1;latLow=mid;}else{bits=bits<<1;latHigh=mid;}}
    evenBit=!evenBit; bitCount++;
    if(bitCount===5){hash+=BASE32[bits];bits=0;bitCount=0;}
  }
  return hash;
}
function bounds(hash){
  let latLow=-90,latHigh=90,lngLow=-180,lngHigh=180,evenBit=true;
  for(const ch of hash){const idx=IDX[ch];
    for(let n=4;n>=0;n--){const bit=(idx>>n)&1;
      if(evenBit){const mid=(lngLow+lngHigh)/2; if(bit)lngLow=mid;else lngHigh=mid;}
      else{const mid=(latLow+latHigh)/2; if(bit)latLow=mid;else latHigh=mid;}
      evenBit=!evenBit;}}
  return {minLat:latLow,minLng:lngLow,maxLat:latHigh,maxLng:latLow!==undefined?latHigh:latHigh, maxLngActual:lngHigh, maxLng:lngHigh};
}

// 1) Known geohash vector
console.log('encode(57.64911,10.40744,11) =', encode(57.64911,10.40744,11), '(expect u4pruydqqvj)');

// 2) Containment (Property 3) + prefix monotonicity over random samples
let ok=true, prefixOk=true;
for(let k=0;k<20000;k++){
  const lat=Math.random()*180-90, lng=Math.random()*360-180, p=1+Math.floor(Math.random()*12);
  const h=encode(lat,lng,p); const b=bounds(h);
  if(!(b.minLat<=lat&&lat<=b.maxLat&&b.minLng<=lng&&lng<=b.maxLng)) ok=false;
  if(p>1){const p2=1+Math.floor(Math.random()*(p-1)); if(encode(lat,lng,p)!==undefined && !encode(lat,lng,p).startsWith(encode(lat,lng,p2))) prefixOk=false;}
}
console.log('Property 3 containment holds:', ok);
console.log('Property 3 prefix monotonicity holds:', prefixOk);
