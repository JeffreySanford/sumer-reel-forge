CREATE TYPE "animation_job_operation" AS ENUM (
  'PLAN',
  'PREFLIGHT',
  'GENERATE',
  'VERIFY',
  'RUN',
  'CANDIDATES'
);

CREATE TABLE "animation_jobs" (
  "id" UUID NOT NULL,
  "shot_number" INTEGER NOT NULL,
  "layer_id" TEXT,
  "operation" "animation_job_operation" NOT NULL,
  "status" "render_job_status" NOT NULL DEFAULT 'QUEUED',
  "notes" TEXT,
  "worker_id" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "heartbeat_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "animation_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "animation_jobs_shot_number_check" CHECK ("shot_number" > 0),
  CONSTRAINT "animation_jobs_layer_required_check" CHECK (
    "operation" IN ('PLAN', 'CANDIDATES') OR "layer_id" IS NOT NULL
  )
);

CREATE TABLE "animation_job_attempts" (
  "id" UUID NOT NULL,
  "animation_job_id" UUID NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "worker_id" TEXT NOT NULL,
  "status" "render_job_status" NOT NULL DEFAULT 'RUNNING',
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "heartbeat_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "error" TEXT,
  CONSTRAINT "animation_job_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "animation_job_attempts_animation_job_id_fkey"
    FOREIGN KEY ("animation_job_id") REFERENCES "animation_jobs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "animation_job_logs" (
  "id" UUID NOT NULL,
  "animation_job_id" UUID NOT NULL,
  "worker_id" TEXT,
  "level" "render_log_level" NOT NULL DEFAULT 'INFO',
  "stream" "render_log_stream" NOT NULL DEFAULT 'SYSTEM',
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "animation_job_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "animation_job_logs_animation_job_id_fkey"
    FOREIGN KEY ("animation_job_id") REFERENCES "animation_jobs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "animation_job_attempts_job_attempt_key"
  ON "animation_job_attempts"("animation_job_id", "attempt_number");
CREATE INDEX "animation_jobs_status_heartbeat_idx"
  ON "animation_jobs"("status", "heartbeat_at");
CREATE INDEX "animation_jobs_status_created_idx"
  ON "animation_jobs"("status", "created_at");
CREATE INDEX "animation_job_attempts_status_heartbeat_idx"
  ON "animation_job_attempts"("status", "heartbeat_at");
CREATE INDEX "animation_job_logs_job_created_idx"
  ON "animation_job_logs"("animation_job_id", "created_at");
