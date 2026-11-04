// Initial data copied from the original Figma Make site.
// Used once to fill an empty Firestore database.

const judges = [
  ["Abdul Malik", "Top 5 Final", 1, true],
  ["Arwin Aprillio", "Audition", 1, true],
  ["Made Pesona Virnadhya", "Audition", 2, true],
  ["Alik Yuswanto", "Top 5 Final", 2, true],
  ["Cecilia Yunita", "Audition", 3, true],
  ["Antonius Chandra Ferijanto", "Top 5 Final", 3, true],
  ["Rachmat Ananto", "Audition", 4, true],
  ["Nyoman Kusuma Wardhani", "Top 5 Final", 4, true],
];

const performances = [
  ["P01", "Lomba Santet", "Band · Coming Soon", "Band", "Grup", "Divisi 12 — Software Development", "Estimasi 5-7", "I Nyoman Yogi Adi Wardana - Software", "Perwakilan Divisi", "Hendra|Software;Tedy|Software;Rama|Software;Putra|Software;Deva|Software;Dana|Software"],
  ["P02", "The Rongsok Connect", "Band & Fashion Show · The Rongsok Connect", "Lainnya", "Grup", "Divisi 06 — Warehouse", "–", "Ni Putu Adelia Diah Sawitri - Warehouse", "Perwakilan Divisi", "Nama member belum diisi|Warehouse"],
  ["P03", "Enkqi Ubay Abdillah", "Singing solo · Gala bunga matahari - Sal Priadi", "Singing / Vocal", "Individu", "Divisi 09 — Customer Technical Service", "1", "Kadek Sri Nopiani — Customer Technical Service", "Perwakilan Divisi", "Enkqi Ubay Abdillah|CTSO"],
  ["P04", "Vokalicious", "Band/Menyanyi · Rahasia", "Singing / Vocal", "Grup", "Divisi 14 — Legal, HC, Finance, L&D, Architecture", "5-10", "Surya - Legal", "Perwakilan Divisi", "Surya|Lintas fungsi;Regine|Lintas fungsi;Jeremi|Lintas fungsi;Anggi|Lintas fungsi;Ratu Ayu Felnindia Restuti Enriana|Lintas fungsi"],
  ["P05", "Kelompok Pemasangan Router", "Band Music · Akustik", "Band", "Grup", "Divisi 01 — Customer Maintenance", "4", "Oka Wiryatama Rizky Adiningrat - Customer Maintenance", "Perwakilan Divisi", "Oka Wiryatama R A|Customer Maintenance;M. Azka Nafi|Customer Maintenance;Efrain Solissa|Customer Maintenance;M. Ilham Pratama|Customer Maintenance"],
  ["P06", "K-POPUP", "Dance K-Pop · Bad by Ateez", "Dance", "Grup", "Divisi 03 — Fiber Optic Network Upgrading", "11 orang", "Niko Septian - FO Upgrading", "Perwakilan Divisi", "Niko|FO Upgrading;Daffa|FO Upgrading;Bayu|FO Upgrading;Eka|FO Upgrading;Robert|FO Upgrading;Adip|FO Upgrading;Haris|FO Upgrading;Galih|FO Upgrading;Ardika|FO Upgrading;Ridho|FO Upgrading;Rahman|FO Upgrading"],
  ["P07", "Sales Denpasar Utara", "Drama Musical · The Super Connection", "Theater / Acting", "Grup", "Divisi 13 — Sales Denpasar Utara", "12 orang", "RR Delima Ganarsih - Sales Denpasar Utara", "Perwakilan Divisi", "ALL Performance Denpasar Utara Team|Sales Denpasar Utara"],
  ["P08", "Saneb", "Menyanyi · Kasih putih", "Singing / Vocal", "Individu", "Divisi 04 — Fiber Optic Maintenance", "1", "Saneb Sadestiyan Foeh - FO Maintenance", "Perwakilan Divisi", "Saneb Sadestiyan Foeh|FO Maintenance"],
  ["P09", "Putu Darmawan", "Menyanyi · Menyanyi Solo", "Singing / Vocal", "Individu", "Divisi 08 — Sales Badung", "1", "Kadek Ayu Sri Waheni - Sales Badung", "Perwakilan Divisi", "Putu Darmawan|Sales Badung"],
  ["P10", "Lia Amelia", "Tari kreasi baru/klasik daerah · Tari Sri Ganyong", "Pertunjukan Tradisional", "Individu", "Divisi 11 — Network Administration & Network Operations", "1", "Lia Amelia - Network Administrator", "Perwakilan Divisi", "Lia Amelia|Network Administrator"],
  ["P11", "DIVISI INSTALASI", "LAGU DANCE · CAMPURAN", "Dance", "Grup", "Divisi 02 — Fiber Optic Customer Installation", "8", "ROBIN ANDREAS MELU KERAF - FO Cust Installation", "Perwakilan Divisi", "AGUSTO LEONARDI|FO Instalasi;ARDIAN DIDA|FO Instalasi;DERVINO|FO Instalasi;AGUS PRATAMA|FO Instalasi;QUSNUL KHOLIS|FO Instalasi;FAHRUL|FO Instalasi;SURIADA|FO Instalasi;ISHAK|FO Instalasi"],
  ["P12", "Collaboration to Connected (CoC)", "Band musik · 2 lagu (judul masih diskusi)", "Band", "Grup", "Kolaborasi Lintas Divisi", "5", "I Komang Gita Ariawan - Warehouse", "Kolaborasi Lintas Divisi", "I Komang Gita Ariawan|Lintas Divisi;Angga Rianto|Lintas Divisi;Stieve tri kusuma|Lintas Divisi;Efrain Solissa|Lintas Divisi;Oka Wiryatama R.A|Lintas Divisi"],
  ["P13", "Made Devayani Dinda Maristha", "Cover Song (Karaoke) · Karaoke", "Singing / Vocal", "Individu", "Penampilan Pribadi", "1", "Made Devayani Dinda Maristha - Software", "Penampilan Pribadi", "Made Devayani Dinda Maristha|Software"],
  ["P14", "GA Xtreme", "Dance · Tamang pung kisah", "Dance", "Grup", "Divisi 07 — General Affairs", "8 orang", "Angelina Lisa poro - GA", "Perwakilan Divisi", "Putusri laudri|General Affairs;Enjel laudry|General Affairs;Indah laudri|General Affairs;Angel cs|General Affairs;Lila kitchen|General Affairs;Nisa kitchen|General Affairs;Edison sopir|General Affairs;Puput kitchen|General Affairs"],
  ["P15", "Angga", "Menyanyi sambil bermain gitar · My Love - Westlife", "Singing / Vocal", "Individu", "Penampilan Pribadi", "1", "Putu Angga Suputra - Instalasi", "Penampilan Pribadi", "Putu Angga Suputra|FO Instalasi"],
  ["P16", "TBC", "TBC · TBC", "Dance", "Grup", "Divisi 05 — Customer Service", "est 25", "Natasha Kenza Wibowo - Customer Service Officer", "Perwakilan Divisi", "Natasha Kenza Wibowo|Customer Service"],
  ["P17", "SANDIKA", "Tarian Dayak · Tarian Mandau", "Pertunjukan Tradisional", "Individu", "Penampilan Pribadi", "Satu", "SANDIKA - Pribadi", "Penampilan Pribadi", "Sandika|Warehouse"],
  ["P18", "Berani Tampil", "PADUS · Siswa Siswi Densel", "Singing / Vocal", "Grup", "Divisi 10 — Sales Denpasar Selatan", "22 orang", "Prianus Vicky - Sales Denpasar Selatan", "Perwakilan Divisi", "Prianus Vicky|Sales Denpasar Selatan;Richard teesen|Sales Denpasar Selatan;Ni made ayu Indah lestari|Sales Denpasar Selatan;Fatkhan irfansyah amaith|Sales Denpasar Selatan;Tidar Yani|Sales Denpasar Selatan;Rosni|Sales Denpasar Selatan;Veri Aditiya Pratama|Sales Denpasar Selatan;Syailendra Agung Wicaksono|Sales Denpasar Selatan;Ni Nengah Ariyani|Sales Denpasar Selatan;Jessica niken savitri|Sales Denpasar Selatan;Widhi yasa|Sales Denpasar Selatan;Luh Risma Satriani|Sales Denpasar Selatan;Moch Uky Asni Faizin|Sales Denpasar Selatan;Muhammad Audrey Ilham Ramadhan|Sales Denpasar Selatan;Gede Sarga Dipayana|Sales Denpasar Selatan;alda amilia|Sales Denpasar Selatan;Vira Deswita|Sales Denpasar Selatan;Kaon Bili Hasegawa|Sales Denpasar Selatan"],
  ["P19", "Sakoneksi Band", "Nyanyi full band · Pupus Dewa 19", "Band", "Grup", "Kolaborasi Lintas Divisi", "4 orang", "Roro Delima - Lintas Divisi", "Kolaborasi Lintas Divisi", "Efrain|;Oka|;Muqlis|;Delima|"],
  ["P20", "Maha Putra", "Tarian tradisional Bali · Tari Baris Tunggal", "Pertunjukan Tradisional", "Individu", "Divisi 07 — General Affairs", "1", "I putu putra asmara - General Affair", "Perwakilan Divisi", "I putu putra asmara|General Affairs"],
];

export const SEED_JUDGES = judges.map(([name, stage, sortOrder, active], i) => ({
  id: `judge-${String(i + 1).padStart(2, "0")}`,
  name,
  stage,
  sortOrder,
  active,
}));

export const SEED_PERFORMANCES = performances.map(
  ([code, name, title, category, format, division, performerCount, pic, registrationType, people]) => ({
    id: code.toLowerCase(),
    code,
    name,
    title,
    category,
    format,
    division,
    performerCount,
    pic,
    registrationType,
    performers: people.split(";").map((p) => {
      const [n, d] = p.split("|");
      return { name: n, division: d || null };
    }),
  })
);
