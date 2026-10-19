import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Scissors,
  Monitor,
  Smartphone,
  Square,
  Subtitles as SubtitlesIcon,
  Image as ImageIcon,
  Save,
  Share2,
  Film,
  RotateCcw,
  Volume2,
  Check,
  Sparkles,
  ArrowLeft,
  Download,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import VideoPlayer from '../components/common/VideoPlayer';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function VideoEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trim'); // 'trim', 'aspect', 'subtitles', 'thumbnail', 'details'

  // Current video player scrub timestamp
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);

  // Trim controls
  const [trimStart, setTrimStart] = useState(0);
  const [trimDuration, setTrimDuration] = useState(15);
  const [trimming, setTrimming] = useState(false);

  // Subtitles controls
  const [subtitleText, setSubtitleText] = useState('');
  const [subFontSize, setSubFontSize] = useState(24);
  const [subColor, setSubColor] = useState('#FFFFFF');
  const [subPosition, setSubPosition] = useState('bottom');
  const [savingSubs, setSavingSubs] = useState(false);

  // Title & metadata
  const [title, setTitle] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Aspect conversion
  const [convertingAspect, setConvertingAspect] = useState(false);

  // Thumbnail frame picker
  const [capturingThumb, setCapturingThumb] = useState(false);

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await api.get(`/videos/${id}`);
        if (res.data.success) {
          const p = res.data.project;
          setProject(p);
          setTitle(p.title || '');
          setTrimDuration(p.duration_seconds || 15);
          if (p.subtitles) {
            setSubtitleText(p.subtitles.subtitle_text || '');
            setSubFontSize(p.subtitles.font_size || 24);
            setSubColor(p.subtitles.font_color || '#FFFFFF');
            setSubPosition(p.subtitles.position || 'bottom');
          } else {
            setSubtitleText(p.script || p.prompt || '');
          }
        }
      } catch (err) {
        toast.error('Failed to load video project for editing.');
        navigate('/library');
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [id, navigate, toast]);

  // Handle FFmpeg Trim
  const handleApplyTrim = async () => {
    if (!project?.video_url) return;
    setTrimming(true);

    try {
      const res = await api.post(`/videos/${id}/trim`, {
        startTime: parseFloat(trimStart) || 0,
        duration: parseFloat(trimDuration) || null,
      });

      if (res.data.success) {
        toast.success('Video trimmed successfully using FFmpeg!');
        setProject((prev) => ({
          ...prev,
          video_url: res.data.videoUrl,
          duration_seconds: trimDuration,
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trimming operation failed.');
    } finally {
      setTrimming(false);
    }
  };

  // Handle FFmpeg Aspect Ratio Conversion
  const handleResize = async (targetAspect) => {
    if (!project?.video_url) return;
    setConvertingAspect(true);

    try {
      const res = await api.post(`/videos/${id}/resize`, {
        aspectRatio: targetAspect,
      });

      if (res.data.success) {
        toast.success(`Converted video to ${targetAspect}!`);
        setProject((prev) => ({
          ...prev,
          video_url: res.data.videoUrl,
          aspect_ratio: targetAspect,
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resize operation failed.');
    } finally {
      setConvertingAspect(false);
    }
  };

  // Handle Subtitle saving & SRT generation
  const handleSaveSubtitles = async () => {
    setSavingSubs(true);
    try {
      const res = await api.post(`/videos/${id}/subtitles`, {
        subtitleText,
        fontSize: subFontSize,
        fontColor: subColor,
        position: subPosition,
      });

      if (res.data.success) {
        toast.success('Subtitles saved and synchronized!');
      }
    } catch (err) {
      toast.error('Failed to update subtitles.');
    } finally {
      setSavingSubs(false);
    }
  };

  // Handle Extracting frame as Thumbnail
  const handleCaptureThumbnail = async () => {
    if (!project?.video_url) return;
    setCapturingThumb(true);

    try {
      const res = await api.post(`/videos/${id}/thumbnail`, {
        timestamp: Math.max(0.5, playerCurrentTime),
      });

      if (res.data.success) {
        toast.success(`Poster thumbnail updated from ${playerCurrentTime.toFixed(1)}s!`);
        setProject((prev) => ({
          ...prev,
          thumbnail_url: res.data.thumbnailUrl,
        }));
      }
    } catch (err) {
      toast.error('Failed to capture frame.');
    } finally {
      setCapturingThumb(false);
    }
  };

  // Save Title / Project metadata
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSavingDetails(true);

    try {
      await api.patch(`/videos/${id}`, { title });
      toast.success('Project details saved.');
    } catch (err) {
      toast.error('Failed to save details.');
    } finally {
      setSavingDetails(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading studio video editor..." className="h-96" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-dark-border">
        <div className="flex items-center gap-3">
          <Link
            to="/library"
            className="p-2 rounded-xl bg-dark-card hover:bg-slate-800 text-slate-300 hover:text-white border border-dark-border transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-brand-400" />
              {project?.title || 'Video Editor'}
            </h1>
            <p className="text-xs text-slate-400">
              Format: {project?.aspect_ratio} &bull; {project?.duration_seconds}s &bull; {project?.style}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to={`/export/${id}`}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-purple hover:from-brand-500 hover:to-brand-violet text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Social Export Studio
          </Link>
          <a
            href={`/api/videos/${id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-card hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-dark-border transition-colors"
          >
            <Download className="w-4 h-4" />
            Download MP4
          </a>
        </div>
      </div>

      {/* Editor Main Layout: Video Player (Left) + Editing Panels (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Video Preview Workspace (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-3xl bg-dark-card border border-dark-border">
            <VideoPlayer
              src={project?.video_url}
              poster={project?.thumbnail_url}
              aspectRatio={project?.aspect_ratio || '16:9'}
              onTimeUpdate={(cur) => setPlayerCurrentTime(cur)}
              className="w-full"
            />
          </div>

          {/* Scrubber indicator card */}
          <div className="p-4 rounded-2xl bg-dark-surface border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              Current Playhead Time: <strong className="text-white font-mono">{playerCurrentTime.toFixed(2)}s</strong>
            </span>
            <span className="text-[11px] text-brand-400 font-medium">
              FFmpeg Powered Engine
            </span>
          </div>
        </div>

        {/* Right Column: Editing Tools & Settings (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tool Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-dark-surface rounded-2xl border border-dark-border overflow-x-auto">
            {[
              { id: 'trim', label: 'Trim & Cut', icon: Scissors },
              { id: 'aspect', label: 'Aspect Ratio', icon: Monitor },
              { id: 'subtitles', label: 'Captions', icon: SubtitlesIcon },
              { id: 'thumbnail', label: 'Thumbnail', icon: ImageIcon },
              { id: 'details', label: 'Metadata', icon: Save },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Trimming Panel */}
          {activeTab === 'trim' && (
            <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-brand-400" />
                  Trim Video Start & Duration
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust the start timestamp and duration using server-side FFmpeg precision cut.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">Start Offset</span>
                    <span className="font-mono text-brand-400">{trimStart}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, (project?.duration_seconds || 30) - 2)}
                    step={0.5}
                    value={trimStart}
                    onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">Cut Duration</span>
                    <span className="font-mono text-brand-400">{trimDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={project?.duration_seconds || 30}
                    step={1}
                    value={trimDuration}
                    onChange={(e) => setTrimDuration(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyTrim}
                disabled={trimming}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {trimming ? 'Processing FFmpeg Trim...' : 'Execute Precision Trim'}
              </button>
            </div>
          )}

          {/* Tab 2: Aspect Ratio Conversion Panel */}
          {activeTab === 'aspect' && (
            <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-brand-400" />
                  Aspect Ratio Conversion
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Convert dimensions dynamically with FFmpeg letterbox padding preserving video quality.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: '16:9', label: '16:9', sub: 'Landscape', icon: Monitor },
                  { id: '9:16', label: '9:16', sub: 'Reels / Shorts', icon: Smartphone },
                  { id: '1:1', label: '1:1', sub: 'Square', icon: Square },
                ].map((ar) => {
                  const Icon = ar.icon;
                  const isCurrent = project?.aspect_ratio === ar.id;
                  return (
                    <button
                      key={ar.id}
                      type="button"
                      disabled={convertingAspect}
                      onClick={() => handleResize(ar.id)}
                      className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 text-center transition-all ${
                        isCurrent
                          ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                          : 'bg-dark-surface border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-6 h-6 text-brand-400" />
                      <span className="font-bold text-xs">{ar.label}</span>
                      <span className="text-[10px] text-slate-400">{ar.sub}</span>
                    </button>
                  );
                })}
              </div>

              {convertingAspect && (
                <p className="text-center text-xs text-brand-400 animate-pulse">
                  Re-encoding video with FFmpeg scale filter...
                </p>
              )}
            </div>
          )}

          {/* Tab 3: Subtitles Panel */}
          {activeTab === 'subtitles' && (
            <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <SubtitlesIcon className="w-4 h-4 text-brand-400" />
                  Subtitles & Captioning
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Edit caption phrases and synchronize timing cues.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subtitle Text</label>
                <textarea
                  rows={4}
                  value={subtitleText}
                  onChange={(e) => setSubtitleText(e.target.value)}
                  placeholder="Enter video caption text..."
                  className="w-full p-3 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-xs leading-relaxed focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Position</label>
                  <select
                    value={subPosition}
                    onChange={(e) => setSubPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-surface border border-slate-700 text-white text-xs"
                  >
                    <option value="bottom">Bottom Overlay</option>
                    <option value="middle">Center Attention</option>
                    <option value="top">Top Header</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Font Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={subColor}
                      onChange={(e) => setSubColor(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-300">{subColor}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSubtitles}
                disabled={savingSubs}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingSubs ? 'Saving Subtitles...' : 'Save & Sync Subtitles'}
              </button>
            </div>
          )}

          {/* Tab 4: Poster Thumbnail Picker */}
          {activeTab === 'thumbnail' && (
            <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-brand-400" />
                  Thumbnail Frame Grabber
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Scrub the video player to your preferred frame, then capture it as the cover thumbnail.
                </p>
              </div>

              {/* Current Thumbnail Preview */}
              <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-800">
                {project?.thumbnail_url ? (
                  <img src={project.thumbnail_url} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    No thumbnail selected
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleCaptureThumbnail}
                disabled={capturingThumb}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-purple hover:bg-brand-violet text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {capturingThumb ? 'Capturing Frame...' : `Capture Frame at ${playerCurrentTime.toFixed(1)}s`}
              </button>
            </div>
          )}

          {/* Tab 5: Metadata Details */}
          {activeTab === 'details' && (
            <form onSubmit={handleSaveDetails} className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Save className="w-4 h-4 text-brand-400" />
                  Project Title & Metadata
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingDetails}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50"
              >
                {savingDetails ? 'Saving Changes...' : 'Save Project Details'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
