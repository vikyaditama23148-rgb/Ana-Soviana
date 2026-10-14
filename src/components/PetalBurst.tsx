import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { FOV } from '../lib/sceneLayout';
import { softPointFragment } from '../scenes/shaderChunks';

const POOL_BURSTS = 20;
const PER_BURST = 30;
const TOTAL = POOL_BURSTS * PER_BURST;
const LIFE = 2.4;

const vertex = /* glsl */ `
  attribute vec3 aOrigin;
  attribute vec3 aVel;
  attribute float aStart;
  attribute vec3 aColor;
  attribute float aSize;
  uniform float uTime;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float age = uTime - aStart;
    float life = ${LIFE.toFixed(1)};
    float alive = step(0.0, age) * step(age, life);
    float drag = 2.4;
    vec3 p = aOrigin + aVel * ((1.0 - exp(-age * drag)) / drag);
    p.y -= 0.55 * age * age * 0.5;
    p.x += sin(age * 4.0 + aStart * 10.0) * 0.06 * age;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float k = clamp(age / life, 0.0, 1.0);
    gl_PointSize = aSize * alive * (1.0 - k * 0.5) * uScale / -mv.z;
    vColor = aColor;
    vAlpha = (1.0 - k) * (1.0 - k) * 0.95;
  }
`;

interface Api {
  spawn: (pos: THREE.Vector3, color: THREE.Color) => void;
}
export const burstApi: Api = { spawn: () => {} };

/** Semburan kelopak bercahaya saat bunga atau hati disentuh. Satu Points dengan pool tetap. */
export default function PetalBurst() {
  const { size, gl } = useThree();

  const { geo, mat, state } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const origin = new Float32Array(TOTAL * 3);
    const vel = new Float32Array(TOTAL * 3);
    const start = new Float32Array(TOTAL).fill(-100);
    const color = new Float32Array(TOTAL * 3);
    const sizes = new Float32Array(TOTAL);
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TOTAL * 3), 3));
    g.setAttribute('aOrigin', new THREE.BufferAttribute(origin, 3));
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: softPointFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 800 } },
    });
    return { geo: g, mat: m, state: { head: 0, now: 0 } };
  }, []);

  useEffect(() => {
    const gold = new THREE.Color('#f6c978');
    const light = new THREE.Color('#ffe3ec');
    const tmp = new THREE.Color();
    burstApi.spawn = (pos, color) => {
      const o = geo.getAttribute('aOrigin') as THREE.BufferAttribute;
      const v = geo.getAttribute('aVel') as THREE.BufferAttribute;
      const s = geo.getAttribute('aStart') as THREE.BufferAttribute;
      const c = geo.getAttribute('aColor') as THREE.BufferAttribute;
      const z = geo.getAttribute('aSize') as THREE.BufferAttribute;
      const first = state.head * PER_BURST;
      state.head = (state.head + 1) % POOL_BURSTS;
      for (let i = 0; i < PER_BURST; i++) {
        const k = first + i;
        const a = Math.random() * Math.PI * 2;
        const u = Math.random() * 2 - 1;
        const r = Math.sqrt(1 - u * u);
        const sp = 1.2 + Math.random() * 2.4;
        o.setXYZ(k, pos.x, pos.y, pos.z);
        v.setXYZ(k, Math.cos(a) * r * sp, Math.abs(u) * sp * 0.8 + 0.3, Math.sin(a) * r * sp * 0.6);
        s.setX(k, state.now);
        const roll = Math.random();
        tmp.copy(roll < 0.15 ? gold : roll < 0.5 ? light : color);
        tmp.multiplyScalar(0.8 + Math.random() * 0.5);
        c.setXYZ(k, tmp.r, tmp.g, tmp.b);
        z.setX(k, 0.09 + Math.random() * 0.14);
      }
      [o, v, s, c, z].forEach((attr) => (attr.needsUpdate = true));
    };
    return () => {
      burstApi.spawn = () => {};
    };
  }, [geo, state]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((s) => {
    state.now = s.clock.elapsedTime;
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan((FOV * Math.PI) / 360));
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
