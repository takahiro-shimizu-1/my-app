-- ============================================================================
-- 001_initial_schema.sql
-- Reverse-engineered from repository SQL queries
-- Generated: 2026-03-23
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. bid_announcements
--    Source: announcementRepository.ts, evaluationRepository.ts
--    Primary announcements/bid listing table
-- ============================================================================
CREATE TABLE IF NOT EXISTS bid_announcements (
    announcement_no     INTEGER         PRIMARY KEY,
    orderer_id          TEXT,
    "workName"          TEXT,
    "topAgencyName"     TEXT,
    category            TEXT,
    "bidType"           TEXT,
    "workPlace"         TEXT,
    zipcode             TEXT,
    address             TEXT,
    department          TEXT,
    "assigneeName"      TEXT,
    telephone           TEXT,
    fax                 TEXT,
    mail                TEXT,
    "publishDate"       TEXT,
    "docDistStart"      TEXT,
    "docDistEnd"        TEXT,
    "submissionStart"   TEXT,
    "submissionEnd"     TEXT,
    "bidStartDate"      TEXT,
    "bidEndDate"        TEXT
);

-- ============================================================================
-- 2. company_master
--    Source: evaluationRepository.ts, companyRepository.ts, announcementRepository.ts
--    Master table for companies
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_master (
    company_no          INTEGER         PRIMARY KEY,
    company_name        TEXT,
    company_address     TEXT
);

-- ============================================================================
-- 3. office_master
--    Source: evaluationRepository.ts, announcementRepository.ts
--    Master table for branch offices
-- ============================================================================
CREATE TABLE IF NOT EXISTS office_master (
    office_no           INTEGER         PRIMARY KEY,
    office_name         TEXT,
    office_address      TEXT,
    office_telephone    TEXT,
    office_email        TEXT,
    office_fax          TEXT,
    office_postal_code  TEXT
);

-- ============================================================================
-- 4. company_bid_judgement
--    Source: evaluationRepository.ts, announcementRepository.ts
--    Central evaluation/judgement table linking announcements, companies, offices
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_bid_judgement (
    evaluation_no               INTEGER     PRIMARY KEY,
    announcement_no             INTEGER     NOT NULL REFERENCES bid_announcements(announcement_no),
    company_no                  INTEGER     NOT NULL REFERENCES company_master(company_no),
    office_no                   INTEGER     REFERENCES office_master(office_no),
    final_status                BOOLEAN,
    requirement_ineligibility   BOOLEAN,
    requirement_grade_item      BOOLEAN,
    requirement_location        BOOLEAN,
    requirement_experience      BOOLEAN,
    requirement_technician      BOOLEAN,
    requirement_other           BOOLEAN,
    "updatedDate"               TIMESTAMP
);

-- ============================================================================
-- 5. bid_orderers
--    Source: ordererRepository.ts
--    TABLES.orderers = "bid_orderers"
-- ============================================================================
CREATE TABLE IF NOT EXISTS bid_orderers (
    orderer_id          SERIAL          PRIMARY KEY,
    orderer_name        TEXT,
    orderer_address     TEXT,
    orderer_telephone   TEXT
);

-- ============================================================================
-- 6. workflow_contacts
--    Source: contactRepository.ts
--    TABLES.contacts = "workflow_contacts"
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_contacts (
    contact_id          SERIAL          PRIMARY KEY,
    contact_name        TEXT,
    contact_email       TEXT,
    contact_telephone   TEXT
);

-- ============================================================================
-- 7. partners_master
--    Source: partnerRepository.ts
--    TABLES.partners = "partners_master"
-- ============================================================================
CREATE TABLE IF NOT EXISTS partners_master (
    partner_no          SERIAL          PRIMARY KEY,
    partner_name        TEXT,
    partner_address     TEXT,
    partner_telephone   TEXT,
    partner_email       TEXT
);

-- ============================================================================
-- 8. partners_categories
--    Source: TABLES.partnerCategories = "partners_categories"
--    Referenced in database.ts but no direct query found; inferred structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS partners_categories (
    id                  SERIAL          PRIMARY KEY,
    partner_no          INTEGER         NOT NULL REFERENCES partners_master(partner_no),
    category_name       TEXT
);

-- ============================================================================
-- 9. partners_past_projects
--    Source: TABLES.partnerPastProjects = "partners_past_projects"
--    Referenced in database.ts but no direct query found; inferred structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS partners_past_projects (
    id                  SERIAL          PRIMARY KEY,
    partner_no          INTEGER         NOT NULL REFERENCES partners_master(partner_no),
    project_name        TEXT,
    project_year        INTEGER,
    project_description TEXT
);

-- ============================================================================
-- 10. partners_branches
--     Source: TABLES.partnerBranches = "partners_branches"
--     Referenced in database.ts but no direct query found; inferred structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS partners_branches (
    id                  SERIAL          PRIMARY KEY,
    partner_no          INTEGER         NOT NULL REFERENCES partners_master(partner_no),
    branch_name         TEXT,
    branch_address      TEXT,
    branch_telephone    TEXT
);

-- ============================================================================
-- 11. partners_qualifications_unified
--     Source: TABLES.partnerQualificationsUnified = "partners_qualifications_unified"
--     Referenced in database.ts but no direct query found; inferred structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS partners_qualifications_unified (
    id                  SERIAL          PRIMARY KEY,
    partner_no          INTEGER         NOT NULL REFERENCES partners_master(partner_no),
    qualification_name  TEXT,
    grade               TEXT,
    valid_from          DATE,
    valid_until         DATE
);

-- ============================================================================
-- 12. partners_qualifications_orderers
--     Source: TABLES.partnerQualificationsOrderers = "partners_qualifications_orderers"
--     Referenced in database.ts but no direct query found; inferred structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS partners_qualifications_orderers (
    id                  SERIAL          PRIMARY KEY,
    partner_no          INTEGER         NOT NULL REFERENCES partners_master(partner_no),
    orderer_id          INTEGER         REFERENCES bid_orderers(orderer_id),
    qualification_name  TEXT,
    grade               TEXT
);

-- ============================================================================
-- 13. partners_qualifications_orderer_items
--     Source: TABLES.partnerQualificationsOrdererItems = "partners_qualifications_orderer_items"
--     Referenced in database.ts but no direct query found; inferred structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS partners_qualifications_orderer_items (
    id                      SERIAL      PRIMARY KEY,
    qualification_orderer_id INTEGER    REFERENCES partners_qualifications_orderers(id),
    item_name               TEXT,
    item_value              TEXT
);

-- ============================================================================
-- 14. backend_evaluation_statuses
--     Source: evaluationRepository.ts (updateWorkStatus, findById, findWithFilters)
--     TABLES.evaluationStatuses = "backend_evaluation_statuses"
--     UPSERT on "evaluationNo" with "workStatus", "currentStep", "updatedAt"
-- ============================================================================
CREATE TABLE IF NOT EXISTS backend_evaluation_statuses (
    "evaluationNo"      TEXT            PRIMARY KEY,
    "workStatus"        TEXT            NOT NULL DEFAULT 'not_started',
    "currentStep"       TEXT            DEFAULT 'judgment',
    "updatedAt"         TIMESTAMPTZ     DEFAULT NOW()
);

-- ============================================================================
-- 15. evaluation_assignees
--     Source: evaluationRepository.ts (findAssignees, updateAssignee)
--     TABLES.evaluationAssignees = "evaluation_assignees"
--     UPSERT on (evaluation_no, step_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS evaluation_assignees (
    evaluation_no       INTEGER         NOT NULL,
    step_id             TEXT            NOT NULL,
    contact_id          INTEGER,
    assigned_at         TIMESTAMPTZ     DEFAULT NOW(),
    PRIMARY KEY (evaluation_no, step_id)
);

-- ============================================================================
-- 16. announcements_documents_master
--     Source: announcementRepository.ts (findByNo, findDocumentMeta)
--            evaluationRepository.ts (findById)
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements_documents_master (
    document_id         TEXT            NOT NULL,
    announcement_id     INTEGER         NOT NULL REFERENCES bid_announcements(announcement_no),
    type                TEXT,
    title               TEXT,
    "fileFormat"        TEXT,
    "pageCount"         INTEGER,
    "extractedAt"       TEXT,
    save_path           TEXT,
    url                 TEXT,
    markdown_path       TEXT,
    PRIMARY KEY (announcement_id, document_id)
);

-- ============================================================================
-- 17. announcements_competing_companies_master
--     Source: announcementRepository.ts (findByNo)
--            evaluationRepository.ts (findById)
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements_competing_companies_master (
    announcement_id     INTEGER         NOT NULL REFERENCES bid_announcements(announcement_no),
    company_name        TEXT            NOT NULL,
    "isWinner"          BOOLEAN         DEFAULT FALSE,
    PRIMARY KEY (announcement_id, company_name)
);

-- ============================================================================
-- 18. announcements_competing_company_bids_master
--     Source: announcementRepository.ts (findByNo)
--            evaluationRepository.ts (findById)
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements_competing_company_bids_master (
    announcement_id     INTEGER         NOT NULL,
    company_name        TEXT            NOT NULL,
    bid_order           INTEGER         NOT NULL,
    bid_amount          BIGINT,
    PRIMARY KEY (announcement_id, company_name, bid_order),
    FOREIGN KEY (announcement_id, company_name)
        REFERENCES announcements_competing_companies_master(announcement_id, company_name)
);

-- ============================================================================
-- 19. announcements_estimated_amounts
--     Source: evaluationRepository.ts (findById, findWithFilters)
--     LEFT JOIN on announcement_no
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements_estimated_amounts (
    announcement_no         INTEGER     PRIMARY KEY REFERENCES bid_announcements(announcement_no),
    estimated_amount_min    BIGINT,
    estimated_amount_max    BIGINT
);

-- ============================================================================
-- 20. bid_requirements
--     Source: evaluationRepository.ts (findById)
--     Requirements text per announcement, joined by requirement_no
-- ============================================================================
CREATE TABLE IF NOT EXISTS bid_requirements (
    requirement_no      SERIAL          PRIMARY KEY,
    announcement_no     INTEGER         NOT NULL REFERENCES bid_announcements(announcement_no),
    requirement_text    TEXT
);

-- ============================================================================
-- 21. sufficient_requirements
--     Source: evaluationRepository.ts (findById)
--     Met requirements per announcement/office/requirement
-- ============================================================================
CREATE TABLE IF NOT EXISTS sufficient_requirements (
    id                      SERIAL      PRIMARY KEY,
    announcement_no         INTEGER     NOT NULL REFERENCES bid_announcements(announcement_no),
    company_no              INTEGER     REFERENCES company_master(company_no),
    office_no               INTEGER     REFERENCES office_master(office_no),
    requirement_no          INTEGER     NOT NULL REFERENCES bid_requirements(requirement_no),
    requirement_type        TEXT,
    requirement_description TEXT
);

-- ============================================================================
-- 22. insufficient_requirements
--     Source: evaluationRepository.ts (findById)
--     Unmet requirements per announcement/office/requirement
-- ============================================================================
CREATE TABLE IF NOT EXISTS insufficient_requirements (
    id                      SERIAL      PRIMARY KEY,
    announcement_no         INTEGER     NOT NULL REFERENCES bid_announcements(announcement_no),
    company_no              INTEGER     REFERENCES company_master(company_no),
    office_no               INTEGER     REFERENCES office_master(office_no),
    requirement_no          INTEGER     NOT NULL REFERENCES bid_requirements(requirement_no),
    requirement_type        TEXT,
    requirement_description TEXT
);

-- ============================================================================
-- 23. similar_cases_master
--     Source: announcementRepository.ts (findSimilarCases)
-- ============================================================================
CREATE TABLE IF NOT EXISTS similar_cases_master (
    announcement_id                 TEXT    NOT NULL,
    similar_case_announcement_id    TEXT    NOT NULL,
    case_name                       TEXT,
    winning_company                 TEXT,
    winning_amount                  BIGINT,
    PRIMARY KEY (announcement_id, similar_case_announcement_id)
);

-- ============================================================================
-- 24. similar_cases_competitors
--     Source: announcementRepository.ts (findSimilarCases)
-- ============================================================================
CREATE TABLE IF NOT EXISTS similar_cases_competitors (
    id                              SERIAL  PRIMARY KEY,
    similar_case_announcement_id    TEXT    NOT NULL,
    competitor_name                 TEXT    NOT NULL
);


-- ============================================================================
-- INDEXES
-- Performance indexes inferred from WHERE, JOIN, ORDER BY, and filter clauses
-- ============================================================================

-- bid_announcements: frequently filtered/sorted columns
CREATE INDEX IF NOT EXISTS idx_ba_category ON bid_announcements(category);
CREATE INDEX IF NOT EXISTS idx_ba_bidtype ON bid_announcements("bidType");
CREATE INDEX IF NOT EXISTS idx_ba_topagencyname ON bid_announcements("topAgencyName");
CREATE INDEX IF NOT EXISTS idx_ba_workplace ON bid_announcements("workPlace");
CREATE INDEX IF NOT EXISTS idx_ba_orderer_id ON bid_announcements(orderer_id);
CREATE INDEX IF NOT EXISTS idx_ba_publishdate ON bid_announcements("publishDate");
CREATE INDEX IF NOT EXISTS idx_ba_bidenddate ON bid_announcements("bidEndDate");

-- company_bid_judgement: JOIN and filter conditions
CREATE INDEX IF NOT EXISTS idx_cbj_announcement_no ON company_bid_judgement(announcement_no);
CREATE INDEX IF NOT EXISTS idx_cbj_company_no ON company_bid_judgement(company_no);
CREATE INDEX IF NOT EXISTS idx_cbj_office_no ON company_bid_judgement(office_no);
CREATE INDEX IF NOT EXISTS idx_cbj_company_office ON company_bid_judgement(company_no, office_no);
CREATE INDEX IF NOT EXISTS idx_cbj_evaluation_no ON company_bid_judgement(evaluation_no);

-- backend_evaluation_statuses: JOIN on evaluationNo
CREATE INDEX IF NOT EXISTS idx_eval_status ON backend_evaluation_statuses("evaluationNo");

-- evaluation_assignees: lookup by evaluation_no
CREATE INDEX IF NOT EXISTS idx_eval_assignees_eval_no ON evaluation_assignees(evaluation_no);

-- announcements_documents_master: JOIN on announcement_id
CREATE INDEX IF NOT EXISTS idx_doc_announcement_id ON announcements_documents_master(announcement_id);

-- announcements_competing_companies_master: JOIN on announcement_id
CREATE INDEX IF NOT EXISTS idx_cc_announcement_id ON announcements_competing_companies_master(announcement_id);

-- announcements_competing_company_bids_master: JOIN on announcement_id + company_name
CREATE INDEX IF NOT EXISTS idx_ccb_announcement_company ON announcements_competing_company_bids_master(announcement_id, company_name);

-- announcements_estimated_amounts: JOIN on announcement_no
CREATE INDEX IF NOT EXISTS idx_aea_announcement_no ON announcements_estimated_amounts(announcement_no);

-- bid_requirements: JOIN on announcement_no
CREATE INDEX IF NOT EXISTS idx_req_announcement_no ON bid_requirements(announcement_no);

-- sufficient_requirements: composite lookup
CREATE INDEX IF NOT EXISTS idx_suf_req ON sufficient_requirements(announcement_no, company_no, office_no);
CREATE INDEX IF NOT EXISTS idx_suf_req_reqno ON sufficient_requirements(requirement_no);

-- insufficient_requirements: composite lookup
CREATE INDEX IF NOT EXISTS idx_insuf_req ON insufficient_requirements(announcement_no, company_no, office_no);
CREATE INDEX IF NOT EXISTS idx_insuf_req_reqno ON insufficient_requirements(requirement_no);

-- similar_cases_master: lookup by announcement_id
CREATE INDEX IF NOT EXISTS idx_sc_announcement_id ON similar_cases_master(announcement_id);

-- similar_cases_competitors: lookup by similar_case_announcement_id
CREATE INDEX IF NOT EXISTS idx_scc_similar_id ON similar_cases_competitors(similar_case_announcement_id);

-- company_master: sorting by name
CREATE INDEX IF NOT EXISTS idx_cm_company_name ON company_master(company_name);

-- partners_master: sorting by partner_no
CREATE INDEX IF NOT EXISTS idx_pm_partner_no ON partners_master(partner_no);

-- partners_categories: lookup by partner_no
CREATE INDEX IF NOT EXISTS idx_pc_partner_no ON partners_categories(partner_no);

COMMIT;
