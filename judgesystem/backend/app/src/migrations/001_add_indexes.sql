CREATE INDEX IF NOT EXISTS idx_cbj_announcement_no ON company_bid_judgement(announcement_no);
CREATE INDEX IF NOT EXISTS idx_cbj_company_office ON company_bid_judgement(company_no, office_no);
CREATE INDEX IF NOT EXISTS idx_req_announcement_no ON bid_requirements(announcement_no);
CREATE INDEX IF NOT EXISTS idx_doc_announcement_id ON bid_announcements_document_table(announcement_id);
CREATE INDEX IF NOT EXISTS idx_eval_status ON backend_evaluation_statuses(evaluation_no);
CREATE INDEX IF NOT EXISTS idx_suf_req ON sufficient_requirements(announcement_no, company_no, office_no);
CREATE INDEX IF NOT EXISTS idx_insuf_req ON insufficient_requirements(announcement_no, company_no, office_no);
