<?php
/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
 * API: Delete Ticket (Soft Delete Per Aktor & Hard Purge oleh Admin)
 */

require_once __DIR__ . '/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Metode HTTP harus POST', 405);
}

$input = getJsonInput();

$ticketId = isset($input['ticketId']) ? trim($input['ticketId']) : '';
$ticketIds = isset($input['ticketIds']) && is_array($input['ticketIds']) ? array_values(array_filter(array_map('trim', $input['ticketIds']))) : [];
if ($ticketId && !in_array($ticketId, $ticketIds, true)) {
    $ticketIds[] = $ticketId;
}
$action = isset($input['action']) ? trim($input['action']) : 'soft_delete';
$role = isset($input['role']) ? trim($input['role']) : 'karyawan';
$nip = isset($input['nip']) ? trim($input['nip']) : '';

if (empty($ticketIds)) {
    sendResponse(false, null, 'Parameter ticketId atau ticketIds wajib disertakan', 400);
}

try {
    if ($action === 'purge') {
        // Hard delete oleh Admin (menghapus permanen seluruh relasi via CASCADE)
        $placeholders = implode(',', array_fill(0, count($ticketIds), '?'));
        $stmt = $pdo->prepare("DELETE FROM `tickets` WHERE `id` IN ({$placeholders})");
        $stmt->execute($ticketIds);

        sendResponse(true, ['ticketIds' => $ticketIds], "Tiket berhasil dihapus permanen oleh Administrator");
    } else {
        // Soft Delete Per Aktor (Mendukung single maupun batch untuk semua aktor)
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("
            INSERT INTO `ticket_soft_deletes` (`ticket_id`, `deleted_by_role`, `deleted_by_nip`, `deleted_at`)
            VALUES (:ticket_id, :role, :nip, NOW())
            ON DUPLICATE KEY UPDATE `deleted_at` = NOW()
        ");
        foreach ($ticketIds as $tid) {
            $stmt->execute([
                ':ticket_id' => $tid,
                ':role' => $role,
                ':nip' => $nip
            ]);
        }
        $pdo->commit();

        sendResponse(true, ['ticketIds' => $ticketIds, 'count' => count($ticketIds), 'role' => $role, 'nip' => $nip], count($ticketIds) . " tiket berhasil disembunyikan dari riwayat Anda");
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse(false, null, 'Gagal menghapus tiket: ' . $e->getMessage(), 500);
}
