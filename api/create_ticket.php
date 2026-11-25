<?php
/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
 * API: Create / Sync Ticket (Pengajuan Izin Keluar Baru & Sinkronisasi Idempoten)
 */

require_once __DIR__ . '/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Metode HTTP harus POST', 405);
}

$input = getJsonInput();

if (empty($input)) {
    sendResponse(false, null, 'Data input JSON tidak boleh kosong', 400);
}

// 1. Validasi Kolom Wajib
$applicantNip = isset($input['applicantNip']) ? trim($input['applicantNip']) : '';
$applicantName = isset($input['applicantName']) ? trim($input['applicantName']) : '';
$department = isset($input['department']) ? trim($input['department']) : '';
$category = isset($input['category']) ? trim($input['category']) : 'Dinas Kantor';
$type = isset($input['type']) ? trim($input['type']) : 'Kembali ke Area';
$destination = isset($input['destination']) ? trim($input['destination']) : '';
$reason = isset($input['reason']) ? trim($input['reason']) : '';
$plannedExit = isset($input['plannedExit']) ? trim($input['plannedExit']) : '';
$estimatedReturn = isset($input['estimatedReturn']) ? trim($input['estimatedReturn']) : '';

if (!$applicantNip || !$applicantName || !$destination || !$reason || !$plannedExit || !$estimatedReturn) {
    sendResponse(false, null, 'Harap lengkapi semua data wajib pengajuan izin', 400);
}

// 2. Generate ID Tiket Otomatis jika belum ada
$ticketId = isset($input['id']) && !empty($input['id']) ? trim($input['id']) : null;
if (!$ticketId) {
    $datePart = date('Ymd');
    $randNum = rand(100, 999);
    $ticketId = "TK-{$datePart}-{$randNum}";
}

$isEmergency = !empty($input['isEmergency']) ? 1 : 0;
$isGroupDinas = !empty($input['isGroupDinas']) ? 1 : 0;

// Status resolution: Jika input status sudah ada (misal 'Selesai', 'Menunggu Verifikasi Atasan'), gunakan input status tersebut!
// Jangan menimpa status yang sudah 'Selesai' hanya karena isEmergency = 1!
if (isset($input['status']) && !empty($input['status'])) {
    $status = $input['status'];
} else {
    $status = $isEmergency ? 'Sedang di Luar' : 'Menunggu Persetujuan';
}

$tapInTime = isset($input['tapInTime']) ? $input['tapInTime'] : null;
$tapInMember = isset($input['tapInMember']) ? $input['tapInMember'] : null;
$tapInNip = isset($input['tapInNip']) ? $input['tapInNip'] : null;
$arrivalReportedTime = isset($input['arrivalReportedTime']) ? $input['arrivalReportedTime'] : null;
$arrivalReportedAt = isset($input['arrivalReportedAt']) ? $input['arrivalReportedAt'] : null;
$timeFrozen = !empty($input['timeFrozen']) ? 1 : 0;

$scanOutGate = isset($input['scanOutGate']) ? $input['scanOutGate'] : null;
$securityOfficerOut = isset($input['securityOfficerOut']) ? $input['securityOfficerOut'] : null;
$scanOutTime = isset($input['scanOutTime']) ? $input['scanOutTime'] : null;
$scanInGate = isset($input['scanInGate']) ? $input['scanInGate'] : null;
$securityOfficerIn = isset($input['securityOfficerIn']) ? $input['securityOfficerIn'] : null;
$scanInTime = isset($input['scanInTime']) ? $input['scanInTime'] : null;

// Normalisasi & Integritas Status:
// Jika status masih Menunggu Persetujuan atau Disetujui, tiket belum pernah Scan Out (tidak boleh ada catatan gerbang)
if (in_array($status, ['Menunggu Persetujuan', 'Disetujui', 'Menunggu Otorisasi Darurat'])) {
    $scanOutGate = null;
    $securityOfficerOut = null;
    $scanOutTime = null;
    $scanInGate = null;
    $securityOfficerIn = null;
    $scanInTime = null;
    $tapInTime = null;
} elseif ($status === 'Sedang di Luar' || $status === 'Terlambat') {
    $scanInGate = null;
    $securityOfficerIn = null;
    $scanInTime = null;
    $tapInTime = null;
}

// Transaksi Database (Atomic)
try {
    $pdo->beginTransaction();

    $stmtExists = $pdo->prepare("SELECT `id` FROM `tickets` WHERE `id` = :id LIMIT 1");
    $stmtExists->execute([':id' => $ticketId]);
    $ticketAlreadyExists = (bool)$stmtExists->fetch();

    // Proteksi agar tiket yang sudah dihapus langsung dari phpMyAdmin / Admin tidak disisipkan ulang oleh sinkronisasi client
    if (!empty($input['updateOnly']) && !$ticketAlreadyExists) {
        $pdo->commit();
        sendResponse(true, ['ticketId' => $ticketId, 'skippedDeleted' => true], 'Tiket sudah tidak ada di database (dihapus), dilewati.');
    }

    // A. Simpan / Perbarui Tiket (Idempoten via ON DUPLICATE KEY UPDATE)
    $stmtTicket = $pdo->prepare("
        INSERT INTO `tickets` (
            `id`, `applicant_nip`, `applicant_name`, `applicant_phone`, `department`,
            `category`, `type`, `destination`, `reason`, `transport_mode`, `vehicle_plate`,
            `planned_exit`, `estimated_return`, `status`, `is_emergency`, `is_group_dinas`,
            `approver_nip`, `approver_name`, `approver_title`, `approver_note`,
            `emergency_authorizer_nip`, `emergency_authorizer_name`, `emergency_authorizer_phone`,
            `emergency_authorization_note`, `emergency_verified_at`,
            `scan_out_gate`, `security_officer_out`, `scan_out_time`,
            `scan_in_gate`, `security_officer_in`, `scan_in_time`,
            `tap_in_time`, `tap_in_member`, `tap_in_nip`,
            `arrival_reported_time`, `arrival_reported_at`, `time_frozen`,
            `document_name`, `document_url`, `created_at`
        ) VALUES (
            :id, :applicant_nip, :applicant_name, :applicant_phone, :department,
            :category, :type, :destination, :reason, :transport_mode, :vehicle_plate,
            :planned_exit, :estimated_return, :status, :is_emergency, :is_group_dinas,
            :approver_nip, :approver_name, :approver_title, :approver_note,
            :emergency_authorizer_nip, :emergency_authorizer_name, :emergency_authorizer_phone,
            :emergency_authorization_note, :emergency_verified_at,
            :scan_out_gate, :security_officer_out, :scan_out_time,
            :scan_in_gate, :security_officer_in, :scan_in_time,
            :tap_in_time, :tap_in_member, :tap_in_nip,
            :arrival_reported_time, :arrival_reported_at, :time_frozen,
            :document_name, :document_url, NOW()
        )
        ON DUPLICATE KEY UPDATE
            `status` = VALUES(`status`),
            `approver_nip` = COALESCE(VALUES(`approver_nip`), `approver_nip`),
            `approver_name` = COALESCE(VALUES(`approver_name`), `approver_name`),
            `approver_title` = COALESCE(VALUES(`approver_title`), `approver_title`),
            `approver_note` = COALESCE(VALUES(`approver_note`), `approver_note`),
            `scan_out_gate` = CASE WHEN VALUES(`status`) IN ('Menunggu Persetujuan', 'Disetujui', 'Menunggu Otorisasi Darurat') THEN NULL ELSE COALESCE(VALUES(`scan_out_gate`), `scan_out_gate`) END,
            `security_officer_out` = CASE WHEN VALUES(`status`) IN ('Menunggu Persetujuan', 'Disetujui', 'Menunggu Otorisasi Darurat') THEN NULL ELSE COALESCE(VALUES(`security_officer_out`), `security_officer_out`) END,
            `scan_out_time` = CASE WHEN VALUES(`status`) IN ('Menunggu Persetujuan', 'Disetujui', 'Menunggu Otorisasi Darurat') THEN NULL ELSE COALESCE(VALUES(`scan_out_time`), `scan_out_time`) END,
            `scan_in_gate` = CASE WHEN VALUES(`status`) IN ('Menunggu Persetujuan', 'Disetujui', 'Sedang di Luar', 'Terlambat') THEN NULL ELSE COALESCE(VALUES(`scan_in_gate`), `scan_in_gate`) END,
            `security_officer_in` = CASE WHEN VALUES(`status`) IN ('Menunggu Persetujuan', 'Disetujui', 'Sedang di Luar', 'Terlambat') THEN NULL ELSE COALESCE(VALUES(`security_officer_in`), `security_officer_in`) END,
            `scan_in_time` = CASE WHEN VALUES(`status`) IN ('Menunggu Persetujuan', 'Disetujui', 'Sedang di Luar', 'Terlambat') THEN NULL ELSE COALESCE(VALUES(`scan_in_time`), `scan_in_time`) END,
            `tap_in_time` = CASE WHEN VALUES(`status`) IN ('Menunggu Persetujuan', 'Disetujui', 'Sedang di Luar', 'Terlambat') THEN NULL ELSE COALESCE(VALUES(`tap_in_time`), `tap_in_time`) END,
            `tap_in_member` = COALESCE(VALUES(`tap_in_member`), `tap_in_member`),
            `tap_in_nip` = COALESCE(VALUES(`tap_in_nip`), `tap_in_nip`),
            `arrival_reported_time` = COALESCE(VALUES(`arrival_reported_time`), `arrival_reported_time`),
            `arrival_reported_at` = COALESCE(VALUES(`arrival_reported_at`), `arrival_reported_at`),
            `time_frozen` = VALUES(`time_frozen`),
            `updated_at` = NOW()
    ");

    $stmtTicket->execute([
        ':id' => $ticketId,
        ':applicant_nip' => $applicantNip,
        ':applicant_name' => $applicantName,
        ':applicant_phone' => isset($input['applicantPhone']) ? $input['applicantPhone'] : null,
        ':department' => $department,
        ':category' => $category,
        ':type' => $type,
        ':destination' => $destination,
        ':reason' => $reason,
        ':transport_mode' => isset($input['transportMode']) ? $input['transportMode'] : 'Kendaraan dinas',
        ':vehicle_plate' => isset($input['vehiclePlate']) ? $input['vehiclePlate'] : null,
        ':planned_exit' => date('Y-m-d H:i:s', strtotime($plannedExit)),
        ':estimated_return' => date('Y-m-d H:i:s', strtotime($estimatedReturn)),
        ':status' => $status,
        ':is_emergency' => $isEmergency,
        ':is_group_dinas' => $isGroupDinas,
        ':approver_nip' => isset($input['approverNip']) ? $input['approverNip'] : null,
        ':approver_name' => isset($input['approverName']) ? $input['approverName'] : null,
        ':approver_title' => isset($input['approverTitle']) ? $input['approverTitle'] : null,
        ':approver_note' => isset($input['approverNote']) ? $input['approverNote'] : null,
        ':emergency_authorizer_nip' => isset($input['emergencyAuthorizerNip']) ? $input['emergencyAuthorizerNip'] : null,
        ':emergency_authorizer_name' => isset($input['emergencyAuthorizerName']) ? $input['emergencyAuthorizerName'] : null,
        ':emergency_authorizer_phone' => isset($input['emergencyAuthorizerPhone']) ? $input['emergencyAuthorizerPhone'] : null,
        ':emergency_authorization_note' => isset($input['emergencyAuthorizationNote']) ? $input['emergencyAuthorizationNote'] : null,
        ':emergency_verified_at' => $isEmergency ? date('Y-m-d H:i:s') : null,
        ':scan_out_gate' => $scanOutGate,
        ':security_officer_out' => $securityOfficerOut,
        ':scan_out_time' => $scanOutTime,
        ':scan_in_gate' => $scanInGate,
        ':security_officer_in' => $securityOfficerIn,
        ':scan_in_time' => $scanInTime,
        ':tap_in_time' => $tapInTime,
        ':tap_in_member' => $tapInMember,
        ':tap_in_nip' => $tapInNip,
        ':arrival_reported_time' => $arrivalReportedTime,
        ':arrival_reported_at' => $arrivalReportedAt,
        ':time_frozen' => $timeFrozen,
        ':document_name' => isset($input['documentName']) ? $input['documentName'] : null,
        ':document_url' => isset($input['documentUrl']) ? $input['documentUrl'] : null,
    ]);

    // B. Simpan Anggota Tim (Jika Group Dinas)
    if ($isGroupDinas && !empty($input['members']) && is_array($input['members'])) {
        $stmtInsertMbr = $pdo->prepare("
            INSERT INTO `ticket_members` (`ticket_id`, `nip`, `name`, `department`, `role`, `status`)
            VALUES (:ticket_id, :nip, :name, :department, :role, :status)
        ");
        $stmtUpdateMbr = $pdo->prepare("
            UPDATE `ticket_members` 
            SET `status` = :status, `name` = :name, `department` = :department, `role` = :role
            WHERE `ticket_id` = :ticket_id AND `nip` = :nip
        ");
        foreach ($input['members'] as $mbr) {
            if (!empty($mbr['nip']) && !empty($mbr['name'])) {
                $mbrStatus = (isset($mbr['status']) && in_array(strtolower($mbr['status']), ['batal', 'cancelled'])) ? 'batal' : 'aktif';
                $stmtChkMbr = $pdo->prepare("SELECT `id` FROM `ticket_members` WHERE `ticket_id` = :tid AND `nip` = :nip");
                $stmtChkMbr->execute([':tid' => $ticketId, ':nip' => $mbr['nip']]);
                if ($stmtChkMbr->fetch()) {
                    $stmtUpdateMbr->execute([
                        ':status' => $mbrStatus,
                        ':name' => $mbr['name'],
                        ':department' => isset($mbr['department']) ? $mbr['department'] : $department,
                        ':role' => isset($mbr['role']) ? $mbr['role'] : 'Anggota',
                        ':ticket_id' => $ticketId,
                        ':nip' => $mbr['nip']
                    ]);
                } else {
                    $stmtInsertMbr->execute([
                        ':ticket_id' => $ticketId,
                        ':nip' => $mbr['nip'],
                        ':name' => $mbr['name'],
                        ':department' => isset($mbr['department']) ? $mbr['department'] : $department,
                        ':role' => isset($mbr['role']) ? $mbr['role'] : 'Anggota',
                        ':status' => $mbrStatus
                    ]);
                }
            }
        }
    }

    // C. Simpan Jejak Audit (Timeline) - Tanpa Duplikasi
    $currentTimeDisplay = date('d M Y, H.i \W\I\B');
    $stmtCheckTl = $pdo->prepare("
        SELECT `id` FROM `ticket_timeline` 
        WHERE `ticket_id` = :ticket_id AND `event` = :event AND `event_time` = :event_time
    ");
    $stmtInsertTl = $pdo->prepare("
        INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`, `gate`)
        VALUES (:ticket_id, :event, :event_time, :actor_by, :description, :gate)
    ");

    if (!empty($input['timeline']) && is_array($input['timeline'])) {
        foreach ($input['timeline'] as $tl) {
            $evName = isset($tl['event']) ? $tl['event'] : '';
            $evTime = isset($tl['time']) ? $tl['time'] : $currentTimeDisplay;
            $stmtCheckTl->execute([':ticket_id' => $ticketId, ':event' => $evName, ':event_time' => $evTime]);
            if (!$stmtCheckTl->fetch()) {
                $stmtInsertTl->execute([
                    ':ticket_id' => $ticketId,
                    ':event' => $evName,
                    ':event_time' => $evTime,
                    ':actor_by' => isset($tl['by']) ? $tl['by'] : $applicantName,
                    ':description' => isset($tl['desc']) ? $tl['desc'] : "{$category} — {$type}",
                    ':gate' => isset($tl['gate']) ? $tl['gate'] : null
                ]);
            }
        }
    } else {
        $initEvent = $isEmergency ? 'Pengajuan Darurat Tercatat' : 'Pengajuan dibuat';
        $stmtCheckTl->execute([':ticket_id' => $ticketId, ':event' => $initEvent, ':event_time' => $currentTimeDisplay]);
        if (!$stmtCheckTl->fetch()) {
            $initDesc = $isEmergency ? 'Izin darurat keluar area pabrik langsung menuju pos pengamanan' : "{$category} — {$type}";
            $stmtInsertTl->execute([
                ':ticket_id' => $ticketId,
                ':event' => $initEvent,
                ':event_time' => $currentTimeDisplay,
                ':actor_by' => $applicantName,
                ':description' => $initDesc,
                ':gate' => null
            ]);
        }
    }

    // D. Buat Notifikasi untuk Atasan (HANYA saat tiket benar-benar baru dibuat & belum berstatus final)
    $approverNip = isset($input['approverNip']) ? $input['approverNip'] : null;
    $approverName = isset($input['approverName']) ? $input['approverName'] : null;
    $isFinalStatus = in_array($status, ['Selesai', 'Selesai (Terlambat)', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa']);
    if (!$ticketAlreadyExists && empty($input['updateOnly']) && !$isFinalStatus && ($approverNip || $approverName)) {
        $stmtChkNotif = $pdo->prepare("SELECT `id` FROM `notifications` WHERE `ticket_id` = :tid AND `recipient_role` = 'approver'");
        $stmtChkNotif->execute([':tid' => $ticketId]);
        if (!$stmtChkNotif->fetch()) {
            $notifId = 'NOTIF-' . round(microtime(true) * 1000) . '-' . rand(100, 999);
            $notifTitle = $isEmergency ? '🚨 Izin Darurat: ' . $applicantName : 'Permohonan Izin Baru: ' . $applicantName;
            $notifMsg = "{$applicantName} mengajukan izin {$category} ({$destination}) untuk keperluan: {$reason}";

            $stmtNotif = $pdo->prepare("
                INSERT INTO `notifications` (`id`, `recipient_role`, `recipient_nip`, `recipient_name`, `actor_source`, `type`, `priority`, `title`, `message`, `ticket_id`, `is_read`, `created_at`)
                VALUES (:id, 'approver', :recipient_nip, :recipient_name, 'karyawan', :type, :priority, :title, :message, :ticket_id, 0, NOW())
            ");
            $stmtNotif->execute([
                ':id' => $notifId,
                ':recipient_nip' => $approverNip,
                ':recipient_name' => $approverName,
                ':type' => $isEmergency ? 'warning' : 'info',
                ':priority' => $isEmergency ? 'high' : 'normal',
                ':title' => $notifTitle,
                ':message' => $notifMsg,
                ':ticket_id' => $ticketId
            ]);
        }
    }

    // E. Sinkronkan Status Soft Delete (Riwayat Terhapus per Aktor)
    $stmtSd = $pdo->prepare("
        INSERT INTO `ticket_soft_deletes` (`ticket_id`, `deleted_by_role`, `deleted_by_nip`, `deleted_at`)
        VALUES (:ticket_id, :role, :nip, NOW())
        ON DUPLICATE KEY UPDATE `deleted_at` = NOW()
    ");
    if (!empty($input['deletedByKaryawanNips']) && is_array($input['deletedByKaryawanNips'])) {
        foreach ($input['deletedByKaryawanNips'] as $knip) {
            $knipClean = trim((string)$knip);
            if ($knipClean !== '') {
                $stmtSd->execute([':ticket_id' => $ticketId, ':role' => 'karyawan', ':nip' => $knipClean]);
            }
        }
    } elseif (!empty($input['deletedByKaryawan'])) {
        $stmtSd->execute([':ticket_id' => $ticketId, ':role' => 'karyawan', ':nip' => $applicantNip ?: '']);
    }
    if (!empty($input['deletedByApproverNips']) && is_array($input['deletedByApproverNips'])) {
        foreach ($input['deletedByApproverNips'] as $anip) {
            $anipClean = trim((string)$anip);
            if ($anipClean !== '') {
                $stmtSd->execute([':ticket_id' => $ticketId, ':role' => 'approver', ':nip' => $anipClean]);
            }
        }
    }
    if (!empty($input['deletedByApprover1'])) {
        $stmtSd->execute([':ticket_id' => $ticketId, ':role' => 'approver', ':nip' => 'PK-2015-1002']);
    }
    if (!empty($input['deletedByApprover2'])) {
        $stmtSd->execute([':ticket_id' => $ticketId, ':role' => 'approver2', ':nip' => 'PK-2012-0845']);
    }
    if (!empty($input['deletedBySecurity'])) {
        $stmtSd->execute([':ticket_id' => $ticketId, ':role' => 'security', ':nip' => '']);
    }
    if (!empty($input['deletedFromAudit'])) {
        $stmtSd->execute([':ticket_id' => $ticketId, ':role' => 'admin', ':nip' => '']);
    }

    $pdo->commit();

    sendResponse(true, ['id' => $ticketId, 'status' => $status], 'Tiket berhasil disinkronisasi ke database MySQL', 200);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse(false, null, 'Gagal menyimpan tiket: ' . $e->getMessage(), 500);
}
