const multer = require('multer');
const path = require('path');
const storage = require('../services/storageService');

// Multer storage engine
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = storage.DIRECTORIES.temp;
    if (file.fieldname === 'avatar') {
      dest = storage.DIRECTORIES.avatars;
    } else if (file.fieldname === 'audio') {
      dest = storage.DIRECTORIES.audio;
    } else if (file.fieldname === 'image') {
      dest = storage.DIRECTORIES.images;
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueName = storage.getUniqueFilename(file.originalname, file.fieldname || 'upload');
    cb(null, uniqueName);
  },
});

// Allowed extensions for robust fallback detection
const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.aiff', '.aif', '.opus', '.weba', '.webm'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.avi'];

// File filter for images, audio, and videos
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();

  const isAudio =
    mimetype.startsWith('audio/') ||
    mimetype === 'application/ogg' ||
    mimetype === 'application/x-ogg' ||
    mimetype === 'video/mp4' || // Some m4a files are identified as video/mp4 by certain browsers
    ALLOWED_AUDIO_EXTENSIONS.includes(ext);

  const isImage =
    mimetype.startsWith('image/') ||
    ALLOWED_IMAGE_EXTENSIONS.includes(ext);

  const isVideo =
    mimetype.startsWith('video/') ||
    ALLOWED_VIDEO_EXTENSIONS.includes(ext);

  if (file.fieldname === 'audio') {
    if (isAudio) {
      return cb(null, true);
    }
    return cb(new Error(`Unsupported audio format (${ext || mimetype}). Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC.`), false);
  }

  if (file.fieldname === 'image' || file.fieldname === 'avatar') {
    if (isImage) {
      return cb(null, true);
    }
    return cb(new Error(`Unsupported image format (${ext || mimetype}). Supported formats: JPG, PNG, WebP, GIF.`), false);
  }

  // Any other upload field (e.g. general 'file')
  if (isAudio || isImage || isVideo) {
    return cb(null, true);
  }

  cb(new Error(`Unsupported file type: ${mimetype || ext}. Please upload an audio, image, or video file.`), false);
};

const upload = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max limit
  },
});

module.exports = upload;
