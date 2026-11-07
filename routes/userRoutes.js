const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// Middleware to ensure user is logged in
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
}

// GET /api/users - Retrieve all users from MySQL 'users' table
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT user_id, name, email, role FROM users';
    const params = [];

    if (search && search.trim()) {
      query += ' WHERE name LIKE ? OR email LIKE ? OR role LIKE ?';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY user_id ASC';

    const [users] = await db.query(query, params);

    return res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('[Users GET Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
});

// GET /api/users/:id - Get single user details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT user_id, name, email, role FROM users WHERE user_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('[User GET By ID Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user.' });
  }
});

// POST /api/users - Add a new user into MySQL
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const userRole = (role && ['admin', 'user'].includes(role.toLowerCase())) ? role.toLowerCase() : 'user';

    // Check duplicate email
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [trimmedName, trimmedEmail, hashedPassword, userRole]
    );

    return res.status(201).json({
      success: true,
      message: 'User created successfully!',
      user: {
        user_id: result.insertId,
        name: trimmedName,
        email: trimmedEmail,
        role: userRole
      }
    });
  } catch (error) {
    console.error('[User Create Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// PUT /api/users/:id - Update existing user
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check user exists
    const [existing] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check duplicate email on another user
    const [duplicate] = await db.query('SELECT user_id FROM users WHERE email = ? AND user_id != ?', [trimmedEmail, id]);
    if (duplicate.length > 0) {
      return res.status(409).json({ success: false, message: 'Another user with this email already exists.' });
    }

    const userRole = (role && ['admin', 'user'].includes(role.toLowerCase())) ? role.toLowerCase() : 'user';

    // If new password provided, update with new hash
    if (password && password.trim().length >= 6) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      await db.query(
        'UPDATE users SET name = ?, email = ?, role = ?, password = ? WHERE user_id = ?',
        [trimmedName, trimmedEmail, userRole, hashedPassword, id]
      );
    } else {
      await db.query(
        'UPDATE users SET name = ?, email = ?, role = ? WHERE user_id = ?',
        [trimmedName, trimmedEmail, userRole, id]
      );
    }

    // If updating current user's session
    if (req.session.user && req.session.user.id == id) {
      req.session.user.name = trimmedName;
      req.session.user.email = trimmedEmail;
      req.session.user.role = userRole;
    }

    return res.json({
      success: true,
      message: 'User updated successfully!'
    });
  } catch (error) {
    console.error('[User Update Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

// DELETE /api/users/:id - Delete user from MySQL
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session.user.id;

    if (currentUserId == id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own active logged-in account.' });
    }

    const [existing] = await db.query('SELECT user_id, name FROM users WHERE user_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Delete user from MySQL (cascades to documents and access records)
    await db.query('DELETE FROM users WHERE user_id = ?', [id]);

    return res.json({
      success: true,
      message: `User "${existing[0].name}" deleted successfully.`
    });
  } catch (error) {
    console.error('[User Delete Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

module.exports = router;

