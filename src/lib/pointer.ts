/** Posisi pointer (mouse/sentuhan) yang dibagi ke adegan 3D, tanpa React state. */
export const pointer = {
  /** -1..1 (target mentah) */
  tx: 0,
  ty: 0,
  /** -1..1 (dihaluskan di dalam adegan) */
  x: 0,
  y: 0,
  /** 0..1 kekuatan pengaruh; meluruh saat pointer diam/keluar */
  active: 0,
  /** koordinat dunia pada bidang z=0 (diisi oleh adegan) */
  wx: 0,
  wy: 0,
};

let attached = false;
export function attachPointer() {
  if (attached || typeof window === 'undefined') return;
  attached = true;
  const update = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    pointer.active = 1;
  };
  window.addEventListener('pointermove', update, { passive: true });
  window.addEventListener('pointerdown', update, { passive: true });
  window.addEventListener('pointerleave', () => (pointer.active = 0));
  window.addEventListener('blur', () => (pointer.active = 0));
}
