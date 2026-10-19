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
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueName = storage.getUniqueFilename(file.originalname, file.fieldname || 'upload');
    cb(null, uniqueName);
  },
});

// File filter for images, audio, and videos
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    // Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/aac',
    'audio/ogg',
    // Video
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WebP, MP3, WAV, MP4, WebM.`), false);
  }
};

const upload = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max limit
  },
});

module.exports = upload;
