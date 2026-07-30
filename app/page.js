"use client";

import { useEffect, useState } from "react";
import { getWorkweekDays, getWeekLabel } from "../lib/dateUtils";
import { generateWeekPdf } from "../lib/pdfGenerator";
import { computeMaxChars, formatMultiPoint } from "../lib/layoutUtils";

const DEFAULT_CONFIG = {
  nama: "Afiq Atsal Adami",
  lokasi: "KC Cirebon",
  mentor: "Takdir Paranajaya Angga Dewa",
  instansi: "PT Bank Mandiri Taspen",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseActivities(text) {
  const rawLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rawLines.length === 0) return [];

  const numRows = rawLines.length;
  const { maxLines, kegiatanCharsPerLine, criticalPointCharsPerLine, kegiatanMax, criticalPointMax } =
    computeMaxChars(numRows);

  return rawLines.map((line) => {
    const idx = line.indexOf("|");
    const kegiatanRaw = idx === -1 ? line : line.slice(0, idx).trim();
    const criticalPointRaw = idx === -1 ? "" : line.slice(idx + 1).trim();

    return {
      // Titik koma (;) di dalam kegiatan/critical point akan otomatis
      // dipecah jadi beberapa poin bernomor (1) 2) 3) ...) dalam 1 sel.
      kegiatan: formatMultiPoint(kegiatanRaw, kegiatanCharsPerLine, maxLines, kegiatanMax),
      criticalPoint: formatMultiPoint(
        criticalPointRaw,
        criticalPointCharsPerLine,
        maxLines,
        criticalPointMax
      ),
    };
  });
}

// Mengecek tiap baris kegiatan terhadap batas karakter yang dihitung,
// mengembalikan daftar peringatan (baris ke berapa yang kepanjangan).
function getLengthWarnings(activities, kegiatanMax, criticalPointMax) {
  const warnings = [];
  activities.forEach((act, i) => {
    const lineNo = i + 1;
    if (act.kegiatan.length > kegiatanMax) {
      warnings.push(
        `Baris ${lineNo}: kolom Kegiatan kepanjangan (${act.kegiatan.length}/${kegiatanMax} karakter)`
      );
    }
    if (act.criticalPoint.length > criticalPointMax) {
      warnings.push(
        `Baris ${lineNo}: kolom Critical Point kepanjangan (${act.criticalPoint.length}/${criticalPointMax} karakter)`
      );
    }
  });
  return warnings;
}

export default function Home() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [anchorDate, setAnchorDate] = useState(todayIso());
  const [dayTexts, setDayTexts] = useState({});
  const [status, setStatus] = useState("");

  const weekDays = getWorkweekDays(anchorDate);
  const weekLabel = getWeekLabel(anchorDate);
  const weekKey = weekDays[0].isoDate;

  // Load config tersimpan
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ojt-config");
      if (saved) setConfig(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Load draft minggu berjalan
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ojt-week-${weekKey}`);
      setDayTexts(saved ? JSON.parse(saved) : {});
    } catch (e) {
      setDayTexts({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  function saveConfig(newConfig) {
    setConfig(newConfig);
    localStorage.setItem("ojt-config", JSON.stringify(newConfig));
  }

  function updateDayText(isoDate, value) {
    const updated = { ...dayTexts, [isoDate]: value };
    setDayTexts(updated);
    localStorage.setItem(`ojt-week-${weekKey}`, JSON.stringify(updated));
  }

  function handleDownload() {
    const weekPayload = weekDays.map((d) => ({
      hariTanggal: d.hariTanggal,
      activities: parseActivities(dayTexts[d.isoDate] || ""),
    }));

    const emptyDays = weekPayload.filter((d) => d.activities.length === 0);
    if (emptyDays.length > 0) {
      setStatus(
        "⚠️ Ada hari yang belum diisi kegiatannya. Tetap akan dibuat sebagai baris kosong."
      );
    } else {
      setStatus("");
    }

    const doc = generateWeekPdf(config, weekPayload);
    const filename = `Lembar_Daily_OJT_${weekDays[0].isoDate}_sd_${weekDays[4].isoDate}.pdf`;
    doc.save(filename);
    setStatus(
      "✅ PDF berhasil dibuat dan diunduh: " +
        filename +
        ". Kalau ada baris yang kepanjangan, otomatis dipotong (…) supaya tidak meluber."
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Generator Laporan Harian OJT</h1>
          <p style={styles.subtitle}>{config.instansi} — {config.lokasi}</p>
        </header>

        <section style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <div>
              <div style={styles.label}>Minggu berjalan</div>
              <div style={styles.weekLabel}>{weekLabel}</div>
            </div>
            <div>
              <label style={styles.label}>Pilih tanggal (hari apapun dalam minggu itu)</label>
              <input
                type="date"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          </div>

          <button
            style={styles.settingsToggle}
            onClick={() => setShowSettings((s) => !s)}
          >
            {showSettings ? "Sembunyikan pengaturan tetap" : "⚙️ Ubah data tetap (nama/mentor/lokasi)"}
          </button>

          {showSettings && (
            <div style={styles.settingsGrid}>
              <label style={styles.fieldLabel}>
                Nama
                <input
                  style={styles.textInput}
                  value={config.nama}
                  onChange={(e) => saveConfig({ ...config, nama: e.target.value })}
                />
              </label>
              <label style={styles.fieldLabel}>
                Lokasi OJT
                <input
                  style={styles.textInput}
                  value={config.lokasi}
                  onChange={(e) => saveConfig({ ...config, lokasi: e.target.value })}
                />
              </label>
              <label style={styles.fieldLabel}>
                Nama Mentor
                <input
                  style={styles.textInput}
                  value={config.mentor}
                  onChange={(e) => saveConfig({ ...config, mentor: e.target.value })}
                />
              </label>
              <label style={styles.fieldLabel}>
                Instansi
                <input
                  style={styles.textInput}
                  value={config.instansi}
                  onChange={(e) => saveConfig({ ...config, instansi: e.target.value })}
                />
              </label>
            </div>
          )}
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Isi Kegiatan per Hari</h2>
          <p style={styles.hint}>
            Format tiap baris: <code style={styles.code}>Kegiatan | Critical point pembelajaran</code>
            <br />
            Satu baris = satu nomor kegiatan. Kalau 1 kegiatan punya beberapa poin
            pembelajaran, pisahkan pakai titik koma (<code style={styles.code}>;</code>),
            contoh: <code style={styles.code}>Briefing pagi | Poin 1; Poin 2; Poin 3</code>{" "}
            — otomatis diberi nomor 1) 2) 3) dalam satu sel.
            <br />
            Tanggal & paraf otomatis diatur sistem. Batas karakter di bawah tiap
            hari otomatis menyesuaikan jumlah kegiatan.
          </p>

          {weekDays.map((d) => {
            const activities = parseActivities(dayTexts[d.isoDate] || "");
            const numRows = Math.max(1, activities.length);
            const { kegiatanMax, criticalPointMax } = computeMaxChars(numRows);
            const warnings =
              activities.length > 0
                ? getLengthWarnings(activities, kegiatanMax, criticalPointMax)
                : [];

            return (
              <div key={d.isoDate} style={styles.dayBlock}>
                <div style={styles.dayLabel}>{d.hariTanggal}</div>
                <textarea
                  style={styles.textarea}
                  rows={4}
                  placeholder={
                    "Briefing Pagi | Diskusi target harian bersama mentor\nObservasi Area Customer Service | Memahami alur layanan nasabah"
                  }
                  value={dayTexts[d.isoDate] || ""}
                  onChange={(e) => updateDayText(d.isoDate, e.target.value)}
                />
                <div style={styles.limitHint}>
                  {activities.length || 0} kegiatan hari ini → maks. ± {kegiatanMax}{" "}
                  karakter/kegiatan, ± {criticalPointMax} karakter/critical point.
                </div>
                {warnings.length > 0 && (
                  <ul style={styles.warningList}>
                    {warnings.map((w, idx) => (
                      <li key={idx} style={styles.warningItem}>
                        ⚠️ {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        <button style={styles.downloadButton} onClick={handleDownload}>
          ⬇ Download PDF Minggu Ini
        </button>

        {status && <p style={styles.status}>{status}</p>}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f4f6fa 0%, #eef1f6 100%)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "24px 12px 60px",
  },
  container: { maxWidth: 720, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: 24 },
  title: { color: "#1f3864", fontSize: 24, margin: 0, fontWeight: 800 },
  subtitle: { color: "#c89528", fontSize: 13, marginTop: 4, fontWeight: 600 },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
    boxShadow: "0 2px 10px rgba(31,56,100,0.08)",
    border: "1px solid #e7eaf0",
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  label: { fontSize: 12, color: "#7a8494", marginBottom: 4 },
  weekLabel: { fontSize: 16, fontWeight: 700, color: "#1f3864" },
  dateInput: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d7dbe3",
    fontSize: 14,
  },
  settingsToggle: {
    background: "none",
    border: "none",
    color: "#1f3864",
    fontSize: 13,
    cursor: "pointer",
    padding: "6px 0",
    textDecoration: "underline",
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 10,
  },
  fieldLabel: { fontSize: 12, color: "#4a5568", display: "flex", flexDirection: "column", gap: 4 },
  textInput: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d7dbe3",
    fontSize: 14,
  },
  sectionTitle: { color: "#1f3864", fontSize: 17, marginTop: 0, marginBottom: 6 },
  hint: { fontSize: 12.5, color: "#7a8494", marginBottom: 14, lineHeight: 1.5 },
  code: {
    background: "#f0f2f6",
    padding: "2px 5px",
    borderRadius: 4,
    color: "#c0504d",
  },
  dayBlock: { marginBottom: 16 },
  dayLabel: {
    fontWeight: 700,
    color: "#1f3864",
    fontSize: 13.5,
    marginBottom: 6,
    borderLeft: "4px solid #c89528",
    paddingLeft: 8,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 10,
    border: "1px solid #d7dbe3",
    padding: 12,
    fontSize: 13.5,
    fontFamily: "inherit",
    resize: "vertical",
  },
  limitHint: {
    fontSize: 11.5,
    color: "#8a93a3",
    marginTop: 4,
  },
  warningList: {
    margin: "6px 0 0",
    paddingLeft: 18,
  },
  warningItem: {
    fontSize: 12,
    color: "#b3492e",
    lineHeight: 1.6,
  },
  downloadButton: {
    width: "100%",
    padding: "14px 0",
    background: "linear-gradient(135deg, #1f3864, #16294a)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15.5,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(31,56,100,0.3)",
  },
  status: { textAlign: "center", marginTop: 12, fontSize: 13.5, color: "#1f3864" },
};
