// Konstanta ukuran halaman & tata letak tabel, dipakai bareng oleh generator
// PDF (lib/pdfGenerator.js) dan UI (app/page.js).
//
// PRINSIP UTAMA:
// 1) Tinggi tabel mengikuti kebutuhan KONTEN ASLINYA (natural height) —
//    TIDAK dipaksa mengisi penuh 1 halaman. Kegiatan sedikit -> tabel
//    pendek. Kegiatan banyak/panjang -> tabel lebih tinggi.
// 2) Kalau total konten 1 hari ternyata lebih banyak dari kapasitas 1
//    halaman di ukuran font normal, ukuran font OTOMATIS DIKECILKAN
//    (bertahap sampai batas minimum) supaya tetap muat 1 halaman.

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
export const COL_WIDTHS_MM = {
  no: 15,
  kegiatan: 60,
  criticalPoint: 83,
  paraf: 24,
};

// Padding: vertikal dibuat tipis (jarak border-teks minim, hemat ruang),
// horizontal tetap cukup supaya teks tidak nempel garis kiri-kanan.
export const CELL_PADDING_V_MM = 1.5; // padding atas & bawah tiap sel
export const CELL_PADDING_H_MM = 4; // padding kiri & kanan tiap sel

export const DEFAULT_FONT_SIZE_PT = 10; // ukuran font normal isi tabel
export const MIN_FONT_SIZE_PT = 7; // batas bawah pengecilan font otomatis
const FONT_SIZE_STEP = 0.5; // besar penurunan tiap percobaan pengecilan
const LINE_BUFFER = 0.3; // buffer kecil supaya perkiraan tinggi tidak terlalu mepet

export function lineHeightMm(fontSizePt) {
  return fontSizePt * 1.15 * 0.3528;
}

function avgCharWidthMm(fontSizePt) {
  return fontSizePt * 0.52 * 0.3528;
}

export function charsPerLineFor(colWidthMm, fontSizePt) {
  return Math.max(
    1,
    Math.floor((colWidthMm - CELL_PADDING_H_MM * 2) / avgCharWidthMm(fontSizePt))
  );
}

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

function naturalHeightsAtFontSize(activities, fontSizePt) {
  const kCpl = charsPerLineFor(COL_WIDTHS_MM.kegiatan, fontSizePt);
  const cCpl = charsPerLineFor(COL_WIDTHS_MM.criticalPoint, fontSizePt);
  const lh = lineHeightMm(fontSizePt);

  return activities.map((act) => {
    const kLines = estimateLines(act.kegiatan || "", kCpl);
    const cLines = estimateLines(act.criticalPoint || "", cCpl);
    const lines = Math.max(kLines, cLines, 1) + LINE_BUFFER;
    return Math.max(MIN_ROW_HEIGHT_MM, lines * lh + CELL_PADDING_V_MM * 2);
  });
}

/**
 * Menghitung tata letak 1 halaman kegiatan harian:
 * - fontSize: ukuran font dipakai (otomatis mengecil dari 10pt kalau
 *   konten kebanyakan, sampai batas minimum 7pt, supaya tetap muat 1 halaman)
 * - rowHeights: tinggi tiap baris MENGIKUTI KEBUTUHAN KONTEN ASLINYA
 *   (tidak dipaksa mengisi penuh halaman — kalau isinya sedikit, tabel
 *   ikut pendek)
 * - fits: true kalau berhasil muat dalam 1 halaman
 */
export function computeDayLayout(activities) {
  const available = pageAvailableHeight();

  if (!activities || activities.length === 0) {
    return { fontSize: DEFAULT_FONT_SIZE_PT, rowHeights: [], totalHeight: 0, available, fits: true };
  }

  let fontSize = DEFAULT_FONT_SIZE_PT;
  let naturalHeights = naturalHeightsAtFontSize(activities, fontSize);
  let total = naturalHeights.reduce((a, b) => a + b, 0);

  // Kecilkan font bertahap kalau melebihi 1 halaman, sampai muat atau mentok minimum.
  while (total > available && fontSize > MIN_FONT_SIZE_PT) {
    fontSize = Math.max(MIN_FONT_SIZE_PT, fontSize - FONT_SIZE_STEP);
    naturalHeights = naturalHeightsAtFontSize(activities, fontSize);
    total = naturalHeights.reduce((a, b) => a + b, 0);
  }

  return { fontSize, rowHeights: naturalHeights, totalHeight: total, available, fits: total <= available };
}

// Batas mutlak anti-abuse (bukan batas praktis normal) — hanya jaring
// pengaman terakhir untuk input yang benar-benar ekstrem panjangnya.
const ABSOLUTE_MAX_CHARS = 4000;

/**
 * Mendukung beberapa poin/paragraf dalam satu kegiatan: pisahkan pakai titik
 * koma (;) pada input mentahnya, tiap poin otomatis jadi baris/paragraf baru
 * dalam 1 sel. TIDAK menambahkan nomor apa pun — nomor manual Anda sendiri
 * (kalau ada) akan tampil apa adanya.
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
 * Dipakai sebagai jaring pengaman TERAKHIR (kasus ekstrem saja).
 */
export function truncateToLimit(text, maxChars) {
  if (!text) return text;
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}
