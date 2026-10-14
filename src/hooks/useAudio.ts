import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { experience } from '../config/experience';

/**
 * File musik dicari di src/assets/music/. Jika tidak ada, `available` = false
 * dan tidak ada satu pun permintaan jaringan/error yang terjadi.
 */
const files = import.meta.glob('../assets/music/*.{mp3,ogg,wav,m4a,aac,flac}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const src: string | null = Object.values(files)[0] ?? null;

export function useAudio() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const available = src !== null;

  const ensure = useCallback(() => {
    if (!src) return null;
    if (!ref.current) {
      const a = new Audio();
      a.src = src;
      a.loop = true;
      a.preload = 'none';
      a.volume = 0;
      ref.current = a;
    }
    return ref.current;
  }, []);

  const play = useCallback(() => {
    const a = ensure();
    if (!a) return;
    a.play()
      .then(() => {
        setPlaying(true);
        gsap.to(a, { volume: experience.audio.volume, duration: 2.5, ease: 'sine.inOut' });
      })
      .catch(() => setPlaying(false));
  }, [ensure]);

  const pause = useCallback(() => {
    const a = ref.current;
    if (!a) return;
    gsap.to(a, {
      volume: 0,
      duration: 0.6,
      onComplete: () => {
        a.pause();
        setPlaying(false);
      },
    });
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  useEffect(
    () => () => {
      const a = ref.current;
      if (a) {
        gsap.killTweensOf(a);
        a.pause();
        a.src = '';
      }
    },
    [],
  );

  return { available, playing, play, toggle };
}
