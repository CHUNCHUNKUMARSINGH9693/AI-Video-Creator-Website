import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Music,
  Mic,
  Upload,
  Play,
  Pause,
  Sparkles,
  Clock,
  Film,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sliders,
  Image as ImageIcon,
  Trash2,
  Plus,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  X,
  Volume2,
  FileAudio,
  Radio,
  Monitor,
  Smartphone,
  Square,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';
import ImageSearchModal from '../components/media/ImageSearchModal';
import DownloadButton from '../components/media/DownloadButton';

const VISUAL_THEMES = [
  {
    id: 'cinematic',
    label: 'Cinematic Vista',
    desc: 'Atmospheric widescreen vistas with dramatic golden lighting',
    color: 'from-blue-600/30 to-indigo-900/40 border-blue-500/30',
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk Neon',
    desc: 'Futuristic night streets, glowing neon lights, and high-tech vibes',
    color: 'from-fuchsia-600/30 to-purple-900/40 border-fuchsia-500/30',
  },
  {
    id: 'technology',
    label: 'Modern Tech & AI',
    desc: 'Clean software code, circuits, workstations, and digital interfaces',
    color: 'from-cyan-600/30 to-blue-900/40 border-cyan-500/30',
  },
  {
    id: 'nature',
    label: 'Serene Nature',
    desc: 'Alpine peaks, misty forests, rolling waves, and tranquil lakes',
    color: 'from-emerald-600/30 to-teal-900/40 border-emerald-500/30',
  },
  {
    id: 'business',
    label: 'Corporate Strategy',
    desc: 'Modern collaborative studios, office analytics, and innovation',
    color: 'from-slate-600/30 to-slate-900/40 border-slate-500/30',
  },
  {
    id: 'lofi_chill',
    label: 'Lo-Fi Chill & Warmth',
    desc: 'Cozy coffee mugs, vinyl records, rainy windows, and sunset roofs',
    color: 'from-amber-600/30 to-orange-900/40 border-amber-500/30',
  },
  {
    id: 'workout',
    label: 'High-Energy Fitness',
    desc: 'Intense gym motivation, athletic power, and dynamic movement',
    color: 'from-rose-600/30 to-red-900/40 border-rose-500/30',
  },
  {
    id: 'epic_trailer',
    label: 'Epic Universe',
    desc: 'Cosmic nebulae, stormy seas, and awe-inspiring celestial grandeur',
    color: 'from-purple-600/30 to-violet-900/40 border-purple-500/30',
  },
];

export default function AudioToVideoPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // Wizard Step: 1 = Upload & Config, 2 = Scene Reel & Timeline, 3 = Rendering / Result
  const [currentStep, setCurrentStep] = useState(1);

  // Audio state
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioStorageKey, setAudioStorageKey] = useState(null);
  const [audioMetadata, setAudioMetadata] = useState(null);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);

  // Configuration options
  const [title, setTitle] = useState('');
  const [visualTheme, setVisualTheme] = useState('cinematic');
  const [isMusic, setIsMusic] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [speechText, setSpeechText] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [hasSubtitles, setHasSubtitles] = useState(true);

  // Scenes list
  const [scenes, setScenes] = useState([]);
  const [activeReplaceIndex, setActiveReplaceIndex] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Audio Player playback
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Generation / Job state
  const [projectId, setProjectId] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStepText, setJobStepText] = useState('Queued in rendering engine...');
  const [jobError, setJobError] = useState(null);
  const [completedProject, setCompletedProject] = useState(null);

  // File drag state
  const [isDragging, setIsDragging] = useState(false);

  // Audio player time listener
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setPlaybackTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // Toggle playback
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Upload and analyze audio file
  const handleAudioSelected = async (file) => {
    if (!file) return;

    // Validate type against extensive audio formats
    const validExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.aiff', '.aif', '.opus', '.weba', '.webm'];
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidExt && !file.type.startsWith('audio/') && !file.type.includes('ogg') && !file.type.includes('m4a')) {
      toast.error('Please upload a supported audio format (MP3, WAV, AAC, M4A, OGG, FLAC).');
      return;
    }

    setAudioFile(file);
    setIsAnalyzingAudio(true);

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('visualTheme', visualTheme);
    formData.append('userDescription', userPrompt);
    formData.append('isMusic', isMusic);
    formData.append('speechText', speechText);

    try {
      const res = await api.post('/videos/audio/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setAudioUrl(res.data.audioUrl);
        setAudioStorageKey(res.data.storageKey);
        setAudioMetadata(res.data.metadata);

        if (!title) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          setTitle(cleanName.slice(0, 40));
        }

        const analysis = res.data.sceneAnalysis;
        if (analysis && analysis.scenes) {
          setScenes(analysis.scenes);
        }

        toast.success(`Audio parsed! Duration: ${Math.round(res.data.metadata.duration)}s with ${analysis?.scenes?.length || 0} synchronized scenes`);
      }
    } catch (err) {
      console.error('Audio analysis error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to analyze audio file.';
      toast.error(errMsg);
    } finally {
      setIsAnalyzingAudio(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleAudioSelected(files[0]);
    }
  };

  // Step navigation
  const handleProceedToScenes = () => {
    if (!audioStorageKey) {
      toast.error('Please upload and analyze an audio file first.');
      return;
    }
    setCurrentStep(2);
  };

  // Scene operations
  const handleDurationChange = (idx, newDuration) => {
    const dur = Math.max(1, Math.min(30, parseFloat(newDuration) || 1));
    const next = [...scenes];
    next[idx] = { ...next[idx], duration: dur };
    setScenes(next);
  };

  const handleMotionChange = (idx, motion) => {
    const next = [...scenes];
    next[idx] = { ...next[idx], motionEffect: motion };
    setScenes(next);
  };

  const handleTransitionChange = (idx, transition) => {
    const next = [...scenes];
    next[idx] = { ...next[idx], transitionStyle: transition };
    setScenes(next);
  };

  const handleCaptionChange = (idx, caption) => {
    const next = [...scenes];
    next[idx] = { ...next[idx], captionText: caption };
    setScenes(next);
  };

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
      toast.error('A video requires at least one scene.');
      return;
    }
    setScenes(scenes.filter((_, i) => i !== idx));
  };

  const handleAutoFitScenesToAudio = () => {
    if (!audioMetadata || scenes.length === 0) return;
    const perScene = Math.round((audioMetadata.duration / scenes.length) * 100) / 100;
    const next = scenes.map((s, i) => ({
      ...s,
      duration: i === scenes.length - 1 ? Math.round((audioMetadata.duration - perScene * (scenes.length - 1)) * 100) / 100 : perScene,
    }));
    setScenes(next);
    toast.success(`Scenes adjusted evenly to ${perScene}s to match ${Math.round(audioMetadata.duration)}s audio!`);
  };

  const handleOpenReplaceModal = (idx) => {
    setActiveReplaceIndex(idx);
    setIsImageModalOpen(true);
  };

  const handleImagePickedFromModal = (picked) => {
    if (activeReplaceIndex !== null && scenes[activeReplaceIndex]) {
      const next = [...scenes];
      next[activeReplaceIndex] = {
        ...next[activeReplaceIndex],
        imageUrl: picked.imageUrl,
        thumbnailUrl: picked.thumbnailUrl || picked.imageUrl,
        storageKey: picked.storageKey,
        sourceProvider: picked.sourceProvider,
        attributionAuthor: picked.attributionAuthor,
        attributionUrl: picked.attributionUrl,
      };
      setScenes(next);
      toast.success(`Replaced image for scene ${activeReplaceIndex + 1}!`);
    }
  };

  // Launch Video Generation
  const handleStartRender = async () => {
    if (scenes.length === 0) {
      toast.error('Cannot create video without scenes.');
      return;
    }

    setIsRendering(true);
    setJobProgress(10);
    setJobStepText('Submitting project and initializing neural video pipeline...');
    setJobError(null);
    setCurrentStep(3);

    try {
      const res = await api.post('/videos/audio-to-video', {
        title: title.trim() || 'Audio Visualizer Masterpiece',
        prompt: userPrompt.trim() || `Audio visualizer in ${visualTheme} theme`,
        visualTheme,
        aspectRatio,
        hasSubtitles,
        audioStorageKey,
        audioUrl,
        audioMetadata,
        scenes,
        renderNow: true,
      });

      const newProjectId = res.data.projectId;
      setProjectId(newProjectId);

      // Start polling for real completion
      pollGenerationStatus(newProjectId);
    } catch (err) {
      console.error('Render launch error:', err);
      setIsRendering(false);
      setJobError(err.response?.data?.message || 'Failed to start video rendering.');
      toast.error('Render trigger failed.');
    }
  };

  // Poll job status until 100% or failure
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

  // Cancel generation
  const handleCancelRender = async () => {
    if (!projectId) return;
    try {
      await api.post(`/videos/${projectId}/cancel`);
      toast.info('Cancellation request sent.');
    } catch (e) {
      console.error('Cancel request error:', e);
    }
  };

  const totalScenesDuration = scenes.reduce((acc, s) => acc + (parseFloat(s.duration) || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Hidden audio element for waveform playback */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-dark-surface to-dark-card border border-brand-500/20 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold border border-brand-500/30">
            <Music className="w-3.5 h-3.5" />
            <span>Workflow 1 &bull; Auto-Synced Audio Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
            Audio to Video Creator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Upload podcasts, speeches, voice tracks, or music. The system automatically inspects duration, analyzes keywords, suggests matching real photographs from free image libraries, and renders an MP4 video with FFmpeg.
          </p>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-dark-bg/80 px-3 py-1.5 rounded-2xl border border-slate-800">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${currentStep === 1 ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>
            1. Audio
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${currentStep === 2 ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>
            2. Scenes Reel
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${currentStep === 3 ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>
            3. Render MP4
          </span>
        </div>
      </div>

      {/* STEP 1: Audio Upload, Metadata & Analysis */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload Box (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Audio Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all text-center space-y-4 ${
                isDragging
                  ? 'border-brand-500 bg-brand-500/10'
                  : audioMetadata
                  ? 'border-emerald-500/40 bg-dark-surface/60'
                  : 'border-slate-700/80 hover:border-slate-600 bg-dark-card/60'
              }`}
            >
              <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/10">
                {isAnalyzingAudio ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : (
                  <FileAudio className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {audioFile ? audioFile.name : 'Upload Audio Track'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Drag and drop your audio file or browse from your device. Supported formats: MP3, WAV, M4A, AAC, OGG.
                </p>
              </div>

              {/* Upload Input */}
              <div>
                <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-lg shadow-brand-600/25 transition-all">
                  <Upload className="w-4 h-4" />
                  {audioFile ? 'Change Audio File' : 'Browse Audio File'}
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.wma,.aiff,.aif,.opus,.weba"
                    onChange={(e) => e.target.files?.[0] && handleAudioSelected(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Audio Metadata & Interactive Waveform Display */}
            {audioMetadata && (
              <div className="p-6 rounded-2xl bg-dark-card border border-dark-border space-y-4 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="w-11 h-11 rounded-xl bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 transition-transform active:scale-95"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <div>
                      <p className="text-sm font-bold text-white truncate max-w-xs">{title || audioFile?.name}</p>
                      <p className="text-xs text-slate-400">
                        {Math.floor(playbackTime)}s / {Math.round(audioMetadata.duration)}s total duration
                      </p>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                      {audioMetadata.codec.toUpperCase()}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                      {audioMetadata.bitrate} kbps
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                      {audioMetadata.sampleRate} Hz
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                      {audioMetadata.channels === 2 ? 'Stereo' : 'Mono'}
                    </span>
                  </div>
                </div>

                {/* Waveform Visualization Bars */}
                <div className="h-14 p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-1 justify-between overflow-hidden">
                  {(audioMetadata.waveform || []).map((peak, idx) => {
                    const barProgress = (idx / audioMetadata.waveform.length) * audioMetadata.duration;
                    const isPassed = playbackTime >= barProgress;
                    return (
                      <div
                        key={idx}
                        style={{ height: `${Math.max(15, peak * 100)}%` }}
                        className={`w-1.5 rounded-full transition-colors ${
                          isPassed ? 'bg-brand-400 shadow-sm shadow-brand-400/50' : 'bg-slate-700'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Project Title & Context Description */}
            <div className="p-6 rounded-2xl bg-dark-card border border-dark-border space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-400" />
                Project Details & Topic Guidance
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Video Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Deep Tech Podcast - Episode 12"
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-surface border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Audio Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMusic(false)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                        !isMusic
                          ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                          : 'bg-dark-surface text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Speech / Voice
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMusic(true)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                        isMusic
                          ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                          : 'bg-dark-surface text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Music className="w-3.5 h-3.5" />
                      Music / Beat
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {isMusic ? 'Visual Theme Prompt / Music Mood' : 'Spoken Content Summary or Keywords'}
                </label>
                <textarea
                  rows={2}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={
                    isMusic
                      ? 'e.g., Chill lofi beats with warm rainy coffee shop visuals and subtle neon reflections...'
                      : 'e.g., Artificial intelligence startup discussing neural networks, cloud computing, and developer productivity...'
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-surface border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Visual Theme Preset Selector */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-dark-card border border-dark-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  Select Visual Theme
                </h3>
                <span className="text-[10px] text-brand-400 uppercase font-semibold">Free Pexels/Unsplash</span>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {VISUAL_THEMES.map((theme) => {
                  const isSelected = visualTheme === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setVisualTheme(theme.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? `bg-gradient-to-r ${theme.color} ring-1 ring-brand-400 shadow-md`
                          : 'bg-dark-surface/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{theme.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{theme.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={!audioMetadata || isAnalyzingAudio}
                onClick={handleProceedToScenes}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-purple hover:from-brand-500 hover:to-brand-violet text-white font-semibold text-xs sm:text-sm shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isAnalyzingAudio ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing Audio Timeline...
                  </>
                ) : (
                  <>
                    Review Suggested Scenes ({scenes.length})
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Scenes Reel & Timeline Synchronization */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Timeline Synchronization Header */}
          <div className="p-6 rounded-2xl bg-dark-card border border-dark-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-brand-400" />
                Synchronize Scenes with Audio
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>Audio Duration: <strong className="text-white">{Math.round(audioMetadata?.duration || 0)}s</strong></span>
                <span>&bull;</span>
                <span>Scenes Total: <strong className="text-white">{Math.round(totalScenesDuration)}s</strong></span>
                <span>&bull;</span>
                <span className="capitalize">Theme: <strong className="text-brand-400">{visualTheme.replace('_', ' ')}</strong></span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAutoFitScenesToAudio}
                className="px-4 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 font-semibold text-xs border border-brand-500/30 transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Auto-Fit Scenes to Audio
              </button>
              <button
                type="button"
                onClick={() => {
                  const newScene = {
                    sceneOrder: scenes.length,
                    duration: 4,
                    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
                    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
                    sourceProvider: 'unsplash',
                    attributionAuthor: 'Alexandre Debiève',
                    attributionUrl: 'https://unsplash.com',
                    captionText: `Scene ${scenes.length + 1}`,
                    motionEffect: 'ken_burns_zoom_in',
                    transitionStyle: 'fade',
                  };
                  setScenes([...scenes, newScene]);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Scene
              </button>
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
                    Scene {idx + 1}
                  </span>

                  {/* Motion Effect Badge */}
                  <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-brand-300 capitalize">
                    {scene.motionEffect?.replace(/_/g, ' ') || 'zoom in'}
                  </span>

                  {/* Replace Photo Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenReplaceModal(idx)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-brand-600 backdrop-blur-sm text-xs text-white transition-colors flex items-center gap-1 border border-white/10"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Replace
                  </button>
                </div>

                {/* Body Controls */}
                <div className="p-4 space-y-3">
                  {/* Attribution information */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">Photo: <strong className="text-slate-200">{scene.attributionAuthor || 'Unsplash Creator'}</strong></span>
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {scene.sourceProvider || 'stock'}
                    </span>
                  </div>

                  {/* Duration and Motion controls */}
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

                  {/* Caption input */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-medium">Caption / Subtitle Text</label>
                    <input
                      type="text"
                      value={scene.captionText || ''}
                      onChange={(e) => handleCaptionChange(idx, e.target.value)}
                      placeholder="Optional scene caption or subtitle..."
                      className="w-full px-3 py-1.5 rounded-lg bg-dark-surface border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Reorder and Delete controls */}
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
                      title="Remove Scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Settings & Render Action Bar */}
          <div className="p-6 rounded-2xl bg-dark-card border border-dark-border space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '16:9', id: '16:9', icon: Monitor },
                    { label: '9:16', id: '9:16', icon: Smartphone },
                    { label: '1:1', id: '1:1', icon: Square },
                  ].map((ar) => {
                    const Icon = ar.icon;
                    return (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id)}
                        className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
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

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Subtitles & Captions</label>
                <button
                  type="button"
                  onClick={() => setHasSubtitles(!hasSubtitles)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-between transition-colors ${
                    hasSubtitles
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-dark-surface text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span>Burn-in Subtitles</span>
                  <span>{hasSubtitles ? 'Enabled' : 'Disabled'}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Audio Track</label>
                <div className="px-3 py-2 rounded-xl bg-dark-surface border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span className="truncate max-w-[150px]">{audioFile?.name || 'Uploaded Audio'}</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Master Track</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Audio
              </button>

              <button
                type="button"
                onClick={handleStartRender}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-purple hover:from-brand-500 hover:to-brand-violet text-white text-xs sm:text-sm font-semibold shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Render Finished Video with FFmpeg
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Live Rendering Progress & Completed Output */}
      {currentStep === 3 && (
        <div className="space-y-8 max-w-3xl mx-auto">
          {isRendering ? (
            /* Rendering Progress State */
            <div className="p-8 sm:p-12 rounded-3xl bg-dark-card border border-dark-border text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-heading font-extrabold text-white">
                  Rendering Video with FFmpeg
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  {jobStepText}
                </p>
              </div>

              {/* Progress Bar */}
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

              {/* Cancel Button */}
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
          ) : jobError ? (
            /* Error State */
            <div className="p-8 rounded-3xl bg-rose-950/30 border border-rose-500/30 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Rendering Terminated</h3>
                <p className="text-xs text-rose-300 max-w-md mx-auto">{jobError}</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Back to Scene Editor
              </button>
            </div>
          ) : completedProject ? (
            /* Completed Video Showcase */
            <div className="p-6 sm:p-8 rounded-3xl bg-dark-card border border-dark-border space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Video Successfully Generated!</span>
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
                    setCurrentStep(1);
                    setAudioFile(null);
                    setAudioUrl(null);
                    setAudioStorageKey(null);
                    setScenes([]);
                    setCompletedProject(null);
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
          ) : null}
        </div>
      )}

      {/* Free Image Search Modal */}
      <ImageSearchModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelectImage={handleImagePickedFromModal}
        initialQuery={activeReplaceIndex !== null ? scenes[activeReplaceIndex]?.searchQuery || visualTheme : visualTheme}
      />
    </div>
  );
}
