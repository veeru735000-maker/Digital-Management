const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const accessRoutes = require('./routes/accessRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'veerendra_doc_system_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Auto-initialize authenticated session for Veerendra (Admin, user_id: 1)
// Ensures direct access to all 4 database table pages and APIs from homepage without login blocks
app.use((req, res, next) => {
  if (!req.session.user) {
    req.session.user = {
      id: 1,
      name: 'Veerendra',
      email: 'veerendra@gmail.com',
      role: 'admin'
    };
  }
  next();
});

// Serve Static Files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/access', accessRoutes);

// Dashboard Statistics API Endpoint (Total Users, Categories, Documents, Document Access)
app.get('/api/stats', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // 1. Total Registered Users
    const [userCountRow] = await db.query('SELECT COUNT(*) AS total_users FROM users');

    // 2. Total Categories
    const [catCountRow] = await db.query('SELECT COUNT(*) AS total_categories FROM categories');

    // 3. Total Documents
    const [docCountRow] = await db.query('SELECT COUNT(*) AS total_documents FROM documents');

    // 4. Total Document Access
    const [accessCountRow] = await db.query('SELECT COUNT(*) AS total_access FROM document_access');

    // 5. Category breakdown for charts/progress
    const [categoryBreakdown] = await db.query(
      `SELECT c.category_name, COUNT(d.document_id) AS count
       FROM categories c
       LEFT JOIN documents d ON c.category_id = d.category_id
       GROUP BY c.category_id, c.category_name
       ORDER BY count DESC`
    );

    return res.json({
      success: true,
      stats: {
        totalUsers: userCountRow[0].total_users || 0,
        totalCategories: catCountRow[0].total_categories || 0,
        totalDocuments: docCountRow[0].total_documents || 0,
        totalAccess: accessCountRow[0].total_access || 0,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error('[Dashboard Stats Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.' });
  }
});

// Root route handler: always serve homepage index.html
app.get('/', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Server Error]:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`  Veerendra - Digital Document Management System             `);
  console.log(`  Server is running at: http://localhost:${PORT}             `);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}       `);
  console.log(`=============================================================`);
});
