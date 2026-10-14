import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { experience } from '../config/experience';
import { createLoosePetalGeometry } from '../lib/flowerGeometry';
import { mulberry32 } from '../lib/utils';
import { sceneState } from '../lib/sceneState';
import type { SceneLayout } from '../lib/sceneLayout';
import type { DeviceProfile } from '../hooks/useDeviceProfile';

const vertex = /* glsl */ `
  attribute vec3 aColor;
  attribute vec4 aSeed;
  attribute vec3 aTint;
  uniform float uTime;
  uniform float uVis;
  uniform vec2 uBox; // lebar, tinggi area jatuh
  varying vec3 vColor;
  varying vec3 vN;

  vec3 rotate(vec3 v, vec3 axis, float a) {
    float c = cos(a);
    float s = sin(a);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
  }

  void main() {
    float speed = 0.22 + aSeed.y * 0.35;
    float y = mod(aSeed.x * uBox.y - uTime * speed, uBox.y) - uBox.y * 0.5 + 0.5;
    float x = (aSeed.z - 0.5) * uBox.x + sin(uTime * 0.45 + aSeed.w * 6.283) * 0.7 + sin(uTime * 0.17 + aSeed.x * 20.0) * 0.5;
    float z = mix(-4.0, 4.6, fract(aSeed.w * 7.13 + aSeed.y * 3.1));
    vec3 center = vec3(x, y, z);

    vec3 axis = normalize(vec3(sin(aSeed.x * 40.0), cos(aSeed.y * 30.0) + 0.3, sin(aSeed.z * 50.0) + 0.2));
    float ang = uTime * (0.5 + aSeed.y * 1.4) + aSeed.x * 6.283;
    float near = smoothstep(2.0, 4.6, z);
    float sc = (0.2 + aSeed.z * 0.22) * (1.0 + near * 0.35);
    sc *= smoothstep(aSeed.x, aSeed.x + 0.15, uVis);

    vec3 p = rotate(position * sc, axis, ang);
    vec3 n = rotate(normal, axis, ang);
    vN = normalize(mat3(viewMatrix) * n);
    vColor = aColor * aTint;
    gl_Position = projectionMatrix * viewMatrix * vec4(center + p, 1.0);
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vN;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float lam = abs(dot(n, normalize(vec3(-0.3, 0.6, 0.7)))) * 0.6 + 0.35;
    float rim = pow(1.0 - abs(n.z), 2.0) * 0.18;
    vec3 col = vColor * (lam + rim);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

interface Props {
  profile: DeviceProfile;
  layout: SceneLayout;
}

/** Kelopak yang melayang jatuh pelan, dari latar hingga depan layar. Satu draw call. */
export default function FloatingPetals({ profile, layout }: Props) {
  const timeAcc = useRef(0);
  const count = profile.petals;

  const { geo, mat } = useMemo(() => {
    const rng = mulberry32(555);
    const base = createLoosePetalGeometry();
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.getAttribute('position'));
    g.setAttribute('normal', base.getAttribute('normal'));
    g.setAttribute('aColor', base.getAttribute('aColor'));
    g.instanceCount = count;
    const seed = new Float32Array(count * 4);
    const tint = new Float32Array(count * 3);
    const palette = experience.colors.petals.map((c) => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = rng();
      const c = palette[Math.floor(rng() * palette.length)];
      const j = 0.85 + rng() * 0.3;
      tint.set([c.r * j, c.g * j, c.b * j], i * 3);
    }
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uVis: { value: 0 }, uBox: { value: new THREE.Vector2(14, 12) } },
    });
    return { geo: g, mat: m };
  }, [count]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((_, delta) => {
    timeAcc.current += Math.min(delta, 0.05) * sceneState.motion * experience.animation.motionSpeed;
    mat.uniforms.uTime.value = timeAcc.current;
    mat.uniforms.uVis.value = sceneState.petals;
    mat.uniforms.uBox.value.set(layout.halfW * 2.5, layout.halfH * 2.6);
  });

  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}
