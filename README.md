# A Special Universe for Ana Soviana

Hadiah digital romantis dan interaktif: hati dari ribuan partikel bercahaya, taman bunga 3D
yang mekar perlahan, kelopak yang melayang, nama **Ana Soviana** dengan huruf kaligrafi,
surat pribadi, interaksi sentuh pada bunga, dan penutup yang tenang.

Dibuat dengan React, Vite, TypeScript, Three.js, React Three Fiber, GSAP, dan Lucide React.
Semua grafis (hati, bunga, kelopak, bintang) dihasilkan secara prosedural — tanpa gambar eksternal,
tanpa API, tanpa akun, tanpa backend. Font ikut terpasang secara lokal (via paket npm).

---

## 1. Persyaratan sistem

- **Node.js 18 atau lebih baru** (disarankan 20 LTS) — unduh di https://nodejs.org
- **npm** (sudah termasuk bersama Node.js)
- **Visual Studio Code** (opsional, disarankan)
- Browser modern dengan **WebGL** (Chrome, Edge, Firefox, Safari terbaru, Chrome Android, Safari iOS)
- Koneksi internet hanya diperlukan saat `npm install`

Cek versi:

```bash
node -v
npm -v
```

## 2. Mengekstrak ZIP

1. Klik kanan `ana-special-universe.zip` → **Extract All / Ekstrak di sini**.
2. Hasilnya adalah satu folder bernama `ana-special-universe`.

## 3. Membuka di Visual Studio Code

- Buka VS Code → **File → Open Folder…** → pilih folder `ana-special-universe`.
- Atau lewat terminal:

```bash
cd ana-special-universe
code .
```

Buka terminal bawaan VS Code dengan **Terminal → New Terminal** (`Ctrl + ``).

## 4. Menginstal dependensi

```bash
npm install
```

## 5. Menjalankan server pengembangan

```bash
npm run dev
```

Buka alamat yang tampil di terminal (biasanya http://localhost:5173).
Untuk mencoba di ponsel pada jaringan Wi-Fi yang sama:

```bash
npm run dev -- --host
```

lalu buka alamat "Network" yang ditampilkan dari browser ponsel.

## 6. Membuat build produksi

```bash
npm run build
```

Hasilnya ada di folder `dist/`. Untuk mencobanya secara lokal:

```bash
npm run preview
```

Isi folder `dist/` bisa diunggah ke hosting statis apa pun (Netlify, Vercel, GitHub Pages,
Cloudflare Pages, dll.). Pengaturan `base: './'` membuatnya aman diletakkan di sub-folder.
Catatan: buka lewat server (`npm run preview` atau hosting), bukan dengan klik dua kali `index.html`.

## 7. Mengubah nama dan pesan

Semua teks ada di satu file: **`src/config/experience.ts`**

| Pengaturan | Fungsi |
|---|---|
| `recipientName` | Nama penerima (default: `Ana Soviana`) |
| `intro.message` | Kalimat pembuka di layar awal |
| `intro.buttonLabel` | Tulisan tombol pembuka |
| `letter` | Surat pribadi — pisahkan paragraf dengan baris kosong |
| `whispers` | Daftar pesan kecil yang muncul bergantian saat tombol "Pesan kecil" ditekan |
| `finalMessage` | Pesan penutup |
| `labels` | Tulisan semua tombol kecil |

Paragraf pertama pada `letter` otomatis tampil sebagai salam pembuka (huruf kaligrafi),
dan paragraf terakhir sebagai penutup berwarna emas.

Simpan file — browser akan memuat ulang otomatis saat `npm run dev` berjalan.

## 8. Mengubah warna bunga dan partikel

Masih di **`src/config/experience.ts`**, bagian `colors`:

- `heartParticles` — daftar warna partikel hati beserta bobotnya (`weight`). Makin besar bobot, makin sering warna itu muncul.
- `orbitParticles` — warna partikel kecil yang mengorbit hati.
- `flowers` — `redRose`, `pinkRose`, `blossom`, `daisyPetal`, `daisyCenter`, `leaf`.
- `petals` — warna kelopak yang melayang.
- `heartLight` — warna cahaya hati yang memantul ke bunga.
- `background` — warna latar.

Bagian `animation` mengatur kekuatan detak hati, kecepatan gerak, pengaruh mouse/sentuhan,
dan durasi hati terbentuk serta taman mekar.

Contoh — mawar merah lebih terang:

```ts
redRose: '#b0102f',
```

## 9. Menambahkan musik latar (opsional)

1. Siapkan **satu file audio milik Anda sendiri** (mp3, ogg, wav, m4a, aac, atau flac).
2. Salin ke folder **`src/assets/music/`** (nama file bebas).
3. Jalankan ulang `npm run dev` (atau `npm run build`).

Yang terjadi:
- Musik **tidak pernah** menyala sebelum pengunjung mengklik "Open Your Little Universe".
  Klik itulah yang memulai musik (dengan fade-in), sesuai aturan autoplay browser.
- Tombol volume muncul di pojok kanan atas untuk menyalakan/mematikan musik.
- Jika folder tidak berisi file audio, tombol musik **tidak ditampilkan** dan website tetap berjalan normal,
  tanpa error maupun permintaan file yang hilang.

Volume diatur lewat `audio.volume` di `experience.ts`.
Gunakan hanya musik yang Anda berhak memakainya; proyek ini tidak menyertakan musik komersial.

## 10. Menambahkan foto (opsional)

Foto tampil sebagai **bingkai kenangan yang melayang** di kiri-kanan hati: sudut membulat,
garis emas champagne tipis, halo merah muda lembut, bergoyang pelan dan sedikit mengikuti gerak kursor.
Foto muncul bergantian setelah taman mulai mekar, dan disembunyikan saat surat dibaca.

1. Salin foto Anda ke folder **`src/assets/photos/`** (jpg, jpeg, png, webp, avif).
2. Beri nama berurutan: `01.jpg`, `02.jpg`, `03.jpg`, ... (ditampilkan sesuai urutan nama).
3. Jalankan ulang `npm run dev` (atau `npm run build`).

Yang terjadi:
- Ketuk/klik foto, atau tombol **Kenangan**, untuk melihat foto besar (panah kiri/kanan, `Esc` untuk menutup).
- Jika foto lebih banyak dari bingkai (default 6 di layar lebar, 4 di ponsel), bingkai bergantian
  mengganti foto dengan fade lembut sehingga semua foto sempat tampil.
- Foto besar dari ponsel otomatis dikecilkan (maks. 1024 px) untuk tampilan 3D agar hemat memori.
  Tampilan besar memakai foto aslinya, jadi sebaiknya jangan lebih dari beberapa MB per foto.
- Tanpa foto, fitur ini tidak muncul sama sekali.

Pengaturan di `src/config/experience.ts`, bagian `photos`:

| Pengaturan | Fungsi |
|---|---|
| `enabled` | `false` untuk mematikan fitur foto |
| `maxVisibleDesktop` / `maxVisibleMobile` | Jumlah bingkai yang tampil bersamaan |
| `swapSeconds` | Jeda ganti foto bila foto lebih banyak dari bingkai |
| `captions` | Caption opsional per foto, contoh: `{ '01.jpg': 'Teks singkat' }` |

Privasi: jika repo GitHub Anda publik, foto di folder ini ikut terlihat publik.

## 11. Alur pengalaman

1. **Undangan** — layar gelap berbintang dengan kelopak melayang dan tombol "Open Your Little Universe".
2. **Hati partikel** — ribuan partikel berkumpul membentuk hati 3D yang berdenyut, dikelilingi partikel yang mengorbit.
3. **Taman bunga** — mawar merah, mawar merah muda, blossom, dan bunga putih berpusat emas tumbuh dan mekar bertahap.
4. **Nama** — "Ana Soviana" muncul huruf demi huruf.
5. **Surat** — kata-kata muncul perlahan (ketuk surat untuk menampilkan semuanya).
6. **Interaksi** — ketuk/klik bunga untuk semburan kelopak bercahaya, ketuk hati untuk denyut, sorot bunga dengan mouse,
   dan tombol "Pesan kecil" untuk pesan pendek bergantian (tombol ini juga bekerja dengan keyboard).
7. **Akhir** — pesan penutup dan tombol "Ulangi Pengalaman".

Ikon panah melingkar di pojok kiri atas mengulang dari awal kapan saja.

## 12. Performa & aksesibilitas

- Hati, bintang, kilau, dan semburan memakai `Points` + shader (GPU); bunga memakai `InstancedMesh`
  (hanya beberapa draw call). Tidak ada ribuan komponen React.
- Kualitas menyesuaikan perangkat: jumlah partikel, bunga, dan kelopak lebih sedikit di ponsel/perangkat lemah;
  *pixel ratio* dibatasi; tanpa post-processing berat.
- Mendukung `prefers-reduced-motion` (animasi diperlambat, surat langsung tampil).
- Komposisi berbeda untuk layar potret (ponsel) dan layar lebar (surat di samping hati).
- Jika WebGL tidak tersedia atau adegan 3D gagal dimuat, tampil hati SVG berdenyut sebagai cadangan,
  dan seluruh alur teks tetap berfungsi.

## 13. Struktur proyek

```
ana-special-universe/
├── public/favicon.svg
├── src/
│   ├── assets/music/          ← letakkan musik Anda di sini (opsional)
│   ├── assets/photos/         ← letakkan foto Anda di sini (opsional)
│   ├── components/            ← ParticleHeart, FlowerGarden, FloatingPetals, PetalBurst,
│   │                            Starfield, InteractionLayer, IntroScreen, NameReveal,
│   │                            PersonalMessage, PlayDock, FinalMoment, AudioControl, ...
│   ├── config/experience.ts   ← SEMUA teks, warna, dan pengaturan animasi
│   ├── hooks/                 ← useDeviceProfile, useAudio
│   ├── lib/                   ← sampler hati, geometri bunga, tata letak, urutan animasi
│   ├── scenes/MainScene.tsx   ← kanvas 3D, kamera, dan penyusunan adegan
│   ├── styles/global.css
│   ├── App.tsx                ← alur tahapan pengalaman
│   └── main.tsx
├── index.html  package.json  package-lock.json  tsconfig.json  vite.config.ts
```

## 14. Pemecahan masalah

| Masalah | Solusi |
|---|---|
| `npm: command not found` | Instal Node.js dari nodejs.org, lalu buka ulang terminal/VS Code. |
| `npm install` gagal / lambat | Cek koneksi internet. Hapus folder `node_modules` dan file lock bila perlu, lalu ulangi `npm install`. Pastikan Node ≥ 18. |
| Port 5173 sudah dipakai | Vite otomatis memakai port lain; buka alamat yang tertulis di terminal. Atau `npm run dev -- --port 3000`. |
| Layar hitam / hanya hati SVG | WebGL mati atau tidak didukung. Aktifkan *hardware acceleration* di pengaturan browser, atau perbarui browser/driver GPU. |
| Animasi patah-patah di ponsel | Tutup tab lain, matikan mode hemat daya. Kurangi jumlah partikel di `src/hooks/useDeviceProfile.ts` (`heartParticles`, `petals`, `flowerFactor`). |
| Foto tidak muncul | Pastikan file ada di `src/assets/photos/` berformat jpg/png/webp/avif, lalu jalankan ulang `npm run dev`. Foto hanya tampil setelah taman mulai mekar. |
| Tombol musik tidak muncul | Belum ada file audio di `src/assets/music/`, atau Anda belum menjalankan ulang `npm run dev` setelah menambahkannya. |
| Musik tidak terdengar | Pastikan volume perangkat/tab tidak *mute* dan tombol musik dalam keadaan menyala. |
| Halaman kosong setelah di-deploy | Buka lewat server/hosting, bukan `file://`. Unggah seluruh isi `dist/`. |
| Error TypeScript saat `npm run build` | Pastikan hanya mengubah isi string/angka di `experience.ts` dan tanda kutip tetap berpasangan. |