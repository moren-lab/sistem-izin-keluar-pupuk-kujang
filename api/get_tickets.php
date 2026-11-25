<?php
/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
 * API: Get All Tickets with Full Relations (Timeline, Members, Extensions, Proofs)
 */

require_once __DIR__ . '/koneksi.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    $actorRole = isset($_GET['role']) ? trim($_GET['role']) : null;
    $actorNip = isset($_GET['nip']) ? trim($_GET['nip']) : null;
    $ticketId = isset($_GET['id']) ? trim($_GET['id']) : null;

    // 1. Fetch tickets
    $sql = "SELECT * FROM `tickets`";
    $params = [];

    if ($ticketId) {
        $sql .= " WHERE `id` = :id";
        $params[':id'] = $ticketId;
    }

    $sql .= " ORDER BY `created_at` DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rawTickets = $stmt->fetchAll();

    if (empty($rawTickets)) {
        sendResponse(true, [], 'Tidak ada tiket ditemukan');
    }

    $ticketIds = array_column($rawTickets, 'id');
    $inPlaceholders = implode(',', array_fill(0, count($ticketIds), '?'));

    // 2. Fetch Timelines
    $stmtTimeline = $pdo->prepare("SELECT * FROM `ticket_timeline` WHERE `ticket_id` IN ({$inPlaceholders}) ORDER BY `id` ASC");
    $stmtTimeline->execute($ticketIds);
    $allTimelines = $stmtTimeline->fetchAll();
    $timelineMap = [];
    foreach ($allTimelines as $tl) {
        $tId = $tl['ticket_id'];
        if (!isset($timelineMap[$tId])) $timelineMap[$tId] = [];
        $timelineMap[$tId][] = [
            'event' => $tl['event'],
            'time' => $tl['event_time'],
            'by' => $tl['actor_by'],
            'desc' => $tl['description'],
            'gate' => $tl['gate']
        ];
    }

    // 3. Fetch Members (Group Dinas)
    $stmtMembers = $pdo->prepare("SELECT * FROM `ticket_members` WHERE `ticket_id` IN ({$inPlaceholders}) ORDER BY `id` ASC");
    $stmtMembers->execute($ticketIds);
    $allMembers = $stmtMembers->fetchAll();
    $membersMap = [];
    foreach ($allMembers as $m) {
        $tId = $m['ticket_id'];
        if (!isset($membersMap[$tId])) $membersMap[$tId] = [];
        $membersMap[$tId][] = [
            'nip' => $m['nip'],
            'name' => $m['name'],
            'department' => $m['department'],
            'role' => $m['role'],
            'status' => $m['status']
        ];
    }

    // 4. Fetch Extensions
    $stmtExt = $pdo->prepare("SELECT * FROM `ticket_extensions` WHERE `ticket_id` IN ({$inPlaceholders}) ORDER BY `id` DESC");
    $stmtExt->execute($ticketIds);
    $allExtensions = $stmtExt->fetchAll();
    $extensionsMap = [];
    $pendingExtMap = [];
    foreach ($allExtensions as $ext) {
        $tId = $ext['ticket_id'];
        if (!isset($extensionsMap[$tId])) $extensionsMap[$tId] = [];
        $extensionsMap[$tId][] = $ext;
        if ($ext['status'] === 'Menunggu Persetujuan' && !isset($pendingExtMap[$tId])) {
            $pendingExtMap[$tId] = [
                'id' => $ext['id'],
                'newEstimatedReturn' => $ext['new_estimated_return'],
                'reason' => $ext['extension_reason'],
                'status' => $ext['status'],
                'requestedAt' => $ext['requested_at']
            ];
        }
    }

    // 5. Fetch Arrival Proofs
    $stmtProofs = $pdo->prepare("SELECT * FROM `ticket_arrival_proofs` WHERE `ticket_id` IN ({$inPlaceholders}) ORDER BY `id` DESC");
    $stmtProofs->execute($ticketIds);
    $allProofs = $stmtProofs->fetchAll();
    $proofsMap = [];
    foreach ($allProofs as $p) {
        $tId = $p['ticket_id'];
        if (!isset($proofsMap[$tId])) {
            $proofsMap[$tId] = $p['photo_url'];
        }
    }

    // 6. Fetch Soft Deletes
    $stmtSoft = $pdo->prepare("SELECT * FROM `ticket_soft_deletes` WHERE `ticket_id` IN ({$inPlaceholders})");
    $stmtSoft->execute($ticketIds);
    $allSoft = $stmtSoft->fetchAll();
    $softDeletesMap = [];
    foreach ($allSoft as $sd) {
        $tId = $sd['ticket_id'];
        if (!isset($softDeletesMap[$tId])) {
            $softDeletesMap[$tId] = [
                'deletedByKaryawan' => false,
                'deletedByKaryawanNips' => [],
                'deletedByApprover1' => false,
                'deletedByApprover2' => false,
                'deletedByApproverNips' => [],
                'deletedBySecurity' => false,
                'deletedFromAudit' => false
            ];
        }
        $r = strtolower(trim($sd['deleted_by_role']));
        $sdNip = trim((string)$sd['deleted_by_nip']);
        if ($r === 'karyawan' || $r === 'karyawan2') {
            if ($sdNip !== '' && !in_array($sdNip, $softDeletesMap[$tId]['deletedByKaryawanNips'], true)) {
                $softDeletesMap[$tId]['deletedByKaryawanNips'][] = $sdNip;
            }
            if ($sdNip === '') {
                $softDeletesMap[$tId]['deletedByKaryawan'] = true;
            }
        } elseif ($r === 'approver' || $r === 'approver2') {
            if ($sdNip !== '' && !in_array($sdNip, $softDeletesMap[$tId]['deletedByApproverNips'], true)) {
                $softDeletesMap[$tId]['deletedByApproverNips'][] = $sdNip;
            }
            if ($r === 'approver2' || $sdNip === 'PK-2012-0845') {
                $softDeletesMap[$tId]['deletedByApprover2'] = true;
            } else {
                $softDeletesMap[$tId]['deletedByApprover1'] = true;
            }
        } elseif ($r === 'security') {
            $softDeletesMap[$tId]['deletedBySecurity'] = true;
        } elseif ($r === 'admin' || $r === 'audit') {
            $softDeletesMap[$tId]['deletedFromAudit'] = true;
        }
    }

    // 7. Format output list
    $formattedTickets = [];
    foreach ($rawTickets as $row) {
        $id = $row['id'];
        $soft = isset($softDeletesMap[$id]) ? $softDeletesMap[$id] : [
            'deletedByKaryawan' => false,
            'deletedByKaryawanNips' => [],
            'deletedByApprover1' => false,
            'deletedByApprover2' => false,
            'deletedByApproverNips' => [],
            'deletedBySecurity' => false,
            'deletedFromAudit' => false
        ];
        // Kompatibilitas flag deletedByKaryawan jika pemohon (applicant_nip) termasuk dalam daftar hapus
        $isDeletedByApplicant = $soft['deletedByKaryawan'] || (!empty($row['applicant_nip']) && in_array($row['applicant_nip'], $soft['deletedByKaryawanNips'], true));

        // Format date string for createdAt display
        $createdDt = !empty($row['created_at']) ? date('d M Y, H.i \W\I\B', strtotime($row['created_at'])) : '';

        // Normalisasi & Integritas Status Siklus Hidup Tiket:
        $curStatus = $row['status'];
        $sOut = $row['scan_out_time'];
        $sIn = $row['scan_in_time'];

        // 1. Jika sudah ada catatan Tap In / Masuk Kembali, status final adalah 'Selesai' (kecuali memang dibatalkan/ditolak)
        if (!empty($sIn) && !in_array($curStatus, ['Selesai', 'Selesai (Terlambat)', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa'])) {
            $curStatus = 'Selesai';
        }
        // 2. Jika sudah ada Scan Out tapi belum Tap In, status AKTIF adalah 'Sedang di Luar' (atau 'Terlambat')
        elseif (!empty($sOut) && empty($sIn) && in_array($curStatus, ['Menunggu Persetujuan', 'Disetujui', 'Menunggu Otorisasi Darurat'])) {
            $curStatus = 'Sedang di Luar';
        }
        // 3. Jika status masih 'Disetujui' atau 'Menunggu Persetujuan', tidak boleh ada scanOutTime atau scanInTime
        elseif (in_array($curStatus, ['Menunggu Persetujuan', 'Disetujui', 'Menunggu Otorisasi Darurat'])) {
            $sOut = null;
            $row['scan_out_gate'] = null;
            $row['security_officer_out'] = null;
            $sIn = null;
            $row['scan_in_gate'] = null;
            $row['security_officer_in'] = null;
            $row['tap_in_time'] = null;
        }

        $curStatus = $row['status'];
        // Cegah permohonan perpanjangan ghoib: hanya tiket yang sedang di luar/terlambat yang dapat memiliki pendingExtension
        $canHaveExtension = ($curStatus === 'Sedang di Luar' || $curStatus === 'Terlambat');
        $hasPendingExt = $canHaveExtension && isset($pendingExtMap[$id]);

        $ticket = [
            'id' => $row['id'],
            'applicantNip' => $row['applicant_nip'],
            'applicantName' => $row['applicant_name'],
            'applicantPhone' => $row['applicant_phone'],
            'department' => $row['department'],
            'category' => $row['category'],
            'type' => $row['type'],
            'destination' => $row['destination'],
            'reason' => $row['reason'],
            'transportMode' => $row['transport_mode'],
            'vehiclePlate' => $row['vehicle_plate'],
            'plannedExit' => $row['planned_exit'],
            'estimatedReturn' => $row['estimated_return'],
            'status' => $curStatus,
            'isEmergency' => (bool)$row['is_emergency'],
            'isGroupDinas' => (bool)$row['is_group_dinas'],
            'isLate' => (bool)$row['is_late'],
            'lateMinutes' => (int)$row['late_minutes'],
            'approverNip' => $row['approver_nip'],
            'approverName' => $row['approver_name'],
            'approverTitle' => $row['approver_title'],
            'approverNote' => $row['approver_note'],
            'approvedAt' => $row['approved_at'],
            'rejectionReason' => $row['rejection_reason'],
            'cancellationReason' => $row['cancellation_reason'],
            'emergencyAuthorizerNip' => $row['emergency_authorizer_nip'],
            'emergencyAuthorizerName' => $row['emergency_authorizer_name'],
            'emergencyAuthorizerPhone' => $row['emergency_authorizer_phone'],
            'emergencyAuthorizationNote' => $row['emergency_authorization_note'],
            'emergencyVerifiedAt' => $row['emergency_verified_at'],
            'scanOutGate' => $row['scan_out_gate'],
            'securityOfficerOut' => $row['security_officer_out'],
            'scanOutTime' => $sOut,
            'scanInGate' => $row['scan_in_gate'],
            'securityOfficerIn' => $row['security_officer_in'],
            'scanInTime' => $sIn,
            'tapInTime' => isset($row['tap_in_time']) ? $row['tap_in_time'] : null,
            'tapInMember' => isset($row['tap_in_member']) ? $row['tap_in_member'] : null,
            'tapInNip' => isset($row['tap_in_nip']) ? $row['tap_in_nip'] : null,
            'arrivalReportedTime' => isset($row['arrival_reported_time']) ? $row['arrival_reported_time'] : null,
            'arrivalReportedAt' => isset($row['arrival_reported_at']) ? $row['arrival_reported_at'] : null,
            'timeFrozen' => !empty($row['time_frozen']),
            'documentName' => $row['document_name'],
            'documentUrl' => $row['document_url'],
            'createdAt' => $createdDt ?: $row['created_at'],
            'rawCreatedAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
            'timeline' => isset($timelineMap[$id]) ? $timelineMap[$id] : [],
            'members' => isset($membersMap[$id]) ? $membersMap[$id] : [],
            'pendingExtension' => $hasPendingExt ? $pendingExtMap[$id] : null,
            'hasExtensionPending' => $hasPendingExt,
            'extensionRequestedTime' => $hasPendingExt ? $pendingExtMap[$id]['newEstimatedReturn'] : null,
            'extensionReason' => $hasPendingExt ? $pendingExtMap[$id]['reason'] : null,
            'extensionCount' => isset($extensionsMap[$id]) ? count($extensionsMap[$id]) : 0,
            'extensionApproved' => isset($extensionsMap[$id]) && array_reduce($extensionsMap[$id], function($c, $x) { return $c || $x['status'] === 'Disetujui'; }, false),
            'arrivalProofPhoto' => isset($proofsMap[$id]) ? $proofsMap[$id] : null,
            'deletedByKaryawan' => $isDeletedByApplicant,
            'deletedByKaryawanNips' => $soft['deletedByKaryawanNips'],
            'deletedByApprover1' => $soft['deletedByApprover1'],
            'deletedByApprover2' => $soft['deletedByApprover2'],
            'deletedByApproverNips' => $soft['deletedByApproverNips'],
            'deletedBySecurity' => $soft['deletedBySecurity'],
            'deletedFromAudit' => $soft['deletedFromAudit']
        ];

        $formattedTickets[] = $ticket;
    }

    sendResponse(true, $formattedTickets, 'Data tiket berhasil dimuat');

} catch (Exception $e) {
    sendResponse(false, null, 'Terjadi kesalahan server: ' . $e->getMessage(), 500);
}
