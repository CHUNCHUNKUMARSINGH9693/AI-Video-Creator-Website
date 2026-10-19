# AI Video Creator SaaS Platform 🚀

A modern, full-stack, responsive AI-assisted video creation and editing SaaS platform built with **React**, **Tailwind CSS**, **Node.js**, **Express.js**, and **MySQL**, featuring real server-side video rendering powered by **FFmpeg**.

---

## 🌟 Key Features

### 🎬 AI Video Generation Pipeline
- **Multiple Generation Methods**:
  - **Text-to-Video**: Turn creative prompts into styled animated MP4 videos.
  - **Script-to-Video**: Automatically breakdown full scripts into synchronized scenes.
  - **Image-to-Video**: Motion target animation from reference images.
  - **AI Scenes & Storyboards**: Dynamic multi-scene compositions.
  - **Voiceover Video**: Speech narration with animated visuals.
- **Pluggable AI Provider Adapter**:
  - **High-Fidelity Demo Engine (Local FFmpeg)**: Generates genuine MP4 videos with color themes, harmonic synth audio soundtracks, and synchronized captions out-of-the-box with **zero paid API requirements**!
  - **Replicate Adapter**: Stable Video Diffusion / AnimateDiff / Flux video models.
  - **Runway Adapter**: Runway Gen-2 / Gen-3 Alpha API.
  - **OpenAI Adapter**: Sora video model integration.
- **Asynchronous Background Job Queue**:
  - Live progress tracking (`0%` -> `20%` -> `80%` -> `100%`).
  - Active step indicators, error states, and cancellation support.
  - Zero fake mock progress — persisted in MySQL database.

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
| **Video Engine** | FFmpeg via `@ffmpeg-installer/ffmpeg` & `fluent-ffmpeg` |
| **Database** | MySQL, `mysql2/promise`, InnoDB, Foreign Keys with Cascade |

---

## 📁 Project Structure

```text
ai-video-creator/
├── client/                     # React + Vite Frontend
│   ├── public/
│   └── src/
│       ├── components/         # VideoPlayer, Modal, Badge, LoadingSpinner, ProtectedRoute
│       ├── context/            # AuthContext, ToastContext
│       ├── layouts/            # DashboardLayout, PublicLayout
│       ├── pages/              # Landing, Dashboard, Create, Editor, Library, Export, etc.
│       ├── services/           # Axios API instance with interceptors
│       ├── App.jsx             # React Router routing table
│       ├── index.css           # Glassmorphism, animations, Tailwind directives
│       └── main.jsx
├── server/                     # Express.js REST API Backend
│   ├── config/
│   │   └── database.js         # MySQL connection pool + resilient fallback engine
│   ├── controllers/            # auth, video, generation, editor, export, social controllers
│   ├── jobs/
│   │   └── generationQueue.js  # Background job queue with progress polling
│   ├── middleware/             # auth, upload, errorHandler
│   ├── routes/                 # authRoutes, videoRoutes, socialRoutes
│   ├── scripts/
│   │   ├── init-db.js          # MySQL database auto-migration script
│   │   ├── generate-sample.js  # FFmpeg sample video generator
│   │   └── test-e2e.js         # Automated 7-step verification test
│   ├── services/
│   │   ├── aiVideoProvider.js  # Pluggable provider adapter (Demo, Replicate, Runway)
│   │   ├── storageService.js   # Local file & path management
│   │   └── videoProcessor.js   # FFmpeg trimming, resizing, audio mixing & thumbnails
│   ├── app.js                  # Express middleware, security, and routes
│   └── server.js               # Server entry point on port 5000
├── database/
│   └── schema.sql              # Normalized MySQL schema (8 relational tables)
├── uploads/                    # Generated videos, thumbnails, audio, subtitles
│   ├── generated/
│   ├── thumbnails/
│   ├── subtitles/
│   └── samples/
├── .env.example                # Environment variable configuration template
├── .gitignore
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
Update your MySQL credentials in `.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:5173

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=ai_video_creator

JWT_SECRET=your_secure_random_jwt_secret
AI_VIDEO_PROVIDER=demo
```

### 4. Database Setup
Run the automated database initialization script:
```bash
npm run setup:db
```
This automatically:
1. Connects to your MySQL server.
2. Creates the `ai_video_creator` database if it doesn't already exist.
3. Executes `database/schema.sql` creating all 8 relational tables and indexes.
4. Seeds a default creator account:
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

Run the end-to-end automated verification script:
```bash
cd server
node scripts/test-e2e.js
```

This verifies:
1. `GET /api/health` — API health check.
2. `POST /api/auth/login` — Authentication and JWT token issuance.
3. `GET /api/videos/dashboard-stats` — Aggregated video metrics.
4. `POST /api/videos` — Video project creation.
5. `POST /api/videos/:id/generate` — Real FFmpeg MP4 generation with progress tracking.
6. `POST /api/videos/:id/trim` — Server-side FFmpeg precision trimming.
7. `POST /api/videos/:id/export` — Multi-platform YouTube 16:9 and Instagram Reels 9:16 presets.

---

## 📡 REST API Endpoints

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
| `GET` | `/api/videos/:id/download` | Direct file download stream |
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
- **Upload Restrictions**: Multer file type whitelisting (MP4, WebM, PNG, JPG, MP3) and 100MB file size ceiling.

---

## 📄 License
MIT License. Created for AI Video Creator SaaS Platform.
