/**
 * PostgreSQL Data Source Provider
 *
 * Loads checker data from PostgreSQL for the judgment engine.
 * Implements caching to avoid redundant queries within a pipeline run.
 */

import type {
  Company,
  Office,
  Employee,
  EmployeeQualification,
  WorkAchievement,
  TechnicianQualification,
  OfficeRegistrationAuthorization,
} from "@/lib/domain/types";
import type { DataSourceProvider } from "@/lib/judgment-engine/data-source-provider";
import type { CheckerDataSources, AgencyRegion } from "@/lib/judgment-engine/types";

interface DatabasePool {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export class PostgresDataSourceProvider implements DataSourceProvider {
  private cache = new Map<string, CheckerDataSources>();
  private schema: string;

  constructor(
    private pool: DatabasePool,
    schema = "public"
  ) {
    this.schema = schema;
  }

  async loadForEvaluation(companyNo: string, officeNo: string): Promise<CheckerDataSources> {
    const cacheKey = `${companyNo}:${officeNo}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const [company, office, employees, employeeQualifications, workAchievements, technicianQualifications, officeRegistrationAuthorization, agencyRegions] =
      await Promise.all([
        this.loadCompany(companyNo),
        this.loadOffice(officeNo),
        this.loadEmployees(companyNo, officeNo),
        this.loadEmployeeQualifications(companyNo, officeNo),
        this.loadWorkAchievements(companyNo, officeNo),
        this.loadTechnicianQualifications(),
        this.loadOfficeRegistrationAuthorization(officeNo),
        this.loadAgencyRegions(),
      ]);

    const result: CheckerDataSources = {
      company,
      office,
      employees,
      employeeQualifications,
      workAchievements,
      technicianQualifications,
      officeRegistrationAuthorization,
      agencyRegions,
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private t(table: string): string {
    return `${this.schema}.${table}`;
  }

  private async loadCompany(companyNo: string): Promise<Company | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${this.t("company_master")} WHERE company_no = $1 LIMIT 1`,
      [companyNo]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      companyNo: String(r.company_no),
      companyName: String(r.company_name ?? ""),
      article70Flag: Boolean(r.article_70_flag),
      article71Flag: Boolean(r.article_71_flag),
      bankruptcyFlag: Boolean(r.bankruptcy_flag),
      corporateReorganizationFlag: Boolean(r["Corporate_Reorganization_Flag"]),
      corporateReorganizationStartDate: r["Corporate_Reorganization_start_date"]
        ? String(r["Corporate_Reorganization_start_date"])
        : null,
      postReorganizationReacquisitionDate: r["Post_Reorganization_Reacquisition_Date"]
        ? String(r["Post_Reorganization_Reacquisition_Date"])
        : null,
      antiSocialForcesFlag: Boolean(r["Anti_Social_Forces_Flag"]),
      adultWardFlag: Boolean(r["Adult_Ward_Flag"]),
      foreignLegalRestrictionFlag: Boolean(r["Foreign_Legal_Restriction_Flag"]),
      subversiveOrganizationFlag: Boolean(r["Subversive_Organization_Flag"]),
      noSocialInsuranceArrearsFlag: Boolean(r["No_Social_Insurance_Arrears_Flag"]),
      informationSecurityFrameworkFlag: Boolean(r["Information_Security_Framework_Flag"]),
      bojTransactionSuspensionFlag: Boolean(r["BOJ_Transaction_Suspension_flag"]),
      priority: (String(r.priority ?? "C")) as Company["priority"],
    };
  }

  private async loadOffice(officeNo: string): Promise<Office | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${this.t("office_master")} WHERE office_no = $1 LIMIT 1`,
      [officeNo]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      officeNo: String(r.office_no),
      companyNo: String(r.company_no),
      officeName: String(r.office_name ?? ""),
      officeAddress: String(r.office_address ?? ""),
      officePrefecture: String(r.office_prefecture ?? ""),
      officeType: String(r.office_type ?? ""),
      officeTelephone: r.office_telephone ? String(r.office_telephone) : undefined,
      officeEmail: r.office_email ? String(r.office_email) : undefined,
      officeFax: r.office_fax ? String(r.office_fax) : undefined,
      officePostalCode: r.office_postal_code ? String(r.office_postal_code) : undefined,
      isSuspended: Boolean(r.is_suspended),
    };
  }

  private async loadEmployees(companyNo: string, officeNo: string): Promise<Employee[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${this.t("employee_master")} WHERE company_no = $1 AND office_no = $2`,
      [companyNo, officeNo]
    );
    return rows.map((r) => ({
      employeeNo: String(r.employee_no),
      companyNo: String(r.company_no),
      officeNo: String(r.office_no),
      employeeName: String(r.employee_name ?? ""),
    }));
  }

  private async loadEmployeeQualifications(
    companyNo: string,
    officeNo: string
  ): Promise<EmployeeQualification[]> {
    const { rows } = await this.pool.query(
      `SELECT eq.* FROM ${this.t("employee_qualification_master")} eq
       JOIN ${this.t("employee_master")} em ON eq.employee_no = em.employee_no
       WHERE em.company_no = $1 AND em.office_no = $2`,
      [companyNo, officeNo]
    );
    return rows.map((r) => ({
      employeeNo: String(r.employee_no),
      qualificationCode: String(r.qualification_code ?? ""),
      qualificationName: String(r.qualification_name ?? ""),
      acquiredDate: r.acquired_date ? String(r.acquired_date) : undefined,
    }));
  }

  private async loadWorkAchievements(
    companyNo: string,
    officeNo: string
  ): Promise<WorkAchievement[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${this.t("office_work_achivements_master")} WHERE company_no = $1 AND office_no = $2`,
      [companyNo, officeNo]
    );
    return rows.map((r) => ({
      officeNo: String(r.office_no),
      companyNo: String(r.company_no),
      workName: String(r.work_name ?? ""),
      agencyName: String(r.agency_name ?? ""),
      constructionType: String(r.construction_type ?? ""),
      contractorLayer: String(r.contractor_layer ?? ""),
      jvRatio: r.jv_ratio != null ? Number(r.jv_ratio) : undefined,
      constructionScore: r.construction_score != null ? Number(r.construction_score) : undefined,
      fiscalYear: Number(r.fiscal_year ?? 0),
    }));
  }

  private async loadTechnicianQualifications(): Promise<TechnicianQualification[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${this.t("technician_qualification_master")}`
    );
    return rows.map((r) => ({
      qualificationCode: String(r.qualification_code ?? ""),
      qualificationName: String(r.qualification_name ?? ""),
      category: String(r.category ?? ""),
    }));
  }

  private async loadOfficeRegistrationAuthorization(
    officeNo: string
  ): Promise<OfficeRegistrationAuthorization | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${this.t("office_registration_authorization_master")} WHERE office_no = $1 LIMIT 1`,
      [officeNo]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      officeNo: String(r.office_no),
      isSuspended: Boolean(r.is_suspended),
      suspensionStartDate: r.suspension_start_date ? String(r.suspension_start_date) : undefined,
      suspensionEndDate: r.suspension_end_date ? String(r.suspension_end_date) : undefined,
    };
  }

  private async loadAgencyRegions(): Promise<AgencyRegion[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${this.t("agency_master")}`
    );
    return rows.map((r) => ({
      agencyName: String(r.agency_name ?? ""),
      regionName: String(r.region_name ?? ""),
      prefectures: r.prefectures
        ? String(r.prefectures).split(",").map((s: string) => s.trim())
        : [],
    }));
  }
}
