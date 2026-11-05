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
