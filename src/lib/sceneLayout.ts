import { clamp } from './utils';

export const FOV = 45;
const TAN = Math.tan((FOV * Math.PI) / 360);

export interface SceneLayout {
  aspect: number;
  narrow: boolean;
  camZ: number;
  /** setengah lebar & tinggi area terlihat pada bidang z = 0 */
  halfW: number;
  halfH: number;
  sideBySide: boolean;
  heartX1: number;
  heartY0: number;
  heartY1: number;
  heartScale0: number;
  heartScale1: number;
}

/**
 * Menghitung komposisi adegan dari rasio layar. Layar potret (ponsel)
 * mendapat kamera lebih jauh, hati lebih tinggi, dan area teks lebih lebar —
 * bukan sekadar mengecilkan tampilan desktop.
 */
export function computeLayout(aspect: number): SceneLayout {
  const narrow = aspect < 0.9;
  const camZ = clamp(8.6 / aspect, 11, 19);
  const halfH = camZ * TAN;
  const halfW = halfH * aspect;
  // layar lebar: saat surat dibaca, hati bergeser ke kiri dan surat di sebelah kanan
  const sideBySide = aspect > 1.25;
  return {
    sideBySide,
    heartX1: sideBySide ? -halfW * 0.4 : 0,
    aspect,
    narrow,
    camZ,
    halfW,
    halfH,
    heartY0: narrow ? halfH * 0.3 : halfH * 0.2,
    heartY1: sideBySide ? halfH * 0.04 : narrow ? halfH * 0.54 : halfH * 0.46,
    heartScale0: 1,
    heartScale1: sideBySide ? 0.92 : narrow ? 0.62 : 0.64,
  };
}
