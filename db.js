const mysql = require('mysql2/promise');
require('dotenv').config();

// Create reusable MySQL connection pool reading credentials from .env
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'veeru',
  database: process.env.DB_NAME || 'digital_document_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection and display record counts from all 4 tables
async function testConnection() {
  try {
    const connection = await pool.getConnection();

    // 1. Verify Database and Current User
    const [dbInfo] = await connection.query('SELECT DATABASE() AS db_name, CURRENT_USER() AS connected_user;');
    const currentDb = dbInfo[0].db_name;
    const currentUser = dbInfo[0].connected_user.split('@')[0];

    // 2. Query record counts from all four tables
    const [[{ user_count }]] = await connection.query('SELECT COUNT(*) AS user_count FROM users;');
    const [[{ cat_count }]] = await connection.query('SELECT COUNT(*) AS cat_count FROM categories;');
    const [[{ doc_count }]] = await connection.query('SELECT COUNT(*) AS doc_count FROM documents;');
    const [[{ access_count }]] = await connection.query('SELECT COUNT(*) AS access_count FROM document_access;');

    // 3. Display exact expected terminal output
    console.log('MYSQL CONNECTION SUCCESSFUL');
    console.log(`Connected User: ${currentUser}`);
    console.log(`Database: ${currentDb}`);
    console.log(`Users: ${user_count}`);
    console.log(`Categories: ${cat_count}`);
    console.log(`Documents: ${doc_count}`);
    console.log(`Document Access: ${access_count}`);

    // Release connection back to pool
    connection.release();
  } catch (error) {
    console.error('MYSQL CONNECTION FAILED');
    console.error(`Error Code: ${error.code}`);
    console.error(`Error Message: ${error.message}`);
    console.error('Please verify your MySQL service is running and credentials in .env are correct.');
  }
}

// Execute connection test on server startup
testConnection();

module.exports = pool;
