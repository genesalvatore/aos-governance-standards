/**
 * AOS Reference Gate — REST API Server
 * 
 * Implements the API endpoints defined in AOS-API-001 v1.0:
 * - Decision API (Section 5)
 * - Journal API (Section 6)
 * - Approval API (Section 7)
 * - Attestation API (Section 8)
 * - Policy API (Section 9)
 * - Telemetry API (Section 10)
 * 
 * Usage:
 *   AOS_GATE_ID=my-gate AOS_TIER=Foundation node dist/api/server.js
 * 
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { DeterministicPolicyGate } from '../gate.js';
import { validatePolicy, lintPolicy } from '../validator.js';
import { verifyGovernanceProof } from '../crypto.js';
import type { DecisionRequest, GateConfig, PolicyDocument } from '../types.js';

// ─── Configuration ──────────────────────────────────────────────────

const GATE_ID = process.env.AOS_GATE_ID ?? 'aos-reference-gate';
const TIER = (process.env.AOS_TIER ?? 'Foundation') as GateConfig['tier'];
const PORT = parseInt(process.env.AOS_PORT ?? '8401');
const TOKEN_EXPIRY = parseInt(process.env.AOS_TOKEN_EXPIRY ?? '30');

const config: GateConfig = {
  gateId: GATE_ID,
  tier: TIER,
  tokenExpirySeconds: TOKEN_EXPIRY,
  rateLimitPerMinute: 1000,
};

// ─── Gate Instance ──────────────────────────────────────────────────

const gate = new DeterministicPolicyGate(config);
const app = express();

app.use(express.json({ limit: '1mb' }));

// ─── Request ID Middleware ──────────────────────────────────────────

app.use((req, res, next) => {
  res.setHeader('X-AOS-Gate-Id', GATE_ID);
  res.setHeader('X-AOS-APL-Version', '1.0');
  next();
});

// ═══════════════════════════════════════════════════════════════════
// Section 5: Decision API
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /v1/decisions
 * Evaluate a tool call against the active policy.
 * API-001 Section 5.1
 */
app.post('/v1/decisions', async (req, res) => {
  try {
    const request: DecisionRequest = {
      toolName: req.body.toolName,
      arguments: req.body.arguments ?? {},
      context: {
        agentId: req.body.context?.agentId ?? 'unknown',
        sessionId: req.body.context?.sessionId ?? 'unknown',
        conversationId: req.body.context?.conversationId,
        delegationId: req.body.context?.delegationId,
        userMessage: req.body.context?.userMessage,
      },
    };

    const result = await gate.evaluate(request);
    const statusCode = result.decision === 'ALLOW' ? 200
                     : result.decision === 'ESCALATE' ? 202
                     : 403;

    res.status(statusCode).json(result);
  } catch (err) {
    res.status(500).json({
      error: 'GATE_ERROR',
      detail: 'Internal server error during evaluation',
    });
  }
});

/**
 * POST /v1/decisions/:requestId/confirm
 * Confirm execution of an allowed tool call.
 * API-001 Section 5.2
 */
app.post('/v1/decisions/:requestId/confirm', (req, res) => {
  const { requestId } = req.params;
  const { executionToken, result } = req.body;

  if (!executionToken) {
    res.status(400).json({ error: 'executionToken is required' });
    return;
  }

  const confirmed = gate.confirmExecution(requestId, executionToken);
  if (confirmed) {
    res.status(200).json({ confirmed: true, requestId });
  } else {
    res.status(404).json({
      confirmed: false,
      error: 'Invalid or expired execution token',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Section 6: Journal API
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /v1/journal
 * Query journal entries with filtering.
 * API-001 Section 6.1
 */
app.get('/v1/journal', (req, res) => {
  const { from, to, tool, decision, limit, offset } = req.query;

  const result = gate.getJournal().query({
    from: from as string,
    to: to as string,
    tool: tool as string,
    decision: decision as any,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  res.json(result);
});

/**
 * GET /v1/journal/:entryId
 * Get a single journal entry.
 * API-001 Section 6.2
 */
app.get('/v1/journal/:entryId', (req, res) => {
  const entry = gate.getJournal().getEntry(req.params.entryId);
  if (entry) {
    res.json(entry);
  } else {
    res.status(404).json({ error: 'Journal entry not found' });
  }
});

/**
 * GET /v1/journal/export
 * Export full journal as JSON.
 * API-001 Section 6.3
 */
app.get('/v1/journal/export', (req, res) => {
  const { from, to, format } = req.query;
  const exported = gate.getJournal().export({
    from: from as string,
    to: to as string,
  });

  if (format === 'csv') {
    // CSV export
    const entries = gate.getJournal().getEntries();
    const header = 'entryId,requestId,timestamp,toolName,decision,reason,agentId,sessionId,policyId\n';
    const rows = entries.map(e =>
      `${e.entryId},${e.requestId},${e.timestamp},${e.toolName},${e.decision},${e.reason ?? ''},${e.agentId},${e.sessionId},${e.policyId}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aos-journal.csv"');
    res.send(header + rows);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.send(exported);
  }
});

/**
 * GET /v1/journal/verify
 * Verify journal hash chain integrity.
 * API-001 Section 6.4
 */
app.get('/v1/journal/verify', (req, res) => {
  const valid = gate.getJournal().verifyChain();
  res.json({
    valid,
    chainLength: gate.getJournal().getLength(),
    verifiedAt: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════
// Section 7: Approval API
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /v1/approvals/:toolName
 * Grant approval for a tool.
 * API-001 Section 7.1
 */
app.post('/v1/approvals/:toolName', (req, res) => {
  const { toolName } = req.params;
  const { type, approvedBy } = req.body;

  if (!type || !['first-use', 'session'].includes(type)) {
    res.status(400).json({ error: 'type must be "first-use" or "session"' });
    return;
  }

  gate.grantApproval(toolName, type);
  res.json({
    approved: true,
    toolName,
    type,
    approvedBy: approvedBy ?? 'api-user',
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════
// Section 8: Attestation API
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /v1/attestation/verify
 * Verify a Governance Proof.
 * API-001 Section 8
 */
app.post('/v1/attestation/verify', (req, res) => {
  const { proof, expectedGateId, expectedPolicyHash, expectedPreviousHash } = req.body;

  if (!proof) {
    res.status(400).json({ error: 'proof is required' });
    return;
  }

  const result = verifyGovernanceProof(
    proof,
    expectedGateId,
    expectedPolicyHash,
    expectedPreviousHash
  );

  res.json({
    ...result,
    verifiedAt: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════
// Section 9: Policy API
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /v1/policies/load
 * Load a policy document into the gate.
 * API-001 Section 9.1
 */
app.post('/v1/policies/load', (req, res) => {
  try {
    const validation = validatePolicy(req.body);
    if (!validation.valid) {
      res.status(400).json({
        loaded: false,
        validation,
      });
      return;
    }

    gate.loadPolicy(req.body as PolicyDocument);
    res.json({
      loaded: true,
      policyId: req.body.policyId,
      policyVersion: req.body.policyVersion,
      computedHash: validation.computedHash,
      loadedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(400).json({
      loaded: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /v1/policies/current
 * Get the currently loaded policy metadata.
 * API-001 Section 9.2
 */
app.get('/v1/policies/current', (req, res) => {
  const policy = gate.getPolicy();
  if (!policy) {
    res.status(404).json({ error: 'No policy loaded' });
    return;
  }

  // Return metadata only (not the full policy for security)
  res.json({
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    policyHash: policy.policyHash,
    status: policy.metadata?.status,
    missionName: policy.mission.name,
    sensitivity: policy.mission.sensitivity,
    toolCount: policy.mission.tools.length,
    loadedTools: policy.mission.tools.map(t => ({
      name: t.name,
      enabled: t.enabled,
      riskTier: t.riskTier,
    })),
  });
});

/**
 * POST /v1/policies/validate
 * Validate a policy without loading it.
 * API-001 Section 9.3
 */
app.post('/v1/policies/validate', (req, res) => {
  const result = validatePolicy(req.body);
  res.json(result);
});

/**
 * POST /v1/policies/lint
 * Lint a policy for best practices.
 * API-001 Section 9.4
 */
app.post('/v1/policies/lint', (req, res) => {
  const validation = validatePolicy(req.body);
  if (!validation.valid) {
    res.status(400).json({
      error: 'Policy must pass validation before linting',
      validation,
    });
    return;
  }

  const result = lintPolicy(req.body as PolicyDocument);
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════
// Section 10: Telemetry API
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /v1/telemetry/metrics
 * Get gate metrics (JSON format).
 * API-001 Section 10.1
 */
app.get('/v1/telemetry/metrics', (req, res) => {
  const format = req.query.format as string;

  if (format === 'prometheus') {
    // Prometheus text format
    const metrics = gate.getMetrics();
    const m = metrics.metrics;
    const lines = [
      '# HELP aos_decisions_total Total number of gate decisions',
      '# TYPE aos_decisions_total counter',
      `aos_decisions_total{decision="allow"} ${m.decisions.allowed}`,
      `aos_decisions_total{decision="deny"} ${m.decisions.denied}`,
      `aos_decisions_total{decision="escalate"} ${m.decisions.escalated}`,
      '# HELP aos_budget_utilization_ratio Global budget utilization ratio',
      '# TYPE aos_budget_utilization_ratio gauge',
      `aos_budget_utilization_ratio ${m.budgets.globalUtilization}`,
      '# HELP aos_journal_entries_total Total journal entries',
      '# TYPE aos_journal_entries_total counter',
      `aos_journal_entries_total ${m.journal.entries}`,
    ];
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(lines.join('\n') + '\n');
  } else {
    res.json(gate.getMetrics());
  }
});

/**
 * GET /v1/telemetry/health
 * Health check endpoint.
 * API-001 Section 10.3
 */
app.get('/v1/telemetry/health', (req, res) => {
  const health = gate.getHealth();
  const statusCode = health.status === 'HEALTHY' ? 200
                   : health.status === 'DEGRADED' ? 200
                   : 503;
  res.status(statusCode).json(health);
});

// ═══════════════════════════════════════════════════════════════════
// Server Start
// ═══════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║       AOS Reference Gate — Deterministic Policy Gate  ║');
  console.log('║       Conforming to AOS-CORE-001 v1.0                 ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  Gate ID:  ${GATE_ID.padEnd(42)}║`);
  console.log(`║  Tier:     ${TIER.padEnd(42)}║`);
  console.log(`║  Port:     ${String(PORT).padEnd(42)}║`);
  console.log(`║  Status:   LISTENING (no policy loaded)${' '.repeat(15)}║`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║  POST /v1/decisions          — Evaluate tool call     ║');
  console.log('║  GET  /v1/journal            — Query audit journal    ║');
  console.log('║  POST /v1/policies/load      — Load policy            ║');
  console.log('║  POST /v1/policies/validate  — Validate policy        ║');
  console.log('║  GET  /v1/telemetry/health   — Health check           ║');
  console.log('║  GET  /v1/telemetry/metrics  — Metrics (JSON/Prom)    ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
});

export { app, gate };
