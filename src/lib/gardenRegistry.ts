import * as THREE from 'three';

export interface FlowerHead {
  pos: THREE.Vector3;
  radius: number;
  color: THREE.Color;
}

/** Daftar kepala bunga untuk interaksi (hover/klik) dan uniform bersama. */
export const gardenRegistry = {
  heads: [] as FlowerHead[],
  /** xyz = pusat bunga yang disorot, w = kekuatan */
  hover: new THREE.Vector4(0, 0, 0, 0),
  heartPos: new THREE.Vector3(),
};
