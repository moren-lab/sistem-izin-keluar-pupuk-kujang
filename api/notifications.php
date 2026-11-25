<?php
/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
 * API: Notifications Engine (Fetch, Mark as Read, Create)
 */

require_once __DIR__ . '/koneksi.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $role = isset($_GET['role']) ? trim($_GET['role']) : null;
        $nip = isset($_GET['nip']) ? trim($_GET['nip']) : null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

        $sql = "SELECT * FROM `notifications`";
        $clauses = [];
        $params = [];

        if ($role) {
            $clauses[] = "(`recipient_role` = :role OR `recipient_role` = 'all')";
            $params[':role'] = $role;
        }

        if ($nip) {
            $clauses[] = "(`recipient_nip` = :nip OR `recipient_nip` IS NULL)";
            $params[':nip'] = $nip;
        }

        if (!empty($clauses)) {
            $sql .= " WHERE " . implode(' AND ', $clauses);
        }

        $sql .= " ORDER BY `created_at` DESC LIMIT {$limit}";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $notifs = $stmt->fetchAll();

        // Format data
        $formatted = [];
        foreach ($notifs as $n) {
            $formatted[] = [
                'id' => $n['id'],
                'recipientRole' => $n['recipient_role'],
                'recipientNip' => $n['recipient_nip'],
                'recipientName' => $n['recipient_name'],
                'actorSource' => $n['actor_source'],
                'type' => $n['type'],
                'priority' => $n['priority'],
                'title' => $n['title'],
                'message' => $n['message'],
                'ticketId' => $n['ticket_id'],
                'eventId' => $n['event_id'],
                'isRead' => (bool)$n['is_read'],
                'createdAt' => $n['created_at']
            ];
        }

        sendResponse(true, $formatted, 'Notifikasi berhasil dimuat');

    } catch (Exception $e) {
        sendResponse(false, null, 'Gagal memuat notifikasi: ' . $e->getMessage(), 500);
    }

} elseif ($method === 'POST') {
    $input = getJsonInput();
    $action = isset($input['action']) ? trim($input['action']) : 'mark_read';

    try {
        if ($action === 'mark_read') {
            $notifId = isset($input['id']) ? trim($input['id']) : '';
            if (!$notifId) {
                sendResponse(false, null, 'ID notifikasi wajib disertakan', 400);
            }
            $stmt = $pdo->prepare("UPDATE `notifications` SET `is_read` = 1 WHERE `id` = :id");
            $stmt->execute([':id' => $notifId]);
            sendResponse(true, ['id' => $notifId], 'Notifikasi telah ditandai dibaca');

        } elseif ($action === 'mark_all_read') {
            $role = isset($input['role']) ? trim($input['role']) : null;
            $nip = isset($input['nip']) ? trim($input['nip']) : null;

            $sql = "UPDATE `notifications` SET `is_read` = 1 WHERE `is_read` = 0";
            $params = [];
            if ($role) {
                $sql .= " AND (`recipient_role` = :role OR `recipient_role` = 'all')";
                $params[':role'] = $role;
            }
            if ($nip) {
                $sql .= " AND (`recipient_nip` = :nip OR `recipient_nip` IS NULL)";
                $params[':nip'] = $nip;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            sendResponse(true, null, 'Semua notifikasi telah ditandai dibaca');

        } elseif ($action === 'create') {
            $title = isset($input['title']) ? trim($input['title']) : '';
            $message = isset($input['message']) ? trim($input['message']) : '';

            if (!$title || !$message) {
                sendResponse(false, null, 'Title dan message notifikasi wajib diisi', 400);
            }

            $eventId = isset($input['eventId']) && trim((string)$input['eventId']) !== '' ? trim((string)$input['eventId']) : null;
            if ($eventId) {
                $stmtChk = $pdo->prepare("SELECT `id` FROM `notifications` WHERE `event_id` = :event_id LIMIT 1");
                $stmtChk->execute([':event_id' => $eventId]);
                $existing = $stmtChk->fetch();
                if ($existing) {
                    sendResponse(true, ['id' => $existing['id'], 'duplicate' => true], 'Notifikasi sudah tercatat sebelumnya');
                }
            }

            $id = !empty($input['id']) ? trim($input['id']) : ('NOTIF-' . round(microtime(true) * 1000) . '-' . rand(100, 999));
            $stmt = $pdo->prepare("
                INSERT INTO `notifications` (`id`, `recipient_role`, `recipient_nip`, `recipient_name`, `actor_source`, `type`, `priority`, `title`, `message`, `ticket_id`, `event_id`, `is_read`, `created_at`)
                VALUES (:id, :role, :nip, :name, :source, :type, :priority, :title, :message, :ticket_id, :event_id, 0, NOW())
                ON DUPLICATE KEY UPDATE `id` = `id`
            ");
            $stmt->execute([
                ':id' => $id,
                ':role' => isset($input['recipientRole']) ? $input['recipientRole'] : 'karyawan',
                ':nip' => isset($input['recipientNip']) ? $input['recipientNip'] : null,
                ':name' => isset($input['recipientName']) ? $input['recipientName'] : null,
                ':source' => isset($input['actorSource']) ? $input['actorSource'] : 'system',
                ':type' => isset($input['type']) ? $input['type'] : 'info',
                ':priority' => isset($input['priority']) ? $input['priority'] : 'normal',
                ':title' => $title,
                ':message' => $message,
                ':ticket_id' => isset($input['ticketId']) ? $input['ticketId'] : null,
                ':event_id' => $eventId
            ]);

            sendResponse(true, ['id' => $id], 'Notifikasi baru berhasil dibuat', 201);

        } elseif ($action === 'delete') {
            $notifId = isset($input['id']) ? trim($input['id']) : '';
            $eventId = isset($input['eventId']) ? trim($input['eventId']) : '';

            if (!$notifId && !$eventId) {
                sendResponse(false, null, 'ID atau eventId notifikasi wajib disertakan', 400);
            }

            if ($notifId && $eventId) {
                $stmt = $pdo->prepare("DELETE FROM `notifications` WHERE `id` = :id OR `event_id` = :event_id");
                $stmt->execute([':id' => $notifId, ':event_id' => $eventId]);
            } elseif ($notifId) {
                $stmt = $pdo->prepare("DELETE FROM `notifications` WHERE `id` = :id");
                $stmt->execute([':id' => $notifId]);
            } else {
                $stmt = $pdo->prepare("DELETE FROM `notifications` WHERE `event_id` = :event_id");
                $stmt->execute([':event_id' => $eventId]);
            }

            sendResponse(true, ['id' => $notifId], 'Notifikasi berhasil dihapus permanen');

        } elseif ($action === 'delete_all' || $action === 'clear_all') {
            $ids = isset($input['ids']) && is_array($input['ids']) ? array_values(array_filter(array_map('trim', $input['ids']))) : [];
            $role = isset($input['role']) ? trim($input['role']) : null;
            $nip = isset($input['nip']) ? trim($input['nip']) : null;

            if (!empty($ids)) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $stmt = $pdo->prepare("DELETE FROM `notifications` WHERE `id` IN ({$placeholders})");
                $stmt->execute($ids);
            }
            if ($nip) {
                if ($nip === 'PK-2024-8841') {
                    $stmt = $pdo->prepare("DELETE FROM `notifications` WHERE `recipient_nip` = :nip OR (`recipient_nip` IS NULL AND `recipient_role` = 'karyawan')");
                } elseif ($nip === 'PK-2015-1002') {
                    $stmt = $pdo->prepare("DELETE FROM `notifications` WHERE `recipient_nip` = :nip OR (`recipient_nip` IS NULL AND `recipient_role` = 'approver')");
                } else {
                    $stmt = $pdo->prepare("DELETE FROM `notifications` WHERE `recipient_nip` = :nip");
                }
                $stmt->execute([':nip' => $nip]);
            } elseif ($role) {
                $stmt = $pdo->prepare("DELETE FROM `notifications` WHERE `recipient_role` = :role");
                $stmt->execute([':role' => $role]);
            }

            sendResponse(true, null, 'Semua notifikasi pengguna berhasil dihapus permanen');
        } else {
            sendResponse(false, null, "Aksi '{$action}' tidak dikenal", 400);
        }
    } catch (Exception $e) {
        sendResponse(false, null, 'Gagal memproses notifikasi: ' . $e->getMessage(), 500);
    }
}
