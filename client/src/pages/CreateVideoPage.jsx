import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Sparkles,
  Film,
  Type,
  FileText,
  Image as ImageIcon,
  Mic,
  Music,
  Sliders,
  Monitor,
  Smartphone,
  Square,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Upload,
  ArrowRight,
  X,
  Volume2,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DownloadButton from '../components/media/DownloadButton';

export default function CreateVideoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [method, setMethod] = useState('text_to_video'); // text_to_video, script_to_video, image_to_video, ai_scenes, voiceover_video
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState(location.state?.initialPrompt || '');
  const [script, setScript] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(15);
  const [language, setLanguage] = useState('English');
  const [voiceName, setVoiceName] = useState('Alloy');
  const [bgMusic, setBgMusic] = useState('ambient_cinematic');
  const [hasSubtitles, setHasSubtitles] = useState(true);
  const [targetPlatform, setTargetPlatform] = useState('general');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Generation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState(null); // { projectId, status, progress, step, error }

  // Sample prompt generator
  const samplePrompts = [
    'Cinematic 30-second commercial for an innovative AI personal assistant app, sleek dark mode aesthetics and glowing holographic UI.',
    'Fast-paced Instagram Reel about 5 productivity hacks for remote developers, upbeat music, vibrant neon typography, and smooth transitions.',
    'Epic teaser trailer for a cyberpunk video game, neon-drenched Tokyo street at midnight, synthetic pulse beats, and flying futuristic cars.',
    'E-commerce showcase of minimalist ergonomic desk setups with warm ambient lighting and soft acoustic background melody.',
  ];

  const handleInspireMe = () => {
    const random = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
    setPrompt(random);
    if (!title) {
      setTitle('AI Commercial Showcase');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Submit and launch video generation
  const handleStartGeneration = async (e) => {
    e.preventDefault();
    if (!prompt.trim() && !script.trim()) {
      toast.error('Please provide a prompt or script for your video.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create Project
      const createRes = await api.post('/videos', {
        title: title.trim() || prompt.trim().slice(0, 40),
        prompt: prompt.trim() || script.trim().slice(0, 80),
        script: script.trim() || null,
        generation_type: method,
        style,
        language,
        duration_seconds: duration,
        aspect_ratio: aspectRatio,
        bg_music: bgMusic,
        voice_name: voiceName,
        has_subtitles: hasSubtitles,
        target_platform: targetPlatform,
      });

      const projectId = createRes.data.projectId;

      // 2. Upload source image if provided
      if (uploadedImage) {
        const formData = new FormData();
        formData.append('file', uploadedImage);
        try {
          await api.post(`/videos/${projectId}/assets`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (e) {
          console.warn('Asset upload optional warning:', e);
        }
      }

      // 3. Trigger Generation Job
      const genRes = await api.post(`/videos/${projectId}/generate`, {
        provider: 'demo', // Default Demo high-fidelity engine
      });

      setActiveJob({
        projectId,
        status: 'processing',
        progress: 10,
        step: 'Initializing neural pipeline and scene graphs...',
        error: null,
      });

      toast.success('Video generation launched in background!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start generation.');
      setIsSubmitting(false);
    }
  };

  // Poll generation status while job is active
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/videos/${activeJob.projectId}/status`);
        if (res.data.success) {
          const jobData = res.data.job || {};
          const projectStatus = res.data.projectStatus || res.data.status;
          const progress = res.data.progress ?? jobData.progress ?? (projectStatus === 'completed' ? 100 : 0);
          const step = res.data.step || jobData.step || (projectStatus === 'completed' ? 'Completed' : 'Processing');
          const videoUrl = res.data.videoUrl;

          setActiveJob((prev) => ({
            ...prev,
            status: projectStatus,
            progress: progress || prev.progress,
            step: step || prev.step,
            videoUrl: videoUrl || prev.videoUrl,
          }));

          if (projectStatus === 'completed') {
            toast.success('Your AI Video is ready!');
            clearInterval(interval);
          } else if (projectStatus === 'failed') {
            toast.error(res.data.error || jobData.error || 'Generation encountered an error.');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJob, toast]);

  const handleCancelJob = async () => {
    if (!activeJob) return;
    try {
      await api.post(`/videos/${activeJob.projectId}/cancel`);
      setActiveJob((prev) => ({ ...prev, status: 'cancelled', step: 'Generation cancelled by user' }));
      toast.info('Generation cancelled.');
    } catch (e) {}
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-brand-400" />
            AI Video Generation Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Choose your creation method and tailor styles, audio narration, and platform format.
          </p>
        </div>

        <button
          type="button"
          onClick={handleInspireMe}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/30 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          Inspire Me (Random Idea)
        </button>
      </div>

      {/* Real-time Generation Progress Modal/Card */}
      {activeJob && (
        <div className="p-6 rounded-3xl bg-dark-card border-2 border-brand-500/50 shadow-2xl space-y-6 animate-scale-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {activeJob.status === 'completed'
                    ? 'Video Generated Successfully! 🎉'
                    : activeJob.status === 'failed'
                    ? 'Generation Encountered an Error'
                    : 'Synthesizing Your Video with AI...'}
                </h3>
                <p className="text-xs text-slate-400">{activeJob.step}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl font-heading font-extrabold text-brand-400">
                {activeJob.progress}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                activeJob.status === 'completed'
                  ? 'bg-emerald-500'
                  : activeJob.status === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-brand-600 via-brand-purple to-brand-pink'
              }`}
              style={{ width: `${activeJob.progress}%` }}
            />
          </div>

          {/* Completed Video Player Preview */}
          {activeJob.status === 'completed' && activeJob.videoUrl && (
            <div className="rounded-2xl overflow-hidden border border-brand-500/30 bg-black aspect-video max-h-80 mx-auto shadow-2xl relative">
              <video
                src={activeJob.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Action buttons upon completion or in progress */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {activeJob.status === 'completed' ? (
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <DownloadButton
                  project={{
                    id: activeJob.projectId,
                    status: 'completed',
                    video_url: activeJob.videoUrl,
                    title: title || prompt.slice(0, 30),
                    aspect_ratio: aspectRatio,
                  }}
                  buttonSize="md"
                />
                <button
                  onClick={() => navigate(`/editor/${activeJob.projectId}`)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/25 transition-all"
                >
                  Open in Video Editor
                </button>
                <button
                  onClick={() => navigate(`/export/${activeJob.projectId}`)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all"
                >
                  Export & Publish
                </button>
                <button
                  onClick={() => setActiveJob(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  New Video
                </button>
              </div>
            ) : activeJob.status === 'failed' ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveJob(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-slate-400 italic">
                  Real FFmpeg rendering in progress. Please do not close this window.
                </span>
                <button
                  onClick={handleCancelJob}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors"
                >
                  Cancel Generation
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Specialized Studios Quick Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/create/audio-to-video"
          className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-dark-card border border-indigo-500/30 hover:border-brand-500/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                Audio to Video Creator &rarr;
              </h3>
              <p className="text-[11px] text-slate-400">Upload audio/music & auto-sync with stock photos</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Dedicated
          </span>
        </Link>

        <Link
          to="/create/image-to-video"
          className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 to-dark-card border border-rose-500/30 hover:border-brand-500/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                Images to Video Creator &rarr;
              </h3>
              <p className="text-[11px] text-slate-400">Animate photos with Ken Burns pan & zoom timeline</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            Dedicated
          </span>
        </Link>
      </div>

      {/* Main Form */}
      <form onSubmit={handleStartGeneration} className="space-y-8">
        {/* Creation Method Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-1.5 bg-dark-surface rounded-2xl border border-dark-border">
          {[
            { id: 'text_to_video', label: 'Text-to-Video', icon: Type },
            { id: 'script_to_video', label: 'Script-to-Video', icon: FileText },
            { id: 'image_to_video', label: 'Image-to-Video', icon: ImageIcon },
            { id: 'ai_scenes', label: 'AI Scenes', icon: Layers },
            { id: 'voiceover_video', label: 'Voiceover Video', icon: Mic },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = method === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMethod(tab.id)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Inputs Card */}
        <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Project Title <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cyberpunk Futuristic Sneaker Commercial"
              className="w-full px-4 py-2.5 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Prompt / Script Input */}
          {method === 'script_to_video' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Video Script & Narration
              </label>
              <textarea
                rows={6}
                required
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Paste your narration script here. Our AI will break it into scene storyboards and sync captions automatically..."
                className="w-full p-4 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500 leading-relaxed font-sans"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Creative Video Prompt
              </label>
              <textarea
                rows={4}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your scene in detail: lighting, subject motion, camera angle, and atmosphere..."
                className="w-full p-4 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500 leading-relaxed"
              />
            </div>
          )}

          {/* Image Upload for Image-to-Video */}
          {method === 'image_to_video' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Source Image (Motion Target)
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-6 text-center cursor-pointer bg-dark-surface/50 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs text-slate-300 block font-medium">Click to upload reference image</span>
                  <span className="text-[11px] text-slate-500">PNG, JPG, or WebP up to 25MB</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                {imagePreview && (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-brand-500/40 shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Visual Settings & Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Aspect Ratio Selector */}
          <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Video Aspect Ratio</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '16:9', label: '16:9', sub: 'YouTube / Web', icon: Monitor },
                { id: '9:16', label: '9:16', sub: 'Shorts / Reels', icon: Smartphone },
                { id: '1:1', label: '1:1', sub: 'Feed / Square', icon: Square },
              ].map((ar) => {
                const Icon = ar.icon;
                const active = aspectRatio === ar.id;
                return (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setAspectRatio(ar.id)}
                    className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                      active
                        ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                        : 'bg-dark-surface border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-brand-400" />
                    <span className="font-bold text-xs">{ar.label}</span>
                    <span className="text-[10px] text-slate-400">{ar.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Social Platform Preset */}
          <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Social Platform</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'general', label: 'Universal MP4' },
                { id: 'youtube', label: 'YouTube Studio' },
                { id: 'instagram', label: 'Instagram Reels' },
                { id: 'facebook', label: 'Facebook Feed' },
              ].map((plat) => (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => setTargetPlatform(plat.id)}
                  className={`py-3 px-4 rounded-xl border text-xs font-semibold text-center transition-all ${
                    targetPlatform === plat.id
                      ? 'bg-brand-purple/20 border-brand-purple text-white'
                      : 'bg-dark-surface border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {plat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Style Selection */}
        <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Visual Art Style</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { id: 'cinematic', label: 'Cinematic' },
              { id: 'anime', label: 'Anime / Manga' },
              { id: '3d_render', label: '3D Render' },
              { id: 'cyberpunk', label: 'Cyberpunk' },
              { id: 'photorealistic', label: 'Photorealistic' },
              { id: 'minimalist', label: 'Minimalist' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStyle(st.id)}
                className={`py-3 px-3 rounded-2xl border text-xs font-semibold transition-all text-center ${
                  style === st.id
                    ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-600/20'
                    : 'bg-dark-surface border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration, Voiceover & Music Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Duration Slider */}
          <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Video Duration</span>
              <span className="font-mono font-bold text-brand-400">{duration} Seconds</span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5s</span>
              <span>15s</span>
              <span>30s</span>
              <span>60s</span>
            </div>
          </div>

          {/* Voiceover Voice */}
          <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Studio Narration Voice
            </label>
            <select
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="Alloy">Alloy (Balanced, Neutral)</option>
              <option value="Echo">Echo (Dynamic, Warm)</option>
              <option value="Fable">Fable (Expressive, British)</option>
              <option value="Onyx">Onyx (Deep, Authoritative)</option>
              <option value="Nova">Nova (Energetic, Bright)</option>
              <option value="Shimmer">Shimmer (Clear, Melodic)</option>
            </select>
          </div>

          {/* Background Music */}
          <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Background Soundtrack
            </label>
            <select
              value={bgMusic}
              onChange={(e) => setBgMusic(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="ambient_cinematic">Ambient Cinematic Soundscape</option>
              <option value="lofi_chill">Lo-Fi Chill & Beats</option>
              <option value="synthwave">High-Energy Cyberpunk Synthwave</option>
              <option value="corporate_upbeat">Corporate Modern & Optimistic</option>
            </select>
          </div>
        </div>

        {/* Subtitles Toggle & Launch Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-gradient-to-r from-dark-card via-dark-surface to-dark-card border border-dark-border">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasSubtitles}
              onChange={(e) => setHasSubtitles(e.target.checked)}
              className="w-5 h-5 rounded bg-dark-surface border-slate-700 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="text-xs font-bold text-white block">Generate Animated Subtitles</span>
              <span className="text-[11px] text-slate-400">Auto-transcribes text with synchronized cues</span>
            </div>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-purple to-brand-pink hover:from-brand-500 hover:to-brand-violet text-white font-bold text-sm shadow-xl shadow-brand-600/30 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            Generate Video (10 Credits)
          </button>
        </div>
      </form>
    </div>
  );
}
