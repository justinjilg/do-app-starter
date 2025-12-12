const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expiration

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      jti: `${user.id}-${Date.now()}` // JWT ID for session tracking
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 * Protects routes by requiring valid JWT token
 */
async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if session is still valid (optional - for token blacklisting)
    const sessionCheck = await pool.query(
      'SELECT id FROM sessions WHERE token_jti = $1 AND expires_at > NOW()',
      [decoded.jti]
    );

    if (sessionCheck.rows.length === 0) {
      // Session doesn't exist or expired
      return res.status(401).json({
        success: false,
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      });
    }

    // Get user from database
    const userResult = await pool.query(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Attach user to request
    req.user = userResult.rows[0];
    req.token = decoded;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (decoded) {
        const userResult = await pool.query(
          'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1',
          [decoded.id]
        );

        if (userResult.rows.length > 0) {
          req.user = userResult.rows[0];
          req.token = decoded;
        }
      }
    }

    next();
  } catch (error) {
    // Fail silently for optional auth
    next();
  }
}

/**
 * Create session in database (for token management)
 */
async function createSession(userId, tokenJti, expiresInDays = 7) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await pool.query(
    'INSERT INTO sessions (user_id, token_jti, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenJti, expiresAt]
  );
}

/**
 * Revoke session (logout)
 */
async function revokeSession(tokenJti) {
  await pool.query('DELETE FROM sessions WHERE token_jti = $1', [tokenJti]);
}

/**
 * Clean up expired sessions (run periodically)
 */
async function cleanupExpiredSessions() {
  const result = await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
  console.log(`Cleaned up ${result.rowCount} expired sessions`);
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  optionalAuth,
  createSession,
  revokeSession,
  cleanupExpiredSessions,
  JWT_SECRET
};
