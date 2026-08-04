"use client";

import { useEffect, useState } from "react";
import { getWorkweekDays, getWeekLabel, getSaturday } from "../lib/dateUtils";
import { generateWeekPdf } from "../lib/pdfGenerator";
import {
  totalNaturalHeight,
  pageAvailableHeight,
  formatMultiPoint,
} from "../lib/layoutUtils";

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

  return rawLines.map((line) => {
    const idx = line.indexOf("|");
    const kegiatanRaw = idx === -1 ? line : line.slice(0, idx).trim();
    const criticalPointRaw = idx === -1 ? "" : line.slice(idx + 1).trim();

    return {
      kegiatan: formatMultiPoint(kegiatanRaw),
      criticalPoint: formatMultiPoint(criticalPointRaw),
    };
  });
}

function checkDayFit(activities) {
  if (activities.length === 0) return { fits: true, needed: 0, available: 0 };
  const needed = totalNaturalHeight(activities);
  const available = pageAvailableHeight();
  return { fits: needed <= available, needed, available };
}

function parseBulletPoints(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function Home() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [anchorDate, setAnchorDate] = useState(todayIso());
  const [dayTexts, setDayTexts] = useState({});
  const [lampiranTexts, setLampiranTexts] = useState({
    performanceGap: "",
    operationalFindings: "",
    businessOpportunity: "",
  });
  const [status, setStatus] = useState("");

  const weekDays = getWorkweekDays(anchorDate);
  const saturday = getSaturday(anchorDate);
  const weekLabel = getWeekLabel(anchorDate);
  const weekKey = weekDays[0].isoDate;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ojt-config");
      if (saved) setConfig(JSON.parse(saved));
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ojt-week-${weekKey}`);
      setDayTexts(saved ? JSON.parse(saved) : {});
    } catch (e) {
      setDayTexts({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  useEffect(() => {
    const empty = { performanceGap: "", operationalFindings: "", businessOpportunity: "" };
    try {
      const saved = localStorage.getItem(`ojt-lampiran-${weekKey}`);
      setLampiranTexts(saved ? JSON.parse(saved) : empty);
    } catch (e) {
      setLampiranTexts(empty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  function updateLampiranText(field, value) {
    const updated = { ...lampiranTexts, [field]: value };
    setLampiranTexts(updated);
    localStorage.setItem(`ojt-lampiran-${weekKey}`, JSON.stringify(updated));
  }

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
    const weekdayPayload = weekDays.map((d) => ({
      hariTanggal: d.hariTanggal,
      activities: parseActivities(dayTexts[d.isoDate] || ""),
    }));

    const saturdayRaw = dayTexts[saturday.isoDate] || "";
    const saturdayPayload =
      saturdayRaw.trim().length > 0
        ? [{ hariTanggal: saturday.hariTanggal, activities: parseActivities(saturdayRaw) }]
        : [];

    const fullPayload = [...weekdayPayload, ...saturdayPayload];

    const emptyDays = weekdayPayload.filter((d) => d.activities.length === 0);
    if (emptyDays.length > 0) {
      setStatus(
        "⚠️ Ada hari yang belum diisi kegiatannya. Tetap akan dibuat sebagai baris kosong."
      );
    } else {
      setStatus("");
    }

    const lampiran = {
      performanceGap: parseBulletPoints(lampiranTexts.performanceGap),
      operationalFindings: parseBulletPoints(lampiranTexts.operationalFindings),
      businessOpportunity: parseBulletPoints(lampiranTexts.businessOpportunity),
    };

    const doc = generateWeekPdf(config, fullPayload, lampiran);
    const lastIso = saturdayPayload.length > 0 ? saturday.isoDate : weekDays[4].isoDate;
    const filename = `Lembar_Daily_OJT_${weekDays[0].isoDate}_sd_${lastIso}.pdf`;
    doc.save(filename);
    setStatus(
      "✅ PDF berhasil dibuat dan diunduh: " +
        filename +
        (saturdayPayload.length > 0 ? " (termasuk Sabtu)" : "") +
        "."
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
            Satu baris = satu nomor kegiatan. Kalau 1 kegiatan punya beberapa
            poin/paragraf, pisahkan pakai titik koma (<code style={styles.code}>;</code>),
            contoh: <code style={styles.code}>Briefing pagi | 1. Poin pertama; 2. Poin kedua</code>{" "}
            — tiap poin otomatis jadi baris baru (nomornya ikut apa yang Anda
            ketik sendiri, sistem tidak menambah nomor lagi).
            <br />
            Tanggal & paraf otomatis diatur sistem. Tinggi tiap baris kegiatan
            otomatis menyesuaikan isinya sendiri-sendiri (bukan dibagi rata) —
            kegiatan singkat dapat baris pendek, kegiatan dengan isi panjang
            dapat baris lebih tinggi, supaya semuanya muat rapi di 1 halaman.
          </p>

          {weekDays.map((d) => {
            const activities = parseActivities(dayTexts[d.isoDate] || "");
            const { fits, needed, available } = checkDayFit(activities);

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
                {activities.length > 0 && (
                  <div style={fits ? styles.limitHintOk : styles.limitHintWarn}>
                    {fits
                      ? `✓ ${activities.length} kegiatan hari ini muat rapi dalam 1 halaman.`
                      : `⚠️ ${activities.length} kegiatan hari ini kemungkinan sedikit melebihi 1 halaman (butuh ±${Math.round(
                          needed
                        )}mm, tersedia ±${Math.round(
                          available
                        )}mm). Pertimbangkan mempersingkat beberapa kegiatan/poin.`}
                  </div>
                )}
              </div>
            );
          })}

          {(() => {
            const satActivities = parseActivities(dayTexts[saturday.isoDate] || "");
            const { fits, needed, available } = checkDayFit(satActivities);
            const isFilled = (dayTexts[saturday.isoDate] || "").trim().length > 0;

            return (
              <div style={styles.optionalDayBlock}>
                <div style={styles.dayLabel}>
                  {saturday.hariTanggal}{" "}
                  <span style={styles.optionalTag}>(Opsional — kosongkan kalau tidak masuk)</span>
                </div>
                <textarea
                  style={styles.textarea}
                  rows={3}
                  placeholder="Kosongkan kalau tidak masuk hari Sabtu ini. Isi kalau masuk, format sama seperti hari lainnya."
                  value={dayTexts[saturday.isoDate] || ""}
                  onChange={(e) => updateDayText(saturday.isoDate, e.target.value)}
                />
                {isFilled && satActivities.length > 0 && (
                  <div style={fits ? styles.limitHintOk : styles.limitHintWarn}>
                    {fits
                      ? `✓ ${satActivities.length} kegiatan hari Sabtu muat rapi dalam 1 halaman.`
                      : `⚠️ Kemungkinan sedikit melebihi 1 halaman (butuh ±${Math.round(
                          needed
                        )}mm, tersedia ±${Math.round(available)}mm).`}
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Lampiran (opsional)</h2>
          <p style={styles.hint}>
            Ditambahkan sebagai 1 halaman ekstra di akhir PDF kalau salah satu
            kolom di bawah diisi. Satu baris = satu poin bullet. Kosongkan
            semua kalau minggu ini tidak perlu lampiran.
          </p>

          <div style={styles.dayBlock}>
            <div style={styles.dayLabel}>1. Performance Gap</div>
            <textarea
              style={styles.textarea}
              rows={3}
              placeholder={"Poin pertama\nPoin kedua"}
              value={lampiranTexts.performanceGap}
              onChange={(e) => updateLampiranText("performanceGap", e.target.value)}
            />
          </div>

          <div style={styles.dayBlock}>
            <div style={styles.dayLabel}>2. Operational Findings</div>
            <textarea
              style={styles.textarea}
              rows={3}
              placeholder={"Poin pertama\nPoin kedua"}
              value={lampiranTexts.operationalFindings}
              onChange={(e) => updateLampiranText("operationalFindings", e.target.value)}
            />
          </div>

          <div style={styles.dayBlock}>
            <div style={styles.dayLabel}>3. Business Opportunity</div>
            <textarea
              style={styles.textarea}
              rows={3}
              placeholder={"Poin pertama\nPoin kedua"}
              value={lampiranTexts.businessOpportunity}
              onChange={(e) => updateLampiranText("businessOpportunity", e.target.value)}
            />
          </div>
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
  optionalDayBlock: {
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    border: "1px dashed #c9cfda",
    background: "#fafbfd",
  },
  optionalTag: {
    fontWeight: 500,
    color: "#9aa3b2",
    fontSize: 11.5,
  },
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
  limitHintOk: {
    fontSize: 11.5,
    color: "#3a7a4e",
    marginTop: 4,
  },
  limitHintWarn: {
    fontSize: 12,
    color: "#b3492e",
    marginTop: 4,
    lineHeight: 1.5,
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
