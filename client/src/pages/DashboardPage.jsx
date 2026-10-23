import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Film,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Play,
  ArrowRight,
  Zap,
  Share2,
  Sliders,
  ChevronRight,
  TrendingUp,
  Music,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_videos: 0,
    completed_videos: 0,
    processing_videos: 0,
    failed_videos: 0,
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [quickPrompt, setQuickPrompt] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get('/videos/dashboard-stats');
        if (res.data.success) {
          setStats(res.data.stats);
          setRecentProjects(res.data.recentProjects || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const handleQuickCreate = (e) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    navigate('/create', { state: { initialPrompt: quickPrompt } });
  };

  if (loading) {
    return <LoadingSpinner text="Loading your creator dashboard..." className="h-96" />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-gradient-to-r from-brand-900/40 via-dark-surface to-dark-card border border-brand-500/20 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold border border-brand-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
              Welcome back, {user?.name || 'Creator'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Ready to generate your next engaging video? Choose one of our specialized workflows or start from a prompt.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/create"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-purple hover:from-brand-500 hover:to-brand-violet text-white font-semibold text-xs sm:text-sm shadow-lg shadow-brand-600/25 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
            <Link
              to="/pricing"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-dark-card hover:bg-slate-800 text-slate-200 font-semibold text-xs sm:text-sm border border-dark-border transition-colors"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              {user?.credits ?? 100} Credits
            </Link>
          </div>
        </div>

        {/* Decorative blur backdrop */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -z-0" />
      </div>

      {/* Featured Core Studios: Audio-to-Video & Images-to-Video */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h2 className="text-base font-bold text-white">Video Creation Studios</h2>
          </div>
          <span className="text-xs text-slate-400">Powered by Free Stock APIs & FFmpeg</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option 1: Audio to Video */}
          <div className="group relative rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-indigo-950/70 via-dark-card to-dark-surface border border-indigo-500/30 hover:border-brand-500/60 shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Music className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
                  Audio & Speech Sync
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-heading font-extrabold text-white group-hover:text-brand-300 transition-colors">
                  Audio to Video
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Upload any MP3, podcast, speech, or music file. The system extracts duration, detects spoken topics, pairs them with real royalty-free photographs from Pexels & Unsplash, and renders an auto-synced MP4 video.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-dark-bg/80 border border-slate-700/80 text-slate-300">
                  Waveform Visualizer
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-dark-bg/80 border border-slate-700/80 text-slate-300">
                  Free Pexels & Unsplash
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-dark-bg/80 border border-slate-700/80 text-slate-300">
                  Auto Scene Matching
                </span>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to="/create/audio-to-video"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                Launch Audio to Video
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Ambient background glow */}
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Option 2: Images to Video */}
          <div className="group relative rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-rose-950/70 via-dark-card to-dark-surface border border-rose-500/30 hover:border-brand-500/60 shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-semibold">
                  Ken Burns Pan & Zoom
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-heading font-extrabold text-white group-hover:text-rose-300 transition-colors">
                  Images to Video
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Turn single or multiple photographs into high-definition animated videos with cinematic Ken Burns camera motions, custom scene durations, smooth crossfades, text captions, and synchronized soundtrack.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-dark-bg/80 border border-slate-700/80 text-slate-300">
                  Multi-Image Timeline
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-dark-bg/80 border border-slate-700/80 text-slate-300">
                  Ken Burns Pan & Zoom
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-dark-bg/80 border border-slate-700/80 text-slate-300">
                  Music Sync
                </span>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to="/create/image-to-video"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
              >
                Launch Images to Video
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Ambient background glow */}
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            label: 'Total Videos',
            value: stats.total_videos,
            icon: Film,
            color: 'text-brand-400',
            bg: 'bg-brand-500/10',
            border: 'border-brand-500/20',
          },
          {
            label: 'Completed',
            value: stats.completed_videos,
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
          },
          {
            label: 'In Progress',
            value: stats.processing_videos,
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
          },
          {
            label: 'Credits Left',
            value: user?.credits ?? 100,
            icon: Zap,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
          },
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="p-5 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">{m.label}</p>
                <p className="text-2xl sm:text-3xl font-heading font-bold text-white mt-1">{m.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${m.bg} ${m.border} border flex items-center justify-center ${m.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Prompt Creation Box */}
      <div className="p-6 rounded-2xl glass-card border border-dark-border">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Instant Video Generator</h2>
        </div>
        <form onSubmit={handleQuickCreate} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            placeholder="e.g., 30-second cinematic teaser for a futuristic cybernetic watch..."
            className="w-full flex-1 px-4 py-3 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            Launch Studio
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Main Grid: Recent Projects + Onboarding Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-brand-400" />
              Recent Projects
            </h2>
            <Link to="/library" className="text-xs font-semibold text-brand-400 hover:underline flex items-center gap-1">
              View All ({stats.total_videos})
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            /* Empty State */
            <div className="p-10 rounded-2xl bg-dark-card border border-dashed border-dark-border text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
                <Film className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">No videos created yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Start by typing an idea into the generator or click create video to configure your first cinematic project.
                </p>
              </div>
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/20"
              >
                <Plus className="w-4 h-4" />
                Create First Video
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentProjects.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl bg-dark-card border border-dark-border overflow-hidden hover:border-slate-700 transition-all group"
                >
                  {/* Thumbnail / Video Preview */}
                  <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                    {p.thumbnail_url ? (
                      <img
                        src={p.thumbnail_url}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600 gap-1">
                        <Film className="w-8 h-8" />
                        <span className="text-[10px] uppercase font-semibold">Ready to Generate</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <Badge
                        variant={
                          p.status === 'completed'
                            ? 'success'
                            : p.status === 'processing'
                            ? 'warning'
                            : p.status === 'failed'
                            ? 'danger'
                            : 'default'
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>

                    {/* Duration badge */}
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white">
                      {p.duration_seconds}s &bull; {p.aspect_ratio}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-white truncate" title={p.title}>
                      {p.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                      <span className="text-slate-400 capitalize">{p.style} style</span>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/editor/${p.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/export/${p.id}`}
                          className="px-2.5 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 text-xs font-medium border border-brand-500/30 transition-colors"
                        >
                          Export
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Onboarding Checklist & Creator Tips (1 Col) */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-dark-card border border-dark-border space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Creator Quickstart
            </h2>

            <div className="space-y-3">
              {[
                {
                  title: 'Generate your first video',
                  desc: 'Pick a prompt and render an MP4 with audio',
                  done: stats.total_videos > 0,
                  link: '/create',
                },
                {
                  title: 'Experiment with Trimming & Subtitles',
                  desc: 'Use the built-in timeline editor',
                  done: stats.completed_videos > 0,
                  link: '/library',
                },
                {
                  title: 'Prepare YouTube or Reel presets',
                  desc: 'Export with matching dimensions and hashtags',
                  done: false,
                  link: '/library',
                },
                {
                  title: 'Connect your Social Accounts',
                  desc: 'Setup YouTube, Instagram, and Facebook',
                  done: false,
                  link: '/social',
                },
              ].map((step, idx) => (
                <Link
                  key={idx}
                  to={step.link}
                  className="block p-3 rounded-xl bg-dark-surface/60 hover:bg-dark-surface border border-slate-800/80 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${step.done ? 'text-slate-400 line-through' : 'text-slate-200 group-hover:text-white'}`}>
                        {step.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{step.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Tip Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-tr from-brand-900/20 to-purple-900/20 border border-brand-500/20 space-y-2">
            <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider">Pro Creator Tip</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Videos formatted in 9:16 vertical with burned captions generate 2.5x more watch-time on Instagram Reels and YouTube Shorts!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
