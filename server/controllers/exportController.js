const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const storage = require('../services/storageService');
const videoProcessor = require('../services/videoProcessor');

// Platform recommendations & presets
const PLATFORM_PRESETS = {
  youtube: {
    landscape: { aspect: '16:9', resolution: '1080p', desc: 'YouTube Standard (1920x1080, 16:9, H.264/AAC)' },
    shorts: { aspect: '9:16', resolution: '1080p', desc: 'YouTube Shorts (1080x1920, 9:16, < 60s)' },
  },
  instagram: {
    reels: { aspect: '9:16', resolution: '1080p', desc: 'Instagram Reels (1080x1920, 9:16)' },
    square: { aspect: '1:1', resolution: '1080p', desc: 'Instagram Feed Square (1080x1080, 1:1)' },
  },
  facebook: {
    landscape: { aspect: '16:9', resolution: '1080p', desc: 'Facebook Video (1920x1080, 16:9)' },
    vertical: { aspect: '9:16', resolution: '1080p', desc: 'Facebook Reels / Stories (1080x1920, 9:16)' },
  },
};

/**
 * Generate platform-specific export
 */
async function exportForPlatform(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { platform = 'youtube', presetType = 'landscape', resolution = '1080p' } = req.body;

    const projects = await db.query('SELECT * FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });

    const project = projects[0];
    if (!project.video_url) return res.status(400).json({ success: false, message: 'Project has no generated video.' });

    const platformConfig = PLATFORM_PRESETS[platform] || PLATFORM_PRESETS.youtube;
    const targetConfig = platformConfig[presetType] || Object.values(platformConfig)[0];
    const targetAspect = targetConfig.aspect;

    const inputPath = storage.getAbsolutePath(project.video_url.replace(/^\//, ''));
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ success: false, message: 'Source video file missing.' });
    }

    const exportFilename = storage.getUniqueFilename(`${project.title}_${platform}_${presetType}.mp4`, 'export');
    const exportStorageKey = path.join('uploads', 'generated', exportFilename);
    const exportFullPath = storage.getAbsolutePath(exportStorageKey);

    // If source aspect matches target, we copy or optimize; if differs, resize
    if (project.aspect_ratio === targetAspect) {
      fs.copyFileSync(inputPath, exportFullPath);
    } else {
      await videoProcessor.resizeVideo(inputPath, exportFullPath, targetAspect);
    }

    const stats = fs.statSync(exportFullPath);

    // Save export in DB
    const result = await db.query(
      `INSERT INTO video_exports 
        (project_id, platform, aspect_ratio, resolution, format, storage_key, file_size, export_status)
       VALUES (?, ?, ?, ?, 'mp4', ?, ?, 'completed')`,
      [id, platform, targetAspect, resolution, exportStorageKey, stats.size]
    );

    const downloadUrl = storage.getPublicUrl(exportStorageKey);

    // Suggest tags & hashtags based on prompt & title
    const cleanWords = `${project.title} ${project.prompt}`
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 10);

    const hashtags = [...new Set(cleanWords)].map((w) => `#${w}`).join(' ');

    return res.status(201).json({
      success: true,
      message: `Export for ${platform.toUpperCase()} (${presetType}) completed!`,
      export: {
        id: result.insertId,
        platform,
        presetType,
        aspectRatio: targetAspect,
        resolution,
        downloadUrl,
        fileSize: stats.size,
        suggestedHashtags: hashtags,
        suggestedCaption: `${project.title}\n\nCreated with AI Video Creator 🚀\n\n${hashtags}`,
      },
    });
  } catch (error) {
    console.error('[ExportController.exportForPlatform] Error:', error);
    return res.status(500).json({ success: false, message: 'Export failed.', error: error.message });
  }
}

/**
 * Direct file download endpoint
 */
async function downloadVideo(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const projects = await db.query('SELECT * FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });

    const project = projects[0];
    if (!project.video_url) return res.status(404).json({ success: false, message: 'No video file available.' });

    const filePath = storage.getAbsolutePath(project.video_url.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Video file not found on disk.' });
    }

    const filename = `${project.title.replace(/[^a-z0-9_-]/gi, '_')}.mp4`;
    return res.download(filePath, filename);
  } catch (error) {
    console.error('[ExportController.downloadVideo] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to download file.' });
  }
}

/**
 * List exports for a project
 */
async function getExports(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const exports = await db.query(
      `SELECT e.* FROM video_exports e
       JOIN video_projects p ON e.project_id = p.id
       WHERE e.project_id = ? AND p.user_id = ?
       ORDER BY e.created_at DESC`,
      [id, userId]
    );

    const formatted = exports.map((exp) => ({
      ...exp,
      url: storage.getPublicUrl(exp.storage_key),
    }));

    return res.json({ success: true, exports: formatted });
  } catch (error) {
    console.error('[ExportController.getExports] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve exports.' });
  }
}

module.exports = {
  exportForPlatform,
  downloadVideo,
  getExports,
  PLATFORM_PRESETS,
};
