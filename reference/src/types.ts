/**
 * AOS Reference Gate — Type Definitions
 * 
 * These types implement the schemas defined in:
 * - AOS-LANG-001 v1.0 (Policy Language)
 * - AOS-API-001 v1.0 (Interface Specification)
 * - AOS-CORE-001 v1.0 (Deterministic Policy Gate)
 * - AOS-CRYPTO-001 v1.0 (Cryptographic Standards)
 * 
 * SPDX-License-Identifier: Apache-2.0
 */

// ─── Risk Tiers (POL-001 Section 5.1) ───────────────────────────────

export type RiskTier = 'T1' | 'T2' | 'T3' | 'T4';

// ─── Decisions (CORE-001 Section 4) ─────────────────────────────────

export type Decision = 'ALLOW' | 'DENY' | 'ESCALATE';

export type DenyReason =
  | 'TOOL_NOT_IN_POLICY'
  | 'TOOL_DISABLED'
  | 'CATEGORY_PROHIBITED'
  | 'SCOPE_VIOLATION'
  | 'BUDGET_EXCEEDED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_DENIED'
  | 'APPROVAL_EXPIRED'
  | 'RESTRICTION_VIOLATED'
  | 'GATE_ERROR';

// ─── Policy Document (LANG-001 Section 5) ───────────────────────────

export interface PolicyDocument {
  aplVersion: '1.0';
  policyId: string;
  policyVersion: string;
  policyHash: string;
  metadata: PolicyMetadata;
  base?: BasePolicy;
  mission: MissionPolicy;
}

export interface PolicyMetadata {
  name: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  heritageId?: string;
  status: 'DRAFT' | 'REVIEW' | 'TESTED' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
}

export interface BasePolicy {
  categories: CategoryDefinition;
  defaultBudget?: BudgetConfig;
  extensions?: Record<string, unknown>;
}

export interface MissionPolicy {
  name: string;
  sensitivity: 'standard' | 'sensitive' | 'critical';
  duration?: string;
  dataDomains: string[];
  actionDomains: string[];
  tools: ToolPermission[];
  globalBudget: BudgetConfig;
  categories: CategoryDefinition;
  approvalMatrix: ApprovalMatrix;
}

// ─── Tool Permissions (POL-001 Section 5.2) ─────────────────────────

export interface ToolPermission {
  name: string;
  enabled: boolean;
  riskTier: RiskTier;
  scope: ScopeConstraint;
  budget: BudgetConfig;
  requiresApproval?: ApprovalRequirement;
  blastRadius?: BlastRadiusDoc;
}

export interface ScopeConstraint {
  type: 'filesystem' | 'network' | 'database' | 'custom';
  constraints: FilesystemScope | NetworkScope | DatabaseScope | CustomScope;
}

export interface FilesystemScope {
  pathAllowlist: string[];
  pathDenylist: string[];
  maxFileSizeBytes?: number;
}

export interface NetworkScope {
  domainAllowlist: string[];
  domainDenylist: string[];
  protocolAllowlist: string[];
  portAllowlist?: number[];
  maxResponseBytes?: number;
}

export interface DatabaseScope {
  allowedTables: string[];
  deniedTables: string[];
  allowedColumns?: string[];
  deniedColumns: string[];
  allowedOperations: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[];
  maxRowsAffected?: number;
}

export interface CustomScope {
  [key: string]: unknown;
}

// ─── Budgets (POL-001 Section 5.3) ──────────────────────────────────

export interface BudgetConfig {
  limits: {
    calls?: number;
    bytes?: number;
    cost?: number;
    concurrency?: number;
  };
  window?: string; // ISO 8601 duration
}

// ─── Categories (POL-001 Section 5.4) ───────────────────────────────

export interface CategoryDefinition {
  prohibited: string[];
  classifierConfidence?: number;
}

// ─── Approvals (POL-001 Section 5.5) ────────────────────────────────

export interface ApprovalMatrix {
  [key: string]: { // risk tier or tool name
    requiresApproval: boolean;
    approvalType?: 'per-call' | 'first-use' | 'session';
    timeout?: string;
    approvers?: string[];
  };
}

export interface ApprovalRequirement {
  type: 'per-call' | 'first-use' | 'session';
  timeout: string;
  approvers: string[];
}

// ─── Blast Radius (POL-001 Section 7) ───────────────────────────────

export interface BlastRadiusDoc {
  scope: 'single-file' | 'directory' | 'database' | 'network' | 'system';
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  irreversibility: 'reversible' | 'partially-reversible' | 'irreversible';
  mitigations: string[];
}

// ─── Decision Request (API-001 Section 5) ───────────────────────────

export interface DecisionRequest {
  toolName: string;
  arguments: Record<string, unknown>;
  context: {
    agentId: string;
    sessionId: string;
    conversationId?: string;
    delegationId?: string;
    userMessage?: string;
  };
  metadata?: {
    requestedAt: string;
    clientVersion?: string;
  };
}

// ─── Decision Response (API-001 Section 5) ──────────────────────────

export interface DecisionResponse {
  requestId: string;
  decision: Decision;
  toolName: string;
  reason?: DenyReason;
  detail?: string;
  evaluationResult: EvaluationResult;
  governanceProof?: GovernanceProof;
  policySnapshot: PolicySnapshot;
  executionToken?: string;
  tokenExpiry?: string;
  approvalRequest?: ApprovalRequest;
}

export interface EvaluationResult {
  checks: {
    toolExists: boolean | null;
    toolEnabled: boolean | null;
    categoryClean: boolean | null;
    scopeValid: boolean | null;
    budgetAvailable: boolean | null;
    approvalGranted: boolean | null;
    restrictionValid: boolean | null;
  };
  budgetRemaining?: {
    calls?: number;
    bytes?: number;
  };
}

export interface PolicySnapshot {
  policyId: string;
  policyVersion: string;
  policyHash: string;
}

// ─── Governance Proof (CRYPTO-001) ──────────────────────────────────

export interface GovernanceProof {
  proofId: string;
  type: 'GOVERNANCE_PROOF';
  version: '1.0';
  gateId: string;
  requestId: string;
  decision: Decision;
  toolName: string;
  policyHash: string;
  timestamp: string;
  previousProofHash: string;
  contentHash: string;
  signature: string;
  chainDepth: number;
}

// ─── Approval (API-001 Section 7) ───────────────────────────────────

export interface ApprovalRequest {
  approvalId: string;
  approvers: string[];
  timeout: string;
  expiresAt: string;
}

export interface ApprovalDecision {
  decision: 'APPROVED' | 'DENIED';
  approvedBy: string;
  comment?: string;
  signature?: string;
}

// ─── Journal Entry (API-001 Section 6) ──────────────────────────────

export interface JournalEntry {
  entryId: string;
  requestId: string;
  timestamp: string;
  toolName: string;
  decision: Decision;
  reason: DenyReason | null;
  agentId: string;
  sessionId: string;
  policyId: string;
  policyVersion: string;
  policyHash: string;
  governanceProofId: string;
  executionConfirmed: boolean;
  budgetConsumed?: {
    calls: number;
    bytes: number;
  };
  previousEntryHash: string;
  entryHash: string;
}

// ─── Execution Confirmation (API-001 Section 5.2) ───────────────────

export interface ExecutionConfirmation {
  executionToken: string;
  result: {
    success: boolean;
    output?: string;
    sideEffects?: string[];
    executedAt: string;
    durationMs: number;
  };
}

// ─── Gate Configuration ─────────────────────────────────────────────

export interface GateConfig {
  gateId: string;
  tier: 'Foundation' | 'Enterprise' | 'Sovereign';
  tokenExpirySeconds: number;
  rateLimitPerMinute: number;
  categoryClassifier?: CategoryClassifier;
}

export interface CategoryClassifier {
  classify(content: string, categories: string[]): Promise<CategoryResult>;
}

export interface CategoryResult {
  prohibited: boolean;
  matchedCategory?: string;
  confidence: number;
}

// ─── Validation Result (LANG-001 Section 8) ─────────────────────────

export interface ValidationResult {
  valid: boolean;
  aplVersion: string;
  policyId: string;
  policyVersion: string;
  hashValid: boolean;
  computedHash: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  line?: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}

// ─── Health (API-001 Section 10.3) ──────────────────────────────────

export interface HealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  gateId: string;
  aplVersion: '1.0';
  policyLoaded: boolean;
  policyId?: string;
  journalIntegrity: 'VALID' | 'INVALID' | 'UNCHECKED';
  uptime: string;
}
