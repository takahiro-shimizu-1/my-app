/**
 * Judgment Service
 *
 * Application-level orchestration of the judgment pipeline.
 * Coordinates between the judgment engine, repositories, and queue.
 */

import type { EvaluationResult, PipelineJob } from "@/lib/domain/types";
import type { DataSourceProvider } from "@/lib/judgment-engine/data-source-provider";
import type { PipelineConfig } from "@/lib/judgment-engine/types";
import type { AnnouncementRepository, EvaluationRepository } from "@/lib/infrastructure/database/repository";
import type { JobQueue } from "@/lib/infrastructure/queue";
import { evaluateBatch, createDefaultConfig } from "@/lib/judgment-engine";
import type { EvaluationInput } from "@/lib/judgment-engine";

export interface JudgmentServiceDeps {
  announcementRepo: AnnouncementRepository;
  evaluationRepo: EvaluationRepository;
  dataSourceProvider: DataSourceProvider;
  jobQueue: JobQueue;
  pipelineConfig?: PipelineConfig;
}

export class JudgmentService {
  private deps: JudgmentServiceDeps;
  private config: PipelineConfig;

  constructor(deps: JudgmentServiceDeps) {
    this.deps = deps;
    this.config = deps.pipelineConfig ?? createDefaultConfig();
  }

  /**
   * Run judgment for a single announcement across all company/office combinations.
   */
  async judgeAnnouncement(
    announcementNo: string,
    companyOffices: Array<{ companyNo: string; officeNo: string }>
  ): Promise<EvaluationResult[]> {
    const requirements = await this.deps.announcementRepo.findRequirements(announcementNo);

    if (requirements.length === 0) {
      return [];
    }

    const inputs: EvaluationInput[] = companyOffices.map(({ companyNo, officeNo }) => ({
      announcementNo,
      companyNo,
      officeNo,
      requirements,
    }));

    const results = await evaluateBatch(inputs, this.deps.dataSourceProvider, this.config);

    await this.deps.evaluationRepo.saveBatch(results);

    return results;
  }

  /**
   * Enqueue a judgment job for async processing.
   */
  async enqueueJudgment(
    announcementNo: string,
    companyOffices: Array<{ companyNo: string; officeNo: string }>
  ): Promise<string> {
    const job = await this.deps.jobQueue.enqueue({
      step: "judgment",
      data: { announcementNo, companyOffices },
    });
    return job.jobId;
  }

  /**
   * Process the next pending judgment job from the queue.
   */
  async processNextJob(): Promise<EvaluationResult[] | null> {
    const job = await this.deps.jobQueue.dequeue();
    if (!job) return null;

    try {
      // Job payload contains the data we enqueued
      const jobWithPayload = job as PipelineJob & { payload?: { data: Record<string, unknown> } };
      const payload = jobWithPayload.payload?.data ?? {};
      const results = await this.judgeAnnouncement(
        payload.announcementNo as string,
        payload.companyOffices as Array<{ companyNo: string; officeNo: string }>
      );

      await this.deps.jobQueue.updateStatus(job.jobId, "completed");
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.deps.jobQueue.updateStatus(job.jobId, "failed", message);
      return null;
    }
  }
}
