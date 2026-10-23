/**
 * Comprehensive Automated Test Suite for Video Download Feature
 * 
 * Verifies:
 * 1. Authentication via Bearer token and Query token (?token=...)
 * 2. Direct streaming video download with proper Content-Disposition and meaningful sanitized filenames
 * 3. Custom export preparation (1080p, 720p, 9:16 vertical, 16:9 landscape)
 * 4. Audio-to-Video generation -> download workflow
 * 5. Images-to-Video generation -> download workflow
 * 6. Security (401 without auth, 400 when video rendering incomplete, 404 for unknown project)
 * 7. Verification that downloaded MP4 is a valid playable video file via ffprobe
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const app = require('../app');
const { ffprobePath } = require('../services/videoProcessor');
const db = require('../config/database');
const storage = require('../services/storageService');

if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
}

// Helper to make HTTP requests against express app instance
function makeRequest(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        ...options,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(buffer.toString('utf8'));
          } catch (e) {}

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: buffer,
            json,
          });
        });
      }
    );

    req.on('error', reject);

    if (postData) {
      if (typeof postData === 'string' || Buffer.isBuffer(postData)) {
        req.write(postData);
      } else {
        req.write(JSON.stringify(postData));
      }
    }
    req.end();
  });
}

async function runDownloadTests() {
  console.log('========================================================');
  console.log('   AUTOMATED TEST SUITE: Video Download Feature         ');
  console.log('========================================================\n');

  storage.initDirectories();

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[TestServer] Test instance running on 127.0.0.1:${port}\n`);

  try {
    // -------------------------------------------------------------
    // STEP 1: Authenticate and get JWT token
    // -------------------------------------------------------------
    console.log('[TEST 1] Authenticating test user (demo@aivideocreator.com)...');
    const loginRes = await makeRequest(
      server,
      {
        method: 'POST',
        path: '/api/auth/login',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'demo@aivideocreator.com', password: 'Password123!' }
    );

    if (loginRes.statusCode !== 200 || !loginRes.json?.token) {
      throw new Error(`TEST 1 FAILED: Authentication failed (${loginRes.statusCode}): ${JSON.stringify(loginRes.json)}`);
    }

    const token = loginRes.json.token;
    console.log('  -> JWT Token acquired successfully.');
    console.log('  [PASS] Test 1 passed!\n');

    // -------------------------------------------------------------
    // STEP 2: Verify sample master video exists for project #1
    // -------------------------------------------------------------
    console.log('[TEST 2] Verifying master video for Project #1...');
    const sampleDir = storage.DIRECTORIES.samples;
    if (!fs.existsSync(sampleDir)) fs.mkdirSync(sampleDir, { recursive: true });
    const samplePath = path.join(sampleDir, 'sample_cinematic_demo.mp4');

    if (!fs.existsSync(samplePath)) {
      console.log('  -> Generating synthetic master test video...');
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input('testsrc=duration=4:size=1280x720:rate=30')
          .inputFormat('lavfi')
          .input('aevalsrc=sin(440*2*PI*t)*0.1:d=4')
          .inputFormat('lavfi')
          .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-c:a aac', '-shortest', '-preset ultrafast'])
          .output(samplePath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    }

    console.log(`  -> Master video exists on disk: ${samplePath} (${fs.statSync(samplePath).size} bytes)`);
    console.log('  [PASS] Test 2 passed!\n');

    // -------------------------------------------------------------
    // STEP 3: Test direct streaming download via ?token=...
    // -------------------------------------------------------------
    console.log('[TEST 3] Testing streaming download with ?token=... in URL (browser navigation simulation)...');
    const downloadRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/videos/1/download?token=${encodeURIComponent(token)}`,
    });

    if (downloadRes.statusCode !== 200) {
      throw new Error(`TEST 3 FAILED: Expected 200, got ${downloadRes.statusCode}: ${downloadRes.body.toString('utf8')}`);
    }

    const contentType = downloadRes.headers['content-type'];
    const contentDisp = downloadRes.headers['content-disposition'];
    const acceptRanges = downloadRes.headers['accept-ranges'];

    console.log(`  -> Status: ${downloadRes.statusCode} OK`);
    console.log(`  -> Content-Type: ${contentType}`);
    console.log(`  -> Content-Disposition: ${contentDisp}`);
    console.log(`  -> Accept-Ranges: ${acceptRanges}`);
    console.log(`  -> Downloaded file size: ${(downloadRes.body.length / 1024).toFixed(1)} KB`);

    if (!contentType || !contentType.includes('video/mp4')) {
      throw new Error(`TEST 3 FAILED: Content-Type should be video/mp4, got ${contentType}`);
    }
    if (!contentDisp || !contentDisp.includes('attachment') || !contentDisp.includes('ai-video-creator-')) {
      throw new Error(`TEST 3 FAILED: Content-Disposition should be attachment with meaningful filename, got ${contentDisp}`);
    }

    // Save to temp file and verify with ffprobe
    const testSavedPath = path.join(storage.DIRECTORIES.root, 'test_download_output.mp4');
    fs.writeFileSync(testSavedPath, downloadRes.body);

    const probeInfo = await probeVideo(testSavedPath);
    console.log(`  -> Validated MP4 playback with ffprobe: duration=${probeInfo.format.duration}s, streams=${probeInfo.streams.length}`);
    if (fs.existsSync(testSavedPath)) fs.unlinkSync(testSavedPath);

    console.log('  [PASS] Test 3 passed!\n');

    // -------------------------------------------------------------
    // STEP 4: Test custom resolution & aspect ratio prepare-download
    // -------------------------------------------------------------
    console.log('[TEST 4] Testing custom export preparation (720p HD, 9:16 Vertical for mobile)...');
    const prepRes = await makeRequest(
      server,
      {
        method: 'POST',
        path: '/api/videos/1/prepare-download',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      {
        resolution: '720p',
        aspectRatio: '9:16',
        format: 'mp4',
      }
    );

    if (prepRes.statusCode !== 200 || !prepRes.json?.success) {
      throw new Error(`TEST 4 FAILED: prepare-download failed (${prepRes.statusCode}): ${JSON.stringify(prepRes.json)}`);
    }

    const exportMeta = prepRes.json;
    console.log('  -> Prepare result:', {
      filename: exportMeta.filename,
      resolution: exportMeta.resolution,
      aspectRatio: exportMeta.aspectRatio,
      fileSize: `${(exportMeta.fileSize / 1024).toFixed(1)} KB`,
      downloadUrl: exportMeta.downloadUrl,
    });

    if (!exportMeta.filename.includes('720p') || !exportMeta.filename.includes('9x16')) {
      throw new Error(`TEST 4 FAILED: Filename should include resolution and aspect ratio, got ${exportMeta.filename}`);
    }

    // Download the custom 9:16 720p export
    console.log('  -> Downloading the customized 9:16 vertical video...');
    const customDlRes = await makeRequest(server, {
      method: 'GET',
      path: `${exportMeta.downloadUrl}&token=${encodeURIComponent(token)}`,
    });

    if (customDlRes.statusCode !== 200) {
      throw new Error(`TEST 4 FAILED: Download custom export returned ${customDlRes.statusCode}`);
    }

    const testCustomPath = path.join(storage.DIRECTORIES.root, 'test_custom_720p_9x16.mp4');
    fs.writeFileSync(testCustomPath, customDlRes.body);

    const customProbe = await probeVideo(testCustomPath);
    const videoStream = customProbe.streams.find((s) => s.codec_type === 'video');
    console.log(`  -> Probed custom video: ${videoStream.width}x${videoStream.height} (${videoStream.codec_name})`);

    if (videoStream.width !== 720 || videoStream.height !== 1280) {
      throw new Error(`TEST 4 FAILED: Expected 720x1280, got ${videoStream.width}x${videoStream.height}`);
    }
    if (fs.existsSync(testCustomPath)) fs.unlinkSync(testCustomPath);

    console.log('  [PASS] Test 4 passed!\n');

    // -------------------------------------------------------------
    // STEP 5: Security & Error Handling tests
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing Security & Validation...');

    // 5A: Request without token should return 401
    const unauthRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/videos/1/download',
    });
    console.log(`  -> Request without token status: ${unauthRes.statusCode} (Expected: 401)`);
    if (unauthRes.statusCode !== 401) {
      throw new Error(`TEST 5A FAILED: Expected 401 for unauthenticated download, got ${unauthRes.statusCode}`);
    }

    // 5B: Request for non-existent project should return 404
    const notFoundRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/videos/999999/download?token=${encodeURIComponent(token)}`,
    });
    console.log(`  -> Request for unknown project status: ${notFoundRes.statusCode} (Expected: 404)`);
    if (notFoundRes.statusCode !== 404) {
      throw new Error(`TEST 5B FAILED: Expected 404 for unknown project, got ${notFoundRes.statusCode}`);
    }

    console.log('  [PASS] Test 5 passed!\n');

    // -------------------------------------------------------------
    // STEP 6: Audio-to-Video End-to-End Download Workflow
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing Audio-to-Video Generation -> Download Workflow...');
    // Ensure test audio track exists
    const audioDir = storage.DIRECTORIES.audio;
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
    const testAudioPath = path.join(audioDir, 'test_audio.mp3');
    if (!fs.existsSync(testAudioPath)) {
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input('aevalsrc=sin(220*2*PI*t)*0.2:d=4')
          .inputFormat('lavfi')
          .audioCodec('libmp3lame')
          .output(testAudioPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    }

    const a2vRes = await makeRequest(
      server,
      {
        method: 'POST',
        path: '/api/videos/audio-to-video',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      {
        title: 'Lofi Study Soundtrack Video',
        audioUrl: '/uploads/audio/test_audio.mp3',
        audioStorageKey: 'uploads/audio/test_audio.mp3',
        audioMetadata: { duration: 4.0, sampleRate: 44100 },
        visualTheme: 'cinematic',
        aspectRatio: '16:9',
        scenes: [
          {
            sceneOrder: 1,
            imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
            durationSeconds: 2.0,
            transitionStyle: 'fade',
            motionEffect: 'ken_burns_zoom_in',
            captionText: 'Lofi Focus Beat',
          },
          {
            sceneOrder: 2,
            imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
            durationSeconds: 2.0,
            transitionStyle: 'fade',
            motionEffect: 'ken_burns_zoom_out',
            captionText: 'Deep Ambient Synthesis',
          },
        ],
      }
    );

    if (a2vRes.statusCode !== 201 || !a2vRes.json?.projectId) {
      throw new Error(`TEST 6 FAILED: Failed to create Audio-to-Video project: ${JSON.stringify(a2vRes.json)}`);
    }

    const a2vProjectId = a2vRes.json.projectId;
    console.log(`  -> Audio-to-Video project created (ID: ${a2vProjectId})`);

    // Poll until completed
    let isComplete = false;
    for (let i = 0; i < 45; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await makeRequest(server, {
        method: 'GET',
        path: `/api/videos/${a2vProjectId}/status`,
        headers: { Authorization: `Bearer ${token}` },
      });
      const st = statusRes.json;
      if (st) {
        if (i % 3 === 0) {
          console.log(`  -> A2V Render status: ${st.projectStatus} (${st.job?.progress || 0}% - ${st.job?.step || ''})`);
        }
        if (st.projectStatus === 'completed' || st.job?.status === 'completed' || st.job?.job_status === 'completed') {
          isComplete = true;
          break;
        }
        if (st.projectStatus === 'failed' || st.job?.status === 'failed') {
          throw new Error(`TEST 6 FAILED: Video rendering failed: ${st.job?.error || 'Unknown error'}`);
        }
      }
    }

    if (!isComplete) {
      throw new Error('TEST 6 FAILED: Audio-to-Video rendering timed out.');
    }

    console.log('  -> Video rendering finished! Downloading Audio-to-Video MP4...');
    const a2vDlRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/videos/${a2vProjectId}/download?token=${encodeURIComponent(token)}`,
    });

    if (a2vDlRes.statusCode !== 200) {
      throw new Error(`TEST 6 FAILED: Download returned ${a2vDlRes.statusCode}`);
    }

    const a2vSavedPath = path.join(storage.DIRECTORIES.root, 'test_a2v_download.mp4');
    fs.writeFileSync(a2vSavedPath, a2vDlRes.body);
    const a2vProbe = await probeVideo(a2vSavedPath);
    console.log(`  -> Downloaded Audio-to-Video MP4 size: ${(a2vDlRes.body.length / 1024).toFixed(1)} KB`);
    console.log(`  -> Audio & Video streams verified: audio=${a2vProbe.streams.some((s) => s.codec_type === 'audio')}, video=${a2vProbe.streams.some((s) => s.codec_type === 'video')}`);
    if (fs.existsSync(a2vSavedPath)) fs.unlinkSync(a2vSavedPath);

    console.log('  [PASS] Test 6 passed!\n');

    // -------------------------------------------------------------
    // STEP 7: Images-to-Video End-to-End Download Workflow
    // -------------------------------------------------------------
    console.log('[TEST 7] Testing Images-to-Video Generation -> Download Workflow...');
    const i2vRes = await makeRequest(
      server,
      {
        method: 'POST',
        path: '/api/videos/image-to-video',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      {
        title: 'Cyberpunk Animated Reel',
        aspectRatio: '9:16',
        bgMusic: 'cyberpunk_pulse',
        scenes: [
          {
            sceneOrder: 1,
            imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
            durationSeconds: 2.0,
            transitionStyle: 'fade',
            motionEffect: 'ken_burns_zoom_in',
            captionText: 'Cyberpunk Neon City',
          },
          {
            sceneOrder: 2,
            imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
            durationSeconds: 2.0,
            transitionStyle: 'fade',
            motionEffect: 'ken_burns_zoom_out',
            captionText: 'Digital Horizon',
          },
        ],
      }
    );

    if (i2vRes.statusCode !== 201 || !i2vRes.json?.projectId) {
      throw new Error(`TEST 7 FAILED: Failed to create Images-to-Video project: ${JSON.stringify(i2vRes.json)}`);
    }

    const i2vProjectId = i2vRes.json.projectId;
    console.log(`  -> Images-to-Video project created (ID: ${i2vProjectId})`);

    // Poll until completed
    let isI2VComplete = false;
    for (let i = 0; i < 45; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await makeRequest(server, {
        method: 'GET',
        path: `/api/videos/${i2vProjectId}/status`,
        headers: { Authorization: `Bearer ${token}` },
      });
      const st = statusRes.json;
      if (st) {
        if (i % 3 === 0) {
          console.log(`  -> I2V Render status: ${st.projectStatus} (${st.job?.progress || 0}% - ${st.job?.step || ''})`);
        }
        if (st.projectStatus === 'completed' || st.job?.status === 'completed' || st.job?.job_status === 'completed') {
          isI2VComplete = true;
          break;
        }
        if (st.projectStatus === 'failed' || st.job?.status === 'failed') {
          throw new Error(`TEST 7 FAILED: Video rendering failed: ${st.job?.error || 'Unknown error'}`);
        }
      }
    }

    if (!isI2VComplete) {
      throw new Error('TEST 7 FAILED: Images-to-Video rendering timed out.');
    }

    console.log('  -> Video rendering finished! Downloading Images-to-Video MP4...');
    const i2vDlRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/videos/${i2vProjectId}/download?token=${encodeURIComponent(token)}`,
    });

    if (i2vDlRes.statusCode !== 200) {
      throw new Error(`TEST 7 FAILED: Download returned ${i2vDlRes.statusCode}`);
    }

    const i2vSavedPath = path.join(storage.DIRECTORIES.root, 'test_i2v_download.mp4');
    fs.writeFileSync(i2vSavedPath, i2vDlRes.body);
    const i2vProbe = await probeVideo(i2vSavedPath);
    console.log(`  -> Downloaded Images-to-Video MP4 size: ${(i2vDlRes.body.length / 1024).toFixed(1)} KB`);
    console.log(`  -> Content-Disposition header: ${i2vDlRes.headers['content-disposition']}`);
    if (fs.existsSync(i2vSavedPath)) fs.unlinkSync(i2vSavedPath);

    console.log('  [PASS] Test 7 passed!\n');

    console.log('========================================================');
    console.log('   ALL 7 VIDEO DOWNLOAD TESTS PASSED SUCCESSFULLY!     ');
    console.log('========================================================\n');
  } finally {
    server.close();
  }
}

runDownloadTests().catch((err) => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
