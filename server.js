require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { pool } = require('./config/database');
const { s3Client, uploadToSpaces } = require('./config/spaces');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (required for DO App Platform)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      error: error.message
    });
  }
});

// Storage health check
app.get('/health/storage', async (req, res) => {
  try {
    const params = {
      Bucket: process.env.SPACES_BUCKET
    };
    await s3Client.headBucket(params).promise();
    res.status(200).json({
      status: 'connected',
      bucket: process.env.SPACES_BUCKET
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DigitalOcean App Platform Starter',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      database: '/health/db',
      storage: '/health/storage',
      items: '/api/items',
      upload: '/api/upload'
    }
  });
});

// Example: Get all items from database
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Example: Create new item
app.post('/api/items', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const result = await pool.query(
      'INSERT INTO items (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Example: Upload file to DO Spaces
app.post('/api/upload', async (req, res) => {
  try {
    // In production, use multer or similar for file uploads
    // This is a simplified example
    const { filename, content, contentType } = req.body;

    if (!filename || !content) {
      return res.status(400).json({
        success: false,
        error: 'Filename and content are required'
      });
    }

    const fileUrl = await uploadToSpaces(
      filename,
      Buffer.from(content, 'base64'),
      contentType || 'application/octet-stream'
    );

    res.json({
      success: true,
      url: fileUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`☁️  Storage: ${process.env.SPACES_BUCKET || 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  await pool.end();
  process.exit(0);
});
