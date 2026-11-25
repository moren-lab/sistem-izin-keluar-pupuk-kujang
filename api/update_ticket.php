<?php
/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
 * API: Update Ticket Status & Lifecycle Actions
 * Actions: approve, reject, cancel, scan_out, tap_in, request_extension, approve_extension, reject_extension, cancel_extension
 */

require_once __DIR__ . '/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Metode HTTP harus POST', 405);
}

$input = getJsonInput();

$ticketId = isset($input['ticketId']) ? trim($input['ticketId']) : '';
$action = isset($input['action']) ? trim($input['action']) : '';

if (!$ticketId || !$action) {
    sendResponse(false, null, 'Parameter ticketId dan action wajib disertakan', 400);
}

// Cek keberadaan tiket
$stmtCheck = $pdo->prepare("SELECT * FROM `tickets` WHERE `id` = :id");
$stmtCheck->execute([':id' => $ticketId]);
$ticket = $stmtCheck->fetch();

if (!$ticket) {
    sendResponse(false, null, "Tiket {$ticketId} tidak ditemukan", 404);
}

$nowDisplay = date('d M Y, H.i \W\I\B');

try {
    $pdo->beginTransaction();

    switch ($action) {
        // ==========================================
        // 1. ATASAN: MENYETUJUI PENGAJUAN
        // ==========================================
        case 'approve':
            $approverNip = isset($input['approverNip']) ? $input['approverNip'] : $ticket['approver_nip'];
            $approverName = isset($input['approverName']) ? $input['approverName'] : $ticket['approver_name'];
            $approverTitle = isset($input['approverTitle']) ? $input['approverTitle'] : $ticket['approver_title'];
            $approverNote = isset($input['approverNote']) ? $input['approverNote'] : 'Disetujui.';

            $stmt = $pdo->prepare("
                UPDATE `tickets`
                SET `status` = 'Disetujui',
                    `approver_nip` = :nip,
                    `approver_name` = :name,
                    `approver_title` = :title,
                    `approver_note` = :note,
                    `approved_at` = NOW()
                WHERE `id` = :id
            ");
            $stmt->execute([
                ':nip' => $approverNip,
                ':name' => $approverName,
                ':title' => $approverTitle,
                ':note' => $approverNote,
                ':id' => $ticketId
            ]);

            // Timeline
            $stmtTl = $pdo->prepare("
                INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`)
                VALUES (:ticket_id, 'Disetujui oleh atasan', :event_time, :actor_by, :description)
            ");
            $stmtTl->execute([
                ':ticket_id' => $ticketId,
                ':event_time' => $nowDisplay,
                ':actor_by' => $approverName ?: 'Atasan Peninjau',
                ':description' => $approverNote
            ]);

            // Notifikasi ke Karyawan Pemohon
            $stmtNotif = $pdo->prepare("
                INSERT INTO `notifications` (`id`, `recipient_role`, `recipient_nip`, `recipient_name`, `actor_source`, `type`, `priority`, `title`, `message`, `ticket_id`, `is_read`, `created_at`)
                VALUES (:id, 'karyawan', :recipient_nip, :recipient_name, 'approver', 'success', 'normal', :title, :message, :ticket_id, 0, NOW())
            ");
            $stmtNotif->execute([
                ':id' => 'NOTIF-' . round(microtime(true) * 1000) . '-' . rand(100, 999),
                ':recipient_nip' => $ticket['applicant_nip'],
                ':recipient_name' => $ticket['applicant_name'],
                ':title' => 'Pengajuan Izin Disetujui',
                ':message' => "Izin keluar Anda ke {$ticket['destination']} telah disetujui oleh {$approverName}.",
                ':ticket_id' => $ticketId
            ]);
            break;

        // ==========================================
        // 2. ATASAN: MENOLAK PENGAJUAN
        // ==========================================
        case 'reject':
            $rejectionReason = isset($input['rejectionReason']) ? trim($input['rejectionReason']) : 'Tidak disetujui.';
            $approverName = isset($input['approverName']) ? $input['approverName'] : $ticket['approver_name'];

            $stmt = $pdo->prepare("
                UPDATE `tickets`
                SET `status` = 'Ditolak',
                    `rejection_reason` = :reason,
                    `approver_note` = :reason
                WHERE `id` = :id
            ");
            $stmt->execute([
                ':reason' => $rejectionReason,
                ':id' => $ticketId
            ]);

            // Timeline
            $stmtTl = $pdo->prepare("
                INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`)
                VALUES (:ticket_id, 'Pengajuan Ditolak', :event_time, :actor_by, :description)
            ");
            $stmtTl->execute([
                ':ticket_id' => $ticketId,
                ':event_time' => $nowDisplay,
                ':actor_by' => $approverName ?: 'Atasan Peninjau',
                ':description' => "Alasan: {$rejectionReason}"
            ]);

            // Notifikasi ke Karyawan Pemohon
            $stmtNotif = $pdo->prepare("
                INSERT INTO `notifications` (`id`, `recipient_role`, `recipient_nip`, `recipient_name`, `actor_source`, `type`, `priority`, `title`, `message`, `ticket_id`, `is_read`, `created_at`)
                VALUES (:id, 'karyawan', :recipient_nip, :recipient_name, 'approver', 'error', 'high', :title, :message, :ticket_id, 0, NOW())
            ");
            $stmtNotif->execute([
                ':id' => 'NOTIF-' . round(microtime(true) * 1000) . '-' . rand(100, 999),
                ':recipient_nip' => $ticket['applicant_nip'],
                ':recipient_name' => $ticket['applicant_name'],
                ':title' => 'Pengajuan Izin Ditolak',
                ':message' => "Izin keluar Anda ke {$ticket['destination']} ditolak. Alasan: {$rejectionReason}",
                ':ticket_id' => $ticketId
            ]);
            break;

        // ==========================================
        // 3. KARYAWAN / ADMIN: MEMBATALKAN PENGAJUAN
        // ==========================================
        case 'cancel':
            $cancellationReason = isset($input['cancellationReason']) ? trim($input['cancellationReason']) : 'Dibatalkan oleh pemohon.';
            $cancelledBy = isset($input['cancelledBy']) ? $input['cancelledBy'] : $ticket['applicant_name'];

            $stmt = $pdo->prepare("
                UPDATE `tickets`
                SET `status` = 'Dibatalkan',
                    `cancellation_reason` = :reason
                WHERE `id` = :id
            ");
            $stmt->execute([
                ':reason' => $cancellationReason,
                ':id' => $ticketId
            ]);

            // Timeline
            $stmtTl = $pdo->prepare("
                INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`)
                VALUES (:ticket_id, 'Pengajuan Dibatalkan', :event_time, :actor_by, :description)
            ");
            $stmtTl->execute([
                ':ticket_id' => $ticketId,
                ':event_time' => $nowDisplay,
                ':actor_by' => $cancelledBy,
                ':description' => "Alasan: {$cancellationReason}"
            ]);
            break;

        // ==========================================
        // 4. POS JAGA: SCAN OUT (KELUAR GERBANG)
        // ==========================================
        case 'scan_out':
            $gate = isset($input['gate']) ? $input['gate'] : 'Pos 1 Gerbang Utama';
            $officer = isset($input['officer']) ? $input['officer'] : 'Petugas Keamanan';
            $scanOutTime = "{$nowDisplay} ({$gate})";

            $stmt = $pdo->prepare("
                UPDATE `tickets`
                SET `status` = 'Sedang di Luar',
                    `scan_out_gate` = :gate,
                    `security_officer_out` = :officer,
                    `scan_out_time` = :scan_time
                WHERE `id` = :id
            ");
            $stmt->execute([
                ':gate' => $gate,
                ':officer' => $officer,
                ':scan_time' => $scanOutTime,
                ':id' => $ticketId
            ]);

            // Timeline
            $stmtTl = $pdo->prepare("
                INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`, `gate`)
                VALUES (:ticket_id, 'Scan Out tercatat', :event_time, :actor_by, :description, :gate)
            ");
            $stmtTl->execute([
                ':ticket_id' => $ticketId,
                ':event_time' => $nowDisplay,
                ':actor_by' => "{$officer} ({$gate})",
                ':description' => "Karyawan meninggalkan kawasan pabrik melalui {$gate}.",
                ':gate' => $gate
            ]);
            break;

        // ==========================================
        // 5. POS JAGA: TAP IN / FINISH (KEMBALI KE AREA)
        // ==========================================
        case 'tap_in':
            $gate = isset($input['gate']) ? $input['gate'] : 'Pos 1 Gerbang Utama';
            $officer = isset($input['officer']) ? $input['officer'] : 'Petugas Keamanan';
            $scanInTime = "{$nowDisplay} ({$gate})";
            $isLate = !empty($input['isLate']) ? 1 : 0;
            $lateMinutes = isset($input['lateMinutes']) ? (int)$input['lateMinutes'] : 0;

            $stmt = $pdo->prepare("
                UPDATE `tickets`
                SET `status` = 'Selesai',
                    `scan_in_gate` = :gate,
                    `security_officer_in` = :officer,
                    `scan_in_time` = :scan_time,
                    `is_late` = :is_late,
                    `late_minutes` = :late_minutes
                WHERE `id` = :id
            ");
            $stmt->execute([
                ':gate' => $gate,
                ':officer' => $officer,
                ':scan_time' => $scanInTime,
                ':is_late' => $isLate,
                ':late_minutes' => $lateMinutes,
                ':id' => $ticketId
            ]);

            // Timeline
            $tlEvent = $isLate ? 'Tap In Terlambat' : 'Tap In tercatat';
            $tlDesc = $isLate
                ? "Karyawan kembali {$lateMinutes} menit melewati estimasi melalui {$gate}."
                : "Karyawan kembali tepat waktu ke kawasan pabrik melalui {$gate}.";

            $stmtTl = $pdo->prepare("
                INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`, `gate`)
                VALUES (:ticket_id, :event, :event_time, :actor_by, :description, :gate)
            ");
            $stmtTl->execute([
                ':ticket_id' => $ticketId,
                ':event' => $tlEvent,
                ':event_time' => $nowDisplay,
                ':actor_by' => "{$officer} ({$gate})",
                ':description' => $tlDesc,
                ':gate' => $gate
            ]);

            // Bukti foto kedatangan (jika ada)
            if (!empty($input['arrivalProofPhoto'])) {
                $stmtPhoto = $pdo->prepare("
                    INSERT INTO `ticket_arrival_proofs` (`ticket_id`, `photo_url`, `caption`, `uploaded_at`)
                    VALUES (:ticket_id, :photo, :caption, NOW())
                ");
                $stmtPhoto->execute([
                    ':ticket_id' => $ticketId,
                    ':photo' => $input['arrivalProofPhoto'],
                    ':caption' => isset($input['photoCaption']) ? $input['photoCaption'] : 'Foto verifikasi kehadiran di pos jaga'
                ]);
            }

            // Selesaikan permohonan perpanjangan yang masih pending (jika ada)
            $stmtClearExt = $pdo->prepare("UPDATE `ticket_extensions` SET `status` = 'Diselesaikan', `decided_at` = NOW() WHERE `ticket_id` = :ticket_id AND `status` = 'Menunggu Persetujuan'");
            $stmtClearExt->execute([':ticket_id' => $ticketId]);
            break;

        // ==========================================
        // 6. PERPANJANGAN WAKTU (EXTENSIONS)
        // ==========================================
        case 'request_extension':
            $newEstimatedReturn = isset($input['newEstimatedReturn']) ? $input['newEstimatedReturn'] : '';
            $extensionReason = isset($input['reason']) ? $input['reason'] : '';

            if (!$newEstimatedReturn || !$extensionReason) {
                sendResponse(false, null, 'Waktu kembali baru dan alasan perpanjangan wajib diisi', 400);
            }

            // Cegah duplikasi antrean perpanjangan ghoib jika permohonan pending sudah ada
            $stmtChkPending = $pdo->prepare("SELECT `id` FROM `ticket_extensions` WHERE `ticket_id` = :ticket_id AND `status` = 'Menunggu Persetujuan' LIMIT 1");
            $stmtChkPending->execute([':ticket_id' => $ticketId]);
            $existingPending = $stmtChkPending->fetch();

            if ($existingPending) {
                $stmtExt = $pdo->prepare("
                    UPDATE `ticket_extensions`
                    SET `new_estimated_return` = :new_time, `extension_reason` = :reason, `requested_at` = NOW()
                    WHERE `id` = :id
                ");
                $stmtExt->execute([
                    ':new_time' => date('Y-m-d H:i:s', strtotime($newEstimatedReturn)),
                    ':reason' => $extensionReason,
                    ':id' => $existingPending['id']
                ]);
            } else {
                $stmtExt = $pdo->prepare("
                    INSERT INTO `ticket_extensions` (`ticket_id`, `new_estimated_return`, `extension_reason`, `status`, `requested_at`)
                    VALUES (:ticket_id, :new_time, :reason, 'Menunggu Persetujuan', NOW())
                ");
                $stmtExt->execute([
                    ':ticket_id' => $ticketId,
                    ':new_time' => date('Y-m-d H:i:s', strtotime($newEstimatedReturn)),
                    ':reason' => $extensionReason
                ]);

                // Timeline hanya dicatat saat pertama kali diajukan
                $stmtTl = $pdo->prepare("
                    INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`)
                    VALUES (:ticket_id, 'Permohonan Perpanjangan Diajukan', :event_time, :actor_by, :description)
                ");
                $stmtTl->execute([
                    ':ticket_id' => $ticketId,
                    ':event_time' => $nowDisplay,
                    ':actor_by' => $ticket['applicant_name'],
                    ':description' => "Perpanjangan s/d {$newEstimatedReturn}. Alasan: {$extensionReason}"
                ]);
            }
            break;

        case 'approve_extension':
            $extensionId = isset($input['extensionId']) ? (int)$input['extensionId'] : 0;
            $approverName = isset($input['approverName']) ? $input['approverName'] : $ticket['approver_name'];
            $note = isset($input['note']) ? $input['note'] : 'Perpanjangan disetujui.';

            // Ambil data perpanjangan (fallback jika ID tidak disertakan)
            if ($extensionId > 0) {
                $stmtGet = $pdo->prepare("SELECT * FROM `ticket_extensions` WHERE `id` = :id");
                $stmtGet->execute([':id' => $extensionId]);
            } else {
                $stmtGet = $pdo->prepare("SELECT * FROM `ticket_extensions` WHERE `ticket_id` = :ticket_id AND `status` = 'Menunggu Persetujuan' ORDER BY `id` DESC LIMIT 1");
                $stmtGet->execute([':ticket_id' => $ticketId]);
            }
            $extData = $stmtGet->fetch();

            if ($extData) {
                $stmtExt = $pdo->prepare("
                    UPDATE `ticket_extensions`
                    SET `status` = 'Disetujui', `approver_note` = :note, `decided_at` = NOW()
                    WHERE `id` = :id
                ");
                $stmtExt->execute([':note' => $note, ':id' => $extData['id']]);

                // Update estimasi kembali tiket utama
                $stmtUpTicket = $pdo->prepare("UPDATE `tickets` SET `estimated_return` = :ret WHERE `id` = :id");
                $stmtUpTicket->execute([':ret' => $extData['new_estimated_return'], ':id' => $ticketId]);

                // Timeline
                $stmtTl = $pdo->prepare("
                    INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`)
                    VALUES (:ticket_id, 'Perpanjangan Waktu Disetujui', :event_time, :actor_by, :description)
                ");
                $stmtTl->execute([
                    ':ticket_id' => $ticketId,
                    ':event_time' => $nowDisplay,
                    ':actor_by' => $approverName,
                    ':description' => "Estimasi kembali diperbarui s/d {$extData['new_estimated_return']}. Catatan: {$note}"
                ]);
            }
            break;

        case 'reject_extension':
            $extensionId = isset($input['extensionId']) ? (int)$input['extensionId'] : 0;
            $approverName = isset($input['approverName']) ? $input['approverName'] : $ticket['approver_name'];
            $note = isset($input['note']) ? $input['note'] : 'Perpanjangan ditolak, harap kembali segera.';

            if ($extensionId > 0) {
                $stmtGet = $pdo->prepare("SELECT * FROM `ticket_extensions` WHERE `id` = :id");
                $stmtGet->execute([':id' => $extensionId]);
            } else {
                $stmtGet = $pdo->prepare("SELECT * FROM `ticket_extensions` WHERE `ticket_id` = :ticket_id AND `status` = 'Menunggu Persetujuan' ORDER BY `id` DESC LIMIT 1");
                $stmtGet->execute([':ticket_id' => $ticketId]);
            }
            $extData = $stmtGet->fetch();

            if ($extData) {
                $stmtExt = $pdo->prepare("
                    UPDATE `ticket_extensions`
                    SET `status` = 'Ditolak', `approver_note` = :note, `decided_at` = NOW()
                    WHERE `id` = :id
                ");
                $stmtExt->execute([':note' => $note, ':id' => $extData['id']]);

                // Timeline
                $stmtTl = $pdo->prepare("
                    INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`)
                    VALUES (:ticket_id, 'Perpanjangan Waktu Ditolak', :event_time, :actor_by, :description)
                ");
                $stmtTl->execute([
                    ':ticket_id' => $ticketId,
                    ':event_time' => $nowDisplay,
                    ':actor_by' => $approverName,
                    ':description' => "Permohonan perpanjangan ditolak. Catatan: {$note}"
                ]);
            }
            break;

        case 'cancel_extension':
            $stmtExt = $pdo->prepare("
                UPDATE `ticket_extensions`
                SET `status` = 'Dibatalkan', `decided_at` = NOW()
                WHERE `ticket_id` = :ticket_id AND `status` = 'Menunggu Persetujuan'
            ");
            $stmtExt->execute([':ticket_id' => $ticketId]);

            $stmtTl = $pdo->prepare("
                INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`)
                VALUES (:ticket_id, 'Perpanjangan Dibatalkan', :event_time, :actor_by, :description)
            ");
            $stmtTl->execute([
                ':ticket_id' => $ticketId,
                ':event_time' => $nowDisplay,
                ':actor_by' => $ticket['applicant_name'],
                ':description' => 'Permohonan perpanjangan waktu dibatalkan mandiri sebelum disetujui Atasan.'
            ]);
            break;

        // ==========================================
        // 7. PEMBATALAN ANGGOTA DINAS BERSAMA
        // ==========================================
        case 'cancel_member':
            $memberNip = isset($input['memberNip']) ? trim($input['memberNip']) : '';
            $memberName = isset($input['memberName']) ? trim($input['memberName']) : 'Anggota Tim';
            if (!$memberNip) {
                sendResponse(false, null, 'NIP anggota wajib disertakan', 400);
            }

            $stmtUpMbr = $pdo->prepare("UPDATE `ticket_members` SET `status` = 'batal' WHERE `ticket_id` = :ticket_id AND `nip` = :nip");
            $stmtUpMbr->execute([':ticket_id' => $ticketId, ':nip' => $memberNip]);

            // Timeline
            $stmtTl = $pdo->prepare("
                INSERT INTO `ticket_timeline` (`ticket_id`, `event`, `event_time`, `actor_by`, `description`)
                VALUES (:ticket_id, 'Anggota Mundur dari Tim', :event_time, :actor_by, :description)
            ");
            $stmtTl->execute([
                ':ticket_id' => $ticketId,
                ':event_time' => $nowDisplay,
                ':actor_by' => "{$memberName} (Anggota Tim)",
                ':description' => "{$memberName} membatalkan keikutsertaan dalam dinas bersama ini. Pengajuan tetap berjalan untuk anggota lainnya."
            ]);
            break;

        default:
            sendResponse(false, null, "Aksi '{$action}' tidak dikenal", 400);
    }

    $pdo->commit();
    sendResponse(true, ['ticketId' => $ticketId, 'action' => $action], "Aksi {$action} berhasil diproses");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse(false, null, 'Gagal memperbarui status tiket: ' . $e->getMessage(), 500);
}
