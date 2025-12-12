require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { pool } = require('./config/database');
const { s3Client } = require('./config/spaces');
const { cleanupExpiredSessions } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const itemRoutes = require('./routes/items');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Stricter limit for auth endpoints
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT'
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Higher limit for authenticated users
  message: {
    success: false,
    error: 'API rate limit exceeded',
    code: 'API_RATE_LIMIT'
  }
});

// Apply rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/', apiLimiter);

// Health check endpoints (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0-mobile'
  });
});

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

app.get('/health/storage', async (req, res) => {
  try {
    if (!process.env.SPACES_BUCKET) {
      return res.status(503).json({
        status: 'not_configured',
        error: 'Spaces bucket not configured'
      });
    }

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

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    name: 'DigitalOcean App Platform Mobile API',
    version: '2.0.0',
    description: 'REST API for mobile applications with JWT authentication',
    endpoints: {
      health: {
        '/health': 'Application health status',
        '/health/db': 'Database connection status',
        '/health/storage': 'Spaces storage status'
      },
      auth: {
        'POST /api/auth/signup': 'Create new account',
        'POST /api/auth/login': 'Login and get JWT token',
        'POST /api/auth/logout': 'Logout (revoke session)',
        'POST /api/auth/refresh': 'Refresh JWT token'
      },
      users: {
        'GET /api/users/me': 'Get current user profile',
        'PUT /api/users/me': 'Update profile',
        'PUT /api/users/me/password': 'Change password',
        'GET /api/users/me/items': 'Get user\'s items',
        'DELETE /api/users/me': 'Delete account'
      },
      items: {
        'GET /api/items': 'Get all items',
        'GET /api/items/:id': 'Get single item',
        'POST /api/items': 'Create item (auth required)',
        'PUT /api/items/:id': 'Update item (auth required)',
        'DELETE /api/items/:id': 'Delete item (auth required)',
        'POST /api/items/:id/upload': 'Upload file (auth required)',
        'GET /api/items/:id/uploads': 'Get item uploads (auth required)'
      }
    },
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      get_token: 'POST /api/auth/login or /api/auth/signup'
    },
    documentation: 'See MOBILE-API-GUIDE.md for full documentation and examples'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(400).json({
      success: false,
      error: 'Duplicate entry',
      code: 'DUPLICATE_ENTRY'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    code: 'SERVER_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Mobile API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`☁️  Storage: ${process.env.SPACES_BUCKET || 'Not configured'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Using default (change in production!)'}`);
  console.log(`📱 Mobile API ready for connections`);
});

// Session cleanup every hour
setInterval(() => {
  cleanupExpiredSessions().catch(err => {
    console.error('Session cleanup error:', err);
  });
}, 60 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server gracefully...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

module.exports = app;
