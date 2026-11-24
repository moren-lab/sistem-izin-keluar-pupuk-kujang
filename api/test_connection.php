<?php
/**
 * CLI Test Database Connection (PHP) - PT Pupuk Kujang
 * Penggunaan: php api/test_connection.php
 */

require_once __DIR__ . '/koneksi.php';

echo "======================================================================\n";
echo "  UJI KONEKSI DATABASE MYSQL (PHP PDO) - PT PUPUK KUJANG CIKAMPEK\n";
echo "======================================================================\n";
echo "[INFO] Konfigurasi aktif dari .env:\n";
echo "  • Host     : " . $db_host . ":" . $db_port . "\n";
echo "  • Database : " . $db_name . "\n";
echo "  • User     : " . $db_user . "\n";
echo "----------------------------------------------------------------------\n";

try {
    $stmt = $pdo->query("SELECT DATABASE() AS current_db, VERSION() AS mysql_version");
    $info = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "\033[32m[BERHASIL TERKONEKSI]\033[0m\n";
    echo "  • Database Aktif : " . $info['current_db'] . "\n";
    echo "  • Versi MySQL    : " . $info['mysql_version'] . "\n";

    $stmtTables = $pdo->query("SHOW TABLES");
    $tables = $stmtTables->fetchAll(PDO::FETCH_COLUMN);
    echo "  • Daftar Tabel   : " . implode(', ', $tables) . " (" . count($tables) . " tabel)\n";

    echo "\n[CONTOH QUERY 1: Tabel users]\n";
    $uStmt = $pdo->query("SELECT nip, name, department, role, status FROM users LIMIT 3");
    $users = $uStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($users as $u) {
        echo "  - [{$u['nip']}] {$u['name']} | {$u['role']} ({$u['status']})\n";
    }

    echo "\n[CONTOH QUERY 2: Tabel tickets]\n";
    $tStmt = $pdo->query("SELECT id, applicant_name, category, destination, status FROM tickets ORDER BY created_at DESC LIMIT 3");
    $tickets = $tStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($tickets as $t) {
        echo "  - [{$t['id']}] {$t['applicant_name']} | {$t['category']} -> {$t['destination']} (Status: {$t['status']})\n";
    }

    echo "======================================================================\n";
    echo "\033[32m[SUKSES] Koneksi PHP PDO MySQL berjalan sempurna tanpa mengubah data!\033[0m\n";
    echo "======================================================================\n";
} catch (Exception $e) {
    echo "\033[31m[ERROR QUERY]\033[0m " . $e->getMessage() . "\n";
    exit(1);
}
