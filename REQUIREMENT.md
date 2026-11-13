# Product Requirements Document (PRD) & Spesifikasi Fitur
## LifeSync Wellness Platform

> **Versi Dokumen:** 1.2.0  
> **Terakhir Diperbarui:** 13 November 2026  
> **Status:** Active / Production Ready  
> **Slogan:** *"Your life, in better balance."*  
> **Pernyataan Penafian (Disclaimer):** LifeSync Wellness adalah platform manajemen gaya hidup dan kebugaran digital sirkadian, **bukan** perangkat lunak diagnosa medis klinis.

---

## 1. Visi & Tujuan Produk

**LifeSync Wellness Platform** dirancang sebagai ekosistem digital terpadu (*all-in-one platform*) yang membantu pengguna menata ritme hidup 24 jam secara sadar, seimbang, dan berkelanjutan. 

Berbeda dengan aplikasi pelacak kebiasaan yang berfokus pada kompetisi sosial atau metrik yang memicu kecemasan, LifeSync mengusung prinsip **Sanctuary Flow**:
1. **Holistik 24 Jam**: Mengintegrasikan waktu istirahat, produktivitas, nutrisi, hidrasi, dan pergerakan fisik dalam satu garis waktu sirkadian yang utuh.
2. **Bebas Komparasi Toksik (*No Toxic Comparison*)**: Tidak ada papan peringkat publik (*leaderboards*) yang memicu stres; fokus 100% pada progres dan harmoni personal pengguna.
3. **Kombinasi On-Device AI & Cloud Sync**: Kemampuan deteksi gerak dengan AI lokal, sensor langkah perangkat, integrasi basis data nutrisi internasional, serta sinkronisasi data cloud yang aman.

---

## 2. Arsitektur Teknologi & Platform

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        LifeSync Architecture                           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
      ┌────────────────────────────┼───────────────────────────┐
      ▼                            ▼                           ▼
┌──────────────┐          ┌────────────────┐         ┌──────────────────┐
│ Apps: Mobile │          │   Apps: Web    │         │    Apps: API     │
│ Flutter 3.50 │          │  Next.js 15    │         │  Bun + Express   │
│ Riverpod/Dio │          │ React 19/Tailw │         │ Better Auth/Zod  │
└──────┬───────┘          └────────┬───────┘         └─────────┬────────┘
       │                           │                           │
       │     REST API / HTTPS      │                           │
       └───────────────────────────┴───────────────────────────┤
                                                               ▼
                                                    ┌────────────────────┐
                                                    │   Packages: DB     │
                                                    │ Drizzle ORM + Neon │
                                                    │ PostgreSQL Cloud   │
                                                    └────────────────────┘
```

| Komponen | Teknologi Utama | Peran & Tanggung Jawab |
|---|---|---|
| **Mobile App (`apps/mobile`)** | Flutter 3.50, Dart 3.7, Riverpod, Dio, GoRouter, ML Kit, Camera, Pedometer, fl_chart | Aplikasi klien utama pada Android & iOS dengan kemampuan offline-first, live sensors, dan AI pose counter. |
| **Web Frontend (`apps/web`)** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide | Portal web untuk visualisasi sirkadian layar lebar dan konsol administrasi (`/admin`). |
| **Backend API (`apps/api`)** | Bun, Express.js 4, Better Auth, Zod, Brevo Mail Relay | Layanan REST API terpusat, otentikasi session/cookie, otorisasi RBAC, dan validasi skema data. |
| **Database (`packages/db`)** | Neon Serverless PostgreSQL, Drizzle ORM | Penyimpanan data relasional terpusat dengan 13 tabel ternormalisasi dan migrasi otomatis. |
| **Shared Lib (`packages/shared`)** | TypeScript, Zod | Skema validasi bersama, tipe data, dan konstanta aturan bisnis lintas platform. |

---

## 3. Spesifikasi Fungsional Fitur (Feature Requirements)

### Modul 1: Otentikasi, Profil & Keamanan (Authentication & Profile)

* **Registrasi & Masuk Akun**:
  * Registrasi akun menggunakan Email dan Password aman.
  * Verifikasi email berbasis **Kode OTP 5 Digit** yang dikirimkan via SMTP Brevo ke inbox pengguna.
  * Dukungan sesi aman berbasis cookie HTTP-only dan Bearer token sync untuk mobile.
* **Role-Based Access Control (RBAC)**:
  * Pemisahan hak akses antara `USER` biasa dan `ADMIN`.
  * Proteksi route backend `/api/admin/*` dan halaman web `/admin`.
* **Pengaturan Sasaran Personal (Personal Wellness Goals)**:
  * Target Durasi Tidur Harian (default: 480 menit / 8 jam).
  * Target Asupan Air Minum Harian (default: 2.500 ml).
  * Target Aktivitas Fisik / Olahraga Harian (default: 45 menit).
  * Target Langkah Kaki Harian (default: 10.000 langkah).
  * Target Kalori Harian (default: 2.000 kkal, dapat dikustomisasi antara 500 - 10.000 kkal).
  * Pengaturan jam bangun & tidur ideal (*Target Wake/Sleep Time*).

---

### Modul 2: Beranda Keseimbangan Sirkadian (Daily Balance Dashboard)

* **Skor Keseimbangan Harian (*Daily Balance Score* 0–100)**:
  * Algoritma penilai keharmonisan hari berdasarkan 4 pilar utama:
    $$\text{Skor} = (30\% \times \text{Tidur}) + (25\% \times \text{Olahraga}) + (20\% \times \text{Hidrasi}) + (25\% \times \text{Jadwal Rutin})$$
* **Diagram Cincin Sirkadian 24 Jam (*Circadian Ring Chart*)**:
  * Donut chart interaktif yang memetakan aktivitas harian dalam 24 jam dengan kode warna kategori visual.
* **Kartu Metrik Interaktif Cepat (*Quick Vitals Bottom Sheets*)**:
  * **Tidur Semalam**: Ketuk kartu untuk mengatur jam tidur & kualitas tidur (slider cepat).
  * **Hidrasi Air**: Tombol cepat penambah air (+250 ml sekali tap) dan form pencatatan akurat.
  * **Aktivitas Fisik**: Mengatur durasi gerak harian dan melihat akumulasi langkah.
  * **Check-in Mood & Energi**: Pilihan 8 kondisi emosi (*Peaceful, Motivated, Calm, Focused, Vibrant, Steady, Fatigued, Restless*) dan slider energi (1-100%).
* **Latihan Pernapasan Relaksasi 1 Menit (*Box Breathing Exercise*)**:
  * Dialog modal pemandu pernapasan visual dengan siklus 4 detik Tarik Napas, 4 detik Tahan, 4 detik Hembuskan, 4 detik Tahan (*Box Breathing 4-4-4-4*).
* **Daftar Kebiasaan Harian (*Habit Checklist*)**:
  * 5 target esensial harian otomatis tercentang saat log terpenuhi (Tidur tercapai, Hidrasi $\ge 70\%$, Aktivitas $\ge 20$ menit, Jadwal $\ge 8$ jam teralokasi, Mood tercatat).
* **Tips Kesehatan Harian (*Daily Wellness Tips*)**:
  * Rekomendasi kontekstual yang dikurasi oleh administrator.

---

### Modul 3: Perencana Rutinitas Sirkadian 24 Jam (*24-Hour Continuous Planner*)

* **Pita Garis Waktu Sirkadian (*Continuous Circadian Ribbon Bar*)**:
  * Pita visual garis waktu kontinu dari 00:00 hingga 24:00.
  * Garis penanda waktu real-time (*Live Time Marker*) yang bergerak sesuai jam saat ini.
* **Manajemen Blok Aktivitas**:
  * Menambah jadwal dengan memilih kategori (Tidur, Bekerja, Belajar, Olahraga, Makan, Perjalanan, Hiburan, Waktu Pribadi, Istirahat, Lainnya).
  * Dukungan aktivitas menembus tengah malam (*Midnight-Crossing Activity*, misal: Tidur 22:30 s/d 06:30 keesokan harinya).
  * Pencegahan blok tumpang tindih (*Schedule Overlap Prevention*) dengan validasi real-time.
  * Fitur **Bagi Blok (*Split Activity*)** menjadi dua segmen waktu.
* **Template Cepat 1-Klik (*Routine Presets*)**:
  * *Salin Kemarin*: Menggandakan seluruh alokasi jadwal dari hari sebelumnya.
  * *Hari Kerja*: Template instan untuk rutinitas kerja produktif.
  * *Akhir Pekan*: Template instan untuk pemulihan dan rekreasi santai.
* **Deteksi Celah Waktu Kosong (*Gap Filler*)**:
  * Mendeteksi otomatis slot waktu kosong berdurasi $\ge 30$ menit dan menyediakan tombol satu-ketuk untuk menjadwalkannya.

---

### Modul 4: AI Smart Fitness & Sensor Gerak (AI Movement & Fitness)

* **AI Push-Up Counter (Deteksi Pose Kamera Cerdas)**:
  * Menggunakan **Google ML Kit Pose Detection** lokal di perangkat (*Edge AI*, privasi terjaga tanpa streaming video ke server).
  * **Algoritma Debouncing & Anti-Kamera Goyang**:
    * Mengunci orientasi sensor kamera tegak lurus (*upright native sensor*).
    * Penghalusan multi-frame (*multi-frame smoothing*) untuk membuang false positive.
    * Memerlukan kondisi minimal 100 ms pada posisi bawah (*DOWN threshold $\le 110^\circ$*) sebelum boleh naik.
    * Posisi atas (*UP threshold $\ge 142^\circ$*) dengan batas minimum repetisi 650 ms per rep agar gerakan ayunan kamera tidak terhitung.
  * Indikator kedalaman visual (*Live Depth Meter & Rep Counter*).
  * Pengaturan tingkat sensitivitas (*Ketat / Standar / Ramah Pemula*).
  * Sistem pencatat rentetan harian (*Push-Up Daily Streak*) dan rekor repetisi terbaik.
* **Sensor Langkah Kaki Real-Time (*Live Step Counter*)**:
  * Terintegrasi dengan sensor pedometer hardware Android/iOS.
  * Mendeteksi status pejalan kaki (*walking*, *stationary*).
  * Tombol sinkronisasi manual dan otomatis ke log kebugaran harian.

---

### Modul 5: Pelacak Kalori & Nutrisi Seimbang (Calorie & Nutrition Tracker)

* **Pencarian Makanan Hybrid (3-Tier Search)**:
  1. **Katalog Cepat Nusantara (Offline, 40+ Menu Khas)**:
     * Menyediakan data instan untuk makanan pokok dan warung lokal (Nasi Putih, Nasi Merah, Nasi Uduk, Dada Ayam, Ikan Bakar, Telur Dadar/Rebus, Tempe/Tahu, Rendang, Soto, Bakso, Gado-Gado, Martabak, Es Teh Manis, Kopi Susu, Pisang, Apel, dll.).
     * Akses 100% cepat tanpa kuota dan tanpa nunggu server.
  2. **Open Food Facts API Live Search**:
     * Terkoneksi ke basis data global & portal Indonesia (`id.openfoodfacts.net`).
     * Mencakup ratusan ribu produk kemasan, biskuit, susu kotak, dan camilan supermarket dengan header resmi browser.
  3. **Input Manual Makanan Kustom**:
     * Form fleksibel bagi pengguna untuk mendaftarkan resep atau makanan rumahan buatan sendiri (Nama, Brand, Kalori, Protein, Karbohidrat, Lemak, Satuan Porsi).
* **Manajemen 4 Sesi Waktu Makan**:
  * Dibagi menjadi **Sarapan (*Breakfast*)**, **Makan Siang (*Lunch*)**, **Makan Malam (*Dinner*)**, dan **Camilan (*Snack*)**.
* **Pengganda Porsi Instan (*Portion Stepper*)**:
  * Pilihan porsi praktis dengan rasio `0.5x`, `1.0x`, `1.5x`, dan `2.0x` sebelum menambahkan menu.
* **Distribusi Makronutrisi Bertingkat (*Macro Progress Bar*)**:
  * Visualisasi bar proporsional untuk asupan **Protein**, **Karbohidrat**, dan **Lemak** harian.
* **Target Kalori Harian Dinamis**:
  * Dapat disesuaikan sewaktu-waktu melalui dialog target dengan chip cepat (1800, 2000, 2200, 2500 kkal).
* **Arsitektur Offline-First & Cloud Sync**:
  * Saat online: Data tersinkronisasi otomatis ke database cloud Neon PostgreSQL (`meal_logs`, `custom_foods`).
  * Saat offline: Data tersimpan persisten di `SharedPreferences` perangkat, sehingga UI tetap responsif dan tidak kehilangan riwayat makan.

---

### Modul 6: Wawasan Tren & Riwayat (Insights & Analytics)

* **Grafik Tren Tidur 7 Hari (*Sleep Duration Trend*)**:
  * Visualisasi diagram batang/garis interaktif menggunakan `fl_chart` (mobile) dan `Recharts` (web).
* **Ringkasan Kualitas Tidur & Pemulihan**:
  * Menghitung rata-rata jam tidur mingguan dan persentase ketercapaian target.
* **Observasi Gaya Hidup Otomatis**:
  * Rekomendasi pintar saat pola tidur bergeser atau hidrasi berada di bawah batas normal.

---

### Modul 7: Portal Web & Konsol Administrasi (Web & Admin Console)

* **Dashboard Web Responsif**:
  * Visualisasi sirkadian layar lebar, diagram cincin 24 jam, dan timeline interaktif.
* **Konsol Administrasi (`/admin`)**:
  * **Tata Kelola Pengguna (*User Management*)**: Melihat daftar pengguna, status verifikasi, role, serta hak blokir (*ban/unban*).
  * **Katalog Kategori Aktivitas**: Menambah atau menyunting kategori aktivitas sistem (*system activity categories*).
  * **Kurasi Tips Kesehatan**: Menerbitkan dan mengelola tips sirkadian harian yang tampil pada beranda pengguna.

---

## 4. Skema Basis Data PostgreSQL (Data Model)

Terdapat **13 tabel ternormalisasi** yang dikelola melalui **Drizzle ORM** pada **Neon PostgreSQL**:

| Nama Tabel | Deskripsi & Entitas yang Dikelola |
|---|---|
| `user` | Data pengguna utama, email, nama, hashed password, role (`USER` / `ADMIN`), dan status banned. |
| `session` | Token sesi aktif, IP address, user agent, dan masa berlaku sesi. |
| `account` | Kredensial otentikasi akun dan integrasi OAuth. |
| `verification` | Token verifikasi email dan verifikasi kode OTP 5 digit. |
| `profile` | Profil kebugaran 1:1, target tidur, air, langkah, olahraga, jam bangun/tidur, dan target kalori (`daily_calorie_goal`). |
| `activities` | Kategori aktivitas sistem dan kustom milik pengguna (warna, icon, slug, target durasi). |
| `daily_schedules` | Blok jadwal sirkadian 24 jam (`date`, `start_time`, `end_time`, `duration_minutes`, `crosses_midnight`). |
| `health_logs` | Konsolidasi catatan harian (durasi tidur, kualitas, olahraga, langkah kaki, air, mood, energi, detak jantung). |
| `daily_checkins` | Catatan refleksi mikro harian (mood, energi, dan catatan refleksi). |
| `water_logs` | Log asupan air minum individual beserta stempel waktu (`amount_ml`, `logged_at`). |
| `health_tips` | Artikel mikro dan tips sirkadian kurasi admin (`title`, `category`, `content`, `icon`, `is_active`). |
| `meal_logs` | Catatan konsumsi makanan harian per sesi makan beserta rincian kalori & makronutrisi. |
| `custom_foods` | Katalog makanan kustom dan resep rumahan yang didaftarkan oleh pengguna. |

---

## 5. Kebutuhan Non-Fungsional (Non-Functional Requirements)

1. **Keamanan & Privasi (Security & Privacy)**:
   - Seluruh endpoint privat diwajibkan melewati middleware `requireAuth`.
   - Data antar pengguna diisolasi secara ketat (*Tenant Data Isolation*); pengguna dilarang mengakses, mengubah, atau menghapus rekaman milik pengguna lain.
   - Deteksi pose AI push-up dijalankan 100% lokal di CPU/NPU ponsel tanpa rekaman video yang dikirim ke server.
   - Validasi skema input menyeluruh menggunakan **Zod** untuk menolak payload berbahaya.
2. **Performa & Ketersediaan (Performance & Availability)**:
   - Arsitektur *Offline-First* memastikan fitur esensial (Pencatatan Makanan Nusantara, AI Push-up, Timer Napas, Habit Checklist) dapat dibuka instan meski perangkat berada dalam mode pesawat (*airplane mode*).
   - Indeks database pada kunci relasi `(user_id, date)` untuk performa kueri $< 50\text{ ms}$.
   - Waktu build APK debug efisien (~27–42 detik).
3. **Desain Sistem & Identitas Visual (*Sanctuary Flow*)**:
   - Palet warna menenangkan:
     - *Primary Forest Green*: `#0D7A53`
     - *Deep Forest*: `#005F3F`
     - *Soft Sage / Accent*: `#BEE9D4` / `#3F6656`
     - *Surface & Canvas*: `#FFFFFF` / `#F7FAF8`
   - Tipografi: *Plus Jakarta Sans* untuk judul dan angka metrik, *Inter* untuk teks bacaan mikro.

---

## 6. Rencana Pengembangan Selanjutnya (Future Roadmap)

* [ ] **AI Photo Calorie Recognition (Tahap 2 Nutrisi)**: Pengenalan foto piring makanan otomatis menggunakan Google Gemini Vision AI.
* [ ] **Integrasi Smartwatch / Health Connect**: Sinkronisasi dua arah dengan Apple HealthKit dan Google Health Connect.
* [ ] **Widget Layar Utama (Home Screen Widgets)**: Widget Android & iOS untuk melihat sisa kalori, langkah kaki, dan timer sirkadian tanpa membuka aplikasi.
* [ ] **Pemberitahuan Dorong Cerdas (*Smart Push Notifications*)**: Notifikasi ramah sirkadian untuk pengingat hidrasi dan pengingat angin-down 30 menit sebelum jadwal tidur.

---

*Dokumen ini merupakan acuan resmi spesifikasi kebutuhan dan fitur LifeSync Wellness Platform.*

