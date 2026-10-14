import * as THREE from 'three';

/**
 * Pembangun geometri bunga prosedural.
 * Setiap bunga digabung menjadi SATU BufferGeometry dengan warna per-vertex
 * (atribut `aColor`), lalu digambar secara instancing.
 */
class Builder {
  pos: number[] = [];
  col: number[] = [];
  idx: number[] = [];

  addGrid(segU: number, segV: number, fn: (u: number, v: number) => { p: [number, number, number]; c: THREE.Color }) {
    const start = this.pos.length / 3;
    for (let j = 0; j <= segV; j++) {
      for (let i = 0; i <= segU; i++) {
        const u = (i / segU) * 2 - 1;
        const v = j / segV;
        const { p, c } = fn(u, v);
        this.pos.push(p[0], p[1], p[2]);
        this.col.push(c.r, c.g, c.b);
      }
    }
    const row = segU + 1;
    for (let j = 0; j < segV; j++) {
      for (let i = 0; i < segU; i++) {
        const a = start + j * row + i;
        this.idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
      }
    }
  }

  addGeometry(g: THREE.BufferGeometry, color: THREE.Color, jitter = 0, seed = 1) {
    const start = this.pos.length / 3;
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      const k = 1 + jitter * Math.sin(i * 12.9898 + seed * 78.233);
      this.col.push(color.r * k, color.g * k, color.b * k);
    }
    const index = g.getIndex();
    if (index) for (let i = 0; i < index.count; i++) this.idx.push(start + index.getX(i));
    else for (let i = 0; i < p.count; i++) this.idx.push(start + i);
    g.dispose();
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

interface PetalSpec {
  azimuth: number;
  baseR?: number;
  baseY?: number;
  length: number;
  width: number;
  tilt0: number;
  curl: number;
  cup?: number;
  notch?: number;
  shapeA?: number;
  shapeB?: number;
  base: THREE.Color;
  tip: THREE.Color;
  segU?: number;
  segV?: number;
  edgeDark?: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function addPetal(b: Builder, s: PetalSpec) {
  const segU = s.segU ?? 6;
  const segV = s.segV ?? 6;
  const cup = s.cup ?? 0;
  const notch = s.notch ?? 0;
  const A = s.shapeA ?? 0.65;
  const B = s.shapeB ?? 0.8;
  const baseR = s.baseR ?? 0;
  const baseY = s.baseY ?? 0;

  // lintasan sumbu tengah kelopak pada bidang (radial, atas)
  const rr: number[] = [baseR];
  const yy: number[] = [baseY];
  const th: number[] = [s.tilt0];
  for (let j = 1; j <= segV; j++) {
    const v0 = (j - 1) / segV;
    const v1 = j / segV;
    const mid = s.tilt0 + s.curl * ((v0 + v1) / 2);
    rr.push(rr[j - 1] + Math.sin(mid) * s.length * (v1 - v0));
    yy.push(yy[j - 1] + Math.cos(mid) * s.length * (v1 - v0));
    th.push(s.tilt0 + s.curl * v1);
  }
  const ca = Math.cos(s.azimuth);
  const sa = Math.sin(s.azimuth);
  const tmp = new THREE.Color();

  b.addGrid(segU, segV, (u, v) => {
    const j = Math.round(v * segV);
    const theta = th[j];
    const hw = s.width * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(Math.max(v, 0.0001), A))), B);
    const lateral = u * hw;
    const cupAmt = cup * u * u * hw;
    let radial = rr[j] - Math.cos(theta) * cupAmt;
    let y = yy[j] + Math.sin(theta) * cupAmt;
    const nt = notch * Math.exp(-u * u * 12) * smooth(0.72, 1, v);
    radial -= Math.sin(theta) * nt;
    y -= Math.cos(theta) * nt;
    const x = radial * ca - lateral * sa;
    const z = radial * sa + lateral * ca;
    tmp.copy(s.base).lerp(s.tip, Math.pow(v, 0.8));
    const dark = 1 - (s.edgeDark ?? 0.1) * u * u;
    return { p: [x, y, z], c: new THREE.Color(tmp.r * dark, tmp.g * dark, tmp.b * dark) };
  });
}

const white = new THREE.Color('#ffffff');
const shade = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);
const tint = (c: THREE.Color, k: number) => c.clone().lerp(white, k);

/** Mawar berlapis: kuncup rapat di tengah, kelopak luar melengkung ke belakang. */
export function createRoseGeometry(hex: string) {
  const c = new THREE.Color(hex);
  const b = new Builder();
  const layers = [
    { n: 3, tilt: 0.06, curl: 0.55, len: 0.46, w: 0.2, cup: 1.1, r: 0.0, y: 0.0, k: 0.62 },
    { n: 4, tilt: 0.14, curl: 0.6, len: 0.62, w: 0.27, cup: 0.9, r: 0.02, y: 0.0, k: 0.72 },
    { n: 5, tilt: 0.3, curl: 0.62, len: 0.76, w: 0.33, cup: 0.7, r: 0.04, y: 0.0, k: 0.84 },
    { n: 6, tilt: 0.52, curl: 0.78, len: 0.9, w: 0.38, cup: 0.45, r: 0.06, y: 0.0, k: 0.95 },
    { n: 7, tilt: 0.85, curl: 0.95, len: 1.0, w: 0.42, cup: 0.1, r: 0.08, y: 0.0, k: 1.05 },
    { n: 7, tilt: 1.15, curl: 0.7, len: 1.02, w: 0.45, cup: -0.15, r: 0.1, y: -0.04, k: 1.12 },
  ];
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n; i++) {
      const az = (i / L.n) * Math.PI * 2 + li * 0.9 + (i % 2) * 0.12;
      addPetal(b, {
        azimuth: az,
        baseR: L.r,
        baseY: L.y,
        length: L.len,
        width: L.w,
        tilt0: L.tilt + (i % 2) * 0.05,
        curl: L.curl,
        cup: L.cup,
        notch: 0.02,
        shapeA: 0.55,
        shapeB: 0.65,
        base: shade(c, 0.32 * L.k),
        tip: tint(shade(c, L.k), 0.04),
        segU: 6,
        segV: 6,
        edgeDark: 0.14,
      });
    }
  });
  return b.build();
}

/** Bunga sakura/blossom merah muda dengan benang sari keemasan. */
export function createBlossomGeometry(hex: string, gold: string) {
  const c = new THREE.Color(hex);
  const g = new THREE.Color(gold);
  const b = new Builder();
  const outer = 5;
  for (let i = 0; i < outer; i++) {
    addPetal(b, {
      azimuth: (i / outer) * Math.PI * 2,
      baseR: 0.05,
      length: 0.85,
      width: 0.44,
      tilt0: 1.25,
      curl: -0.4,
      cup: 0.35,
      notch: 0.1,
      shapeA: 0.55,
      shapeB: 0.55,
      base: shade(c, 0.55),
      tip: tint(c, 0.4),
      segU: 8,
      segV: 6,
      edgeDark: 0.05,
    });
  }
  for (let i = 0; i < outer; i++) {
    addPetal(b, {
      azimuth: ((i + 0.5) / outer) * Math.PI * 2,
      baseR: 0.04,
      baseY: 0.04,
      length: 0.62,
      width: 0.36,
      tilt0: 0.95,
      curl: -0.3,
      cup: 0.45,
      notch: 0.06,
      shapeA: 0.55,
      shapeB: 0.55,
      base: shade(c, 0.5),
      tip: tint(c, 0.25),
      segU: 6,
      segV: 5,
      edgeDark: 0.05,
    });
  }
  // benang sari
  for (let i = 0; i < 10; i++) {
    const az = (i / 10) * Math.PI * 2 + 0.2;
    addPetal(b, {
      azimuth: az,
      baseR: 0.02,
      baseY: 0.02,
      length: 0.36,
      width: 0.012,
      tilt0: 0.5 + (i % 3) * 0.12,
      curl: 0.5,
      shapeA: 1,
      shapeB: 0.2,
      base: shade(g, 0.7),
      tip: g,
      segU: 1,
      segV: 3,
      edgeDark: 0,
    });
    const tipR = Math.sin(0.5 + (i % 3) * 0.12 + 0.25) * 0.36 + 0.02;
    const tipY = Math.cos(0.5 + (i % 3) * 0.12 + 0.25) * 0.36 + 0.04;
    const s = new THREE.IcosahedronGeometry(0.032, 0);
    s.translate(tipR * Math.cos(az), tipY, tipR * Math.sin(az));
    b.addGeometry(s, tint(g, 0.1));
  }
  const core = new THREE.SphereGeometry(0.07, 8, 5);
  core.translate(0, 0.04, 0);
  b.addGeometry(core, shade(g, 0.85));
  return b.build();
}

/** Bunga putih kecil dengan pusat emas hangat. */
export function createDaisyGeometry(petalHex: string, centerHex: string) {
  const p = new THREE.Color(petalHex);
  const g = new THREE.Color(centerHex);
  const b = new Builder();
  const n = 13;
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < n; i++) {
      addPetal(b, {
        azimuth: ((i + layer * 0.5) / n) * Math.PI * 2,
        baseR: 0.1,
        baseY: layer * 0.015,
        length: layer ? 0.5 : 0.6,
        width: 0.115,
        tilt0: layer ? 1.0 : 1.3,
        curl: layer ? 0.3 : 0.6,
        cup: 0.3,
        shapeA: 0.85,
        shapeB: 0.5,
        base: shade(g, 0.95).lerp(p, 0.55),
        tip: p,
        segU: 3,
        segV: 4,
        edgeDark: 0.04,
      });
    }
  }
  const dome = new THREE.SphereGeometry(0.19, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.55, 1);
  dome.translate(0, 0.02, 0);
  b.addGeometry(dome, g, 0.14, 3);
  return b.build();
}

/** Daun runcing, melengkung. Berangkat dari titik asal ke arah +X. */
export function createLeafGeometry(hex: string) {
  const c = new THREE.Color(hex);
  const b = new Builder();
  addPetal(b, {
    azimuth: 0,
    length: 1,
    width: 0.24,
    tilt0: 1.05,
    curl: 0.95,
    cup: 0.5,
    shapeA: 0.8,
    shapeB: 0.85,
    base: shade(c, 0.75),
    tip: tint(c, 0.22),
    segU: 4,
    segV: 8,
    edgeDark: 0.2,
  });
  return b.build();
}

/** Batang: tabung satuan sepanjang sumbu Y (0..1), mengecil ke atas. */
export function createStemGeometry(hex: string) {
  const c = new THREE.Color(hex);
  const radial = 5;
  const seg = 10;
  const b = new Builder();
  const pos: [number, number, number][] = [];
  const cols: THREE.Color[] = [];
  for (let j = 0; j <= seg; j++) {
    const v = j / seg;
    const r = 1 - v * 0.35;
    for (let i = 0; i < radial; i++) {
      const a = (i / radial) * Math.PI * 2;
      pos.push([Math.cos(a) * r, v, Math.sin(a) * r]);
      cols.push(shade(c, 0.7 + v * 0.35));
    }
  }
  pos.forEach((p, k) => {
    b.pos.push(p[0], p[1], p[2]);
    b.col.push(cols[k].r, cols[k].g, cols[k].b);
  });
  for (let j = 0; j < seg; j++) {
    for (let i = 0; i < radial; i++) {
      const a = j * radial + i;
      const a1 = j * radial + ((i + 1) % radial);
      const b0 = (j + 1) * radial + i;
      const b1 = (j + 1) * radial + ((i + 1) % radial);
      b.idx.push(a, a1, b0, a1, b1, b0);
    }
  }
  return b.build();
}

/** Kelopak lepas kecil untuk kelopak yang melayang & semburan. */
export function createLoosePetalGeometry() {
  const b = new Builder();
  addPetal(b, {
    azimuth: 0,
    length: 0.5,
    width: 0.2,
    tilt0: 1.45,
    curl: 0.5,
    cup: 0.7,
    shapeA: 0.6,
    shapeB: 0.6,
    base: new THREE.Color('#b0b0b0'),
    tip: new THREE.Color('#ffffff'),
    segU: 4,
    segV: 5,
    edgeDark: 0.12,
  });
  const g = b.build();
  g.translate(-0.1, 0, 0);
  return g;
}
