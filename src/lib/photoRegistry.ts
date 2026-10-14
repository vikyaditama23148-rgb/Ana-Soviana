import * as THREE from 'three';

export interface PhotoHit {
  pos: THREE.Vector3;
  radius: number;
  /** indeks foto yang sedang tampil pada bingkai ini */
  photoIndex: number;
  visible: boolean;
}

/** Jembatan antara adegan 3D (bingkai foto) dan UI (lightbox). */
export const photoRegistry = {
  slots: [] as PhotoHit[],
  hover: -1,
  onSelect: (_photoIndex: number) => {},
};