-- =====================================================================
-- SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
-- DATABASE SCHEMA & INITIAL DATA SEEDER (MySQL / MariaDB / phpMyAdmin)
-- Versi: 1.0.0
-- Karakter Set: utf8mb4 | Engine: InnoDB
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- ---------------------------------------------------------------------
-- 1. PEMBUATAN DATABASE
-- ---------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `db_perizinan_kujang` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `db_perizinan_kujang`;

-- ---------------------------------------------------------------------
-- 2. PEMBERSIHAN TABEL LAMA (Jika Ada)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `ticket_soft_deletes`;
DROP TABLE IF EXISTS `ticket_arrival_proofs`;
DROP TABLE IF EXISTS `ticket_extensions`;
DROP TABLE IF EXISTS `ticket_members`;
DROP TABLE IF EXISTS `ticket_timeline`;
DROP TABLE IF EXISTS `tickets`;
DROP TABLE IF EXISTS `gates`;
DROP TABLE IF EXISTS `users`;

-- ---------------------------------------------------------------------
-- 3. TABEL: USERS (Master Pengguna & Akun Semua Aktor)
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kujang_id` VARCHAR(50) NOT NULL UNIQUE,
  `nip` VARCHAR(50) NOT NULL UNIQUE,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL DEFAULT '123',
  `department` VARCHAR(150) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `role` VARCHAR(80) NOT NULL,
  `role_key` VARCHAR(50) NOT NULL,
  `approver_level` INT DEFAULT 1,
  `direct_supervisor` VARCHAR(150) DEFAULT NULL,
  `supervisor` VARCHAR(150) DEFAULT NULL,
  `status` ENUM('Aktif', 'Nonaktif', 'Dicabut') NOT NULL DEFAULT 'Aktif',
  `avatar` VARCHAR(50) DEFAULT '👨‍💼',
  `badge_color` VARCHAR(20) DEFAULT '#059669',
  `registered_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_login` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role_key` (`role_key`),
  INDEX `idx_users_nip` (`nip`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. TABEL: GATES (Master Pos Pengamanan / Pos Jaga)
-- ---------------------------------------------------------------------
CREATE TABLE `gates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `location` VARCHAR(150) DEFAULT NULL,
  `status` ENUM('Aktif', 'Nonaktif') NOT NULL DEFAULT 'Aktif',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. TABEL: TICKETS (Master Transaksi Pengajuan Izin Keluar)
-- ---------------------------------------------------------------------
CREATE TABLE `tickets` (
  `id` VARCHAR(50) PRIMARY KEY,
  `applicant_nip` VARCHAR(50) NOT NULL,
  `applicant_name` VARCHAR(150) NOT NULL,
  `applicant_phone` VARCHAR(50) DEFAULT NULL,
  `department` VARCHAR(150) NOT NULL,
  `category` ENUM('Dinas Kantor', 'Urusan Pribadi') NOT NULL DEFAULT 'Dinas Kantor',
  `type` ENUM('Kembali ke Area', 'Pulang Mendahului') NOT NULL DEFAULT 'Kembali ke Area',
  `destination` TEXT NOT NULL,
  `reason` TEXT NOT NULL,
  `transport_mode` VARCHAR(100) DEFAULT 'Kendaraan dinas',
  `vehicle_plate` VARCHAR(50) DEFAULT NULL,
  `planned_exit` DATETIME NOT NULL,
  `estimated_return` DATETIME NOT NULL,
  `status` VARCHAR(80) NOT NULL DEFAULT 'Menunggu Persetujuan',
  `is_emergency` TINYINT(1) NOT NULL DEFAULT 0,
  `is_group_dinas` TINYINT(1) NOT NULL DEFAULT 0,
  `is_late` TINYINT(1) NOT NULL DEFAULT 0,
  `late_minutes` INT NOT NULL DEFAULT 0,
  `approver_nip` VARCHAR(50) DEFAULT NULL,
  `approver_name` VARCHAR(150) DEFAULT NULL,
  `approver_title` VARCHAR(150) DEFAULT NULL,
  `approver_note` TEXT DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `cancellation_reason` TEXT DEFAULT NULL,
  `emergency_authorizer_nip` VARCHAR(50) DEFAULT NULL,
  `emergency_authorizer_name` VARCHAR(150) DEFAULT NULL,
  `emergency_authorizer_phone` VARCHAR(50) DEFAULT NULL,
  `emergency_authorization_note` TEXT DEFAULT NULL,
  `emergency_verified_at` DATETIME DEFAULT NULL,
  `scan_out_gate` VARCHAR(100) DEFAULT NULL,
  `security_officer_out` VARCHAR(150) DEFAULT NULL,
  `scan_out_time` VARCHAR(100) DEFAULT NULL,
  `scan_in_gate` VARCHAR(100) DEFAULT NULL,
  `security_officer_in` VARCHAR(150) DEFAULT NULL,
  `scan_in_time` VARCHAR(100) DEFAULT NULL,
  `tap_in_time` VARCHAR(100) DEFAULT NULL,
  `tap_in_member` VARCHAR(150) DEFAULT NULL,
  `tap_in_nip` VARCHAR(50) DEFAULT NULL,
  `arrival_reported_time` VARCHAR(100) DEFAULT NULL,
  `arrival_reported_at` VARCHAR(100) DEFAULT NULL,
  `time_frozen` TINYINT(1) DEFAULT 0,
  `document_name` VARCHAR(255) DEFAULT NULL,
  `document_url` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tickets_applicant` (`applicant_nip`),
  INDEX `idx_tickets_approver` (`approver_nip`),
  INDEX `idx_tickets_status` (`status`),
  INDEX `idx_tickets_category` (`category`),
  INDEX `idx_tickets_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. TABEL: TICKET_TIMELINE (Riwayat Jejak Audit / Audit Trail)
-- ---------------------------------------------------------------------
CREATE TABLE `ticket_timeline` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` VARCHAR(50) NOT NULL,
  `event` VARCHAR(150) NOT NULL,
  `event_time` VARCHAR(100) NOT NULL,
  `actor_by` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `gate` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_timeline_ticket` (`ticket_id`),
  CONSTRAINT `fk_timeline_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. TABEL: TICKET_MEMBERS (Daftar Anggota Tim Dinas Kantor)
-- ---------------------------------------------------------------------
CREATE TABLE `ticket_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` VARCHAR(50) NOT NULL,
  `nip` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `department` VARCHAR(150) DEFAULT NULL,
  `role` VARCHAR(50) DEFAULT 'Anggota',
  `status` VARCHAR(50) DEFAULT 'aktif',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_members_ticket` (`ticket_id`),
  INDEX `idx_members_nip` (`nip`),
  CONSTRAINT `fk_members_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. TABEL: TICKET_EXTENSIONS (Permohonan Perpanjangan Durasi Izin)
-- ---------------------------------------------------------------------
CREATE TABLE `ticket_extensions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` VARCHAR(50) NOT NULL,
  `new_estimated_return` DATETIME NOT NULL,
  `extension_reason` TEXT NOT NULL,
  `status` ENUM('Menunggu Persetujuan', 'Disetujui', 'Ditolak', 'Dibatalkan') NOT NULL DEFAULT 'Menunggu Persetujuan',
  `approver_nip` VARCHAR(50) DEFAULT NULL,
  `approver_name` VARCHAR(150) DEFAULT NULL,
  `approver_note` TEXT DEFAULT NULL,
  `requested_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `decided_at` DATETIME DEFAULT NULL,
  INDEX `idx_ext_ticket` (`ticket_id`),
  INDEX `idx_ext_status` (`status`),
  CONSTRAINT `fk_ext_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. TABEL: TICKET_ARRIVAL_PROOFS (Bukti Foto Kedatangan Kembali)
-- ---------------------------------------------------------------------
CREATE TABLE `ticket_arrival_proofs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` VARCHAR(50) NOT NULL,
  `photo_url` LONGTEXT NOT NULL,
  `caption` TEXT DEFAULT NULL,
  `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_proof_ticket` (`ticket_id`),
  CONSTRAINT `fk_proof_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. TABEL: TICKET_SOFT_DELETES (Penghapusan Riwayat Per Aktor)
-- Agar tiket yang dihapus oleh 1 orang tidak hilang di akun aktor lain
-- ---------------------------------------------------------------------
CREATE TABLE `ticket_soft_deletes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` VARCHAR(50) NOT NULL,
  `deleted_by_role` VARCHAR(50) NOT NULL,
  `deleted_by_nip` VARCHAR(50) NOT NULL,
  `deleted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_ticket_actor` (`ticket_id`, `deleted_by_role`, `deleted_by_nip`),
  INDEX `idx_softdel_ticket` (`ticket_id`),
  CONSTRAINT `fk_softdel_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11. TABEL: NOTIFICATIONS (Pemberitahuan Sistem Real-time)
-- ---------------------------------------------------------------------
CREATE TABLE `notifications` (
  `id` VARCHAR(100) PRIMARY KEY,
  `recipient_role` VARCHAR(50) NOT NULL,
  `recipient_nip` VARCHAR(50) DEFAULT NULL,
  `recipient_name` VARCHAR(150) DEFAULT NULL,
  `actor_source` VARCHAR(100) DEFAULT 'system',
  `type` VARCHAR(50) DEFAULT 'info',
  `priority` ENUM('normal', 'high') DEFAULT 'normal',
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `ticket_id` VARCHAR(50) DEFAULT NULL,
  `event_id` VARCHAR(100) DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_recipient` (`recipient_role`, `recipient_nip`),
  INDEX `idx_notif_is_read` (`is_read`),
  INDEX `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- SEEDER DATA AWAL (MASTER PENGGUNA, GERBANG, TIKET, & NOTIFIKASI)
-- =====================================================================

-- 1. SEEDER: USERS (13 Master Pengguna Resmi PT Pupuk Kujang)
INSERT INTO `users` (`kujang_id`, `nip`, `username`, `name`, `email`, `phone`, `password`, `department`, `title`, `role`, `role_key`, `approver_level`, `direct_supervisor`, `supervisor`, `status`, `avatar`, `badge_color`, `registered_at`, `last_login`) VALUES
('KJG-991024', 'PK-2024-8841', 'karyawan', 'Budi Pratama, S.T.', 'budi.pratama@pupuk-kujang.co.id', '0812-8841-0001', '123', 'Departemen Rekayasa & Pemeliharaan', 'Staf Rekayasa Mesin', 'Karyawan', 'karyawan', 1, 'Ir. Hendra Gunawan, M.T.', 'Ir. Hendra Gunawan, M.T.', 'Aktif', '👨‍💼', '#059669', '2026-10-15 08:00:00', 'Hari ini, 08:12 WIB'),
('KJG-991025', 'PK-2024-8842', 'karyawan2', 'Arthur Morgan, S.Tr.T.', 'arthur.morgan@pupuk-kujang.co.id', '0812-8841-0006', '123', 'Departemen Rekayasa & Pemeliharaan', 'Staf Instrumentasi & Otomasi Pabrik', 'Karyawan', 'karyawan2', 1, 'Ir. Hendra Gunawan, M.T.', 'Ir. Hendra Gunawan, M.T.', 'Aktif', '🤠', '#059669', '2026-10-20 08:00:00', 'Hari ini, 08:30 WIB'),
('KJG-991026', 'PK-2024-8845', 'moreno', 'Moreno Ardiansyah, S.T.', 'moreno.ardiansyah@pupuk-kujang.co.id', '0812-8845-0010', '123', 'Departemen Rekayasa & Pemeliharaan', 'Staf Rekayasa Pemeliharaan', 'Karyawan', 'karyawan', 1, 'Ir. Hendra Gunawan, M.T.', 'Ir. Hendra Gunawan, M.T.', 'Aktif', '👨‍🔧', '#059669', '2026-10-28 08:00:00', 'Hari ini, 08:15 WIB'),
('KJG-991027', 'PK-2024-8846', 'gusti', 'Gusti Pratama, S.Tr.T.', 'gusti.pratama@pupuk-kujang.co.id', '0812-8846-0011', '123', 'Departemen Rekayasa & Pemeliharaan', 'Staf Instrumentasi Lapangan', 'Karyawan', 'karyawan', 1, 'Dewi Sartika, S.T., M.M.', 'Dewi Sartika, S.T., M.M.', 'Aktif', '👨‍💼', '#059669', '2026-11-02 08:00:00', 'Hari ini, 08:20 WIB'),
('KJG-991028', 'PK-2024-8847', 'bima', 'Bima Arya Nugraha, S.T.', 'bima.arya@pupuk-kujang.co.id', '0812-8847-0012', '123', 'Departemen Rekayasa & Pemeliharaan', 'Staf Sistem Kontrol Pabrik', 'Karyawan', 'karyawan', 1, 'Dewi Sartika, S.T., M.M.', 'Dewi Sartika, S.T., M.M.', 'Aktif', '👷‍♂️', '#059669', '2026-11-08 08:00:00', 'Hari ini, 08:25 WIB'),
('KJG-881201', 'PK-2015-1002', 'atasan1', 'Ir. Hendra Gunawan, M.T.', 'hendra.gunawan@pupuk-kujang.co.id', '0813-1122-0002', '123', 'Departemen Rekayasa & Pemeliharaan', 'Manager Rekayasa & Pemeliharaan', 'Atasan 1 (Manager)', 'approver', 1, NULL, NULL, 'Aktif', '👔', '#0f766e', '2026-09-01 08:00:00', 'Hari ini, 07:45 WIB'),
('KJG-881202', 'PK-2012-0845', 'atasan2', 'Dewi Sartika, S.T., M.M.', 'dewi.sartika@pupuk-kujang.co.id', '0813-3344-0003', '123', 'Departemen Rekayasa & Pemeliharaan', 'Supervisor Operasional Lapangan (Plt. Manager)', 'Atasan 2 (Supervisor / Plt)', 'approver2', 2, NULL, NULL, 'Aktif', '👩‍💼', '#0369a1', '2026-09-15 08:00:00', 'Hari ini, 08:05 WIB'),
('KJG-774419', 'SEC-2018-042', 'posjaga', 'Sertu Agus', 'pos1.security@pupuk-kujang.co.id', '0815-5566-0004', '123', 'Departemen Pengamanan & K3', 'Petugas Pengamanan Pos 1', 'Petugas Pengamanan (Pos 1)', 'security', 1, NULL, NULL, 'Aktif', '👮', '#1d4ed8', '2026-10-05 08:00:00', 'Hari ini, 06:00 WIB'),
('KJG-774420', 'SEC-2019-088', 'posjaga2', 'Kopral Dani', 'pos2.security@pupuk-kujang.co.id', '0815-5566-0008', '123', 'Departemen Pengamanan & K3', 'Petugas Pengamanan Pos 2', 'Petugas Pengamanan (Pos 2)', 'security', 1, NULL, NULL, 'Aktif', '👮‍♂️', '#1d4ed8', '2026-10-06 08:00:00', 'Kemarin, 22:00 WIB'),
('KJG-774421', 'SEC-2020-105', 'posjaga3', 'Praka Ilham', 'pos3.security@pupuk-kujang.co.id', '0815-5566-0010', '123', 'Departemen Pengamanan & K3', 'Petugas Pengamanan Pos 3', 'Petugas Pengamanan (Pos 3)', 'security', 1, NULL, NULL, 'Aktif', '👮‍♂️', '#1d4ed8', '2026-10-07 08:00:00', 'Hari ini, 07:00 WIB'),
('KJG-661009', 'ADM-2016-019', 'admin', 'Bambang Sutrisno, S.T.', 'bambang.sutrisno@pupuk-kujang.co.id', '0811-7788-0005', '123', 'Departemen Pengamanan & K3', 'Supervisi Pengamanan & K3', 'Administrator Pengamanan & K3', 'admin', 1, NULL, NULL, 'Aktif', '🛡️', '#7c3aed', '2026-10-01 08:00:00', 'Hari ini, 08:00 WIB'),
('KJG-991055', 'PK-2022-7719', 'siti', 'Siti Rahmawati, S.Tr.', 'siti.rahmawati@pupuk-kujang.co.id', '0812-7719-0022', '123', 'Departemen Produksi Amonia-1A', 'Operator Lapangan Amonia-1A', 'Karyawan', 'karyawan', 1, 'Dr. Ahmad Subagja, M.M.', 'Dr. Ahmad Subagja, M.M.', 'Aktif', '👩‍💼', '#059669', '2026-11-12 08:00:00', 'Kemarin, 14:15 WIB'),
('KJG-881299', 'PK-2012-0543', 'ahmad', 'Dr. Ahmad Subagja, M.M.', 'ahmad.subagja@pupuk-kujang.co.id', '0813-1122-0099', '123', 'Departemen Produksi Amonia-1A', 'Manager Produksi Amonia-1A', 'Atasan 1 (Manager)', 'approver', 1, NULL, NULL, 'Aktif', '👔', '#0f766e', '2026-09-20 08:00:00', 'Hari ini, 08:30 WIB');

-- 2. SEEDER: GATES (Master Pos Pengamanan)
INSERT INTO `gates` (`code`, `name`, `location`, `status`) VALUES
('POS-01', 'Pos 1 Gerbang Utama', 'Sektor Gerbang Utara (Utama)', 'Aktif'),
('POS-02', 'Pos 2 Gerbang Barat', 'Sektor Gerbang Barat (Logistik & Kontainer)', 'Aktif'),
('POS-03', 'Pos 3 Gerbang Timur', 'Sektor Gerbang Timur (Pabrik 1A)', 'Aktif');

-- 3. SEEDER: TICKETS (Data Awal Realistis Sesuai Mockup & Figma)
INSERT INTO `tickets` (
  `id`, `applicant_nip`, `applicant_name`, `department`, `category`, `type`, `destination`, `reason`, 
  `transport_mode`, `planned_exit`, `estimated_return`, `status`, `is_emergency`, `is_group_dinas`, 
  `approver_nip`, `approver_name`, `approver_title`, `approver_note`, `scan_out_gate`, `security_officer_out`, 
  `scan_out_time`, `scan_in_gate`, `security_officer_in`, `scan_in_time`, `created_at`
) VALUES
(
  'TK-20261106-901', 'PK-2024-8841', 'Budi Pratama, S.T.', 'Departemen Rekayasa & Pemeliharaan', 
  'Dinas Kantor', 'Kembali ke Area', 'PT Rekayasa Industri, Cikampek', 'Koordinasi perbaikan instalasi pipa amonia unit 2', 
  'Kendaraan dinas', '2026-11-06 09:00:00', '2026-11-06 14:30:00', 'Sedang di Luar', 0, 0, 
  'PK-2015-1002', 'Ir. Hendra Gunawan, M.T.', 'Manager Rekayasa & Pemeliharaan', 'Disetujui. Mohon koordinasikan progres via radio/WA.', 
  'Pos 1 Gerbang Utama', 'Sertu Agus', '06 Nov 2026, 09.05 WIB (Pos 1 Gerbang Utama)', NULL, NULL, NULL, '2026-11-06 08:20:00'
),
(
  'TK-20261106-902', 'PK-2024-8842', 'Arthur Morgan, S.Tr.T.', 'Departemen Rekayasa & Pemeliharaan', 
  'Dinas Kantor', 'Kembali ke Area', 'Balai Standardisasi Industri Karawang', 'Pengambilan sertifikat kalibrasi sensor instrumentasi', 
  'Kendaraan dinas', '2026-11-06 10:30:00', '2026-11-06 15:00:00', 'Disetujui', 0, 0, 
  'PK-2015-1002', 'Ir. Hendra Gunawan, M.T.', 'Manager Rekayasa & Pemeliharaan', 'Disetujui. Siap diproses keluar di gerbang.', 
  NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-06 08:40:00'
),
(
  'IZ-20261019-013', 'PK-2024-8841', 'Budi Pratama, S.T.', 'Departemen Rekayasa & Pemeliharaan', 
  'Dinas Kantor', 'Kembali ke Area', 'PT Rekayasa Industri, Cikampek', 'Koordinasi perbaikan pompa P-204', 
  'Kendaraan dinas', '2026-10-19 10:00:00', '2026-10-19 13:00:00', 'Selesai', 0, 0, 
  'PK-2015-1002', 'Ir. Hendra Gunawan, M.T.', 'Manajer Rekayasa & Pemeliharaan', 'Disetujui. Koordinasikan hasil pemeriksaan setelah kembali.', 
  'Pos 1 Gerbang Utama', 'Sertu Agus', '19 Okt 2026, 10.05 WIB (Pos 1 Gerbang Utama)', 'Pos 1 Gerbang Utama', 'Sertu Agus', '19 Okt 2026, 12.50 WIB (Pos 1 Gerbang Utama)', '2026-10-19 09:20:00'
),
(
  'IZ-20261016-006', 'PK-2024-8841', 'Budi Pratama, S.T.', 'Departemen Rekayasa & Pemeliharaan', 
  'Dinas Kantor', 'Kembali ke Area', 'Pelabuhan Cirebon', 'Pemeriksaan pengapalan kargo suku cadang pompa industri', 
  'Kendaraan dinas', '2026-10-16 08:30:00', '2026-10-16 10:45:00', 'Selesai', 1, 0, 
  'PK-2015-1002', 'Ir. Hendra Gunawan, M.T.', 'Manajer Rekayasa & Pemeliharaan', 'Disetujui. Selesai tepat waktu.', 
  'Pos 1 Gerbang Utama', 'Sertu Agus', '16 Okt 2026, 09.05 WIB (Pos 1)', 'Pos 1 Gerbang Utama', 'Sertu Agus', '16 Okt 2026, 10.55 WIB (Pos 1)', '2026-10-16 08:15:00'
),
(
  'IZ-20261014-003', 'PK-2024-8841', 'Budi Pratama, S.T.', 'Departemen Rekayasa & Pemeliharaan', 
  'Urusan Pribadi', 'Kembali ke Area', 'RSUD Karawang', 'Pemeriksaan laboratorium lanjutan', 
  'Kendaraan pribadi', '2026-10-14 13:00:00', '2026-10-14 15:00:00', 'Selesai', 0, 0, 
  'PK-2015-1002', 'Ir. Hendra Gunawan, M.T.', 'Manajer Rekayasa & Pemeliharaan', 'Disetujui.', 
  'Pos 2 Gerbang Barat', 'Kopral Dani (Pos 2)', '14 Okt 2026, 13.02 WIB (Pos 2 Gerbang Barat)', 'Pos 2 Gerbang Barat', 'Kopral Dani (Pos 2)', '14 Okt 2026, 14.25 WIB (Pos 2 Gerbang Barat)', '2026-10-14 11:30:00'
),
(
  'IZ-20261012-005', 'PK-2024-8841', 'Budi Pratama, S.T.', 'Departemen Rekayasa & Pemeliharaan', 
  'Dinas Kantor', 'Kembali ke Area', 'Kantor Distributor Bekasi', 'Serah terima invoice dan dokumen garansi komponen teknis', 
  'Kendaraan dinas', '2026-10-12 10:00:00', '2026-10-12 12:00:00', 'Selesai', 0, 1, 
  'PK-2015-1002', 'Ir. Hendra Gunawan, M.T.', 'Manajer Rekayasa & Pemeliharaan', 'Kembali terlambat 10 menit dikarenakan kepadatan jalur arteri Cikampek.', 
  'Pos 1 Gerbang Utama', 'Sertu Agus', '12 Okt 2026, 10.04 WIB (Pos 1)', 'Pos 1 Gerbang Utama', 'Sertu Agus', '12 Okt 2026, 12.10 WIB (Pos 1)', '2026-10-12 09:00:00'
),
(
  'IZ-20261009-002', 'PK-2024-8841', 'Budi Pratama, S.T.', 'Departemen Rekayasa & Pemeliharaan', 
  'Urusan Pribadi', 'Pulang Mendahului', 'Rumah (keperluan keluarga)', 'Urusan keluarga mendesak di rumah', 
  'Kendaraan pribadi', '2026-10-09 10:00:00', '2026-10-09 12:00:00', 'Selesai', 0, 0, 
  'PK-2015-1002', 'Ir. Hendra Gunawan, M.T.', 'Manajer Rekayasa & Pemeliharaan', 'Disetujui. Semoga urusan keluarga lekas terselesaikan dengan baik.', 
  'Pos 1 Gerbang Utama', 'Sertu Agus', '06 Nov 2026, 10.05 WIB (Pos 1 Gerbang Utama)', NULL, NULL, NULL, '2026-10-09 09:40:00'
),
(
  'IZ-20261007-004', 'PK-2024-8841', 'Budi Pratama, S.T.', 'Departemen Rekayasa & Pemeliharaan', 
  'Dinas Kantor', 'Kembali ke Area', 'Gudang Logistik Ciampei', 'Pengecekan spesifikasi valve dan seal cadangan', 
  'Kendaraan dinas', '2026-10-07 09:00:00', '2026-10-07 11:30:00', 'Selesai', 0, 0, 
  'PK-2015-1002', 'Ir. Hendra Gunawan, M.T.', 'Manajer Rekayasa & Pemeliharaan', 'Disetujui. Selesai tepat waktu.', 
  'Pos 3 Gerbang Timur', 'Praka Ilham (Pos 3)', '07 Okt 2026, 09.00 WIB (Pos 3 Gerbang Timur)', 'Pos 3 Gerbang Timur', 'Praka Ilham (Pos 3)', '07 Okt 2026, 11.50 WIB (Pos 3 Gerbang Timur)', '2026-10-07 08:20:00'
);

-- 4. SEEDER: TICKET_MEMBERS (Anggota Tim untuk Tiket Dinas Rombongan IZ-20261012-005)
INSERT INTO `ticket_members` (`ticket_id`, `nip`, `name`, `department`, `role`, `status`) VALUES
('IZ-20261012-005', 'PK-2024-8842', 'Arthur Morgan, S.Tr.T.', 'Departemen Rekayasa & Pemeliharaan', 'Anggota', 'aktif');

-- 5. SEEDER: TICKET_TIMELINE (Jejak Audit untuk Setiap Tiket)
INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`, `gate`) VALUES
('TK-20261106-901', 'Pengajuan dibuat', '06 Nov 2026, 08.20 WIB', 'Budi Pratama, S.T.', 'Dinas Kantor — Kembali ke Area', NULL),
('TK-20261106-901', 'Disetujui oleh atasan', '06 Nov 2026, 08.45 WIB', 'Ir. Hendra Gunawan, M.T.', 'Disetujui untuk perbaikan instalasi pipa.', NULL),
('TK-20261106-901', 'Scan Out tercatat', '06 Nov 2026, 09.05 WIB', 'Sertu Agus (Pos 1)', 'Pos 1 Gerbang Utama — Personel meninggalkan kawasan pabrik.', 'Pos 1 Gerbang Utama'),

('TK-20261106-902', 'Pengajuan dibuat', '06 Nov 2026, 08.40 WIB', 'Arthur Morgan, S.Tr.T.', 'Dinas Kantor — Pengambilan sertifikat kalibrasi', NULL),
('TK-20261106-902', 'Disetujui oleh atasan', '06 Nov 2026, 09.10 WIB', 'Ir. Hendra Gunawan, M.T.', 'Disetujui. Tiket siap dipindai di pos jaga.', NULL),

('IZ-20261019-013', 'Pengajuan diajukan', '19 Okt 2026, 09.20 WIB', 'Budi Pratama, S.T.', 'Dinas Kantor — Kembali ke Area', NULL),
('IZ-20261019-013', 'Disetujui oleh atasan', '19 Okt 2026, 09.35 WIB', 'Ir. Hendra Gunawan, M.T. — Manajer Rekayasa & Pemeliharaan', 'Disetujui. Koordinasikan hasil pemeriksaan setelah kembali.', NULL),
('IZ-20261019-013', 'Scan Out tercatat', '19 Okt 2026, 10.05 WIB', 'Sertu Agus (Pos 1)', 'Pos 1 — Karyawan meninggalkan area', 'Pos 1 Gerbang Utama'),
('IZ-20261019-013', 'Tap In tercatat', '19 Okt 2026, 12.50 WIB', 'Sertu Agus (Pos 1)', 'Pos 1 — Karyawan kembali ke area pabrik', 'Pos 1 Gerbang Utama'),

('IZ-20261016-006', 'Pengajuan Dibuat', '16 Okt 2026, 08.15 WIB', 'Budi Pratama, S.T.', 'Pengajuan izin dinas darurat.', NULL),
('IZ-20261016-006', 'Disetujui', '16 Okt 2026, 08.30 WIB', 'Ir. Hendra Gunawan, M.T.', 'Disetujui.', NULL),
('IZ-20261016-006', 'Scan Out', '16 Okt 2026, 09.05 WIB', 'Pos 1', 'Karyawan keluar.', 'Pos 1 Gerbang Utama'),
('IZ-20261016-006', 'Tap In', '16 Okt 2026, 10.55 WIB', 'Pos 1', 'Kembali ke area tepat waktu.', 'Pos 1 Gerbang Utama'),

('IZ-20261014-003', 'Pengajuan Dibuat', '14 Okt 2026, 11.30 WIB', 'Budi Pratama, S.T.', 'Izin urusan pribadi.', NULL),
('IZ-20261014-003', 'Disetujui', '14 Okt 2026, 11.45 WIB', 'Ir. Hendra Gunawan, M.T.', 'Disetujui.', NULL),
('IZ-20261014-003', 'Scan Out', '14 Okt 2026, 13.02 WIB', 'Kopral Dani (Pos 2)', 'Keluar gerbang barat.', 'Pos 2 Gerbang Barat'),
('IZ-20261014-003', 'Tap In', '14 Okt 2026, 14.25 WIB', 'Kopral Dani (Pos 2)', 'Kembali tepat waktu.', 'Pos 2 Gerbang Barat'),

('IZ-20261012-005', 'Pengajuan Dibuat', '12 Okt 2026, 09.00 WIB', 'Budi Pratama, S.T.', 'Izin dinas rombongan.', NULL),
('IZ-20261012-005', 'Disetujui', '12 Okt 2026, 09.20 WIB', 'Ir. Hendra Gunawan, M.T.', 'Disetujui.', NULL),
('IZ-20261012-005', 'Scan Out', '12 Okt 2026, 10.04 WIB', 'Pos 1', 'Keluar area.', 'Pos 1 Gerbang Utama'),
('IZ-20261012-005', 'Tap In Terlambat', '12 Okt 2026, 12.10 WIB', 'Pos 1', 'Karyawan kembali 10 menit melewati estimasi 12.00 WIB.', 'Pos 1 Gerbang Utama'),

('IZ-20261009-002', 'Pengajuan Dibuat', '06 Nov 2026, 09.40 WIB', 'Budi Pratama, S.T.', 'Pengajuan izin pulang mendahului.', NULL),
('IZ-20261009-002', 'Disetujui Atasan', '06 Nov 2026, 09.50 WIB', 'Ir. Hendra Gunawan, M.T.', 'Disetujui untuk pulang mendahului.', NULL),
('IZ-20261009-002', 'Scan Out Pos Jaga', '06 Nov 2026, 10.05 WIB', 'Pos 1 Gerbang Utama', 'Scan kartu keluar gerbang oleh petugas keamanan.', 'Pos 1 Gerbang Utama'),

('IZ-20261007-004', 'Pengajuan Dibuat', '07 Okt 2026, 08.20 WIB', 'Budi Pratama, S.T.', 'Izin dinas.', NULL),
('IZ-20261007-004', 'Disetujui', '07 Okt 2026, 08.40 WIB', 'Ir. Hendra Gunawan, M.T.', 'Disetujui.', NULL),
('IZ-20261007-004', 'Scan Out', '07 Okt 2026, 09.00 WIB', 'Praka Ilham (Pos 3)', 'Keluar gerbang timur.', 'Pos 3 Gerbang Timur'),
('IZ-20261007-004', 'Tap In', '07 Okt 2026, 11.50 WIB', 'Praka Ilham (Pos 3)', 'Kembali tepat waktu.', 'Pos 3 Gerbang Timur');

-- 6. SEEDER: NOTIFICATIONS (Contoh Notifikasi Awal)
INSERT INTO `notifications` (`id`, `recipient_role`, `recipient_nip`, `recipient_name`, `actor_source`, `type`, `priority`, `title`, `message`, `ticket_id`, `is_read`, `created_at`) VALUES
('NOTIF-01', 'karyawan', 'PK-2024-8841', 'Budi Pratama, S.T.', 'approver', 'success', 'normal', 'Izin Disetujui Atasan', 'Pengajuan izin Anda ke PT Rekayasa Industri telah disetujui oleh Ir. Hendra Gunawan, M.T.', 'TK-20261106-901', 1, '2026-11-06 08:45:00'),
('NOTIF-02', 'security', 'SEC-2018-042', 'Sertu Agus', 'system', 'info', 'normal', 'Karyawan Scan Out', 'Budi Pratama, S.T. telah melakukan Scan Out di Pos 1 Gerbang Utama.', 'TK-20261106-901', 1, '2026-11-06 09:05:00'),
('NOTIF-03', 'approver', 'PK-2015-1002', 'Ir. Hendra Gunawan, M.T.', 'karyawan', 'info', 'normal', 'Pengajuan Izin Baru', 'Arthur Morgan, S.Tr.T. mengajukan izin dinas ke Balai Standardisasi Industri Karawang.', 'TK-20261106-902', 0, '2026-11-06 08:40:00');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
