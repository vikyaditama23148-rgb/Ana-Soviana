import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { experience } from '../config/experience';
import {
  createBlossomGeometry,
  createDaisyGeometry,
  createLeafGeometry,
  createRoseGeometry,
  createStemGeometry,
} from '../lib/flowerGeometry';
import { gardenRegistry, FlowerHead } from '../lib/gardenRegistry';
import { FOV, SceneLayout } from '../lib/sceneLayout';
import { lerp, mulberry32 } from '../lib/utils';
import { computePhotoSlots } from '../lib/photoLayout';
import { photos } from '../lib/photos';
import { sceneState } from '../lib/sceneState';
import { softPointFragment } from '../scenes/shaderChunks';
import type { DeviceProfile } from '../hooks/useDeviceProfile';

const TAN = Math.tan((FOV * Math.PI) / 360);

/* ------------------------------------------------------------------ */
/*  Shader bunga: tumbuh, mekar, bergoyang, disinari cahaya hati        */
/* ------------------------------------------------------------------ */

const flowerVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute vec3 aBase;
  attribute vec3 aTint;
  attribute float aDelay;
  attribute float aSwayPhase;
  attribute float aSwayAmp;
  attribute float aT;
  uniform float uTime;
  uniform float uGrow;
  uniform float uOpen;
  uniform vec4 uHover;
  varying vec3 vColor;
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vView;
  varying float vHover;

  void main() {
    float grow = smoothstep(0.0, 1.0, clamp(uGrow * 1.7 - aDelay * 0.7, 0.0, 1.0));
    vec3 p = position;
    #ifdef HEAD
      float o = smoothstep(0.0, 1.0, clamp((uOpen - aDelay * 0.72) / 0.28, 0.0, 1.0));
      p.xz *= mix(0.3, 1.0, o);
      p.y *= mix(1.12, 1.0, o);
    #endif

    vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vec3 sw = vec3(sin(uTime * 0.9 + aSwayPhase), 0.0, cos(uTime * 0.7 + aSwayPhase * 1.3) * 0.5) * aSwayAmp;
    #ifdef STEM
      float k = position.y * position.y;
    #else
      float k = aT * aT;
    #endif
    wp.xyz += sw * k;
    wp.xyz = aBase + (wp.xyz - aBase) * grow;

    vWorld = wp.xyz;
    mat3 nm = mat3(modelMatrix) * mat3(instanceMatrix);
    vN = normalize(mat3(viewMatrix) * normalize(nm * normal));
    vColor = aColor * aTint;
    vec4 vp = viewMatrix * wp;
    vView = vp.xyz;

    vHover = 0.0;
    #ifdef HEAD
      vec3 origin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      vHover = uHover.w * (1.0 - smoothstep(0.0, 1.2, distance(origin, uHover.xyz)));
    #endif
    gl_Position = projectionMatrix * vp;
  }
`;

const flowerFragment = /* glsl */ `
  uniform vec3 uHeartPos;
  uniform vec3 uHeartColor;
  uniform float uHeartGlow;
  varying vec3 vColor;
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vView;
  varying float vHover;

  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 L = normalize(vec3(-0.35, 0.65, 0.65));
    float lam = dot(n, L) * 0.5 + 0.5;
    lam *= lam;

    vec3 hv = (viewMatrix * vec4(uHeartPos, 1.0)).xyz - vView;
    float hd = length(hv);
    float hl = uHeartGlow * exp(-hd * 0.17);
    float hlam = max(dot(n, hv / max(hd, 0.001)), 0.0) * 0.7 + 0.3;

    vec3 col = vColor * (0.13 + 0.42 * lam);
    col += vColor * uHeartColor * hl * hlam * 1.25;
    col += vColor * pow(1.0 - abs(n.z), 2.0) * 0.12;
    col += vec3(1.0, 0.55, 0.68) * vHover * 0.45 * (0.4 + vColor);

    float fade = 1.0 - smoothstep(-6.0, -0.5, vWorld.z);
    col *= mix(1.0, 0.42, fade);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const sparkleVertex = /* glsl */ `
  attribute vec4 aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uScale;
  uniform float uVis;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float t = uTime;
    p += vec3(sin(t * 0.4 + aSeed.x * 6.283),
              cos(t * 0.35 + aSeed.y * 6.283) * 0.8 + fract(t * 0.025 + aSeed.z) * 0.7,
              sin(t * 0.3 + aSeed.w * 6.283)) * 0.35;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.035 + aSeed.z * 0.07) * uScale / -mv.z;
    vColor = aColor;
    vAlpha = uVis * (0.35 + 0.5 * sin(t * (0.8 + aSeed.x) + aSeed.w * 30.0) * 0.5 + 0.25);
  }
`;

/* ------------------------------------------------------------------ */
/*  Pembangun taman                                                    */
/* ------------------------------------------------------------------ */

interface Item {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: THREE.Vector3;
  base: THREE.Vector3;
  tint: THREE.Color;
  delay: number;
  phase: number;
  amp: number;
  t: number;
}

function makeBatch(geo: THREE.BufferGeometry, mat: THREE.Material, items: Item[]) {
  const g = geo.clone();
  const n = items.length;
  const aBase = new Float32Array(n * 3);
  const aTint = new Float32Array(n * 3);
  const aDelay = new Float32Array(n);
  const aPhase = new Float32Array(n);
  const aAmp = new Float32Array(n);
  const aT = new Float32Array(n);
  const mesh = new THREE.InstancedMesh(g, mat, n);
  const m = new THREE.Matrix4();
  items.forEach((it, i) => {
    m.compose(it.pos, it.quat, it.scale);
    mesh.setMatrixAt(i, m);
    aBase.set([it.base.x, it.base.y, it.base.z], i * 3);
    aTint.set([it.tint.r, it.tint.g, it.tint.b], i * 3);
    aDelay[i] = it.delay;
    aPhase[i] = it.phase;
    aAmp[i] = it.amp;
    aT[i] = it.t;
  });
  g.setAttribute('aBase', new THREE.InstancedBufferAttribute(aBase, 3));
  g.setAttribute('aTint', new THREE.InstancedBufferAttribute(aTint, 3));
  g.setAttribute('aDelay', new THREE.InstancedBufferAttribute(aDelay, 1));
  g.setAttribute('aSwayPhase', new THREE.InstancedBufferAttribute(aPhase, 1));
  g.setAttribute('aSwayAmp', new THREE.InstancedBufferAttribute(aAmp, 1));
  g.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 1));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

type Kind = 'red' | 'pink' | 'blossom' | 'daisy';

interface Placed {
  kind: Kind;
  pos: THREE.Vector3;
  radius: number;
  scale: number;
}

interface Built {
  meshes: THREE.InstancedMesh[];
  sparkles: THREE.Points;
  heads: FlowerHead[];
}

interface Geos {
  red: THREE.BufferGeometry;
  pink: THREE.BufferGeometry;
  blossom: THREE.BufferGeometry;
  daisy: THREE.BufferGeometry;
  leaf: THREE.BufferGeometry;
  stem: THREE.BufferGeometry;
}

interface Mats {
  head: THREE.ShaderMaterial;
  stem: THREE.ShaderMaterial;
  leaf: THREE.ShaderMaterial;
  sparkle: THREE.ShaderMaterial;
}

function buildGarden(layout: SceneLayout, profile: DeviceProfile, geos: Geos, mats: Mats): Built {
  const rng = mulberry32(layout.narrow ? 4242 : 1717);
  const f = profile.flowerFactor;
  const { halfW, halfH, camZ, narrow } = layout;
  const heartY = layout.heartY0;

  const plan: { kind: Kind; n: number; s: [number, number]; r: number }[] = [
    { kind: 'red', n: Math.round(9 * f), s: [0.62, 0.92], r: 1.0 },
    { kind: 'pink', n: Math.round(9 * f), s: [0.6, 0.88], r: 1.0 },
    { kind: 'blossom', n: Math.round(12 * f), s: [0.55, 0.8], r: 0.95 },
    { kind: 'daisy', n: Math.round(16 * f), s: [0.34, 0.5], r: 0.65 },
  ];
  const sizeMul = narrow ? 0.85 : 1;

  // area teks yang harus dijaga bebas dari kepala bunga
  const tw = narrow ? halfW * 0.95 : halfW * 0.56;
  const ty0 = narrow ? -halfH * 0.84 : -halfH * 0.97;
  const ty1 = heartY - 1.9;

  const photoCount = Math.min(photos.length, profile.isMobile ? experience.photos.maxVisibleMobile : experience.photos.maxVisibleDesktop);
  const photoSlots = computePhotoSlots(layout, photoCount);
  const placed: Placed[] = [];
  for (const spec of plan) {
    for (let i = 0; i < spec.n; i++) {
      for (let attempt = 0; attempt < 90; attempt++) {
        const z = lerp(-4.2, 2.2, rng());
        const hh = (camZ - z) * TAN;
        const hw = hh * layout.aspect;
        const x = (rng() * 2 - 1) * hw * 0.96;
        const yMax = heartY + 0.4;
        const yMin = -hh * 0.92;
        const y = yMin + Math.pow(rng(), 1.5) * (yMax - yMin);
        const scale = lerp(spec.s[0], spec.s[1], rng()) * sizeMul;
        const radius = scale * spec.r;

        // zona hati (elips) + zona teks
        const ex = (x / (narrow ? 2.6 : 3.0)) ** 2 + ((y - heartY) / 2.75) ** 2;
        if (ex < 1) continue;
        if (layout.sideBySide) {
          const ex2 = ((x - layout.heartX1) / 2.7) ** 2 + ((y - layout.heartY1) / 2.5) ** 2;
          if (ex2 < 1) continue;
        }
        if (Math.abs(x) < tw && y > ty0 && y < ty1) continue;

        if (photoSlots.some((ps) => Math.abs(x - ps.x) < ps.w / 2 + radius * 0.7 && Math.abs(y - ps.y) < ps.h / 2 + radius * 0.7)) continue;

        let ok = true;
        for (const q of placed) {
          const dx = q.pos.x - x;
          const dy = q.pos.y - y;
          const dz = (q.pos.z - z) * 0.5;
          const min = (q.radius + radius) * 0.85;
          if (dx * dx + dy * dy + dz * dz < min * min) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        placed.push({ kind: spec.kind, pos: new THREE.Vector3(x, y, z), radius, scale });
        break;
      }
    }
  }

  const up = new THREE.Vector3(0, 1, 0);
  const headItems: Record<Kind, Item[]> = { red: [], pink: [], blossom: [], daisy: [] };
  const stemItems: Item[] = [];
  const leafItems: Item[] = [];
  const heads: FlowerHead[] = [];
  const palette = experience.colors.flowers;
  const kindColor: Record<Kind, string> = {
    red: palette.redRose,
    pink: palette.pinkRose,
    blossom: palette.blossom,
    daisy: palette.daisyPetal,
  };

  placed.forEach((pl, idx) => {
    const base = new THREE.Vector3(
      pl.pos.x * 0.78 + (rng() - 0.5) * 1.4,
      -halfH * 1.12 - rng() * 0.8,
      pl.pos.z + (rng() - 0.5) * 0.6,
    );
    const stemVec = pl.pos.clone().sub(base);
    const len = stemVec.length();
    const dir = stemVec.clone().normalize();
    const delay = Math.min(1, 0.05 + rng() * 0.95);
    const phase = rng() * Math.PI * 2;
    const amp = len * 0.022;
    const jitter = 0.88 + rng() * 0.22;
    const tint = new THREE.Color(jitter, jitter * (0.96 + rng() * 0.08), jitter);

    // kepala bunga: menghadap kamera dengan sedikit variasi
    const headDir = dir
      .clone()
      .add(new THREE.Vector3((rng() - 0.5) * 0.5 - Math.sign(pl.pos.x) * 0.25, 0.05, 0.95))
      .normalize();
    const qAlign = new THREE.Quaternion().setFromUnitVectors(up, headDir);
    const qYaw = new THREE.Quaternion().setFromAxisAngle(up, rng() * Math.PI * 2);
    const quat = qAlign.multiply(qYaw);

    headItems[pl.kind].push({
      pos: pl.pos,
      quat,
      scale: new THREE.Vector3(pl.scale, pl.scale, pl.scale),
      base,
      tint,
      delay,
      phase,
      amp,
      t: 1,
    });
    heads.push({ pos: pl.pos.clone().add(new THREE.Vector3(0, pl.scale * 0.25, 0)), radius: pl.radius * 1.05, color: new THREE.Color(kindColor[pl.kind]) });

    const thick = 0.028 + 0.02 * pl.scale;
    stemItems.push({
      pos: base,
      quat: new THREE.Quaternion().setFromUnitVectors(up, dir),
      scale: new THREE.Vector3(thick, len, thick),
      base,
      tint: new THREE.Color(1, 1, 1),
      delay,
      phase,
      amp,
      t: 0,
    });

    // dua daun sepanjang batang
    const leafCount = len > 2.2 ? 2 : 1;
    for (let l = 0; l < leafCount; l++) {
      const r = 0.24 + l * 0.22 + rng() * 0.06;
      const lp = base.clone().addScaledVector(dir, len * r);
      const qL = new THREE.Quaternion()
        .setFromAxisAngle(up, (l % 2 ? Math.PI : 0) + (rng() - 0.5) * 1.2)
        .premultiply(new THREE.Quaternion().setFromUnitVectors(up, dir));
      const ls = lerp(0.5, 0.85, rng()) * sizeMul;
      leafItems.push({
        pos: lp,
        quat: qL,
        scale: new THREE.Vector3(ls, ls, ls),
        base,
        tint: new THREE.Color(0.9 + rng() * 0.2, 1, 0.9 + rng() * 0.2),
        delay,
        phase,
        amp,
        t: r,
      });
    }
    void idx;
  });

  const meshes: THREE.InstancedMesh[] = [];
  (Object.keys(headItems) as Kind[]).forEach((k) => {
    if (headItems[k].length) meshes.push(makeBatch(geos[k], mats.head, headItems[k]));
  });
  if (stemItems.length) meshes.push(makeBatch(geos.stem, mats.stem, stemItems));
  if (leafItems.length) meshes.push(makeBatch(geos.leaf, mats.leaf, leafItems));
  meshes.forEach((m, i) => (m.renderOrder = i === 0 ? 1 : 0));

  // kilau cahaya yang bergerak di antara bunga
  const count = profile.sparkles;
  const sp = new Float32Array(count * 3);
  const ss = new Float32Array(count * 4);
  const sc = new Float32Array(count * 3);
  const sparkleColors = ['#ffd6e2', '#f6c978', '#ff8fb1'].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    const h = heads.length ? heads[Math.floor(rng() * heads.length)].pos : new THREE.Vector3();
    const a = rng() * Math.PI * 2;
    const d = 0.4 + rng() * 1.8;
    sp[i * 3] = h.x + Math.cos(a) * d;
    sp[i * 3 + 1] = h.y + (rng() - 0.3) * 1.6;
    sp[i * 3 + 2] = h.z + Math.sin(a) * d * 0.6;
    for (let k = 0; k < 4; k++) ss[i * 4 + k] = rng();
    const c = sparkleColors[Math.floor(rng() * sparkleColors.length)];
    sc.set([c.r, c.g, c.b], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aSeed', new THREE.BufferAttribute(ss, 4));
  sg.setAttribute('aColor', new THREE.BufferAttribute(sc, 3));
  sg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
  const sparkles = new THREE.Points(sg, mats.sparkle);
  sparkles.frustumCulled = false;

  return { meshes, sparkles, heads };
}

/* ------------------------------------------------------------------ */
/*  Komponen                                                           */
/* ------------------------------------------------------------------ */

interface Props {
  profile: DeviceProfile;
  layout: SceneLayout;
}

export default function FlowerGarden({ profile, layout }: Props) {
  const { size, gl } = useThree();
  const timeAcc = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrow: { value: 0 },
      uOpen: { value: 0 },
      uHover: { value: gardenRegistry.hover },
      uHeartPos: { value: gardenRegistry.heartPos },
      uHeartColor: { value: new THREE.Color(experience.colors.heartLight) },
      uHeartGlow: { value: 0 },
    }),
    [],
  );

  const { geos, mats } = useMemo(() => {
    const c = experience.colors.flowers;
    const geos: Geos = {
      red: createRoseGeometry(c.redRose),
      pink: createRoseGeometry(c.pinkRose),
      blossom: createBlossomGeometry(c.blossom, c.daisyCenter),
      daisy: createDaisyGeometry(c.daisyPetal, c.daisyCenter),
      leaf: createLeafGeometry(c.leaf),
      stem: createStemGeometry(c.leaf),
    };
    const make = (define: string) =>
      new THREE.ShaderMaterial({
        vertexShader: flowerVertex,
        fragmentShader: flowerFragment,
        uniforms,
        defines: { [define]: '' },
        side: THREE.DoubleSide,
      });
    const sparkle = new THREE.ShaderMaterial({
      vertexShader: sparkleVertex,
      fragmentShader: softPointFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: uniforms.uTime, uScale: { value: 800 }, uVis: { value: 0 } },
    });
    const mats: Mats = { head: make('HEAD'), stem: make('STEM'), leaf: make('LEAF'), sparkle };
    return { geos, mats };
  }, [uniforms]);

  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geos, mats],
  );

  const layoutKey = `${layout.narrow ? 'n' : 'w'}-${Math.round(layout.aspect * 6)}-${profile.flowerFactor}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const built = useMemo(() => buildGarden(layout, profile, geos, mats), [layoutKey, geos, mats, profile]);

  useEffect(() => {
    gardenRegistry.heads = built.heads;
    return () => {
      built.meshes.forEach((m) => {
        m.geometry.dispose();
        m.dispose();
      });
      built.sparkles.geometry.dispose();
      gardenRegistry.heads = [];
    };
  }, [built]);

  useFrame((_, delta) => {
    timeAcc.current += Math.min(delta, 0.05) * sceneState.motion * experience.animation.motionSpeed;
    uniforms.uTime.value = timeAcc.current;
    uniforms.uGrow.value = sceneState.grow;
    uniforms.uOpen.value = sceneState.open;
    uniforms.uHeartGlow.value = sceneState.gather;
    mats.sparkle.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * TAN);
    mats.sparkle.uniforms.uVis.value = THREE.MathUtils.smoothstep(sceneState.grow, 0.35, 1);
    const y = lerp(layout.heartY0, layout.heartY1, sceneState.layout);
    gardenRegistry.heartPos.set(lerp(0, layout.heartX1, sceneState.layout), y, 0);
  });

  return (
    <group>
      {built.meshes.map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
      <primitive object={built.sparkles} />
    </group>
  );
}