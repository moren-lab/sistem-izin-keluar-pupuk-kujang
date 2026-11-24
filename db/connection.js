/**
 * SISTEM PERIZINAN KELUAR AREA - PT PUPUK KUJANG CIKAMPEK
 * Database Connection Module (Node.js / mysql2 promise-based pool)
 * 
 * Membaca kredensial dari .env secara dinamis tanpa mengubah skema/data yang ada.
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_DATABASE || 'db_perizinan_kujang',
  charset: process.env.DB_CHARSET || 'utf8mb4',
  timezone: process.env.DB_TIMEZONE || '+07:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Buat pool koneksi (singleton)
const pool = mysql.createPool(dbConfig);

/**
 * Eksekusi query SQL dengan prepared statements
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Array>}
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Uji koneksi ke database dan kembalikan informasi server & tabel
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [dbInfo] = await connection.query('SELECT DATABASE() AS current_db, VERSION() AS mysql_version');
    const [tables] = await connection.query('SHOW TABLES');
    connection.release();

    const tableNames = tables.map(r => Object.values(r)[0]);

    return {
      success: true,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbInfo[0].current_db,
      version: dbInfo[0].mysql_version,
      tables: tableNames
    };
  } catch (error) {
    return {
      success: false,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      error: error.message
    };
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  dbConfig
};
