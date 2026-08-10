import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  HEADER_ROW_HEIGHT_MM,
  FOOTER_RESERVE_MM,
  COL_WIDTHS_MM,
  MARGIN_X_MM,
  CELL_PADDING_V_MM,
  CELL_PADDING_H_MM,
  computeDayLayout,
  lineHeightMm,
  truncateToLimit,
} from "./layoutUtils";

const BLACK = [0, 0, 0];
const ABSOLUTE_MAX_CHARS = 4000;

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

function drawLampiranPage(doc, pageWidth, pageHeight, marginX, config, lampiran) {
  doc.addPage();

  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Lampiran", pageWidth / 2, 16, { align: "center" });

  const contentWidth = pageWidth - marginX * 2;
  let y = 32;

  const sections = [
    { title: "1. Performance Gap", points: lampiran.performanceGap || [] },
    { title: "2. Operational Findings", points: lampiran.operationalFindings || [] },
    { title: "3. Business Opportunity", points: lampiran.businessOpportunity || [] },
  ];

  sections.forEach((section) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(section.title, marginX, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    if (section.points.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.text("(belum diisi)", marginX + 6, y);
      y += 7;
    } else {
      section.points.forEach((point) => {
        const wrapped = doc.splitTextToSize(`•  ${point}`, contentWidth - 6);
        wrapped.forEach((line) => {
          doc.text(line, marginX + 6, y);
          y += 5.6;
        });
      });
    }
    y += 6;
  });

  drawFooter(doc, pageWidth, pageHeight, config);
}

/**
 * Menggambar teks manual di dalam sebuah sel dengan aturan: rata kiri-kanan
 * (justify) untuk SEMUA baris KECUALI baris terakhir tiap paragraf (baris
 * terakhir dibiarkan rata kiri biasa). Ini mencegah baris pendek/terakhir
 * dipaksa melebar dengan spasi antar-kata yang aneh akibat justify.
 * Teks juga diposisikan center secara vertikal dalam tinggi sel.
 */
function drawSmartJustifiedCell(doc, text, cellX, cellY, cellWidth, cellHeight, fontSizePt) {
  if (!text) return;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSizePt);
  doc.setTextColor(...BLACK);

  const contentWidth = cellWidth - CELL_PADDING_H_MM * 2;
  const lh = lineHeightMm(fontSizePt);
  const paragraphs = text.split("\n");

  const allLines = [];
  paragraphs.forEach((para) => {
    const wrapped = doc.splitTextToSize(para, contentWidth);
    wrapped.forEach((line, idx) => {
      allLines.push({ text: line, isLastOfParagraph: idx === wrapped.length - 1 });
    });
  });

  const totalTextHeight = allLines.length * lh;
  const startY = cellY + Math.max(CELL_PADDING_V_MM, (cellHeight - totalTextHeight) / 2) + lh * 0.78;
  const textX = cellX + CELL_PADDING_H_MM;

  allLines.forEach((line, i) => {
    const ly = startY + i * lh;
    if (line.isLastOfParagraph) {
      doc.text(line.text, textX, ly, { align: "left" });
    } else {
      doc.text(line.text, textX, ly, { align: "justify", maxWidth: contentWidth });
    }
  });
}

export function generateWeekPdf(config, weekDays, lampiran) {
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
    const { fontSize, rowHeights } = computeDayLayout(activities);

    const cellTexts = activities.map((act) => ({
      kegiatan: truncateToLimit(act.kegiatan || "", ABSOLUTE_MAX_CHARS),
      criticalPoint: truncateToLimit(act.criticalPoint || "", ABSOLUTE_MAX_CHARS),
    }));

    const body = activities.map((act, i) => {
      const cellStyle = { minCellHeight: rowHeights[i] };
      const row = [
        { content: String(i + 1), styles: { ...cellStyle } },
        { content: "", styles: { ...cellStyle } },
        { content: "", styles: { ...cellStyle } },
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
        fontSize,
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
        0: { cellWidth: COL_WIDTHS_MM.no, halign: "center", valign: "middle" },
        1: { cellWidth: COL_WIDTHS_MM.kegiatan },
        2: { cellWidth: COL_WIDTHS_MM.criticalPoint },
        3: { cellWidth: COL_WIDTHS_MM.paraf, halign: "center", valign: "middle" },
      },
      didDrawCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index === 1) {
          drawSmartJustifiedCell(
            doc,
            cellTexts[data.row.index].kegiatan,
            data.cell.x,
            data.cell.y,
            data.cell.width,
            data.cell.height,
            fontSize
          );
        } else if (data.column.index === 2) {
          drawSmartJustifiedCell(
            doc,
            cellTexts[data.row.index].criticalPoint,
            data.cell.x,
            data.cell.y,
            data.cell.width,
            data.cell.height,
            fontSize
          );
        }
      },
      didDrawPage: () => {
        drawFooter(doc, pageWidth, pageHeight, config);
      },
    });
  });

  const hasLampiranContent =
    lampiran &&
    ((lampiran.performanceGap && lampiran.performanceGap.length > 0) ||
      (lampiran.operationalFindings && lampiran.operationalFindings.length > 0) ||
      (lampiran.businessOpportunity && lampiran.businessOpportunity.length > 0));

  if (hasLampiranContent) {
    drawLampiranPage(doc, pageWidth, pageHeight, marginX, config, lampiran);
  }

  return doc;
}
