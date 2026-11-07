const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
}

// GET /api/categories - Get all categories with document count (and optional search)
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        c.category_id,
        c.category_name,
        c.description,
        COUNT(d.document_id) AS document_count
      FROM categories c
      LEFT JOIN documents d ON c.category_id = d.category_id
    `;
    const params = [];

    if (search && search.trim()) {
      query += ` WHERE c.category_name LIKE ? OR c.description LIKE ?`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    query += `
      GROUP BY c.category_id, c.category_name, c.description
      ORDER BY c.category_id ASC
    `;
    const [categories] = await db.query(query, params);

    return res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('[Categories GET Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// GET /api/categories/:id - Get single category
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM categories WHERE category_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    return res.json({ success: true, category: rows[0] });
  } catch (error) {
    console.error('[Category GET One Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch category details.' });
  }
});

// POST /api/categories - Create new category
router.post('/', requireAuth, async (req, res) => {
  try {
    const { category_name, description } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const trimmedName = category_name.trim();
    const trimmedDesc = description ? description.trim() : null;

    // Check for duplicate category name
    const [existing] = await db.query('SELECT category_id FROM categories WHERE category_name = ?', [trimmedName]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
    }

    const [result] = await db.query(
      'INSERT INTO categories (category_name, description) VALUES (?, ?)',
      [trimmedName, trimmedDesc]
    );

    return res.status(201).json({
      success: true,
      message: 'Category created successfully!',
      category: {
        category_id: result.insertId,
        category_name: trimmedName,
        description: trimmedDesc,
        document_count: 0
      }
    });
  } catch (error) {
    console.error('[Category Create Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
});

// PUT /api/categories/:id - Update existing category
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, description } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const trimmedName = category_name.trim();
    const trimmedDesc = description ? description.trim() : null;

    // Check if category exists
    const [existing] = await db.query('SELECT category_id FROM categories WHERE category_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // Check duplicate name on another category
    const [duplicate] = await db.query(
      'SELECT category_id FROM categories WHERE category_name = ? AND category_id != ?',
      [trimmedName, id]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ success: false, message: 'Another category with this name already exists.' });
    }

    await db.query(
      'UPDATE categories SET category_name = ?, description = ? WHERE category_id = ?',
      [trimmedName, trimmedDesc, id]
    );

    return res.json({
      success: true,
      message: 'Category updated successfully!'
    });
  } catch (error) {
    console.error('[Category Update Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT category_id FROM categories WHERE category_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // Check if documents are using this category
    const [docs] = await db.query('SELECT COUNT(*) as count FROM documents WHERE category_id = ?', [id]);
    const docCount = docs[0].count;

    // Delete category - foreign key sets category_id to NULL in documents
    await db.query('DELETE FROM categories WHERE category_id = ?', [id]);

    return res.json({
      success: true,
      message: docCount > 0 
        ? `Category deleted. ${docCount} linked document(s) have been marked Uncategorized.`
        : 'Category deleted successfully.'
    });
  } catch (error) {
    console.error('[Category Delete Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
});

module.exports = router;
