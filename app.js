const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const authRoutes = require('./routes/authRoutes');
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

// Protect Private HTML Pages Middleware
const protectedPages = [
  '/dashboard.html',
  '/documents.html',
  '/upload.html',
  '/categories.html',
  '/access.html'
];

app.use((req, res, next) => {
  const reqPath = req.path.toLowerCase();

  // If user is accessing protected page without session, redirect to login
  if (protectedPages.includes(reqPath)) {
    if (!req.session || !req.session.user) {
      return res.redirect('/login.html');
    }
  }

  // If already logged in and visiting login or register, redirect to dashboard
  if ((reqPath === '/login.html' || reqPath === '/register.html') && req.session && req.session.user) {
    return res.redirect('/dashboard.html');
  }

  next();
});

// Serve Static Files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/access', accessRoutes);

// Dashboard Statistics API Endpoint
app.get('/api/stats', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const currentUserId = req.session.user.id;

    // 1. Total Accessible Documents (Owned + Shared)
    const [docCountRow] = await db.query(
      `SELECT COUNT(DISTINCT d.document_id) AS total_documents
       FROM documents d
       LEFT JOIN document_access da ON d.document_id = da.document_id AND da.user_id = ?
       WHERE (d.user_id = ? OR da.user_id = ?)`,
      [currentUserId, currentUserId, currentUserId]
    );

    // 2. Total Owned Documents
    const [myDocCountRow] = await db.query(
      `SELECT COUNT(*) AS my_documents FROM documents WHERE user_id = ?`,
      [currentUserId]
    );

    // 3. Total Categories
    const [catCountRow] = await db.query(`SELECT COUNT(*) AS total_categories FROM categories`);

    // 4. Total Registered Users
    const [userCountRow] = await db.query(`SELECT COUNT(*) AS total_users FROM users`);

    // 5. Total Shared With Me Documents
    const [sharedCountRow] = await db.query(
      `SELECT COUNT(*) AS shared_documents FROM document_access WHERE user_id = ?`,
      [currentUserId]
    );

    // 6. Category breakdown for charts/progress
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
        totalDocuments: docCountRow[0].total_documents || 0,
        myDocuments: myDocCountRow[0].my_documents || 0,
        totalCategories: catCountRow[0].total_categories || 0,
        totalUsers: userCountRow[0].total_users || 0,
        sharedDocuments: sharedCountRow[0].shared_documents || 0,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error('[Dashboard Stats Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.' });
  }
});

// Root route handler
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard.html');
  }
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
