import React, { useState, useEffect } from 'react';
import {
  Download,
  Settings,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileVideo,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Modal from '../common/Modal';
import api from '../../services/api';

export default function DownloadVideoModal({
  isOpen,
  onClose,
  project,
  onDownloadStarted,
}) {
  const [resolution, setResolution] = useState('1080p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [customFilename, setCustomFilename] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // idle | preparing | downloading | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [showMobileTips, setShowMobileTips] = useState(false);
  const [mobileTab, setMobileTab] = useState('ios'); // ios | android

  // Initialize defaults from project
  useEffect(() => {
    if (project) {
      const initialAspect = project.aspect_ratio || '16:9';
      setAspectRatio(initialAspect);
      setResolution('1080p');

      const dateStr = project.created_at
        ? new Date(project.created_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const cleanTitle = (project.title || 'video')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 35) || 'video';

      const safeAspect = initialAspect.replace(':', 'x');
      setCustomFilename(`ai-video-creator-${cleanTitle}-${dateStr}-1080p-${safeAspect}.mp4`);
      setDownloadStatus('idle');
      setErrorMessage('');
    }
  }, [project, isOpen]);

  // Update suggested filename when resolution or aspect ratio changes
  const handleResolutionChange = (newRes) => {
    setResolution(newRes);
    updateSuggestedFilename(newRes, aspectRatio);
  };

  const handleAspectRatioChange = (newAspect) => {
    setAspectRatio(newAspect);
    updateSuggestedFilename(resolution, newAspect);
  };

  const updateSuggestedFilename = (res, aspect) => {
    if (!project) return;
    const dateStr = project.created_at
      ? new Date(project.created_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const cleanTitle = (project.title || 'video')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 35) || 'video';
    const safeAspect = aspect.replace(':', 'x');
    setCustomFilename(`ai-video-creator-${cleanTitle}-${dateStr}-${res}-${safeAspect}.mp4`);
  };

  // Execute download workflow
  const triggerDownload = async () => {
    if (!project || !project.id) return;

    try {
      setIsPreparing(true);
      setDownloadStatus('preparing');
      setErrorMessage('');

      // 1. Prepare export (FFmpeg adapts aspect/res if different from master)
      const prepRes = await api.post(`/videos/${project.id}/prepare-download`, {
        resolution,
        aspectRatio,
        format: 'mp4',
      });

      const data = prepRes.data;
      if (!data.success) {
        throw new Error(data.message || 'Failed to prepare video for download.');
      }

      setDownloadStatus('downloading');

      // 2. Build authenticated streaming download URL
      const token = localStorage.getItem('token');
      const filenameToUse = customFilename && customFilename.trim().length > 0
        ? customFilename.trim()
        : data.filename;

      const directUrl = `${data.downloadUrl}&token=${encodeURIComponent(token || '')}&filename=${encodeURIComponent(filenameToUse)}`;

      // 3. Trigger native browser stream download
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = directUrl;
      downloadAnchor.setAttribute('download', filenameToUse);
      downloadAnchor.style.display = 'none';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setDownloadStatus('success');
      if (onDownloadStarted) {
        onDownloadStarted({
          filename: filenameToUse,
          resolution,
          aspectRatio,
        });
      }
    } catch (err) {
      console.error('[DownloadVideoModal] Download error:', err);
      setDownloadStatus('error');
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to download video. Please try again.'
      );
    } finally {
      setIsPreparing(false);
    }
  };

  if (!project) return null;

  // Approximate dimensions label
  const getDimensionLabel = () => {
    if (resolution === '1080p') {
      if (aspectRatio === '16:9') return '1920 × 1080 (Full HD)';
      if (aspectRatio === '9:16') return '1080 × 1920 (Vertical)';
      return '1080 × 1080 (Square)';
    } else {
      if (aspectRatio === '16:9') return '1280 × 720 (HD)';
      if (aspectRatio === '9:16') return '720 × 1280 (Vertical)';
      return '720 × 720 (Square)';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Download Video to Local Device"
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Project Header Summary */}
        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {project.thumbnail_url ? (
              <img
                src={project.thumbnail_url}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileVideo className="w-6 h-6 text-brand-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white truncate">
              {project.title || 'Untitled Video Project'}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                MP4 Format
              </span>
              <span>&bull;</span>
              <span>{project.duration_seconds || 15}s duration</span>
              <span>&bull;</span>
              <span className="text-emerald-400 font-medium">Ready to Save</span>
            </div>
          </div>
        </div>

        {/* Download Settings Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-brand-400" />
              Export & Quality Settings
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              {getDimensionLabel()}
            </span>
          </div>

          {/* Resolution Selector */}
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
              Resolution
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleResolutionChange('1080p')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  resolution === '1080p'
                    ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">1080p Full HD</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-semibold">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Crisp high resolution for YouTube, Instagram, TV, and monitors.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleResolutionChange('720p')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  resolution === '720p'
                    ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">720p HD</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                    Compact
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Faster download and smaller size, optimal for mobile messaging.
                </p>
              </button>
            </div>
          </div>

          {/* Aspect Ratio Selector */}
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
              Aspect Ratio
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '16:9', label: '16:9 Landscape', icon: 'w-6 h-3.5', hint: 'YouTube, Web' },
                { id: '9:16', label: '9:16 Vertical', icon: 'w-3.5 h-6', hint: 'Reels, TikTok' },
                { id: '1:1', label: '1:1 Square', icon: 'w-4 h-4', hint: 'Instagram Feed' },
              ].map((aspect) => (
                <button
                  key={aspect.id}
                  type="button"
                  onClick={() => handleAspectRatioChange(aspect.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                    aspectRatio === aspect.id
                      ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm shadow-brand-500/20'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`border border-current rounded-sm ${aspect.icon} mx-auto opacity-80`}
                  />
                  <div>
                    <span className="text-xs font-semibold block">{aspect.label}</span>
                    <span className="text-[10px] text-slate-500 block">{aspect.hint}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Meaningful Filename Input */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              File Name on Local Device
            </label>
            <div className="relative">
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="ai-video-creator-filename.mp4"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-semibold uppercase">
                MP4
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Sanitized automatically for Windows, Mac, iOS, and Android file systems.
            </p>
          </div>
        </div>

        {/* Mobile Compatibility Accordion */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMobileTips(!showMobileTips)}
            className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:bg-slate-800/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              Mobile Device Instructions (iOS & Android)
            </span>
            {showMobileTips ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showMobileTips && (
            <div className="p-4 pt-1 border-t border-slate-800 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMobileTab('ios')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    mobileTab === 'ios'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  📱 iPhone / iPad (Safari)
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('android')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    mobileTab === 'android'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  🤖 Android (Chrome)
                </button>
              </div>

              {mobileTab === 'ios' ? (
                <div className="text-xs text-slate-300 space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <p className="font-semibold text-brand-300">Saving to Photos / Camera Roll:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Tap <strong>Download Video</strong> below.</li>
                    <li>When Safari asks <em>"Do you want to download...?"</em>, tap <strong>Download</strong>.</li>
                    <li>Tap the blue download icon (⬇️) in Safari's address bar.</li>
                    <li>Open the video and tap the <strong>Share</strong> button.</li>
                    <li>Tap <strong>Save Video</strong> to instantly move it to your Photos Camera Roll!</li>
                  </ol>
                </div>
              ) : (
                <div className="text-xs text-slate-300 space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <p className="font-semibold text-emerald-300">Saving to Android Storage:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Tap <strong>Download Video</strong> below.</li>
                    <li>Chrome will stream the file directly to your <strong>Downloads</strong> directory.</li>
                    <li>The video is immediately indexed and available in <strong>Google Photos</strong> or your default <strong>Gallery</strong> app.</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {downloadStatus === 'preparing' && (
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-indigo-200">Preparing customized video export...</p>
              <p className="text-indigo-300/80 mt-0.5">
                FFmpeg is optimizing resolution ({resolution}) and aspect ratio ({aspectRatio}) with universal playback compatibility.
              </p>
            </div>
          </div>
        )}

        {downloadStatus === 'downloading' && (
          <div className="p-3.5 rounded-xl bg-brand-950/40 border border-brand-500/30 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-brand-200">Starting streaming download...</p>
              <p className="text-brand-300/80 mt-0.5">
                Sending file directly to your browser's download manager.
              </p>
            </div>
          </div>
        )}

        {downloadStatus === 'success' && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-emerald-200">Download Initiated Successfully!</p>
              <p className="text-emerald-300/80 mt-0.5">
                The MP4 file has been sent to your browser. Check your <strong>Downloads</strong> folder or browser download tray.
              </p>
            </div>
          </div>
        )}

        {downloadStatus === 'error' && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-rose-200">Download Error</p>
              <p className="text-rose-300/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={triggerDownload}
            disabled={isPreparing || project.status !== 'completed'}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPreparing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Preparing Download...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download MP4 ({resolution})
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
