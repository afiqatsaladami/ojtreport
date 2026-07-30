// Konstanta ukuran halaman & tata letak tabel, dipakai bareng oleh generator
// PDF (lib/pdfGenerator.js) dan UI (app/page.js) — supaya batas karakter yang
// ditampilkan ke pengguna selalu akurat sesuai yang benar-benar muat di PDF,
// dan supaya tidak pernah lagi ada isi yang meluber ke halaman baru.

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

// Padding dipisah: vertikal dibuat minim (supaya di kasus padat/karakter
// banyak, ruang tidak terbuang untuk jarak kosong atas-bawah — teks bisa
// memenuhi sel serapat mungkin), horizontal tetap cukup supaya teks tidak
// nempel ke garis kiri-kanan.
export const CELL_PADDING_V_MM = 1.5; // padding atas & bawah tiap sel
export const CELL_PADDING_H_MM = 4; // padding kiri & kanan tiap sel

const FONT_SIZE_PT = 10; // ukuran font isi tabel (Kegiatan & Critical Point)
const LINE_HEIGHT_MM = FONT_SIZE_PT * 1.15 * 0.3528; // ≈ 4.06mm per baris teks
// Perkiraan lebar rata-rata 1 karakter huruf Helvetica pada ukuran di atas.
const AVG_CHAR_WIDTH_MM = FONT_SIZE_PT * 0.52 * 0.3528; // ≈ 1.83mm/karakter

/**
 * Menghitung tinggi tiap baris tabel supaya tabel selalu memenuhi 1 halaman,
 * berapa pun jumlah kegiatan hari itu (numRows).
 */
export function computeRowHeight(numRows) {
  const n = Math.max(1, numRows);
  const available =
    PAGE_HEIGHT_MM - FOOTER_RESERVE_MM - INFO_BLOCK_BOTTOM_MM - HEADER_ROW_HEIGHT_MM;
  return Math.max(MIN_ROW_HEIGHT_MM, available / n);
}

/**
 * Menghitung batas maksimal karakter yang benar-benar muat (tanpa terpotong
 * atau meluber) di kolom Kegiatan & Critical Point, untuk jumlah kegiatan
 * (numRows) tertentu di hari itu. Makin banyak kegiatan dalam satu hari,
 * makin kecil jatah karakter per kegiatan (karena baris jadi lebih pendek).
 */
export function computeMaxChars(numRows) {
  const rowHeight = computeRowHeight(numRows);
  const maxLines = Math.max(
    1,
    Math.floor((rowHeight - CELL_PADDING_V_MM * 2) / LINE_HEIGHT_MM)
  );

  const kegiatanUsableWidth = COL_WIDTHS_MM.kegiatan - CELL_PADDING_H_MM * 2;
  const criticalPointUsableWidth = COL_WIDTHS_MM.criticalPoint - CELL_PADDING_H_MM * 2;

  const kegiatanCharsPerLine = Math.floor(kegiatanUsableWidth / AVG_CHAR_WIDTH_MM);
  const criticalPointCharsPerLine = Math.floor(
    criticalPointUsableWidth / AVG_CHAR_WIDTH_MM
  );

  return {
    rowHeight,
    maxLines,
    kegiatanCharsPerLine,
    criticalPointCharsPerLine,
    kegiatanMax: maxLines * kegiatanCharsPerLine,
    criticalPointMax: maxLines * criticalPointCharsPerLine,
  };
}

/**
 * Mendukung beberapa poin pembelajaran dalam satu kegiatan: pisahkan tiap
 * poin dengan titik koma (;) pada input mentahnya. Fungsi ini memberi nomor
 * otomatis ("1) ...", "2) ...", dst), lalu memastikan totalnya tetap muat
 * dalam jumlah baris yang tersedia — kalau kelebihan, poin paling belakang
 * dikurangi dulu (bukan asal memotong karakter di tengah kalimat), baru
 * dipotong per karakter kalau ternyata masih kepanjangan juga.
 */
export function formatMultiPoint(rawText, charsPerLine, maxLines, maxChars) {
  if (!rawText) return "";

  const points = rawText
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (points.length === 0) return "";

  if (points.length === 1) {
    return truncateToLimit(points[0], maxChars);
  }

  let list = points.map((p, i) => `${i + 1}) ${p}`);

  // Kurangi poin dari belakang selama estimasi baris yang dibutuhkan
  // melebihi jatah baris yang tersedia di sel.
  while (list.length > 1) {
    const estimatedLines = list.reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)),
      0
    );
    if (estimatedLines <= maxLines) break;
    list.pop();
  }

  const combined = list.join("\n");
  return truncateToLimit(combined, maxChars);
}

/**
 * Memotong teks ke batas maksimal karakter (kalau lebih), diakhiri "…".
 * Dipakai sebagai jaring pengaman terakhir di generator PDF supaya isi
 * PDF TIDAK PERNAH meluber, apa pun yang diketik pengguna.
 */
export function truncateToLimit(text, maxChars) {
  if (!text) return text;
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}
