-- AlterTable
ALTER TABLE "render_jobs" ADD COLUMN     "narration_config" JSONB NOT NULL DEFAULT '{}';
