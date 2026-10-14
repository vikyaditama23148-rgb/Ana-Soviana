import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { experience } from '../config/experience';
import { loadPhotoTexture, LoadedPhoto, photos } from '../lib/photos';
import { computePhotoSlots, PhotoSlot } from '../lib/photoLayout';
import { photoRegistry } from '../lib/photoRegistry';
import { pointer } from '../lib/pointer';
import { sceneState } from '../lib/sceneState';
import type { SceneLayout } from '../lib/sceneLayout';
import type { DeviceProfile } from '../hooks/useDeviceProfile';

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Bingkai foto: sudut membulat, garis emas champagne tipis, mat burgundy,
 * foto "cover-fit", dan halo merah muda lembut di luar bingkai.
 */
const fragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform float uImgAspect;
  uniform float uShow;
  uniform float uHover;
  uniform float uTime;
  uniform vec2 uPlane;
  uniform vec2 uFrame;
  varying vec2 vUv;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  vec3 srgb(vec3 c) { return pow(c, vec3(2.2)); }

  void main() {
    vec2 p = (vUv - 0.5) * uPlane;
    float radius = 0.1;
    float border = 0.026;
    float mat = 0.05;
    float d = sdRoundBox(p, uFrame * 0.5, radius);
    float aa = max(fwidth(d), 0.0008);

    float inside = 1.0 - smoothstep(-aa, aa, d);
    float inBorder = smoothstep(-border - aa, -border + aa, d);
    float inMat = smoothstep(-border - mat - aa, -border - mat + aa, d);

    // foto: cover-fit di area dalam bingkai
    vec2 inner = uFrame - 2.0 * (border + mat);
    vec2 q = p / inner + 0.5;
    float fa = inner.x / inner.y;
    vec2 uvp = q;
    if (uImgAspect > fa) uvp.x = (q.x - 0.5) * fa / uImgAspect + 0.5;
    else uvp.y = (q.y - 0.5) * uImgAspect / fa + 0.5;
    vec3 photo = texture2D(uTex, clamp(uvp, 0.001, 0.999)).rgb;
    photo *= vec3(1.05, 0.98, 0.99);                           // hangat tipis
    float vig = smoothstep(0.95, 0.35, length((q - 0.5) * vec2(1.0, 0.9)));
    photo *= mix(0.78, 1.0, vig);
    float sheen = smoothstep(0.4, 1.0, q.x * 0.6 + q.y * 0.5) * 0.06;
    photo += sheen;
    vec3 placeholder = mix(srgb(vec3(0.16, 0.02, 0.07)), srgb(vec3(0.42, 0.06, 0.18)), q.y);
    photo = mix(placeholder, photo, uHasTex);

    // emas champagne dengan gradasi diagonal
    float g = clamp(0.5 + (p.x * 0.5 - p.y * 0.6) / max(uFrame.x, 0.001), 0.0, 1.0);
    vec3 gold = mix(srgb(vec3(0.72, 0.52, 0.26)), srgb(vec3(1.0, 0.9, 0.62)), smoothstep(0.1, 0.9, g));
    vec3 matCol = srgb(vec3(0.1, 0.012, 0.04));

    vec3 col = photo;
    col = mix(col, matCol, inMat);
    col = mix(col, gold, inBorder);

    // halo lembut di luar bingkai
    float outside = max(d, 0.0);
    vec2 e = abs(p) / (uPlane * 0.5);
    float edgeFade = 1.0 - smoothstep(0.45, 1.0, max(e.x, e.y));
    float glow = exp(-outside * 7.0) * edgeFade * (0.55 + 0.12 * sin(uTime * 0.9)) * (1.0 + uHover * 0.7);
    vec3 glowCol = srgb(vec3(1.0, 0.32, 0.5));
    float a = max(inside, glow * (1.0 - inside) * 0.55);
    vec3 outCol = mix(glowCol, col, inside);
    col = outCol * (1.0 + uHover * 0.12 * inside);

    gl_FragColor = vec4(col, a * uShow);
    #include <colorspace_fragment>
  }
`;

interface SlotRuntime {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  photoIndex: number;
  phase: 'loading' | 'in' | 'shown' | 'out';
  fade: number;
  timer: number;
  hover: number;
  pending: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function GalleryInner({ profile, layout }: { profile: DeviceProfile; layout: SceneLayout }) {
  const max = profile.isMobile ? experience.photos.maxVisibleMobile : experience.photos.maxVisibleDesktop;
  const count = Math.min(photos.length, max);
  const slotsRef = useRef<PhotoSlot[]>([]);
  slotsRef.current = useMemo(() => computePhotoSlots(layout, count), [layout, count]);
  const timeAcc = useRef(0);

  const runtime = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    const items: SlotRuntime[] = [];
    const n = computePhotoSlots(layout, count).length;
    for (let i = 0; i < n; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTex: { value: null },
          uHasTex: { value: 0 },
          uImgAspect: { value: 1 },
          uShow: { value: 0 },
          uHover: { value: 0 },
          uTime: { value: 0 },
          uPlane: { value: new THREE.Vector2(1, 1) },
          uFrame: { value: new THREE.Vector2(1, 1) },
        },
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = -1;
      items.push({ mesh, mat, photoIndex: i, phase: 'loading', fade: 0, timer: i * 1.7, hover: 0, pending: -1 });
    }
    return { geo, items, cache: new Map<number, LoadedPhoto>(), loading: new Map<number, Promise<LoadedPhoto | null>>() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, layout.narrow]);

  const { geo, items, cache, loading } = runtime;

  const getPhoto = (index: number) => {
    const hit = cache.get(index);
    if (hit) return Promise.resolve(hit);
    let p = loading.get(index);
    if (!p) {
      p = loadPhotoTexture(photos[index].url)
        .then((r) => {
          cache.set(index, r);
          return r;
        })
        .catch((e) => {
          console.warn(e);
          return null;
        })
        .finally(() => loading.delete(index));
      loading.set(index, p);
    }
    return p;
  };

  const assign = (s: SlotRuntime, index: number) => {
    getPhoto(index).then((r) => {
      if (!r) return;
      s.photoIndex = index;
      s.mat.uniforms.uTex.value = r.texture;
      s.mat.uniforms.uImgAspect.value = r.aspect;
      s.mat.uniforms.uHasTex.value = 1;
      s.phase = 'in';
    });
  };

  // muat foto awal & siapkan registri interaksi
  useEffect(() => {
    items.forEach((s, i) => assign(s, i));
    photoRegistry.slots = items.map((s) => ({ pos: new THREE.Vector3(), radius: 1, photoIndex: s.photoIndex, visible: false }));
    return () => {
      photoRegistry.slots = [];
      photoRegistry.hover = -1;
      items.forEach((s) => s.mat.dispose());
      geo.dispose();
      cache.forEach((r) => r.texture.dispose());
      cache.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const motion = sceneState.motion * experience.animation.motionSpeed;
    timeAcc.current += dt * motion;
    const t = timeAcc.current;
    const slots = slotsRef.current;
    const reduced = sceneState.motion < 0.5;
    const infl = reduced ? 0 : experience.animation.pointerInfluence;
    const letterFade = 1 - smooth(0.02, 0.45, sceneState.layout);
    const canSwap = photos.length > items.length;

    items.forEach((s, i) => {
      const slot = slots[i];
      if (!slot) return;
      const { mesh, mat } = s;

      // siklus ganti foto
      s.timer += dt;
      if (s.phase === 'in') {
        s.fade = Math.min(1, s.fade + dt / 1.1);
        if (s.fade >= 1) s.phase = 'shown';
      } else if (s.phase === 'out') {
        s.fade = Math.max(0, s.fade - dt / 0.9);
        if (s.fade <= 0 && s.pending >= 0) {
          const idx = s.pending;
          s.pending = -1;
          s.phase = 'loading';
          assign(s, idx);
        }
      } else if (s.phase === 'shown' && canSwap && s.timer > experience.photos.swapSeconds + i * 1.3 && sceneState.layout < 0.05) {
        const used = new Set(items.map((o) => (o.pending >= 0 ? o.pending : o.photoIndex)));
        let next = (s.photoIndex + 1) % photos.length;
        for (let k = 0; k < photos.length && used.has(next); k++) next = (next + 1) % photos.length;
        s.timer = 0;
        if (!used.has(next)) {
          s.pending = next;
          s.phase = 'out';
        }
      }

      // munculnya bingkai: bertahap setelah taman mulai tumbuh
      const appear = smooth(0.55 + i * 0.07, 0.9 + i * 0.07, sceneState.grow);
      const show = appear * letterFade * s.fade;

      const hoverTarget = photoRegistry.hover === i ? 1 : 0;
      s.hover += (hoverTarget - s.hover) * Math.min(1, dt * 8);

      const bob = Math.sin(t * 0.5 + i * 1.7) * 0.1 * (reduced ? 0 : 1);
      const sway = Math.sin(t * 0.38 + i * 2.3) * 0.035 * (reduced ? 0 : 1);
      const pop = (0.88 + 0.12 * appear) * (1 + s.hover * 0.06);
      const margin = 0.95;
      mesh.position.set(slot.x, slot.y + bob + (1 - appear) * -0.35, slot.z);
      mesh.rotation.set(-pointer.y * 0.05 * infl, slot.yaw + pointer.x * 0.12 * infl, slot.rot + sway);
      mesh.scale.set((slot.w + margin) * pop, (slot.h + margin) * pop, 1);
      mesh.visible = show > 0.003;

      const u = mat.uniforms;
      u.uShow.value = show;
      u.uHover.value = s.hover;
      u.uTime.value = t;
      u.uPlane.value.set(slot.w + margin, slot.h + margin);
      u.uFrame.value.set(slot.w, slot.h);

      const hit = photoRegistry.slots[i];
      if (hit) {
        hit.pos.copy(mesh.position);
        hit.radius = Math.max(slot.w, slot.h) * 0.5 * 0.92;
        hit.photoIndex = s.photoIndex;
        hit.visible = show > 0.6;
      }
    });
  });

  return (
    <group>
      {items.map((s, i) => (
        <primitive key={i} object={s.mesh} />
      ))}
    </group>
  );
}

/** Bingkai foto yang melayang di sisi hati. Tidak dirender bila tidak ada foto. */
export default function PhotoGallery(props: { profile: DeviceProfile; layout: SceneLayout }) {
  if (!photos.length) return null;
  return <GalleryInner {...props} />;
}