/**
 * =====================================================================
 *  KONFIGURASI UTAMA — A SPECIAL UNIVERSE FOR ANA SOVIANA
 * =====================================================================
 *  Semua teks, warna, dan preferensi animasi bisa diubah di file ini.
 *  Tidak perlu menyentuh file lain untuk personalisasi.
 *
 *  Warna ditulis dalam format hex, misalnya "#ff2a4d".
 *  Setelah menyimpan file, browser (npm run dev) akan memuat ulang otomatis.
 * =====================================================================
 */

export const experience = {
  /** Nama penerima. Dipakai di seluruh website. */
  recipientName: 'Ana Soviana',

  /** Judul halaman (tab browser). */
  documentTitle: 'A Special Universe for Ana Soviana',

  /* ------------------------------------------------------------------ */
  /*  TEKS                                                              */
  /* ------------------------------------------------------------------ */

  intro: {
    message: 'A little universe, created just for you.',
    buttonLabel: 'Open Your Little Universe',
    loadingLabel: 'Menyiapkan semesta kecil…',
  },

  /** Tombol-tombol kecil di sepanjang pengalaman. */
  labels: {
    readLetter: 'Baca pesanku',
    continue: 'Lanjutkan',
    skipTyping: 'Ketuk pesan untuk menampilkan semuanya',
    touchHint: 'Sentuh bunga atau hatinya',
    whisperButton: 'Pesan kecil',
    finish: 'Sampai di sini',
    replay: 'Ulangi Pengalaman',
    replayShort: 'Ulangi dari awal',
  },

  /**
   * Surat pribadi. Pisahkan paragraf dengan baris kosong.
   * Paragraf pertama otomatis tampil sebagai salam pembuka.
   */
  letter: `Untuk Ana Soviana,

Ada hal-hal indah yang terkadang sulit dijelaskan dengan kata-kata. Jadi, kali ini biarkan cahaya, bunga, dan semesta kecil ini menyampaikan sedikit dari apa yang ingin kuungkapkan.

Semoga setiap kelopak yang bermekaran mengingatkanmu bahwa kamu pantas mendapatkan hal-hal indah, dan semoga hari-harimu selalu memiliki alasan untuk tersenyum.

Website kecil ini kubuat khusus untukmu, sebagai cara sederhana untuk menghadirkan sesuatu yang berbeda dan istimewa.

Dengan tulus, untuk Ana Soviana.`,

  /**
   * Pesan-pesan pendek yang muncul bergantian saat tombol "Pesan kecil" ditekan.
   * Tambah, ubah, atau hapus sesuai keinginan.
   */
  whispers: [
    'Semoga hari ini ringan untukmu.',
    'Kamu pantas mendapatkan hal-hal yang indah.',
    'Semoga ada alasan kecil untuk tersenyum hari ini.',
    'Bunga-bunga ini mekar untukmu.',
  ],

  /** Pesan penutup. */
  finalMessage: 'Semoga harimu selalu seindah bunga yang bermekaran.',

  /* ------------------------------------------------------------------ */
  /*  WARNA                                                             */
  /* ------------------------------------------------------------------ */

  colors: {
    /** Latar belakang gelap. */
    background: '#0a0206',

    /** Warna partikel hati. Setiap partikel memilih salah satu secara acak
     *  sesuai bobotnya (weight). */
    heartParticles: [
      { color: '#e0143c', weight: 0.34 }, // crimson
      { color: '#ff2a4d', weight: 0.28 }, // merah terang
      { color: '#ff6f9c', weight: 0.28 }, // merah muda
      { color: '#f6c978', weight: 0.1 }, // emas champagne
    ],

    /** Partikel yang mengorbit hati. */
    orbitParticles: ['#ff8fb1', '#f6c978', '#ffd6e2'],

    /** Warna bunga. */
    flowers: {
      redRose: '#8a0824',
      pinkRose: '#f48fb1',
      blossom: '#ffb3cc',
      daisyPetal: '#fffaf2',
      daisyCenter: '#f2b84b',
      leaf: '#1f3a2a',
    },

    /** Warna kelopak yang melayang. */
    petals: ['#ff5c85', '#ffa3bd', '#c4153b', '#ffd9e4'],

    /** Cahaya hati yang memantul ke bunga. */
    heartLight: '#ff4f7a',
  },

  /* ------------------------------------------------------------------ */
  /*  ANIMASI                                                           */
  /* ------------------------------------------------------------------ */

  animation: {
    /** Detak jantung hati: 1 = normal, 0 = tidak berdetak, 2 = lebih kuat. */
    heartbeatStrength: 1,

    /** Kecepatan gerak bunga & kelopak: 1 = normal. */
    motionSpeed: 1,

    /** Pengaruh gerakan mouse/sentuhan pada adegan (0 = mati). */
    pointerInfluence: 1,

    /** Durasi (detik) hati terbentuk dari partikel. */
    heartFormSeconds: 4.6,

    /** Durasi (detik) taman tumbuh dan mulai mekar. */
    gardenGrowSeconds: 5.5,

    /** Durasi (detik) seluruh bunga mekar perlahan. */
    gardenBloomSeconds: 16,

    /** Kecepatan munculnya kata pada surat (ms per kata). */
    letterWordDelayMs: 85,
  },

  /* ------------------------------------------------------------------ */
  /*  MUSIK (OPSIONAL)                                                  */
  /* ------------------------------------------------------------------ */

  audio: {
    /** Volume 0 – 1. */
    volume: 0.45,
    /** Label aksesibilitas tombol musik. */
    labelOn: 'Matikan musik',
    labelOff: 'Nyalakan musik',
    /**
     * File musik diambil otomatis dari folder src/assets/music/
     * (mp3, ogg, wav, m4a, aac, flac). Lihat README.md.
     */
  },
} as const;

export type ExperienceConfig = typeof experience;
