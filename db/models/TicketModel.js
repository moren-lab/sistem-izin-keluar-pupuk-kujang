/**
 * Ticket Model - PT Pupuk Kujang
 * Mengelola pembacaan data tabel `tickets` secara aman
 */

const { query } = require('../connection');

class TicketModel {
  /**
   * Mengambil tiket izin keluar terbaru
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  static async getAll(limit = 10) {
    const sql = `
      SELECT id, applicant_nip, applicant_name, department, category, type, destination, status, planned_exit, estimated_return, approver_name
      FROM tickets
      ORDER BY created_at DESC
      LIMIT ?
    `;
    return await query(sql, [String(limit)]);
  }

  /**
   * Mencari tiket berdasarkan ID
   * @param {string} id 
   */
  static async getById(id) {
    const sql = `
      SELECT *
      FROM tickets
      WHERE id = ?
      LIMIT 1
    `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Menghitung total tiket per status
   */
  static async countByStatus() {
    const sql = `
      SELECT status, COUNT(*) AS total
      FROM tickets
      GROUP BY status
      ORDER BY total DESC
    `;
    return await query(sql);
  }

  /**
   * Menghitung total seluruh tiket
   */
  static async count() {
    const rows = await query('SELECT COUNT(*) AS total FROM tickets');
    return rows[0] ? rows[0].total : 0;
  }
}

module.exports = TicketModel;
