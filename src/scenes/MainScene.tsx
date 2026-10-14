import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import ParticleHeart from '../components/ParticleHeart';
import FlowerGarden from '../components/FlowerGarden';
import FloatingPetals from '../components/FloatingPetals';
import PetalBurst from '../components/PetalBurst';
import Starfield from '../components/Starfield';
import PhotoGallery from '../components/PhotoGallery';
import InteractionLayer from '../components/InteractionLayer';
import { useDeviceProfile, DeviceProfile } from '../hooks/useDeviceProfile';
import { computeLayout, FOV, SceneLayout } from '../lib/sceneLayout';
import { pointer, attachPointer } from '../lib/pointer';
import { sceneState } from '../lib/sceneState';
import { experience } from '../config/experience';

function CameraRig({ layout }: { layout: SceneLayout }) {
  const { camera } = useThree();
  const clock = useRef(0);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => attachPointer(), []);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    clock.current += d * sceneState.motion;
    const infl = experience.animation.pointerInfluence * (sceneState.motion < 0.5 ? 0 : 1);
    const k = Math.min(1, d * 2.5);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    pointer.active = Math.max(0, pointer.active - d * 0.35);

    const e = sceneState.camera;
    const ease = e * e * (3 - 2 * e);
    const push = (1 - ease) * 5;
    const t = clock.current;
    camera.position.set(
      pointer.x * 0.5 * infl + Math.sin(t * 0.12) * 0.3,
      pointer.y * 0.28 * infl + Math.sin(t * 0.17) * 0.12,
      layout.camZ + push,
    );
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    // pointer pada bidang z = 0 (untuk efek partikel menghindar)
    dir.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
    const s = -camera.position.z / dir.z;
    pointer.wx = camera.position.x + dir.x * s;
    pointer.wy = camera.position.y + dir.y * s;
  });
  return null;
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    if (sceneState.ready) return;
    if (++frames.current === 4) {
      sceneState.ready = true;
      onReady();
    }
  });
  return null;
}

function Scene({ profile, interactive, onReady }: { profile: DeviceProfile; interactive: boolean; onReady: () => void }) {
  const size = useThree((s) => s.size);
  const layout = useMemo(() => computeLayout(size.width / Math.max(1, size.height)), [size.width, size.height]);
  return (
    <>
      <CameraRig layout={layout} />
      <Starfield count={profile.stars} />
      <FlowerGarden profile={profile} layout={layout} />
      <ParticleHeart profile={profile} layout={layout} />
      <FloatingPetals profile={profile} layout={layout} />
      <PhotoGallery profile={profile} layout={layout} />
      <PetalBurst />
      <InteractionLayer layout={layout} enabled={interactive} />
      <ReadySignal onReady={onReady} />
    </>
  );
}

interface Props {
  interactive: boolean;
  onReady: () => void;
}

export default function MainScene({ interactive, onReady }: Props) {
  const profile = useDeviceProfile();
  useEffect(() => {
    sceneState.motion = profile.reducedMotion ? 0.2 : 1;
  }, [profile.reducedMotion]);

  return (
    <Canvas
      className="scene-canvas"
      dpr={profile.dpr}
      camera={{ fov: FOV, near: 0.1, far: 200, position: [0, 0, 16] }}
      gl={{ antialias: !profile.isMobile, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Scene profile={profile} interactive={interactive} onReady={onReady} />
    </Canvas>
  );
}