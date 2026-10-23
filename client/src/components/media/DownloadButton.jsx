import React, { useState } from 'react';
import { Download, Settings, Loader2, Check, ChevronDown } from 'lucide-react';
import DownloadVideoModal from './DownloadVideoModal';

export default function DownloadButton({
  project,
  isRendering = false,
  renderingProgress = 0,
  className = '',
  buttonSize = 'md', // sm | md | lg
  showSettingsButton = true,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickDownloading, setIsQuickDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Quick 1-click master download
  const handleQuickDownload = async (e) => {
    e.stopPropagation();
    if (!project || project.status !== 'completed' || !project.video_url) return;

    try {
      setIsQuickDownloading(true);
      const token = localStorage.getItem('token');
      const dateStr = project.created_at
        ? new Date(project.created_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const cleanTitle = (project.title || 'video')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 35) || 'video';
      const safeAspect = (project.aspect_ratio || '16:9').replace(':', 'x');
      const filename = `ai-video-creator-${cleanTitle}-${dateStr}-1080p-${safeAspect}.mp4`;

      const downloadUrl = `/api/videos/${project.id}/download?resolution=1080p&aspect_ratio=${encodeURIComponent(
        project.aspect_ratio || '16:9'
      )}&token=${encodeURIComponent(token || '')}&filename=${encodeURIComponent(filename)}`;

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Quick download error:', err);
    } finally {
      setIsQuickDownloading(false);
    }
  };

  const isReady = project && project.status === 'completed' && Boolean(project.video_url);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-xs rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-xl',
  }[buttonSize] || 'px-4 py-2.5 text-xs rounded-xl';

  return (
    <>
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {/* Main Download Button */}
        <button
          type="button"
          onClick={handleQuickDownload}
          disabled={!isReady || isQuickDownloading}
          title={
            !isReady
              ? `Video is still rendering (${renderingProgress}%). Download will be ready shortly.`
              : 'Save MP4 video directly to your local device'
          }
          className={`${sizeClasses} font-semibold flex items-center gap-2 shadow-lg transition-all ${
            isReady
              ? 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-brand-600/25 active:scale-95'
              : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
          }`}
        >
          {isRendering || (!isReady && project?.status === 'processing') ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span>Rendering {renderingProgress > 0 ? `${renderingProgress}%` : ''}</span>
            </>
          ) : isQuickDownloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Starting Download...</span>
            </>
          ) : downloadSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Downloaded!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download MP4</span>
            </>
          )}
        </button>

        {/* Settings Button */}
        {showSettingsButton && isReady && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Download Settings (Resolution, Aspect Ratio, Filename & Mobile Tips)"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Settings Modal */}
      {isModalOpen && (
        <DownloadVideoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          project={project}
        />
      )}
    </>
  );
}
