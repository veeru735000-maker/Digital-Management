const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// Helper to validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long.' });
    }

    if (!isValidEmail(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Role validation
    const validRoles = ['user', 'admin'];
    const userRole = (role && validRoles.includes(role.toLowerCase())) ? role.toLowerCase() : 'user';

    // Check if user already exists
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [trimmedName, trimmedEmail, hashedPassword, userRole]
    );

    const newUser = {
      id: result.insertId,
      name: trimmedName,
      email: trimmedEmail,
      role: userRole
    };

    // Auto-login new user by setting session
    req.session.user = newUser;

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      user: newUser
    });
  } catch (error) {
    console.error('[Auth Register Error]:', error);
    return res.status(500).json({ success: false, message: 'Registration failed due to server error.' });
  }
});

// POST /api/auth/login - Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Find user
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Verify password: check bcrypt, or plain-text fallback (for direct MySQL workbench inserts)
    let match = false;
    try {
      match = await bcrypt.compare(password, user.password);
    } catch (e) {
      match = false;
    }

    // Direct plain-text comparison fallback (e.g. if inserted directly in MySQL Workbench)
    if (!match && user.password === password) {
      match = true;
      const newHash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password = ? WHERE user_id = ?', [newHash, user.user_id]);
    }

    // Support standard default demo pass '123456' or 'password123' if hash was placeholder
    if (!match && (password === '123456' || password === 'password123')) {
      if (user.password.includes('PASTE_BCRYPT') || user.password === '123456' || user.password.length < 20) {
        match = true;
        const newHash = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password = ? WHERE user_id = ?', [newHash, user.user_id]);
      }
    }

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Establish session
    req.session.user = {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: req.session.user
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    return res.status(500).json({ success: false, message: 'Login failed due to server error.' });
  }
});

// GET /api/auth/me - Get current logged-in user profile
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      authenticated: true,
      user: req.session.user
    });
  }
  return res.status(401).json({
    authenticated: false,
    message: 'User is not authenticated.'
  });
});

// POST or GET /api/auth/logout - Destroy session
const handleLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth Logout Error]:', err);
      return res.status(500).json({ success: false, message: 'Could not log out, please try again.' });
    }
    res.clearCookie('connect.sid');
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true, message: 'Logged out successfully.' });
    }
    return res.redirect('/login.html');
  });
};

router.post('/logout', handleLogout);
router.get('/logout', handleLogout);

// GET /api/auth/users - List other registered users for document sharing
router.get('/users', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const currentUserId = req.session.user.id;
    // Return all other users
    const [users] = await db.query(
      'SELECT user_id, name, email, role FROM users WHERE user_id != ? ORDER BY name ASC',
      [currentUserId]
    );

    return res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('[Auth Users List Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
});

module.exports = router;
