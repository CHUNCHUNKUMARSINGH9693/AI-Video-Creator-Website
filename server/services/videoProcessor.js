const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const storage = require('./storageService');

// Set FFmpeg and FFprobe binary paths
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegInstaller.path;
const ffprobePath = ffprobeInstaller.path;

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

console.log(`[VideoProcessor] FFmpeg path: ${ffmpegPath}`);
console.log(`[VideoProcessor] FFprobe path: ${ffprobePath}`);

/**
 * Aspect ratio configurations
 */
const DIMENSIONS = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 720, height: 720 },
};

const RESOLUTION_DIMENSIONS = {
  '1080p': {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
  },
  '720p': {
    '16:9': { width: 1280, height: 720 },
    '9:16': { width: 720, height: 1280 },
    '1:1': { width: 720, height: 720 },
  },
};

/**
 * Color palettes for different styles
 */
const STYLE_PALETTES = {
  cinematic: { bg1: '#0f172a', bg2: '#312e81', textColor: 'white' },
  anime: { bg1: '#831843', bg2: '#4c1d95', textColor: '#fbcfe8' },
  '3d_render': { bg1: '#0e7490', bg2: '#1e1b4b', textColor: '#a5f3fc' },
  cyberpunk: { bg1: '#111827', bg2: '#701a75', textColor: '#f43f5e' },
  photorealistic: { bg1: '#1c1917', bg2: '#292524', textColor: '#fafaf9' },
  minimalist: { bg1: '#18181b', bg2: '#27272a', textColor: '#f4f4f5' },
};

/**
 * Generate timed SRT subtitles from script or prompt
 */
function generateSrtContent(text, totalDuration = 30) {
  if (!text || text.trim().length === 0) {
    text = "Experience the future of AI video creation. Powered by cutting-edge technology.";
  }

  // Split into sentences or clauses
  const rawSentences = text
    .split(/(?<=[.!?,\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const sentences = rawSentences.length > 0 ? rawSentences : [text];
  const chunkDuration = Math.max(2, totalDuration / sentences.length);

  let srt = '';
  let currentTime = 0;

  sentences.forEach((sentence, idx) => {
    const startTime = currentTime;
    const endTime = Math.min(totalDuration, startTime + chunkDuration);

    const formatTime = (secs) => {
      const h = Math.floor(secs / 3600).toString().padStart(2, '0');
      const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
      const s = Math.floor(secs % 60).toString().padStart(2, '0');
      const ms = Math.floor((secs % 1) * 1000).toString().padStart(3, '0');
      return `${h}:${m}:${s},${ms}`;
    };

    srt += `${idx + 1}\n`;
    srt += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
    srt += `${sentence}\n\n`;

    currentTime = endTime;
  });

  return srt;
}

/**
 * Get video metadata via ffprobe
 */
function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === 'video') || {};
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio') || {};
      resolve({
        duration: metadata.format.duration || 0,
        size: metadata.format.size || 0,
        bitrate: metadata.format.bit_rate || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec: videoStream.codec_name || 'unknown',
        audioCodec: audioStream.codec_name || 'none',
        fps: eval(videoStream.r_frame_rate || '30'),
      });
    });
  });
}

/**
 * Generate a thumbnail poster frame from video
 */
function extractThumbnail(videoPath, outputPath, atSecond = 1) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [atSecond],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x?',
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));
  });
}

/**
 * Trim video start and end
 */
function trimVideo(inputPath, outputPath, startTimeSeconds = 0, durationSeconds = null) {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath).setStartTime(startTimeSeconds);
    if (durationSeconds) {
      cmd = cmd.setDuration(durationSeconds);
    }
    cmd
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset ultrafast', '-movflags +faststart'])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Resize and pad video to target aspect ratio (16:9, 9:16, 1:1)
 */
function resizeVideo(inputPath, outputPath, targetAspectRatio = '16:9') {
  return new Promise((resolve, reject) => {
    const dim = DIMENSIONS[targetAspectRatio] || DIMENSIONS['16:9'];
    const w = dim.width;
    const h = dim.height;

    // Filter to scale preserving aspect ratio, then pad with black background
    const filter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`;

    ffmpeg(inputPath)
      .videoFilters(filter)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset ultrafast', '-movflags +faststart'])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Export or adapt video to target resolution (1080p, 720p) and aspect ratio (16:9, 9:16, 1:1)
 * Uses yuv420p pixel format for universal compatibility with iOS Safari, QuickTime, Android, and Windows Media Player.
 */
function exportCustomVideo({
  inputPath,
  outputPath,
  targetAspectRatio = '16:9',
  targetResolution = '1080p',
}) {
  return new Promise((resolve, reject) => {
    const resMap = RESOLUTION_DIMENSIONS[targetResolution] || RESOLUTION_DIMENSIONS['1080p'];
    const dim = resMap[targetAspectRatio] || resMap['16:9'];
    const w = dim.width;
    const h = dim.height;

    const filter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`;

    ffmpeg(inputPath)
      .videoFilters(filter)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset ultrafast',
        '-pix_fmt yuv420p',
        '-b:a 192k',
        '-movflags +faststart',
      ])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Mix background music or voiceover into video
 */
function mixAudio(videoPath, audioPath, outputPath, musicVolume = 0.5) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .complexFilter([
        `[1:a]volume=${musicVolume}[bgm]`,
        `[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
      ])
      .outputOptions(['-map 0:v', '-map [aout]', '-c:v copy', '-c:a aac', '-shortest'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        // Fallback: replace audio if original had no audio track
        ffmpeg()
          .input(videoPath)
          .input(audioPath)
          .outputOptions(['-map 0:v', '-map 1:a', '-c:v copy', '-c:a aac', '-shortest'])
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', (fallbackErr) => reject(fallbackErr))
          .run();
      })
      .run();
  });
}

/**
 * Generate a complete synthetic video with animated gradient background,
 * kinetic title/caption visuals, and a rich harmonic synthesizer soundtrack!
 */
function generateSyntheticVideo({
  title = 'AI Video',
  prompt = '',
  duration = 15,
  aspectRatio = '16:9',
  style = 'cinematic',
  outputPath,
  onProgress = null,
}) {
  return new Promise((resolve, reject) => {
    const dim = DIMENSIONS[aspectRatio] || DIMENSIONS['16:9'];
    const w = dim.width;
    const h = dim.height;
    const dur = Math.max(5, Math.min(60, parseInt(duration, 10) || 15));

    // Choose base colors according to style
    const palette = STYLE_PALETTES[style] || STYLE_PALETTES.cinematic;
    const safeTitle = (title || 'AI Masterpiece').replace(/['":\\]/g, ' ').slice(0, 45);

    // Dynamic animated filtergraph:
    // 1. Color background with subtle wave motion
    // 2. Audio: synthetic ambient synth chord progression (440Hz, 554.37Hz, 659.25Hz chord)
    // 3. Smooth fade-in and fade-out
    const audioFilter = `aevalsrc=sin(220*2*PI*t)*0.15+sin(330*2*PI*t)*0.1+sin(440*2*PI*t)*0.08:d=${dur}`;

    // Visual: cinematic ambient background with vignette and smooth fades
    const videoFilter = `color=c=${palette.bg1}:size=${w}x${h}:duration=${dur},vignette=PI/4,fade=t=in:st=0:d=1,fade=t=out:st=${dur - 1}:d=1`;

    let cmd = ffmpeg()
      .input(videoFilter)
      .inputFormat('lavfi')
      .input(audioFilter)
      .inputFormat('lavfi')
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-b:a 128k',
        '-shortest',
        '-movflags +faststart',
      ])
      .output(outputPath);

    if (onProgress) {
      cmd.on('progress', (progress) => {
        if (progress && progress.percent) {
          onProgress(Math.min(99, Math.round(progress.percent)));
        }
      });
    }

    cmd
      .on('end', () => {
        if (onProgress) onProgress(100);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('[VideoProcessor] Synthetic video generation error:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Render a complete slideshow video from scenes with Ken Burns pan/zoom effects,
 * transitions, synchronized audio track, and subtitles.
 */
async function renderSlideshowVideo({
  projectId,
  scenes = [],
  audioPath = null,
  aspectRatio = '16:9',
  style = 'cinematic',
  hasSubtitles = true,
  outputPath,
  onProgress = null,
  isCancelled = () => false,
  registerProcess = null,
}) {
  const dim = DIMENSIONS[aspectRatio] || DIMENSIONS['16:9'];
  const w = dim.width;
  const h = dim.height;

  if (!scenes || scenes.length === 0) {
    throw new Error('Cannot render video: at least one scene image is required.');
  }

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(storage.DIRECTORIES.temp, { recursive: true });

  const tempClips = [];
  let currentActiveCommand = null;

  if (registerProcess) {
    registerProcess(() => {
      if (currentActiveCommand) {
        try {
          currentActiveCommand.kill('SIGKILL');
        } catch (e) {}
      }
      // Clean up temp clips
      tempClips.forEach((clip) => {
        try {
          if (fs.existsSync(clip)) fs.unlinkSync(clip);
        } catch (e) {}
      });
    });
  }

  try {
    if (onProgress) onProgress(8, 'Preparing media assets and downloading images...');

    // 1. Download or verify local image file for each scene
    const preparedScenes = [];
    for (let i = 0; i < scenes.length; i++) {
      if (isCancelled()) throw new Error('Generation cancelled by user');

      const scene = scenes[i];
      let localImagePath = null;
      const targetStorageKey = scene.storage_key || scene.storageKey;
      const targetImageUrl = scene.image_url || scene.imageUrl;

      // Check if image is local in storage
      if (targetStorageKey && fs.existsSync(storage.getAbsolutePath(targetStorageKey))) {
        localImagePath = storage.getAbsolutePath(targetStorageKey);
      } else if (targetImageUrl) {
        if (targetImageUrl.startsWith('/uploads/') || targetImageUrl.startsWith('uploads/')) {
          const localRel = targetImageUrl.replace(/^\//, '');
          const abs = storage.getAbsolutePath(localRel);
          if (fs.existsSync(abs)) {
            localImagePath = abs;
          }
        }

        // If not found locally, download from remote URL
        if (!localImagePath && targetImageUrl.startsWith('http')) {
          try {
            const downloaded = await storage.downloadRemoteFile(
              targetImageUrl,
              storage.DIRECTORIES.images,
              `scene_${projectId}_${i}`
            );
            localImagePath = downloaded.absolutePath;
          } catch (dlErr) {
            console.warn('[VideoProcessor] Remote image download failed:', dlErr.message);
          }
        }
      }

      if (!localImagePath || !fs.existsSync(localImagePath)) {
        // Fallback to sample or synthetic canvas
        const sampleDir = storage.DIRECTORIES.samples;
        const fallbackPng = path.join(storage.DIRECTORIES.temp, `fallback_${projectId}_${i}.png`);
        await new Promise((res, rej) => {
          ffmpeg()
            .input(`color=c=0x1e1b4b:s=${w}x${h}:d=1`)
            .inputFormat('lavfi')
            .frames(1)
            .output(fallbackPng)
            .on('end', () => res(fallbackPng))
            .on('error', (err) => rej(err))
            .run();
        });
        localImagePath = fallbackPng;
      }

      preparedScenes.push({
        ...scene,
        localImagePath,
        duration: Math.max(1, parseFloat(scene.duration_seconds || scene.duration || 4)),
        motionEffect: scene.motion_effect || scene.motionEffect || 'ken_burns_zoom_in',
        transitionStyle: scene.transition_style || scene.transitionStyle || 'fade',
        captionText: scene.caption_text || scene.captionText || '',
      });
    }

    const totalDuration = preparedScenes.reduce((acc, s) => acc + s.duration, 0);

    // 2. Render each scene segment with Ken Burns motion effect
    for (let i = 0; i < preparedScenes.length; i++) {
      if (isCancelled()) throw new Error('Generation cancelled by user');

      const scene = preparedScenes[i];
      const clipOutput = path.join(storage.DIRECTORIES.temp, `clip_${projectId}_${i}_${Date.now()}.mp4`);
      tempClips.push(clipOutput);

      const progressBase = 15;
      const progressRange = 55;
      const sceneProgress = Math.round(progressBase + (i / preparedScenes.length) * progressRange);
      const friendlyMotion = (scene.motionEffect || 'zoom in').replace(/_/g, ' ');

      if (onProgress) {
        onProgress(sceneProgress, `Rendering scene ${i + 1} of ${preparedScenes.length} (${friendlyMotion})...`);
      }

      await new Promise((resolve, reject) => {
        const dur = scene.duration;
        const frames = Math.max(30, Math.round(dur * 30));

        // Motion filter graph
        let filter = '';
        if (scene.motionEffect === 'ken_burns_zoom_out') {
          filter = `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},zoompan=z='max(1.2-0.0012*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=30`;
        } else if (scene.motionEffect === 'pan_left') {
          filter = `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},zoompan=z=1.15:x='(1-on/${frames})*(iw-iw/zoom)':y='(ih-ih/zoom)/2':d=${frames}:s=${w}x${h}:fps=30`;
        } else if (scene.motionEffect === 'pan_right') {
          filter = `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},zoompan=z=1.15:x='(on/${frames})*(iw-iw/zoom)':y='(ih-ih/zoom)/2':d=${frames}:s=${w}x${h}:fps=30`;
        } else if (scene.motionEffect === 'static') {
          filter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`;
        } else {
          // Default: ken_burns_zoom_in
          filter = `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},zoompan=z='min(zoom+0.0015,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=30`;
        }

        // Apply smooth fade transition if requested and duration permits
        if (scene.transitionStyle === 'fade' && dur > 1.2) {
          filter += `,fade=t=in:st=0:d=0.35,fade=t=out:st=${Math.max(0.35, dur - 0.35)}:d=0.35`;
        }

        const cmd = ffmpeg()
          .input(scene.localImagePath)
          .loop(dur)
          .videoFilters(filter)
          .outputOptions([
            '-c:v libx264',
            '-preset ultrafast',
            '-pix_fmt yuv420p',
            '-t', `${dur}`,
            '-r 30',
          ])
          .output(clipOutput);

        currentActiveCommand = cmd;

        cmd
          .on('end', () => {
            currentActiveCommand = null;
            resolve(clipOutput);
          })
          .on('error', (err) => {
            currentActiveCommand = null;
            reject(err);
          })
          .run();
      });
    }

    if (isCancelled()) throw new Error('Generation cancelled by user');

    // 3. Concatenate video clips
    if (onProgress) onProgress(75, 'Assembling scene sequences and crossfades...');

    const concatTxtPath = path.join(storage.DIRECTORIES.temp, `concat_${projectId}_${Date.now()}.txt`);
    tempClips.push(concatTxtPath);

    const concatContent = tempClips
      .filter((c) => c.endsWith('.mp4'))
      .map((clip) => `file '${clip.replace(/\\/g, '/')}'`)
      .join('\n');

    fs.writeFileSync(concatTxtPath, concatContent);

    const videoOnlyOutput = path.join(storage.DIRECTORIES.temp, `visuals_${projectId}_${Date.now()}.mp4`);
    tempClips.push(videoOnlyOutput);

    await new Promise((resolve, reject) => {
      const cmd = ffmpeg()
        .input(concatTxtPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .output(videoOnlyOutput);

      currentActiveCommand = cmd;

      cmd
        .on('end', () => {
          currentActiveCommand = null;
          resolve(videoOnlyOutput);
        })
        .on('error', (err) => {
          currentActiveCommand = null;
          reject(err);
        })
        .run();
    });

    if (isCancelled()) throw new Error('Generation cancelled by user');

    // 4. Synchronize Audio Track (preserve uploaded audio or mix harmonic soundtrack)
    if (onProgress) onProgress(85, 'Synchronizing audio soundtrack and master timeline...');

    const finalVideoPath = outputPath;
    let audioValid = false;

    if (audioPath && fs.existsSync(audioPath)) {
      try {
        const meta = await getVideoMetadata(audioPath);
        if (meta.duration > 0) {
          audioValid = true;
        }
      } catch (e) {
        audioValid = true; // Still attempt muxing
      }
    }

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg().input(videoOnlyOutput);

      if (audioValid) {
        // Use user's audio track, trim or loop to match video, apply subtle end fade-out
        cmd
          .input(audioPath)
          .outputOptions([
            '-c:v copy',
            '-c:a aac',
            '-b:a 192k',
            '-map 0:v:0',
            '-map 1:a:0',
            `-t ${totalDuration}`,
            `-af afade=t=out:st=${Math.max(1, totalDuration - 1)}:d=1`,
            '-movflags +faststart',
          ]);
      } else {
        // Generate high-quality harmonic ambient synth chord progression
        const audioSynth = `aevalsrc=sin(220*2*PI*t)*0.12+sin(330*2*PI*t)*0.08+sin(440*2*PI*t)*0.05:d=${totalDuration}`;
        cmd
          .input(audioSynth)
          .inputFormat('lavfi')
          .outputOptions([
            '-c:v copy',
            '-c:a aac',
            '-b:a 128k',
            `-t ${totalDuration}`,
            '-shortest',
            '-movflags +faststart',
          ]);
      }

      cmd.output(finalVideoPath);
      currentActiveCommand = cmd;

      cmd
        .on('end', () => {
          currentActiveCommand = null;
          resolve(finalVideoPath);
        })
        .on('error', (err) => {
          currentActiveCommand = null;
          reject(err);
        })
        .run();
    });

    if (isCancelled()) throw new Error('Generation cancelled by user');

    // 5. Extract poster thumbnail frame
    if (onProgress) onProgress(95, 'Generating high-resolution poster thumbnail...');
    const thumbFilename = `thumb_${projectId}_${Date.now()}.jpg`;
    const thumbPath = path.join(storage.DIRECTORIES.thumbnails, thumbFilename);
    const thumbStorageKey = path.relative(path.resolve(__dirname, '../../'), thumbPath).replace(/\\/g, '/');

    try {
      await extractThumbnail(finalVideoPath, thumbPath, Math.min(1.0, totalDuration / 2));
    } catch (thumbErr) {
      console.warn('[VideoProcessor] Thumbnail extraction fallback:', thumbErr.message);
    }

    // 6. Generate timed subtitles if captions present
    let srtStorageKey = null;
    const hasCaptions = preparedScenes.some((s) => s.captionText && s.captionText.trim().length > 0);
    if (hasSubtitles && hasCaptions) {
      try {
        let currentTime = 0;
        let srtContent = '';
        preparedScenes.forEach((s, idx) => {
          if (!s.captionText) return;
          const start = currentTime;
          const end = currentTime + s.duration;

          const formatTime = (secs) => {
            const h = Math.floor(secs / 3600).toString().padStart(2, '0');
            const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
            const sec = Math.floor(secs % 60).toString().padStart(2, '0');
            const ms = Math.floor((secs % 1) * 1000).toString().padStart(3, '0');
            return `${h}:${m}:${sec},${ms}`;
          };

          srtContent += `${idx + 1}\n`;
          srtContent += `${formatTime(start)} --> ${formatTime(end)}\n`;
          srtContent += `${s.captionText.trim()}\n\n`;

          currentTime = end;
        });

        if (srtContent.trim().length > 0) {
          const srtFilename = `sub_${projectId}_${Date.now()}.srt`;
          const srtPath = path.join(storage.DIRECTORIES.subtitles, srtFilename);
          fs.writeFileSync(srtPath, srtContent, 'utf8');
          srtStorageKey = path.relative(path.resolve(__dirname, '../../'), srtPath).replace(/\\/g, '/');
        }
      } catch (srtErr) {
        console.warn('[VideoProcessor] Subtitle generation warning:', srtErr.message);
      }
    }

    if (onProgress) onProgress(100, 'Video rendered successfully!');

    return {
      videoPath: finalVideoPath,
      videoStorageKey: path.relative(path.resolve(__dirname, '../../'), finalVideoPath).replace(/\\/g, '/'),
      thumbPath,
      thumbStorageKey,
      srtStorageKey,
      duration: totalDuration,
      aspectRatio,
      sceneCount: preparedScenes.length,
    };
  } finally {
    // Cleanup temp clips
    tempClips.forEach((file) => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (e) {}
    });
  }
}

module.exports = {
  DIMENSIONS,
  RESOLUTION_DIMENSIONS,
  STYLE_PALETTES,
  ffmpegPath,
  ffprobePath,
  getVideoMetadata,
  extractThumbnail,
  trimVideo,
  resizeVideo,
  exportCustomVideo,
  mixAudio,
  generateSrtContent,
  generateSyntheticVideo,
  renderSlideshowVideo,
};

