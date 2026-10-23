import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Share2,
  Download,
  Copy,
  Check,
  Film,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import VideoPlayer from '../components/common/VideoPlayer';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ExportSocialPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Platform selection
  const [platform, setPlatform] = useState('youtube'); // 'youtube', 'instagram', 'facebook'
  const [presetType, setPresetType] = useState('landscape'); // varies by platform
  const [resolution, setResolution] = useState('1080p');

  // Generated export state
  const [exporting, setExporting] = useState(false);
  const [currentExport, setCurrentExport] = useState(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);

  // Publishing simulation
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await api.get(`/videos/${id}`);
        if (res.data.success) {
          setProject(res.data.project);
        }
      } catch (err) {
        toast.error('Failed to load project.');
        navigate('/library');
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id, navigate, toast]);

  // Handle Generating Export
  const handleGenerateExport = async () => {
    setExporting(true);
    setPublishResult(null);

    try {
      const res = await api.post(`/videos/${id}/export`, {
        platform,
        presetType,
        resolution,
      });

      if (res.data.success) {
        setCurrentExport(res.data.export);
        toast.success(`Export prepared for ${platform.toUpperCase()}!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export generation failed.');
    } finally {
      setExporting(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'caption') {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } else {
      setCopiedHashtags(true);
      setTimeout(() => setCopiedHashtags(false), 2000);
    }
    toast.info('Copied to clipboard!');
  };

  // Publish / Schedule check
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await api.post(`/social/${platform}/publish`, {
        projectId: id,
        title: project?.title,
        description: currentExport?.suggestedCaption || project?.prompt,
        tags: currentExport?.suggestedHashtags,
      });

      setPublishResult(res.data);
      if (res.data.mode === 'manual_ready') {
        toast.info('1-Click Publishing Package Ready!');
      } else {
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publishing check failed.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Preparing export studio..." className="h-96" />;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
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
              <Share2 className="w-5 h-5 text-brand-400" />
              Social Media Export & Publishing
            </h1>
            <p className="text-xs text-slate-400">
              Project: <span className="text-white font-medium">{project?.title}</span>
            </p>
          </div>
        </div>

        <Link
          to={`/editor/${id}`}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          Return to Editor
        </Link>
      </div>

      {/* Main Grid: Settings & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Preset Configuration (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Platform Switcher */}
          <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Choose Social Platform</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'youtube', label: 'YouTube' },
                { id: 'instagram', label: 'Instagram' },
                { id: 'facebook', label: 'Facebook' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPlatform(p.id);
                    setPresetType(p.id === 'instagram' ? 'reels' : 'landscape');
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    platform === p.id
                      ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-600/20'
                      : 'bg-dark-surface border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Specific Formats */}
          <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {platform.toUpperCase()} Preset Format
            </h2>

            {platform === 'youtube' && (
              <div className="space-y-2.5">
                {[
                  { id: 'landscape', label: '16:9 Landscape Video', desc: 'Full HD 1920x1080 standard video' },
                  { id: 'shorts', label: '9:16 YouTube Shorts', desc: 'Vertical video up to 60 seconds' },
                ].map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => setPresetType(pr.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-start justify-between transition-all ${
                      presetType === pr.id
                        ? 'bg-brand-600/15 border-brand-500 text-white'
                        : 'bg-dark-surface border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{pr.label}</p>
                      <p className="text-[11px] text-slate-400">{pr.desc}</p>
                    </div>
                    {presetType === pr.id && <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {platform === 'instagram' && (
              <div className="space-y-2.5">
                {[
                  { id: 'reels', label: '9:16 Instagram Reels', desc: 'High-impact vertical video (1080x1920)' },
                  { id: 'square', label: '1:1 Feed Post', desc: 'Square format for grid feed (1080x1080)' },
                ].map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => setPresetType(pr.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-start justify-between transition-all ${
                      presetType === pr.id
                        ? 'bg-brand-600/15 border-brand-500 text-white'
                        : 'bg-dark-surface border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{pr.label}</p>
                      <p className="text-[11px] text-slate-400">{pr.desc}</p>
                    </div>
                    {presetType === pr.id && <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {platform === 'facebook' && (
              <div className="space-y-2.5">
                {[
                  { id: 'landscape', label: '16:9 Facebook Video', desc: 'Standard widescreen feed format' },
                  { id: 'vertical', label: '9:16 Facebook Reels', desc: 'Mobile-first vertical format' },
                ].map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => setPresetType(pr.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-start justify-between transition-all ${
                      presetType === pr.id
                        ? 'bg-brand-600/15 border-brand-500 text-white'
                        : 'bg-dark-surface border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{pr.label}</p>
                      <p className="text-[11px] text-slate-400">{pr.desc}</p>
                    </div>
                    {presetType === pr.id && <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resolution & Quality */}
          <div className="p-6 rounded-3xl bg-dark-card border border-dark-border space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolution & Bitrate</h2>
            <div className="grid grid-cols-3 gap-2">
              {['720p', '1080p', '4K'].map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                    resolution === res
                      ? 'bg-brand-purple text-white border-brand-purple'
                      : 'bg-dark-surface border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Encoded using H.264 video codec and AAC stereo audio for maximum cross-platform compatibility.
            </p>
          </div>

          {/* Trigger Export Button */}
          <button
            type="button"
            onClick={handleGenerateExport}
            disabled={exporting}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-purple to-brand-pink hover:from-brand-500 hover:to-brand-violet text-white font-bold text-sm shadow-xl shadow-brand-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {exporting ? 'Processing FFmpeg Export...' : `Prepare ${platform.toUpperCase()} Export`}
          </button>
        </div>

        {/* Right Column: Video Preview & Social Metadata Package (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Video Preview */}
          <div className="p-4 rounded-3xl bg-dark-card border border-dark-border">
            <VideoPlayer
              src={currentExport ? currentExport.downloadUrl : project?.video_url}
              poster={project?.thumbnail_url}
              aspectRatio={
                presetType === 'shorts' || presetType === 'reels' || presetType === 'vertical'
                  ? '9:16'
                  : presetType === 'square'
                  ? '1:1'
                  : '16:9'
              }
              className="w-full"
            />
          </div>

          {/* Social Package Content (Captions, Hashtags, Publishing) */}
          {currentExport ? (
            <div className="p-6 rounded-3xl bg-dark-card border border-brand-500/40 shadow-xl space-y-5 animate-scale-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Export Ready ({(currentExport.fileSize / 1024 / 1024).toFixed(2)} MB)
                </span>
                <a
                  href={`/api/videos/${id}/download?export_id=${currentExport.id}&token=${encodeURIComponent(localStorage.getItem('token') || '')}&filename=${encodeURIComponent(`ai-video-creator-${(project?.title || 'video').replace(/[^a-z0-9_-]/gi, '_')}-${platform}-${presetType}.mp4`)}`}
                  download={`ai-video-creator-${(project?.title || 'video').replace(/[^a-z0-9_-]/gi, '_')}-${platform}-${presetType}.mp4`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download MP4
                </a>
              </div>

              {/* Suggested Caption */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-300">Suggested Title & Caption</span>
                  <button
                    onClick={() => copyToClipboard(currentExport.suggestedCaption, 'caption')}
                    className="flex items-center gap-1 text-[11px] text-brand-400 hover:underline"
                  >
                    {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCaption ? 'Copied' : 'Copy Caption'}
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-dark-surface border border-slate-800 text-xs text-slate-200 whitespace-pre-line font-sans leading-relaxed">
                  {currentExport.suggestedCaption}
                </div>
              </div>

              {/* Suggested Hashtags */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-300">Generated Hashtags</span>
                  <button
                    onClick={() => copyToClipboard(currentExport.suggestedHashtags, 'tags')}
                    className="flex items-center gap-1 text-[11px] text-brand-400 hover:underline"
                  >
                    {copiedHashtags ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedHashtags ? 'Copied' : 'Copy Hashtags'}
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-dark-surface border border-slate-800 text-xs text-brand-300 font-mono">
                  {currentExport.suggestedHashtags}
                </div>
              </div>

              {/* Direct Publish / 1-Click Package Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4 text-brand-400" />
                  {publishing ? 'Checking Account Authorization...' : `Publish / Prepare for ${platform.toUpperCase()}`}
                </button>
              </div>

              {publishResult && (
                <div className="p-4 rounded-xl bg-dark-surface border border-brand-500/30 text-xs space-y-2">
                  <p className="font-semibold text-white">{publishResult.message}</p>
                  {publishResult.publishingPackage && (
                    <div className="p-3 bg-black/40 rounded-lg text-slate-300 whitespace-pre-line font-mono text-[11px]">
                      {publishResult.publishingPackage.instructions}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-dark-card border border-dashed border-dark-border text-center space-y-3 text-slate-400">
              <Film className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs">
                Select your target format on the left and click <strong>Prepare Export</strong> to convert dimensions, optimize encoding, and generate tailored social hashtags.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
