const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'digital_document_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Self-healing database & tables initializer
async function initDatabase() {
  let tempConn;
  try {
    // 1. Connect without database first to ensure database exists
    tempConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    const dbName = process.env.DB_NAME || 'digital_document_db';
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConn.end();

    // 2. Test pool connection
    const conn = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL (${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${dbName})`);

    // 3. Ensure Table 1: users exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Ensure Table 2: categories exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id INT AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Ensure Table 3: documents exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS documents (
        document_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT NULL,
        title VARCHAR(150) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'Active',
        CONSTRAINT fk_documents_user FOREIGN KEY (user_id)
          REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_documents_category FOREIGN KEY (category_id)
          REFERENCES categories (category_id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. Ensure Table 4: document_access exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS document_access (
        access_id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        user_id INT NOT NULL,
        permission VARCHAR(20) NOT NULL DEFAULT 'view',
        granted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_doc_user (document_id, user_id),
        CONSTRAINT fk_access_document FOREIGN KEY (document_id)
          REFERENCES documents (document_id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_access_user FOREIGN KEY (user_id)
          REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 7. Seed default categories if empty
    const [cats] = await conn.query('SELECT COUNT(*) as count FROM categories');
    if (cats[0].count === 0) {
      await conn.query(`
        INSERT INTO categories (category_name, description) VALUES
        ('Academic Records', 'Certificates, degrees, marksheets, and university transcripts'),
        ('Official Identity', 'Passports, National ID cards, driving licenses, and credentials'),
        ('Financial & Legal', 'Tax reports, invoices, salary slips, and legal contracts'),
        ('Technical & Code', 'Software architecture docs, project specifications, and manuals'),
        ('Medical & Health', 'Medical prescriptions, reports, insurance policies, and health records');
      `);
      console.log('[Database] Default categories populated.');
    }

    conn.release();
    console.log('[Database] Schema verification completed.');
  } catch (err) {
    if (tempConn) await tempConn.end().catch(() => {});
    console.error('[Database] Connection / Init Error:', err.message);
  }
}

// Initialize on startup
initDatabase();

module.exports = pool;
