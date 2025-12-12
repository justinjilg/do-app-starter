const express = require('express');
const { pool } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadToSpaces, deleteFromSpaces } = require('../config/spaces');

const router = express.Router();

/**
 * GET /api/items
 * Get all items (public) or user's items if authenticated
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    let query, params;

    if (req.user) {
      // Get only user's items if authenticated
      query = 'SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC';
      params = [req.user.id];
    } else {
      // Get public items (could add a is_public column)
      query = 'SELECT id, name, description, created_at FROM items ORDER BY created_at DESC LIMIT 10';
      params = [];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get items',
      code: 'ITEMS_ERROR'
    });
  }
});

/**
 * GET /api/items/:id
 * Get single item by ID
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM items WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
        code: 'NOT_FOUND'
      });
    }

    const item = result.rows[0];

    // Check if user owns this item or if it's public
    if (item.user_id && (!req.user || item.user_id !== req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN'
      });
    }

    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get item',
      code: 'ITEM_ERROR'
    });
  }
});

/**
 * POST /api/items
 * Create new item (requires authentication)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, metadata } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
        code: 'MISSING_NAME'
      });
    }

    const result = await pool.query(
      'INSERT INTO items (name, description, user_id, metadata) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, req.user.id, metadata || {}]
    );

    res.status(201).json({
      success: true,
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create item',
      code: 'CREATE_ERROR'
    });
  }
});

/**
 * PUT /api/items/:id
 * Update item (requires authentication and ownership)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, metadata } = req.body;

    // Check ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
        code: 'NOT_FOUND'
      });
    }

    if (checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you do not own this item',
        code: 'FORBIDDEN'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(metadata);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
        code: 'NO_UPDATES'
      });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      success: true,
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update item',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /api/items/:id
 * Delete item (requires authentication and ownership)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
        code: 'NOT_FOUND'
      });
    }

    if (checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you do not own this item',
        code: 'FORBIDDEN'
      });
    }

    // Delete associated uploads from Spaces
    const uploads = await pool.query(
      'SELECT file_url, filename FROM uploads WHERE item_id = $1',
      [id]
    );

    for (const upload of uploads.rows) {
      try {
        // Extract key from file_url
        const url = new URL(upload.file_url);
        const key = url.pathname.substring(1); // Remove leading /
        await deleteFromSpaces(key);
      } catch (err) {
        console.error('Error deleting file from Spaces:', err);
      }
    }

    // Delete item (cascades to uploads)
    await pool.query('DELETE FROM items WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item',
      code: 'DELETE_ERROR'
    });
  }
});

/**
 * POST /api/items/:id/upload
 * Upload file to Spaces and associate with item
 * Note: This is a simplified version. For production, use multer or similar
 */
router.post('/:id/upload', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { filename, content, contentType } = req.body;

    if (!filename || !content) {
      return res.status(400).json({
        success: false,
        error: 'Filename and content are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
        code: 'NOT_FOUND'
      });
    }

    if (checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN'
      });
    }

    // Upload to Spaces
    const buffer = Buffer.from(content, 'base64');
    const key = `items/${id}/${Date.now()}-${filename}`;
    const fileUrl = await uploadToSpaces(
      key,
      buffer,
      contentType || 'application/octet-stream'
    );

    // Save upload record
    const result = await pool.query(
      'INSERT INTO uploads (user_id, item_id, filename, file_url, file_size, content_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, id, filename, fileUrl, buffer.length, contentType]
    );

    res.json({
      success: true,
      upload: result.rows[0]
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      code: 'UPLOAD_ERROR'
    });
  }
});

/**
 * GET /api/items/:id/uploads
 * Get all uploads for an item
 */
router.get('/:id/uploads', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
        code: 'NOT_FOUND'
      });
    }

    if (checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN'
      });
    }

    const result = await pool.query(
      'SELECT * FROM uploads WHERE item_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      uploads: result.rows
    });
  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get uploads',
      code: 'UPLOADS_ERROR'
    });
  }
});

module.exports = router;
