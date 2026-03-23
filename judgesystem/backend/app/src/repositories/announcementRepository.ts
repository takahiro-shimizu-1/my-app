import { pool, TABLES, schemaPrefix } from "../config/database";
import { FilterParams } from "../types";

export class AnnouncementRepository {
  /**
   * Get paginated announcements list with filters
   * bid_announcements テーブルから一覧表示に必要な最小限のデータを取得
   */
  async findWithFilters(filters: FilterParams): Promise<{ data: any[]; total: number }> {
    const client = await pool.connect();
    try {
      // Build WHERE clause
      const { whereClause, queryParams, paramIndex } = this.buildWhereClause(filters);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count
        FROM ${schemaPrefix}bid_announcements
        ${whereClause}
      `;
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
          CONCAT('ann-', announcement_no) AS id,
          announcement_no AS "announcementNo",
          COALESCE("workName", '') AS title,
          COALESCE("topAgencyName", '') AS organization,
          COALESCE(category, '') AS category,
          COALESCE("bidType", 'unknown') AS "bidType",
          COALESCE("workPlace", '') AS "workLocation",
          COALESCE("publishDate", '') AS "publishDate",
          COALESCE("bidEndDate", '') AS deadline
        FROM ${schemaPrefix}bid_announcements
        ${whereClause}
        ${orderByClause}
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
   * Find single announcement by announcement_no
   * bid_announcements をベースに、documents と competing_companies を取得
   */
  async findByNo(announcementNo: number): Promise<any | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        WITH
        -- documents を集約
        documents_agg AS (
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
              ) ORDER BY document_id
            ) AS documents
          FROM ${schemaPrefix}announcements_documents_master
          WHERE announcement_id = $1
          GROUP BY announcement_id
        ),
        -- competing companies を集約
        competing_companies_agg AS (
          SELECT
            cc.announcement_id,
            jsonb_agg(
              jsonb_build_object(
                'name', cc.company_name,
                'isWinner', cc."isWinner",
                'bidAmounts', COALESCE(
                  (
                    SELECT jsonb_agg(bid_amount ORDER BY bid_order)
                    FROM ${schemaPrefix}announcements_competing_company_bids_master b
                    WHERE b.announcement_id = cc.announcement_id
                      AND b.company_name = cc.company_name
                  ),
                  '[]'::jsonb
                )
              ) ORDER BY cc.company_name
            ) AS competing_companies
          FROM ${schemaPrefix}announcements_competing_companies_master cc
          WHERE cc.announcement_id = $1
          GROUP BY cc.announcement_id
        )
        SELECT
          CONCAT('ann-', a.announcement_no) AS id,
          a.announcement_no AS "no",
          a.announcement_no AS "announcementNo",
          COALESCE(a.orderer_id, '') AS "ordererId",
          COALESCE(a."workName", '') AS title,
          COALESCE(a."topAgencyName", '') AS organization,
          COALESCE(a.category, '') AS category,
          COALESCE(a."bidType", 'unknown') AS "bidType",
          COALESCE(a."workPlace", '') AS "workLocation",

          -- department を JSONB オブジェクトとして構築
          jsonb_build_object(
            'postalCode', COALESCE(a.zipcode, ''),
            'address', COALESCE(a.address, ''),
            'name', COALESCE(a.department, ''),
            'contactPerson', COALESCE(a."assigneeName", ''),
            'phone', COALESCE(a.telephone, ''),
            'fax', COALESCE(a.fax, ''),
            'email', COALESCE(a.mail, '')
          ) AS department,

          COALESCE(a."publishDate", '') AS "publishDate",
          COALESCE(a."docDistStart", '') AS "explanationStartDate",
          COALESCE(a."docDistEnd", '') AS "explanationEndDate",
          COALESCE(a."submissionStart", '') AS "applicationStartDate",
          COALESCE(a."submissionEnd", '') AS "applicationEndDate",
          COALESCE(a."bidStartDate", '') AS "bidStartDate",
          COALESCE(a."bidEndDate", '') AS "bidEndDate",
          COALESCE(a."bidEndDate", '') AS deadline,

          -- 見積金額・落札金額（今後別テーブルから取得予定、現在は NULL）
          NULL::integer AS "estimatedAmountMin",
          NULL::integer AS "estimatedAmountMax",
          NULL::integer AS "actualAmount",
          NULL::text AS "winningCompanyId",
          NULL::text AS "winningCompanyName",

          -- documents と competing_companies
          COALESCE(d.documents, '[]'::jsonb) AS documents,
          COALESCE(cc.competing_companies, '[]'::jsonb) AS "competingCompanies"

        FROM ${schemaPrefix}bid_announcements a
        LEFT JOIN documents_agg d ON d.announcement_id = a.announcement_no
        LEFT JOIN competing_companies_agg cc ON cc.announcement_id = a.announcement_no
        WHERE a.announcement_no = $1
        `,
        [announcementNo]
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
   * Get progressing companies (raw data - Service computes statuses)
   */
  async findProgressingCompanies(announcementNo: number): Promise<any[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT
          cbj.evaluation_no::text AS "evaluationId",
          cbj.announcement_no::text AS "announcementNo",
          cbj.company_no::text AS "companyId",
          COALESCE(cm.company_name, '') AS "companyName",
          cbj.office_no::text AS "branchId",
          COALESCE(om.office_name, '') AS "branchName",
          COALESCE(om.office_address, '') AS "branchAddress",
          COALESCE(cm.company_address, '') AS "companyAddress",
          cbj.final_status AS "finalStatus",
          cbj.requirement_ineligibility AS "requirementIneligibility",
          cbj.requirement_grade_item AS "requirementGradeItem",
          cbj.requirement_location AS "requirementLocation",
          cbj.requirement_experience AS "requirementExperience",
          cbj.requirement_technician AS "requirementTechnician",
          cbj.requirement_other AS "requirementOther",
          evs."workStatus" AS "workStatus",
          COALESCE(evs."updatedAt", cbj."updatedDate"::timestamptz) AS "updatedAt"
        FROM ${schemaPrefix}company_bid_judgement cbj
        JOIN ${schemaPrefix}company_master cm
          ON cm.company_no::text = cbj.company_no::text
        LEFT JOIN ${schemaPrefix}office_master om
          ON om.office_no::text = cbj.office_no::text
        LEFT JOIN ${schemaPrefix}${TABLES.evaluationStatuses} evs
          ON evs."evaluationNo" = cbj.evaluation_no::text
        WHERE cbj.announcement_no = $1
          AND COALESCE(evs."workStatus", 'not_started') = ANY($2::text[])
        ORDER BY COALESCE(evs."updatedAt", cbj."updatedDate"::timestamptz) DESC NULLS LAST
        `,
        [announcementNo, ['in_progress', 'completed']]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get similar cases for a specific announcement (by announcement_no)
   */
  async findSimilarCases(announcementNo: number): Promise<any[]> {
    const client = await pool.connect();
    try {
      const announcementIdCandidates = [`ann-${announcementNo}`, String(announcementNo)];
      const tableSimilarCases = `${schemaPrefix}similar_cases_master`;
      const tableCompetitors = `${schemaPrefix}similar_cases_competitors`;

      const result = await client.query(
        `
        WITH filtered_cases AS (
          SELECT
            announcement_id::text AS announcement_id,
            similar_case_announcement_id::text AS similar_case_announcement_id,
            COALESCE(case_name, '') AS case_name,
            COALESCE(winning_company, '') AS winning_company,
            winning_amount
          FROM ${tableSimilarCases}
          WHERE announcement_id::text = ANY($1::text[])
        ),
        competitors AS (
          SELECT
            similar_case_announcement_id::text AS similar_case_announcement_id,
            jsonb_agg(competitor_name ORDER BY competitor_name) AS names
          FROM ${tableCompetitors}
          WHERE similar_case_announcement_id::text IN (
            SELECT similar_case_announcement_id FROM filtered_cases
          )
          GROUP BY similar_case_announcement_id
        )
        SELECT
          sc.announcement_id,
          sc.similar_case_announcement_id,
          sc.case_name,
          sc.winning_company,
          sc.winning_amount,
          COALESCE(comp.names, '[]'::jsonb) AS competitors
        FROM filtered_cases sc
        LEFT JOIN competitors comp
          ON comp.similar_case_announcement_id = sc.similar_case_announcement_id
        ORDER BY sc.case_name
        `,
        [announcementIdCandidates]
      );

      return result.rows.map(row => ({
        id: row.similar_case_announcement_id ?? row.announcement_id,
        announcementId: row.announcement_id,
        similarAnnouncementId: row.similar_case_announcement_id,
        caseName: row.case_name,
        winningCompany: row.winning_company,
        winningAmount: row.winning_amount,
        competitors: row.competitors ?? [],
      }));
    } catch (error) {
      console.error(`ERROR fetching similar cases for announcement ${announcementNo}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get document metadata for a specific document (data only, no GCS)
   */
  async findDocumentMeta(announcementNo: number, documentId: string): Promise<any | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT
          document_id,
          title,
          "fileFormat",
          save_path,
          url
        FROM ${schemaPrefix}announcements_documents_master
        WHERE announcement_id = $1
          AND document_id = $2
        `,
        [announcementNo, documentId]
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
   * Get document file for preview/download.
   * Fetches metadata from DB, then downloads actual file from GCS.
   */
  async getDocumentFile(
    announcementNo: number,
    documentId: string
  ): Promise<{ data: Buffer; fileFormat: string; title: string } | null> {
    const meta = await this.findDocumentMeta(announcementNo, documentId);
    if (!meta) return null;

    const gcsPath = meta.save_path;
    if (!gcsPath || !gcsPath.startsWith("gs://")) {
      return null;
    }

    const { downloadFileFromGCS } = await import("../utils/gcs");
    const data = await downloadFileFromGCS(gcsPath);

    return {
      data,
      fileFormat: meta.fileFormat || "pdf",
      title: meta.title || `document-${documentId}`,
    };
  }

  /**
   * Find related announcements by same category/organization/location.
   */
  async findRelated(announcementNo: number): Promise<any[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        WITH target AS (
          SELECT category, "topAgencyName", "workPlace"
          FROM ${schemaPrefix}bid_announcements
          WHERE announcement_no = $1
        )
        SELECT
          CONCAT('ann-', a.announcement_no) AS id,
          a.announcement_no AS no,
          a.announcement_no AS "announcementNo",
          COALESCE(a."workName", '') AS title,
          COALESCE(a."topAgencyName", '') AS organization,
          COALESCE(a.category, '') AS category,
          COALESCE(a."bidType", 'unknown') AS "bidType",
          COALESCE(a."workPlace", '') AS "workLocation",
          COALESCE(a."publishDate", '') AS "publishDate",
          COALESCE(a."bidEndDate", '') AS deadline
        FROM ${schemaPrefix}bid_announcements a, target t
        WHERE a.announcement_no != $1
          AND (
            a.category = t.category
            OR a."topAgencyName" = t."topAgencyName"
            OR a."workPlace" = t."workPlace"
          )
        ORDER BY a."bidEndDate" DESC NULLS LAST
        LIMIT 50
        `,
        [announcementNo]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Build WHERE clause from filters (pure data column filters only)
   * bid_announcements テーブルのカラム名に対応
   */
  private buildWhereClause(filters: FilterParams): {
    whereClause: string;
    queryParams: any[];
    paramIndex: number;
  } {
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.bidTypes && filters.bidTypes.length > 0) {
      // 'unknown' が含まれている場合は NULL や空文字も含める
      if (filters.bidTypes.includes('unknown')) {
        const otherTypes = filters.bidTypes.filter(t => t !== 'unknown');
        if (otherTypes.length > 0) {
          whereClauses.push(
            `("bidType" = ANY($${paramIndex}) OR "bidType" IS NULL OR "bidType" = '')`
          );
          queryParams.push(otherTypes);
          paramIndex++;
        } else {
          // 'unknown' のみの場合
          whereClauses.push(`("bidType" IS NULL OR "bidType" = '')`);
        }
      } else {
        whereClauses.push(`"bidType" = ANY($${paramIndex})`);
        queryParams.push(filters.bidTypes);
        paramIndex++;
      }
    }

    if (filters.categories && filters.categories.length > 0) {
      whereClauses.push(`category = ANY($${paramIndex})`);
      queryParams.push(filters.categories);
      paramIndex++;
    }

    if (filters.organizations && filters.organizations.length > 0) {
      whereClauses.push(`"topAgencyName" = ANY($${paramIndex})`);
      queryParams.push(filters.organizations);
      paramIndex++;
    }

    if (filters.prefectures && filters.prefectures.length > 0) {
      const prefLikes = filters.prefectures
        .map((_, i) => `"workPlace" ILIKE $${paramIndex + i}`)
        .join(' OR ');
      whereClauses.push(`(${prefLikes})`);
      filters.prefectures.forEach(p => queryParams.push(`%${p}%`));
      paramIndex += filters.prefectures.length;
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      whereClauses.push(
        `("workName" ILIKE $${paramIndex} OR ` +
        `"topAgencyName" ILIKE $${paramIndex} OR ` +
        `category ILIKE $${paramIndex})`
      );
      queryParams.push(`%${filters.searchQuery}%`);
      paramIndex++;
    }

    if (filters.ordererId) {
      whereClauses.push(`orderer_id = $${paramIndex}`);
      queryParams.push(filters.ordererId);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    return { whereClause, queryParams, paramIndex };
  }

  /**
   * Build ORDER BY clause (data column sorting only)
   * bid_announcements テーブルのカラム名に対応
   */
  private buildOrderByClause(sortField?: string, sortOrder?: string): string {
    if (!sortField) return '';

    const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';
    const fieldMap: Record<string, string> = {
      announcementNo: 'announcement_no',
      no: 'announcement_no',
      bidType: '"bidType"',
      title: '"workName"',
      organization: '"topAgencyName"',
      category: 'category',
      publishDate: `
        CASE
          WHEN "publishDate" IS NULL OR "publishDate" = '' THEN NULL
          WHEN "publishDate" ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' THEN "publishDate"
          ELSE NULL
        END
      `,
      deadline: `
        CASE
          WHEN "bidEndDate" IS NULL OR "bidEndDate" = '' THEN NULL
          WHEN "bidEndDate" ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' THEN "bidEndDate"
          ELSE NULL
        END
      `,
      workLocation: '"workPlace"',
      prefecture: '"workPlace"',
    };

    if (fieldMap[sortField]) {
      return `ORDER BY ${fieldMap[sortField]} ${direction} NULLS LAST`;
    }

    return '';
  }
}
