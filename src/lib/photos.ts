import * as THREE from 'three';
import { experience } from '../config/experience';

export interface PhotoItem {
  url: string;
  name: string;
  caption?: string;
}

/** Foto diambil otomatis dari src/assets/photos/ (diurutkan menurut nama file). */
const files = import.meta.glob('../assets/photos/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const photos: PhotoItem[] = experience.photos.enabled
  ? Object.entries(files)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([path, url]) => {
        const name = path.split('/').pop() ?? path;
        return { url, name, caption: experience.photos.captions[name] };
      })
  : [];

export interface LoadedPhoto {
  texture: THREE.Texture;
  aspect: number;
}

/** Memuat foto dan mengecilkannya (maks. sisi 1024px) agar hemat memori GPU. */
export function loadPhotoTexture(url: string, maxSize = 1024): Promise<LoadedPhoto> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const k = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k));
      const h = Math.max(1, Math.round(img.naturalHeight * k));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D tidak tersedia'));
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = 4;
      resolve({ texture, aspect: w / h });
    };
    img.onerror = () => reject(new Error(`Gagal memuat foto: ${url}`));
    img.src = url;
  });
}