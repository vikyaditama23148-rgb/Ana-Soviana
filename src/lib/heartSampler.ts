import { mulberry32 } from './utils';

/**
 * Permukaan hati 3D (implisit):
 *   (x² + 9/4·y² + z² − 1)³ − x²·z³ − 9/80·y²·z³ = 0
 * di mana z adalah sumbu vertikal. Nilai < 0 berarti di dalam hati.
 */
function heartF(x: number, y: number, z: number) {
  const a = x * x + 2.25 * y * y + z * z - 1;
  const z3 = z * z * z;
  return a * a * a - x * x * z3 - 0.1125 * y * y * z3;
}

/** Jarak dari titik pusat ke permukaan sepanjang arah (dx,dy,dz), lewat bisection. */
function surfaceRadius(dx: number, dy: number, dz: number, cz: number) {
  let lo = 0;
  let hi = 2.4;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) * 0.5;
    if (heartF(dx * mid, dy * mid, cz + dz * mid) < 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

export interface HeartSamples {
  /** xyz per partikel, sudah dinormalisasi: lebar hati = width, berpusat di (0,0,0). */
  positions: Float32Array;
}

/**
 * Menghasilkan titik-titik yang mengisi permukaan dan sedikit volume hati,
 * sehingga hati tampak bercahaya dan memiliki kedalaman.
 */
export function sampleHeart(count: number, width = 4.4, seed = 7): HeartSamples {
  const rng = mulberry32(seed);
  const cz = 0.2; // pusat bintang (star-shaped) di ruang implisit
  const raw = new Float32Array(count * 3);
  let n = 0;
  let guard = 0;
  // Pra-hitung radius maksimum untuk rejection sampling kerapatan merata
  const rMaxProbe = 1.6;

  while (n < count && guard < count * 40) {
    guard++;
    // arah acak seragam pada bola
    const u = rng() * 2 - 1;
    const phi = rng() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dx = s * Math.cos(phi);
    const dy = s * Math.sin(phi);
    const dz = u;
    const R = surfaceRadius(dx, dy, dz, cz);
    // kerapatan permukaan ~ 1/R² dari area bola => koreksi dengan R²
    if (rng() > (R / rMaxProbe) * (R / rMaxProbe)) continue;

    const mode = rng();
    let r: number;
    if (mode < 0.72) {
      r = R * (1 - 0.07 * rng() * rng()); // lapisan kulit tipis
    } else {
      r = R * Math.cbrt(rng()) * 0.96; // isi volume
    }
    raw[n * 3] = dx * r;
    raw[n * 3 + 1] = dy * r;
    raw[n * 3 + 2] = cz + dz * r;
    n++;
  }

  // Normalisasi: x -> X, z (vertikal) -> Y, y (kedalaman) -> Z
  let minX = Infinity,
    maxX = -Infinity,
    minV = Infinity,
    maxV = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = raw[i * 3];
    const v = raw[i * 3 + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const k = width / (maxX - minX);
  const cy = (minV + maxV) / 2;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < n; i++) {
    positions[i * 3] = (raw[i * 3] - (minX + maxX) / 2) * k;
    positions[i * 3 + 1] = (raw[i * 3 + 2] - cy) * k;
    positions[i * 3 + 2] = raw[i * 3 + 1] * k * 1.1;
  }
  return { positions };
}
