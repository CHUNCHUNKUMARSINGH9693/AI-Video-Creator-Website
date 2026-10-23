/**
 * Slideshow Controller: Audio-to-Video and Image-to-Video Workflows
 * Handles audio validation and analysis, free image search integration,
 * scene reel creation, timeline reordering, and background video rendering.
 */

const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const storage = require('../services/storageService');
const audioService = require('../services/audioService');
const imageSearch = require('../services/imageSearchService');
const generationQueue = require('../jobs/generationQueue');

/**
 * 1. Analyze uploaded audio, extract metadata/waveform, and propose synchronized scenes
 */
async function analyzeAudio(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an audio file (MP3, WAV, AAC, M4A, OGG).' });
    }

    const audioFilePath = req.file.path;
    const {
      visualTheme = 'cinematic',
      userDescription = '',
      isMusic = 'false',
      speechText = '',
    } = req.body;

    // Relative storage key
    const relativeKey = path.relative(path.resolve(__dirname, '../../'), audioFilePath).replace(/\\/g, '/');

    // Extract ffprobe metadata & waveform
    let metadata;
    try {
      metadata = await audioService.extractMetadata(audioFilePath);
    } catch (metaErr) {
      storage.removeFile(relativeKey);
      return res.status(422).json({ success: false, message: metaErr.message || 'Invalid or corrupted audio file.' });
    }

    // Build synchronized scenes with suggested photographs
    const sceneAnalysis = await audioService.buildAudioScenes({
      audioDuration: metadata.duration,
      userDescription,
      visualTheme,
      isMusic: isMusic === 'true' || isMusic === true,
      speechText,
    });

    return res.json({
      success: true,
      message: 'Audio analyzed successfully',
      audioUrl: storage.getPublicUrl(relativeKey),
      storageKey: relativeKey,
      filename: req.file.originalname,
      metadata,
      sceneAnalysis,
    });
  } catch (error) {
    console.error('[SlideshowController.analyzeAudio] Error:', error);
    return res.status(500).json({ success: false, message: 'Audio analysis failed: ' + error.message });
  }
}

/**
 * 2. Search free royalty-free images via Pexels, Unsplash, or curated fallback
 */
async function searchFreeImages(req, res) {
  try {
    const { query = 'cinematic', page = 1, perPage = 12, orientation = 'landscape', category = '' } = req.query;

    const result = await imageSearch.searchPhotos({
      query,
      page,
      perPage,
      orientation,
      category,
    });

    return res.json(result);
  } catch (error) {
    console.error('[SlideshowController.searchFreeImages] Error:', error);
    return res.status(500).json({ success: false, message: 'Image search failed: ' + error.message });
  }
}

/**
 * 3. Upload custom user image for scenes
 */
async function uploadCustomImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const relativeKey = path.relative(path.resolve(__dirname, '../../'), req.file.path).replace(/\\/g, '/');
    const publicUrl = storage.getPublicUrl(relativeKey);

    return res.json({
      success: true,
      imageUrl: publicUrl,
      thumbnailUrl: publicUrl,
      storageKey: relativeKey,
      filename: req.file.originalname,
      provider: 'upload',
      attributionAuthor: 'User Upload',
      attributionUrl: null,
    });
  } catch (error) {
    console.error('[SlideshowController.uploadCustomImage] Error:', error);
    return res.status(500).json({ success: false, message: 'Image upload failed: ' + error.message });
  }
}

/**
 * 4. Create and launch Audio-to-Video project
 */
async function createAudioToVideoProject(req, res) {
  try {
    const userId = req.user.id;
    const {
      title,
      prompt,
      visualTheme = 'cinematic',
      aspectRatio = '16:9',
      hasSubtitles = true,
      audioStorageKey,
      audioUrl,
      audioMetadata,
      scenes = [],
      renderNow = true,
    } = req.body;

    if (!scenes || scenes.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one scene is required to generate video.' });
    }

    const totalDuration = Math.round(
      scenes.reduce((acc, s) => acc + (parseFloat(s.duration || s.duration_seconds) || 4), 0)
    );

    const projectTitle = title && title.trim() ? title.trim() : `Audio Visualizer - ${visualTheme}`;

    // 1. Create project in video_projects
    const insertResult = await db.query(
      `INSERT INTO video_projects 
        (user_id, title, prompt, script, generation_type, style, language, duration_seconds, aspect_ratio, status, audio_url, audio_storage_key, audio_metadata, visual_theme, transition_style, motion_enabled, has_subtitles)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        projectTitle,
        prompt || `Audio-to-Video project in ${visualTheme} visual style`,
        null,
        'audio_to_video',
        visualTheme,
        'English',
        totalDuration || 15,
        aspectRatio,
        'draft',
        audioUrl || null,
        audioStorageKey || null,
        audioMetadata ? JSON.stringify(audioMetadata) : null,
        visualTheme,
        'fade',
        1,
        hasSubtitles ? 1 : 0,
      ]
    );

    const projectId = insertResult.insertId;

    // 2. Insert scenes into video_scenes table
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      await db.query(
        `INSERT INTO video_scenes 
          (project_id, scene_order, image_url, thumbnail_url, storage_key, source_provider, source_id, attribution_author, attribution_url, duration_seconds, transition_style, transition_duration, motion_effect, caption_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          i,
          s.imageUrl || s.image_url,
          s.thumbnailUrl || s.thumbnail_url || s.imageUrl || s.image_url,
          s.storageKey || s.storage_key || null,
          s.sourceProvider || s.source_provider || 'pexels',
          s.sourceId || s.source_id || null,
          s.attributionAuthor || s.attribution_author || null,
          s.attributionUrl || s.attribution_url || null,
          parseFloat(s.duration || s.duration_seconds || 4),
          s.transitionStyle || s.transition_style || 'fade',
          parseFloat(s.transitionDuration || s.transition_duration || 0.5),
          s.motionEffect || s.motion_effect || 'ken_burns_zoom_in',
          s.captionText || s.caption_text || null,
        ]
      );
    }

    // 3. Trigger rendering job immediately if requested
    if (renderNow) {
      const projectRows = await db.query('SELECT * FROM video_projects WHERE id = ?', [projectId]);
      const fullProject = projectRows[0];
      await generationQueue.enqueue(fullProject, 'demo');
    }

    return res.status(201).json({
      success: true,
      message: 'Audio-to-Video project created successfully!',
      projectId,
      status: renderNow ? 'queued' : 'draft',
    });
  } catch (error) {
    console.error('[SlideshowController.createAudioToVideoProject] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create Audio-to-Video project: ' + error.message });
  }
}

/**
 * 5. Create and launch Image-to-Video project
 */
async function createImageToVideoProject(req, res) {
  try {
    const userId = req.user.id;
    const {
      title,
      prompt,
      aspectRatio = '16:9',
      style = 'cinematic',
      transitionStyle = 'fade',
      hasSubtitles = true,
      bgMusic = 'ambient_cinematic',
      audioStorageKey = null,
      audioUrl = null,
      scenes = [],
      renderNow = true,
    } = req.body;

    if (!scenes || scenes.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select or upload at least one image.' });
    }

    const totalDuration = Math.round(
      scenes.reduce((acc, s) => acc + (parseFloat(s.duration || s.duration_seconds) || 4), 0)
    );

    const projectTitle = title && title.trim() ? title.trim() : `Animated Slideshow - ${scenes.length} Scenes`;

    // 1. Create project
    const insertResult = await db.query(
      `INSERT INTO video_projects 
        (user_id, title, prompt, script, generation_type, style, language, duration_seconds, aspect_ratio, status, bg_music, audio_url, audio_storage_key, transition_style, motion_enabled, has_subtitles)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        projectTitle,
        prompt || `Image-to-Video animated slideshow with ${scenes.length} curated scenes`,
        null,
        'image_to_video',
        style,
        'English',
        totalDuration || 15,
        aspectRatio,
        'draft',
        bgMusic,
        audioUrl || null,
        audioStorageKey || null,
        transitionStyle,
        1,
        hasSubtitles ? 1 : 0,
      ]
    );

    const projectId = insertResult.insertId;

    // 2. Insert scenes
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      await db.query(
        `INSERT INTO video_scenes 
          (project_id, scene_order, image_url, thumbnail_url, storage_key, source_provider, source_id, attribution_author, attribution_url, duration_seconds, transition_style, transition_duration, motion_effect, caption_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          i,
          s.imageUrl || s.image_url,
          s.thumbnailUrl || s.thumbnail_url || s.imageUrl || s.image_url,
          s.storageKey || s.storage_key || null,
          s.sourceProvider || s.source_provider || 'upload',
          s.sourceId || s.source_id || null,
          s.attributionAuthor || s.attribution_author || null,
          s.attributionUrl || s.attribution_url || null,
          parseFloat(s.duration || s.duration_seconds || 4),
          s.transitionStyle || s.transition_style || transitionStyle,
          parseFloat(s.transitionDuration || s.transition_duration || 0.5),
          s.motionEffect || s.motion_effect || 'ken_burns_zoom_in',
          s.captionText || s.caption_text || null,
        ]
      );
    }

    // 3. Trigger rendering job immediately if requested
    if (renderNow) {
      const projectRows = await db.query('SELECT * FROM video_projects WHERE id = ?', [projectId]);
      const fullProject = projectRows[0];
      await generationQueue.enqueue(fullProject, 'demo');
    }

    return res.status(201).json({
      success: true,
      message: 'Images-to-Video project created successfully!',
      projectId,
      status: renderNow ? 'queued' : 'draft',
    });
  } catch (error) {
    console.error('[SlideshowController.createImageToVideoProject] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create Image-to-Video project: ' + error.message });
  }
}

/**
 * 6. Get scenes for a project
 */
async function getProjectScenes(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const projects = await db.query('SELECT id, user_id FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const scenes = await db.query(
      'SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_order ASC',
      [id]
    );

    return res.json({ success: true, scenes });
  } catch (error) {
    console.error('[SlideshowController.getProjectScenes] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve scenes.' });
  }
}

/**
 * 7. Batch update or reorder scenes for a project
 */
async function updateProjectScenes(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { scenes = [] } = req.body;

    // Verify ownership
    const projects = await db.query('SELECT id, user_id FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Remove existing scenes and insert updated batch
    await db.query('DELETE FROM video_scenes WHERE project_id = ?', [id]);

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      await db.query(
        `INSERT INTO video_scenes 
          (project_id, scene_order, image_url, thumbnail_url, storage_key, source_provider, source_id, attribution_author, attribution_url, duration_seconds, transition_style, transition_duration, motion_effect, caption_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          i,
          s.imageUrl || s.image_url,
          s.thumbnailUrl || s.thumbnail_url || s.imageUrl || s.image_url,
          s.storageKey || s.storage_key || null,
          s.sourceProvider || s.source_provider || 'upload',
          s.sourceId || s.source_id || null,
          s.attributionAuthor || s.attribution_author || null,
          s.attributionUrl || s.attribution_url || null,
          parseFloat(s.duration || s.duration_seconds || 4),
          s.transitionStyle || s.transition_style || 'fade',
          parseFloat(s.transitionDuration || s.transition_duration || 0.5),
          s.motionEffect || s.motion_effect || 'ken_burns_zoom_in',
          s.captionText || s.caption_text || null,
        ]
      );
    }

    // Update total duration on project
    const newTotalDuration = Math.round(
      scenes.reduce((acc, s) => acc + (parseFloat(s.duration || s.duration_seconds) || 4), 0)
    );
    await db.query('UPDATE video_projects SET duration_seconds = ? WHERE id = ?', [newTotalDuration, id]);

    const updatedScenes = await db.query('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_order ASC', [id]);

    return res.json({
      success: true,
      message: 'Scenes updated successfully',
      scenes: updatedScenes,
      duration: newTotalDuration,
    });
  } catch (error) {
    console.error('[SlideshowController.updateProjectScenes] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update scenes: ' + error.message });
  }
}

/**
 * 8. Add single scene to project
 */
async function addProjectScene(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const projects = await db.query('SELECT id, user_id FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const {
      imageUrl,
      thumbnailUrl,
      storageKey,
      sourceProvider = 'pexels',
      sourceId = null,
      attributionAuthor = null,
      attributionUrl = null,
      duration = 4,
      transitionStyle = 'fade',
      motionEffect = 'ken_burns_zoom_in',
      captionText = null,
    } = req.body;

    const countRows = await db.query('SELECT COUNT(*) as total FROM video_scenes WHERE project_id = ?', [id]);
    const nextOrder = countRows[0].total || 0;

    const result = await db.query(
      `INSERT INTO video_scenes 
        (project_id, scene_order, image_url, thumbnail_url, storage_key, source_provider, source_id, attribution_author, attribution_url, duration_seconds, transition_style, transition_duration, motion_effect, caption_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.5, ?, ?)`,
      [
        id,
        nextOrder,
        imageUrl,
        thumbnailUrl || imageUrl,
        storageKey || null,
        sourceProvider,
        sourceId,
        attributionAuthor,
        attributionUrl,
        parseFloat(duration) || 4,
        transitionStyle,
        motionEffect,
        captionText,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Scene added successfully',
      sceneId: result.insertId,
    });
  } catch (error) {
    console.error('[SlideshowController.addProjectScene] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add scene.' });
  }
}

/**
 * 9. Delete single scene from project
 */
async function deleteProjectScene(req, res) {
  try {
    const { id, sceneId } = req.params;
    const userId = req.user.id;

    const projects = await db.query('SELECT id, user_id FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    await db.query('DELETE FROM video_scenes WHERE id = ? AND project_id = ?', [sceneId, id]);

    return res.json({ success: true, message: 'Scene removed successfully' });
  } catch (error) {
    console.error('[SlideshowController.deleteProjectScene] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove scene.' });
  }
}

module.exports = {
  analyzeAudio,
  searchFreeImages,
  uploadCustomImage,
  createAudioToVideoProject,
  createImageToVideoProject,
  getProjectScenes,
  updateProjectScenes,
  addProjectScene,
  deleteProjectScene,
};
