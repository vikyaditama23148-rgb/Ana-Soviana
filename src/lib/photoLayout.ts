import type { SceneLayout } from './sceneLayout';

export interface PhotoSlot {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rot: number;
  yaw: number;
}

/**
 * Posisi bingkai foto di kiri-kanan hati.
 * Layar lebar: kolom bertingkat di tiap sisi. Ponsel: bingkai kecil menempel di tepi.
 */
export function computePhotoSlots(layout: SceneLayout, count: number): PhotoSlot[] {
  const out: PhotoSlot[] = [];
  const { halfW, heartY0, narrow } = layout;

  if (narrow) {
    const w = 1.05;
    const h = 1.35;
    const pts: [number, number, number][] = [
      [-1, 1.5, -0.14],
      [1, 0.75, 0.12],
      [-1, -0.75, 0.1],
      [1, -1.5, -0.11],
    ];
    for (let i = 0; i < Math.min(count, pts.length); i++) {
      const [side, dy, rot] = pts[i];
      out.push({ x: side * halfW * 0.78, y: heartY0 + dy, z: -1.2, w, h, rot, yaw: -side * 0.22 });
    }
    return out;
  }

  const s = Math.min(1.05, Math.max(0.6, (halfW * 0.92 - 2.35) / 2.3));
  const w = 1.4 * s;
  const h = 1.78 * s;
  const xInner = 2.35 + w / 2;
  const xOuter = Math.max(xInner, Math.min(halfW * 0.92 - w / 2, xInner + 1.7));
  const rows = Math.min(3, Math.ceil(count / 2));
  const dys = rows === 1 ? [0.2] : rows === 2 ? [1.3, -0.5] : [1.75, 0.45, -0.85];

  for (let i = 0; i < Math.min(count, rows * 2); i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    const t = row % 2 === 0 ? 0.2 : 0.85;
    const jitter = side > 0 ? -0.25 : 0;
    out.push({
      x: side * (xInner + (xOuter - xInner) * t),
      y: heartY0 + dys[row] + jitter,
      z: -0.6 - row * 0.25,
      w,
      h,
      rot: side * (0.05 + 0.03 * row) * (row % 2 ? -1 : 1),
      yaw: -side * 0.26,
    });
  }
  return out;
}