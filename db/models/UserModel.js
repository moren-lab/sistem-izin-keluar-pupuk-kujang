/**
 * User Model - PT Pupuk Kujang
 * Mengelola akses data tabel `users` secara aman (read-only query helper)
 */

const { query } = require('../connection');

class UserModel {
  /**
   * Mengambil daftar pengguna aktif
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  static async getAll(limit = 10) {
    const sql = `
      SELECT id, kujang_id, nip, name, email, department, title, role, role_key, direct_supervisor, status
      FROM users
      ORDER BY id ASC
      LIMIT ?
    `;
    return await query(sql, [String(limit)]);
  }

  /**
   * Mengambil user berdasarkan NIP
   * @param {string} nip 
   */
  static async getByNip(nip) {
    const sql = `
      SELECT id, kujang_id, nip, name, email, department, title, role, role_key, direct_supervisor, status
      FROM users
      WHERE nip = ?
      LIMIT 1
    `;
    const rows = await query(sql, [nip]);
    return rows[0] || null;
  }

  /**
   * Menghitung total user
   */
  static async count() {
    const rows = await query('SELECT COUNT(*) AS total FROM users');
    return rows[0] ? rows[0].total : 0;
  }
}

module.exports = UserModel;
