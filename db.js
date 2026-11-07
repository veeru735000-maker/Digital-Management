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

// Test database connection directly using root and veeru credentials
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT CURRENT_USER() as connected_user, DATABASE() as db_name;');
    
    console.log('=============================================================');
    console.log('MySQL Database Connected Successfully!');
    console.log(`Database:       ${rows[0].db_name}`);
    console.log(`Connected User: ${rows[0].connected_user}`);
    console.log(`Host & Port:    ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    console.log(`Auth Source:    .env (DB_USER=${process.env.DB_USER || 'root'}, DB_PASSWORD=${process.env.DB_PASSWORD ? '******' : 'none'})`);
    console.log('=============================================================');
    
    // Release the test connection back to pool
    connection.release();
  } catch (error) {
    console.error('=============================================================');
    console.error('MySQL Database Connection Failed!');
    console.error(`Error Code:    ${error.code}`);
    console.error(`Error Message: ${error.message}`);
    console.error('Please verify your MySQL service is running and credentials in .env are correct.');
    console.error('=============================================================');
  }
}

// Execute connection test on server startup
testConnection();

module.exports = pool;
