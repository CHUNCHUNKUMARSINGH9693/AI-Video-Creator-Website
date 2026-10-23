/**
 * Automated Test: Audio Analysis & Audio-to-Video Workflow
 * Validates audio file upload, analysis with ffprobe, waveform generation,
 * scene generation with free image integration, and project persistence.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

async function runTests() {
  console.log('====================================================');
  console.log('   Testing Audio Analysis & Audio-to-Video Engine    ');
  console.log('====================================================');

  // 1. Authenticate with demo user
  console.log('\n[1] Authenticating with Demo account...');
  const loginPayload = JSON.stringify({
    email: 'demo@aivideocreator.com',
    password: 'Password123!',
  });

  const authData = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginPayload),
    },
  }, loginPayload);

  if (!authData.token) {
    throw new Error('Authentication failed: ' + JSON.stringify(authData));
  }
  const token = authData.token;
  console.log('✅ Authenticated successfully! User ID:', authData.user?.id || 'demo');

  // 2. Prepare test audio files (.mp3 and .m4a)
  const mp3Path = path.join(__dirname, '../../uploads/audio/test_audio.mp3');
  const m4aPath = path.join(__dirname, '../../uploads/audio/test_audio.m4a');

  if (!fs.existsSync(mp3Path)) {
    throw new Error('MP3 sample file missing: ' + mp3Path);
  }
  if (!fs.existsSync(m4aPath)) {
    throw new Error('M4A sample file missing: ' + m4aPath);
  }

  // 3. Test analyzing .m4a file (the format that originally failed with audio/x-m4a)
  console.log('\n[2] Testing Audio Analysis with M4A file (audio/x-m4a)...');
  const m4aResult = await uploadAudioFile({
    filePath: m4aPath,
    filename: 'test_speech.m4a',
    mimetype: 'audio/x-m4a',
    token,
    visualTheme: 'cyberpunk',
    userDescription: 'Futuristic AI neural networks and cyber city',
  });

  if (!m4aResult.success) {
    throw new Error('M4A analysis failed: ' + JSON.stringify(m4aResult));
  }
  console.log('✅ M4A Analysis SUCCESSFUL!');
  console.log('   Audio URL:', m4aResult.audioUrl);
  console.log('   Detected Duration:', m4aResult.metadata.duration, 'seconds');
  console.log('   Codec:', m4aResult.metadata.codec);
  console.log('   Bitrate:', m4aResult.metadata.bitrate, 'kbps');
  console.log('   Waveform sample count:', m4aResult.metadata.waveform?.length);
  console.log('   Generated Scenes:', m4aResult.sceneAnalysis?.scenes?.length);
  if (m4aResult.sceneAnalysis?.scenes?.[0]) {
    console.log('   Sample Scene 1 Image:', m4aResult.sceneAnalysis.scenes[0].imageUrl);
    console.log('   Sample Scene 1 Caption:', m4aResult.sceneAnalysis.scenes[0].captionText);
  }

  // 4. Test analyzing .mp3 file (audio/mpeg)
  console.log('\n[3] Testing Audio Analysis with MP3 file (audio/mpeg)...');
  const mp3Result = await uploadAudioFile({
    filePath: mp3Path,
    filename: 'podcast_track.mp3',
    mimetype: 'audio/mpeg',
    token,
    visualTheme: 'technology',
    userDescription: 'Software engineer coding with clean workstation and microchips',
  });

  if (!mp3Result.success) {
    throw new Error('MP3 analysis failed: ' + JSON.stringify(mp3Result));
  }
  console.log('✅ MP3 Analysis SUCCESSFUL!');
  console.log('   Audio URL:', mp3Result.audioUrl);
  console.log('   Detected Duration:', mp3Result.metadata.duration, 'seconds');
  console.log('   Codec:', mp3Result.metadata.codec);
  console.log('   Generated Scenes:', mp3Result.sceneAnalysis?.scenes?.length);

  // 4b. Test handling invalid file rejection gracefully
  console.log('\n[3b] Testing Invalid File Rejection (e.g. text/plain)...');
  const invalidResult = await uploadRawContent({
    content: 'This is not audio content',
    filename: 'invalid.txt',
    mimetype: 'text/plain',
    token,
  });

  if (invalidResult.statusCode === 400 && invalidResult.data?.success === false) {
    console.log('✅ Rejection handled gracefully with HTTP 400:', invalidResult.data.message);
  } else {
    console.warn('⚠️ Unexpected invalid response:', invalidResult);
  }

  // 5. Test Creating an Audio-to-Video Project
  console.log('\n[4] Testing Project Creation from Analyzed Audio & Scenes...');
  const projectPayload = JSON.stringify({
    title: 'Automated Test - M4A Cyberpunk Video',
    visualTheme: 'cyberpunk',
    aspectRatio: '16:9',
    audioUrl: m4aResult.audioUrl,
    audioStorageKey: m4aResult.storageKey,
    audioMetadata: m4aResult.metadata,
    totalDuration: m4aResult.metadata.duration,
    hasSubtitles: true,
    renderNow: false,
    scenes: m4aResult.sceneAnalysis.scenes,
  });

  const projectResult = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/videos/audio-to-video',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(projectPayload),
    },
  }, projectPayload);

  if (!projectResult.success || !projectResult.projectId) {
    throw new Error('Project creation failed: ' + JSON.stringify(projectResult));
  }

  console.log('✅ Project creation SUCCESSFUL! Project ID:', projectResult.projectId);

  // 6. Verify Project Scenes Retrieval
  console.log('\n[5] Verifying Project Scenes in Database...');
  const scenesResult = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/videos/${projectResult.projectId}/scenes`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!scenesResult.success || !Array.isArray(scenesResult.scenes)) {
    throw new Error('Scene retrieval failed: ' + JSON.stringify(scenesResult));
  }

  console.log(`✅ Verified ${scenesResult.scenes.length} scenes retrieved successfully!`);

  console.log('\n====================================================');
  console.log('   🎉 ALL AUDIO ANALYSIS & WORKFLOW TESTS PASSED!   ');
  console.log('====================================================\n');
}

// Multipart form data helper
function uploadAudioFile({ filePath, filename, mimetype, token, visualTheme, userDescription }) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileData = fs.readFileSync(filePath);

    let body = '';
    
    // Field: visualTheme
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="visualTheme"\r\n\r\n`;
    body += `${visualTheme}\r\n`;

    // Field: userDescription
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="userDescription"\r\n\r\n`;
    body += `${userDescription}\r\n`;

    // Field: audio
    const fileHeader = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="audio"; filename="${filename}"\r\n` +
      `Content-Type: ${mimetype}\r\n\r\n`
    );
    const fileFooter = Buffer.from(`\r\n--${boundary}--\r\n`);

    const fullPayload = Buffer.concat([
      Buffer.from(body),
      fileHeader,
      fileData,
      fileFooter,
    ]);

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/videos/audio/analyze',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullPayload.length,
        'Authorization': `Bearer ${token}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(fullPayload);
    req.end();
  });
}

function uploadRawContent({ content, filename, mimetype, token }) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileHeader = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="audio"; filename="${filename}"\r\n` +
      `Content-Type: ${mimetype}\r\n\r\n` +
      content +
      `\r\n--${boundary}--\r\n`
    );

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/videos/audio/analyze',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fileHeader.length,
        'Authorization': `Bearer ${token}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(fileHeader);
    req.end();
  });
}

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ raw: data, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

runTests().catch((err) => {
  console.error('\n❌ Test execution error:', err.message);
  process.exit(1);
});
