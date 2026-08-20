-- CreateEnum
CREATE TYPE "reel_production_status" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'RENDERING', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "asset_review_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "render_log_level" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "render_log_stream" AS ENUM ('STDOUT', 'STDERR', 'SYSTEM');

-- AlterTable
ALTER TABLE "generated_assets" ADD COLUMN     "review_notes" TEXT,
ADD COLUMN     "review_status" "asset_review_status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "shot_number" INTEGER;

-- AlterTable
ALTER TABLE "reels" ADD COLUMN     "production_status" "reel_production_status" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "render_job_attempts" (
    "id" UUID NOT NULL,
    "render_job_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "worker_id" TEXT NOT NULL,
    "status" "render_job_status" NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeat_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "error" TEXT,

    CONSTRAINT "render_job_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_job_logs" (
    "id" UUID NOT NULL,
    "render_job_id" UUID NOT NULL,
    "worker_id" TEXT,
    "level" "render_log_level" NOT NULL DEFAULT 'INFO',
    "stream" "render_log_stream" NOT NULL DEFAULT 'SYSTEM',
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "render_job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "render_job_attempts_status_heartbeat_at_idx" ON "render_job_attempts"("status", "heartbeat_at");

-- CreateIndex
CREATE UNIQUE INDEX "render_job_attempts_render_job_id_attempt_number_key" ON "render_job_attempts"("render_job_id", "attempt_number");

-- CreateIndex
CREATE INDEX "render_job_logs_render_job_id_created_at_idx" ON "render_job_logs"("render_job_id", "created_at");

-- CreateIndex
CREATE INDEX "generated_assets_render_job_id_shot_number_idx" ON "generated_assets"("render_job_id", "shot_number");

-- CreateIndex
CREATE INDEX "generated_assets_review_status_idx" ON "generated_assets"("review_status");

-- AddForeignKey
ALTER TABLE "render_job_attempts" ADD CONSTRAINT "render_job_attempts_render_job_id_fkey" FOREIGN KEY ("render_job_id") REFERENCES "render_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_job_logs" ADD CONSTRAINT "render_job_logs_render_job_id_fkey" FOREIGN KEY ("render_job_id") REFERENCES "render_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
