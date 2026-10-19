const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const generationController = require('../controllers/generationController');
const editorController = require('../controllers/editorController');
const exportController = require('../controllers/exportController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All video routes require authentication
router.use(requireAuth);

// Project management & stats
router.get('/dashboard-stats', videoController.getDashboardStats);
router.get('/', videoController.getVideos);
router.post('/', videoController.createVideo);
router.get('/:id', videoController.getVideoById);
router.patch('/:id', videoController.updateVideo);
router.delete('/:id', videoController.deleteVideo);
router.post('/:id/duplicate', videoController.duplicateVideo);

// AI Generation pipeline
router.post('/:id/generate', generationController.triggerGenerate);
router.get('/:id/status', generationController.getGenerationStatus);
router.post('/:id/cancel', generationController.cancelGeneration);

// Video Editor server-side operations
router.post('/:id/trim', editorController.trim);
router.post('/:id/resize', editorController.resize);
router.post('/:id/thumbnail', editorController.setThumbnail);
router.post('/:id/subtitles', editorController.updateSubtitles);
router.post('/:id/assets', upload.single('file'), editorController.uploadAsset);

// Export & Platform presets
router.post('/:id/export', exportController.exportForPlatform);
router.get('/:id/download', exportController.downloadVideo);
router.get('/:id/exports', exportController.getExports);

module.exports = router;
