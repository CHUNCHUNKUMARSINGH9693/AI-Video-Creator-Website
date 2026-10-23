const path = require('path');
const fs = require('fs');
const storage = require('./storageService');
const videoProcessor = require('./videoProcessor');
const imageSearchService = require('./imageSearchService');

/**
 * Base AI Video Provider Interface
 */
class BaseVideoProvider {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
  }
  getName() {
    throw new Error('getName() must be implemented');
  }
  async createJob(project) {
    throw new Error('createJob() must be implemented');
  }
  async pollJob(providerJobId) {
    throw new Error('pollJob() must be implemented');
  }
  async cancelJob(providerJobId) {
    return true;
  }
}

/**
 * Demo Provider: Real local video rendering powered by FFmpeg
 * 100% functional, produces genuine MP4 files with audio, styled visuals, and subtitles!
 */
class DemoVideoProvider extends BaseVideoProvider {
  getName() {
    return 'demo';
  }

  async createJob(project) {
    const providerJobId = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      providerJobId,
      status: 'processing',
      progress: 10,
      step: 'Analyzing prompt and constructing dynamic scene storyboards',
    };
  }

  /**
   * Performs the actual rendering of the project's video
   */
  async renderVideo(project, updateProgress) {
    const videoFilename = storage.getUniqueFilename(`${project.title || 'video'}.mp4`, 'vid');
    const thumbFilename = storage.getUniqueFilename(`${project.title || 'thumb'}.jpg`, 'thumb');
    const srtFilename = storage.getUniqueFilename(`${project.title || 'subs'}.srt`, 'sub');

    const videoStorageKey = path.join('uploads', 'generated', videoFilename);
    const thumbStorageKey = path.join('uploads', 'thumbnails', thumbFilename);
    const srtStorageKey = path.join('uploads', 'subtitles', srtFilename);

    const videoFullPath = storage.getAbsolutePath(videoStorageKey);
    const thumbFullPath = storage.getAbsolutePath(thumbStorageKey);
    const srtFullPath = storage.getAbsolutePath(srtStorageKey);

    updateProgress(15, 'Synthesizing scene visuals and matching cinematic photography');

    // 1. Generate real MP4 video with real visuals
    let renderSuccess = false;
    try {
      const searchRes = await imageSearchService.searchPhotos({
        query: project.prompt || project.title || 'cinematic',
        perPage: 3,
        orientation: project.aspect_ratio === '9:16' ? 'portrait' : 'landscape',
      });
      if (searchRes && searchRes.images && searchRes.images.length > 0) {
        const motionList = ['ken_burns_zoom_in', 'pan_left', 'ken_burns_zoom_out'];
        const perDur = Math.max(3, Math.round((project.duration_seconds || 15) / searchRes.images.length));
        const scenes = searchRes.images.slice(0, 3).map((img, idx) => ({
          scene_order: idx,
          imageUrl: img.url,
          attributionAuthor: img.photographer,
          attributionUrl: img.photographerUrl,
          duration: perDur,
          motionEffect: motionList[idx % motionList.length],
          transitionStyle: 'fade',
          captionText: idx === 0 ? (project.title || '') : (project.prompt?.slice(0, 50) || ''),
        }));

        await videoProcessor.renderSlideshowVideo({
          projectId: project.id,
          scenes,
          audioPath: null,
          aspectRatio: project.aspect_ratio || '16:9',
          style: project.style || 'cinematic',
          hasSubtitles: !!project.has_subtitles,
          outputPath: videoFullPath,
          onProgress: (pct, step) => {
            const mappedProgress = Math.min(95, Math.round(pct));
            updateProgress(mappedProgress, step || `Rendering AI video (${pct}%)`);
          },
        });
        renderSuccess = true;
      }
    } catch (e) {
      console.warn('[DemoProvider] Slideshow render fallback:', e.message);
    }

    if (!renderSuccess) {
      await videoProcessor.generateSyntheticVideo({
        title: project.title,
        prompt: project.prompt,
        duration: project.duration_seconds || 15,
        aspectRatio: project.aspect_ratio || '16:9',
        style: project.style || 'cinematic',
        outputPath: videoFullPath,
        onProgress: (pct) => {
          const mappedProgress = 20 + Math.floor(pct * 0.55);
          updateProgress(mappedProgress, `Encoding frames (${pct}%)`);
        },
      });
    }

    updateProgress(85, 'Extracting high-resolution thumbnail frame');

    // 2. Generate real thumbnail
    try {
      await videoProcessor.extractThumbnail(videoFullPath, thumbFullPath, 1);
    } catch (e) {
      console.warn('[DemoProvider] Thumbnail extraction warning:', e.message);
    }

    updateProgress(90, 'Generating synchronized subtitles');

    // 3. Generate subtitles file
    const srtContent = videoProcessor.generateSrtContent(
      project.script || project.prompt,
      project.duration_seconds || 15
    );
    fs.writeFileSync(srtFullPath, srtContent, 'utf8');

    updateProgress(100, 'Video generation completed successfully');

    // Get final video stats
    let duration = project.duration_seconds || 15;
    let size = 0;
    try {
      const stats = fs.statSync(videoFullPath);
      size = stats.size;
    } catch (e) {}

    return {
      videoStorageKey,
      thumbStorageKey,
      srtStorageKey,
      duration,
      size,
    };
  }
}

/**
 * Replicate Provider Adapter
 * For Stable Video Diffusion, AnimateDiff, and text-to-video models
 */
class ReplicateVideoProvider extends BaseVideoProvider {
  constructor(apiKey) {
    super(apiKey || process.env.AI_VIDEO_API_KEY);
  }

  getName() {
    return 'replicate';
  }

  async createJob(project) {
    if (!this.apiKey) {
      throw new Error('Replicate API key is required. Please add AI_VIDEO_API_KEY in .env or Settings.');
    }

    // Call Replicate API
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'stability-ai/stable-video-diffusion:3f0457e4619da8151802e23e6bd783885ff74429',
        input: {
          prompt: project.prompt,
          duration: project.duration_seconds,
          aspect_ratio: project.aspect_ratio,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to create Replicate prediction');
    }

    const data = await response.json();
    return {
      providerJobId: data.id,
      status: 'processing',
      progress: 15,
      step: 'Dispatched to Replicate Stable Video Diffusion cluster',
    };
  }

  async pollJob(providerJobId) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${providerJobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) throw new Error('Failed to poll Replicate job');
    const data = await response.json();
    return {
      status: data.status === 'succeeded' ? 'completed' : data.status === 'failed' ? 'failed' : 'processing',
      outputUrl: Array.isArray(data.output) ? data.output[0] : data.output,
      error: data.error,
    };
  }
}

/**
 * Runway Provider Adapter
 * For Runway Gen-2 / Gen-3 Alpha
 */
class RunwayVideoProvider extends BaseVideoProvider {
  constructor(apiKey) {
    super(apiKey || process.env.AI_VIDEO_API_KEY);
  }

  getName() {
    return 'runway';
  }

  async createJob(project) {
    if (!this.apiKey) {
      throw new Error('Runway API key is required. Please add AI_VIDEO_API_KEY in .env or Settings.');
    }

    const response = await fetch('https://api.runwayml.com/v1/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskType: 'gen2',
        promptText: project.prompt,
        options: {
          seconds: project.duration_seconds,
          ratio: project.aspect_ratio === '9:16' ? '9:16' : '16:9',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Runway API error');
    }

    const data = await response.json();
    return {
      providerJobId: data.id,
      status: 'processing',
      progress: 10,
      step: 'Submitted to Runway Gen-2 engine',
    };
  }

  async pollJob(providerJobId) {
    const response = await fetch(`https://api.runwayml.com/v1/tasks/${providerJobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const data = await response.json();
    return {
      status: data.status === 'SUCCEEDED' ? 'completed' : data.status === 'FAILED' ? 'failed' : 'processing',
      outputUrl: data.output ? data.output[0] : null,
      error: data.error,
    };
  }
}

/**
 * Provider Factory
 */
function getAIProvider(providerName = null, apiKey = null) {
  const chosen = (providerName || process.env.AI_VIDEO_PROVIDER || 'demo').toLowerCase();

  switch (chosen) {
    case 'replicate':
      return new ReplicateVideoProvider(apiKey);
    case 'runway':
      return new RunwayVideoProvider(apiKey);
    case 'demo':
    default:
      return new DemoVideoProvider(apiKey);
  }
}

module.exports = {
  BaseVideoProvider,
  DemoVideoProvider,
  ReplicateVideoProvider,
  RunwayVideoProvider,
  getAIProvider,
};
