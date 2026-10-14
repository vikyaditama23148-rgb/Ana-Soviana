import { useMemo } from 'react';
import { prefersReducedMotion } from '../lib/utils';

export interface DeviceProfile {
  isMobile: boolean;
  reducedMotion: boolean;
  heartParticles: number;
  orbitParticles: number;
  stars: number;
  petals: number;
  sparkles: number;
  flowerFactor: number;
  dpr: [number, number];
}

/** Menentukan kualitas visual sesuai kemampuan perangkat. */
export function useDeviceProfile(): DeviceProfile {
  return useMemo(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    const mem = (typeof navigator !== 'undefined' && (navigator as Navigator & { deviceMemory?: number }).deviceMemory) || 4;
    const isMobile = w < 820 || coarse;
    const lowEnd = cores <= 4 || mem <= 4;
    const reducedMotion = prefersReducedMotion();

    if (isMobile) {
      const heartParticles = lowEnd ? 6500 : 9000;
      return {
        isMobile,
        reducedMotion,
        heartParticles,
        orbitParticles: 260,
        stars: 350,
        petals: reducedMotion ? 10 : 34,
        sparkles: 90,
        flowerFactor: lowEnd ? 0.7 : 0.9,
        dpr: [1, 1.75],
      };
    }
    return {
      isMobile,
      reducedMotion,
      heartParticles: lowEnd ? 12000 : 18000,
      orbitParticles: 640,
      stars: 900,
      petals: reducedMotion ? 16 : 70,
      sparkles: 220,
      flowerFactor: 1,
      dpr: [1, 2],
    };
  }, []);
}
