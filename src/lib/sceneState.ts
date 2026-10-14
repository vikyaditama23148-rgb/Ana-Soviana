/**
 * State animasi yang dibagi antara UI (React) dan adegan 3D.
 * Sengaja berupa objek biasa (bukan React state) supaya animasi 60fps
 * tidak memicu render ulang React di setiap frame.
 */
export const sceneState = {
  /** 0 = partikel tersebar, 1 = hati terbentuk sempurna */
  gather: 0,
  /** 0..1 pertumbuhan batang/taman */
  grow: 0,
  /** 0..1 progres mekar bunga (bertahap sesuai delay masing-masing bunga) */
  open: 0,
  /** 0..1 visibilitas kelopak melayang */
  petals: 0,
  /** 0..1 dorongan kamera masuk ke adegan */
  camera: 0,
  /** 0 = hati di tengah, 1 = hati bergeser ke atas (saat surat dibaca) */
  layout: 0,
  /** denyut tambahan saat hati disentuh (0..1) */
  pulse: 0,
  /** kecepatan waktu (dikecilkan saat reduced motion) */
  motion: 1,
  /** true setelah frame pertama selesai dirender */
  ready: false,
};

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

/** Event bus mini: UI -> adegan 3D (mis. tombol "Pesan kecil" memicu semburan kelopak). */
export const sceneEvents = {
  on(name: string, fn: Listener) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name)!.add(fn);
    return () => listeners.get(name)?.delete(fn);
  },
  emit(name: string) {
    listeners.get(name)?.forEach((fn) => fn());
  },
};
