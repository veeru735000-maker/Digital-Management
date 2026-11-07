const express = require('express');
const router = express.Router();
const db = require('../db');

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
}

// POST /api/access/share - Share a document with a user
router.post('/share', requireAuth, async (req, res) => {
  try {
    const { document_id, user_id, permission } = req.body;
    const currentUserId = req.session.user.id;
    const userRole = req.session.user.role;

    if (!document_id || !user_id || !permission) {
      return res.status(400).json({ success: false, message: 'Document, target user, and permission are required.' });
    }

    const docId = parseInt(document_id);
    const targetUserId = parseInt(user_id);
    const perm = permission.toLowerCase() === 'download' ? 'download' : 'view';

    // Verify target user is not self
    if (targetUserId === currentUserId) {
      return res.status(400).json({ success: false, message: 'You already own this document and cannot share it with yourself.' });
    }

    // Verify document exists and belongs to current user (or user is admin)
    const [docs] = await db.query('SELECT document_id, user_id, title FROM documents WHERE document_id = ?', [docId]);
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = docs[0];
    if (document.user_id !== currentUserId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the document owner can grant sharing permissions.' });
    }

    // Verify target user exists
    const [targetUsers] = await db.query('SELECT user_id, name, email FROM users WHERE user_id = ?', [targetUserId]);
    if (targetUsers.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected user does not exist.' });
    }
    const targetUser = targetUsers[0];

    // Check if permission already exists - update or insert (UPSERT)
    await db.query(
      `INSERT INTO document_access (document_id, user_id, permission, granted_date)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE permission = VALUES(permission), granted_date = NOW()`,
      [docId, targetUserId, perm]
    );

    return res.json({
      success: true,
      message: `Document "${document.title}" shared with ${targetUser.name} (${perm.toUpperCase()} access).`
    });
  } catch (error) {
    console.error('[Document Access Share Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to share document.' });
  }
});

// GET /api/access/shared-by-me - Get list of access records given to other users
router.get('/shared-by-me', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;

    const query = `
      SELECT 
        da.access_id,
        da.document_id,
        da.permission,
        da.granted_date,
        d.title AS document_title,
        d.file_name,
        u.user_id AS recipient_id,
        u.name AS recipient_name,
        u.email AS recipient_email
      FROM document_access da
      JOIN documents d ON da.document_id = d.document_id
      JOIN users u ON da.user_id = u.user_id
      WHERE d.user_id = ?
      ORDER BY da.granted_date DESC
    `;

    const [records] = await db.query(query, [currentUserId]);
    return res.json({ success: true, records });
  } catch (error) {
    console.error('[Shared-By-Me Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load shared documents list.' });
  }
});

// GET /api/access/shared-with-me - Get documents shared with current user
router.get('/shared-with-me', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;

    const query = `
      SELECT 
        da.access_id,
        da.permission,
        da.granted_date,
        d.document_id,
        d.title,
        d.file_name,
        d.file_path,
        d.upload_date,
        d.status,
        c.category_name,
        u.name AS owner_name,
        u.email AS owner_email
      FROM document_access da
      JOIN documents d ON da.document_id = d.document_id
      LEFT JOIN categories c ON d.category_id = c.category_id
      JOIN users u ON d.user_id = u.user_id
      WHERE da.user_id = ?
      ORDER BY da.granted_date DESC
    `;

    const [records] = await db.query(query, [currentUserId]);
    return res.json({ success: true, records });
  } catch (error) {
    console.error('[Shared-With-Me Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load documents shared with you.' });
  }
});

// DELETE /api/access/:access_id - Revoke sharing permission
router.delete('/:access_id', requireAuth, async (req, res) => {
  try {
    const accessId = req.params.access_id;
    const currentUserId = req.session.user.id;
    const userRole = req.session.user.role;

    // Verify access record and ownership
    const query = `
      SELECT da.access_id, da.document_id, d.user_id AS owner_id, d.title
      FROM document_access da
      JOIN documents d ON da.document_id = d.document_id
      WHERE da.access_id = ?
    `;
    const [rows] = await db.query(query, [accessId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Access permission record not found.' });
    }

    const record = rows[0];
    if (record.owner_id !== currentUserId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the document owner can revoke access.' });
    }

    await db.query('DELETE FROM document_access WHERE access_id = ?', [accessId]);

    return res.json({
      success: true,
      message: `Access revoked for document "${record.title}".`
    });
  } catch (error) {
    console.error('[Access Revoke Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to revoke access permission.' });
  }
});

module.exports = router;

