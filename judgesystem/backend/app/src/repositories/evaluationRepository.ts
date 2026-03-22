import { pool, TABLES, schemaPrefix } from "../config/database";
import { FilterParams } from "../types";

type QualifiedTables = {
  companyBidJudgement: string;
  bidAnnouncements: string;
  companyMaster: string;
  officeMaster: string;
  documents: string;
  requirements: string;
  sufficientRequirements: string;
  insufficientRequirements: string;
  competingCompanies: string;
  competingCompanyBids: string;
  announcementsEstimatedAmounts: string;
  evaluationStatuses: string;
  evaluationAssignees: string;
};

export class EvaluationRepository {
  /**
   * Get paginated evaluations list with filters
   */
  async findWithFilters(filters: FilterParams): Promise<{ data: any[]; total: number }> {
    const client = await pool.connect();
    try {
      const tables = this.getQualifiedTables();
      const baseFromClause = this.getBaseFromClause(tables);

      // Build WHERE clause (no status/workStatus filtering - Service handles that)
      const { whereClause, queryParams, paramIndex } = this.buildWhereClause(filters);

      // Get total count
      const countQuery = `SELECT COUNT(*) as count ${baseFromClause} ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Build ORDER BY clause
      const orderByClause = this.buildOrderByClause(filters.sortField, filters.sortOrder);

      // Get paginated data
      const page = filters.page || 0;
      const pageSize = filters.pageSize || 25;
      const offset = page * pageSize;

      const dataQuery = `
        SELECT
          cbj.evaluation_no::text AS id,
          cbj.evaluation_no::text AS "evaluationNo",
          jsonb_build_object(
            'title', COALESCE(ba."workName", ''),
            'organization', COALESCE(ba."topAgencyName", ''),
            'category', COALESCE(ba.category, ''),
            'bidType', COALESCE(ba."bidType", ''),
            'deadline', COALESCE(ba."bidEndDate", ''),
            'workLocation', COALESCE(ba."workPlace", ''),
            'estimatedAmountMin', aea.estimated_amount_min,
            'estimatedAmountMax', aea.estimated_amount_max
          ) AS announcement,
          jsonb_build_object(
            'name', COALESCE(cm.company_name, '')
          ) AS company,
          jsonb_build_object(
            'id', CONCAT('brn-', cbj.office_no),
            'name', COALESCE(om.office_name, ''),
            'address', COALESCE(om.office_address, ''),
            'phone', COALESCE(om.office_telephone, ''),
            'email', COALESCE(om.office_email, ''),
            'fax', COALESCE(om.office_fax, ''),
            'postalCode', COALESCE(om.office_postal_code, '')
          ) AS branch,
          cbj.final_status AS "finalStatus",
          cbj.requirement_ineligibility AS "requirementIneligibility",
          cbj.requirement_grade_item AS "requirementGradeItem",
          cbj.requirement_location AS "requirementLocation",
          cbj.requirement_experience AS "requirementExperience",
          cbj.requirement_technician AS "requirementTechnician",
          cbj.requirement_other AS "requirementOther",
          evs."workStatus" AS "workStatus",
          evs."currentStep" AS "currentStep",
          cbj."updatedDate" AS "evaluatedAt"
        ${baseFromClause}
        ${whereClause}
        ${orderByClause || "ORDER BY cbj.evaluation_no DESC"}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      const dataParams = [...queryParams, pageSize, offset];
      const dataResult = await client.query(dataQuery, dataParams);

      return {
        data: dataResult.rows,
        total,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Find single evaluation by ID
   */
  async findById(id: string): Promise<any | null> {
    const client = await pool.connect();
    try {
      const tables = this.getQualifiedTables();
      const baseFromClause = this.getBaseFromClause(tables);

      const result = await client.query(
        `
        WITH documents AS (
          SELECT
            announcement_id,
            jsonb_agg(
              jsonb_build_object(
                'id', document_id,
                'type', type,
                'title', title,
                'fileFormat', "fileFormat",
                'pageCount', "pageCount",
                'extractedAt', "extractedAt",
                'url', COALESCE(REPLACE(save_path, 'gs://', 'https://storage.googleapis.com/'), url),
                'markdown_path', markdown_path
              )
              ORDER BY document_id
            ) AS docs
          FROM ${tables.documents}
          GROUP BY announcement_id
        ),
        company_bids AS (
          SELECT
            announcement_id,
            company_name,
            jsonb_agg(bid_amount ORDER BY bid_order) AS bid_amounts
          FROM ${tables.competingCompanyBids}
          GROUP BY announcement_id, company_name
        ),
        competing_companies AS (
          SELECT
            cc.announcement_id,
            jsonb_agg(
              jsonb_build_object(
                'name', cc.company_name,
                'isWinner', cc."isWinner",
                'bidAmounts', COALESCE(cb.bid_amounts, '[]'::jsonb)
              )
              ORDER BY cc.company_name
            ) AS companies,
            MAX(CASE WHEN cc."isWinner" THEN cc.company_name END) AS winning_company_name,
            MAX(
              CASE WHEN cc."isWinner" THEN (
                SELECT bid_amount
                FROM ${tables.competingCompanyBids} b
                WHERE b.announcement_id = cc.announcement_id
                  AND b.company_name = cc.company_name
                ORDER BY bid_order DESC
                LIMIT 1
              ) END
            ) AS winning_company_amount
          FROM ${tables.competingCompanies} cc
          LEFT JOIN company_bids cb
            ON cb.announcement_id = cc.announcement_id
           AND cb.company_name = cc.company_name
         GROUP BY cc.announcement_id
        ),
        step_assignees AS (
          SELECT
            evaluation_no,
            jsonb_agg(
              jsonb_build_object(
                'stepId', step_id,
                'staffId', contact_id::text,
                'assignedAt', assigned_at
              )
              ORDER BY step_id
            ) AS assignees
          FROM ${tables.evaluationAssignees}
          GROUP BY evaluation_no
        ),
        requirement_details AS (
          SELECT
            req1.announcement_no,
            req2.office_no,
            jsonb_agg(
              jsonb_build_object(
                'id', CONCAT('req-', req1.requirement_no),
                'category', req2.requirement_type,
                'name', req1.requirement_text,
                'isMet', req2.is_met,
                'reason', req2.requirement_description,
                'evidence', 'dummy_evidence'
              )
              ORDER BY req1.requirement_no
            ) AS requirements
          FROM ${tables.requirements} req1
          JOIN (
            SELECT
              announcement_no,
              office_no,
              requirement_no,
              requirement_type,
              requirement_description,
              TRUE AS is_met
            FROM ${tables.sufficientRequirements}
            UNION ALL
            SELECT
              announcement_no,
              office_no,
              requirement_no,
              requirement_type,
              requirement_description,
              FALSE AS is_met
            FROM ${tables.insufficientRequirements}
          ) req2
            ON req1.requirement_no = req2.requirement_no
          GROUP BY req1.announcement_no, req2.office_no
        )
        SELECT
          cbj.evaluation_no::text AS id,
          cbj.evaluation_no::text AS "evaluationNo",
          jsonb_build_object(
            'id', CONCAT('ann-', cbj.announcement_no),
            'ordererId', COALESCE(ba.orderer_id::text, ''),
            'title', COALESCE(ba."workName", ''),
            'category', COALESCE(ba.category, ''),
            'organization', COALESCE(ba."topAgencyName", ''),
            'workLocation', COALESCE(ba."workPlace", ''),
            'department', jsonb_build_object(
              'postalCode', COALESCE(ba.zipcode, ''),
              'address', COALESCE(ba.address, ''),
              'name', COALESCE(ba.department, ''),
              'contactPerson', COALESCE(ba."assigneeName", ''),
              'phone', COALESCE(ba.telephone, ''),
              'fax', COALESCE(ba.fax, ''),
              'email', COALESCE(ba.mail, '')
            ),
            'publishDate', COALESCE(ba."publishDate", ''),
            'explanationStartDate', COALESCE(ba."docDistStart", ''),
            'explanationEndDate', COALESCE(ba."docDistEnd", ''),
            'applicationStartDate', COALESCE(ba."submissionStart", ''),
            'applicationEndDate', COALESCE(ba."submissionEnd", ''),
            'bidStartDate', COALESCE(ba."bidStartDate", ''),
            'bidEndDate', COALESCE(ba."bidEndDate", ''),
            'deadline', COALESCE(ba."bidEndDate", ''),
            'estimatedAmountMin', aea.estimated_amount_min,
            'estimatedAmountMax', aea.estimated_amount_max,
            'pdfUrl', COALESCE(doc.docs->0->>'url', ''),
            'documents', COALESCE(doc.docs, '[]'::jsonb),
            'competingCompanies', COALESCE(companies.companies, '[]'::jsonb),
            'winningCompanyId', NULL,
            'winningCompanyName', COALESCE(companies.winning_company_name, ''),
            'actualAmount', companies.winning_company_amount
          ) AS announcement,
          jsonb_build_object(
            'id', CONCAT('com-', cbj.company_no),
            'name', COALESCE(cm.company_name, ''),
            'address', COALESCE(cm.company_address, ''),
            'grade', 'A'
          ) AS company,
          jsonb_build_object(
            'id', CONCAT('brn-', cbj.office_no),
            'name', COALESCE(om.office_name, ''),
            'address', COALESCE(om.office_address, ''),
            'phone', COALESCE(om.office_telephone, ''),
            'email', COALESCE(om.office_email, ''),
            'fax', COALESCE(om.office_fax, ''),
            'postalCode', COALESCE(om.office_postal_code, '')
          ) AS branch,
          COALESCE(sa.assignees, '[]'::jsonb) AS "stepAssignees",
          COALESCE(req.requirements, '[]'::jsonb) AS requirements,
          cbj.final_status AS "finalStatus",
          cbj.requirement_ineligibility AS "requirementIneligibility",
          cbj.requirement_grade_item AS "requirementGradeItem",
          cbj.requirement_location AS "requirementLocation",
          cbj.requirement_experience AS "requirementExperience",
          cbj.requirement_technician AS "requirementTechnician",
          cbj.requirement_other AS "requirementOther",
          evs."workStatus" AS "workStatus",
          evs."currentStep" AS "currentStep",
          cbj."updatedDate" AS "evaluatedAt"
        ${baseFromClause}
        LEFT JOIN documents doc ON doc.announcement_id::text = cbj.announcement_no::text
        LEFT JOIN competing_companies companies ON companies.announcement_id::text = cbj.announcement_no::text
        LEFT JOIN requirement_details req
          ON req.announcement_no::text = cbj.announcement_no::text
         AND COALESCE(req.office_no::text, '-1') = COALESCE(cbj.office_no::text, '-1')
        LEFT JOIN step_assignees sa ON sa.evaluation_no::text = cbj.evaluation_no::text
        WHERE cbj.evaluation_no::text = $1
        `,
        [id]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Update workStatus for an evaluation
   */
  async updateWorkStatus(
    evaluationNo: string,
    workStatus: string,
    currentStep?: string
  ): Promise<any | null> {
    const client = await pool.connect();
    try {
      const qualifiedTableName = `${schemaPrefix}${TABLES.evaluationStatuses}`;

      const result = await client.query(
        `INSERT INTO ${qualifiedTableName} AS status ("evaluationNo", "workStatus", "currentStep")
         VALUES ($1, $2, COALESCE($3, 'judgment'))
         ON CONFLICT ("evaluationNo") DO UPDATE
         SET "workStatus" = EXCLUDED."workStatus",
             "currentStep" = CASE WHEN $3 IS NULL THEN status."currentStep" ELSE EXCLUDED."currentStep" END,
             "updatedAt" = NOW()
         RETURNING "evaluationNo", "workStatus", "currentStep", "updatedAt"`,
        [evaluationNo, workStatus, currentStep ?? null]
      );

      return result.rowCount === 0 ? null : result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get raw data for analytics dashboard (Service computes statuses)
   */
  async getStats(): Promise<any> {
    const client = await pool.connect();
    try {
      const tables = this.getQualifiedTables();
      const baseFromClause = this.getBaseFromClause(tables);

      const result = await client.query(`
        SELECT
          cbj.final_status AS "finalStatus",
          cbj.requirement_ineligibility AS "requirementIneligibility",
          cbj.requirement_grade_item AS "requirementGradeItem",
          cbj.requirement_location AS "requirementLocation",
          cbj.requirement_experience AS "requirementExperience",
          cbj.requirement_technician AS "requirementTechnician",
          cbj.requirement_other AS "requirementOther",
          COALESCE(ba."topAgencyName", '') AS organization,
          COALESCE(ba.category, '') AS category
        ${baseFromClause}
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get raw boolean columns for status counting (Service computes statuses and counts)
   */
  async getStatusCountsRaw(filters: FilterParams): Promise<any[]> {
    const client = await pool.connect();
    try {
      const tables = this.getQualifiedTables();
      const baseFromClause = this.getBaseFromClause(tables);

      const { whereClause, queryParams } = this.buildWhereClause(filters);

      const result = await client.query(
        `
        SELECT
          cbj.final_status AS "finalStatus",
          cbj.requirement_ineligibility AS "requirementIneligibility",
          cbj.requirement_grade_item AS "requirementGradeItem",
          cbj.requirement_location AS "requirementLocation",
          cbj.requirement_experience AS "requirementExperience",
          cbj.requirement_technician AS "requirementTechnician",
          cbj.requirement_other AS "requirementOther"
        ${baseFromClause}
        ${whereClause}
        `,
        queryParams
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Build WHERE clause from filters (pure data column filters only)
   */
  private buildWhereClause(
    filters: FilterParams
  ): {
    whereClause: string;
    queryParams: any[];
    paramIndex: number;
  } {
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.categories && filters.categories.length > 0) {
      whereClauses.push(`ba.category = ANY($${paramIndex})`);
      queryParams.push(filters.categories);
      paramIndex++;
    }

    if (filters.bidTypes && filters.bidTypes.length > 0) {
      whereClauses.push(`ba."bidType" = ANY($${paramIndex})`);
      queryParams.push(filters.bidTypes);
      paramIndex++;
    }

    if (filters.organizations && filters.organizations.length > 0) {
      whereClauses.push(`ba."topAgencyName" = ANY($${paramIndex})`);
      queryParams.push(filters.organizations);
      paramIndex++;
    }

    if (filters.prefectures && filters.prefectures.length > 0) {
      const prefLikes = filters.prefectures
        .map((_, i) => `ba."workPlace" ILIKE $${paramIndex + i}`)
        .join(' OR ');
      whereClauses.push(`(${prefLikes})`);
      filters.prefectures.forEach(p => queryParams.push(`%${p}%`));
      paramIndex += filters.prefectures.length;
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      whereClauses.push(
        `(ba."workName" ILIKE $${paramIndex} OR ` +
        `ba."topAgencyName" ILIKE $${paramIndex} OR ` +
        `cm.company_name ILIKE $${paramIndex} OR ` +
        `ba.category ILIKE $${paramIndex})`
      );
      queryParams.push(`%${filters.searchQuery}%`);
      paramIndex++;
    }

    if (filters.ordererId) {
      const ordererValue = Array.isArray(filters.ordererId) ? filters.ordererId[0] : filters.ordererId;
      whereClauses.push(`ba.orderer_id = $${paramIndex}`);
      queryParams.push(String(ordererValue));
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    return { whereClause, queryParams, paramIndex };
  }

  /**
   * Build ORDER BY clause (only data column sorting)
   */
  private buildOrderByClause(sortField: string | undefined, sortOrder: string | undefined): string {
    if (!sortField) return '';

    const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';
    const fieldMap: Record<string, string> = {
      evaluationNo: 'cbj.evaluation_no',
      title: `ba."workName"`,
      company: `cm.company_name`,
      organization: `ba."topAgencyName"`,
      category: `ba.category`,
      bidType: `ba."bidType"`,
      deadline: `(
        CASE
          WHEN ba."bidEndDate" ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
            THEN ba."bidEndDate"
          ELSE NULL
        END
      )`,
      evaluatedAt: `cbj."updatedDate"`,
      prefecture: `ba."workPlace"`,
    };

    if (fieldMap[sortField]) {
      return `ORDER BY ${fieldMap[sortField]} ${direction} NULLS LAST`;
    }

    return '';
  }

  private getQualifiedTables(): QualifiedTables {
    return {
      companyBidJudgement: `${schemaPrefix}company_bid_judgement`,
      bidAnnouncements: `${schemaPrefix}bid_announcements`,
      companyMaster: `${schemaPrefix}company_master`,
      officeMaster: `${schemaPrefix}office_master`,
      documents: `${schemaPrefix}announcements_documents_master`,
      requirements: `${schemaPrefix}bid_requirements`,
      sufficientRequirements: `${schemaPrefix}sufficient_requirements`,
      insufficientRequirements: `${schemaPrefix}insufficient_requirements`,
      competingCompanies: `${schemaPrefix}announcements_competing_companies_master`,
      competingCompanyBids: `${schemaPrefix}announcements_competing_company_bids_master`,
      announcementsEstimatedAmounts: `${schemaPrefix}announcements_estimated_amounts`,
      evaluationStatuses: `${schemaPrefix}${TABLES.evaluationStatuses}`,
      evaluationAssignees: `${schemaPrefix}${TABLES.evaluationAssignees}`,
    };
  }

  private getBaseFromClause(tables: QualifiedTables): string {
    return `
      FROM ${tables.companyBidJudgement} cbj
      JOIN ${tables.bidAnnouncements} ba ON ba.announcement_no::text = cbj.announcement_no::text
      JOIN ${tables.companyMaster} cm ON cm.company_no::text = cbj.company_no::text
      LEFT JOIN ${tables.officeMaster} om ON om.office_no::text = cbj.office_no::text
      LEFT JOIN ${tables.announcementsEstimatedAmounts} aea ON aea.announcement_no::text = cbj.announcement_no::text
      LEFT JOIN ${tables.evaluationStatuses} evs ON evs."evaluationNo" = cbj.evaluation_no::text
    `;
  }
}
