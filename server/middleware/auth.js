const { verifyToken } = require('../utils/crypto');
const db = require('../config/database');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    // Fetch user from DB if connected
    try {
      const users = await db.query(
        'SELECT id, name, email, role, credits, plan_tier, profile_image FROM users WHERE id = ?',
        [decoded.userId]
      );
      if (users.length === 0) {
        return res.status(401).json({ success: false, message: 'User not found or account removed.' });
      }
      req.user = users[0];
    } catch (dbErr) {
      // In case DB is momentarily unavailable, attach token info
      req.user = { id: decoded.userId, email: decoded.email, role: decoded.role || 'user' };
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied: Admin privileges required.' });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};
