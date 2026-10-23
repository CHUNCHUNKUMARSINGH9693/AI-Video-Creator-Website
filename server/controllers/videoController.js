const db = require('../config/database');
const storage = require('../services/storageService');

/**
 * List video projects for the authenticated user
 */
async function getVideos(req, res) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '12', 10)));
    const offset = (page - 1) * limit;

    const { search, status, style, sort } = req.query;

    const whereClauses = ['user_id = ?'];
    const params = [userId];

    if (search && search.trim()) {
      whereClauses.push('(title LIKE ? OR prompt LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (status && status !== 'all') {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (style && style !== 'all') {
      whereClauses.push('style = ?');
      params.push(style);
    }

    let orderBy = 'created_at DESC';
    if (sort === 'oldest') orderBy = 'created_at ASC';
    else if (sort === 'title') orderBy = 'title ASC';
    else if (sort === 'duration') orderBy = 'duration_seconds DESC';

    const whereSql = whereClauses.join(' AND ');

    // Total count for pagination
    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM video_projects WHERE ${whereSql}`,
      params
    );
    const total = countRows[0].total || 0;

    // Fetch projects
    const projects = await db.query(
      `SELECT id, user_id, title, prompt, script, generation_type, style, language,
              duration_seconds, aspect_ratio, status, error_message, thumbnail_url,
              video_url, bg_music, voice_name, has_subtitles, target_platform,
              created_at, updated_at
       FROM video_projects
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('[VideoController.getVideos] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve video projects.' });
  }
}

/**
 * Get project by ID with its assets and recent job
 */
async function getVideoById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const projects = await db.query(
      `SELECT * FROM video_projects WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Video project not found.' });
    }

    const project = projects[0];

    // Get assets
    const assets = await db.query(
      `SELECT id, asset_type, storage_key, original_filename, mime_type, file_size, duration_seconds, created_at 
       FROM video_assets WHERE project_id = ? ORDER BY id DESC`,
      [id]
    );

    // Get latest generation job
    const jobs = await db.query(
      `SELECT id, provider, job_status, progress_percentage, current_step, error_message, started_at, completed_at, created_at
       FROM generation_jobs WHERE project_id = ? ORDER BY id DESC LIMIT 1`,
      [id]
    );

    // Get subtitles
    const subtitles = await db.query(
      `SELECT id, subtitle_text, language, subtitle_storage_key, font_size, font_color, position, created_at 
       FROM subtitles WHERE project_id = ? ORDER BY id DESC LIMIT 1`,
      [id]
    );

    // Get scenes
    const scenes = await db.query(
      `SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_order ASC`,
      [id]
    );

    return res.json({
      success: true,
      project: {
        ...project,
        assets,
        scenes,
        latestJob: jobs[0] || null,
        subtitles: subtitles[0] || null,
      },
    });
  } catch (error) {
    console.error('[VideoController.getVideoById] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load video project.' });
  }
}

/**
 * Create a new video project draft
 */
async function createVideo(req, res) {
  try {
    const userId = req.user.id;
    const {
      title,
      prompt,
      script,
      generation_type = 'text_to_video',
      style = 'cinematic',
      language = 'English',
      duration_seconds = 15,
      aspect_ratio = '16:9',
      bg_music = 'ambient_cinematic',
      voice_name = 'Alloy',
      has_subtitles = true,
      target_platform = 'general',
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Video prompt is required.' });
    }

    const finalTitle = (title && title.trim()) ? title.trim() : prompt.trim().slice(0, 40) + '...';

    const result = await db.query(
      `INSERT INTO video_projects 
        (user_id, title, prompt, script, generation_type, style, language, duration_seconds, aspect_ratio, status, bg_music, voice_name, has_subtitles, target_platform)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [
        userId,
        finalTitle,
        prompt.trim(),
        script ? script.trim() : null,
        generation_type,
        style,
        language,
        parseInt(duration_seconds, 10) || 15,
        aspect_ratio,
        bg_music,
        voice_name,
        has_subtitles ? 1 : 0,
        target_platform,
      ]
    );

    const newProjectId = result.insertId;

    return res.status(201).json({
      success: true,
      message: 'Video project created!',
      projectId: newProjectId,
    });
  } catch (error) {
    console.error('[VideoController.createVideo] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create video project.' });
  }
}

/**
 * Update project details
 */
async function updateVideo(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const projects = await db.query('SELECT id FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Video project not found.' });
    }

    const allowedFields = [
      'title',
      'prompt',
      'script',
      'style',
      'language',
      'duration_seconds',
      'aspect_ratio',
      'bg_music',
      'voice_name',
      'has_subtitles',
      'target_platform',
    ];

    const updates = [];
    const params = [];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    params.push(id, userId);
    await db.query(
      `UPDATE video_projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND user_id = ?`,
      params
    );

    return res.json({ success: true, message: 'Project updated successfully.' });
  } catch (error) {
    console.error('[VideoController.updateVideo] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update project.' });
  }
}

/**
 * Duplicate an existing project
 */
async function duplicateVideo(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const rows = await db.query('SELECT * FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const p = rows[0];
    const newTitle = `Copy of ${p.title}`;

    const result = await db.query(
      `INSERT INTO video_projects 
        (user_id, title, prompt, script, generation_type, style, language, duration_seconds, aspect_ratio, status, bg_music, voice_name, has_subtitles, target_platform)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [
        userId,
        newTitle,
        p.prompt,
        p.script,
        p.generation_type,
        p.style,
        p.language,
        p.duration_seconds,
        p.aspect_ratio,
        p.bg_music,
        p.voice_name,
        p.has_subtitles,
        p.target_platform,
      ]
    );

    return res.json({
      success: true,
      message: 'Project duplicated successfully.',
      projectId: result.insertId,
    });
  } catch (error) {
    console.error('[VideoController.duplicateVideo] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to duplicate project.' });
  }
}

/**
 * Delete a project and associated files
 */
async function deleteVideo(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get assets to delete files
    const assets = await db.query(
      'SELECT storage_key FROM video_assets WHERE project_id = ?',
      [id]
    );

    assets.forEach((asset) => {
      storage.removeFile(asset.storage_key);
    });

    const result = await db.query('DELETE FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    return res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('[VideoController.deleteVideo] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete project.' });
  }
}

/**
 * Aggregated dashboard stats
 */
async function getDashboardStats(req, res) {
  try {
    const userId = req.user.id;

    // Totals query
    const statsRows = await db.query(
      `SELECT 
         COUNT(*) as total_videos,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_videos,
         SUM(CASE WHEN status = 'processing' OR status = 'queued' THEN 1 ELSE 0 END) as processing_videos,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_videos
       FROM video_projects 
       WHERE user_id = ?`,
      [userId]
    );

    // Recent 5 projects
    const recentProjects = await db.query(
      `SELECT id, title, prompt, style, aspect_ratio, status, thumbnail_url, video_url, duration_seconds, created_at 
       FROM video_projects 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId]
    );

    return res.json({
      success: true,
      stats: statsRows[0] || { total_videos: 0, completed_videos: 0, processing_videos: 0, failed_videos: 0 },
      recentProjects,
    });
  } catch (error) {
    console.error('[VideoController.getDashboardStats] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard stats.' });
  }
}

module.exports = {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  duplicateVideo,
  deleteVideo,
  getDashboardStats,
};
