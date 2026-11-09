# Standar Wajib Agent
1. UI/Frontend: Dilarang memakai template AI pasaran (gradien ungu-biru standar). Gunakan gaya editorial modern, Bento grid asimetris, tipografi kontras tegas, border halus 1px, serta micro-interactions yang mulus.
2. Backend & Logika: Gunakan TypeScript strict (tanpa tipe any), validasi skema Zod di semua input API, pisahkan layer Controller-Service-Repository, dan tangani semua edge cases (error state, loading state, race condition).
3. Eksekusi Otomatis: Selalu gunakan Context7 MCP untuk cek dokumentasi terbaru dan uji tampilan dengan Playwright/Browser sebelum menyatakan tugas selesai.
4. Integritas Multi-Aktor & Audit Trail: Dilarang keras melakukan hardcoding identitas aktor (misal "Budi Pratama" atau "Hendra Gunawan") pada timeline/riwayat tiket. Setiap aksi WAJIB membaca profil dinamis aktor yang sedang aktif. Hubungan atasan-bawahan harus terisolasi presisi per pengguna dan tidak boleh bocor hanya karena kesamaan departemen.
5. Pemisahan Domain Pelacakan vs Riwayat & Visualisasi Metrik:
   - Menu "Pelacakan" (Pos Jaga maupun Atasan) HANYA menampilkan izin berstatus AKTIF/BERJALAN. Tiket dengan status final (Selesai, Ditolak, Dibatalkan, Kedaluwarsa) secara ketat HANYA berada di menu "Riwayat".
   - Donut Chart metrik karyawan strictly 2 kategori (Total Izin Biasa vs Izin Darurat, tanpa irisan kuning) dan WAJIB menyertakan legenda kuantitatif (angka riil + persentase) dengan penanganan hover bebas efek macet (anti-stuck).
6. Ketahanan Multi-Aktor & Siklus Hidup Akun (Account Lifecycle & Null-Safety):
   - Dilarang mengosongkan referensi aktor global (`window.ACTORS.*`) menjadi `null` saat akun dihapus atau dicabut. Wajib selalu menyediakan fallback objek aman atau mengalihkan ke pejabat aktif berikutnya untuk mencegah TypeError.
   - Pencabutan/penghapusan akun atasan wajib merekonsiliasi tiket antrean berjalan (tidak boleh membiarkan tiket berstatus 'Menunggu Persetujuan' menjadi yatim tanpa peninjau).
7. Resolusi Target Notifikasi & Konsistensi Skema Riwayat:
   - Pengiriman notifikasi wajib mencari NIP penerima secara dinamis dari master data pengguna (`MOCK_USERS` / akun aktif), dilarang menggunakan pengujian biner statis yang mengabaikan pejabat baru.
   - Seluruh pencatatan jejak audit (audit trail) wajib konsisten menulis ke properti `t.timeline`.


# GLOBAL RULES — ANTIGRAVITY AI AGENT

## Standar Operasional, Pengembangan, Integritas Data, dan Validasi

Aturan ini WAJIB dipatuhi oleh Agent pada setiap proyek dan setiap instruksi pengguna. Prioritaskan ketepatan instruksi, integritas kode, keamanan data, konsistensi sistem, dan kualitas hasil akhir.

---

# 1. INSTRUCTION FOLLOWING & PROJECT AWARENESS

1. Baca dan pahami seluruh prompt pengguna sebelum melakukan tindakan.
2. Ikuti instruksi pengguna secara tepat. Jangan mengubah konsep, alur, desain, atau kebutuhan tanpa izin.
3. Jangan membuat asumsi terhadap kebutuhan yang belum dijelaskan.
4. Jika instruksi ambigu atau terdapat beberapa kemungkinan implementasi, tanyakan klarifikasi sebelum melakukan perubahan besar.
5. Jangan menambahkan fitur yang tidak diminta.
6. Selalu periksa struktur folder, file, dependensi, database, dan arsitektur proyek sebelum mengubah kode.
7. Gunakan pola penulisan dan struktur yang sudah diterapkan dalam proyek.
8. Pertahankan seluruh fungsi yang sudah berjalan.
9. Jangan menghapus, mengganti, atau menulis ulang kode yang tidak berkaitan dengan permintaan pengguna.
10. Jangan melakukan refactoring besar tanpa alasan teknis yang jelas atau persetujuan pengguna.

# 2. UI/FRONTEND DESIGN STANDARDS

1. Dilarang menggunakan desain template AI pasaran, khususnya gradien ungu-biru standar.
2. Gunakan pendekatan desain editorial modern.
3. Terapkan Bento Grid asimetris apabila sesuai dengan kebutuhan layout.
4. Gunakan tipografi dengan kontras yang tegas dan hierarki visual yang jelas.
5. Gunakan border halus 1px, spacing konsisten, dan komposisi layout yang rapi.
6. Terapkan micro-interactions yang halus dan responsif.
7. Pastikan seluruh halaman responsive pada desktop, tablet, dan mobile.
8. Perhatikan konsistensi warna, ikon, tombol, komponen, dan jarak antar-elemen.
9. Jangan mengubah desain halaman lain jika pengguna hanya meminta perubahan pada satu halaman.
10. Pertahankan identitas visual dan design system yang sudah ada.
11. Setiap komponen wajib memiliki kondisi loading, empty state, error state, dan success state apabila relevan.
12. Jangan mengorbankan usability hanya demi tampilan visual.

# 3. BACKEND & PROGRAMMING STANDARDS

1. Gunakan TypeScript strict apabila proyek menggunakan TypeScript.
2. Dilarang menggunakan tipe `any`. Gunakan tipe eksplisit, generics, atau `unknown` dengan type narrowing.
3. Gunakan validasi skema Zod pada seluruh input API yang relevan, termasuk request body, query, dan parameter.
4. Pisahkan tanggung jawab kode menggunakan arsitektur:
   - Controller: menerima dan mengatur request/response.
   - Service: menjalankan business logic.
   - Repository: mengelola akses dan manipulasi data.
5. Jangan mencampurkan business logic ke dalam komponen UI.
6. Terapkan error handling secara konsisten.
7. Tangani edge cases, termasuk:
   - Data kosong atau null.
   - Data tidak ditemukan.
   - Request gagal.
   - Koneksi terputus.
   - Duplicate request.
   - Race condition.
   - Invalid input.
   - Unauthorized access.
   - Concurrent updates.
8. Hindari duplikasi fungsi dan kode yang tidak diperlukan.
9. Gunakan reusable components dan reusable services jika memang diperlukan.
10. Jangan menambahkan dependensi baru tanpa alasan yang jelas.
11. Jangan melakukan hardcoding terhadap data dinamis.
12. Pertahankan kompatibilitas dengan struktur database dan sistem yang sudah berjalan.

# 4. DOCUMENTATION & AUTOMATED TESTING

1. WAJIB menggunakan Context7 MCP untuk memeriksa dokumentasi terbaru sebelum mengimplementasikan library, framework, API, atau dependensi yang relevan.
2. Jangan mengarang penggunaan fungsi, properti, atau API yang belum diverifikasi.
3. Gunakan Playwright atau Browser untuk menguji hasil implementasi.
4. Lakukan pengujian tampilan pada halaman yang mengalami perubahan.
5. Verifikasi interaksi tombol, form, modal, navigasi, filter, dan komponen lainnya.
6. Jalankan test, lint, type-check, dan build apabila tersedia dalam proyek.
7. Periksa console error dan network error apabila memungkinkan.
8. Periksa kembali apakah fitur lama masih berjalan setelah perubahan.
9. Jangan menyatakan pekerjaan selesai apabila pengujian belum dilakukan.
10. Jika Context7 MCP, Playwright, atau Browser tidak tersedia, jelaskan keterbatasannya. Jangan mengklaim telah menjalankan pengujian yang sebenarnya tidak dilakukan.

# 5. EXECUTION WORKFLOW

Untuk setiap tugas, gunakan alur kerja berikut:

### A. ANALYSIS

- Baca instruksi pengguna.
- Periksa struktur proyek.
- Identifikasi file dan fungsi yang berkaitan.
- Periksa dependensi dan kemungkinan dampak perubahan.
- Identifikasi risiko dan edge cases.

### B. PLANNING

- Buat rencana singkat untuk pekerjaan kompleks.
- Tentukan file yang akan dibuat atau diubah.
- Pastikan rencana sesuai dengan kebutuhan pengguna.
- Jangan mengubah scope pekerjaan.

### C. IMPLEMENTATION

- Kerjakan perubahan secara bertahap.
- Ubah hanya file yang relevan.
- Pertahankan fungsi lama.
- Gunakan komponen dan fungsi yang sudah tersedia apabila memungkinkan.

### D. VALIDATION

- Periksa hasil implementasi.
- Jalankan test dan type-check.
- Uji tampilan menggunakan Playwright/Browser.
- Periksa error dan kemungkinan regresi.

### E. REPORTING

- Jelaskan pekerjaan yang sudah dilakukan.
- Sebutkan file yang dibuat atau dimodifikasi.
- Jelaskan hasil pengujian.
- Laporkan kendala atau pekerjaan yang belum selesai.

Untuk tugas sederhana, eksekusi langsung tanpa membuat proses perencanaan yang berlebihan.

# 6. MULTI-ACTOR INTEGRITY & AUDIT TRAIL

1. Dilarang keras melakukan hardcoding identitas aktor pada timeline, riwayat tiket, aktivitas, maupun audit trail.
2. Contoh identitas statis yang dilarang: "Budi Pratama", "Hendra Gunawan", atau nama pejabat tertentu lainnya.
3. Setiap aktivitas wajib membaca identitas dan profil aktor secara dinamis berdasarkan pengguna yang sedang login.
4. Gunakan sumber data autentikasi atau session aktif sebagai sumber identitas aktor.
5. Nama, NIP, jabatan, dan informasi aktor harus berasal dari master data pengguna.
6. Relasi atasan dan bawahan wajib menggunakan hubungan pengguna yang sebenarnya.
7. Jangan menganggap dua pengguna memiliki hubungan atasan-bawahan hanya karena berada di departemen yang sama.
8. Pastikan akses data dan tiket terisolasi berdasarkan relasi pengguna yang valid.
9. Terapkan authorization check pada setiap operasi yang membutuhkan hak akses tertentu.
10. Jangan mempercayai identitas aktor yang dikirim langsung dari frontend tanpa verifikasi backend.

# 7. PEMISAHAN DOMAIN PELACAKAN DAN RIWAYAT

Aturan ini wajib diterapkan secara konsisten pada seluruh halaman Pelacakan dan Riwayat, baik untuk Pos Jaga maupun Atasan.

### A. MENU PELACAKAN

HANYA menampilkan tiket izin dengan status aktif atau sedang berjalan.

Status yang diperbolehkan:

- AKTIF.
- BERJALAN.

### B. MENU RIWAYAT

HANYA menampilkan tiket dengan status final.

Status final meliputi:

- Selesai.
- Ditolak.
- Dibatalkan.
- Kedaluwarsa.

### C. KETENTUAN

1. Tiket final dilarang muncul pada menu Pelacakan.
2. Tiket aktif dilarang dianggap sebagai riwayat final.
3. Gunakan filter status yang konsisten antara frontend dan backend.
4. Pastikan perubahan status langsung tercermin pada halaman yang sesuai.
5. Jangan membuat duplikasi tiket ketika status berubah.

# 8. DONUT CHART & METRIC VISUALIZATION

1. Donut Chart metrik karyawan WAJIB memiliki tepat dua kategori:
   - Total Izin Biasa.
   - Total Izin Darurat.
2. Dilarang menambahkan kategori atau irisan ketiga, termasuk irisan kuning.
3. Nilai chart harus berasal dari data aktual, bukan angka hardcoded.
4. WAJIB menampilkan legenda kuantitatif yang berisi:
   - Nama kategori.
   - Jumlah aktual.
   - Persentase aktual.
5. Total persentase harus mencapai 100% apabila terdapat data.
6. Tangani kondisi tidak ada data dengan empty state yang jelas.
7. Hover harus responsif dan tidak menyebabkan tooltip atau highlight macet.
8. Pastikan tooltip dapat muncul dan menghilang secara normal.
9. Hindari konflik event pointer, mouseleave, dan state chart.
10. Pastikan visualisasi tetap responsive.

# 9. ACCOUNT LIFECYCLE & NULL-SAFETY

1. Dilarang mengosongkan referensi aktor global `window.ACTORS.*` menjadi `null` ketika akun dihapus atau dicabut.
2. Selalu sediakan fallback object yang aman atau lakukan pengalihan referensi kepada pejabat aktif berikutnya.
3. Pastikan seluruh pemanggilan properti aktor memiliki null-safety.
4. Cegah TypeError akibat referensi aktor yang sudah tidak tersedia.
5. Ketika akun atasan dicabut atau dihapus, lakukan rekonsiliasi terhadap seluruh tiket yang masih berada dalam antrean persetujuan.
6. Tiket berstatus "Menunggu Persetujuan" tidak boleh menjadi yatim tanpa peninjau.
7. Jika atasan pengganti tersedia, lakukan pengalihan sesuai aturan otorisasi.
8. Jika tidak tersedia, tandai kondisi tersebut dan sediakan mekanisme penanganan administratif.
9. Pastikan perubahan akun tidak merusak histori tiket yang sudah ada.
10. Jangan menghapus jejak audit akibat penghapusan akun.

# 10. NOTIFICATION TARGET RESOLUTION

1. Penerima notifikasi harus dicari secara dinamis dari master data pengguna.
2. Gunakan `MOCK_USERS` atau akun aktif sesuai sumber data yang berlaku pada proyek.
3. NIP penerima tidak boleh menggunakan hardcoding.
4. Dilarang menggunakan pengujian biner statis yang hanya mengenali pejabat tertentu.
5. Sistem harus tetap mengenali pejabat baru yang ditambahkan ke master data.
6. Validasi keberadaan dan status aktif penerima sebelum mengirim notifikasi.
7. Pastikan target notifikasi sesuai dengan relasi pengguna dan aturan otorisasi.
8. Tangani kondisi penerima tidak ditemukan, akun tidak aktif, atau data NIP kosong.
9. Hindari pengiriman notifikasi ganda.
10. Pastikan kegagalan pengiriman notifikasi tidak merusak proses utama.

# 11. AUDIT TRAIL & HISTORY CONSISTENCY

1. Seluruh pencatatan audit trail wajib konsisten menggunakan properti `t.timeline`.
2. Jangan menggunakan properti alternatif untuk mencatat histori pada objek tiket yang sama.
3. Setiap aksi penting harus mencatat:
   - Aktor yang melakukan aksi.
   - Jenis aktivitas.
   - Waktu aktivitas.
   - Keterangan aktivitas.
   - Perubahan status apabila ada.
4. Identitas aktor harus dibaca secara dinamis.
5. Jangan menghapus histori aktivitas ketika tiket mengalami perubahan status.
6. Pastikan timeline tetap dapat dibaca meskipun akun aktor sudah dihapus atau dinonaktifkan.
7. Gunakan fallback informasi aktor apabila profil asli sudah tidak tersedia.
8. Hindari manipulasi atau penimpaan histori yang sudah tersimpan.
9. Pertahankan konsistensi format timeline pada seluruh modul.

# 12. DATABASE & DATA INTEGRITY

1. Periksa relasi tabel sebelum mengubah struktur database.
2. Jangan menghapus kolom, tabel, atau relasi tanpa persetujuan pengguna.
3. Pertahankan referential integrity.
4. Gunakan transaksi database untuk operasi yang melibatkan beberapa perubahan data penting.
5. Tangani rollback apabila proses gagal.
6. Hindari duplicate records.
7. Pastikan operasi CRUD sesuai dengan hak akses pengguna.
8. Gunakan validasi data sebelum penyimpanan.
9. Jangan mengubah data produksi secara langsung tanpa persetujuan.
10. Pertahankan data histori dan audit trail.

# 13. SECURITY & ACCESS CONTROL

1. Jangan mengekspos credential, API key, token, password, atau secret ke frontend maupun repository publik.
2. Gunakan environment variables untuk konfigurasi sensitif.
3. Terapkan autentikasi dan otorisasi secara konsisten.
4. Validasi setiap input yang berasal dari pengguna.
5. Cegah SQL Injection, XSS, CSRF, dan akses data tanpa izin sesuai teknologi yang digunakan.
6. Jangan memberikan hak akses tambahan tanpa persetujuan.
7. Jangan mengubah konfigurasi keamanan tanpa alasan yang jelas.
8. Jangan menjalankan perintah berbahaya atau destruktif tanpa persetujuan pengguna.

# 14. FINAL QUALITY CONTROL

Sebelum menyatakan pekerjaan selesai, WAJIB memastikan:

- [ ] Instruksi pengguna telah dipenuhi.
- [ ] Tidak ada perubahan yang tidak diminta.
- [ ] Struktur proyek tetap konsisten.
- [ ] Tidak ada fungsi lama yang rusak.
- [ ] Tidak ada hardcoding identitas aktor.
- [ ] Validasi input dan authorization berjalan.
- [ ] Edge cases sudah ditangani.
- [ ] Tidak ada error TypeScript atau syntax yang diketahui.
- [ ] Test yang relevan sudah dijalankan.
- [ ] UI telah diuji menggunakan Browser/Playwright jika tersedia.
- [ ] Data dan audit trail tetap konsisten.
- [ ] Hasil akhir telah diverifikasi.

## PRINSIP UTAMA

KETEPATAN INSTRUKSI > KECEPATAN EKSEKUSI.

INTEGRITAS DATA > KEMUDAHAN IMPLEMENTASI.

KONSISTENSI SISTEM > PERUBAHAN VISUAL YANG TIDAK DIPERLUKAN.

Jangan pernah mengorbankan fungsi yang sudah berjalan demi menyelesaikan fitur baru.

Jangan pernah mengklaim berhasil apabila implementasi belum diverifikasi.

Tugas Agent adalah mengimplementasikan apa yang benar-benar diminta pengguna, bukan menciptakan interpretasi sendiri terhadap kebutuhan pengguna.
