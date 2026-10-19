const db = require('../config/database');
const { getAIProvider, DemoVideoProvider } = require('../services/aiVideoProvider');
const storage = require('../services/storageService');

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

      const provider = getAIProvider(userProvider, userApiKey);

      if (provider instanceof DemoVideoProvider) {
        // Run demo video rendering with real FFmpeg
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

        const result = await provider.renderVideo(project, updateProgress);

        if (jobState.cancelled) {
          throw new Error('Generation cancelled by user');
        }

        // Save generated video asset & project status
        jobState.status = 'completed';
        jobState.progress = 100;
        jobState.step = 'Video generation completed';
        jobState.completedAt = new Date();

        const videoUrl = storage.getPublicUrl(result.videoStorageKey);
        const thumbUrl = storage.getPublicUrl(result.thumbStorageKey);

        try {
          // Update project
          await db.query(
            `UPDATE video_projects 
             SET status = 'completed', video_url = ?, thumbnail_url = ?, duration_seconds = ?, updated_at = NOW() 
             WHERE id = ?`,
            [videoUrl, thumbUrl, Math.round(result.duration), projectId]
          );

          // Update job
          await db.query(
            `UPDATE generation_jobs 
             SET job_status = 'completed', progress_percentage = 100, current_step = 'Completed', completed_at = NOW() 
             WHERE project_id = ?`,
            [projectId]
          );

          // Add video asset
          await db.query(
            `INSERT INTO video_assets (project_id, asset_type, storage_key, original_filename, mime_type, file_size, duration_seconds)
             VALUES (?, 'exported_video', ?, ?, 'video/mp4', ?, ?)`,
            [projectId, result.videoStorageKey, `${project.title}.mp4`, result.size, result.duration]
          );

          // Add thumbnail asset
          if (result.thumbStorageKey) {
            await db.query(
              `INSERT INTO video_assets (project_id, asset_type, storage_key, original_filename, mime_type, file_size)
               VALUES (?, 'thumbnail', ?, ?, 'image/jpeg', 0)`,
              [projectId, result.thumbStorageKey, `${project.title}_thumb.jpg`]
            );
          }

          // Add subtitle asset
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

        // Poll for completion (up to 3 minutes)
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
    } catch (err) {
      console.error(`[GenerationQueue] Project ${projectId} failed:`, err.message);
      jobState.status = jobState.cancelled ? 'cancelled' : 'failed';
      jobState.error = err.message;
      jobState.step = jobState.cancelled ? 'Cancelled by user' : `Failed: ${err.message}`;

      try {
        await db.query(
          `UPDATE video_projects SET status = 'failed', error_message = ? WHERE id = ?`,
          [err.message, projectId]
        );
        await db.query(
          `UPDATE generation_jobs SET job_status = 'failed', error_message = ? WHERE project_id = ?`,
          [err.message, projectId]
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
    }

    try {
      await db.query(
        `UPDATE video_projects SET status = 'failed', error_message = 'Generation cancelled' WHERE id = ?`,
        [projectId]
      );
      await db.query(
        `UPDATE generation_jobs SET job_status = 'cancelled', error_message = 'Generation cancelled' WHERE project_id = ?`,
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
