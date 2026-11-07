const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to resolve physical file path even if stored with 'uploads/' prefix or missing
function resolveFilePath(storedPath, docTitle = 'Document') {
  if (!storedPath) return null;
  const stripped = storedPath.replace(/^uploads[\\\/]/i, '');
  const candidate1 = path.join(uploadsDir, stripped);
  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.join(uploadsDir, storedPath);
  if (fs.existsSync(candidate2)) return candidate2;

  // Auto-generate placeholder if created directly via MySQL Workbench
  try {
    const ext = path.extname(stripped).toLowerCase();
    if (ext === '.pdf') {
      const pdfContent = `%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (${docTitle || 'Document'}) >>\nendobj\ntrailer\n<< >>\n%%EOF`;
      fs.writeFileSync(candidate1, pdfContent);
      return candidate1;
    } else {
      fs.writeFileSync(candidate1, `Sample content for: ${docTitle}`);
      return candidate1;
    }
  } catch (e) {
    return candidate1;
  }
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  }
});

// Multer File Filter: Allow PDF, DOC, DOCX, JPG, PNG
const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const allowedMimes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (allowedExtensions.includes(ext) || allowedMimes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max limit
  }
});

// POST /api/documents/upload - Upload a new document
router.post('/upload', requireAuth, (req, res) => {
  upload.single('document')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File is too large. Maximum size allowed is 25 MB.' });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please select a document file to upload.' });
      }

      const { title, category_id, status } = req.body;
      const currentUserId = req.session.user.id;

      if (!title || !title.trim()) {
        // Remove uploaded file if title is missing
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Document title is required.' });
      }

      const docTitle = title.trim();
      const catId = category_id && !isNaN(category_id) ? parseInt(category_id) : null;
      const docStatus = (status && ['Active', 'Draft', 'Archived'].includes(status)) ? status : 'Active';
      const originalFileName = req.file.originalname;
      const storedFileName = req.file.filename;

      const [result] = await db.query(
        `INSERT INTO documents (user_id, category_id, title, file_name, file_path, upload_date, status)
         VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
        [currentUserId, catId, docTitle, originalFileName, storedFileName, docStatus]
      );

      return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully!',
        document_id: result.insertId,
        title: docTitle,
        file_name: originalFileName
      });
    } catch (uploadDbError) {
      console.error('[Document Upload DB Error]:', uploadDbError);
      // Clean up uploaded file if DB query fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ success: false, message: 'Failed to record document metadata.' });
    }
  });
});

// GET /api/documents - Get documents with search and category filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const { search, category_id, filter } = req.query;

    let query = `
      SELECT 
        d.document_id,
        d.user_id,
        d.category_id,
        d.title,
        d.file_name,
        d.file_path,
        d.upload_date,
        d.status,
        c.category_name,
        u.name AS owner_name,
        u.email AS owner_email,
        CASE 
          WHEN d.user_id = ? THEN 'owner'
          WHEN da.permission IS NOT NULL THEN da.permission
          ELSE 'none'
        END AS user_access_role
      FROM documents d
      LEFT JOIN categories c ON d.category_id = c.category_id
      LEFT JOIN users u ON d.user_id = u.user_id
      LEFT JOIN document_access da ON d.document_id = da.document_id AND da.user_id = ?
      WHERE (d.user_id = ? OR da.user_id = ?)
    `;

    const params = [currentUserId, currentUserId, currentUserId, currentUserId];

    // Filter by ownership tab: 'my' or 'shared'
    if (filter === 'my') {
      query += ` AND d.user_id = ?`;
      params.push(currentUserId);
    } else if (filter === 'shared') {
      query += ` AND d.user_id != ? AND da.user_id = ?`;
      params.push(currentUserId, currentUserId);
    }

    // Filter by Category
    if (category_id && !isNaN(category_id) && parseInt(category_id) > 0) {
      query += ` AND d.category_id = ?`;
      params.push(parseInt(category_id));
    }

    // Search by title or original file name
    if (search && search.trim()) {
      query += ` AND (d.title LIKE ? OR d.file_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    query += ` ORDER BY d.upload_date DESC`;

    const [documents] = await db.query(query, params);

    // Attach file size and extension details
    const enrichedDocs = documents.map(doc => {
      const fullPath = resolveFilePath(doc.file_path, doc.title);
      let sizeBytes = 0;
      try {
        if (fullPath && fs.existsSync(fullPath)) {
          sizeBytes = fs.statSync(fullPath).size;
        }
      } catch (e) {}

      const ext = path.extname(doc.file_name).toLowerCase().replace('.', '');
      return {
        ...doc,
        file_extension: ext,
        file_size: sizeBytes
      };
    });

    return res.json({
      success: true,
      count: enrichedDocs.length,
      documents: enrichedDocs
    });
  } catch (error) {
    console.error('[Document List Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve documents.' });
  }
});

// GET /api/documents/recent - Get recent documents for dashboard
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user.id;
    const query = `
      SELECT 
        d.document_id,
        d.user_id,
        d.title,
        d.file_name,
        d.upload_date,
        d.status,
        c.category_name,
        u.name AS owner_name,
        CASE 
          WHEN d.user_id = ? THEN 'owner'
          WHEN da.permission IS NOT NULL THEN da.permission
          ELSE 'none'
        END AS user_access_role
      FROM documents d
      LEFT JOIN categories c ON d.category_id = c.category_id
      LEFT JOIN users u ON d.user_id = u.user_id
      LEFT JOIN document_access da ON d.document_id = da.document_id AND da.user_id = ?
      WHERE (d.user_id = ? OR da.user_id = ?)
      ORDER BY d.upload_date DESC
      LIMIT 6
    `;

    const [recent] = await db.query(query, [currentUserId, currentUserId, currentUserId, currentUserId]);
    return res.json({ success: true, recent });
  } catch (error) {
    console.error('[Document Recent Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve recent documents.' });
  }
});

// GET /api/documents/download/:id - Secure document download
router.get('/download/:id', requireAuth, async (req, res) => {
  try {
    const docId = req.params.id;
    const currentUserId = req.session.user.id;
    const userRole = req.session.user.role;

    // Fetch document
    const [docs] = await db.query('SELECT * FROM documents WHERE document_id = ?', [docId]);
    if (docs.length === 0) {
      return res.status(404).send('Document not found.');
    }

    const doc = docs[0];

    // Check permission: Owner, Admin, or shared with 'download' permission
    let hasPermission = false;
    if (doc.user_id === currentUserId || userRole === 'admin') {
      hasPermission = true;
    } else {
      const [access] = await db.query(
        'SELECT permission FROM document_access WHERE document_id = ? AND user_id = ?',
        [docId, currentUserId]
      );
      if (access.length > 0 && access[0].permission === 'download') {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).send('Forbidden: You do not have download permission for this document.');
    }

    const filePath = resolveFilePath(doc.file_path, doc.title);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File missing on server storage.');
    }

    return res.download(filePath, doc.file_name);
  } catch (error) {
    console.error('[Document Download Error]:', error);
    return res.status(500).send('Error downloading file.');
  }
});

// GET /api/documents/view/:id - Secure document preview / inline stream
router.get('/view/:id', requireAuth, async (req, res) => {
  try {
    const docId = req.params.id;
    const currentUserId = req.session.user.id;
    const userRole = req.session.user.role;

    const [docs] = await db.query('SELECT * FROM documents WHERE document_id = ?', [docId]);
    if (docs.length === 0) {
      return res.status(404).send('Document not found.');
    }

    const doc = docs[0];

    // Check permission: Owner, Admin, or shared with 'view' or 'download'
    let hasPermission = false;
    if (doc.user_id === currentUserId || userRole === 'admin') {
      hasPermission = true;
    } else {
      const [access] = await db.query(
        'SELECT permission FROM document_access WHERE document_id = ? AND user_id = ?',
        [docId, currentUserId]
      );
      if (access.length > 0) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).send('Forbidden: You do not have permission to view this document.');
    }

    const filePath = resolveFilePath(doc.file_path, doc.title);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File missing on server storage.');
    }

    const ext = path.extname(doc.file_name).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('[Document View Error]:', error);
    return res.status(500).send('Error retrieving file preview.');
  }
});

// DELETE /api/documents/:id - Delete document (owner or admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const docId = req.params.id;
    const currentUserId = req.session.user.id;
    const userRole = req.session.user.role;

    // Check document
    const [docs] = await db.query('SELECT * FROM documents WHERE document_id = ?', [docId]);
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = docs[0];

    // Verify ownership
    if (doc.user_id !== currentUserId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only delete documents that you uploaded.' });
    }

    // Delete record from DB (foreign keys cascade to document_access)
    await db.query('DELETE FROM documents WHERE document_id = ?', [docId]);

    // Delete physical file
    const filePath = resolveFilePath(doc.file_path, doc.title);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn(`[File Delete Warning]: Failed to unlink file ${filePath}:`, err.message);
      }
    }

    return res.json({
      success: true,
      message: 'Document deleted successfully.'
    });
  } catch (error) {
    console.error('[Document Delete Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete document.' });
  }
});

module.exports = router;

