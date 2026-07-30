export const metadata = {
  title: "Generator Laporan Harian OJT",
  description: "Sistem otomatisasi Lembar Kegiatan Harian OJT - KC Cirebon",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
