/**
 * judgesystem Domain Types
 *
 * Core domain types for the bid announcement judgment system.
 * These types are pure data definitions with no dependencies.
 */

// ---------- Evaluation Result ----------

export type EvaluationVerdict = "pass" | "fail";

export interface EvaluationResult {
  readonly isOk: boolean;
  readonly reason: string;
}

export interface RequirementJudgment {
  readonly evaluationNo: string;
  readonly requirementNo: string;
  readonly companyNo: string;
  readonly officeNo: string;
  readonly requirementType: RequirementType;
  readonly isOk: boolean;
  readonly result: string;
}

export interface EvaluationSummary {
  readonly evaluationNo: string;
  readonly announcementNo: string;
  readonly companyNo: string;
  readonly officeNo: string;
  readonly requirementIneligibility: boolean;
  readonly requirementGradeItem: boolean;
  readonly requirementLocation: boolean;
  readonly requirementExperience: boolean;
  readonly requirementTechnician: boolean;
  readonly requirementOther: boolean;
  readonly deficitRequirementMessage: string;
  readonly finalStatus: boolean;
  readonly message: string;
  readonly remarks: string;
  readonly createdDate: Date;
  readonly updatedDate: Date;
}

export interface SufficientRequirement {
  readonly sufficiencyDetailNo: string;
  readonly evaluationNo: string;
  readonly announcementNo: string;
  readonly requirementNo: string;
  readonly companyNo: string;
  readonly officeNo: string;
  readonly requirementType: RequirementType;
  readonly requirementDescription: string;
  readonly createdDate: Date;
  readonly updatedDate: Date;
}

export interface InsufficientRequirement {
  readonly shortageDetailNo: string;
  readonly evaluationNo: string;
  readonly announcementNo: string;
  readonly requirementNo: string;
  readonly companyNo: string;
  readonly officeNo: string;
  readonly requirementType: RequirementType;
  readonly requirementDescription: string;
  readonly suggestionsForImprovement: string;
  readonly finalComment: string;
  readonly createdDate: Date;
  readonly updatedDate: Date;
}

// ---------- Requirement Types ----------

export const REQUIREMENT_TYPES = [
  "ineligibility",
  "gradeItem",
  "location",
  "experience",
  "technician",
] as const;

export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

/** Maps Japanese requirement type names to internal keys */
export const REQUIREMENT_TYPE_MAP: Record<string, RequirementType> = {
  "欠格要件": "ineligibility",
  "業種・等級要件": "gradeItem",
  "所在地要件": "location",
  "実績要件": "experience",
  "技術者要件": "technician",
} as const;

/** Maps internal keys to summary field names */
export const REQUIREMENT_FIELD_MAP: Record<RequirementType, keyof EvaluationSummary> = {
  ineligibility: "requirementIneligibility",
  gradeItem: "requirementGradeItem",
  location: "requirementLocation",
  experience: "requirementExperience",
  technician: "requirementTechnician",
} as const;

// ---------- Announcement & Requirement ----------

export interface Announcement {
  readonly announcementNo: string;
  readonly title: string;
  readonly agencyNo: string;
  readonly agencyName: string;
  readonly deadline: string;
  readonly status: string;
}

export interface Requirement {
  readonly requirementNo: string;
  readonly announcementNo: string;
  readonly requirementType: string;
  readonly requirementText: string;
}

// ---------- Master Data ----------

export interface Company {
  readonly companyNo: string;
  readonly corporateNumber: string;
  readonly companyName: string;
  readonly address: string;
  readonly bankruptcyFlag: boolean;
  readonly corporateReorganizationFlag: boolean;
  readonly antiSocialForcesFlag: boolean;
  readonly adultWardFlag: boolean;
  readonly foreignLegalRestrictionFlag: boolean;
  readonly subversiveOrganizationFlag: boolean;
  readonly noSocialInsuranceArrearsFlag: boolean;
  readonly informationSecurityFrameworkFlag: boolean;
  readonly bojTransactionSuspensionFlag: boolean;
  readonly article70Flag: boolean;
  readonly article71Flag: boolean;
  readonly corporateReorganizationStartDate: string | null;
  readonly postReorganizationReacquisitionDate: string | null;
}

export interface Office {
  readonly officeNo: string;
  readonly companyNo: string;
  readonly officeAddress: string;
  readonly officeType: string;
  readonly locatedPrefecture: string;
}

export interface Agency {
  readonly agencyNo: string;
  readonly agencyName: string;
  readonly parentAgencyNo: string;
  readonly agencyLevel: string;
  readonly agencyArea: string | null;
}

export interface OfficeWorkAchievement {
  readonly officeExperienceNo: string;
  readonly officeNo: string;
  readonly agencyNo: string;
  readonly constructionNo: string;
  readonly projectName: string;
  readonly contractorLayer: string;
  readonly startDate: string;
  readonly completionDate: string;
  readonly finalScore: number;
  readonly totalAmount: number;
  readonly isJvFlag: boolean;
  readonly jvRatio: number;
  readonly remarks: string;
}

export interface Employee {
  readonly employeeNo: string;
  readonly companyNo: string;
  readonly officeNo: string;
  readonly employeeName: string;
}

export interface EmployeeQualification {
  readonly employeeNo: string;
  readonly qualificationName: string;
  readonly acquiredDate: string;
}

export interface EmployeeExperience {
  readonly employeeNo: string;
  readonly projectName: string;
  readonly constructionNo: string;
  readonly role: string;
  readonly startDate: string;
  readonly completionDate: string;
}

export interface Construction {
  readonly constructionNo: string;
  readonly constructionName: string;
  readonly categorySegment: string;
  readonly parentConstructionNo: string;
}

export interface OfficeRegistrationAuthorization {
  readonly officeNo: string;
  readonly constructionNo: string;
  readonly grade: string;
  readonly isSuspended: boolean;
}

// ---------- Evaluation Target ----------

export interface EvaluationTarget {
  readonly announcementNo: string;
  readonly companyNo: string;
  readonly officeNo: string;
}

// ---------- Master Data Container ----------

export interface MasterData {
  readonly companies: Company[];
  readonly offices: Office[];
  readonly agencies: Agency[];
  readonly constructions: Construction[];
  readonly officeWorkAchievements: OfficeWorkAchievement[];
  readonly employees: Employee[];
  readonly employeeQualifications: EmployeeQualification[];
  readonly employeeExperiences: EmployeeExperience[];
  readonly officeRegistrationAuthorizations: OfficeRegistrationAuthorization[];
}
