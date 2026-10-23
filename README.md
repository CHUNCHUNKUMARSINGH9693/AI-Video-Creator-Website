# AI Video Creator SaaS Platform 🚀

A modern, full-stack, responsive AI-assisted video creation and editing SaaS platform built with **React**, **Tailwind CSS**, **Node.js**, **Express.js**, and **MySQL**, featuring real server-side video rendering powered by **FFmpeg**.

---

## 🌟 Key Features

### 🎬 AI Video Generation Pipeline
- **Multiple Generation Methods**:
  - **Audio-to-Video (NEW)**: Upload any audio track (MP3, WAV, etc.); extract duration, sample rate, and waveform peaks; automatically match high-definition photography based on keywords or musical themes; synchronize scene durations; apply Ken Burns animations & subtitles; and compile into a polished MP4.
  - **Images-to-Video (NEW)**: Upload photos or search free stock libraries (Pexels / Unsplash); arrange in an editable multi-scene timeline; apply dynamic pan & zoom motion effects (`zoom_in`, `zoom_out`, `pan_left`, `pan_right`); add transitions, captions, and soundtracks; and render to 16:9, 9:16, or 1:1 MP4.
  - **Text-to-Video**: Turn creative prompts into styled animated MP4 videos.
  - **Script-to-Video**: Automatically breakdown full scripts into synchronized scenes.
  - **Image-to-Video**: Motion target animation from reference images.
  - **AI Scenes & Storyboards**: Dynamic multi-scene compositions.
  - **Voiceover Video**: Speech narration with animated visuals.
- **Pluggable AI & Video Engine**:
  - **High-Fidelity Slideshow & Animation Engine (Local FFmpeg)**: Generates genuine MP4 videos with color themes, harmonic synth audio soundtracks, Ken Burns pan/zoom, crossfade transitions, and synchronized captions out-of-the-box with **zero paid API requirements**!
  - **Replicate Adapter**: Stable Video Diffusion / AnimateDiff / Flux video models.
  - **Runway Adapter**: Runway Gen-2 / Gen-3 Alpha API.
  - **OpenAI Adapter**: Sora video model integration.
- **Asynchronous Background Job Queue**:
  - Live progress tracking (`0%` -> `15%` -> `75%` -> `100%`).
  - Active step indicators, error states, and real process cancellation support.
  - Zero fake mock progress — persisted in MySQL database.

### 🖼️ Free Image Integration (Pexels & Unsplash)
- **Official API Support**:
  - **Pexels API**: Full keyword query search, orientation filtering (landscape, portrait, square), photo size selection, and photographer attribution links.
  - **Unsplash API**: High-resolution photography search, orientation filtering, dynamic attribution badges, and referral tracking according to Unsplash API guidelines.
- **High-Definition Curated Fallback**: Built-in 15-category royalty-free photo library with direct photographer credits (Alexandre Debiève, Milad Fakurian, Daniel Jensen, etc.) available offline or without API keys.
- **Custom Image Upload**: Direct upload support for personal JPG, PNG, and WebM images with drag-and-drop.
- **Backend API Key Security**: All external API keys (`PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`) remain strictly protected on the backend server.
- **Licensing & Quotas**:
  - **Pexels**: 200 requests/hour and 20,000 requests/month under Pexels License. Free commercial use with attribution.
  - **Unsplash**: 50 requests/hour (demo) and 5,000 requests/hour (production) under Unsplash License. Free commercial use with photographer attribution.

### ✂️ Interactive Video Studio & Editor
- **Custom HTML5 Video Player**: Play/pause, scrubbing bar, timestamp display, volume control, aspect ratio containment, and fullscreen.
- **Precision Video Trimming**: Server-side FFmpeg start-offset and duration trimming.
- **Dynamic Aspect Ratio Conversion**: Switch between **16:9 Landscape**, **9:16 Vertical (Reels/Shorts)**, and **1:1 Square (Feed)**.
- **Automated Subtitles & Captions**: Real `.srt` file generation, editable caption cues, customizable position (bottom, center, top), font size, and color.
- **Poster Thumbnail Frame Grabber**: Capture any video timestamp as the project cover image.

### 📱 Multi-Platform Social Media Exporter
- **YouTube Presets**: 16:9 Landscape 1080p and 9:16 YouTube Shorts (<60s).
- **Instagram Presets**: 9:16 Instagram Reels and 1:1 Feed square format.
- **Facebook Presets**: 16:9 Widescreen video and 9:16 Stories/Reels.
- **Social Publishing Preparation**:
  - Automatic title, caption, and hashtag generator with 1-click copy.
  - AES-256-CBC encrypted token storage for YouTube, Instagram, and Facebook accounts.
  - Reliable download-and-publish workflow.

### 🔐 Authentication & Account Management
- Secure user registration and login with **bcrypt** password hashing and **JWT** session tokens.
- Protected client routes & backend authentication middleware.
- Profile management, password changing, forgot/reset password flow.
- Credit balance management (10 credits per generation, free editing).
- Permanent account deletion with database cascade.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, Axios, React Router DOM 7 |
| **Backend** | Node.js, Express.js, REST API, JWT, bcryptjs, Multer, Helmet, Rate Limiter |
| **Video Engine** | FFmpeg via `@ffmpeg-installer/ffmpeg`, `@ffprobe-installer/ffprobe` & `fluent-ffmpeg` |
| **Stock Image APIs** | Pexels REST API, Unsplash REST API, Curated Royalty-Free Library |
| **Database** | MySQL, `mysql2/promise`, InnoDB, Foreign Keys with Cascade |

---

## 📁 Project Structure

```text
ai-video-creator/
├── client/                     # React + Vite Frontend
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── common/         # Button, Modal, Badge, LoadingSpinner, ProtectedRoute
│       │   ├── media/          # ImageSearchModal (Pexels / Unsplash / Upload browser)
│       │   └── player/         # VideoPlayer (custom HTML5 player with scrub/fullscreen)
│       ├── context/            # AuthContext, ToastContext
│       ├── layouts/            # DashboardLayout, PublicLayout
│       ├── pages/              # AudioToVideo, ImageToVideo, Dashboard, Editor, Export, etc.
│       ├── services/           # Axios API instance with interceptors
│       ├── App.jsx             # React Router routing table
│       ├── index.css           # Glassmorphism, animations, Tailwind directives
│       └── main.jsx
├── server/                     # Express.js REST API Backend
│   ├── config/
│   │   └── database.js         # MySQL connection pool + resilient fallback engine
│   ├── controllers/            # auth, video, slideshow, generation, editor, export controllers
│   ├── jobs/
│   │   └── generationQueue.js  # Background job queue with real FFmpeg process tracking & cancel
│   ├── middleware/             # auth, upload (images, audio, videos), errorHandler
│   ├── routes/                 # authRoutes, videoRoutes, socialRoutes
│   ├── scripts/
│   │   ├── init-db.js          # MySQL database auto-migration script
│   │   ├── test-workflows.js   # Automated E2E verification for Audio-to-Video & Images-to-Video
│   │   └── test-e2e.js         # Core E2E verification test
│   ├── services/
│   │   ├── audioService.js     # FFprobe metadata, waveform generation, keyword/topic sync
│   │   ├── imageSearchService.js# Pexels & Unsplash API integration + curated stock library
│   │   ├── videoProcessor.js   # FFmpeg slideshow rendering, Ken Burns motion, resizing, trimming
│   │   └── storageService.js   # Local file storage (uploads/images, uploads/audio, uploads/generated)
│   ├── app.js                  # Express middleware, security, and routes
│   └── server.js               # Server entry point on port 5000
├── database/
│   └── schema.sql              # Normalized MySQL schema (9 relational tables including video_scenes)
├── uploads/                    # Physical file storage
│   ├── images/                 # Uploaded and cached stock images
│   ├── audio/                  # Uploaded audio tracks
│   ├── generated/              # Rendered MP4 output videos
│   ├── thumbnails/             # Video poster frame thumbnails
│   └── subtitles/              # Generated .SRT caption files
├── .env.example                # Environment variable configuration template
├── package.json                # Root package with concurrently scripts
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **npm** v9+
- **MySQL Server** (Service running on port 3306)

### 2. Installation
Clone the repository and install all dependencies:
```bash
# Install root, server, and client dependencies
npm run install:all
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update your configuration in `.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:5173

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=ai_video_creator

# Authentication
JWT_SECRET=your_secure_random_jwt_secret

# Video Generation Engine (demo, replicate, runway)
AI_VIDEO_PROVIDER=demo

# Optional: Free Stock Image API Keys (leave blank to use curated library)
PEXELS_API_KEY=
UNSPLASH_ACCESS_KEY=
```

### 4. Database Setup & Migration
Run the automated database initialization script:
```bash
npm run setup:db
```
This automatically:
1. Connects to your MySQL server.
2. Creates the `ai_video_creator` database if it doesn't already exist.
3. Executes `database/schema.sql` creating all 9 relational tables and indexes (including `video_scenes`).
4. Checks existing installations and safely migrates new columns.
5. Seeds a default creator account:
   - **Email**: `demo@aivideocreator.com`
   - **Password**: `Password123!`

### 5. Start the Application
Run both backend API (port 5000) and frontend client (port 5173) simultaneously:
```bash
npm run dev
```

Open your browser at **[http://localhost:5173](http://localhost:5173)**!

---

## 🧪 Testing & Verification

Run the dedicated test suites:
```bash
cd server
# 1. Audio-to-Video and Images-to-Video workflow tests
node scripts/test-workflows.js

# 2. Local Video Download & streaming export test suite
node scripts/test-download.js
```
The download test suite automatically verifies:
1. Token authentication via headers and URL query parameters (`?token=...`).
2. Direct HTTP streaming download with `Content-Type: video/mp4`, `Accept-Ranges: bytes`, and sanitized filenames.
3. Custom resolution & aspect ratio preparation (1080p, 720p, 16:9, 9:16, 1:1) with FFmpeg.
4. End-to-end Audio-to-Video generation and MP4 download with audio track sync.
5. End-to-end Images-to-Video generation and MP4 download with Ken Burns animation.
6. Validation of downloaded MP4 files with `ffprobe` ensuring zero-corruption playback.
7. Security checks (401 without auth, 404 for unknown projects).

---

## 📡 REST API Endpoints

### Slideshow & Media (`/api/videos`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/videos/audio/analyze` | Upload audio and extract duration, metadata, waveforms, and suggested scenes |
| `GET` | `/api/videos/images/search` | Search Pexels, Unsplash, or curated library by keyword and orientation |
| `POST` | `/api/videos/images/upload` | Upload custom image for scene timelines |
| `POST` | `/api/videos/audio-to-video` | Create Audio-to-Video project and enqueue FFmpeg render |
| `POST` | `/api/videos/image-to-video` | Create Images-to-Video project and enqueue FFmpeg render |
| `GET` | `/api/videos/:id/scenes` | Retrieve ordered scene timeline with motion and duration settings |
| `PUT` | `/api/videos/:id/scenes` | Update scene order, durations, motion effects, and captions |

### Video Download & Streaming (`/api/videos`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/videos/:id/prepare-download` | Prepare custom export (1080p, 720p, 16:9, 9:16, 1:1) with FFmpeg adaptation |
| `GET` | `/api/videos/:id/download` | Direct streaming download with `Content-Disposition: attachment`, token auth, and sanitized filenames |

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Login user and issue JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & stats |
| `PATCH` | `/api/auth/profile` | Update user display name & avatar |
| `POST` | `/api/auth/change-password` | Update account password |
| `POST` | `/api/auth/forgot-password` | Request password reset token |
| `POST` | `/api/auth/reset-password` | Set new password with reset token |
| `DELETE` | `/api/auth/account` | Permanently delete account and project data |

### Video Projects (`/api/videos`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/videos` | List user video projects (search, filter, sort, paginate) |
| `POST` | `/api/videos` | Create new video project draft |
| `GET` | `/api/videos/dashboard-stats` | Aggregated dashboard counts & recent projects |
| `GET` | `/api/videos/:id` | Fetch project details, assets, jobs, and subtitles |
| `PATCH` | `/api/videos/:id` | Update project title, script, and visual style |
| `DELETE` | `/api/videos/:id` | Delete project and remove files from storage |
| `POST` | `/api/videos/:id/duplicate` | Clone project for rapid iteration |

### Generation Pipeline
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/videos/:id/generate` | Enqueue video generation job |
| `GET` | `/api/videos/:id/status` | Poll real-time generation progress and step |
| `POST` | `/api/videos/:id/cancel` | Cancel in-progress generation job |

### Video Editor & Processing
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/videos/:id/trim` | Trim video start offset and duration |
| `POST` | `/api/videos/:id/resize` | Convert aspect ratio (16:9, 9:16, 1:1) |
| `POST` | `/api/videos/:id/thumbnail` | Capture frame at timestamp as thumbnail |
| `POST` | `/api/videos/:id/subtitles` | Save subtitle cues and generate .SRT |
| `POST` | `/api/videos/:id/assets` | Upload user images or audio clips (Multer) |

### Social Exports & Publishing
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/videos/:id/export` | Export for YouTube, Instagram, or Facebook |
| `GET` | `/api/social/accounts` | List connected social accounts |
| `POST` | `/api/social/:platform/connect` | Connect channel with encrypted token |
| `POST` | `/api/social/:platform/disconnect` | Disconnect social channel |
| `POST` | `/api/social/:platform/publish` | Prepare 1-click social package or API publish |

---

## 🔒 Security Best Practices
- **Password Protection**: Passwords salted and hashed with `bcryptjs`.
- **Relational Integrity**: Parameterized MySQL queries preventing SQL injection.
- **Encrypted Tokens**: Social OAuth tokens encrypted with AES-256-CBC at rest.
- **Headers & Rate Limiting**: `helmet` security headers and `express-rate-limit` against brute-force attacks.
- **Upload Restrictions**: Multer file type whitelisting (MP4, WebM, PNG, JPG, MP3, WAV) and 100MB file size ceiling.

---

## 📄 License
MIT License. Created for AI Video Creator SaaS Platform.

