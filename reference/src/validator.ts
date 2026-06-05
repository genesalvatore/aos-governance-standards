/**
 * AOS Reference Gate — Policy Validator
 * 
 * Implements the validation rules defined in:
 * - AOS-LANG-001 v1.0 Section 8 (Validation Rules)
 * - AOS-POL-001 v1.0 (Policy Authoring Guide)
 * 
 * Validation phases:
 *   1. Syntactic validation (JSON structure)
 *   2. Semantic validation (business rules)
 *   3. Cross-reference validation (internal consistency)
 * 
 * SPDX-License-Identifier: Apache-2.0
 */

import { sha256 } from './crypto.js';
import type {
  PolicyDocument,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  RiskTier,
} from './types.js';

// ─── Mandatory Prohibited Categories (POL-001 R-POL-A-015) ─────────

const MANDATORY_CATEGORIES = [
  'child_exploitation',
  'weapons_of_mass_destruction',
  'critical_infrastructure_attack',
];

// ─── Validate Policy ────────────────────────────────────────────────

/**
 * Validate an APL policy document against AOS-LANG-001 rules.
 * Returns structured results with error codes.
 */
export function validatePolicy(policy: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ── Phase 1: Syntactic Validation ─────────────────────────────

  // SYN-001: Must be a valid JSON object
  if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) {
    errors.push({
      code: 'SYN-001',
      message: 'Policy must be a JSON object',
    });
    return buildResult(false, errors, warnings, policy);
  }

  const doc = policy as Record<string, unknown>;

  // SYN-002: aplVersion must be "1.0"
  if (doc.aplVersion !== '1.0') {
    errors.push({
      code: 'SYN-002',
      message: `aplVersion must be "1.0", got "${doc.aplVersion}"`,
      path: 'aplVersion',
    });
  }

  // SYN-003: policyId required
  if (!doc.policyId || typeof doc.policyId !== 'string') {
    errors.push({
      code: 'SYN-003',
      message: 'policyId is required and must be a string',
      path: 'policyId',
    });
  }

  // SYN-004: policyVersion required
  if (!doc.policyVersion || typeof doc.policyVersion !== 'string') {
    errors.push({
      code: 'SYN-004',
      message: 'policyVersion is required and must be a string',
      path: 'policyVersion',
    });
  }

  // SYN-005: mission block required
  if (!doc.mission || typeof doc.mission !== 'object') {
    errors.push({
      code: 'SYN-005',
      message: 'mission block is required',
      path: 'mission',
    });
    return buildResult(false, errors, warnings, policy);
  }

  const mission = doc.mission as Record<string, unknown>;

  // SYN-006: mission.name required
  if (!mission.name || typeof mission.name !== 'string') {
    errors.push({
      code: 'SYN-006',
      message: 'mission.name is required',
      path: 'mission.name',
    });
  }

  // SYN-007: mission.sensitivity must be valid value
  const validSensitivities = ['standard', 'sensitive', 'critical'];
  if (!validSensitivities.includes(mission.sensitivity as string)) {
    errors.push({
      code: 'SYN-007',
      message: `mission.sensitivity must be one of: ${validSensitivities.join(', ')}`,
      path: 'mission.sensitivity',
    });
  }

  // SYN-008: mission.tools must be an array
  if (!Array.isArray(mission.tools)) {
    errors.push({
      code: 'SYN-008',
      message: 'mission.tools must be an array',
      path: 'mission.tools',
    });
    return buildResult(false, errors, warnings, policy);
  }

  // SYN-009: Each tool must have required fields
  const tools = mission.tools as Record<string, unknown>[];
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const prefix = `mission.tools[${i}]`;

    if (!tool.name || typeof tool.name !== 'string') {
      errors.push({
        code: 'SYN-009',
        message: `Tool at index ${i} must have a 'name' string`,
        path: `${prefix}.name`,
      });
    }

    if (typeof tool.enabled !== 'boolean') {
      errors.push({
        code: 'SYN-009',
        message: `Tool '${tool.name}' must have an 'enabled' boolean`,
        path: `${prefix}.enabled`,
      });
    }

    // SYN-010: riskTier required and valid
    const validTiers: RiskTier[] = ['T1', 'T2', 'T3', 'T4'];
    if (!validTiers.includes(tool.riskTier as RiskTier)) {
      errors.push({
        code: 'SYN-010',
        message: `Tool '${tool.name}' must have a valid riskTier (T1-T4), got '${tool.riskTier}'`,
        path: `${prefix}.riskTier`,
      });
    }

    // SYN-011: scope required
    if (!tool.scope || typeof tool.scope !== 'object') {
      errors.push({
        code: 'SYN-011',
        message: `Tool '${tool.name}' must have a 'scope' object`,
        path: `${prefix}.scope`,
      });
    }

    // SYN-012: budget required
    if (!tool.budget || typeof tool.budget !== 'object') {
      errors.push({
        code: 'SYN-012',
        message: `Tool '${tool.name}' must have a 'budget' object`,
        path: `${prefix}.budget`,
      });
    }
  }

  // ── Phase 2: Semantic Validation ──────────────────────────────

  // SEM-001: globalBudget required
  if (!mission.globalBudget || typeof mission.globalBudget !== 'object') {
    errors.push({
      code: 'SEM-001',
      message: 'mission.globalBudget is required',
      path: 'mission.globalBudget',
    });
  }

  // SEM-002: categories required
  if (!mission.categories || typeof mission.categories !== 'object') {
    errors.push({
      code: 'SEM-002',
      message: 'mission.categories is required',
      path: 'mission.categories',
    });
  } else {
    const cats = mission.categories as Record<string, unknown>;

    // SEM-003: Mandatory prohibited categories (POL-001 R-POL-A-015)
    if (!Array.isArray(cats.prohibited)) {
      errors.push({
        code: 'SEM-003',
        message: 'categories.prohibited must be an array',
        path: 'mission.categories.prohibited',
      });
    } else {
      for (const required of MANDATORY_CATEGORIES) {
        if (!cats.prohibited.includes(required)) {
          errors.push({
            code: 'SEM-003',
            message: `Missing mandatory prohibited category: '${required}'`,
            path: 'mission.categories.prohibited',
          });
        }
      }
    }
  }

  // SEM-004: Duplicate tool names
  const toolNames = tools.map(t => t.name as string).filter(Boolean);
  const duplicates = toolNames.filter((name, index) =>
    toolNames.indexOf(name) !== index
  );
  if (duplicates.length > 0) {
    errors.push({
      code: 'SEM-004',
      message: `Duplicate tool names: ${[...new Set(duplicates)].join(', ')}`,
      path: 'mission.tools',
    });
  }

  // SEM-005: Empty tools array
  if (tools.length === 0) {
    errors.push({
      code: 'SEM-005',
      message: 'Policy must define at least one tool',
      path: 'mission.tools',
    });
  }

  // SEM-006: dataDomains and actionDomains
  if (!Array.isArray(mission.dataDomains) || mission.dataDomains.length === 0) {
    warnings.push({
      code: 'SEM-006',
      message: 'mission.dataDomains is empty — consider declaring data domains for audit clarity',
      path: 'mission.dataDomains',
    });
  }
  if (!Array.isArray(mission.actionDomains) || mission.actionDomains.length === 0) {
    warnings.push({
      code: 'SEM-006',
      message: 'mission.actionDomains is empty — consider declaring action domains for audit clarity',
      path: 'mission.actionDomains',
    });
  }

  // SEM-007: Budget calibration warnings
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i] as Record<string, unknown>;
    const budget = tool.budget as Record<string, unknown> | undefined;
    if (budget) {
      const limits = budget.limits as Record<string, number> | undefined;
      if (limits?.calls && limits.calls > 10000) {
        warnings.push({
          code: 'SEM-007',
          message: `Tool '${tool.name}' has a very high call budget (${limits.calls}). Verify this is calibrated for the workload.`,
          path: `mission.tools[${i}].budget.limits.calls`,
        });
      }
    }
  }

  // SEM-008: T3/T4 tools without approval in sensitive/critical mission
  const sensitivity = mission.sensitivity as string;
  if (sensitivity === 'sensitive' || sensitivity === 'critical') {
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i] as Record<string, unknown>;
      if (
        (tool.riskTier === 'T3' || tool.riskTier === 'T4') &&
        !tool.requiresApproval
      ) {
        warnings.push({
          code: 'SEM-008',
          message: `Tool '${tool.name}' (${tool.riskTier}) has no approval requirement in ${sensitivity} mission`,
          path: `mission.tools[${i}].requiresApproval`,
        });
      }
    }
  }

  // SEM-009: Wildcard scope check
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i] as Record<string, unknown>;
    const scope = tool.scope as Record<string, unknown> | undefined;
    if (scope?.constraints) {
      const constraints = scope.constraints as Record<string, unknown>;
      const allowlist = constraints.pathAllowlist as string[] | undefined;
      if (allowlist?.some(p => p === '/**' || p === '/*' || p === '*')) {
        errors.push({
          code: 'SEM-009',
          message: `Tool '${tool.name}' has wildcard scope '${allowlist.find(p => p === '/**' || p === '/*' || p === '*')}' — this is prohibited (POL-001 R-POL-A-007)`,
          path: `mission.tools[${i}].scope.constraints.pathAllowlist`,
        });
      }
    }
  }

  // ── Phase 3: Cross-Reference Validation ───────────────────────

  // XREF-001: policyHash matches computed hash
  const typedDoc = doc as unknown as PolicyDocument;
  if (doc.policyHash) {
    const computed = computePolicyHash(typedDoc);
    if (doc.policyHash !== computed) {
      errors.push({
        code: 'XREF-001',
        message: `Policy hash mismatch: declared=${doc.policyHash}, computed=${computed}`,
        path: 'policyHash',
      });
    }
  }

  // XREF-002: Metadata status validation
  if (doc.metadata && typeof doc.metadata === 'object') {
    const meta = doc.metadata as Record<string, unknown>;
    const validStatuses = ['DRAFT', 'REVIEW', 'TESTED', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'];
    if (meta.status && !validStatuses.includes(meta.status as string)) {
      errors.push({
        code: 'XREF-002',
        message: `Invalid policy status: '${meta.status}'`,
        path: 'metadata.status',
      });
    }
  }

  return buildResult(errors.length === 0, errors, warnings, policy);
}

// ─── Policy Linting (Stricter Checks) ───────────────────────────────

export interface LintResult {
  score: number; // 0-100
  issues: LintIssue[];
}

export interface LintIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
}

/**
 * Lint a policy document for best practices.
 * Goes beyond validation to check for anti-patterns (POL-001 Section 8).
 */
export function lintPolicy(policy: PolicyDocument): LintResult {
  const issues: LintIssue[] = [];
  let score = 100;

  // Anti-pattern 8.1: God Policy (too many tools)
  if (policy.mission.tools.length > 50) {
    issues.push({
      severity: 'warning',
      code: 'LINT-001',
      message: `Policy has ${policy.mission.tools.length} tools. Consider splitting into multiple policies.`,
      path: 'mission.tools',
    });
    score -= 10;
  }

  // Anti-pattern 8.2: Infinite budgets
  const globalBudget = policy.mission.globalBudget;
  if (!globalBudget.limits.calls && !globalBudget.limits.bytes) {
    issues.push({
      severity: 'warning',
      code: 'LINT-002',
      message: 'Global budget has no call or byte limits. This effectively disables budget enforcement.',
      path: 'mission.globalBudget',
    });
    score -= 15;
  }

  // Anti-pattern 8.3: Missing blast radius docs for T3/T4
  for (const tool of policy.mission.tools) {
    if ((tool.riskTier === 'T3' || tool.riskTier === 'T4') && !tool.blastRadius) {
      issues.push({
        severity: 'info',
        code: 'LINT-003',
        message: `Tool '${tool.name}' (${tool.riskTier}) has no blast radius documentation.`,
        path: `mission.tools.${tool.name}.blastRadius`,
      });
      score -= 5;
    }
  }

  // Anti-pattern 8.5: Scope without denylist
  for (const tool of policy.mission.tools) {
    if (tool.scope.type === 'filesystem') {
      const constraints = tool.scope.constraints as { pathDenylist?: string[] };
      if (!constraints.pathDenylist || constraints.pathDenylist.length === 0) {
        issues.push({
          severity: 'info',
          code: 'LINT-004',
          message: `Tool '${tool.name}' has no filesystem denylist. Consider denying sensitive paths.`,
          path: `mission.tools.${tool.name}.scope.constraints.pathDenylist`,
        });
        score -= 3;
      }
    }
  }

  // Anti-pattern 8.6: Stale policy
  if (policy.metadata?.updatedAt) {
    const updated = new Date(policy.metadata.updatedAt);
    const age = Date.now() - updated.getTime();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    if (age > ninetyDays) {
      issues.push({
        severity: 'warning',
        code: 'LINT-005',
        message: `Policy was last updated ${Math.floor(age / (24 * 60 * 60 * 1000))} days ago. Review recommended.`,
        path: 'metadata.updatedAt',
      });
      score -= 10;
    }
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return { score, issues };
}

// ─── Helpers ────────────────────────────────────────────────────────

function computePolicyHash(policy: PolicyDocument): string {
  const canon = JSON.stringify({
    aplVersion: policy.aplVersion,
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    mission: policy.mission,
    base: policy.base,
  });
  return sha256(canon);
}

function buildResult(
  valid: boolean,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  policy: unknown,
): ValidationResult {
  const doc = (policy && typeof policy === 'object') ? policy as Record<string, unknown> : {};

  const computedHash = typeof doc.aplVersion === 'string'
    ? computePolicyHash(doc as unknown as PolicyDocument)
    : '';

  return {
    valid,
    aplVersion: (doc.aplVersion as string) ?? 'unknown',
    policyId: (doc.policyId as string) ?? 'unknown',
    policyVersion: (doc.policyVersion as string) ?? 'unknown',
    hashValid: doc.policyHash ? doc.policyHash === computedHash : true,
    computedHash,
    errors,
    warnings,
  };
}
