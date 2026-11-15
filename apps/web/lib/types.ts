export type WorkspaceId =
  | "all"
  | "ri-kemnaker"
  | "ri-uupdp"
  | "nusaworks-corp"
  | "custom-tenant";

export interface CustomUploadedDoc {
  id: string;
  title: string;
  version: string;
  filename: string;
  workspace_id: string;
  tenant_name: string;
  content: string;
  uploaded_at: string;
}

export interface Citation {
  chunk_id: string;
  document_id: string;
  document_title: string;
  document_version: string;
  section_path: string;
  retrieval_score: number;
  source_pdf_url: string | null;
  workspace_id?: string;
}

export interface ChatResponse {
  trace_id: string;
  answer: string;
  was_refused: boolean;
  citations: Citation[];
  model: string;
  latency_ms: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  version: string;
  source_uri: string;
  source_pdf_url: string | null;
  source_pdf_available: boolean;
  index_status: string;
  indexed_at: string | null;
  workspace_id?: string;
}

export interface AuditFinding {
  id: string;
  severity: "critical" | "warning" | "compliant";
  title: string;
  original_clause: string;
  regulation_reference: string;
  issue_analysis: string;
  replacement_clause: string;
}

export interface PolicyAuditResponse {
  audit_id: string;
  document_type: string;
  compliance_score: number;
  summary: string;
  findings: AuditFinding[];
  rewritten_document: string;
  model: string;
  latency_ms: number;
}

export type CalculationScenario =
  | "pkwt_compensation"
  | "phk_severance"
  | "pdp_breach_notice";

export interface StatutoryCalculationInput {
  scenario: CalculationScenario;
  company_name: string;
  employee_or_dpo_name: string;
  role_title: string;
  monthly_base_salary: number;
  monthly_fixed_allowance: number;
  tenure_months: number;
  overtime_weekday_hours: number;
  remaining_leave_days: number;
  phk_reason:
    | "efficiency_prevent_loss"
    | "efficiency_with_loss"
    | "company_closed_loss"
    | "violation_sp"
    | "retirement"
    | "resignation";
  breach_affected_subjects?: number;
  breach_data_types?: string;
  breach_discovery_time?: string;
}

export interface CalculationLineItem {
  label: string;
  formula_used: string;
  legal_basis: string;
  amount_idr: number;
}

export interface StatutoryCalculationResponse {
  scenario: CalculationScenario;
  total_amount_idr: number;
  line_items: CalculationLineItem[];
  legal_references: string[];
  official_letter_markdown: string;
  generated_at: string;
}
