import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  Film,
  Layers,
  Clock,
  Play,
  Pause,
  Download,
  Share2,
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Monitor,
  Smartphone,
  Square,
  Music,
  FileAudio,
  Zap,
  Info,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import ImageSearchModal from '../components/media/ImageSearchModal';
import DownloadButton from '../components/media/DownloadButton';

const BGM_PRESETS = [
  { id: 'ambient_cinematic', label: 'Ambient Cinematic', desc: 'Soft harmonic synths and warm atmospheric chords' },
  { id: 'lofi_chill', label: 'Lo-Fi Chill & Warmth', desc: 'Relaxing analog vinyl warmth and acoustic melody' },
  { id: 'cyberpunk_pulse', label: 'Cyberpunk Pulse', desc: 'Energetic digital bass and futuristic neon rhythm' },
  { id: 'acoustic_uplift', label: 'Acoustic Uplift', desc: 'Inspiring piano and gentle strings for storytelling' },
  { id: 'none', label: 'No Music (Silent)', desc: 'Generate visual slideshow video without soundtrack' },
];

export default function ImageToVideoPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // Project configuration
  const [title, setTitle] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [globalTransition, setGlobalTransition] = useState('fade');
  const [hasSubtitles, setHasSubtitles] = useState(true);
  const [animationMode, setAnimationMode] = useState('standard_ken_burns'); // 'standard_ken_burns' | 'generative_ai'
  const [bgMusic, setBgMusic] = useState('ambient_cinematic');

  // Custom audio upload
  const [customAudioFile, setCustomAudioFile] = useState(null);
  const [customAudioUrl, setCustomAudioUrl] = useState(null);
  const [customAudioKey, setCustomAudioKey] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Scenes list
  const [scenes, setScenes] = useState([
    {
      sceneOrder: 0,
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
      storageKey: null,
      sourceProvider: 'unsplash',
      attributionAuthor: 'Alexandre Debiève',
      attributionUrl: 'https://unsplash.com/@alexandre_debieve',
      duration: 4,
      motionEffect: 'ken_burns_zoom_in',
      transitionStyle: 'fade',
      captionText: 'Experience intelligent visual creation',
    },
    {
      sceneOrder: 1,
      imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80',
      storageKey: null,
      sourceProvider: 'pexels',
      attributionAuthor: 'Aleksandar Pasaric',
      attributionUrl: 'https://unsplash.com/@apasaric',
      duration: 4,
      motionEffect: 'ken_burns_zoom_out',
      transitionStyle: 'fade',
      captionText: 'Vibrant cyberpunk neon aesthetics',
    },
    {
      sceneOrder: 2,
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
      storageKey: null,
      sourceProvider: 'unsplash',
      attributionAuthor: 'Milad Fakurian',
      attributionUrl: 'https://unsplash.com/@fakurian',
      duration: 4,
      motionEffect: 'pan_left',
      transitionStyle: 'fade',
      captionText: 'Dynamic camera motions and fluid transitions',
    },
  ]);

  // Modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState(null); // null = add new, number = replace

  // Multi-upload state
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Rendering state
  const [isRendering, setIsRendering] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStepText, setJobStepText] = useState('Initializing rendering pipeline...');
  const [jobError, setJobError] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [completedProject, setCompletedProject] = useState(null);

  // Multi-image file uploader handler
  const handleMultipleFilesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingImages(true);
    let addedCount = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);
      try {
        const res = await api.post('/videos/images/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data.success) {
          const newScene = {
            sceneOrder: scenes.length + addedCount,
            imageUrl: res.data.imageUrl,
            thumbnailUrl: res.data.thumbnailUrl,
            storageKey: res.data.storageKey,
            sourceProvider: 'upload',
            attributionAuthor: 'User Upload',
            attributionUrl: null,
            duration: 4,
            motionEffect: 'ken_burns_zoom_in',
            transitionStyle: globalTransition,
            captionText: file.name.replace(/\.[^/.]+$/, '').slice(0, 40),
          };
          setScenes((prev) => [...prev, newScene]);
          addedCount++;
        }
      } catch (err) {
        console.warn('Failed to upload file:', file.name, err);
      }
    }

    setIsUploadingImages(false);
    toast.success(`Added ${addedCount} photo(s) to timeline!`);
  };

  // Upload custom audio track
  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const res = await api.post('/videos/audio/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setCustomAudioFile(file);
        setCustomAudioUrl(res.data.audioUrl);
        setCustomAudioKey(res.data.storageKey);
        setAudioDuration(res.data.metadata.duration);
        toast.success(`Soundtrack loaded (${Math.round(res.data.metadata.duration)}s)!`);
      }
    } catch (err) {
      console.error('Audio upload failed:', err);
      toast.error('Failed to parse soundtrack audio.');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Auto-sync image durations to match audio length
  const handleAutoFitToAudio = () => {
    if (!audioDuration || scenes.length === 0) {
      toast.error('Please upload an audio track first to auto-fit durations.');
      return;
    }

    const perScene = Math.round((audioDuration / scenes.length) * 100) / 100;
    const next = scenes.map((s, idx) => ({
      ...s,
      duration: idx === scenes.length - 1 ? Math.round((audioDuration - perScene * (scenes.length - 1)) * 100) / 100 : perScene,
    }));
    setScenes(next);
    toast.success(`All scenes auto-synced to match ${Math.round(audioDuration)}s soundtrack!`);
  };

  // Image Modal Handler
  const handleOpenModal = (idx = null) => {
    setReplaceIndex(idx);
    setIsImageModalOpen(true);
  };

  const handleImageSelectedFromModal = (picked) => {
    if (replaceIndex !== null && scenes[replaceIndex]) {
      const next = [...scenes];
      next[replaceIndex] = {
        ...next[replaceIndex],
        imageUrl: picked.imageUrl,
        thumbnailUrl: picked.thumbnailUrl || picked.imageUrl,
        storageKey: picked.storageKey,
        sourceProvider: picked.sourceProvider,
        attributionAuthor: picked.attributionAuthor,
        attributionUrl: picked.attributionUrl,
      };
      setScenes(next);
      toast.success(`Replaced scene ${replaceIndex + 1}!`);
    } else {
      // Add new scene
      const newScene = {
        sceneOrder: scenes.length,
        imageUrl: picked.imageUrl,
        thumbnailUrl: picked.thumbnailUrl || picked.imageUrl,
        storageKey: picked.storageKey,
        sourceProvider: picked.sourceProvider,
        attributionAuthor: picked.attributionAuthor,
        attributionUrl: picked.attributionUrl,
        duration: 4,
        motionEffect: 'ken_burns_zoom_in',
        transitionStyle: globalTransition,
        captionText: picked.alt || `Scene ${scenes.length + 1}`,
      };
      setScenes([...scenes, newScene]);
      toast.success('Added new scene from stock library!');
    }
  };

  // Reorder, remove, and adjust scene properties
  const handleMoveScene = (idx, direction) => {
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === scenes.length - 1)) return;
    const targetIdx = idx + direction;
    const next = [...scenes];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setScenes(next);
  };

  const handleDeleteScene = (idx) => {
    if (scenes.length <= 1) {
      toast.error('At least one image is required.');
      return;
    }
    setScenes(scenes.filter((_, i) => i !== idx));
  };

  const handleDurationChange = (idx, val) => {
    const dur = Math.max(1, Math.min(30, parseFloat(val) || 1));
    const next = [...scenes];
    next[idx] = { ...next[idx], duration: dur };
    setScenes(next);
  };

  const handleMotionChange = (idx, motion) => {
    const next = [...scenes];
    next[idx] = { ...next[idx], motionEffect: motion };
    setScenes(next);
  };

  const handleCaptionChange = (idx, caption) => {
    const next = [...scenes];
    next[idx] = { ...next[idx], captionText: caption };
    setScenes(next);
  };

  const handleApplyGlobalDuration = (seconds) => {
    const next = scenes.map((s) => ({ ...s, duration: parseFloat(seconds) }));
    setScenes(next);
    toast.success(`Applied ${seconds}s duration to all ${scenes.length} scenes.`);
  };

  // Launch Video Generation
  const handleStartRender = async () => {
    if (scenes.length === 0) {
      toast.error('Please select at least one image.');
      return;
    }

    setIsRendering(true);
    setJobProgress(10);
    setJobStepText('Submitting project and initializing neural video pipeline...');
    setJobError(null);

    try {
      const res = await api.post('/videos/image-to-video', {
        title: title.trim() || `Animated Video - ${scenes.length} Scenes`,
        aspectRatio,
        style: 'cinematic',
        transitionStyle: globalTransition,
        hasSubtitles,
        bgMusic,
        audioStorageKey: customAudioKey,
        audioUrl: customAudioUrl,
        scenes,
        renderNow: true,
      });

      const newProjectId = res.data.projectId;
      setProjectId(newProjectId);

      // Start polling
      pollGenerationStatus(newProjectId);
    } catch (err) {
      console.error('Render launch error:', err);
      setIsRendering(false);
      setJobError(err.response?.data?.message || 'Failed to start video rendering.');
      toast.error('Render trigger failed.');
    }
  };

  const pollGenerationStatus = (pId) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/videos/${pId}/status`);
        if (res.data.success) {
          const status = res.data.status || res.data.projectStatus || res.data.job?.status;
          const progress = res.data.progress ?? res.data.job?.progress ?? (status === 'completed' ? 100 : 10);
          const step = res.data.step || res.data.job?.step || '';
          const error = res.data.error || res.data.job?.error;

          setJobProgress(progress);
          if (step) setJobStepText(step);

          if (status === 'completed') {
            clearInterval(interval);
            setIsRendering(false);
            setJobProgress(100);
            toast.success('Your video has finished rendering!');
            // Load full project
            const projectRes = await api.get(`/videos/${pId}`);
            if (projectRes.data.success && projectRes.data.project) {
              setCompletedProject(projectRes.data.project);
            }
          } else if (status === 'failed' || status === 'cancelled') {
            clearInterval(interval);
            setIsRendering(false);
            setJobError(error || 'Video rendering was terminated.');
          }
        }
      } catch (e) {
        console.warn('Status poll warning:', e);
      }
    }, 2500);
  };

  const handleCancelRender = async () => {
    if (!projectId) return;
    try {
      await api.post(`/videos/${projectId}/cancel`);
      toast.info('Cancellation request sent.');
    } catch (e) {
      console.error('Cancel request error:', e);
    }
  };

  const totalDuration = scenes.reduce((acc, s) => acc + (parseFloat(s.duration) || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-950/50 via-dark-surface to-dark-card border border-brand-500/20 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold border border-brand-500/30">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Workflow 2 &bull; Animated Multi-Image Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
            Images to Video Creator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Upload multiple photos or search free stock libraries. Animate still images with cinematic Ken Burns pan-and-zoom motions, smooth crossfades, scene durations, and audio sync.
          </p>
        </div>

        {/* Action Buttons to Add Photos */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => handleOpenModal(null)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-brand-600/25 transition-all flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            Browse Free Photos
          </button>

          <label className="px-4 py-2.5 rounded-xl bg-dark-card hover:bg-slate-800 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            {isUploadingImages ? 'Uploading...' : 'Upload Photos'}
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={handleMultipleFilesUpload}
              className="hidden"
              disabled={isUploadingImages}
            />
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      {!isRendering && !completedProject && (
        <div className="space-y-6">
          {/* Timeline Summary & Quick Actions */}
          <div className="p-6 rounded-2xl bg-dark-card border border-dark-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" />
                Image Timeline Reel ({scenes.length} Scenes)
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Total Duration: <strong className="text-white">{Math.round(totalDuration)}s</strong></span>
                <span>&bull;</span>
                <span>Aspect Ratio: <strong className="text-brand-400">{aspectRatio}</strong></span>
              </div>
            </div>

            {/* Quick duration presets */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Global Duration:</span>
              {[2, 3, 4, 5, 8].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleApplyGlobalDuration(sec)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-brand-600/30 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono transition-colors"
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Scenes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {scenes.map((scene, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-dark-card border border-dark-border overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group shadow-lg"
              >
                {/* Image Preview & Badges */}
                <div className="relative aspect-video bg-slate-950 overflow-hidden">
                  <img
                    src={scene.thumbnailUrl || scene.imageUrl}
                    alt={scene.captionText || `Scene ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Scene Number Chip */}
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-xs font-bold text-white border border-white/10">
                    Slide {idx + 1}
                  </span>

                  {/* Motion Effect Badge */}
                  <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-brand-300 capitalize">
                    {scene.motionEffect?.replace(/_/g, ' ') || 'zoom in'}
                  </span>

                  {/* Replace Photo Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenModal(idx)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-brand-600 backdrop-blur-sm text-xs text-white transition-colors flex items-center gap-1 border border-white/10"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Replace
                  </button>
                </div>

                {/* Body Controls */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">Photo: <strong className="text-slate-200">{scene.attributionAuthor || 'Unsplash Creator'}</strong></span>
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {scene.sourceProvider || 'stock'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">Duration (s)</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        step="0.5"
                        value={scene.duration}
                        onChange={(e) => handleDurationChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-dark-surface border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">Motion Effect</label>
                      <select
                        value={scene.motionEffect || 'ken_burns_zoom_in'}
                        onChange={(e) => handleMotionChange(idx, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-dark-surface border border-slate-800 text-white text-xs focus:outline-none focus:border-brand-500"
                      >
                        <option value="ken_burns_zoom_in">Ken Burns In</option>
                        <option value="ken_burns_zoom_out">Ken Burns Out</option>
                        <option value="pan_left">Pan Left</option>
                        <option value="pan_right">Pan Right</option>
                        <option value="static">Static Shot</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-medium">Caption Overlay</label>
                    <input
                      type="text"
                      value={scene.captionText || ''}
                      onChange={(e) => handleCaptionChange(idx, e.target.value)}
                      placeholder="Optional text overlay for this photo..."
                      className="w-full px-3 py-1.5 rounded-lg bg-dark-surface border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveScene(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                        title="Move Earlier"
                      >
                        &larr;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveScene(idx, 1)}
                        disabled={idx === scenes.length - 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                        title="Move Later"
                      >
                        &rarr;
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteScene(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1 transition-colors"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Scene Card */}
            <div
              onClick={() => handleOpenModal(null)}
              className="rounded-2xl border-2 border-dashed border-slate-800 hover:border-brand-500/50 transition-all p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-dark-surface/40 hover:bg-brand-500/5 text-slate-400 hover:text-white"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold">Add Image from Library</span>
            </div>
          </div>

          {/* Video Configuration & Audio Section */}
          <div className="p-6 sm:p-8 rounded-3xl bg-dark-card border border-dark-border space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-brand-400" />
              Video Settings & Soundtrack
            </h3>

            {/* Title & Aspect Ratio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Project Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Summer Moments Slideshow"
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-surface border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '16:9 Landscape', id: '16:9', icon: Monitor },
                    { label: '9:16 Vertical', id: '9:16', icon: Smartphone },
                    { label: '1:1 Square', id: '1:1', icon: Square },
                  ].map((ar) => {
                    const Icon = ar.icon;
                    return (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id)}
                        className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors ${
                          aspectRatio === ar.id
                            ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                            : 'bg-dark-surface text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {ar.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Animation Distinction Notice */}
            <div className="p-4 rounded-2xl bg-dark-surface border border-slate-800 flex items-start gap-3">
              <Info className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-white">Animation Engine: Smooth Ken Burns Pan & Zoom (Free)</p>
                <p className="text-slate-400">
                  Standard photo animation renders high-definition camera motion (zoom in, zoom out, left/right pan) and crossfades directly using FFmpeg. Does not require any paid third-party generative video API.
                </p>
              </div>
            </div>

            {/* Audio Soundtrack Options */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-brand-400" />
                  Background Soundtrack
                </h4>
                {audioDuration > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoFitToAudio}
                    className="text-xs font-semibold text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Auto-Fit Scene Durations to Audio ({Math.round(audioDuration)}s)
                  </button>
                )}
              </div>

              {/* Music Presets vs Custom Audio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Curated Royalty-Free Preset</label>
                  <select
                    value={bgMusic}
                    onChange={(e) => setBgMusic(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-dark-surface border border-slate-800 text-white text-xs focus:outline-none focus:border-brand-500"
                  >
                    {BGM_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Or Upload Custom Audio Track</label>
                  <label className="w-full px-4 py-2 rounded-xl bg-dark-surface border border-slate-800 hover:border-slate-700 text-slate-300 text-xs flex items-center justify-between cursor-pointer transition-colors">
                    <span className="truncate max-w-[180px]">
                      {customAudioFile ? customAudioFile.name : 'Choose audio file (.mp3, .wav)'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 text-[10px] font-semibold">
                      {isUploadingAudio ? 'Parsing...' : 'Browse'}
                    </span>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a"
                      onChange={handleAudioUpload}
                      className="hidden"
                      disabled={isUploadingAudio}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Total duration: <strong className="text-white">{Math.round(totalDuration)}s</strong>
              </span>

              <button
                type="button"
                onClick={handleStartRender}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-purple hover:from-brand-500 hover:to-brand-violet text-white text-xs sm:text-sm font-semibold shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Render Animated Video with FFmpeg
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rendering State */}
      {isRendering && (
        <div className="p-8 sm:p-12 rounded-3xl bg-dark-card border border-dark-border text-center space-y-6 shadow-2xl max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-heading font-extrabold text-white">
              Rendering Animated Slideshow Video
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
              {jobStepText}
            </p>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Progress</span>
              <span className="text-white font-bold">{jobProgress}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                style={{ width: `${jobProgress}%` }}
                className="h-full bg-gradient-to-r from-brand-600 to-brand-purple transition-all duration-500 rounded-full"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleCancelRender}
              className="px-5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold text-xs border border-rose-500/30 transition-colors"
            >
              Cancel Rendering
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {jobError && (
        <div className="p-8 rounded-3xl bg-rose-950/30 border border-rose-500/30 text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Rendering Terminated</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto">{jobError}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setJobError(null);
              setIsRendering(false);
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Back to Editor
          </button>
        </div>
      )}

      {/* Completed Video Showcase */}
      {completedProject && (
        <div className="p-6 sm:p-8 rounded-3xl bg-dark-card border border-dark-border space-y-6 shadow-2xl max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Video Successfully Rendered!</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {completedProject.duration_seconds}s &bull; {completedProject.aspect_ratio}
            </span>
          </div>

          {/* HTML5 Video Player */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-video shadow-2xl">
            <video
              src={completedProject.video_url}
              poster={completedProject.thumbnail_url}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setCompletedProject(null);
                setIsRendering(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Create Another Video
            </button>

            <div className="flex items-center gap-2">
              <DownloadButton project={completedProject} buttonSize="md" />
              <Link
                to={`/editor/${completedProject.id}`}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
              >
                Open in Editor
              </Link>
              <Link
                to={`/export/${completedProject.id}`}
                className="px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-xs border border-indigo-500/30 transition-colors flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                Publish to Socials
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Free Image Search Modal */}
      <ImageSearchModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelectImage={handleImageSelectedFromModal}
        initialQuery="cinematic landscape"
      />
    </div>
  );
}
