import gsap from 'gsap';
import { sceneState } from './sceneState';
import { experience } from '../config/experience';
import { prefersReducedMotion } from './utils';

// Animasi berbasis waktu nyata: di perangkat lambat urutan tetap selesai tepat waktu
// (frame boleh turun, tetapi tidak membuat pengalaman berjalan dalam gerak lambat).
gsap.ticker.lagSmoothing(0);

let timeline: gsap.core.Timeline | null = null;
let layoutTween: gsap.core.Tween | null = null;

const speed = () => (prefersReducedMotion() ? 0.35 : 1);

/** Urutan pembukaan: partikel berkumpul -> hati -> taman tumbuh -> bunga mekar. */
export function playOpening(onHeartFormed: () => void) {
  timeline?.kill();
  const a = experience.animation;
  const k = speed();
  const tl = gsap.timeline();
  timeline = tl;

  tl.to(sceneState, { petals: 1, duration: 3 * k, ease: 'sine.inOut' }, 0.2 * k)
    .to(sceneState, { camera: 1, duration: (a.heartFormSeconds + 2) * k, ease: 'power2.inOut' }, 0)
    .to(sceneState, { gather: 1, duration: a.heartFormSeconds * k, ease: 'power1.inOut' }, 0.3 * k)
    .to(sceneState, { grow: 1, duration: a.gardenGrowSeconds * k, ease: 'power1.out' }, 1.6 * k)
    .to(sceneState, { open: 1, duration: a.gardenBloomSeconds * k, ease: 'sine.inOut' }, 2.4 * k)
    .call(onHeartFormed, [], (a.heartFormSeconds + 0.2) * k);
}

/** Mengembalikan adegan ke keadaan awal (dipakai oleh tombol ulangi). */
export function collapseScene(onDone: () => void) {
  timeline?.kill();
  layoutTween?.kill();
  const k = speed();
  const tl = gsap.timeline({ onComplete: onDone });
  timeline = tl;
  tl.to(sceneState, { layout: 0, duration: 0.8 * k, ease: 'power2.inOut' }, 0)
    .to(sceneState, { open: 0, grow: 0, duration: 1.4 * k, ease: 'power2.in' }, 0)
    .to(sceneState, { gather: 0, duration: 1.6 * k, ease: 'power2.in' }, 0.1)
    .to(sceneState, { petals: 0.4, camera: 0, duration: 1.6 * k, ease: 'power2.inOut' }, 0.1);
}

export function setLayout(value: number) {
  layoutTween?.kill();
  layoutTween = gsap.to(sceneState, { layout: value, duration: 1.4 * speed(), ease: 'power3.inOut' });
}

export function pulseHeart() {
  gsap.killTweensOf(sceneState, 'pulse');
  sceneState.pulse = 1;
  gsap.to(sceneState, { pulse: 0, duration: 1.4, ease: 'power3.out' });
}

export function killDirector() {
  timeline?.kill();
  layoutTween?.kill();
  gsap.killTweensOf(sceneState);
}
