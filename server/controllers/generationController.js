const db = require('../config/database');
const generationQueue = require('../jobs/generationQueue');

/**
 * Start video generation job
 */
async function triggerGenerate(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { provider, apiKey } = req.body;

    // Verify project ownership
    const projects = await db.query(
      'SELECT * FROM video_projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const project = projects[0];

    // Check if already processing
    if (project.status === 'processing' || project.status === 'queued') {
      return res.status(409).json({ success: false, message: 'Generation already in progress for this project.' });
    }

    // Check user credits
    const users = await db.query('SELECT credits FROM users WHERE id = ?', [userId]);
    const credits = users[0]?.credits || 0;
    const REQUIRED_CREDITS = 10;

    if (credits < REQUIRED_CREDITS) {
      return res.status(402).json({
        success: false,
        message: `Insufficient credits. You need ${REQUIRED_CREDITS} credits, but have ${credits}. Please upgrade your plan.`,
      });
    }

    // Deduct credits
    await db.query('UPDATE users SET credits = credits - ? WHERE id = ?', [REQUIRED_CREDITS, userId]);

    // Enqueue job
    const jobState = await generationQueue.enqueue(project, provider, apiKey);

    return res.status(202).json({
      success: true,
      message: 'Video generation started!',
      job: jobState,
      remainingCredits: credits - REQUIRED_CREDITS,
    });
  } catch (error) {
    console.error('[GenerationController.triggerGenerate] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate video generation.' });
  }
}

/**
 * Get current generation status & real-time progress
 */
async function getGenerationStatus(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const projects = await db.query(
      'SELECT id, status, video_url, thumbnail_url, error_message FROM video_projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const jobStatus = await generationQueue.getStatus(parseInt(id, 10));
    const project = projects[0];
    const status = project.status === 'completed'
      ? 'completed'
      : (jobStatus ? (jobStatus.status || jobStatus.job_status || project.status) : project.status);
    const progress = jobStatus ? (jobStatus.progress ?? jobStatus.progress_percentage ?? (status === 'completed' ? 100 : 0)) : (status === 'completed' ? 100 : 0);
    const step = jobStatus ? (jobStatus.step || jobStatus.current_step || '') : (status === 'completed' ? 'Completed' : 'Processing');
    const error = jobStatus ? (jobStatus.error || jobStatus.error_message) : project.error_message;

    return res.json({
      success: true,
      status,
      progress,
      step,
      error,
      projectStatus: project.status,
      videoUrl: project.video_url,
      thumbnailUrl: project.thumbnail_url,
      job: jobStatus,
    });
  } catch (error) {
    console.error('[GenerationController.getGenerationStatus] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve generation status.' });
  }
}

/**
 * Cancel a generation job
 */
async function cancelGeneration(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const projects = await db.query(
      'SELECT id FROM video_projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    await generationQueue.cancel(parseInt(id, 10));

    return res.json({
      success: true,
      message: 'Generation job cancelled.',
    });
  } catch (error) {
    console.error('[GenerationController.cancelGeneration] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel generation.' });
  }
}

module.exports = {
  triggerGenerate,
  getGenerationStatus,
  cancelGeneration,
};
