import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { mulberry32 } from '../lib/utils';
import { sceneState } from '../lib/sceneState';
import { FOV } from '../lib/sceneLayout';
import { softPointFragment } from '../scenes/shaderChunks';

const vertex = /* glsl */ `
  attribute vec4 aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed.x * 1.4) + aSeed.y * 40.0);
    gl_PointSize = (0.05 + aSeed.z * 0.16) * uScale / -mv.z * 6.0;
    vColor = aColor;
    vAlpha = tw * (0.35 + aSeed.w * 0.5);
  }
`;

/** Bidang bintang & debu cahaya di kejauhan. */
export default function Starfield({ count }: { count: number }) {
  const { size, gl } = useThree();
  const geo = useMemo(() => {
    const rng = mulberry32(99);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    const col = new Float32Array(count * 3);
    const palette = [new THREE.Color('#ffd6e2'), new THREE.Color('#f6c978'), new THREE.Color('#ff8fb1'), new THREE.Color('#ffffff')];
    for (let i = 0; i < count; i++) {
      const u = rng() * 2 - 1;
      const phi = rng() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 22 + rng() * 22;
      pos[i * 3] = s * Math.cos(phi) * r * 1.4;
      pos[i * 3 + 1] = u * r * 0.9;
      pos[i * 3 + 2] = -Math.abs(s * Math.sin(phi)) * r - 6;
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = rng();
      const c = palette[Math.floor(rng() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
    return g;
  }, [count]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: vertex,
        fragmentShader: softPointFragment,
        uniforms: { uTime: { value: 0 }, uScale: { value: 800 } },
      }),
    [],
  );

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime * sceneState.motion;
    mat.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan((FOV * Math.PI) / 360));
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
