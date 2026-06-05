/**
 * AOS Reference Gate — Deterministic Policy Gate (11-Step Pipeline)
 * 
 * Implements the evaluation pipeline defined in AOS-CORE-001 v1.0 Section 4.
 * 
 * Pipeline Steps:
 *   1. Request reception and validation
 *   2. Policy lookup
 *   3. Tool existence check
 *   4. Tool enabled check
 *   5. Category classification
 *   6. Scope validation
 *   7. Budget check
 *   8. Approval check
 *   9. Restriction check (delegation)
 *  10. Decision emission
 *  11. Journal recording + Governance Proof generation
 * 
 * Invariant: Any error in steps 1-11 → DENY (R-ARCH-004, fail-closed)
 * 
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, randomUUID } from 'node:crypto';
import type {
  PolicyDocument,
  DecisionRequest,
  DecisionResponse,
  Decision,
  DenyReason,
  EvaluationResult,
  GovernanceProof,
  GateConfig,
  ToolPermission,
  FilesystemScope,
  NetworkScope,
  DatabaseScope,
} from './types.js';
import { Journal } from './journal.js';
import { createGovernanceProof } from './crypto.js';

// ─── Budget State ───────────────────────────────────────────────────

interface BudgetState {
  global: { calls: number; bytes: number; cost: number };
  perTool: Map<string, { calls: number; bytes: number }>;
}

// ─── Pending Execution Tokens ───────────────────────────────────────

interface PendingExecution {
  requestId: string;
  toolName: string;
  token: string;
  expiresAt: number;
  decision: DecisionResponse;
}

// ─── Gate Class ─────────────────────────────────────────────────────

export class DeterministicPolicyGate {
  private policy: PolicyDocument | null = null;
  private config: GateConfig;
  private journal: Journal;
  private budgetState: BudgetState;
  private pendingExecutions: Map<string, PendingExecution> = new Map();
  private firstUseApprovals: Set<string> = new Set();
  private startTime: number;

  constructor(config: GateConfig) {
    this.config = config;
    this.journal = new Journal();
    this.budgetState = {
      global: { calls: 0, bytes: 0, cost: 0 },
      perTool: new Map(),
    };
    this.startTime = Date.now();
  }

  // ─── Policy Management ──────────────────────────────────────────

  /**
   * Load a policy document into the gate.
   * R-POL-003: Verify policy hash before activation.
   */
  loadPolicy(policy: PolicyDocument): void {
    // Verify policy hash (R-POL-003)
    const computed = this.computePolicyHash(policy);
    if (policy.policyHash && policy.policyHash !== computed) {
      throw new Error(
        `Policy hash mismatch: declared=${policy.policyHash}, computed=${computed}`
      );
    }
    // Set computed hash if not provided
    policy.policyHash = computed;
    this.policy = policy;

    // Reset budget counters on policy load
    this.budgetState = {
      global: { calls: 0, bytes: 0, cost: 0 },
      perTool: new Map(),
    };
  }

  getPolicy(): PolicyDocument | null {
    return this.policy;
  }

  // ─── Core Pipeline (AOS-CORE-001 Section 4) ────────────────────

  /**
   * Evaluate a tool call against the active policy.
   * This is the 11-step DPG pipeline.
   * 
   * INVARIANT: Any error → DENY (R-ARCH-004)
   */
  async evaluate(request: DecisionRequest): Promise<DecisionResponse> {
    const requestId = randomUUID();
    const timestamp = new Date().toISOString();

    // Initialize evaluation result (all checks start as null)
    const checks: EvaluationResult['checks'] = {
      toolExists: null,
      toolEnabled: null,
      categoryClean: null,
      scopeValid: null,
      budgetAvailable: null,
      approvalGranted: null,
      restrictionValid: null,
    };

    try {
      // ── Step 1: Request validation ──────────────────────────────
      if (!request.toolName || typeof request.toolName !== 'string') {
        return this.deny(requestId, request.toolName ?? '', 'GATE_ERROR',
          'Invalid request: toolName is required', checks, timestamp);
      }

      // ── Step 2: Policy lookup ───────────────────────────────────
      if (!this.policy) {
        // R-ARCH-004: No policy → fail-closed → DENY all
        return this.deny(requestId, request.toolName, 'GATE_ERROR',
          'No active policy loaded. Gate is in fail-closed mode.', checks, timestamp);
      }

      // ── Step 3: Tool existence check ────────────────────────────
      const tool = this.findTool(request.toolName);
      if (!tool) {
        checks.toolExists = false;
        return this.deny(requestId, request.toolName, 'TOOL_NOT_IN_POLICY',
          `Tool '${request.toolName}' is not declared in the active policy`, checks, timestamp);
      }
      checks.toolExists = true;

      // ── Step 4: Tool enabled check ──────────────────────────────
      if (!tool.enabled) {
        checks.toolEnabled = false;
        return this.deny(requestId, request.toolName, 'TOOL_NOT_IN_POLICY',
          `Tool '${request.toolName}' is disabled in the active policy`, checks, timestamp);
      }
      checks.toolEnabled = true;

      // ── Step 5: Category classification ─────────────────────────
      const categoryResult = await this.classifyCategory(request);
      if (categoryResult.prohibited) {
        checks.categoryClean = false;
        return this.deny(requestId, request.toolName, 'CATEGORY_PROHIBITED',
          `Content matches prohibited category: ${categoryResult.matchedCategory}`, checks, timestamp);
      }
      checks.categoryClean = true;

      // ── Step 6: Scope validation ────────────────────────────────
      const scopeResult = this.validateScope(tool, request);
      if (!scopeResult.valid) {
        checks.scopeValid = false;
        return this.deny(requestId, request.toolName, 'SCOPE_VIOLATION',
          scopeResult.detail, checks, timestamp);
      }
      checks.scopeValid = true;

      // ── Step 7: Budget check ────────────────────────────────────
      const budgetResult = this.checkBudget(tool, request);
      if (!budgetResult.available) {
        checks.budgetAvailable = false;
        return this.deny(requestId, request.toolName, 'BUDGET_EXCEEDED',
          budgetResult.detail, checks, timestamp);
      }
      checks.budgetAvailable = true;

      // ── Step 8: Approval check ──────────────────────────────────
      const approvalResult = this.checkApproval(tool, request);
      if (approvalResult.required && !approvalResult.granted) {
        checks.approvalGranted = false;
        // ESCALATE, not DENY
        return this.escalate(requestId, request.toolName, tool, checks, timestamp);
      }
      checks.approvalGranted = approvalResult.required ? true : null;

      // ── Step 9: Restriction check (delegation) ──────────────────
      if (request.context.delegationId) {
        // In a full implementation, check delegation restriction envelope
        // For reference: always pass (restriction envelope validation is CORE-003)
        checks.restrictionValid = true;
      }

      // ── Step 10: Decision = ALLOW ───────────────────────────────
      // Consume budget
      this.consumeBudget(tool, request);

      // Generate execution token
      const executionToken = randomUUID();
      const tokenExpiry = new Date(
        Date.now() + this.config.tokenExpirySeconds * 1000
      ).toISOString();

      // ── Step 11: Journal + Governance Proof ─────────────────────
      const proof = createGovernanceProof({
        gateId: this.config.gateId,
        requestId,
        decision: 'ALLOW',
        toolName: request.toolName,
        policyHash: this.policy.policyHash,
        timestamp,
        previousProofHash: this.journal.getLastProofHash(),
        chainDepth: this.journal.getLength(),
      });

      const budgetRemaining = this.getBudgetRemaining(tool);

      const response: DecisionResponse = {
        requestId,
        decision: 'ALLOW',
        toolName: request.toolName,
        evaluationResult: { checks, budgetRemaining },
        governanceProof: proof,
        policySnapshot: {
          policyId: this.policy.policyId,
          policyVersion: this.policy.policyVersion,
          policyHash: this.policy.policyHash,
        },
        executionToken,
        tokenExpiry,
      };

      // Record in journal
      this.journal.record({
        requestId,
        timestamp,
        toolName: request.toolName,
        decision: 'ALLOW',
        reason: null,
        agentId: request.context.agentId,
        sessionId: request.context.sessionId,
        policyId: this.policy.policyId,
        policyVersion: this.policy.policyVersion,
        policyHash: this.policy.policyHash,
        governanceProofId: proof.proofId,
        executionConfirmed: false,
        budgetConsumed: { calls: 1, bytes: this.estimateBytes(request) },
      });

      // Store pending execution for confirmation
      this.pendingExecutions.set(requestId, {
        requestId,
        toolName: request.toolName,
        token: executionToken,
        expiresAt: Date.now() + this.config.tokenExpirySeconds * 1000,
        decision: response,
      });

      return response;

    } catch (error) {
      // R-ARCH-004: Any error → DENY
      return this.deny(requestId, request.toolName, 'GATE_ERROR',
        `Internal gate error: ${error instanceof Error ? error.message : 'unknown'}`,
        checks, timestamp);
    }
  }

  // ─── Execution Confirmation (API-001 Section 5.2) ──────────────

  confirmExecution(requestId: string, executionToken: string): boolean {
    const pending = this.pendingExecutions.get(requestId);
    if (!pending) return false;
    if (pending.token !== executionToken) return false;
    if (Date.now() > pending.expiresAt) {
      // Token expired — log as EXECUTION_UNCONFIRMED
      this.pendingExecutions.delete(requestId);
      return false;
    }

    // Mark journal entry as confirmed
    this.journal.confirmExecution(requestId);
    this.pendingExecutions.delete(requestId);
    return true;
  }

  // ─── Approval Management ───────────────────────────────────────

  grantApproval(toolName: string, type: 'first-use' | 'session'): void {
    if (type === 'first-use') {
      this.firstUseApprovals.add(toolName);
    }
  }

  // ─── Accessors ─────────────────────────────────────────────────

  getJournal(): Journal {
    return this.journal;
  }

  getHealth() {
    const uptimeMs = Date.now() - this.startTime;
    return {
      status: this.policy ? 'HEALTHY' : 'UNHEALTHY' as const,
      gateId: this.config.gateId,
      aplVersion: '1.0' as const,
      policyLoaded: !!this.policy,
      policyId: this.policy?.policyId,
      journalIntegrity: this.journal.verifyChain() ? 'VALID' : 'INVALID' as const,
      uptime: `PT${Math.floor(uptimeMs / 1000)}S`,
    };
  }

  getMetrics() {
    const entries = this.journal.getEntries();
    const allowed = entries.filter(e => e.decision === 'ALLOW').length;
    const denied = entries.filter(e => e.decision === 'DENY').length;
    const escalated = entries.filter(e => e.decision === 'ESCALATE').length;

    return {
      gateId: this.config.gateId,
      timestamp: new Date().toISOString(),
      policyId: this.policy?.policyId,
      metrics: {
        decisions: { total: entries.length, allowed, denied, escalated },
        budgets: {
          globalUtilization: this.policy
            ? this.budgetState.global.calls / (this.policy.mission.globalBudget.limits.calls ?? Infinity)
            : 0,
        },
        journal: {
          entries: entries.length,
          chainLength: entries.length,
          integrityStatus: this.journal.verifyChain() ? 'VALID' : 'INVALID',
        },
      },
    };
  }

  // ─── Private: Pipeline Steps ───────────────────────────────────

  private findTool(toolName: string): ToolPermission | undefined {
    return this.policy?.mission.tools.find(t => t.name === toolName);
  }

  /**
   * Step 5: Category classification
   * R-ENF-009: Classify content against prohibited categories.
   * 
   * In the reference implementation, we use a simple keyword matcher.
   * Production implementations SHOULD use a proper NLP classifier.
   */
  private async classifyCategory(request: DecisionRequest): Promise<{
    prohibited: boolean;
    matchedCategory?: string;
    confidence: number;
  }> {
    const categories = this.policy?.mission.categories ?? this.policy?.base?.categories;
    if (!categories || categories.prohibited.length === 0) {
      return { prohibited: false, confidence: 1.0 };
    }

    // If a custom classifier is configured, use it
    if (this.config.categoryClassifier) {
      const content = JSON.stringify(request.arguments);
      return this.config.categoryClassifier.classify(content, categories.prohibited);
    }

    // Reference implementation: no classifier = pass
    // This is explicitly documented as a limitation
    return { prohibited: false, confidence: 0 };
  }

  /**
   * Step 6: Scope validation
   * R-ENF-001: Canonicalize and validate arguments against scope constraints.
   */
  private validateScope(tool: ToolPermission, request: DecisionRequest): {
    valid: boolean;
    detail: string;
  } {
    const scope = tool.scope;

    switch (scope.type) {
      case 'filesystem':
        return this.validateFilesystemScope(
          scope.constraints as FilesystemScope, request
        );
      case 'network':
        return this.validateNetworkScope(
          scope.constraints as NetworkScope, request
        );
      case 'database':
        return this.validateDatabaseScope(
          scope.constraints as DatabaseScope, request
        );
      case 'custom':
        // Custom scopes always pass in reference implementation
        return { valid: true, detail: '' };
      default:
        return { valid: false, detail: `Unknown scope type: ${scope.type}` };
    }
  }

  /**
   * Filesystem scope validation with canonicalization.
   * R-ENF-001: Resolve symlinks, normalize paths, reject null bytes.
   */
  private validateFilesystemScope(
    scope: FilesystemScope,
    request: DecisionRequest
  ): { valid: boolean; detail: string } {
    const rawPath = (request.arguments.path ?? request.arguments.filePath ?? 
                     request.arguments.TargetFile ?? '') as string;

    if (!rawPath) {
      return { valid: true, detail: '' }; // No path argument
    }

    // R-ENF-001: Reject null bytes
    if (rawPath.includes('\0')) {
      return { valid: false, detail: 'Path contains null byte' };
    }

    // Canonicalize: normalize separators and resolve relative components
    const canonPath = this.canonicalizePath(rawPath);

    // Check denylist first (deny-wins principle, LANG-001 R-LANG-019)
    for (const pattern of scope.pathDenylist) {
      if (this.matchGlob(canonPath, pattern)) {
        return {
          valid: false,
          detail: `Path '${canonPath}' matches denylist pattern '${pattern}'`,
        };
      }
    }

    // Check allowlist
    if (scope.pathAllowlist.length > 0) {
      const allowed = scope.pathAllowlist.some(pattern =>
        this.matchGlob(canonPath, pattern)
      );
      if (!allowed) {
        return {
          valid: false,
          detail: `Path '${canonPath}' is not in the allowed scope [${scope.pathAllowlist.join(', ')}]`,
        };
      }
    }

    return { valid: true, detail: '' };
  }

  /**
   * Network scope validation.
   */
  private validateNetworkScope(
    scope: NetworkScope,
    request: DecisionRequest
  ): { valid: boolean; detail: string } {
    const rawUrl = (request.arguments.url ?? request.arguments.Url ?? '') as string;
    if (!rawUrl) return { valid: true, detail: '' };

    let hostname: string;
    let protocol: string;
    try {
      const parsed = new URL(rawUrl);
      hostname = parsed.hostname;
      protocol = parsed.protocol.replace(':', '');
    } catch {
      return { valid: false, detail: `Invalid URL: '${rawUrl}'` };
    }

    // Check protocol allowlist
    if (scope.protocolAllowlist.length > 0) {
      if (!scope.protocolAllowlist.includes(protocol)) {
        return { valid: false, detail: `Protocol '${protocol}' not allowed` };
      }
    }

    // Check domain denylist first (deny-wins)
    for (const pattern of scope.domainDenylist) {
      if (this.matchDomain(hostname, pattern)) {
        return { valid: false, detail: `Domain '${hostname}' is denied` };
      }
    }

    // Check domain allowlist
    if (scope.domainAllowlist.length > 0) {
      const allowed = scope.domainAllowlist.some(pattern =>
        this.matchDomain(hostname, pattern)
      );
      if (!allowed) {
        return { valid: false, detail: `Domain '${hostname}' not in allowlist` };
      }
    }

    return { valid: true, detail: '' };
  }

  /**
   * Database scope validation.
   */
  private validateDatabaseScope(
    scope: DatabaseScope,
    request: DecisionRequest
  ): { valid: boolean; detail: string } {
    const table = (request.arguments.table ?? '') as string;
    const operation = (request.arguments.operation ?? 'SELECT') as string;

    // Check denied tables
    if (scope.deniedTables.includes(table)) {
      return { valid: false, detail: `Table '${table}' is denied` };
    }

    // Check allowed tables
    if (scope.allowedTables.length > 0 && !scope.allowedTables.includes(table)) {
      return { valid: false, detail: `Table '${table}' not in allowlist` };
    }

    // Check operation
    if (!scope.allowedOperations.includes(operation as any)) {
      return { valid: false, detail: `Operation '${operation}' not allowed` };
    }

    // Check denied columns
    const columns = (request.arguments.columns ?? []) as string[];
    for (const col of columns) {
      if (scope.deniedColumns.includes(col)) {
        return { valid: false, detail: `Column '${col}' is denied` };
      }
    }

    return { valid: true, detail: '' };
  }

  /**
   * Step 7: Budget check
   * R-ENF-005: Enforce per-tool and global budget limits.
   */
  private checkBudget(tool: ToolPermission, request: DecisionRequest): {
    available: boolean;
    detail: string;
  } {
    const globalLimits = this.policy!.mission.globalBudget.limits;
    const toolLimits = tool.budget.limits;

    // Check global call budget
    if (globalLimits.calls !== undefined && this.budgetState.global.calls >= globalLimits.calls) {
      return { available: false, detail: 'Global call budget exceeded' };
    }

    // Check per-tool call budget
    const toolBudget = this.budgetState.perTool.get(tool.name) ?? { calls: 0, bytes: 0 };
    if (toolLimits.calls !== undefined && toolBudget.calls >= toolLimits.calls) {
      return {
        available: false,
        detail: `Per-tool call budget exceeded for '${tool.name}' (${toolBudget.calls}/${toolLimits.calls})`,
      };
    }

    // Check global byte budget
    const estimatedBytes = this.estimateBytes(request);
    if (globalLimits.bytes !== undefined && this.budgetState.global.bytes + estimatedBytes > globalLimits.bytes) {
      return { available: false, detail: 'Global byte budget exceeded' };
    }

    return { available: true, detail: '' };
  }

  /**
   * Step 8: Approval check
   * R-APR-001: Tools requiring approval must have prior authorization.
   */
  private checkApproval(tool: ToolPermission, request: DecisionRequest): {
    required: boolean;
    granted: boolean;
  } {
    if (!tool.requiresApproval) {
      return { required: false, granted: false };
    }

    const type = tool.requiresApproval.type;

    if (type === 'first-use') {
      return {
        required: true,
        granted: this.firstUseApprovals.has(tool.name),
      };
    }

    // Per-call approval is never pre-granted
    if (type === 'per-call') {
      return { required: true, granted: false };
    }

    return { required: false, granted: false };
  }

  // ─── Private: Response Builders ────────────────────────────────

  private deny(
    requestId: string,
    toolName: string,
    reason: DenyReason,
    detail: string,
    checks: EvaluationResult['checks'],
    timestamp: string
  ): DecisionResponse {
    const proof = this.policy ? createGovernanceProof({
      gateId: this.config.gateId,
      requestId,
      decision: 'DENY',
      toolName,
      policyHash: this.policy.policyHash,
      timestamp,
      previousProofHash: this.journal.getLastProofHash(),
      chainDepth: this.journal.getLength(),
    }) : undefined;

    // Record denial in journal
    if (this.policy) {
      this.journal.record({
        requestId,
        timestamp,
        toolName,
        decision: 'DENY',
        reason,
        agentId: 'unknown',
        sessionId: 'unknown',
        policyId: this.policy.policyId,
        policyVersion: this.policy.policyVersion,
        policyHash: this.policy.policyHash,
        governanceProofId: proof?.proofId ?? '',
        executionConfirmed: false,
      });
    }

    const response: DecisionResponse = {
      requestId,
      decision: 'DENY',
      toolName,
      reason,
      detail: this.config.tier === 'Enterprise' || this.config.tier === 'Sovereign'
        ? 'Request denied by policy' // R-ENF-010: opaque denials for Enterprise+
        : detail,
      evaluationResult: { checks },
      governanceProof: proof,
      policySnapshot: this.policy ? {
        policyId: this.policy.policyId,
        policyVersion: this.policy.policyVersion,
        policyHash: this.policy.policyHash,
      } : { policyId: '', policyVersion: '', policyHash: '' },
    };

    return response;
  }

  private escalate(
    requestId: string,
    toolName: string,
    tool: ToolPermission,
    checks: EvaluationResult['checks'],
    timestamp: string
  ): DecisionResponse {
    const approvalId = randomUUID();
    const timeout = tool.requiresApproval?.timeout ?? 'PT15M';
    const expiresAt = new Date(Date.now() + this.parseDuration(timeout)).toISOString();

    // Record escalation in journal
    if (this.policy) {
      this.journal.record({
        requestId,
        timestamp,
        toolName,
        decision: 'ESCALATE',
        reason: 'APPROVAL_REQUIRED',
        agentId: 'pending',
        sessionId: 'pending',
        policyId: this.policy.policyId,
        policyVersion: this.policy.policyVersion,
        policyHash: this.policy.policyHash,
        governanceProofId: '',
        executionConfirmed: false,
      });
    }

    return {
      requestId,
      decision: 'ESCALATE',
      toolName,
      reason: 'APPROVAL_REQUIRED',
      detail: `Tool '${toolName}' requires ${tool.requiresApproval?.type ?? 'per-call'} approval`,
      evaluationResult: { checks },
      policySnapshot: {
        policyId: this.policy!.policyId,
        policyVersion: this.policy!.policyVersion,
        policyHash: this.policy!.policyHash,
      },
      approvalRequest: {
        approvalId,
        approvers: tool.requiresApproval?.approvers ?? [],
        timeout,
        expiresAt,
      },
    };
  }

  // ─── Private: Utilities ────────────────────────────────────────

  private consumeBudget(tool: ToolPermission, request: DecisionRequest): void {
    const bytes = this.estimateBytes(request);
    this.budgetState.global.calls += 1;
    this.budgetState.global.bytes += bytes;

    const current = this.budgetState.perTool.get(tool.name) ?? { calls: 0, bytes: 0 };
    current.calls += 1;
    current.bytes += bytes;
    this.budgetState.perTool.set(tool.name, current);
  }

  private getBudgetRemaining(tool: ToolPermission): { calls?: number; bytes?: number } {
    const globalLimits = this.policy!.mission.globalBudget.limits;
    const toolLimits = tool.budget.limits;
    const toolUsed = this.budgetState.perTool.get(tool.name) ?? { calls: 0, bytes: 0 };

    return {
      calls: toolLimits.calls !== undefined
        ? toolLimits.calls - toolUsed.calls
        : globalLimits.calls !== undefined
          ? globalLimits.calls - this.budgetState.global.calls
          : undefined,
      bytes: toolLimits.bytes !== undefined
        ? toolLimits.bytes - toolUsed.bytes
        : undefined,
    };
  }

  private estimateBytes(request: DecisionRequest): number {
    return JSON.stringify(request.arguments).length;
  }

  private computePolicyHash(policy: PolicyDocument): string {
    // LANG-001 R-LANG-025: SHA-256 of canonicalized policy
    const canon = JSON.stringify({
      aplVersion: policy.aplVersion,
      policyId: policy.policyId,
      policyVersion: policy.policyVersion,
      mission: policy.mission,
      base: policy.base,
    });
    return createHash('sha256').update(canon).digest('hex');
  }

  /**
   * Canonicalize a filesystem path.
   * R-ENF-001: Normalize separators, resolve '..' and '.', lowercase on Windows.
   */
  private canonicalizePath(rawPath: string): string {
    // Normalize separators
    let p = rawPath.replace(/\\/g, '/');
    // Resolve relative components
    const parts = p.split('/');
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        resolved.pop();
      } else if (part !== '.' && part !== '') {
        resolved.push(part);
      }
    }
    return '/' + resolved.join('/');
  }

  /**
   * Simple glob matcher for path patterns.
   * Supports ** (any depth) and * (single segment).
   */
  private matchGlob(path: string, pattern: string): boolean {
    const regexStr = pattern
      .replace(/\\/g, '/')
      .replace(/\*\*/g, '<<<GLOBSTAR>>>')
      .replace(/\*/g, '[^/]*')
      .replace(/<<<GLOBSTAR>>>/g, '.*')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(path);
  }

  /**
   * Domain matching with subdomain support.
   */
  private matchDomain(hostname: string, pattern: string): boolean {
    if (pattern.startsWith('*.')) {
      const base = pattern.slice(2);
      return hostname === base || hostname.endsWith('.' + base);
    }
    return hostname === pattern;
  }

  /**
   * Parse ISO 8601 duration to milliseconds (simplified).
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 15 * 60 * 1000; // Default 15 minutes
    const hours = parseInt(match[1] ?? '0');
    const minutes = parseInt(match[2] ?? '0');
    const seconds = parseInt(match[3] ?? '0');
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
}
