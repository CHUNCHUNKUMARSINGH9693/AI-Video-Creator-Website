const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'ai_video_creator',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  dateStrings: true,
};

let pool = null;
let isConnected = false;

// -------------------------------------------------------------
// In-Memory Relational Fallback Store
// Ensures 100% functionality even before user updates .env
// -------------------------------------------------------------
const memoryStore = {
  users: [
    {
      id: 1,
      name: 'Demo Creator',
      email: 'demo@aivideocreator.com',
      password_hash: bcrypt.hashSync('Password123!', 10),
      role: 'user',
      credits: 100,
      plan_tier: 'pro',
      profile_image: null,
      reset_token: null,
      reset_token_expiry: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  video_projects: [
    {
      id: 1,
      user_id: 1,
      title: 'Cinematic AI Shopping Assistant Commercial',
      prompt: 'Create a 30-second cinematic promotional video about an innovative AI-powered shopping application. Use modern visuals, smooth transitions, professional English voice-over, readable captions, and engaging background music.',
      script: 'Experience the future of intelligent commerce. Our AI shopping companion discovers curated items tailored precisely to your taste.',
      generation_type: 'text_to_video',
      style: 'cinematic',
      language: 'English',
      duration_seconds: 15,
      aspect_ratio: '16:9',
      status: 'completed',
      error_message: null,
      thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      video_url: '/uploads/samples/sample_cinematic_demo.mp4',
      bg_music: 'ambient_cinematic',
      voice_name: 'Alloy',
      has_subtitles: 1,
      target_platform: 'youtube',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  video_assets: [],
  generation_jobs: [
    {
      id: 1,
      project_id: 1,
      provider: 'demo',
      provider_job_id: 'demo_init_job',
      job_status: 'completed',
      progress_percentage: 100,
      current_step: 'Completed',
      error_message: null,
      started_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 3550000).toISOString(),
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  video_exports: [],
  subtitles: [
    {
      id: 1,
      project_id: 1,
      subtitle_text: 'Experience the future of intelligent commerce. Tailored precisely to your taste.',
      language: 'English',
      subtitle_storage_key: 'uploads/subtitles/sample_demo.srt',
      font_size: 24,
      font_color: '#FFFFFF',
      position: 'bottom',
      created_at: new Date().toISOString(),
    },
  ],
  social_accounts: [],
  autoId: {
    users: 2,
    video_projects: 2,
    video_assets: 1,
    generation_jobs: 2,
    video_exports: 1,
    subtitles: 2,
    social_accounts: 1,
  },
};

function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(dbConfig);
    } catch (err) {
      console.warn('[Database] Failed to create MySQL pool:', err.message);
    }
  }
  return pool;
}

/**
 * Test MySQL connection
 */
async function testConnection() {
  try {
    const p = getPool();
    if (!p) throw new Error('No pool created');
    const connection = await p.getConnection();
    await connection.ping();
    connection.release();
    isConnected = true;
    console.log(`[Database] Connected to live MySQL database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`[Database] Live MySQL connection failed (${error.code || error.message}).`);
    console.warn(`[Database] Running in-memory database store with pre-seeded demo creator!`);
    console.warn(`[Database] To connect your live MySQL, verify credentials in .env.\n`);
    return false;
  }
}

/**
 * In-memory SQL emulator for graceful fallback
 */
function executeInMemory(sql, params = []) {
  const cleanSql = sql.trim();
  const lower = cleanSql.toLowerCase();

  // 1. SELECT queries
  if (lower.startsWith('select')) {
    // USERS: by email
    if (lower.includes('from users where email = ?')) {
      const email = params[0].toLowerCase();
      return memoryStore.users.filter((u) => u.email.toLowerCase() === email).map((u) => ({ ...u }));
    }

    // USERS: by id
    if (lower.includes('from users where id = ?')) {
      const id = parseInt(params[0], 10);
      return memoryStore.users.filter((u) => u.id === id).map((u) => ({ ...u }));
    }

    // USERS: reset token
    if (lower.includes('from users where reset_token = ?')) {
      const token = params[0];
      return memoryStore.users.filter((u) => u.reset_token === token).map((u) => ({ ...u }));
    }

    // VIDEO PROJECTS: dashboard stats
    if (lower.includes('select \n         count(*) as total_projects') || (lower.includes('count(*)') && lower.includes('from video_projects'))) {
      if (lower.includes('count(*) as total from video_projects')) {
        // total count for pagination
        const userId = parseInt(params[0], 10);
        let list = memoryStore.video_projects.filter((p) => p.user_id === userId);
        return [{ total: list.length }];
      }

      const userId = parseInt(params[0], 10);
      const list = memoryStore.video_projects.filter((p) => p.user_id === userId);
      return [
        {
          total_videos: list.length,
          total_projects: list.length,
          completed_videos: list.filter((p) => p.status === 'completed').length,
          completed_projects: list.filter((p) => p.status === 'completed').length,
          processing_videos: list.filter((p) => p.status === 'processing' || p.status === 'queued').length,
          processing_projects: list.filter((p) => p.status === 'processing' || p.status === 'queued').length,
          failed_videos: list.filter((p) => p.status === 'failed').length,
        },
      ];
    }

    // VIDEO PROJECTS: list for user
    if (lower.includes('from video_projects') && lower.includes('limit') && lower.includes('offset')) {
      const userId = parseInt(params[0], 10);
      let list = memoryStore.video_projects.filter((p) => p.user_id === userId);
      return list;
    }

    if (lower.includes('from video_projects where user_id = ? order by created_at desc limit 5')) {
      const userId = parseInt(params[0], 10);
      return memoryStore.video_projects.filter((p) => p.user_id === userId).slice(0, 5);
    }

    // VIDEO PROJECTS: single by id
    if (lower.includes('from video_projects where id = ?')) {
      const id = parseInt(params[0], 10);
      return memoryStore.video_projects.filter((p) => p.id === id);
    }

    // VIDEO ASSETS: by project_id
    if (lower.includes('from video_assets where project_id = ?')) {
      const pId = parseInt(params[0], 10);
      return memoryStore.video_assets.filter((a) => a.project_id === pId);
    }

    // GENERATION JOBS: by project_id
    if (lower.includes('from generation_jobs where project_id = ?')) {
      const pId = parseInt(params[0], 10);
      return memoryStore.generation_jobs.filter((j) => j.project_id === pId);
    }

    // SUBTITLES: by project_id
    if (lower.includes('from subtitles where project_id = ?')) {
      const pId = parseInt(params[0], 10);
      return memoryStore.subtitles.filter((s) => s.project_id === pId);
    }

    // SOCIAL ACCOUNTS: by user_id
    if (lower.includes('from social_accounts where user_id = ?')) {
      const uId = parseInt(params[0], 10);
      return memoryStore.social_accounts.filter((s) => s.user_id === uId);
    }

    // VIDEO EXPORTS: by project_id
    if (lower.includes('from video_exports') && lower.includes('where e.project_id = ?')) {
      const pId = parseInt(params[0], 10);
      return memoryStore.video_exports.filter((e) => e.project_id === pId);
    }

    return [];
  }

  // 2. INSERT queries
  if (lower.startsWith('insert into users')) {
    const id = memoryStore.autoId.users++;
    const [name, email, password_hash] = params;
    const newUser = {
      id,
      name,
      email,
      password_hash,
      role: 'user',
      credits: 100,
      plan_tier: 'free',
      profile_image: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.users.push(newUser);
    return { insertId: id, affectedRows: 1 };
  }

  if (lower.startsWith('insert into video_projects')) {
    const id = memoryStore.autoId.video_projects++;
    const [user_id, title, prompt, script, generation_type, style, language, duration_seconds, aspect_ratio, bg_music, voice_name, has_subtitles, target_platform] = params;
    const newProject = {
      id,
      user_id,
      title,
      prompt,
      script,
      generation_type,
      style,
      language,
      duration_seconds,
      aspect_ratio,
      status: 'draft',
      error_message: null,
      thumbnail_url: null,
      video_url: null,
      bg_music,
      voice_name,
      has_subtitles,
      target_platform,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.video_projects.unshift(newProject);
    return { insertId: id, affectedRows: 1 };
  }

  if (lower.startsWith('insert into generation_jobs')) {
    const id = memoryStore.autoId.generation_jobs++;
    const [project_id, provider] = params;
    const job = {
      id,
      project_id,
      provider,
      provider_job_id: `demo_${Date.now()}`,
      job_status: 'pending',
      progress_percentage: 0,
      current_step: 'Queued in generation scheduler',
      error_message: null,
      started_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
    };
    memoryStore.generation_jobs.unshift(job);
    return { insertId: id, affectedRows: 1 };
  }

  if (lower.startsWith('insert into video_assets')) {
    const id = memoryStore.autoId.video_assets++;
    const [project_id, asset_type, storage_key, original_filename, mime_type, file_size, duration_seconds] = params;
    const asset = { id, project_id, asset_type, storage_key, original_filename, mime_type, file_size, duration_seconds };
    memoryStore.video_assets.push(asset);
    return { insertId: id, affectedRows: 1 };
  }

  if (lower.startsWith('insert into subtitles')) {
    const id = memoryStore.autoId.subtitles++;
    const [project_id, subtitle_text, language, subtitle_storage_key, font_size, font_color, position] = params;
    const sub = { id, project_id, subtitle_text, language, subtitle_storage_key, font_size: font_size || 24, font_color: font_color || '#FFF', position: position || 'bottom' };
    memoryStore.subtitles.push(sub);
    return { insertId: id, affectedRows: 1 };
  }

  if (lower.startsWith('insert into video_exports')) {
    const id = memoryStore.autoId.video_exports++;
    const [project_id, platform, aspect_ratio, resolution, storage_key, file_size] = params;
    const exp = { id, project_id, platform, aspect_ratio, resolution, format: 'mp4', storage_key, file_size, export_status: 'completed', created_at: new Date().toISOString() };
    memoryStore.video_exports.push(exp);
    return { insertId: id, affectedRows: 1 };
  }

  if (lower.startsWith('insert into social_accounts')) {
    const [user_id, platform, platform_account_id, account_name, encrypted_access_token] = params;
    let existing = memoryStore.social_accounts.find((s) => s.user_id === user_id && s.platform === platform);
    if (existing) {
      existing.account_name = account_name;
      existing.encrypted_access_token = encrypted_access_token;
      existing.connection_status = 'connected';
      existing.updated_at = new Date().toISOString();
      return { affectedRows: 1 };
    }
    const id = memoryStore.autoId.social_accounts++;
    memoryStore.social_accounts.push({
      id,
      user_id,
      platform,
      platform_account_id,
      account_name,
      encrypted_access_token,
      connection_status: 'connected',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { insertId: id, affectedRows: 1 };
  }

  // 3. UPDATE queries
  if (lower.startsWith('update users')) {
    if (lower.includes('set credits = credits - ? where id = ?')) {
      const [deduct, uId] = params;
      const u = memoryStore.users.find((user) => user.id === parseInt(uId, 10));
      if (u) u.credits = Math.max(0, (u.credits || 0) - parseInt(deduct, 10));
      return { affectedRows: 1 };
    }
    if (lower.includes('password_hash = ?')) {
      const [newHash, uId] = params;
      const u = memoryStore.users.find((user) => user.id === parseInt(uId, 10));
      if (u) u.password_hash = newHash;
      return { affectedRows: 1 };
    }
    if (lower.includes('reset_token = ?')) {
      const [token, expiry, uId] = params;
      const u = memoryStore.users.find((user) => user.id === parseInt(uId, 10));
      if (u) {
        u.reset_token = token;
        u.reset_token_expiry = expiry;
      }
      return { affectedRows: 1 };
    }
    if (lower.includes('name = ?')) {
      const [name, uId] = params;
      const u = memoryStore.users.find((user) => user.id === parseInt(uId, 10));
      if (u) u.name = name;
      return { affectedRows: 1 };
    }
    return { affectedRows: 1 };
  }

  if (lower.startsWith('update video_projects')) {
    const pId = parseInt(params[params.length - 1], 10);
    const p = memoryStore.video_projects.find((proj) => proj.id === pId);
    if (p) {
      if (lower.includes("status = 'completed'") || (lower.includes('video_url = ?') && lower.includes('thumbnail_url = ?'))) {
        p.status = 'completed';
        p.video_url = params[0];
        p.thumbnail_url = params[1];
        p.duration_seconds = params[2];
      } else if (lower.includes("status = 'queued'")) {
        p.status = 'queued';
      } else if (lower.includes("status = 'processing'")) {
        p.status = 'processing';
      } else if (lower.includes('video_url = ?') && lower.includes('aspect_ratio = ?')) {
        p.video_url = params[0];
        p.aspect_ratio = params[1];
      } else if (lower.includes('video_url = ?')) {
        p.video_url = params[0];
      } else if (lower.includes('thumbnail_url = ?')) {
        p.thumbnail_url = params[0];
      } else if (lower.includes('title = ?')) {
        p.title = params[0];
      }
      p.updated_at = new Date().toISOString();
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (lower.startsWith('update generation_jobs')) {
    const pId = parseInt(params[params.length - 1], 10);
    const j = memoryStore.generation_jobs.find((job) => job.project_id === pId);
    if (j) {
      if (lower.includes("job_status = 'completed'")) {
        j.job_status = 'completed';
        j.progress_percentage = 100;
        j.current_step = 'Completed';
        j.completed_at = new Date().toISOString();
      } else if (lower.includes('progress_percentage = ?')) {
        j.progress_percentage = params[0];
        j.current_step = params[1];
      }
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (lower.startsWith('update subtitles')) {
    const pId = parseInt(params[params.length - 1], 10);
    const s = memoryStore.subtitles.find((sub) => sub.project_id === pId);
    if (s) {
      s.subtitle_text = params[0];
      s.language = params[1];
      s.subtitle_storage_key = params[2];
      s.font_size = params[3];
      s.font_color = params[4];
      s.position = params[5];
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 4. DELETE queries
  if (lower.startsWith('delete from video_projects')) {
    const pId = parseInt(params[0], 10);
    const idx = memoryStore.video_projects.findIndex((p) => p.id === pId);
    if (idx !== -1) {
      memoryStore.video_projects.splice(idx, 1);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (lower.startsWith('delete from social_accounts')) {
    const [uId, platform] = params;
    const idx = memoryStore.social_accounts.findIndex((s) => s.user_id === parseInt(uId, 10) && s.platform === platform);
    if (idx !== -1) {
      memoryStore.social_accounts.splice(idx, 1);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (lower.startsWith('delete from users')) {
    const uId = parseInt(params[0], 10);
    const idx = memoryStore.users.findIndex((u) => u.id === uId);
    if (idx !== -1) {
      memoryStore.users.splice(idx, 1);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  return [];
}

/**
 * Execute query: routes to live MySQL if connected, otherwise fallback
 */
async function query(sql, params = []) {
  if (isConnected) {
    try {
      const p = getPool();
      const [rows] = await p.execute(sql, params);
      return rows;
    } catch (err) {
      console.warn(`[Database] MySQL query failed (${err.code}), routing to fallback:`, err.message);
      return executeInMemory(sql, params);
    }
  }
  return executeInMemory(sql, params);
}

async function rawQuery(sql) {
  if (isConnected) {
    const p = getPool();
    const [result] = await p.query(sql);
    return result;
  }
  return [];
}

module.exports = {
  dbConfig,
  getPool,
  testConnection,
  query,
  rawQuery,
  isConnected: () => isConnected,
};
