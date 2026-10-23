const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const host = process.env.MYSQL_HOST || 'localhost';
const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || 'root';
const database = process.env.MYSQL_DATABASE || 'ai_video_creator';

async function initDatabase() {
  console.log(`[InitDB] Connecting to MySQL at ${host}:${port} as ${user}...`);
  let connection;

  try {
    // 1. Connect without selecting database
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log(`[InitDB] Connected to MySQL server successfully.`);

    // 2. Create database
    console.log(`[InitDB] Ensuring database "${database}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${database}\`;`);

    // 3. Read schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`[InitDB] Executing schema.sql...`);

    // Execute the schema statements
    await connection.query(schemaSql);
    console.log(`[InitDB] Schema applied successfully!`);

    // Ensure new columns exist on video_projects if table already existed previously
    const projectColumnsToEnsure = [
      { name: 'audio_url', sql: 'ALTER TABLE `video_projects` ADD COLUMN `audio_url` VARCHAR(500) NULL DEFAULT NULL;' },
      { name: 'audio_storage_key', sql: 'ALTER TABLE `video_projects` ADD COLUMN `audio_storage_key` VARCHAR(500) NULL DEFAULT NULL;' },
      { name: 'audio_metadata', sql: 'ALTER TABLE `video_projects` ADD COLUMN `audio_metadata` JSON NULL DEFAULT NULL;' },
      { name: 'visual_theme', sql: 'ALTER TABLE `video_projects` ADD COLUMN `visual_theme` VARCHAR(100) NULL DEFAULT NULL;' },
      { name: 'transition_style', sql: "ALTER TABLE `video_projects` ADD COLUMN `transition_style` VARCHAR(50) NOT NULL DEFAULT 'fade';" },
      { name: 'motion_enabled', sql: 'ALTER TABLE `video_projects` ADD COLUMN `motion_enabled` TINYINT(1) NOT NULL DEFAULT 1;' },
      { name: 'render_settings', sql: 'ALTER TABLE `video_projects` ADD COLUMN `render_settings` JSON NULL DEFAULT NULL;' },
    ];

    for (const col of projectColumnsToEnsure) {
      try {
        const [colCheck] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'video_projects' AND COLUMN_NAME = ?`,
          [database, col.name]
        );
        if (colCheck.length === 0) {
          await connection.query(col.sql);
          console.log(`[InitDB] Added column ${col.name} to video_projects`);
        }
      } catch (e) {
        console.warn(`[InitDB] Column migration notice for ${col.name}:`, e.message);
      }
    }

    // Ensure new columns on generation_jobs
    const jobColumnsToEnsure = [
      { name: 'output_video_url', sql: 'ALTER TABLE `generation_jobs` ADD COLUMN `output_video_url` VARCHAR(500) NULL DEFAULT NULL;' },
      { name: 'cancellation_requested', sql: 'ALTER TABLE `generation_jobs` ADD COLUMN `cancellation_requested` TINYINT(1) NOT NULL DEFAULT 0;' },
      { name: 'render_settings', sql: 'ALTER TABLE `generation_jobs` ADD COLUMN `render_settings` JSON NULL DEFAULT NULL;' },
    ];

    for (const col of jobColumnsToEnsure) {
      try {
        const [colCheck] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'generation_jobs' AND COLUMN_NAME = ?`,
          [database, col.name]
        );
        if (colCheck.length === 0) {
          await connection.query(col.sql);
          console.log(`[InitDB] Added column ${col.name} to generation_jobs`);
        }
      } catch (e) {
        console.warn(`[InitDB] Job column migration notice for ${col.name}:`, e.message);
      }
    }

    // 4. Seed demo user if not existing
    const [existingUsers] = await connection.query('SELECT id, email FROM users WHERE email = ?', ['demo@aivideocreator.com']);
    if (existingUsers.length === 0) {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      await connection.query(
        `INSERT INTO users (name, email, password_hash, role, credits, plan_tier) VALUES (?, ?, ?, ?, ?, ?)`,
        ['Demo Creator', 'demo@aivideocreator.com', passwordHash, 'user', 100, 'pro']
      );
      console.log(`[InitDB] Seeded demo user: demo@aivideocreator.com / Password123!`);
    } else {
      console.log(`[InitDB] Demo user already exists.`);
    }

    console.log(`[InitDB] Database initialization complete!`);
    return true;
  } catch (error) {
    console.error(`[InitDB] Error initializing database:`, error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(`\n[InitDB] ACCESS DENIED: Please update MYSQL_PASSWORD in the .env file with your correct MySQL root password.\n`);
    }
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initDatabase().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = initDatabase;
