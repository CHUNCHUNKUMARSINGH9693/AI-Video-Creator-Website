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
 * Helper to generate a clean, meaningful filename following project conventions
 * Format: ai-video-creator-[sanitized-title]-[YYYY-MM-DD]-[resolution]-[aspectRatio].mp4
 */
function generateSanitizedFilename(title, dateStr, resolution, aspectRatio) {
  const cleanTitle = (title || 'video')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'video';

  const cleanDate = dateStr || new Date().toISOString().slice(0, 10);
  const cleanAspect = (aspectRatio || '16:9').replace(':', 'x');
  const cleanRes = resolution || '1080p';

  return `ai-video-creator-${cleanTitle}-${cleanDate}-${cleanRes}-${cleanAspect}.mp4`;
}

/**
 * Direct file download endpoint with streaming, meaningful filenames, and resolution/aspect adaptation
 */
async function downloadVideo(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      resolution = '1080p',
      aspect_ratio,
      export_id,
      filename: customFilename,
    } = req.query;

    const projects = await db.query('SELECT * FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });

    const project = projects[0];
    if (project.status !== 'completed' || !project.video_url) {
      return res.status(400).json({
        success: false,
        message: 'Video rendering is not completed yet. Please wait until generation completes before downloading.',
      });
    }

    const masterPath = storage.getAbsolutePath(project.video_url.replace(/^\//, ''));
    if (!fs.existsSync(masterPath)) {
      return res.status(404).json({ success: false, message: 'Master video file not found on disk.' });
    }

    const targetAspect = aspect_ratio || project.aspect_ratio || '16:9';
    const targetRes = resolution || '1080p';

    let targetFilePath = null;

    // 1. If explicit export_id is requested, find that export file
    if (export_id) {
      const exports = await db.query(
        'SELECT * FROM video_exports WHERE id = ? AND project_id = ?',
        [export_id, id]
      );
      if (exports.length > 0) {
        const candidate = storage.getAbsolutePath(exports[0].storage_key);
        if (fs.existsSync(candidate)) {
          targetFilePath = candidate;
        }
      }
    }

    // 2. If no export_id, check if master matches requested aspect ratio and 1080p
    if (!targetFilePath) {
      const isMasterAspect = targetAspect === project.aspect_ratio;
      if (isMasterAspect && (targetRes === '1080p' || !targetRes)) {
        targetFilePath = masterPath;
      } else {
        // Look for existing cached export for this project, aspect ratio and resolution
        const safeAspect = targetAspect.replace(':', 'x');
        const cachedFilename = `export_${id}_${safeAspect}_${targetRes}.mp4`;
        const cachedStorageKey = path.join('uploads', 'generated', cachedFilename);
        const cachedFullPath = storage.getAbsolutePath(cachedStorageKey);

        if (fs.existsSync(cachedFullPath)) {
          targetFilePath = cachedFullPath;
        } else {
          // Render customized resolution/aspect ratio with FFmpeg
          await videoProcessor.exportCustomVideo({
            inputPath: masterPath,
            outputPath: cachedFullPath,
            targetAspectRatio: targetAspect,
            targetResolution: targetRes,
          });

          const stat = fs.statSync(cachedFullPath);
          await db.query(
            `INSERT INTO video_exports 
              (project_id, platform, aspect_ratio, resolution, format, storage_key, file_size, export_status)
             VALUES (?, 'custom_download', ?, ?, 'mp4', ?, ?, 'completed')`,
            [id, targetAspect, targetRes, cachedStorageKey, stat.size]
          );

          targetFilePath = cachedFullPath;
        }
      }
    }

    // 3. Generate meaningful sanitized filename
    const createdDate = project.created_at ? new Date(project.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const downloadFilename = customFilename && customFilename.trim().length > 0
      ? (customFilename.endsWith('.mp4') ? customFilename : `${customFilename}.mp4`).replace(/[^a-z0-9_.-]/gi, '_')
      : generateSanitizedFilename(project.title, createdDate, targetRes, targetAspect);

    // 4. Stream file efficiently using res.download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.download(targetFilePath, downloadFilename);
  } catch (error) {
    console.error('[ExportController.downloadVideo] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to download file.', error: error.message });
  }
}

/**
 * Prepare custom export/download (transcodes if necessary before direct stream)
 */
async function prepareDownload(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { resolution = '1080p', aspectRatio, format = 'mp4' } = req.body;

    const projects = await db.query('SELECT * FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });

    const project = projects[0];
    if (project.status !== 'completed' || !project.video_url) {
      return res.status(400).json({
        success: false,
        message: 'Video rendering is not completed yet. Please wait until generation completes.',
      });
    }

    const masterPath = storage.getAbsolutePath(project.video_url.replace(/^\//, ''));
    if (!fs.existsSync(masterPath)) {
      return res.status(404).json({ success: false, message: 'Master video file missing on disk.' });
    }

    const targetAspect = aspectRatio || project.aspect_ratio || '16:9';
    const targetRes = resolution || '1080p';
    const isMaster = targetAspect === project.aspect_ratio && targetRes === '1080p';

    let finalPath = masterPath;
    let exportId = null;

    if (!isMaster) {
      const safeAspect = targetAspect.replace(':', 'x');
      const cachedFilename = `export_${id}_${safeAspect}_${targetRes}.mp4`;
      const cachedStorageKey = path.join('uploads', 'generated', cachedFilename);
      finalPath = storage.getAbsolutePath(cachedStorageKey);

      if (!fs.existsSync(finalPath)) {
        await videoProcessor.exportCustomVideo({
          inputPath: masterPath,
          outputPath: finalPath,
          targetAspectRatio: targetAspect,
          targetResolution: targetRes,
        });

        const stat = fs.statSync(finalPath);
        const insertRes = await db.query(
          `INSERT INTO video_exports 
            (project_id, platform, aspect_ratio, resolution, format, storage_key, file_size, export_status)
           VALUES (?, 'custom_download', ?, ?, 'mp4', ?, ?, 'completed')`,
          [id, targetAspect, targetRes, cachedStorageKey, stat.size]
        );
        exportId = insertRes.insertId;
      }
    }

    const stat = fs.statSync(finalPath);
    const createdDate = project.created_at ? new Date(project.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const downloadFilename = generateSanitizedFilename(project.title, createdDate, targetRes, targetAspect);

    return res.json({
      success: true,
      message: 'Download ready!',
      filename: downloadFilename,
      fileSize: stat.size,
      resolution: targetRes,
      aspectRatio: targetAspect,
      format,
      exportId,
      downloadUrl: `/api/videos/${id}/download?resolution=${targetRes}&aspect_ratio=${encodeURIComponent(targetAspect)}${exportId ? `&export_id=${exportId}` : ''}`,
    });
  } catch (error) {
    console.error('[ExportController.prepareDownload] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to prepare download.', error: error.message });
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
  prepareDownload,
  getExports,
  PLATFORM_PRESETS,
};
