import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from './prisma.service';
import type {
  AnimationJobOperation,
  ClaimAnimationJobDto,
  CreateAnimationJobDto,
  CreateAnimationJobLogDto,
  UpdateAnimationJobStatusDto,
} from './animation-job.dto';

export interface AnimationJobRecord {
  id: string;
  shot: number;
  layer: string | null;
  operation: AnimationJobOperation;
  status: 'queued' | 'running' | 'complete' | 'failed';
  notes: string | null;
  workerId: string | null;
  attemptCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  heartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnimationJobAttemptRecord {
  id: string;
  animationJobId: string;
  attemptNumber: number;
  workerId: string;
  status: AnimationJobRecord['status'];
  startedAt: string;
  heartbeatAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

export interface AnimationJobLogRecord {
  id: string;
  animationJobId: string;
  workerId: string | null;
  level: 'info' | 'warn' | 'error';
  stream: 'stdout' | 'stderr' | 'system';
  message: string;
  createdAt: string;
}

type JobRow = {
  id: string;
  shot_number: number;
  layer_id: string | null;
  operation: string;
  status: string;
  notes: string | null;
  worker_id: string | null;
  attempt_count: number;
  started_at: Date | null;
  finished_at: Date | null;
  heartbeat_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type AttemptRow = {
  id: string;
  animation_job_id: string;
  attempt_number: number;
  worker_id: string;
  status: string;
  started_at: Date;
  heartbeat_at: Date | null;
  finished_at: Date | null;
  error: string | null;
};

type LogRow = {
  id: string;
  animation_job_id: string;
  worker_id: string | null;
  level: string;
  stream: string;
  message: string;
  created_at: Date;
};

@Injectable()
export class AnimationJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(request: CreateAnimationJobDto): Promise<AnimationJobRecord> {
    assertLayerRequirement(request.operation, request.layer);
    const id = randomUUID();
    const rows = await this.prisma.$queryRawUnsafe<JobRow[]>(
      `INSERT INTO animation_jobs
        (id, shot_number, layer_id, operation, notes)
       VALUES ($1::uuid, $2, $3, $4::animation_job_operation, $5)
       RETURNING *`,
      id,
      request.shot,
      request.layer ?? null,
      toDbOperation(request.operation),
      request.notes ?? null,
    );
    return mapJob(requiredRow(rows, id));
  }

  async list(): Promise<AnimationJobRecord[]> {
    const rows = await this.prisma.$queryRawUnsafe<JobRow[]>(
      'SELECT * FROM animation_jobs ORDER BY created_at DESC LIMIT 200',
    );
    return rows.map(mapJob);
  }

  async get(jobId: string): Promise<AnimationJobRecord> {
    const rows = await this.prisma.$queryRawUnsafe<JobRow[]>(
      'SELECT * FROM animation_jobs WHERE id = $1::uuid',
      jobId,
    );
    if (!rows[0]) throw new NotFoundException(`Animation job ${jobId} was not found.`);
    return mapJob(rows[0]);
  }

  async claim(request: ClaimAnimationJobDto): Promise<AnimationJobRecord | null> {
    const jobId = randomUUID();
    const rows = await this.prisma.$queryRawUnsafe<JobRow[]>(
      `WITH next_job AS (
         SELECT id FROM animation_jobs
         WHERE status = 'QUEUED'::render_job_status
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE animation_jobs j
       SET status = 'RUNNING'::render_job_status,
           worker_id = $1,
           attempt_count = attempt_count + 1,
           started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
           heartbeat_at = CURRENT_TIMESTAMP,
           finished_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       FROM next_job
       WHERE j.id = next_job.id
       RETURNING j.*`,
      request.workerId,
    );
    const row = rows[0];
    if (!row) return null;
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO animation_job_attempts
        (id, animation_job_id, attempt_number, worker_id, status, heartbeat_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, 'RUNNING'::render_job_status, CURRENT_TIMESTAMP)`,
      jobId,
      row.id,
      row.attempt_count,
      request.workerId,
    );
    return mapJob(row);
  }

  async heartbeat(jobId: string, notes?: string): Promise<AnimationJobRecord> {
    const rows = await this.prisma.$queryRawUnsafe<JobRow[]>(
      `UPDATE animation_jobs
       SET heartbeat_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP,
           notes = COALESCE($2, notes)
       WHERE id = $1::uuid AND status = 'RUNNING'::render_job_status
       RETURNING *`,
      jobId,
      notes ?? null,
    );
    const row = rows[0];
    if (!row) throw new BadRequestException(`Animation job ${jobId} is not running.`);
    await this.prisma.$executeRawUnsafe(
      `UPDATE animation_job_attempts
       SET heartbeat_at = CURRENT_TIMESTAMP
       WHERE animation_job_id = $1::uuid AND attempt_number = $2`,
      jobId,
      row.attempt_count,
    );
    return mapJob(row);
  }

  async updateStatus(
    jobId: string,
    request: UpdateAnimationJobStatusDto,
  ): Promise<AnimationJobRecord> {
    const status = toDbStatus(request.status);
    const rows = await this.prisma.$queryRawUnsafe<JobRow[]>(
      `UPDATE animation_jobs
       SET status = $2::render_job_status,
           notes = COALESCE($3, notes),
           heartbeat_at = CASE WHEN $2 = 'RUNNING' THEN CURRENT_TIMESTAMP ELSE heartbeat_at END,
           finished_at = CASE WHEN $2 IN ('COMPLETE','FAILED') THEN CURRENT_TIMESTAMP ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1::uuid
       RETURNING *`,
      jobId,
      status,
      request.notes ?? null,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException(`Animation job ${jobId} was not found.`);
    if (row.attempt_count > 0) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE animation_job_attempts
         SET status = $3::render_job_status,
             heartbeat_at = CASE WHEN $3 = 'RUNNING' THEN CURRENT_TIMESTAMP ELSE heartbeat_at END,
             finished_at = CASE WHEN $3 IN ('COMPLETE','FAILED') THEN CURRENT_TIMESTAMP ELSE NULL END,
             error = CASE WHEN $3 = 'FAILED' THEN $4 ELSE error END
         WHERE animation_job_id = $1::uuid AND attempt_number = $2`,
        jobId,
        row.attempt_count,
        status,
        request.status === 'failed' ? request.notes ?? 'Animation operation failed.' : null,
      );
    }
    return mapJob(row);
  }

  async retry(jobId: string, notes?: string): Promise<AnimationJobRecord> {
    const rows = await this.prisma.$queryRawUnsafe<JobRow[]>(
      `UPDATE animation_jobs
       SET status = 'QUEUED'::render_job_status,
           worker_id = NULL,
           heartbeat_at = NULL,
           finished_at = NULL,
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1::uuid AND status = 'FAILED'::render_job_status
       RETURNING *`,
      jobId,
      notes ?? null,
    );
    const row = rows[0];
    if (!row) {
      throw new BadRequestException(
        `Animation job ${jobId} must be failed before it can be retried.`,
      );
    }
    return mapJob(row);
  }

  async listAttempts(jobId: string): Promise<AnimationJobAttemptRecord[]> {
    await this.get(jobId);
    const rows = await this.prisma.$queryRawUnsafe<AttemptRow[]>(
      `SELECT * FROM animation_job_attempts
       WHERE animation_job_id = $1::uuid
       ORDER BY attempt_number ASC`,
      jobId,
    );
    return rows.map(mapAttempt);
  }

  async createLog(jobId: string, request: CreateAnimationJobLogDto): Promise<AnimationJobLogRecord> {
    await this.get(jobId);
    const id = randomUUID();
    const rows = await this.prisma.$queryRawUnsafe<LogRow[]>(
      `INSERT INTO animation_job_logs
        (id, animation_job_id, worker_id, level, stream, message)
       VALUES ($1::uuid, $2::uuid, $3, $4::render_log_level, $5::render_log_stream, $6)
       RETURNING *`,
      id,
      jobId,
      request.workerId ?? null,
      request.level.toUpperCase(),
      request.stream.toUpperCase(),
      request.message,
    );
    return mapLog(requiredRow(rows, id));
  }

  async listLogs(jobId: string): Promise<AnimationJobLogRecord[]> {
    await this.get(jobId);
    const rows = await this.prisma.$queryRawUnsafe<LogRow[]>(
      `SELECT * FROM animation_job_logs
       WHERE animation_job_id = $1::uuid
       ORDER BY created_at ASC`,
      jobId,
    );
    return rows.map(mapLog);
  }

  async stale(maxAgeSeconds: number): Promise<AnimationJobRecord[]> {
    assertMaxAge(maxAgeSeconds);
    const rows = await this.prisma.$queryRawUnsafe<JobRow[]>(
      `SELECT * FROM animation_jobs
       WHERE status IN ('QUEUED'::render_job_status, 'RUNNING'::render_job_status)
         AND COALESCE(heartbeat_at, created_at) < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 second')
       ORDER BY created_at ASC`,
      maxAgeSeconds,
    );
    return rows.map(mapJob);
  }

  async failStale(maxAgeSeconds: number): Promise<AnimationJobRecord[]> {
    assertMaxAge(maxAgeSeconds);
    const rows = await this.prisma.$queryRawUnsafe<JobRow[]>(
      `UPDATE animation_jobs
       SET status = 'FAILED'::render_job_status,
           finished_at = CURRENT_TIMESTAMP,
           notes = 'stale-job-watchdog: heartbeat exceeded configured age',
           updated_at = CURRENT_TIMESTAMP
       WHERE status IN ('QUEUED'::render_job_status, 'RUNNING'::render_job_status)
         AND COALESCE(heartbeat_at, created_at) < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 second')
       RETURNING *`,
      maxAgeSeconds,
    );
    for (const row of rows) {
      if (row.attempt_count > 0) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE animation_job_attempts
           SET status = 'FAILED'::render_job_status,
               finished_at = CURRENT_TIMESTAMP,
               error = 'stale-job-watchdog: heartbeat exceeded configured age'
           WHERE animation_job_id = $1::uuid AND attempt_number = $2`,
          row.id,
          row.attempt_count,
        );
      }
    }
    return rows.map(mapJob);
  }
}

function assertLayerRequirement(operation: AnimationJobOperation, layer?: string): void {
  if (!['plan', 'candidates'].includes(operation) && !layer) {
    throw new BadRequestException(`Animation operation ${operation} requires layer.`);
  }
}

function assertMaxAge(maxAgeSeconds: number): void {
  if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds < 0) {
    throw new BadRequestException('maxAgeSeconds must be zero or greater.');
  }
}

function requiredRow<T>(rows: T[], id: string): T {
  const row = rows[0];
  if (!row) throw new Error(`Database did not return row ${id}.`);
  return row;
}

function toDbOperation(operation: AnimationJobOperation): string {
  return operation.toUpperCase();
}

function toDbStatus(status: AnimationJobRecord['status']): string {
  return status.toUpperCase();
}

function mapJob(row: JobRow): AnimationJobRecord {
  return {
    id: row.id,
    shot: row.shot_number,
    layer: row.layer_id,
    operation: row.operation.toLowerCase() as AnimationJobOperation,
    status: row.status.toLowerCase() as AnimationJobRecord['status'],
    notes: row.notes,
    workerId: row.worker_id,
    attemptCount: row.attempt_count,
    startedAt: iso(row.started_at),
    finishedAt: iso(row.finished_at),
    heartbeatAt: iso(row.heartbeat_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapAttempt(row: AttemptRow): AnimationJobAttemptRecord {
  return {
    id: row.id,
    animationJobId: row.animation_job_id,
    attemptNumber: row.attempt_number,
    workerId: row.worker_id,
    status: row.status.toLowerCase() as AnimationJobRecord['status'],
    startedAt: row.started_at.toISOString(),
    heartbeatAt: iso(row.heartbeat_at),
    finishedAt: iso(row.finished_at),
    error: row.error,
  };
}

function mapLog(row: LogRow): AnimationJobLogRecord {
  return {
    id: row.id,
    animationJobId: row.animation_job_id,
    workerId: row.worker_id,
    level: row.level.toLowerCase() as AnimationJobLogRecord['level'],
    stream: row.stream.toLowerCase() as AnimationJobLogRecord['stream'],
    message: row.message,
    createdAt: row.created_at.toISOString(),
  };
}

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}
