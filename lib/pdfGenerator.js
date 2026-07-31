import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  HEADER_ROW_HEIGHT_MM,
  FOOTER_RESERVE_MM,
  COL_WIDTHS_MM,
  MARGIN_X_MM,
  CELL_PADDING_V_MM,
  CELL_PADDING_H_MM,
  computeRowHeights,
  truncateToLimit,
} from "./layoutUtils";

// Mengikuti desain asli file PPTX: hitam-putih polos, tanpa warna tema,
// border tegas di setiap sel. Tinggi tiap baris kegiatan dihitung secara
// PROPORSIONAL dari layoutUtils (bukan dibagi rata) supaya kegiatan dengan
// isi sedikit dapat baris pendek, dan kegiatan dengan banyak poin/isi
// panjang dapat baris lebih tinggi — totalnya tetap memenuhi 1 halaman.
const BLACK = [0, 0, 0];
const ABSOLUTE_MAX_CHARS = 4000; // jaring pengaman terakhir, kasus ekstrem saja

function drawHeader(doc, pageWidth) {
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Lembar Kegiatan Harian OJT", pageWidth / 2, 16, { align: "center" });
  return 20;
}

function drawInfoBlock(doc, startY, marginX, config, hariTanggal) {
  const lineHeight = 6.2;
  let y = startY + 8;

  doc.setTextColor(...BLACK);
  doc.setFontSize(11);

  const rows = [
    ["Nama", config.nama],
    ["Hari/Tanggal", hariTanggal],
    ["Lokasi OJT", config.lokasi],
    ["Nama Mentor", config.mentor],
  ];

  const labelWidth = 32;

  rows.forEach(([label, value], i) => {
    const rowY = y + i * lineHeight;
    doc.setFont("helvetica", "normal");
    doc.text(label, marginX, rowY);
    doc.text(":", marginX + labelWidth, rowY);
    doc.text(String(value || "-"), marginX + labelWidth + 4, rowY);
  });

  return y + rows.length * lineHeight + 6;
}

function drawFooter(doc, pageWidth, pageHeight, config) {
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(config.instansi || "PT Bank Mandiri Taspen", pageWidth / 2, pageHeight - 10, {
    align: "center",
  });
}

/**
 * Membuat satu file PDF berisi 5 halaman (Senin - Jumat) untuk satu minggu,
 * mengikuti persis tata letak & gaya (hitam-putih, bergaris, tabel penuh 1
 * halaman) dari file PPTX asli.
 * @param {Object} config - { nama, lokasi, mentor, instansi }
 * @param {Array} weekDays - array 5 objek { hariTanggal, activities: [{kegiatan, criticalPoint}] }
 */
export function generateWeekPdf(config, weekDays) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = MARGIN_X_MM;

  weekDays.forEach((day, dayIndex) => {
    if (dayIndex > 0) doc.addPage();

    const headerBottom = drawHeader(doc, pageWidth);
    const infoBottom = drawInfoBlock(doc, headerBottom, marginX, config, day.hariTanggal);

    const activities =
      day.activities && day.activities.length > 0
        ? day.activities
        : [{ kegiatan: "", criticalPoint: "" }];

    const numRows = activities.length;
    // Tinggi tiap baris dihitung proporsional sesuai kebutuhan konten
    // masing-masing kegiatan (array, satu nilai per baris).
    const rowHeights = computeRowHeights(activities);

    const body = activities.map((act, i) => {
      // Jaring pengaman terakhir (kasus ekstrem saja) supaya sistem tidak
      // pernah error apa pun yang diketik pengguna.
      const kegiatan = truncateToLimit(act.kegiatan || "", ABSOLUTE_MAX_CHARS);
      const criticalPoint = truncateToLimit(act.criticalPoint || "", ABSOLUTE_MAX_CHARS);
      const cellStyle = { minCellHeight: rowHeights[i] };

      const row = [
        { content: String(i + 1), styles: { ...cellStyle } },
        { content: kegiatan, styles: { ...cellStyle } },
        { content: criticalPoint, styles: { ...cellStyle } },
      ];
      if (i === 0) {
        row.push({
          content: "",
          rowSpan: numRows,
          styles: { valign: "middle", halign: "center" },
        });
      }
      return row;
    });

    autoTable(doc, {
      startY: infoBottom,
      margin: { left: marginX, right: marginX, bottom: FOOTER_RESERVE_MM },
      pageBreak: "avoid",
      rowPageBreak: "avoid",
      head: [["No", "Kegiatan", "Critical Point\nPembelajaran", "Paraf/\nTtd\nMentor"]],
      body,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: {
          top: CELL_PADDING_V_MM,
          bottom: CELL_PADDING_V_MM,
          left: CELL_PADDING_H_MM,
          right: CELL_PADDING_H_MM,
        },
        lineColor: BLACK,
        lineWidth: 0.4,
        textColor: BLACK,
        fillColor: [255, 255, 255],
        valign: "middle",
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: BLACK,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        fontSize: 11,
        lineWidth: 0.4,
        lineColor: BLACK,
        minCellHeight: HEADER_ROW_HEIGHT_MM,
      },
      columnStyles: {
        // No: rata tengah horizontal & vertikal, lebar cukup supaya "No" tidak terpecah
        0: { cellWidth: COL_WIDTHS_MM.no, halign: "center", valign: "middle" },
        // Kegiatan: rata kiri, posisi vertikal di tengah
        1: { cellWidth: COL_WIDTHS_MM.kegiatan, halign: "left", valign: "middle" },
        // Critical Point Pembelajaran: rata kiri, vertikal di tengah
        2: { cellWidth: COL_WIDTHS_MM.criticalPoint, halign: "left", valign: "middle" },
        // Paraf/Ttd Mentor: rata tengah horizontal & vertikal
        3: { cellWidth: COL_WIDTHS_MM.paraf, halign: "center", valign: "middle" },
      },
      didDrawPage: () => {
        drawFooter(doc, pageWidth, pageHeight, config);
      },
    });
  });

  return doc;
}
