const path = require('path');
const fs = require('fs');
const videoProcessor = require('../services/videoProcessor');
const storage = require('../services/storageService');

async function makeSampleVideo() {
  const sampleDir = path.join(__dirname, '../../uploads/samples');
  if (!fs.existsSync(sampleDir)) {
    fs.mkdirSync(sampleDir, { recursive: true });
  }

  const samplePath = path.join(sampleDir, 'sample_cinematic_demo.mp4');
  if (fs.existsSync(samplePath)) {
    console.log('[Sample] Sample video already exists at:', samplePath);
    return;
  }

  console.log('[Sample] Generating real sample MP4 video using bundled FFmpeg...');
  try {
    await videoProcessor.generateSyntheticVideo({
      title: 'AI Video Creator Showcase',
      prompt: 'Cinematic commercial showing next-gen AI video rendering technology with ambient soundtrack',
      duration: 10,
      aspectRatio: '16:9',
      style: 'cinematic',
      outputPath: samplePath,
      onProgress: (p) => process.stdout.write(`Rendering sample: ${p}%\r`),
    });
    console.log('\n[Sample] Sample video created successfully at:', samplePath);
  } catch (err) {
    console.warn('[Sample] Could not generate sample video via FFmpeg:', err.message);
  }
}

makeSampleVideo();
