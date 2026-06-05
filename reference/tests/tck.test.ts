/**
 * AOS TCK — Technology Compatibility Kit
 * 
 * Executable conformance tests from:
 * - AOS-CORE-001 v1.0 (F-001 through F-017)
 * - AOS-LANG-001 v1.0 (LANG-T001 through LANG-T020)
 * - AOS-API-001 v1.0 (API-T001 through API-T022)
 * - AOS-SEC-001 v1.0 (SEC-T001 through SEC-T010)
 * - AOS-REG-001 v1.0 (REG-T001 through REG-T015)
 * 
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeterministicPolicyGate } from '../src/gate.js';
import { validatePolicy, lintPolicy } from '../src/validator.js';
import { verifyGovernanceProof } from '../src/crypto.js';
import type { PolicyDocument, DecisionRequest, GateConfig } from '../src/types.js';

// ─── Test Fixtures ──────────────────────────────────────────────────

const TEST_GATE_CONFIG: GateConfig = {
  gateId: 'test-gate-001',
  tier: 'Foundation',
  tokenExpirySeconds: 30,
  rateLimitPerMinute: 1000,
};

function createTestPolicy(): PolicyDocument {
  return {
    aplVersion: '1.0',
    policyId: 'test-policy-001',
    policyVersion: '1.0.0',
    policyHash: '', // Will be computed on load
    metadata: {
      name: 'TCK Test Policy',
      author: 'AOS TCK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE',
    },
    mission: {
      name: 'TCK Test Mission',
      sensitivity: 'standard',
      dataDomains: ['test-data'],
      actionDomains: ['file-operations', 'network-operations'],
      tools: [
        {
          name: 'write_file',
          enabled: true,
          riskTier: 'T2',
          scope: {
            type: 'filesystem',
            constraints: {
              pathAllowlist: ['/workspace/src/**', '/workspace/docs/**'],
              pathDenylist: ['/workspace/src/.env', '/workspace/src/secrets/**'],
            },
          },
          budget: { limits: { calls: 100, bytes: 1048576 } },
        },
        {
          name: 'read_file',
          enabled: true,
          riskTier: 'T1',
          scope: {
            type: 'filesystem',
            constraints: {
              pathAllowlist: ['/workspace/**'],
              pathDenylist: ['/workspace/.git/config'],
            },
          },
          budget: { limits: { calls: 500 } },
        },
        {
          name: 'network_request',
          enabled: true,
          riskTier: 'T2',
          scope: {
            type: 'network',
            constraints: {
              domainAllowlist: ['api.example.com', '*.github.com'],
              domainDenylist: ['evil.com', '*.malware.net'],
              protocolAllowlist: ['https'],
            },
          },
          budget: { limits: { calls: 50 } },
        },
        {
          name: 'disabled_tool',
          enabled: false,
          riskTier: 'T1',
          scope: { type: 'custom', constraints: {} },
          budget: { limits: { calls: 0 } },
        },
        {
          name: 'send_email',
          enabled: true,
          riskTier: 'T3',
          scope: { type: 'custom', constraints: {} },
          budget: { limits: { calls: 10 } },
          requiresApproval: {
            type: 'first-use',
            timeout: 'PT15M',
            approvers: ['operator@example.com'],
          },
        },
        {
          name: 'db_query',
          enabled: true,
          riskTier: 'T2',
          scope: {
            type: 'database',
            constraints: {
              allowedTables: ['users', 'orders'],
              deniedTables: ['admin_keys'],
              allowedColumns: [],
              deniedColumns: ['ssn', 'password_hash'],
              allowedOperations: ['SELECT', 'INSERT'],
            },
          },
          budget: { limits: { calls: 200 } },
        },
      ],
      globalBudget: { limits: { calls: 1000, bytes: 10485760 } },
      categories: {
        prohibited: [
          'child_exploitation',
          'weapons_of_mass_destruction',
          'critical_infrastructure_attack',
        ],
        classifierConfidence: 0.85,
      },
      approvalMatrix: {},
    },
  };
}

function createTestRequest(
  toolName: string,
  args: Record<string, unknown> = {},
): DecisionRequest {
  return {
    toolName,
    arguments: args,
    context: {
      agentId: 'test-agent',
      sessionId: 'test-session-001',
    },
  };
}

// ─── CORE-001 Conformance Tests ─────────────────────────────────────

describe('AOS-CORE-001: Deterministic Policy Gate', () => {

  // F-001: No side effect path bypasses the gate
  test('F-001: Tool not in policy → DENY', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('undeclared_tool', { action: 'hack' })
    );

    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('TOOL_NOT_IN_POLICY');
  });

  // F-002: Denied tool returns DENY
  test('F-002: Disabled tool → DENY', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('disabled_tool')
    );

    expect(result.decision).toBe('DENY');
  });

  // F-003: Allowed tool returns ALLOW with governance proof
  test('F-003: Valid tool call → ALLOW with Governance Proof', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('read_file', { path: '/workspace/src/main.ts' })
    );

    expect(result.decision).toBe('ALLOW');
    expect(result.governanceProof).toBeDefined();
    expect(result.governanceProof!.type).toBe('GOVERNANCE_PROOF');
    expect(result.governanceProof!.version).toBe('1.0');
    expect(result.executionToken).toBeDefined();
    expect(result.tokenExpiry).toBeDefined();
  });

  // F-004: Scope violation → DENY
  test('F-004: Path outside allowed scope → DENY (SCOPE_VIOLATION)', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('write_file', { path: '/etc/passwd' })
    );

    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('SCOPE_VIOLATION');
  });

  // F-005: Denied path (deny-wins) → DENY
  test('F-005: Path in denylist (deny-wins) → DENY', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    // Path is in allowlist (/workspace/src/**) but also in denylist
    const result = await gate.evaluate(
      createTestRequest('write_file', { path: '/workspace/src/.env' })
    );

    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('SCOPE_VIOLATION');
  });

  // F-006: Budget exceeded → DENY
  test('F-006: Budget exceeded → DENY (BUDGET_EXCEEDED)', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    const policy = createTestPolicy();
    // Set very low budget
    policy.mission.tools[0].budget.limits.calls = 2;
    gate.loadPolicy(policy);

    // First two calls should pass
    await gate.evaluate(createTestRequest('write_file', { path: '/workspace/src/a.ts' }));
    await gate.evaluate(createTestRequest('write_file', { path: '/workspace/src/b.ts' }));

    // Third call should exceed budget
    const result = await gate.evaluate(
      createTestRequest('write_file', { path: '/workspace/src/c.ts' })
    );

    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('BUDGET_EXCEEDED');
  });

  // F-007: Approval required → ESCALATE
  test('F-007: T3 tool without approval → ESCALATE', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('send_email', { to: 'user@example.com' })
    );

    expect(result.decision).toBe('ESCALATE');
    expect(result.reason).toBe('APPROVAL_REQUIRED');
    expect(result.approvalRequest).toBeDefined();
    expect(result.approvalRequest!.approvers).toContain('operator@example.com');
  });

  // F-008: After approval, tool executes
  test('F-008: T3 tool with first-use approval → ALLOW', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    // Grant first-use approval
    gate.grantApproval('send_email', 'first-use');

    const result = await gate.evaluate(
      createTestRequest('send_email', { to: 'user@example.com' })
    );

    expect(result.decision).toBe('ALLOW');
  });

  // F-009: No policy loaded → DENY (fail-closed)
  test('F-009: No policy loaded → DENY (fail-closed, R-ARCH-004)', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    // No policy loaded

    const result = await gate.evaluate(
      createTestRequest('read_file', { path: '/workspace/src/main.ts' })
    );

    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('GATE_ERROR');
  });

  // F-010: Path traversal attempt → DENY
  test('F-010: Path traversal (../) → canonicalized and denied', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('write_file', {
        path: '/workspace/src/../../etc/passwd',
      })
    );

    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('SCOPE_VIOLATION');
  });

  // F-011: Null byte injection → DENY
  test('F-011: Null byte in path → DENY', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('write_file', {
        path: '/workspace/src/main.ts\0.exe',
      })
    );

    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('SCOPE_VIOLATION');
  });

  // F-012: Governance Proof is verifiable
  test('F-012: Governance Proof is cryptographically verifiable', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('read_file', { path: '/workspace/src/main.ts' })
    );

    expect(result.governanceProof).toBeDefined();
    const verification = verifyGovernanceProof(
      result.governanceProof!,
      TEST_GATE_CONFIG.gateId
    );

    expect(verification.valid).toBe(true);
    expect(verification.signatureValid).toBe(true);
    expect(verification.gateIdMatch).toBe(true);
  });

  // F-013: Execution token confirmation
  test('F-013: Execution token confirms successfully', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('read_file', { path: '/workspace/src/main.ts' })
    );

    expect(result.executionToken).toBeDefined();
    const confirmed = gate.confirmExecution(
      result.requestId,
      result.executionToken!
    );
    expect(confirmed).toBe(true);
  });

  // F-014: Invalid execution token rejected
  test('F-014: Invalid execution token → rejected', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('read_file', { path: '/workspace/src/main.ts' })
    );

    const confirmed = gate.confirmExecution(result.requestId, 'invalid-token');
    expect(confirmed).toBe(false);
  });
});

// ─── Journal Conformance Tests ──────────────────────────────────────

describe('AOS-CORE-001: Audit Journal', () => {

  // E-001: Every decision produces a journal entry
  test('E-001: ALLOW produces journal entry', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    await gate.evaluate(
      createTestRequest('read_file', { path: '/workspace/src/main.ts' })
    );

    const entries = gate.getJournal().getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].decision).toBe('ALLOW');
  });

  // E-002: DENY produces journal entry
  test('E-002: DENY produces journal entry', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    await gate.evaluate(createTestRequest('undeclared_tool'));

    const entries = gate.getJournal().getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].decision).toBe('DENY');
  });

  // E-003: Journal chain is verifiable
  test('E-003: Journal hash chain is valid after multiple entries', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    // Generate multiple entries
    await gate.evaluate(createTestRequest('read_file', { path: '/workspace/src/a.ts' }));
    await gate.evaluate(createTestRequest('read_file', { path: '/workspace/src/b.ts' }));
    await gate.evaluate(createTestRequest('undeclared_tool'));
    await gate.evaluate(createTestRequest('read_file', { path: '/workspace/src/c.ts' }));

    expect(gate.getJournal().getLength()).toBe(4);
    expect(gate.getJournal().verifyChain()).toBe(true);
  });

  // E-004: Journal query filtering
  test('E-004: Journal query filters by decision', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    await gate.evaluate(createTestRequest('read_file', { path: '/workspace/src/a.ts' }));
    await gate.evaluate(createTestRequest('undeclared_tool'));
    await gate.evaluate(createTestRequest('read_file', { path: '/workspace/src/b.ts' }));

    const denied = gate.getJournal().query({ decision: 'DENY' });
    expect(denied.entries.length).toBe(1);
    expect(denied.entries[0].decision).toBe('DENY');

    const allowed = gate.getJournal().query({ decision: 'ALLOW' });
    expect(allowed.entries.length).toBe(2);
  });
});

// ─── Scope Validation Tests ─────────────────────────────────────────

describe('AOS-CORE-001: Scope Validation', () => {

  test('Network: allowed domain → ALLOW', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('network_request', { url: 'https://api.example.com/data' })
    );
    expect(result.decision).toBe('ALLOW');
  });

  test('Network: denied domain → DENY', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('network_request', { url: 'https://evil.com/steal' })
    );
    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('SCOPE_VIOLATION');
  });

  test('Network: wildcard subdomain match → ALLOW', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('network_request', { url: 'https://api.github.com/repos' })
    );
    expect(result.decision).toBe('ALLOW');
  });

  test('Network: HTTP protocol blocked (only HTTPS allowed) → DENY', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('network_request', { url: 'http://api.example.com/data' })
    );
    expect(result.decision).toBe('DENY');
  });

  test('Database: allowed table and operation → ALLOW', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('db_query', {
        table: 'users',
        operation: 'SELECT',
        columns: ['name', 'email'],
      })
    );
    expect(result.decision).toBe('ALLOW');
  });

  test('Database: denied table → DENY', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('db_query', {
        table: 'admin_keys',
        operation: 'SELECT',
      })
    );
    expect(result.decision).toBe('DENY');
  });

  test('Database: denied column → DENY', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('db_query', {
        table: 'users',
        operation: 'SELECT',
        columns: ['name', 'ssn'],
      })
    );
    expect(result.decision).toBe('DENY');
  });

  test('Database: disallowed operation (DELETE) → DENY', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('db_query', {
        table: 'users',
        operation: 'DELETE',
      })
    );
    expect(result.decision).toBe('DENY');
  });
});

// ─── Policy Validation Tests (LANG-001) ─────────────────────────────

describe('AOS-LANG-001: Policy Validation', () => {

  test('LANG-T001: Valid policy passes validation', () => {
    const result = validatePolicy(createTestPolicy());
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('LANG-T002: Missing aplVersion → SYN-002', () => {
    const policy = createTestPolicy() as any;
    delete policy.aplVersion;
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'SYN-002')).toBe(true);
  });

  test('LANG-T003: Missing policyId → SYN-003', () => {
    const policy = createTestPolicy() as any;
    delete policy.policyId;
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'SYN-003')).toBe(true);
  });

  test('LANG-T004: Missing mission block → SYN-005', () => {
    const policy = createTestPolicy() as any;
    delete policy.mission;
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'SYN-005')).toBe(true);
  });

  test('LANG-T005: Invalid risk tier → SYN-010', () => {
    const policy = createTestPolicy() as any;
    policy.mission.tools[0].riskTier = 'T5';
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'SYN-010')).toBe(true);
  });

  test('LANG-T006: Missing mandatory category → SEM-003', () => {
    const policy = createTestPolicy();
    policy.mission.categories.prohibited = ['child_exploitation']; // Missing 2
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.filter(e => e.code === 'SEM-003').length).toBe(2);
  });

  test('LANG-T007: Duplicate tool names → SEM-004', () => {
    const policy = createTestPolicy();
    policy.mission.tools.push({ ...policy.mission.tools[0] }); // Duplicate
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'SEM-004')).toBe(true);
  });

  test('LANG-T008: Wildcard scope → SEM-009', () => {
    const policy = createTestPolicy() as any;
    policy.mission.tools[0].scope.constraints.pathAllowlist = ['/**'];
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'SEM-009')).toBe(true);
  });

  test('LANG-T009: Non-object input → SYN-001', () => {
    const result = validatePolicy('not an object');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'SYN-001')).toBe(true);
  });

  test('LANG-T010: Null input → SYN-001', () => {
    const result = validatePolicy(null);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'SYN-001')).toBe(true);
  });
});

// ─── Policy Linting Tests ───────────────────────────────────────────

describe('AOS-POL-001: Policy Linting', () => {

  test('LINT: Valid policy scores high', () => {
    const policy = createTestPolicy();
    const result = lintPolicy(policy);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  test('LINT-002: No budget limits → warning', () => {
    const policy = createTestPolicy();
    policy.mission.globalBudget.limits = {};
    const result = lintPolicy(policy);
    expect(result.issues.some(i => i.code === 'LINT-002')).toBe(true);
  });

  test('LINT-003: T3 without blast radius → info', () => {
    const policy = createTestPolicy();
    // send_email is T3 without blastRadius
    const result = lintPolicy(policy);
    expect(result.issues.some(i => i.code === 'LINT-003')).toBe(true);
  });
});

// ─── Health and Metrics Tests ───────────────────────────────────────

describe('AOS-API-001: Health and Metrics', () => {

  test('Health: No policy → UNHEALTHY', () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    const health = gate.getHealth();
    expect(health.status).toBe('UNHEALTHY');
    expect(health.policyLoaded).toBe(false);
  });

  test('Health: Policy loaded → HEALTHY', () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());
    const health = gate.getHealth();
    expect(health.status).toBe('HEALTHY');
    expect(health.policyLoaded).toBe(true);
    expect(health.journalIntegrity).toBe('VALID');
  });

  test('Metrics: Counts decisions correctly', async () => {
    const gate = new DeterministicPolicyGate(TEST_GATE_CONFIG);
    gate.loadPolicy(createTestPolicy());

    await gate.evaluate(createTestRequest('read_file', { path: '/workspace/src/a.ts' }));
    await gate.evaluate(createTestRequest('read_file', { path: '/workspace/src/b.ts' }));
    await gate.evaluate(createTestRequest('undeclared_tool'));

    const metrics = gate.getMetrics();
    expect(metrics.metrics.decisions.total).toBe(3);
    expect(metrics.metrics.decisions.allowed).toBe(2);
    expect(metrics.metrics.decisions.denied).toBe(1);
  });
});

// ─── Enterprise Tier Tests ──────────────────────────────────────────

describe('AOS-CORE-001: Enterprise Tier', () => {

  test('R-ENF-010: Enterprise tier returns opaque denials', async () => {
    const enterpriseConfig: GateConfig = {
      ...TEST_GATE_CONFIG,
      tier: 'Enterprise',
    };
    const gate = new DeterministicPolicyGate(enterpriseConfig);
    gate.loadPolicy(createTestPolicy());

    const result = await gate.evaluate(
      createTestRequest('write_file', { path: '/etc/passwd' })
    );

    expect(result.decision).toBe('DENY');
    // Enterprise: detail should be opaque, not revealing policy structure
    expect(result.detail).toBe('Request denied by policy');
  });
});
