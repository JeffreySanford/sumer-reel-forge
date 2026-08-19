-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "document_state" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "render_job_mode" AS ENUM ('STORYBOARD', 'DRAFT_VIDEO', 'FINAL_VIDEO');

-- CreateEnum
CREATE TYPE "render_job_status" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "studio_projects" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_documents" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "source_ref" TEXT,
    "status" "document_state" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "source_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL,
    "source_document_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reels" (
    "id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "source_section" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "visual_core" TEXT NOT NULL,
    "logline" TEXT,
    "narration" TEXT,
    "target_duration_seconds" INTEGER NOT NULL DEFAULT 60,
    "music_direction" TEXT,
    "voice_direction" TEXT,
    "platform_notes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "on_screen_text" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_shots" (
    "id" UUID NOT NULL,
    "reel_id" UUID NOT NULL,
    "shot_number" INTEGER NOT NULL,
    "timecode" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "visual" TEXT NOT NULL,
    "motion" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_shots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_assets" (
    "id" UUID NOT NULL,
    "render_job_id" UUID,
    "asset_type" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "checksum" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_jobs" (
    "id" UUID NOT NULL,
    "reel_id" UUID NOT NULL,
    "episode_id" INTEGER NOT NULL,
    "mode" "render_job_mode" NOT NULL,
    "status" "render_job_status" NOT NULL DEFAULT 'QUEUED',
    "voice" TEXT,
    "notes" TEXT,
    "heartbeat_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "render_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_projects_slug_key" ON "studio_projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_source_document_id_chapter_number_key" ON "chapters"("source_document_id", "chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "reels_chapter_id_episode_number_key" ON "reels"("chapter_id", "episode_number");

-- CreateIndex
CREATE UNIQUE INDEX "reel_shots_reel_id_shot_number_key" ON "reel_shots"("reel_id", "shot_number");

-- CreateIndex
CREATE INDEX "render_jobs_status_heartbeat_at_idx" ON "render_jobs"("status", "heartbeat_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_shots" ADD CONSTRAINT "reel_shots_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
