import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { gardenRegistry } from '../lib/gardenRegistry';
import { lerp } from '../lib/utils';
import { sceneEvents, sceneState } from '../lib/sceneState';
import { pulseHeart } from '../lib/director';
import { burstApi } from './PetalBurst';
import { photoRegistry } from '../lib/photoRegistry';
import type { SceneLayout } from '../lib/sceneLayout';

interface Props {
  layout: SceneLayout;
  enabled: boolean;
}

/**
 * Interaksi: hover (desktop) menyorot bunga, ketukan/klik pada bunga melepas
 * kelopak bercahaya, ketukan pada hati membuatnya berdenyut.
 * Pengujian "kena" dilakukan di CPU terhadap bola kecil — murah & andal.
 */
export default function InteractionLayer({ layout, enabled }: Props) {
  const { gl, camera, raycaster } = useThree();
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const hoverTarget = useMemo(() => ({ index: -1 }), []);
  const heartCenter = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const heartColor = useMemo(() => new THREE.Color('#ff4f7a'), []);

  useEffect(() => {
    const el = gl.domElement;

    const pick = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      let best = -1;
      let bestScore = Infinity;
      gardenRegistry.heads.forEach((h, i) => {
        const d = raycaster.ray.distanceToPoint(h.pos) / h.radius;
        if (d < 1 && d < bestScore) {
          best = i;
          bestScore = d;
        }
      });
      return best;
    };

    const pickPhoto = () => {
      let best = -1;
      let bestScore = Infinity;
      photoRegistry.slots.forEach((h, i) => {
        if (!h.visible) return;
        const d = raycaster.ray.distanceToPoint(h.pos) / h.radius;
        if (d < 1 && d < bestScore) {
          best = i;
          bestScore = d;
        }
      });
      return best;
    };

    const heartHit = () => {
      const y = lerp(layout.heartY0, layout.heartY1, sceneState.layout);
      const s = lerp(layout.heartScale0, layout.heartScale1, sceneState.layout);
      heartCenter.set(lerp(0, layout.heartX1, sceneState.layout), y, 0);
      return raycaster.ray.distanceToPoint(heartCenter) < 2.2 * s;
    };

    const onMove = (e: PointerEvent) => {
      if (!enabled || e.pointerType === 'touch') return;
      hoverTarget.index = pick(e.clientX, e.clientY);
      photoRegistry.hover = pickPhoto();
      el.style.cursor = hoverTarget.index >= 0 || photoRegistry.hover >= 0 || heartHit() ? 'pointer' : 'default';
    };

    const onDown = (e: PointerEvent) => {
      if (!enabled) return;
      const i = pick(e.clientX, e.clientY);
      const ph = pickPhoto();
      if (ph >= 0 && i < 0) {
        photoRegistry.onSelect(photoRegistry.slots[ph].photoIndex);
      } else if (i >= 0) {
        const h = gardenRegistry.heads[i];
        burstApi.spawn(h.pos, h.color);
        hoverTarget.index = e.pointerType === 'touch' ? -1 : i;
        if (e.pointerType === 'touch') {
          // sorot singkat pada layar sentuh
          gardenRegistry.hover.set(h.pos.x, h.pos.y, h.pos.z, 1);
        }
      } else if (heartHit()) {
        pulseHeart();
        raycaster.ray.closestPointToPoint(heartCenter, tmp);
        burstApi.spawn(tmp, heartColor);
      }
    };

    const onLeave = () => {
      hoverTarget.index = -1;
      photoRegistry.hover = -1;
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerleave', onLeave);

    // tombol "Pesan kecil" di UI memicu semburan acak
    const off = sceneEvents.on('burstRandom', () => {
      const heads = gardenRegistry.heads;
      if (!heads.length) return;
      const h = heads[Math.floor(Math.random() * heads.length)];
      burstApi.spawn(h.pos, h.color);
      gardenRegistry.hover.set(h.pos.x, h.pos.y, h.pos.z, 1);
      pulseHeart();
    });

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerleave', onLeave);
      off();
      el.style.cursor = 'default';
    };
  }, [gl, camera, raycaster, ndc, layout, enabled, hoverTarget, heartCenter, tmp, heartColor]);

  useFrame((_, dt) => {
    const hv = gardenRegistry.hover;
    const idx = hoverTarget.index;
    if (idx >= 0 && gardenRegistry.heads[idx]) {
      const p = gardenRegistry.heads[idx].pos;
      hv.x = p.x;
      hv.y = p.y;
      hv.z = p.z;
      hv.w = Math.min(1, hv.w + dt * 6);
    } else {
      hv.w = Math.max(0, hv.w - dt * 1.6);
    }
  });

  return null;
}