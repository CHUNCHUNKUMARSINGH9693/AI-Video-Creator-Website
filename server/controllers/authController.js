const db = require('../config/database');
const { hashPassword, comparePassword, generateToken } = require('../utils/crypto');
const crypto = require('crypto');

/**
 * Register a new user
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check if user already exists
    const existing = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, credits, plan_tier) VALUES (?, ?, ?, 'user', 100, 'free')`,
      [name.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const userId = result.insertId;
    const token = generateToken({ userId, email, role: 'user' });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: 'user',
        credits: 100,
        plan_tier: 'free',
        profile_image: null,
      },
    });
  } catch (error) {
    console.error('[AuthController.register] Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.', error: error.message });
  }
}

/**
 * Login existing user
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const users = await db.query(
      'SELECT id, name, email, password_hash, role, credits, plan_tier, profile_image FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];
    const passwordValid = await comparePassword(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    delete user.password_hash;
    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user,
    });
  } catch (error) {
    console.error('[AuthController.login] Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.', error: error.message });
  }
}

/**
 * Get current authenticated user profile
 */
async function getMe(req, res) {
  try {
    const users = await db.query(
      'SELECT id, name, email, role, credits, plan_tier, profile_image, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Get count of user's videos
    const projectStats = await db.query(
      `SELECT 
         COUNT(*) as total_projects,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
         SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_projects
       FROM video_projects 
       WHERE user_id = ?`,
      [req.user.id]
    );

    return res.json({
      success: true,
      user: users[0],
      stats: projectStats[0] || { total_projects: 0, completed_projects: 0, processing_projects: 0 },
    });
  } catch (error) {
    console.error('[AuthController.getMe] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}

/**
 * Update user profile
 */
async function updateProfile(req, res) {
  try {
    const { name, profile_image } = req.body;
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (profile_image !== undefined) {
      updates.push('profile_image = ?');
      params.push(profile_image);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    params.push(req.user.id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('[AuthController.updateProfile] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

/**
 * Change password
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const rows = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    const valid = await comparePassword(currentPassword, rows[0].password_hash);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('[AuthController.changePassword] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
}

/**
 * Forgot password - create reset token
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const rows = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (rows.length === 0) {
      // Don't leak whether email exists
      return res.json({ success: true, message: 'If this email exists, a password reset link has been dispatched.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetToken, expiry, rows[0].id]
    );

    // In a production app, send email with reset link
    return res.json({
      success: true,
      message: 'Password reset code generated. Use the reset token below.',
      resetToken, // Returned for easy local demonstration
    });
  } catch (error) {
    console.error('[AuthController.forgotPassword] Error:', error);
    return res.status(500).json({ success: false, message: 'Error processing forgot password.' });
  }
}

/**
 * Reset password with token
 */
async function resetPassword(req, res) {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const rows = await db.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [resetToken]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    const newHash = await hashPassword(newPassword);
    await db.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [newHash, rows[0].id]
    );

    return res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
  } catch (error) {
    console.error('[AuthController.resetPassword] Error:', error);
    return res.status(500).json({ success: false, message: 'Error resetting password.' });
  }
}

/**
 * Delete account
 */
async function deleteAccount(req, res) {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.user.id]);
    return res.json({ success: true, message: 'Account and associated data deleted successfully.' });
  } catch (error) {
    console.error('[AuthController.deleteAccount] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete account.' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
};
