// Konstanta ukuran halaman & tata letak tabel, dipakai bareng oleh generator
// PDF (lib/pdfGenerator.js) dan UI (app/page.js).
//
// PRINSIP UTAMA: tinggi tiap baris kegiatan TIDAK dibagi rata sama besar.
// Sistem menghitung dulu kebutuhan ruang tiap kegiatan (berdasarkan jumlah
// karakter & baris kontennya), lalu membagikan tinggi secara PROPORSIONAL —
// kegiatan dengan isi sedikit dapat baris pendek, kegiatan dengan banyak
// poin/isi panjang dapat baris lebih tinggi. Sisa ruang kosong dibagikan
// merata supaya totalnya tetap pas mengisi 1 halaman penuh.

export const PAGE_HEIGHT_MM = 297; // tinggi halaman A4
export const PAGE_WIDTH_MM = 210; // lebar halaman A4
export const MARGIN_X_MM = 14;

export const HEADER_ROW_HEIGHT_MM = 24; // tinggi baris judul kolom tabel
export const FOOTER_RESERVE_MM = 38; // ruang disisakan di bawah: footer + buffer aman
export const MIN_ROW_HEIGHT_MM = 12; // batas bawah tinggi baris

// Perkiraan tinggi blok judul + info (Nama/Hari-Tanggal/Lokasi/Mentor) sebelum
// tabel dimulai. Nilainya konstan karena isinya selalu persis 4 baris info.
export const INFO_BLOCK_BOTTOM_MM = 20 + 8 + 4 * 6.2 + 6; // ≈ 58.8mm

// Lebar tiap kolom tabel (mm). Total = PAGE_WIDTH_MM - 2*MARGIN_X_MM = 182mm.
// Kolom "No" dilebarkan sedikit (15mm) supaya tulisan "No" muat horizontal
// dalam satu baris, tidak terpecah jadi "N" / "o".
export const COL_WIDTHS_MM = {
  no: 15,
  kegiatan: 44,
  criticalPoint: 99,
  paraf: 24,
};

// Padding dipisah: vertikal dibuat minim (supaya ruang tidak terbuang untuk
// jarak kosong atas-bawah saat konten padat), horizontal tetap cukup supaya
// teks tidak nempel ke garis kiri-kanan.
export const CELL_PADDING_V_MM = 1.5; // padding atas & bawah tiap sel
export const CELL_PADDING_H_MM = 4; // padding kiri & kanan tiap sel

const FONT_SIZE_PT = 10; // ukuran font isi tabel (Kegiatan & Critical Point)
const LINE_HEIGHT_MM = FONT_SIZE_PT * 1.15 * 0.3528; // ≈ 4.06mm per baris teks
// Perkiraan lebar rata-rata 1 karakter huruf Helvetica pada ukuran di atas.
const AVG_CHAR_WIDTH_MM = FONT_SIZE_PT * 0.52 * 0.3528; // ≈ 1.83mm/karakter

export const KEGIATAN_CHARS_PER_LINE = Math.floor(
  (COL_WIDTHS_MM.kegiatan - CELL_PADDING_H_MM * 2) / AVG_CHAR_WIDTH_MM
);
export const CRITICAL_POINT_CHARS_PER_LINE = Math.floor(
  (COL_WIDTHS_MM.criticalPoint - CELL_PADDING_H_MM * 2) / AVG_CHAR_WIDTH_MM
);

/** Tinggi halaman yang tersedia untuk isi tabel (di luar judul, info, dan footer). */
export function pageAvailableHeight() {
  return PAGE_HEIGHT_MM - FOOTER_RESERVE_MM - INFO_BLOCK_BOTTOM_MM - HEADER_ROW_HEIGHT_MM;
}

/** Estimasi jumlah baris yang dibutuhkan sebuah teks, termasuk baris paksa (\n). */
export function estimateLines(text, charsPerLine) {
  if (!text) return 1;
  return text
    .split("\n")
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

/**
 * Menghitung tinggi TIAP baris kegiatan secara proporsional sesuai kebutuhan
 * kontennya masing-masing (bukan dibagi rata). Total tinggi semua baris akan
 * selalu dipaskan mengisi penuh 1 halaman selama total kebutuhan alami masih
 * cukup — kalau memang total kontennya sangat banyak (melebihi 1 halaman
 * walau sudah di ukuran wajar), tinggi alami dikembalikan apa adanya supaya
 * tidak ada data yang diam-diam hilang/terpotong.
 */
export function computeRowHeights(activities) {
  if (!activities || activities.length === 0) return [];

  const available = pageAvailableHeight();

  const naturalHeights = activities.map((act) => {
    const kLines = estimateLines(act.kegiatan || "", KEGIATAN_CHARS_PER_LINE);
    const cLines = estimateLines(act.criticalPoint || "", CRITICAL_POINT_CHARS_PER_LINE);
    const lines = Math.max(kLines, cLines, 1);
    return Math.max(MIN_ROW_HEIGHT_MM, lines * LINE_HEIGHT_MM + CELL_PADDING_V_MM * 2);
  });

  const totalNatural = naturalHeights.reduce((a, b) => a + b, 0);
  if (totalNatural <= 0) return naturalHeights;

  if (totalNatural <= available) {
    const leftover = available - totalNatural;
    return naturalHeights.map((h) => h + (h / totalNatural) * leftover);
  }

  return naturalHeights;
}

/** Total tinggi yang dibutuhkan (tanpa dipotong) untuk kumpulan kegiatan. */
export function totalNaturalHeight(activities) {
  if (!activities || activities.length === 0) return 0;
  return activities.reduce((sum, act) => {
    const kLines = estimateLines(act.kegiatan || "", KEGIATAN_CHARS_PER_LINE);
    const cLines = estimateLines(act.criticalPoint || "", CRITICAL_POINT_CHARS_PER_LINE);
    const lines = Math.max(kLines, cLines, 1);
    return sum + Math.max(MIN_ROW_HEIGHT_MM, lines * LINE_HEIGHT_MM + CELL_PADDING_V_MM * 2);
  }, 0);
}

// Batas mutlak anti-abuse (bukan batas praktis normal) — hanya jaring
// pengaman terakhir untuk input yang benar-benar ekstrem panjangnya.
const ABSOLUTE_MAX_CHARS = 4000;

/**
 * Mendukung beberapa poin/paragraf dalam satu kegiatan: pisahkan pakai titik
 * koma (;) pada input mentahnya, tiap poin otomatis jadi baris baru dalam 1
 * sel. TIDAK menambahkan nomor apa pun — kalau Anda sudah menomori sendiri
 * di dalam teksnya (mis. "1. Pengecekan...", "2. Pengecekan..."), nomor itu
 * akan tampil apa adanya tanpa dobel dengan nomor tambahan dari sistem.
 */
export function formatMultiPoint(rawText) {
  if (!rawText) return "";

  const points = rawText
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (points.length === 0) return "";

  const combined = points.join("\n");
  return truncateToLimit(combined, ABSOLUTE_MAX_CHARS);
}

/**
 * Memotong teks ke batas maksimal karakter (kalau lebih), diakhiri "…".
 * Dipakai sebagai jaring pengaman TERAKHIR (kasus ekstrem saja) supaya isi
 * PDF tidak pernah bikin sistem error, apa pun yang diketik pengguna.
 */
export function truncateToLimit(text, maxChars) {
  if (!text) return text;
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}
