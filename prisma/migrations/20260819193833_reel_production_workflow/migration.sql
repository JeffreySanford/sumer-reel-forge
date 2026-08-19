-- AlterTable
ALTER TABLE "reel_shots" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "reels" ADD COLUMN     "export_metadata" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "render_jobs" ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "finished_at" TIMESTAMPTZ(6),
ADD COLUMN     "started_at" TIMESTAMPTZ(6),
ADD COLUMN     "worker_id" TEXT;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_render_job_id_fkey" FOREIGN KEY ("render_job_id") REFERENCES "render_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
