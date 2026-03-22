/**
 * Data Source Provider Interface
 *
 * Abstracts data loading for the judgment engine.
 * The pipeline calls this interface to lazily load data required by checkers.
 *
 * Implementations can load from:
 * - PostgreSQL (production)
 * - SQLite3 (local development)
 * - In-memory (testing)
 * - CSV files (migration from legacy)
 */

import type { CheckerDataSources } from "./types";

export interface DataSourceProvider {
  /**
   * Load all data sources needed to evaluate a (company, office) pair.
   * Implementations should cache internally to avoid redundant queries.
   */
  loadForEvaluation(companyNo: string, officeNo: string): Promise<CheckerDataSources>;
}

/**
 * In-memory data source provider for testing.
 */
export class InMemoryDataSourceProvider implements DataSourceProvider {
  constructor(private data: Map<string, CheckerDataSources>) {}

  async loadForEvaluation(companyNo: string, officeNo: string): Promise<CheckerDataSources> {
    const key = `${companyNo}:${officeNo}`;
    const result = this.data.get(key);
    if (result) return result;

    return {
      company: null,
      office: null,
      employees: [],
      employeeQualifications: [],
      workAchievements: [],
      technicianQualifications: [],
      officeRegistrationAuthorization: null,
      agencyRegions: [],
    };
  }
}
