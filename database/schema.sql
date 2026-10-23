-- ==========================================================
-- AI Video Creator Platform - Database Schema
-- Database: ai_video_creator
-- Engine: InnoDB
-- Charset: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `ai_video_creator`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `ai_video_creator`;

-- ----------------------------------------------------------
-- 1. Users Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `profile_image` VARCHAR(500) NULL DEFAULT NULL,
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `credits` INT UNSIGNED NOT NULL DEFAULT 100,
  `plan_tier` ENUM('free', 'pro', 'agency') NOT NULL DEFAULT 'free',
  `reset_token` VARCHAR(255) NULL DEFAULT NULL,
  `reset_token_expiry` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. Video Projects Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `video_projects` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `prompt` TEXT NOT NULL,
  `script` MEDIUMTEXT NULL DEFAULT NULL,
  `generation_type` ENUM('text_to_video', 'script_to_video', 'image_to_video', 'audio_to_video', 'ai_scenes', 'media_to_video', 'voiceover_video') NOT NULL DEFAULT 'text_to_video',
  `style` VARCHAR(80) NOT NULL DEFAULT 'cinematic',
  `language` VARCHAR(50) NOT NULL DEFAULT 'English',
  `duration_seconds` INT UNSIGNED NOT NULL DEFAULT 30,
  `aspect_ratio` ENUM('16:9', '9:16', '1:1') NOT NULL DEFAULT '16:9',
  `status` ENUM('draft', 'queued', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'draft',
  `error_message` TEXT NULL DEFAULT NULL,
  `thumbnail_url` VARCHAR(500) NULL DEFAULT NULL,
  `video_url` VARCHAR(500) NULL DEFAULT NULL,
  `bg_music` VARCHAR(100) NULL DEFAULT 'ambient_cinematic',
  `voice_name` VARCHAR(100) NULL DEFAULT 'Alloy',
  `has_subtitles` TINYINT(1) NOT NULL DEFAULT 1,
  `target_platform` ENUM('general', 'youtube', 'instagram', 'facebook') NOT NULL DEFAULT 'general',
  `audio_url` VARCHAR(500) NULL DEFAULT NULL,
  `audio_storage_key` VARCHAR(500) NULL DEFAULT NULL,
  `audio_metadata` JSON NULL DEFAULT NULL,
  `visual_theme` VARCHAR(100) NULL DEFAULT NULL,
  `transition_style` VARCHAR(50) NOT NULL DEFAULT 'fade',
  `motion_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `render_settings` JSON NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_video_projects_user_id` (`user_id`),
  INDEX `idx_video_projects_status` (`status`),
  INDEX `idx_video_projects_created_at` (`created_at`),
  CONSTRAINT `fk_video_projects_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. Video Assets Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `video_assets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `asset_type` ENUM('source_image', 'video_clip', 'audio_track', 'voiceover', 'subtitle', 'thumbnail', 'exported_video') NOT NULL,
  `storage_key` VARCHAR(500) NOT NULL,
  `original_filename` VARCHAR(255) NULL DEFAULT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `duration_seconds` DECIMAL(8, 2) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_video_assets_project_id` (`project_id`),
  INDEX `idx_video_assets_type` (`asset_type`),
  CONSTRAINT `fk_video_assets_project`
    FOREIGN KEY (`project_id`)
    REFERENCES `video_projects` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. Generation Jobs Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `generation_jobs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `provider` VARCHAR(80) NOT NULL DEFAULT 'demo',
  `provider_job_id` VARCHAR(255) NULL DEFAULT NULL,
  `job_status` ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  `progress_percentage` INT UNSIGNED NOT NULL DEFAULT 0,
  `current_step` VARCHAR(255) NULL DEFAULT 'Initializing generation pipeline',
  `error_message` TEXT NULL DEFAULT NULL,
  `output_video_url` VARCHAR(500) NULL DEFAULT NULL,
  `cancellation_requested` TINYINT(1) NOT NULL DEFAULT 0,
  `render_settings` JSON NULL DEFAULT NULL,
  `started_at` DATETIME NULL DEFAULT NULL,
  `completed_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_generation_jobs_project_id` (`project_id`),
  INDEX `idx_generation_jobs_status` (`job_status`),
  CONSTRAINT `fk_generation_jobs_project`
    FOREIGN KEY (`project_id`)
    REFERENCES `video_projects` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. Video Exports Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `video_exports` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `platform` ENUM('youtube', 'instagram', 'facebook', 'generic') NOT NULL,
  `aspect_ratio` ENUM('16:9', '9:16', '1:1') NOT NULL DEFAULT '16:9',
  `resolution` VARCHAR(50) NOT NULL DEFAULT '1080p',
  `format` VARCHAR(20) NOT NULL DEFAULT 'mp4',
  `storage_key` VARCHAR(500) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `export_status` ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_video_exports_project_id` (`project_id`),
  INDEX `idx_video_exports_platform` (`platform`),
  CONSTRAINT `fk_video_exports_project`
    FOREIGN KEY (`project_id`)
    REFERENCES `video_projects` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. Voiceovers Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `voiceovers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `text_content` MEDIUMTEXT NOT NULL,
  `voice_name` VARCHAR(100) NOT NULL DEFAULT 'Alloy',
  `language` VARCHAR(50) NOT NULL DEFAULT 'English',
  `audio_storage_key` VARCHAR(500) NULL DEFAULT NULL,
  `duration_seconds` DECIMAL(8, 2) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_voiceovers_project_id` (`project_id`),
  CONSTRAINT `fk_voiceovers_project`
    FOREIGN KEY (`project_id`)
    REFERENCES `video_projects` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. Subtitles Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subtitles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `subtitle_text` MEDIUMTEXT NOT NULL,
  `language` VARCHAR(50) NOT NULL DEFAULT 'English',
  `subtitle_storage_key` VARCHAR(500) NULL DEFAULT NULL,
  `font_size` INT UNSIGNED NOT NULL DEFAULT 24,
  `font_color` VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
  `position` ENUM('bottom', 'middle', 'top') NOT NULL DEFAULT 'bottom',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_subtitles_project_id` (`project_id`),
  CONSTRAINT `fk_subtitles_project`
    FOREIGN KEY (`project_id`)
    REFERENCES `video_projects` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. Social Accounts Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `social_accounts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `platform` ENUM('youtube', 'instagram', 'facebook') NOT NULL,
  `platform_account_id` VARCHAR(191) NULL DEFAULT NULL,
  `account_name` VARCHAR(191) NULL DEFAULT NULL,
  `encrypted_access_token` TEXT NULL DEFAULT NULL,
  `token_expiry` DATETIME NULL DEFAULT NULL,
  `connection_status` ENUM('connected', 'disconnected', 'expired') NOT NULL DEFAULT 'disconnected',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_platform` (`user_id`, `platform`),
  INDEX `idx_social_accounts_user` (`user_id`),
  CONSTRAINT `fk_social_accounts_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 9. Video Scenes Table (Audio-to-Video & Image-to-Video)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `video_scenes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `scene_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `image_url` VARCHAR(500) NOT NULL,
  `thumbnail_url` VARCHAR(500) NULL DEFAULT NULL,
  `storage_key` VARCHAR(500) NULL DEFAULT NULL,
  `source_provider` ENUM('upload', 'pexels', 'unsplash', 'ai') NOT NULL DEFAULT 'upload',
  `source_id` VARCHAR(100) NULL DEFAULT NULL,
  `attribution_author` VARCHAR(255) NULL DEFAULT NULL,
  `attribution_url` VARCHAR(500) NULL DEFAULT NULL,
  `duration_seconds` DECIMAL(6, 2) NOT NULL DEFAULT 4.00,
  `transition_style` VARCHAR(50) NOT NULL DEFAULT 'fade',
  `transition_duration` DECIMAL(4, 2) NOT NULL DEFAULT 0.50,
  `motion_effect` VARCHAR(50) NOT NULL DEFAULT 'ken_burns_zoom_in',
  `caption_text` TEXT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_video_scenes_project_id` (`project_id`),
  INDEX `idx_video_scenes_order` (`project_id`, `scene_order`),
  CONSTRAINT `fk_video_scenes_project`
    FOREIGN KEY (`project_id`)
    REFERENCES `video_projects` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
