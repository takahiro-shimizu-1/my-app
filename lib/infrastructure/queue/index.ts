/**
 * Job Queue Abstraction
 *
 * Enables async processing of OCR and judgment tasks.
 * Replaces the synchronous step-by-step execution of the original pipeline.
 *
 * Production: Use Cloud Tasks, Pub/Sub, or a database-backed queue.
 * Development: In-memory queue with sequential processing.
 */

import type { PipelineStep, JobStatus, PipelineJob } from "@/lib/domain/types";

export interface JobPayload {
  step: PipelineStep;
  data: Record<string, unknown>;
}

export interface JobQueue {
  enqueue(payload: JobPayload): Promise<PipelineJob>;
  dequeue(): Promise<PipelineJob | null>;
  updateStatus(jobId: string, status: JobStatus, error?: string): Promise<void>;
  getJob(jobId: string): Promise<PipelineJob | null>;
  getJobsByStep(step: PipelineStep): Promise<PipelineJob[]>;
  getPendingCount(): Promise<number>;
}

/**
 * In-memory job queue for development and testing.
 */
export class InMemoryJobQueue implements JobQueue {
  private jobs = new Map<string, PipelineJob & { payload: JobPayload }>();

  async enqueue(payload: JobPayload): Promise<PipelineJob> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: PipelineJob & { payload: JobPayload } = {
      jobId,
      step: payload.step,
      status: "pending",
      createdAt: new Date(),
      payload,
    };
    this.jobs.set(jobId, job);
    return job;
  }

  async dequeue(): Promise<(PipelineJob & { payload: JobPayload }) | null> {
    for (const job of this.jobs.values()) {
      if (job.status === "pending") {
        job.status = "running";
        job.startedAt = new Date();
        return job;
      }
    }
    return null;
  }

  async updateStatus(jobId: string, status: JobStatus, error?: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = status;
    if (status === "completed" || status === "failed") {
      job.completedAt = new Date();
    }
    if (error) {
      job.error = error;
    }
  }

  async getJob(jobId: string): Promise<PipelineJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async getJobsByStep(step: PipelineStep): Promise<PipelineJob[]> {
    return Array.from(this.jobs.values()).filter((j) => j.step === step);
  }

  async getPendingCount(): Promise<number> {
    return Array.from(this.jobs.values()).filter((j) => j.status === "pending").length;
  }
}
