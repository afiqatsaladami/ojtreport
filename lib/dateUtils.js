// Utility untuk menghasilkan 5 hari kerja (Senin-Jumat) dalam format Bahasa Indonesia

const HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Menerima string tanggal (YYYY-MM-DD) apa saja dalam satu minggu,
// mengembalikan objek Date untuk hari Senin di minggu yang sama.
export function getMondayOfWeek(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay(); // 0 = Minggu, 1 = Senin, ...
  const diff = day === 0 ? -6 : 1 - day; // geser ke Senin
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday;
}

export function formatTanggalIndo(date) {
  return `${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatHariTanggal(date) {
  const hari = HARI[date.getDay()];
  return `${hari}/${formatTanggalIndo(date)}`;
}

// Mengembalikan array 5 hari kerja (Senin s.d Jumat) dari sebuah tanggal
// yang berada dalam minggu tersebut.
export function getWorkweekDays(anyDateInWeekStr) {
  const monday = getMondayOfWeek(anyDateInWeekStr);
  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      date: d,
      isoDate: d.toISOString().slice(0, 10),
      hariTanggal: formatHariTanggal(d),
      namaHari: HARI[d.getDay()],
    });
  }
  return days;
}

export function getWeekLabel(anyDateInWeekStr) {
  const monday = getMondayOfWeek(anyDateInWeekStr);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return `${formatTanggalIndo(monday)} - ${formatTanggalIndo(friday)}`;
}

// Mengembalikan info hari Sabtu di minggu yang sama (untuk kasus opsional
// masuk di hari Sabtu — tidak selalu ada, jadi dipisah dari getWorkweekDays).
export function getSaturday(anyDateInWeekStr) {
  const monday = getMondayOfWeek(anyDateInWeekStr);
  const sat = new Date(monday);
  sat.setDate(monday.getDate() + 5);
  return {
    date: sat,
    isoDate: sat.toISOString().slice(0, 10),
    hariTanggal: formatHariTanggal(sat),
    namaHari: HARI[sat.getDay()],
  };
}
