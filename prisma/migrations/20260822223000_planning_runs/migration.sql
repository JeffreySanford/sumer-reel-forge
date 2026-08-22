-- CreateEnum
CREATE TYPE "planning_run_status" AS ENUM ('PROPOSAL_READY', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'FAILED');

-- CreateTable
CREATE TABLE "planning_runs" (
    "id" UUID NOT NULL,
    "reel_id" UUID NOT NULL,
    "shot_number" INTEGER NOT NULL,
    "shot_key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "prompt_version" TEXT NOT NULL DEFAULT 'shot-plan-v1',
    "status" "planning_run_status" NOT NULL DEFAULT 'PROPOSAL_READY',
    "input_hash" TEXT NOT NULL,
    "output_hash" TEXT NOT NULL,
    "working_hash" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "proposal" JSONB NOT NULL,
    "working_proposal" JSONB NOT NULL,
    "duration_ms" INTEGER,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" TEXT,
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "planning_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planning_runs_reel_id_shot_number_created_at_idx" ON "planning_runs"("reel_id", "shot_number", "created_at");

-- CreateIndex
CREATE INDEX "planning_runs_status_created_at_idx" ON "planning_runs"("status", "created_at");

-- AddForeignKey
ALTER TABLE "planning_runs" ADD CONSTRAINT "planning_runs_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
