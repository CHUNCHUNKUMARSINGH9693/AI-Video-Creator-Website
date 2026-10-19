const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const storage = require('../services/storageService');
const videoProcessor = require('../services/videoProcessor');

/**
 * Trim video start and end
 */
async function trim(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { startTime = 0, duration = null } = req.body;

    const projects = await db.query('SELECT * FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });

    const project = projects[0];
    if (!project.video_url) return res.status(400).json({ success: false, message: 'Project has no video to trim.' });

    // Find local input video path
    const inputPath = storage.getAbsolutePath(project.video_url.replace(/^\//, ''));
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ success: false, message: 'Source video file not found on disk.' });
    }

    const trimmedFilename = storage.getUniqueFilename(`${project.title}_trimmed.mp4`, 'trim');
    const trimmedStorageKey = path.join('uploads', 'generated', trimmedFilename);
    const trimmedFullPath = storage.getAbsolutePath(trimmedStorageKey);

    await videoProcessor.trimVideo(inputPath, trimmedFullPath, parseFloat(startTime), duration ? parseFloat(duration) : null);

    const newVideoUrl = storage.getPublicUrl(trimmedStorageKey);

    // Update project
    await db.query('UPDATE video_projects SET video_url = ?, updated_at = NOW() WHERE id = ?', [newVideoUrl, id]);

    return res.json({
      success: true,
      message: 'Video trimmed successfully!',
      videoUrl: newVideoUrl,
    });
  } catch (error) {
    console.error('[EditorController.trim] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to trim video.', error: error.message });
  }
}

/**
 * Resize video to another aspect ratio (16:9, 9:16, 1:1)
 */
async function resize(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { aspectRatio } = req.body;

    if (!aspectRatio || !['16:9', '9:16', '1:1'].includes(aspectRatio)) {
      return res.status(400).json({ success: false, message: 'Valid aspect ratio is required (16:9, 9:16, 1:1).' });
    }

    const projects = await db.query('SELECT * FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });

    const project = projects[0];
    const inputPath = storage.getAbsolutePath(project.video_url.replace(/^\//, ''));
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ success: false, message: 'Source video file not found.' });
    }

    const resizedFilename = storage.getUniqueFilename(`${project.title}_${aspectRatio.replace(':', 'x')}.mp4`, 'resize');
    const resizedStorageKey = path.join('uploads', 'generated', resizedFilename);
    const resizedFullPath = storage.getAbsolutePath(resizedStorageKey);

    await videoProcessor.resizeVideo(inputPath, resizedFullPath, aspectRatio);

    const newVideoUrl = storage.getPublicUrl(resizedStorageKey);

    await db.query(
      'UPDATE video_projects SET video_url = ?, aspect_ratio = ?, updated_at = NOW() WHERE id = ?',
      [newVideoUrl, aspectRatio, id]
    );

    return res.json({
      success: true,
      message: `Video converted to ${aspectRatio}!`,
      videoUrl: newVideoUrl,
      aspectRatio,
    });
  } catch (error) {
    console.error('[EditorController.resize] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resize video.', error: error.message });
  }
}

/**
 * Extract or update thumbnail from video
 */
async function setThumbnail(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { timestamp = 1 } = req.body;

    const projects = await db.query('SELECT * FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });

    const project = projects[0];
    const inputPath = storage.getAbsolutePath(project.video_url.replace(/^\//, ''));
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ success: false, message: 'Source video file not found.' });
    }

    const thumbFilename = storage.getUniqueFilename(`${project.title}_frame.jpg`, 'thumb');
    const thumbStorageKey = path.join('uploads', 'thumbnails', thumbFilename);
    const thumbFullPath = storage.getAbsolutePath(thumbStorageKey);

    await videoProcessor.extractThumbnail(inputPath, thumbFullPath, parseFloat(timestamp));

    const newThumbUrl = storage.getPublicUrl(thumbStorageKey);
    await db.query('UPDATE video_projects SET thumbnail_url = ?, updated_at = NOW() WHERE id = ?', [newThumbUrl, id]);

    return res.json({
      success: true,
      message: 'Thumbnail updated!',
      thumbnailUrl: newThumbUrl,
    });
  } catch (error) {
    console.error('[EditorController.setThumbnail] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to extract thumbnail.' });
  }
}

/**
 * Update project subtitles
 */
async function updateSubtitles(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { subtitleText, language = 'English', fontSize = 24, fontColor = '#FFFFFF', position = 'bottom' } = req.body;

    const projects = await db.query('SELECT * FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });

    const project = projects[0];
    const srtFilename = storage.getUniqueFilename(`${project.title}_subtitles.srt`, 'sub');
    const srtStorageKey = path.join('uploads', 'subtitles', srtFilename);
    const srtFullPath = storage.getAbsolutePath(srtStorageKey);

    const srtContent = videoProcessor.generateSrtContent(subtitleText, project.duration_seconds || 15);
    fs.writeFileSync(srtFullPath, srtContent, 'utf8');

    // Update or insert into subtitles table
    const existing = await db.query('SELECT id FROM subtitles WHERE project_id = ?', [id]);
    if (existing.length > 0) {
      await db.query(
        `UPDATE subtitles 
         SET subtitle_text = ?, language = ?, subtitle_storage_key = ?, font_size = ?, font_color = ?, position = ?
         WHERE project_id = ?`,
        [subtitleText, language, srtStorageKey, fontSize, fontColor, position, id]
      );
    } else {
      await db.query(
        `INSERT INTO subtitles 
         (project_id, subtitle_text, language, subtitle_storage_key, font_size, font_color, position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, subtitleText, language, srtStorageKey, fontSize, fontColor, position]
      );
    }

    return res.json({
      success: true,
      message: 'Subtitles saved successfully!',
      subtitleUrl: storage.getPublicUrl(srtStorageKey),
      srtContent,
    });
  } catch (error) {
    console.error('[EditorController.updateSubtitles] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update subtitles.' });
  }
}

/**
 * Upload an asset for a video project (images, audio)
 */
async function uploadAsset(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const projects = await db.query('SELECT id FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) {
      storage.removeFile(req.file.path);
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Determine asset type
    let assetType = 'video_clip';
    if (req.file.mimetype.startsWith('image/')) assetType = 'source_image';
    else if (req.file.mimetype.startsWith('audio/')) assetType = 'audio_track';

    const relativeKey = path.relative(path.resolve(__dirname, '../../'), req.file.path);

    const result = await db.query(
      `INSERT INTO video_assets (project_id, asset_type, storage_key, original_filename, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, assetType, relativeKey, req.file.originalname, req.file.mimetype, req.file.size]
    );

    return res.status(201).json({
      success: true,
      message: 'Asset uploaded successfully!',
      asset: {
        id: result.insertId,
        assetType,
        url: storage.getPublicUrl(relativeKey),
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('[EditorController.uploadAsset] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload asset.' });
  }
}

module.exports = {
  trim,
  resize,
  setThumbnail,
  updateSubtitles,
  uploadAsset,
};
