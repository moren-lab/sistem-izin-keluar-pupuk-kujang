<?php
/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT PUPUK KUJANG CIKAMPEK
 * API: Master Users & Authentication (Kujang ID Login)
 */

require_once __DIR__ . '/koneksi.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $roleKey = isset($_GET['roleKey']) ? trim($_GET['roleKey']) : null;
        $status = isset($_GET['status']) ? trim($_GET['status']) : null;

        $sql = "SELECT `id`, `kujang_id`, `nip`, `username`, `name`, `email`, `phone`, `department`, `title`, `role`, `role_key`, `approver_level`, `direct_supervisor`, `supervisor`, `status`, `avatar`, `badge_color`, `registered_at`, `last_login` FROM `users`";
        $clauses = [];
        $params = [];

        if ($roleKey) {
            $clauses[] = "`role_key` = :roleKey";
            $params[':roleKey'] = $roleKey;
        }

        if ($status) {
            $clauses[] = "`status` = :status";
            $params[':status'] = $status;
        }

        if (!empty($clauses)) {
            $sql .= " WHERE " . implode(' AND ', $clauses);
        }

        $sql .= " ORDER BY `id` ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll();

        $formatted = [];
        foreach ($users as $u) {
            $formatted[] = [
                'id' => $u['id'],
                'kujangId' => $u['kujang_id'],
                'nip' => $u['nip'],
                'username' => $u['username'],
                'name' => $u['name'],
                'email' => $u['email'],
                'phone' => $u['phone'],
                'department' => $u['department'],
                'title' => $u['title'],
                'role' => $u['role'],
                'roleKey' => $u['role_key'],
                'approverLevel' => (int)$u['approver_level'],
                'directSupervisor' => $u['direct_supervisor'],
                'supervisor' => $u['supervisor'],
                'status' => $u['status'],
                'avatar' => $u['avatar'],
                'badgeColor' => $u['badge_color'],
                'registeredAt' => $u['registered_at'],
                'lastLogin' => $u['last_login']
            ];
        }

        sendResponse(true, $formatted, 'Data master pengguna berhasil dimuat');

    } catch (Exception $e) {
        sendResponse(false, null, 'Gagal memuat pengguna: ' . $e->getMessage(), 500);
    }

} elseif ($method === 'POST') {
    $input = getJsonInput();
    $action = isset($input['action']) ? trim($input['action']) : 'login';

    try {
        if ($action === 'login') {
            $identifier = isset($input['identifier']) ? trim($input['identifier']) : '';
            $password = isset($input['password']) ? trim($input['password']) : '';

            if (!$identifier || !$password) {
                sendResponse(false, null, 'Username/NIP dan password wajib diisi', 400);
            }

            $stmt = $pdo->prepare("
                SELECT * FROM `users`
                WHERE (`username` = :id1 OR `nip` = :id2 OR `email` = :id3)
                LIMIT 1
            ");
            $stmt->execute([
                ':id1' => $identifier,
                ':id2' => $identifier,
                ':id3' => $identifier
            ]);
            $user = $stmt->fetch();

            if (!$user) {
                sendResponse(false, null, 'Akun tidak terdaftar di sistem Kujang ID', 404);
            }

            if ($user['status'] === 'Dicabut' || $user['status'] === 'Nonaktif') {
                sendResponse(false, null, 'Hak akses akun Anda sedang dinonaktifkan oleh Administrator', 403);
            }

            // Verifikasi Password (plain text atau password_verify)
            $passwordValid = ($password === $user['password']) || password_verify($password, $user['password']);

            if (!$passwordValid) {
                sendResponse(false, null, 'Password yang Anda masukkan salah', 401);
            }

            // Update Last Login
            $nowDisplay = 'Hari ini, ' . date('H:i \W\I\B');
            $stmtUp = $pdo->prepare("UPDATE `users` SET `last_login` = :ll WHERE `id` = :id");
            $stmtUp->execute([':ll' => $nowDisplay, ':id' => $user['id']]);

            // Return user session data
            $userSession = [
                'id' => $user['id'],
                'kujangId' => $user['kujang_id'],
                'nip' => $user['nip'],
                'username' => $user['username'],
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'department' => $user['department'],
                'title' => $user['title'],
                'role' => $user['role_key'],
                'roleKey' => $user['role_key'],
                'roleLabel' => $user['role'],
                'approverLevel' => (int)$user['approver_level'],
                'directSupervisor' => $user['direct_supervisor'],
                'supervisor' => $user['supervisor'],
                'avatar' => $user['avatar'],
                'badgeColor' => $user['badge_color'],
                'lastLogin' => $nowDisplay
            ];

            sendResponse(true, $userSession, 'Login berhasil');

        } else {
            sendResponse(false, null, "Aksi '{$action}' tidak dikenal", 400);
        }
    } catch (Exception $e) {
        sendResponse(false, null, 'Gagal memproses autentikasi: ' . $e->getMessage(), 500);
    }
}
