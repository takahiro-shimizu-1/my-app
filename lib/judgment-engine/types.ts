/**
 * Judgment Engine Types
 *
 * Types specific to the requirement checking engine.
 */

import type {
  RequirementType,
  JudgmentResult,
  Company,
  Office,
  Employee,
  EmployeeQualification,
  WorkAchievement,
  TechnicianQualification,
  OfficeRegistrationAuthorization,
} from "@/lib/domain/types";

/**
 * Context provided to each requirement checker.
 * Checkers receive only the data they need via this interface.
 */
export interface CheckerContext {
  requirementText: string;
  requirementType: RequirementType;
  companyNo: string;
  officeNo: string;
}

/**
 * Data dependencies that checkers may request.
 * Loaded lazily by the pipeline to avoid unnecessary I/O.
 */
export interface CheckerDataSources {
  company: Company | null;
  office: Office | null;
  employees: Employee[];
  employeeQualifications: EmployeeQualification[];
  workAchievements: WorkAchievement[];
  technicianQualifications: TechnicianQualification[];
  officeRegistrationAuthorization: OfficeRegistrationAuthorization | null;
  agencyRegions: AgencyRegion[];
}

export interface AgencyRegion {
  agencyName: string;
  regionName: string;
  prefectures: string[];
}

/**
 * Interface for all requirement checkers (Strategy pattern).
 *
 * Each checker handles one requirement type and is stateless.
 * This enables easy testing, composition, and future extensibility.
 */
export interface RequirementChecker {
  readonly type: RequirementType;
  check(context: CheckerContext, data: CheckerDataSources): JudgmentResult;
}

/**
 * Configuration for the judgment pipeline.
 */
export interface PipelineConfig {
  checkers: RequirementChecker[];
  concurrency?: number;
  batchSize?: number;
}
