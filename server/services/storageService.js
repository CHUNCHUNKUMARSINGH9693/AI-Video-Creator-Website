const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ROOT_DIR = path.resolve(__dirname, '../../');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

const DIRECTORIES = {
  root: UPLOADS_DIR,
  generated: path.join(UPLOADS_DIR, 'generated'),
  temp: path.join(UPLOADS_DIR, 'temp'),
  audio: path.join(UPLOADS_DIR, 'audio'),
  subtitles: path.join(UPLOADS_DIR, 'subtitles'),
  avatars: path.join(UPLOADS_DIR, 'avatars'),
  thumbnails: path.join(UPLOADS_DIR, 'thumbnails'),
  samples: path.join(UPLOADS_DIR, 'samples'),
};

// Ensure all upload directories exist
function initDirectories() {
  Object.values(DIRECTORIES).forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

// Initialize immediately on require
initDirectories();

/**
 * Generate a safe unique filename with preservation of extension
 */
function getUniqueFilename(originalFilename = '', prefix = '') {
  const ext = path.extname(originalFilename).toLowerCase();
  const basePrefix = prefix ? `${prefix}_` : '';
  return `${basePrefix}${Date.now()}_${uuidv4().substring(0, 8)}${ext}`;
}

/**
 * Get absolute path for a storage key
 */
function getAbsolutePath(storageKey) {
  if (!storageKey) return null;
  // If storageKey is already absolute, normalize
  if (path.isAbsolute(storageKey)) return storageKey;
  // Relative to root
  return path.join(ROOT_DIR, storageKey);
}

/**
 * Get public URL for a storage key
 */
function getPublicUrl(storageKey) {
  if (!storageKey) return null;
  // Replace backslashes with forward slashes for URLs
  const cleanPath = storageKey.replace(/\\/g, '/');
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }
  return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
}

/**
 * Remove a file safely
 */
function removeFile(storageKey) {
  try {
    const fullPath = getAbsolutePath(storageKey);
    if (fullPath && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch (err) {
    console.error(`[StorageService] Failed to delete file ${storageKey}:`, err.message);
  }
  return false;
}

/**
 * Clean up temp files older than X hours
 */
function cleanTempDirectory(hoursOld = 6) {
  try {
    const tempDir = DIRECTORIES.temp;
    if (!fs.existsSync(tempDir)) return;
    const now = Date.now();
    const files = fs.readdirSync(tempDir);
    files.forEach((file) => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > hoursOld * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (err) {
    console.error('[StorageService] Error cleaning temp directory:', err.message);
  }
}

module.exports = {
  DIRECTORIES,
  initDirectories,
  getUniqueFilename,
  getAbsolutePath,
  getPublicUrl,
  removeFile,
  cleanTempDirectory,
};
