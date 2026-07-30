# Generator Laporan Harian OJT (KC Cirebon)

Web app sederhana untuk membuat **Lembar Kegiatan Harian OJT** otomatis dalam format PDF,
mengikuti tema/desain dari file PPTX yang sudah ada. Setiap minggu Anda hanya perlu
mengisi kegiatan — tanggal, hari, nama, lokasi, dan mentor otomatis terisi.

## Cara Pakai

1. Buka aplikasi (setelah deploy ke Vercel, atau jalankan lokal dengan `npm run dev`).
2. Pilih tanggal apa saja dalam minggu berjalan → sistem otomatis menampilkan Senin-Jumat.
3. Isi kegiatan tiap hari di kotak teks, **satu baris = satu kegiatan**, dengan format:
   ```
   Nama Kegiatan | Critical point pembelajaran
   ```
   Contoh:
   ```
   Briefing Pagi | Diskusi target harian bersama mentor
   Observasi Customer Service | Memahami alur layanan nasabah
   ```
4. Klik **Download PDF Minggu Ini** → PDF berisi 5 halaman (Senin–Jumat) otomatis terunduh,
   dengan tabel No / Kegiatan / Critical Point / Paraf-Ttd Mentor (paraf hanya 1 kolom
   digabung per hari, siap ditandatangani mentor).
5. Data tetap (nama, lokasi, mentor) sudah terisi default sesuai data Anda, tapi bisa
   diubah lewat tombol **"Ubah data tetap"** bila suatu saat berubah — akan tersimpan
   otomatis di browser untuk minggu-minggu berikutnya.

Isian kegiatan per minggu juga otomatis tersimpan di browser (localStorage) sehingga
tidak hilang saat halaman di-refresh.

## Deploy ke Vercel

### Opsi A — Tanpa install apapun (termudah)
1. Upload seluruh folder project ini ke sebuah repository GitHub baru.
2. Buka https://vercel.com → **Add New Project** → Import repository tersebut.
3. Framework Preset akan otomatis terdeteksi sebagai **Next.js**. Klik **Deploy**.
4. Setelah selesai, Anda akan mendapat URL seperti `https://nama-project.vercel.app`.

### Opsi B — Lewat Vercel CLI
```bash
npm install -g vercel
cd ojt-report
vercel
```
Ikuti instruksi di terminal (login, pilih scope, dsb), lalu jalankan `vercel --prod`
untuk deploy ke production.

## Menjalankan secara lokal (opsional, untuk uji coba dulu)
```bash
npm install
npm run dev
```
Buka http://localhost:3000

## Struktur Project
```
ojt-report/
├── app/
│   ├── layout.js       # Layout dasar Next.js
│   └── page.js         # Halaman utama (form input + tombol download)
├── lib/
│   ├── dateUtils.js     # Logika hari/tanggal Bahasa Indonesia
│   └── pdfGenerator.js  # Logika pembuatan PDF (desain tabel, warna, dsb)
├── package.json
└── next.config.js
```

## Kustomisasi lanjut
- Warna tema (navy & gold) diatur di bagian atas `lib/pdfGenerator.js` (variabel `NAVY`, `GOLD`).
- Jika ingin logo perusahaan ditambahkan di header PDF, bisa ditambahkan dengan
  `doc.addImage(...)` di fungsi `drawHeader` pada file yang sama.
