import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { experience } from '../config/experience';
import { sampleHeart } from '../lib/heartSampler';
import { mulberry32, lerp } from '../lib/utils';
import { sceneState } from '../lib/sceneState';
import { pointer } from '../lib/pointer';
import { FOV, SceneLayout } from '../lib/sceneLayout';
import { softPointFragment } from '../scenes/shaderChunks';
import type { DeviceProfile } from '../hooks/useDeviceProfile';

const heartVertex = /* glsl */ `
  attribute vec3 aScatter;
  attribute vec4 aSeed;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aEscape;
  uniform float uTime;
  uniform float uGather;
  uniform float uPulse;
  uniform float uBeat;
  uniform float uScale;
  uniform float uMotion;
  uniform vec3 uPointer;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float t = uTime;
    float g = clamp(uGather * 1.5 - aSeed.x * 0.5, 0.0, 1.0);
    float e = g * g * (3.0 - 2.0 * g);

    // titik awal: awan tersebar yang berputar pelan, lalu berpusar saat berkumpul
    vec3 s = aScatter;
    float ang = (1.0 - e) * aSeed.y * 3.2;
    float ca = cos(ang);
    float sa = sin(ang);
    s.xz = mat2(ca, -sa, sa, ca) * s.xz;
    s += vec3(sin(t * 0.31 + aSeed.y * 6.283),
              cos(t * 0.27 + aSeed.z * 6.283),
              sin(t * 0.23 + aSeed.w * 6.283)) * 0.35;

    // titik akhir: hati yang hidup
    vec3 target = position;
    vec3 dir = normalize(target + vec3(0.0001));
    float beat = (pow(0.5 + 0.5 * sin(t * 2.4), 10.0) * 0.035
                + pow(0.5 + 0.5 * sin(t * 2.4 - 0.7), 14.0) * 0.02) * uBeat
                + uPulse * 0.12;
    float breathe = sin(t * 0.9 + aSeed.y * 20.0) * 0.018 + sin(t * 1.7 + aSeed.z * 30.0) * 0.01;
    vec3 hp = target * (1.0 + beat * (0.5 + aSeed.x * 0.5) + breathe);

    // sebagian partikel keluar sebentar lalu kembali
    float ph = fract(t * 0.045 + aSeed.w);
    float ex = sin(ph * 3.14159);
    ex = ex * ex * ex;
    hp += (dir + (aSeed.xyz - 0.5) * 0.9) * ex * 1.7 * aEscape * e;

    vec3 p = mix(s, hp, e);

    // pengaruh mouse / sentuhan: partikel menghindar sangat halus
    vec2 dp = p.xy - uPointer.xy;
    float f = exp(-dot(dp, dp) * 0.8) * uPointer.z * e;
    p.xy += normalize(dp + vec2(0.0001)) * f * 0.32;
    p.z += f * 0.35;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float twinkle = 0.72 + 0.28 * sin(t * (1.2 + aSeed.z * 2.0) + aSeed.w * 40.0);
    float shade = 0.78 + 0.32 * clamp(hp.z / 1.6, -1.0, 1.0);
    gl_PointSize = aSize * uScale * (1.0 + beat * 2.5) / -mv.z;
    vColor = aColor * mix(1.0, shade, e);
    vAlpha = mix(0.55, 0.62, e) * twinkle;
  }
`;

const orbitVertex = /* glsl */ `
  attribute vec4 aOrbit;   // radius, kecepatan, fase, kemiringan Z
  attribute vec4 aSeed;
  attribute vec3 aColor;
  attribute float aSize;
  uniform float uTime;
  uniform float uGather;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float a = aOrbit.z + uTime * aOrbit.y;
    float r = aOrbit.x * (1.0 + 0.05 * sin(uTime * 0.7 + aSeed.x * 20.0));
    vec3 p = vec3(cos(a) * r, sin(a * 2.0 + aOrbit.z) * 0.18, sin(a) * r * 0.8);
    float tz = aOrbit.w;
    p.xy = mat2(cos(tz), sin(tz), -sin(tz), cos(tz)) * p.xy;
    float tx = (aSeed.y - 0.5) * 0.9;
    p.yz = mat2(cos(tx), sin(tx), -sin(tx), cos(tx)) * p.yz;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
    vColor = aColor;
    float vis = smoothstep(0.55, 1.0, uGather);
    vAlpha = vis * (0.45 + 0.4 * sin(uTime * 1.5 + aSeed.w * 30.0));
  }
`;

interface Props {
  profile: DeviceProfile;
  layout: SceneLayout;
}

export default function ParticleHeart({ profile, layout }: Props) {
  const group = useRef<THREE.Group>(null);
  const { size, gl } = useThree();
  const timeAcc = useRef(0);

  const { heartGeo, orbitGeo } = useMemo(() => {
    const rng = mulberry32(2024);
    const n = profile.heartParticles;
    const { positions } = sampleHeart(n, 4.4, 11);
    const scatter = new Float32Array(n * 3);
    const seed = new Float32Array(n * 4);
    const color = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const escape = new Float32Array(n);

    const palette = experience.colors.heartParticles.map((p) => ({ c: new THREE.Color(p.color), w: p.weight }));
    const totalW = palette.reduce((a, b) => a + b.w, 0);
    const tmp = new THREE.Color();

    for (let i = 0; i < n; i++) {
      // awan awal: bola pipih yang luas, sebagian dekat kamera
      const u = rng() * 2 - 1;
      const phi = rng() * Math.PI * 2;
      const rr = 3 + Math.pow(rng(), 0.7) * 9;
      const s = Math.sqrt(1 - u * u);
      scatter[i * 3] = s * Math.cos(phi) * rr * 1.25;
      scatter[i * 3 + 1] = u * rr * 0.8;
      scatter[i * 3 + 2] = s * Math.sin(phi) * rr * 0.8 - 1;

      seed[i * 4] = rng();
      seed[i * 4 + 1] = rng();
      seed[i * 4 + 2] = rng();
      seed[i * 4 + 3] = rng();

      let pick = rng() * totalW;
      let chosen = palette[0].c;
      for (const p of palette) {
        if ((pick -= p.w) <= 0) {
          chosen = p.c;
          break;
        }
      }
      tmp.copy(chosen).multiplyScalar(0.75 + rng() * 0.5);
      color[i * 3] = tmp.r;
      color[i * 3 + 1] = tmp.g;
      color[i * 3 + 2] = tmp.b;

      const roll = rng();
      sizes[i] = roll > 0.985 ? 0.2 : 0.06 + roll * 0.07;
      escape[i] = rng() < 0.035 ? 1 : 0;
    }

    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    hg.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    hg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    hg.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    hg.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    hg.setAttribute('aEscape', new THREE.BufferAttribute(escape, 1));
    hg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

    // partikel yang mengorbit
    const m = profile.orbitParticles;
    const oPos = new Float32Array(m * 3);
    const oOrbit = new Float32Array(m * 4);
    const oSeed = new Float32Array(m * 4);
    const oColor = new Float32Array(m * 3);
    const oSize = new Float32Array(m);
    const oPalette = experience.colors.orbitParticles.map((c) => new THREE.Color(c));
    for (let i = 0; i < m; i++) {
      oOrbit[i * 4] = 3.0 + rng() * 1.7;
      oOrbit[i * 4 + 1] = (0.12 + rng() * 0.28) * (rng() > 0.5 ? 1 : -1);
      oOrbit[i * 4 + 2] = rng() * Math.PI * 2;
      oOrbit[i * 4 + 3] = (rng() - 0.5) * 0.9;
      oSeed[i * 4] = rng();
      oSeed[i * 4 + 1] = rng();
      oSeed[i * 4 + 2] = rng();
      oSeed[i * 4 + 3] = rng();
      const c = oPalette[Math.floor(rng() * oPalette.length)];
      oColor[i * 3] = c.r;
      oColor[i * 3 + 1] = c.g;
      oColor[i * 3 + 2] = c.b;
      oSize[i] = 0.05 + rng() * 0.09;
    }
    const og = new THREE.BufferGeometry();
    og.setAttribute('position', new THREE.BufferAttribute(oPos, 3));
    og.setAttribute('aOrbit', new THREE.BufferAttribute(oOrbit, 4));
    og.setAttribute('aSeed', new THREE.BufferAttribute(oSeed, 4));
    og.setAttribute('aColor', new THREE.BufferAttribute(oColor, 3));
    og.setAttribute('aSize', new THREE.BufferAttribute(oSize, 1));
    og.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

    return { heartGeo: hg, orbitGeo: og };
  }, [profile.heartParticles, profile.orbitParticles]);

  const { heartMat, orbitMat } = useMemo(() => {
    const common = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
    const hm = new THREE.ShaderMaterial({
      ...common,
      vertexShader: heartVertex,
      fragmentShader: softPointFragment,
      uniforms: {
        uTime: { value: 0 },
        uGather: { value: 0 },
        uPulse: { value: 0 },
        uBeat: { value: experience.animation.heartbeatStrength },
        uScale: { value: 800 },
        uMotion: { value: 1 },
        uPointer: { value: new THREE.Vector3() },
      },
    });
    const om = new THREE.ShaderMaterial({
      ...common,
      vertexShader: orbitVertex,
      fragmentShader: softPointFragment,
      uniforms: {
        uTime: { value: 0 },
        uGather: { value: 0 },
        uScale: { value: 800 },
      },
    });
    return { heartMat: hm, orbitMat: om };
  }, []);

  useEffect(
    () => () => {
      heartGeo.dispose();
      orbitGeo.dispose();
      heartMat.dispose();
      orbitMat.dispose();
    },
    [heartGeo, orbitGeo, heartMat, orbitMat],
  );

  const local = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    timeAcc.current += dt * sceneState.motion * experience.animation.motionSpeed;
    const t = timeAcc.current;
    const pxScale = (size.height * gl.getPixelRatio()) / (2 * Math.tan((FOV * Math.PI) / 360));

    heartMat.uniforms.uTime.value = t;
    heartMat.uniforms.uGather.value = sceneState.gather;
    heartMat.uniforms.uPulse.value = sceneState.pulse;
    heartMat.uniforms.uScale.value = pxScale;
    orbitMat.uniforms.uTime.value = t;
    orbitMat.uniforms.uGather.value = sceneState.gather;
    orbitMat.uniforms.uScale.value = pxScale;

    const g = group.current;
    if (!g) return;
    const L = sceneState.layout;
    const infl = experience.animation.pointerInfluence * (sceneState.motion < 0.5 ? 0 : 1);
    const x = lerp(0, layout.heartX1, L);
    const y = lerp(layout.heartY0, layout.heartY1, L);
    const s = lerp(layout.heartScale0, layout.heartScale1, L);
    g.position.set(x, y, 0);
    g.scale.setScalar(s);
    g.rotation.y = Math.sin(t * 0.25) * 0.32 * (infl ? 1 : 0.3) + pointer.x * 0.28 * infl;
    g.rotation.x = -pointer.y * 0.1 * infl;

    // koordinat pointer dalam ruang lokal hati (untuk efek menghindar halus)
    local.set(pointer.wx - x, pointer.wy - y, 0).divideScalar(s);
    heartMat.uniforms.uPointer.value.set(local.x, local.y, pointer.active * infl * sceneState.gather);
  });

  return (
    <group ref={group}>
      <points geometry={heartGeo} material={heartMat} frustumCulled={false} />
      <points geometry={orbitGeo} material={orbitMat} frustumCulled={false} />
    </group>
  );
}
