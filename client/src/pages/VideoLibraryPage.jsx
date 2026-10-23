import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Film,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  Plus,
  Play,
  Edit,
  Copy,
  Trash2,
  Download,
  Share2,
  Calendar,
  Clock,
  Eye,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DownloadButton from '../components/media/DownloadButton';

export default function VideoLibraryPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Preview Modal
  const [previewProject, setPreviewProject] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/videos', {
        params: {
          page,
          limit: 12,
          search,
          status: statusFilter,
          style: styleFilter,
          sort: sortOrder,
        },
      });

      if (res.data.success) {
        setProjects(res.data.projects);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load projects library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [page, statusFilter, styleFilter, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProjects();
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/videos/${id}/duplicate`);
      if (res.data.success) {
        toast.success('Project duplicated!');
        fetchProjects();
      }
    } catch (e) {
      toast.error('Failed to duplicate project.');
    }
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/videos/${projectToDelete.id}`);
      if (res.data.success) {
        toast.success('Project deleted.');
        setDeleteModalOpen(false);
        setProjectToDelete(null);
        fetchProjects();
      }
    } catch (e) {
      toast.error('Failed to delete project.');
    } finally {
      setDeleting(false);
    }
  };

  const confirmRename = async (e) => {
    e.preventDefault();
    if (!projectToRename || !newTitle.trim()) return;
    setRenaming(true);
    try {
      const res = await api.patch(`/videos/${projectToRename.id}`, { title: newTitle.trim() });
      if (res.data.success) {
        toast.success('Project renamed.');
        setRenameModalOpen(false);
        setProjectToRename(null);
        fetchProjects();
      }
    } catch (e) {
      toast.error('Failed to rename project.');
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white flex items-center gap-2.5">
            <Film className="w-6 h-6 text-brand-400" />
            Video Projects Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage, edit, export, and download all your AI creations in one place.
          </p>
        </div>

        <Link
          to="/create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-brand-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Video
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-dark-card border border-dark-border flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or prompt..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-dark-surface border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="draft">Draft</option>
            <option value="failed">Failed</option>
          </select>

          {/* Style filter */}
          <select
            value={styleFilter}
            onChange={(e) => {
              setStyleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-dark-surface border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Styles</option>
            <option value="cinematic">Cinematic</option>
            <option value="anime">Anime</option>
            <option value="3d_render">3D Render</option>
            <option value="cyberpunk">Cyberpunk</option>
            <option value="photorealistic">Photorealistic</option>
          </select>

          {/* Sort order */}
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-dark-surface border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title A-Z</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-dark-surface rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner text="Loading video projects..." className="h-64" />
      ) : projects.length === 0 ? (
        <div className="p-12 rounded-3xl bg-dark-card border border-dashed border-dark-border text-center space-y-4">
          <Film className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-white">No projects found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search filters or create a new video project.
          </p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            Create Video
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              className="rounded-3xl bg-dark-card border border-dark-border overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Thumbnail Container */}
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
                      <span className="text-[10px] uppercase font-semibold">No Preview</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
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

                  {/* Duration and Aspect overlay */}
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white">
                    {p.duration_seconds}s &bull; {p.aspect_ratio}
                  </div>

                  {/* Quick Play overlay button */}
                  {p.video_url && (
                    <button
                      onClick={() => setPreviewProject(p)}
                      className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-brand-600/90 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110"
                    >
                      <Play className="w-5 h-5 ml-0.5 fill-white" />
                    </button>
                  )}
                </div>

                {/* Card Info */}
                <div className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white truncate" title={p.title}>
                      {p.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {p.prompt}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                    <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {p.style}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/editor/${p.id}`}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Open Video Editor"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/export/${p.id}`}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                    title="Social Export Studio"
                  >
                    <Share2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDuplicate(p.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Duplicate Project"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setProjectToRename(p);
                      setNewTitle(p.title);
                      setRenameModalOpen(true);
                    }}
                    className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300 hover:text-white"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      setProjectToDelete(p);
                      setDeleteModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-2xl bg-dark-card border border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-surface border-b border-dark-border text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Project</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Ratio</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white max-w-xs truncate">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-900 overflow-hidden shrink-0">
                          {p.thumbnail_url ? (
                            <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-5 h-5 m-2.5 text-slate-600" />
                          )}
                        </div>
                        <span className="truncate">{p.title}</span>
                      </div>
                    </td>
                    <td className="p-4">
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
                    </td>
                    <td className="p-4 font-mono">{p.duration_seconds}s</td>
                    <td className="p-4">{p.aspect_ratio}</td>
                    <td className="p-4">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/editor/${p.id}`}
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:text-white"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/export/${p.id}`}
                          className="px-2.5 py-1 rounded bg-brand-600/20 text-brand-300 hover:bg-brand-600/30"
                        >
                          Export
                        </Link>
                        <button
                          onClick={() => {
                            setProjectToDelete(p);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 rounded-lg bg-dark-card border border-dark-border text-xs text-slate-300 hover:text-white disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 rounded-lg bg-dark-card border border-dark-border text-xs text-slate-300 hover:text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Project Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to permanently delete project{' '}
            <strong className="text-white">"{projectToDelete?.title}"</strong>?
          </p>
          <p className="text-xs text-rose-400">
            This will permanently remove the video file, subtitles, and export assets from storage.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Project'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="Rename Video Project"
      >
        <form onSubmit={confirmRename} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Project Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-dark-surface border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRenameModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={renaming}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
            >
              {renaming ? 'Saving...' : 'Save Title'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Play Preview Modal */}
      <Modal
        isOpen={!!previewProject}
        onClose={() => setPreviewProject(null)}
        title={previewProject?.title || 'Video Preview'}
        maxWidth="max-w-3xl"
      >
        {previewProject && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-black">
              <video
                src={previewProject.video_url}
                controls
                autoPlay
                className="w-full max-h-[65vh] object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>{previewProject.aspect_ratio} &bull; {previewProject.duration_seconds}s</span>
              <div className="flex items-center gap-2">
                <Link
                  to={`/editor/${previewProject.id}`}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-medium"
                >
                  Open Editor
                </Link>
                <DownloadButton project={previewProject} buttonSize="sm" />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
