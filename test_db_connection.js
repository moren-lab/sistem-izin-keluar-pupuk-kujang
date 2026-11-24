/**
 * CLI Database Connection Tester - PT Pupuk Kujang
 * Menjalankan uji koneksi ke MySQL dan membaca data sampel dari tabel yang sudah ada.
 * 
 * Penggunaan:
 *   node test_db_connection.js
 *   npm run db:test
 */

const { testConnection, pool } = require('./db/connection');
const UserModel = require('./db/models/UserModel');
const TicketModel = require('./db/models/TicketModel');

(async () => {
  console.log('='.repeat(70));
  console.log('  UJI KONEKSI DATABASE MYSQL - PT PUPUK KUJANG CIKAMPEK');
  console.log('='.repeat(70));
  console.log('Memeriksa koneksi berdasarkan konfigurasi di .env...\n');

  try {
    const connInfo = await testConnection();

    if (!connInfo.success) {
      console.error('\x1b[31m[GAGAL TERKONEKSI]\x1b[0m');
      console.error('Host     :', connInfo.host + ':' + connInfo.port);
      console.error('Database :', connInfo.database);
      console.error('Pesan    :', connInfo.error);
      console.log('\nPeriksa kembali kredensial database di file .env.');
      process.exit(1);
    }

    console.log('\x1b[32m[BERHASIL TERKONEKSI KE MYSQL]\x1b[0m');
    console.log('  • Host       : ' + connInfo.host + ':' + connInfo.port);
    console.log('  • Database   : ' + connInfo.database);
    console.log('  • Versi MySQL: ' + connInfo.version);
    console.log('  • Tabel Ditemukan (' + connInfo.tables.length + ' tabel):');
    console.log('    ' + connInfo.tables.join(', '));
    console.log('-'.repeat(70));

    // 1. Tes Query dari Tabel Users
    console.log('\n1. Membaca data sampel dari tabel `users`:');
    const totalUsers = await UserModel.count();
    console.log(`   Total Pengguna Terdaftar: ${totalUsers} user`);
    const users = await UserModel.getAll(4);
    console.table(users.map(u => ({
      NIP: u.nip,
      Nama: u.name,
      Jabatan: u.title,
      Peran: u.role,
      Status: u.status
    })));

    // 2. Tes Query dari Tabel Tickets
    console.log('\n2. Membaca data sampel dari tabel `tickets`:');
    const totalTickets = await TicketModel.count();
    console.log(`   Total Tiket Perizinan: ${totalTickets} tiket`);
    const tickets = await TicketModel.getAll(4);
    console.table(tickets.map(t => ({
      'ID Tiket': t.id,
      Pemohon: t.applicant_name,
      Kategori: t.category,
      Tujuan: t.destination ? (t.destination.length > 25 ? t.destination.substring(0, 22) + '...' : t.destination) : '-',
      Status: t.status
    })));

    // 3. Ringkasan Status Tiket
    console.log('\n3. Distribusi Status Tiket:');
    const statusCounts = await TicketModel.countByStatus();
    console.table(statusCounts.map(s => ({
      Status: s.status,
      Jumlah: s.total
    })));

    console.log('='.repeat(70));
    console.log('\x1b[32m[SUKSES] Koneksi dan query database berfungsi sempurna 100%!\x1b[0m');
    console.log('Tidak ada tabel atau data yang dihapus maupun ditimpa.');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('\x1b[31m[ERROR QUERY]\x1b[0m', error);
  } finally {
    await pool.end();
  }
})();
