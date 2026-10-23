/**
 * Free Image Search Service
 * Integrates officially supported APIs from Pexels and Unsplash,
 * with a high-definition curated royalty-free fallback library.
 * Keeps API keys secured on the backend and enforces license attributions and quota disclosures.
 */

const path = require('path');
const storage = require('./storageService');

// Curated royalty-free photo collection for instant, reliable fallback
const CURATED_LIBRARY = [
  // Technology & AI
  {
    id: 'curated_tech_1',
    category: 'technology',
    keywords: ['technology', 'ai', 'cyberpunk', 'future', 'robot', 'code', 'computer', 'digital', 'neon'],
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Alexandre Debiève',
    photographerUrl: 'https://unsplash.com/@alexandre_debieve',
    provider: 'unsplash',
    alt: 'High-tech illuminated circuit motherboard processing AI data',
  },
  {
    id: 'curated_tech_2',
    category: 'technology',
    keywords: ['technology', 'code', 'developer', 'screen', 'software', 'programming', 'matrix', 'data'],
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Florian Olivo',
    photographerUrl: 'https://unsplash.com/@florianolivo',
    provider: 'unsplash',
    alt: 'Lines of software code glowing on developer workstation',
  },
  {
    id: 'curated_tech_3',
    category: 'technology',
    keywords: ['virtual reality', 'metaverse', 'vr', 'future', 'gaming', 'headset', 'innovation', 'smart'],
    url: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Stephan Henning',
    photographerUrl: 'https://unsplash.com/@stephan_henning',
    provider: 'unsplash',
    alt: 'User experiencing immersive virtual reality simulation',
  },

  // Cinematic & Cyberpunk
  {
    id: 'curated_cine_1',
    category: 'cinematic',
    keywords: ['cinematic', 'cyberpunk', 'neon', 'night', 'city', 'tokyo', 'rain', 'lights', 'street'],
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Aleksandar Pasaric',
    photographerUrl: 'https://unsplash.com/@apasaric',
    provider: 'pexels',
    alt: 'Atmospheric neon-lit cyberpunk metropolis at dusk',
  },
  {
    id: 'curated_cine_2',
    category: 'cinematic',
    keywords: ['cinematic', 'dramatic', 'lighting', 'film', 'stage', 'spotlight', 'smoke', 'dark'],
    url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Mitch Lensink',
    photographerUrl: 'https://unsplash.com/@mitchlensink',
    provider: 'unsplash',
    alt: 'Dark cinematic mist with ambient volumetric rays',
  },

  // Business & Corporate
  {
    id: 'curated_biz_1',
    category: 'business',
    keywords: ['business', 'corporate', 'office', 'team', 'meeting', 'collaboration', 'strategy', 'finance'],
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Annie Spratt',
    photographerUrl: 'https://unsplash.com/@anniespratt',
    provider: 'unsplash',
    alt: 'Diverse corporate team collaborating at modern studio desk',
  },
  {
    id: 'curated_biz_2',
    category: 'business',
    keywords: ['business', 'finance', 'charts', 'analytics', 'growth', 'investment', 'money', 'stock'],
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Carlos Muza',
    photographerUrl: 'https://unsplash.com/@kmuza',
    provider: 'unsplash',
    alt: 'Financial analytics dashboard with metrics and trend line charts',
  },

  // Nature & Landscape
  {
    id: 'curated_nat_1',
    category: 'nature',
    keywords: ['nature', 'mountains', 'landscape', 'scenic', 'sunset', 'sky', 'adventure', 'outdoor'],
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Bailey Zindel',
    photographerUrl: 'https://unsplash.com/@baileyzindel',
    provider: 'unsplash',
    alt: 'Majestic alpine lake reflecting mountain peaks at golden hour',
  },
  {
    id: 'curated_nat_2',
    category: 'nature',
    keywords: ['nature', 'ocean', 'sea', 'waves', 'water', 'blue', 'beach', 'coastal', 'summer'],
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Sean Oulashin',
    photographerUrl: 'https://unsplash.com/@oulashin',
    provider: 'unsplash',
    alt: 'Turquoise ocean waves gently rolling onto tropical white sand',
  },

  // Urban & City Architecture
  {
    id: 'curated_urb_1',
    category: 'urban',
    keywords: ['urban', 'city', 'skyline', 'architecture', 'skyscraper', 'metropolis', 'downtown'],
    url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Sawyer Bengtson',
    photographerUrl: 'https://unsplash.com/@sawyerbengtson',
    provider: 'unsplash',
    alt: 'Illuminated city skyscrapers rising into twilight dusk',
  },

  // Music, Podcast & Audio
  {
    id: 'curated_aud_1',
    category: 'music',
    keywords: ['music', 'audio', 'headphones', 'sound', 'dj', 'producer', 'listening', 'beat', 'track'],
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Felipe Neves',
    photographerUrl: 'https://unsplash.com/@felipeneves',
    provider: 'unsplash',
    alt: 'Studio headphones resting on acoustic sound production console',
  },
  {
    id: 'curated_aud_2',
    category: 'music',
    keywords: ['podcast', 'microphone', 'broadcast', 'radio', 'speech', 'voice', 'recording', 'interview'],
    url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Jonathan Farber',
    photographerUrl: 'https://unsplash.com/@jonathanfarber',
    provider: 'unsplash',
    alt: 'Professional condenser microphone in acoustic podcast studio',
  },

  // Fitness & Energy
  {
    id: 'curated_fit_1',
    category: 'fitness',
    keywords: ['fitness', 'workout', 'gym', 'health', 'energy', 'athlete', 'training', 'power'],
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Sven Mieke',
    photographerUrl: 'https://unsplash.com/@svenmieke',
    provider: 'unsplash',
    alt: 'Gym training equipment with cinematic high-contrast lighting',
  },

  // Abstract & Minimalist
  {
    id: 'curated_abs_1',
    category: 'abstract',
    keywords: ['abstract', 'minimal', 'gradient', '3d', 'render', 'fluid', 'colors', 'art', 'texture'],
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'Milad Fakurian',
    photographerUrl: 'https://unsplash.com/@fakurian',
    provider: 'unsplash',
    alt: 'Elegant fluid glassmorphic waves with violet and amber gradients',
  },
  {
    id: 'curated_abs_2',
    category: 'abstract',
    keywords: ['space', 'galaxy', 'stars', 'cosmos', 'astronomy', 'nebula', 'universe', 'epic'],
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2400&q=90',
    width: 1920,
    height: 1080,
    photographer: 'NASA',
    photographerUrl: 'https://unsplash.com/@nasa',
    provider: 'unsplash',
    alt: 'Stunning view of planet Earth from orbit with deep starry cosmos',
  },
];

class ImageSearchService {
  constructor() {
    this.pexelsKey = process.env.PEXELS_API_KEY || null;
    this.unsplashKey = process.env.UNSPLASH_ACCESS_KEY || null;
  }

  /**
   * Search photos across Pexels, Unsplash, or the curated royalty-free index
   */
  async searchPhotos({ query = 'cinematic', page = 1, perPage = 12, orientation = 'landscape', category = '' }) {
    const cleanQuery = (query || 'cinematic').trim();
    const cleanPage = Math.max(1, parseInt(page, 10) || 1);
    const cleanPerPage = Math.min(30, Math.max(1, parseInt(perPage, 10) || 12));

    // 1. Try Pexels if API key is provided
    if (this.pexelsKey) {
      try {
        const pexelsResult = await this.searchPexels(cleanQuery, cleanPage, cleanPerPage, orientation);
        if (pexelsResult && pexelsResult.images && pexelsResult.images.length > 0) {
          return pexelsResult;
        }
      } catch (err) {
        console.warn('[ImageSearchService] Pexels API failed, falling back:', err.message);
      }
    }

    // 2. Try Unsplash if API key is provided
    if (this.unsplashKey) {
      try {
        const unsplashResult = await this.searchUnsplash(cleanQuery, cleanPage, cleanPerPage, orientation);
        if (unsplashResult && unsplashResult.images && unsplashResult.images.length > 0) {
          return unsplashResult;
        }
      } catch (err) {
        console.warn('[ImageSearchService] Unsplash API failed, falling back:', err.message);
      }
    }

    // 3. Fallback to Curated Royalty-Free Library
    return this.searchCuratedLibrary(cleanQuery, cleanPage, cleanPerPage, category);
  }

  /**
   * Search Pexels Official API
   */
  async searchPexels(query, page, perPage, orientation = 'landscape') {
    const pexelsOrientation = orientation === 'portrait' ? 'portrait' : orientation === 'square' ? 'square' : 'landscape';
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=${pexelsOrientation}`;

    const response = await fetch(url, {
      headers: {
        Authorization: this.pexelsKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const images = (data.photos || []).map((photo) => ({
      id: `pexels_${photo.id}`,
      url: photo.src?.large2x || photo.src?.large || photo.src?.original,
      thumbUrl: photo.src?.medium || photo.src?.small,
      fullUrl: photo.src?.original,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      provider: 'pexels',
      alt: photo.alt || query,
      license: 'Pexels License (Free to use, attribution appreciated)',
    }));

    return {
      success: true,
      provider: 'pexels',
      query,
      page,
      perPage,
      total: data.total_results || images.length,
      images,
      licenseInfo: {
        name: 'Pexels License',
        url: 'https://www.pexels.com/license/',
        attributionRequired: false,
        commercialUse: true,
        quotaNote: 'Standard Pexels rate limits: 200 requests/hour',
      },
    };
  }

  /**
   * Search Unsplash Official API
   */
  async searchUnsplash(query, page, perPage, orientation = 'landscape') {
    const unsplashOrientation = orientation === 'portrait' ? 'portrait' : orientation === 'square' ? 'squarish' : 'landscape';
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=${unsplashOrientation}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${this.unsplashKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const images = (data.results || []).map((photo) => ({
      id: `unsplash_${photo.id}`,
      url: photo.urls?.regular,
      thumbUrl: photo.urls?.small,
      fullUrl: photo.urls?.full,
      width: photo.width,
      height: photo.height,
      photographer: photo.user?.name || 'Unsplash Photographer',
      photographerUrl: photo.user?.links?.html || 'https://unsplash.com',
      provider: 'unsplash',
      alt: photo.alt_description || photo.description || query,
      license: 'Unsplash License (Free to use with attribution)',
    }));

    return {
      success: true,
      provider: 'unsplash',
      query,
      page,
      perPage,
      total: data.total || images.length,
      images,
      licenseInfo: {
        name: 'Unsplash License',
        url: 'https://unsplash.com/license',
        attributionRequired: true,
        commercialUse: true,
        quotaNote: 'Unsplash Demo rate limit: 50 requests/hour',
      },
    };
  }

  /**
   * Search Curated Royalty-Free Library
   */
  searchCuratedLibrary(query, page, perPage, categoryFilter = '') {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    let matches = CURATED_LIBRARY.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (terms.length === 0) return true;
      return (
        item.keywords.some((k) => terms.some((t) => k.includes(t) || t.includes(k))) ||
        terms.some((t) => item.alt.toLowerCase().includes(t)) ||
        terms.some((t) => item.category.toLowerCase().includes(t))
      );
    });

    // If no exact keyword match, return all high-definition curated items
    if (matches.length === 0) {
      matches = CURATED_LIBRARY;
    }

    const start = (page - 1) * perPage;
    const paginated = matches.slice(start, start + perPage);

    // If paginated is empty because page is high, wrap around to first page
    const finalItems = paginated.length > 0 ? paginated : matches.slice(0, perPage);

    return {
      success: true,
      provider: 'curated_library',
      query,
      page,
      perPage,
      total: matches.length,
      images: finalItems,
      licenseInfo: {
        name: 'Royalty-Free Curated Collection (Unsplash & Pexels Photographers)',
        url: 'https://unsplash.com/license',
        attributionRequired: true,
        commercialUse: true,
        quotaNote: 'Included unlimited royalty-free library. Add PEXELS_API_KEY in .env to expand live catalog.',
      },
    };
  }
}

module.exports = new ImageSearchService();
