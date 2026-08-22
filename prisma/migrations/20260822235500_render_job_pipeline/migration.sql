-- CreateEnum
CREATE TYPE "render_pipeline" AS ENUM ('MOCK', 'LOCAL', 'EDITORIAL', 'ANIMATION');

-- AlterTable
ALTER TABLE "render_jobs" ADD COLUMN "pipeline" "render_pipeline";

-- Existing queued local work should resume through the real editorial pipeline.
-- Completed and failed history remains NULL because its original pipeline may be unknown.
UPDATE "render_jobs"
SET "pipeline" = 'EDITORIAL'
WHERE "status" = 'QUEUED' AND "pipeline" IS NULL;

-- CreateIndex
CREATE INDEX "render_jobs_status_pipeline_created_at_idx"
ON "render_jobs"("status", "pipeline", "created_at");
