import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Mengikuti desain asli file PPTX: hitam-putih polos, tanpa warna tema,
// border tegas di setiap sel, dan tabel selalu memenuhi halaman
// (baris otomatis melebar bila kegiatan sedikit) — persis seperti file asli.
const BLACK = [0, 0, 0];

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

const HEADER_ROW_HEIGHT = 16; // tinggi baris judul kolom (mm)
const FOOTER_RESERVE = 18; // ruang disisakan di bawah untuk nama instansi (mm)
const MIN_ROW_HEIGHT = 12; // batas bawah tinggi baris agar tidak terlalu pipih

/**
 * Membuat satu file PDF berisi 5 halaman (Senin - Jumat) untuk satu minggu,
 * mengikuti persis tata letak & gaya (hitam-putih, bergaris, tabel penuh 1 halaman)
 * dari file PPTX asli.
 * @param {Object} config - { nama, lokasi, mentor, instansi }
 * @param {Array} weekDays - array 5 objek { hariTanggal, activities: [{kegiatan, criticalPoint}] }
 */
export function generateWeekPdf(config, weekDays) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  weekDays.forEach((day, dayIndex) => {
    if (dayIndex > 0) doc.addPage();

    const headerBottom = drawHeader(doc, pageWidth);
    const infoBottom = drawInfoBlock(doc, headerBottom, marginX, config, day.hariTanggal);

    const activities =
      day.activities && day.activities.length > 0
        ? day.activities
        : [{ kegiatan: "", criticalPoint: "" }];

    const numRows = activities.length;

    // Hitung tinggi baris supaya tabel selalu memenuhi sisa halaman,
    // persis seperti file asli (walau kegiatan cuma sedikit).
    const availableHeight = pageHeight - FOOTER_RESERVE - infoBottom - HEADER_ROW_HEIGHT;
    const rowHeight = Math.max(MIN_ROW_HEIGHT, availableHeight / numRows);

    const body = activities.map((act, i) => {
      const row = [String(i + 1), act.kegiatan || "", act.criticalPoint || ""];
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
      margin: { left: marginX, right: marginX, bottom: FOOTER_RESERVE },
      head: [["No", "Kegiatan", "Critical Point\nPembelajaran", "Paraf/\nTtd\nMentor"]],
      body,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 4,
        lineColor: BLACK,
        lineWidth: 0.4,
        textColor: BLACK,
        fillColor: [255, 255, 255],
        valign: "middle",
        minCellHeight: rowHeight,
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
        minCellHeight: HEADER_ROW_HEIGHT,
      },
      columnStyles: {
        // No: rata tengah horizontal & vertikal
        0: { cellWidth: 12, halign: "center", valign: "middle" },
        // Kegiatan: rata kiri-kanan (justify), posisi vertikal di tengah
        1: { cellWidth: 45, halign: "justify", valign: "middle" },
        // Critical Point Pembelajaran: rata kiri-kanan (justify), vertikal di tengah
        2: { cellWidth: "auto", halign: "justify", valign: "middle" },
        // Paraf/Ttd Mentor: rata tengah horizontal & vertikal
        3: { cellWidth: 24, halign: "center", valign: "middle" },
      },
      didDrawPage: () => {
        drawFooter(doc, pageWidth, pageHeight, config);
      },
    });
  });

  return doc;
}
