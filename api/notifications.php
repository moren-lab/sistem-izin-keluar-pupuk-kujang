<?php
/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
 * API: Notifications Engine (Fetch, Mark as Read, Create)
 */

require_once __DIR__ . '/koneksi.php';

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

            $id = 'NOTIF-' . round(microtime(true) * 1000) . '-' . rand(100, 999);
            $stmt = $pdo->prepare("
                INSERT INTO `notifications` (`id`, `recipient_role`, `recipient_nip`, `recipient_name`, `actor_source`, `type`, `priority`, `title`, `message`, `ticket_id`, `event_id`, `is_read`, `created_at`)
                VALUES (:id, :role, :nip, :name, :source, :type, :priority, :title, :message, :ticket_id, :event_id, 0, NOW())
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
                ':event_id' => isset($input['eventId']) ? $input['eventId'] : null
            ]);

            sendResponse(true, ['id' => $id], 'Notifikasi baru berhasil dibuat', 201);
        } else {
            sendResponse(false, null, "Aksi '{$action}' tidak dikenal", 400);
        }
    } catch (Exception $e) {
        sendResponse(false, null, 'Gagal memproses notifikasi: ' . $e->getMessage(), 500);
    }
}
