const mysql = require('mysql2/promise');
require('dotenv').config();

// Create reusable MySQL connection pool reading credentials from .env
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'digital_document_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection to existing MySQL Workbench database
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL Database Connected Successfully!');
    console.log(`Database: ${process.env.DB_NAME || 'digital_document_db'}`);
    
    // Release the test connection back to pool
    connection.release();
  } catch (error) {
    console.error('MySQL Database Connection Failed!');
    console.error(`Error Code: ${error.code}`);
    console.error(`Error Message: ${error.message}`);
    console.error('Please verify your MySQL service is running and credentials in .env are correct.');
  }
}

// Execute connection test on server startup
testConnection();

module.exports = pool;
