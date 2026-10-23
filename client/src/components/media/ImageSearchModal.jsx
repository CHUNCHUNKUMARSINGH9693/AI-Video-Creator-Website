import React, { useState, useEffect } from 'react';
import {
  Search,
  Upload,
  ExternalLink,
  Sparkles,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Info,
} from 'lucide-react';
import Modal from '../common/Modal';
import api from '../../services/api';

const QUICK_CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Technology', value: 'technology' },
  { label: 'Cinematic', value: 'cinematic' },
  { label: 'Business', value: 'business' },
  { label: 'Nature', value: 'nature' },
  { label: 'Urban', value: 'urban' },
  { label: 'Music', value: 'music' },
  { label: 'Fitness', value: 'fitness' },
  { label: 'Abstract', value: 'abstract' },
];

export default function ImageSearchModal({
  isOpen,
  onClose,
  onSelectImage,
  initialQuery = 'cinematic',
  title = 'Select Royalty-Free Image',
}) {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'upload'
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [orientation, setOrientation] = useState('landscape');
  const [page, setPage] = useState(1);
  const [images, setImages] = useState([]);
  const [providerInfo, setProviderInfo] = useState(null);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery || 'cinematic');
      fetchImages(initialQuery || 'cinematic', 1, selectedCategory, orientation);
    }
  }, [isOpen, initialQuery]);

  const fetchImages = async (queryStr, pageNum, categoryStr, orientStr) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/videos/images/search', {
        params: {
          query: queryStr || 'cinematic',
          page: pageNum,
          perPage: 16,
          orientation: orientStr,
          category: categoryStr,
        },
      });

      if (res.data.success) {
        setImages(res.data.images || []);
        setProviderInfo(res.data.provider);
        setLicenseInfo(res.data.licenseInfo);
      }
    } catch (err) {
      console.error('Failed to load images:', err);
      setError('Unable to load images. Please check connection or try another keyword.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchImages(searchQuery, 1, selectedCategory, orientation);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setPage(1);
    fetchImages(searchQuery, 1, cat, orientation);
  };

  const handleOrientationSelect = (orient) => {
    setOrientation(orient);
    setPage(1);
    fetchImages(searchQuery, 1, selectedCategory, orient);
  };

  const handleImagePicked = (img) => {
    onSelectImage({
      imageUrl: img.url,
      thumbnailUrl: img.thumbUrl || img.url,
      storageKey: null,
      sourceProvider: img.provider || 'pexels',
      sourceId: img.id,
      attributionAuthor: img.photographer,
      attributionUrl: img.photographerUrl,
      alt: img.alt,
    });
    onClose();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/videos/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        onSelectImage({
          imageUrl: res.data.imageUrl,
          thumbnailUrl: res.data.thumbnailUrl,
          storageKey: res.data.storageKey,
          sourceProvider: 'upload',
          sourceId: null,
          attributionAuthor: 'User Upload',
          attributionUrl: null,
          alt: file.name,
        });
        onClose();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload image. Please try a valid PNG, JPG, or WebP.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-4xl">
      <div className="space-y-5">
        {/* Tab Toggle: Stock Library vs Upload Own */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'search'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : 'bg-dark-card text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              Free Stock Images
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : 'bg-dark-card text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Your Own
            </button>
          </div>

          {/* Orientation filter for stock images */}
          {activeTab === 'search' && (
            <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-lg bg-dark-surface border border-slate-800 text-xs text-slate-400">
              <span className="px-1.5 font-medium">Ratio:</span>
              {['landscape', 'portrait', 'square'].map((o) => (
                <button
                  key={o}
                  onClick={() => handleOrientationSelect(o)}
                  className={`px-2 py-0.5 rounded capitalize ${
                    orientation === o ? 'bg-slate-700 text-white font-medium' : 'hover:text-slate-200'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'search' ? (
          <>
            {/* Search Input & Quick Filter */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search photographs (e.g., cyberpunk city, cozy coffee, athlete, mountains)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-surface border border-slate-800 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs sm:text-sm font-semibold transition-colors shrink-0"
              >
                Search
              </button>
            </form>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => handleCategorySelect(cat.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Provider and License Attribution Notice */}
            {licenseInfo && (
              <div className="p-3 rounded-xl bg-dark-surface/80 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 capitalize">
                      Source: {providerInfo?.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      {licenseInfo.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {licenseInfo.quotaNote} &bull; Photos are royalty-free. Photographer credits are automatically preserved.
                  </p>
                </div>
              </div>
            )}

            {/* Results Grid */}
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                <span className="text-xs">Searching real photographs...</span>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-rose-400 text-xs flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                <span>{error}</span>
              </div>
            ) : images.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs space-y-2">
                <ImageIcon className="w-8 h-8 mx-auto text-slate-600" />
                <p>No photographs found matching &quot;{searchQuery}&quot;.</p>
                <p className="text-slate-500">Try a different keyword or upload your own image.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
                {images.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => handleImagePicked(img)}
                    className="group relative rounded-xl overflow-hidden border border-slate-800 hover:border-brand-500/60 transition-all cursor-pointer bg-slate-900 aspect-video sm:aspect-square"
                  >
                    <img
                      src={img.thumbUrl || img.url}
                      alt={img.alt || 'Stock Photo'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                      <div className="flex justify-end">
                        <span className="p-1 rounded-full bg-brand-600 text-white shadow-md">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-white truncate">{img.photographer}</p>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400">
                          {img.provider}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Upload Your Own Image Tab */
          <div className="p-8 rounded-2xl bg-dark-surface/50 border border-dashed border-slate-700 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
              <Upload className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">Upload from your computer</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Supports JPEG, PNG, and WebP images. Recommended resolution 1920x1080 or higher.
              </p>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl max-w-sm mx-auto">
                {uploadError}
              </p>
            )}

            <div>
              <label
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-lg shadow-brand-600/25 transition-all ${
                  uploading ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading image...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Browse Photo File
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
