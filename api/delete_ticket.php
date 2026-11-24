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
$action = isset($input['action']) ? trim($input['action']) : 'soft_delete';
$role = isset($input['role']) ? trim($input['role']) : 'karyawan';
$nip = isset($input['nip']) ? trim($input['nip']) : '';

if (!$ticketId) {
    sendResponse(false, null, 'Parameter ticketId wajib disertakan', 400);
}

try {
    if ($action === 'purge') {
        // Hard delete oleh Admin (menghapus permanen seluruh relasi via CASCADE)
        $stmt = $pdo->prepare("DELETE FROM `tickets` WHERE `id` = :id");
        $stmt->execute([':id' => $ticketId]);

        sendResponse(true, ['ticketId' => $ticketId], "Tiket {$ticketId} berhasil dihapus permanen oleh Administrator");
    } else {
        // Soft Delete Per Aktor (Tiket hanya disembunyikan dari akun/aktor tersebut)
        $stmt = $pdo->prepare("
            INSERT INTO `ticket_soft_deletes` (`ticket_id`, `deleted_by_role`, `deleted_by_nip`, `deleted_at`)
            VALUES (:ticket_id, :role, :nip, NOW())
            ON DUPLICATE KEY UPDATE `deleted_at` = NOW()
        ");
        $stmt->execute([
            ':ticket_id' => $ticketId,
            ':role' => $role,
            ':nip' => $nip
        ]);

        sendResponse(true, ['ticketId' => $ticketId, 'role' => $role], "Tiket {$ticketId} berhasil disembunyikan dari riwayat Anda");
    }
} catch (Exception $e) {
    sendResponse(false, null, 'Gagal menghapus tiket: ' . $e->getMessage(), 500);
}
