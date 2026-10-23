const path = require('path');
const db = require('../config/database');
const { getAIProvider, DemoVideoProvider } = require('../services/aiVideoProvider');
const storage = require('../services/storageService');
const videoProcessor = require('../services/videoProcessor');

class GenerationQueue {
  constructor() {
    this.jobs = new Map(); // projectId -> { status, progress, step, error, cancelled }
    this.activeWorkers = 0;
    this.maxConcurrent = 2;
    this.queue = [];
  }

  /**
   * Enqueue a new generation job for a project
   */
  async enqueue(project, userProvider = null, userApiKey = null) {
    const projectId = project.id;

    const jobState = {
      projectId,
      providerName: userProvider || process.env.AI_VIDEO_PROVIDER || 'demo',
      status: 'pending',
      progress: 0,
      step: 'Queued in generation scheduler',
      error: null,
      cancelled: false,
      startedAt: null,
      completedAt: null,
    };

    this.jobs.set(projectId, jobState);

    // Record in MySQL generation_jobs
    try {
      await db.query(
        `INSERT INTO generation_jobs (project_id, provider, job_status, progress_percentage, current_step, started_at)
         VALUES (?, ?, 'pending', 0, 'Queued in generation scheduler', NOW())`,
        [projectId, jobState.providerName]
      );

      await db.query(
        `UPDATE video_projects SET status = 'queued', error_message = NULL WHERE id = ?`,
        [projectId]
      );
    } catch (err) {
      console.warn('[GenerationQueue] DB sync warning on enqueue:', err.message);
    }

    this.queue.push({ project, userProvider, userApiKey });
    this.processNext();

    return jobState;
  }

  /**
   * Process next job in queue
   */
  async processNext() {
    if (this.activeWorkers >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const { project, userProvider, userApiKey } = this.queue.shift();
    const projectId = project.id;
    const jobState = this.jobs.get(projectId);

    if (!jobState || jobState.cancelled) {
      this.processNext();
      return;
    }

    this.activeWorkers++;
    jobState.status = 'processing';
    jobState.startedAt = new Date();
    jobState.progress = 5;
    jobState.step = 'Initializing neural rendering engine';

    try {
      // Update MySQL
      try {
        await db.query(
          `UPDATE video_projects SET status = 'processing' WHERE id = ?`,
          [projectId]
        );
        await db.query(
          `UPDATE generation_jobs SET job_status = 'processing', progress_percentage = 5, current_step = ? WHERE project_id = ?`,
          [jobState.step, projectId]
        );
      } catch (dbErr) {
        console.warn('[GenerationQueue] DB update warning:', dbErr.message);
      }

      const isSlideshowWorkflow =
        project.generation_type === 'audio_to_video' ||
        project.generation_type === 'image_to_video';

      const updateProgress = async (pct, step) => {
        if (jobState.cancelled) return;
        jobState.progress = pct;
        jobState.step = step;
        try {
          await db.query(
            `UPDATE generation_jobs SET progress_percentage = ?, current_step = ? WHERE project_id = ?`,
            [pct, step, projectId]
          );
        } catch (e) {}
      };

      if (isSlideshowWorkflow) {
        // --- WORKFLOW 1 & 2: Audio-to-Video & Images-to-Video Slideshow Pipeline ---
        // 1. Fetch scenes from video_scenes
        let scenes = await db.query(
          `SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_order ASC`,
          [projectId]
        );

        // Fallback: Check if images exist in video_assets
        if (!scenes || scenes.length === 0) {
          const imageAssets = await db.query(
            `SELECT * FROM video_assets WHERE project_id = ? AND asset_type = 'source_image'`,
            [projectId]
          );
          if (imageAssets && imageAssets.length > 0) {
            scenes = imageAssets.map((asset, idx) => ({
              scene_order: idx,
              image_url: storage.getPublicUrl(asset.storage_key),
              storage_key: asset.storage_key,
              duration_seconds: Math.max(3, (project.duration_seconds || 15) / imageAssets.length),
              motion_effect: 'ken_burns_zoom_in',
              transition_style: project.transition_style || 'fade',
            }));
          }
        }

        // 2. Identify audio track
        let audioPath = null;
        if (project.audio_storage_key) {
          audioPath = storage.getAbsolutePath(project.audio_storage_key);
        } else if (project.audio_url && !project.audio_url.startsWith('http')) {
          audioPath = storage.getAbsolutePath(project.audio_url.replace(/^\//, ''));
        }

        // 3. Render output via FFmpeg
        const outputFilename = `render_${projectId}_${Date.now()}.mp4`;
        const outputPath = path.join(storage.DIRECTORIES.generated, outputFilename);

        const result = await videoProcessor.renderSlideshowVideo({
          projectId,
          scenes,
          audioPath,
          aspectRatio: project.aspect_ratio || '16:9',
          style: project.style || 'cinematic',
          hasSubtitles: !!project.has_subtitles,
          outputPath,
          onProgress: updateProgress,
          isCancelled: () => jobState.cancelled,
          registerProcess: (killFn) => {
            jobState.killProcess = killFn;
          },
        });

        if (jobState.cancelled) {
          throw new Error('Generation cancelled by user');
        }

        jobState.status = 'completed';
        jobState.progress = 100;
        jobState.step = 'Video generation completed';
        jobState.completedAt = new Date();

        const videoUrl = storage.getPublicUrl(result.videoStorageKey);
        const thumbUrl = storage.getPublicUrl(result.thumbStorageKey);

        try {
          await db.query(
            `UPDATE video_projects 
             SET status = 'completed', video_url = ?, thumbnail_url = ?, duration_seconds = ?, updated_at = NOW() 
             WHERE id = ?`,
            [videoUrl, thumbUrl, Math.round(result.duration), projectId]
          );

          await db.query(
            `UPDATE generation_jobs 
             SET job_status = 'completed', progress_percentage = 100, current_step = 'Completed', output_video_url = ?, completed_at = NOW() 
             WHERE project_id = ?`,
            [videoUrl, projectId]
          );

          await db.query(
            `INSERT INTO video_assets (project_id, asset_type, storage_key, original_filename, mime_type, file_size, duration_seconds)
             VALUES (?, 'exported_video', ?, ?, 'video/mp4', 0, ?)`,
            [projectId, result.videoStorageKey, `${project.title}.mp4`, result.duration]
          );

          if (result.thumbStorageKey) {
            await db.query(
              `INSERT INTO video_assets (project_id, asset_type, storage_key, original_filename, mime_type, file_size)
               VALUES (?, 'thumbnail', ?, ?, 'image/jpeg', 0)`,
              [projectId, result.thumbStorageKey, `${project.title}_thumb.jpg`]
            );
          }

          if (result.srtStorageKey) {
            await db.query(
              `INSERT INTO subtitles (project_id, subtitle_text, language, subtitle_storage_key)
               VALUES (?, ?, ?, ?)`,
              [projectId, project.script || project.prompt || 'Subtitles', project.language || 'English', result.srtStorageKey]
            );
          }
        } catch (dbErr) {
          console.warn('[GenerationQueue] Error saving completion to DB:', dbErr.message);
        }
      } else {
        // --- TEXT-TO-VIDEO / SCRIPT-TO-VIDEO PIPELINE ---
        const provider = getAIProvider(userProvider, userApiKey);

        if (provider instanceof DemoVideoProvider) {
          const result = await provider.renderVideo(project, updateProgress);

          if (jobState.cancelled) {
            throw new Error('Generation cancelled by user');
          }

          jobState.status = 'completed';
          jobState.progress = 100;
          jobState.step = 'Video generation completed';
          jobState.completedAt = new Date();

          const videoUrl = storage.getPublicUrl(result.videoStorageKey);
          const thumbUrl = storage.getPublicUrl(result.thumbStorageKey);

          try {
            await db.query(
              `UPDATE video_projects 
               SET status = 'completed', video_url = ?, thumbnail_url = ?, duration_seconds = ?, updated_at = NOW() 
               WHERE id = ?`,
              [videoUrl, thumbUrl, Math.round(result.duration), projectId]
            );

            await db.query(
              `UPDATE generation_jobs 
               SET job_status = 'completed', progress_percentage = 100, current_step = 'Completed', output_video_url = ?, completed_at = NOW() 
               WHERE project_id = ?`,
              [videoUrl, projectId]
            );

            await db.query(
              `INSERT INTO video_assets (project_id, asset_type, storage_key, original_filename, mime_type, file_size, duration_seconds)
               VALUES (?, 'exported_video', ?, ?, 'video/mp4', ?, ?)`,
              [projectId, result.videoStorageKey, `${project.title}.mp4`, result.size, result.duration]
            );

            if (result.thumbStorageKey) {
              await db.query(
                `INSERT INTO video_assets (project_id, asset_type, storage_key, original_filename, mime_type, file_size)
                 VALUES (?, 'thumbnail', ?, ?, 'image/jpeg', 0)`,
                [projectId, result.thumbStorageKey, `${project.title}_thumb.jpg`]
              );
            }

            if (result.srtStorageKey) {
              await db.query(
                `INSERT INTO subtitles (project_id, subtitle_text, language, subtitle_storage_key)
                 VALUES (?, ?, ?, ?)`,
                [projectId, project.script || project.prompt, project.language || 'English', result.srtStorageKey]
              );
            }
          } catch (dbErr) {
            console.warn('[GenerationQueue] Error saving completion to DB:', dbErr.message);
          }
        } else {
          // Remote provider (Replicate / Runway)
          const job = await provider.createJob(project);
          jobState.step = job.step;
          jobState.progress = job.progress;

          let completed = false;
          let attempts = 0;
          while (!completed && attempts < 36) {
            if (jobState.cancelled) throw new Error('Generation cancelled by user');
            await new Promise((r) => setTimeout(r, 5000));
            attempts++;

            const pollResult = await provider.pollJob(job.providerJobId);
            jobState.progress = Math.min(95, 20 + attempts * 2);

            if (pollResult.status === 'completed') {
              completed = true;
              jobState.status = 'completed';
              jobState.progress = 100;
              jobState.step = 'Remote video ready';

              await db.query(
                `UPDATE video_projects SET status = 'completed', video_url = ? WHERE id = ?`,
                [pollResult.outputUrl, projectId]
              );
            } else if (pollResult.status === 'failed') {
              throw new Error(pollResult.error || 'Remote video generation failed');
            }
          }
        }
      }
    } catch (err) {
      console.error(`[GenerationQueue] Project ${projectId} failed:`, err.message);
      jobState.status = jobState.cancelled ? 'cancelled' : 'failed';
      jobState.error = err.message;
      jobState.step = jobState.cancelled ? 'Cancelled by user' : `Failed: ${err.message}`;

      try {
        await db.query(
          `UPDATE video_projects SET status = ?, error_message = ? WHERE id = ?`,
          [jobState.cancelled ? 'cancelled' : 'failed', err.message, projectId]
        );
        await db.query(
          `UPDATE generation_jobs SET job_status = ?, error_message = ? WHERE project_id = ?`,
          [jobState.cancelled ? 'cancelled' : 'failed', err.message, projectId]
        );
      } catch (e) {}
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  /**
   * Cancel a running or queued job
   */
  async cancel(projectId) {
    const jobState = this.jobs.get(projectId);
    if (jobState) {
      jobState.cancelled = true;
      jobState.status = 'cancelled';
      jobState.step = 'Generation cancelled by user';
      if (typeof jobState.killProcess === 'function') {
        try {
          jobState.killProcess();
        } catch (e) {}
      }
    }

    try {
      await db.query(
        `UPDATE video_projects SET status = 'cancelled', error_message = 'Generation cancelled by user' WHERE id = ?`,
        [projectId]
      );
      await db.query(
        `UPDATE generation_jobs SET job_status = 'cancelled', cancellation_requested = 1, error_message = 'Generation cancelled by user' WHERE project_id = ?`,
        [projectId]
      );
    } catch (e) {}

    return true;
  }

  /**
   * Get status of project generation
   */
  async getStatus(projectId) {
    const memoryJob = this.jobs.get(projectId);
    if (memoryJob) {
      return {
        status: memoryJob.status,
        progress: memoryJob.progress,
        step: memoryJob.step,
        error: memoryJob.error,
      };
    }

    // Fallback to MySQL query
    try {
      const rows = await db.query(
        `SELECT job_status, progress_percentage, current_step, error_message 
         FROM generation_jobs 
         WHERE project_id = ? 
         ORDER BY id DESC LIMIT 1`,
        [projectId]
      );
      if (rows && rows.length > 0) {
        return {
          status: rows[0].job_status,
          progress: rows[0].progress_percentage,
          step: rows[0].current_step,
          error: rows[0].error_message,
        };
      }
    } catch (e) {}

    return {
      status: 'draft',
      progress: 0,
      step: 'Draft ready for generation',
      error: null,
    };
  }
}

// Export singleton instance
const queueInstance = new GenerationQueue();
module.exports = queueInstance;
