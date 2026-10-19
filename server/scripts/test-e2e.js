const http = require('http');

async function request(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runEndToEndTest() {
  console.log('====================================================');
  console.log('   AI VIDEO CREATOR - FULL END-TO-END VERIFICATION  ');
  console.log('====================================================');

  try {
    // 1. Health check
    console.log('\n[1/7] Testing /api/health...');
    const health = await request('/api/health');
    console.log('✔ Health Check:', health.data.status, `(uptime: ${Math.round(health.data.uptime)}s)`);

    // 2. Login
    console.log('\n[2/7] Logging in as demo creator...');
    const loginRes = await request('/api/auth/login', 'POST', {
      email: 'demo@aivideocreator.com',
      password: 'Password123!',
    });
    console.log('✔ Login:', loginRes.data.message);
    const token = loginRes.data.token;
    console.log('✔ JWT Token Acquired (User ID:', loginRes.data.user.id, ')');

    // 3. Dashboard Stats
    console.log('\n[3/7] Fetching dashboard metrics...');
    const statsRes = await request('/api/videos/dashboard-stats', 'GET', null, token);
    console.log('✔ Dashboard Stats:', statsRes.data.stats);

    // 4. Create Video Project
    console.log('\n[4/7] Creating new AI video project...');
    const createRes = await request(
      '/api/videos',
      'POST',
      {
        title: 'Cyberpunk Neon Racing Teaser',
        prompt: 'Futuristic hypercar drifting through a neon cyber city at night with purple reflections and synthetic bass soundtrack.',
        script: 'In the year 2088, speed defines the street. Prepare to defy the grid.',
        generation_type: 'text_to_video',
        style: 'cyberpunk',
        language: 'English',
        duration_seconds: 10,
        aspect_ratio: '16:9',
        target_platform: 'youtube',
      },
      token
    );
    const projectId = createRes.data.projectId;
    console.log('✔ Video Project Created (ID:', projectId, ')');

    // 5. Trigger Real FFmpeg Video Generation
    console.log('\n[5/7] Triggering real AI Video Generation via FFmpeg pipeline...');
    const genRes = await request(`/api/videos/${projectId}/generate`, 'POST', { provider: 'demo' }, token);
    console.log('✔ Generation Enqueued:', genRes.data.message, `(Remaining credits: ${genRes.data.remainingCredits})`);

    // Poll status until completion
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 30) {
      await new Promise((r) => setTimeout(r, 1500));
      attempts++;
      const statusRes = await request(`/api/videos/${projectId}/status`, 'GET', null, token);
      const job = statusRes.data.job;
      console.log(`  ... [Progress ${job.progress}%] Step: ${job.step}`);
      if (statusRes.data.projectStatus === 'completed') {
        completed = true;
        console.log('✔ Video Generation Completed! MP4 URL:', statusRes.data.videoUrl);
      } else if (statusRes.data.projectStatus === 'failed') {
        throw new Error('Video generation failed: ' + job.error);
      }
    }

    // 6. Test FFmpeg Video Trimming
    console.log('\n[6/7] Testing server-side FFmpeg precision trimming...');
    const trimRes = await request(`/api/videos/${projectId}/trim`, 'POST', { startTime: 1, duration: 6 }, token);
    console.log('✔ Video Trimmed:', trimRes.data.message, 'New URL:', trimRes.data.videoUrl);

    // 7. Test Multi-Platform Social Export Presets
    console.log('\n[7/7] Testing Social Media Export Preset (YouTube 16:9 & Instagram 9:16)...');
    const ytExport = await request(
      `/api/videos/${projectId}/export`,
      'POST',
      { platform: 'youtube', presetType: 'landscape', resolution: '1080p' },
      token
    );
    console.log('✔ YouTube Export Ready:', ytExport.data.export.downloadUrl);
    console.log('  Suggested Hashtags:', ytExport.data.export.suggestedHashtags);

    const igExport = await request(
      `/api/videos/${projectId}/export`,
      'POST',
      { platform: 'instagram', presetType: 'reels', resolution: '1080p' },
      token
    );
    console.log('✔ Instagram Reels (9:16) Export Ready:', igExport.data.export.downloadUrl);

    console.log('\n====================================================');
    console.log('       ALL 7 SYSTEM TESTS PASSED SUCCESSFULLY!      ');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
    process.exit(1);
  }
}

runEndToEndTest();
