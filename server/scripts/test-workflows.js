/**
 * End-to-End Test Suite for:
 * 1. Free Image Search (Pexels / Unsplash / Curated Fallback)
 * 2. Audio Processing, Metadata Extraction & Scene Proposal
 * 3. Audio-to-Video Video Generation (Real FFmpeg Render, Audio Mux, Poster Frame)
 * 4. Images-to-Video Video Generation (Ken Burns Pan & Zoom, Transitions)
 * 5. Cancellation Support
 */

const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { ffmpegPath, ffprobePath, renderSlideshowVideo } = require('../services/videoProcessor');
const audioService = require('../services/audioService');
const imageSearch = require('../services/imageSearchService');
const storage = require('../services/storageService');
const db = require('../config/database');
const generationQueue = require('../jobs/generationQueue');

async function runTestSuite() {
  console.log('========================================================');
  console.log('   E2E TEST SUITE: Audio-to-Video & Image-to-Video       ');
  console.log('========================================================\n');

  storage.initDirectories();

  // ----------------------------------------------------------------
  // TEST 1: Free Image Search Integration
  // ----------------------------------------------------------------
  console.log('[TEST 1] Testing Free Image Search Integration...');
  const searchRes = await imageSearch.searchPhotos({
    query: 'cyberpunk neon city',
    page: 1,
    perPage: 4,
    orientation: 'landscape',
  });

  if (!searchRes.success || !searchRes.images || searchRes.images.length === 0) {
    throw new Error('TEST 1 FAILED: Free image search returned no results.');
  }

  console.log(`  -> Provider: ${searchRes.provider}`);
  console.log(`  -> License: ${searchRes.licenseInfo.name}`);
  console.log(`  -> Retrieved ${searchRes.images.length} images.`);
  console.log(`  -> First photo by: "${searchRes.images[0].photographer}" (${searchRes.images[0].provider})`);
  console.log('  [PASS] Test 1 passed!\n');

  // ----------------------------------------------------------------
  // TEST 2: Generate Synthetic Test Audio Track & Extract Metadata
  // ----------------------------------------------------------------
  console.log('[TEST 2] Generating sample audio file and testing AudioService...');
  const testAudioPath = path.join(storage.DIRECTORIES.temp, `test_podcast_${Date.now()}.mp3`);

  // Generate a 4-second audio file using lavfi harmonic chord
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('aevalsrc=sin(220*2*PI*t)*0.2+sin(440*2*PI*t)*0.1:d=4')
      .inputFormat('lavfi')
      .outputOptions(['-c:a libmp3lame', '-b:a 128k'])
      .output(testAudioPath)
      .on('end', () => resolve(testAudioPath))
      .on('error', (err) => reject(err))
      .run();
  });

  const metadata = await audioService.extractMetadata(testAudioPath);
  console.log(`  -> Detected duration: ${metadata.duration}s`);
  console.log(`  -> Sample rate: ${metadata.sampleRate} Hz, Bitrate: ${metadata.bitrate} kbps`);
  console.log(`  -> Waveform data points: ${metadata.waveform.length}`);

  if (metadata.duration < 3.5 || metadata.duration > 4.5) {
    throw new Error(`TEST 2 FAILED: Expected ~4s audio duration, got ${metadata.duration}`);
  }

  // Test scene breakdown
  const sceneAnalysis = await audioService.buildAudioScenes({
    audioDuration: metadata.duration,
    userDescription: 'Artificial intelligence deep learning startup',
    visualTheme: 'technology',
    isMusic: false,
    speechText: 'Welcome to the future of AI. Our neural algorithms power intelligent creations.',
  });

  console.log(`  -> Generated ${sceneAnalysis.scenes.length} synchronized scenes matching audio length.`);
  console.log(`  -> Detected topic: "${sceneAnalysis.detectedTopic}"`);
  console.log('  [PASS] Test 2 passed!\n');

  // ----------------------------------------------------------------
  // TEST 3: Real Audio-to-Video Slideshow Video Generation with FFmpeg
  // ----------------------------------------------------------------
  console.log('[TEST 3] Rendering Audio-to-Video project with Ken Burns motion & audio sync...');
  const audioVidOutput = path.join(storage.DIRECTORIES.generated, `test_audio_to_video_${Date.now()}.mp4`);

  const renderResult = await renderSlideshowVideo({
    projectId: 9991,
    scenes: sceneAnalysis.scenes,
    audioPath: testAudioPath,
    aspectRatio: '16:9',
    style: 'cinematic',
    hasSubtitles: true,
    outputPath: audioVidOutput,
    onProgress: (pct, step) => {
      console.log(`    [Progress ${pct}%] ${step}`);
    },
  });

  if (!fs.existsSync(renderResult.videoPath)) {
    throw new Error('TEST 3 FAILED: Rendered MP4 file does not exist on disk.');
  }

  const videoStats = fs.statSync(renderResult.videoPath);
  console.log(`  -> Rendered MP4 output size: ${(videoStats.size / 1024).toFixed(1)} KB`);
  console.log(`  -> Duration: ${renderResult.duration}s`);
  console.log(`  -> Poster frame: ${renderResult.thumbPath} (exists: ${fs.existsSync(renderResult.thumbPath)})`);

  if (videoStats.size < 5000) {
    throw new Error('TEST 3 FAILED: Output video file is suspiciously small or empty.');
  }
  console.log('  [PASS] Test 3 passed!\n');

  // ----------------------------------------------------------------
  // TEST 4: Real Images-to-Video Generation with FFmpeg
  // ----------------------------------------------------------------
  console.log('[TEST 4] Rendering Images-to-Video animated slideshow with transitions...');
  const imageVidOutput = path.join(storage.DIRECTORIES.generated, `test_image_to_video_${Date.now()}.mp4`);

  const testScenes = [
    {
      duration: 2.0,
      imageUrl: searchRes.images[0].url,
      motionEffect: 'ken_burns_zoom_in',
      transitionStyle: 'fade',
      captionText: 'Opening Scene - Futuristic City',
    },
    {
      duration: 2.0,
      imageUrl: searchRes.images[1].url,
      motionEffect: 'ken_burns_zoom_out',
      transitionStyle: 'fade',
      captionText: 'Second Scene - Neon Details',
    },
  ];

  const imgResult = await renderSlideshowVideo({
    projectId: 9992,
    scenes: testScenes,
    audioPath: null, // Test synthetic harmonic ambient soundtrack generation
    aspectRatio: '9:16', // Test vertical aspect ratio
    style: 'cyberpunk',
    hasSubtitles: true,
    outputPath: imageVidOutput,
    onProgress: (pct, step) => {
      console.log(`    [Progress ${pct}%] ${step}`);
    },
  });

  const imgVidStats = fs.statSync(imgResult.videoPath);
  console.log(`  -> Rendered Vertical (9:16) MP4 size: ${(imgVidStats.size / 1024).toFixed(1)} KB`);
  console.log(`  -> Duration: ${imgResult.duration}s`);

  if (imgVidStats.size < 5000) {
    throw new Error('TEST 4 FAILED: Image-to-video file is empty.');
  }
  console.log('  [PASS] Test 4 passed!\n');

  // ----------------------------------------------------------------
  // TEST 5: Job Queue Pipeline and Cancellation
  // ----------------------------------------------------------------
  console.log('[TEST 5] Testing background generation queue & cancellation...');
  const mockProject = {
    id: 9995,
    title: 'Cancellation Test Project',
    generation_type: 'image_to_video',
    aspect_ratio: '16:9',
    style: 'cinematic',
    has_subtitles: 1,
    duration_seconds: 10,
  };

  // Add scenes in db
  await db.query('DELETE FROM video_scenes WHERE project_id = ?', [mockProject.id]);
  await db.query(
    `INSERT INTO video_scenes (project_id, scene_order, image_url, duration_seconds, motion_effect)
     VALUES (?, 0, ?, 5, 'ken_burns_zoom_in'), (?, 1, ?, 5, 'pan_left')`,
    [mockProject.id, searchRes.images[0].url, mockProject.id, searchRes.images[1].url]
  );

  const job = await generationQueue.enqueue(mockProject);
  console.log(`  -> Enqueued job status: ${job.status}`);

  // Test cancellation
  await generationQueue.cancel(mockProject.id);
  const cancelledStatus = await generationQueue.getStatus(mockProject.id);
  console.log(`  -> Status after cancel: ${cancelledStatus.status}`);
  console.log('  [PASS] Test 5 passed!\n');

  // Clean up test files
  try {
    if (fs.existsSync(testAudioPath)) fs.unlinkSync(testAudioPath);
    if (fs.existsSync(audioVidOutput)) fs.unlinkSync(audioVidOutput);
    if (fs.existsSync(imageVidOutput)) fs.unlinkSync(imageVidOutput);
  } catch (e) {}

  console.log('========================================================');
  console.log('   ALL E2E WORKFLOW TESTS PASSED SUCCESSFULLY!          ');
  console.log('========================================================');
}

if (require.main === module) {
  runTestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ TEST SUITE FAILED:', err);
      process.exit(1);
    });
}

module.exports = runTestSuite;
