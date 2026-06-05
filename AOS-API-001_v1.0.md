# AOS-API-001 v1.0 -- Interface Specification

**Standard:** AOS-API-001  
**Title:** AOS Governance Interface Specification: REST APIs, Event Schemas, and Wire Formats  
**Version:** 1.0  
**Status:** Draft  
**Date:** 2026-06-05  
**Author:** Eugene Christopher Salvatore  
**License:** CC-BY-4.0  
**Companion to:** AOS-CORE-001, AOS-LANG-001, AOS-CRYPTO-001, AOS-CORE-003

---

## Abstract

AOS-CORE-001 defines what the Deterministic Policy Gate does. AOS-LANG-001 defines the policy format it consumes. Neither defines the *wire format* — the HTTP APIs, request/response schemas, and event formats that connect an agent, a gate, and external systems.

Without a standardized wire format, every DPG implementation invents its own API. Agent SDKs bind to specific gate implementations. Compliance tools cannot query arbitrary gates for audit data. Monitoring systems cannot aggregate telemetry across heterogeneous deployments. The standard becomes a specification without an interoperable surface.

This standard specifies the REST APIs, WebSocket events, JSON schemas, and error formats for the five core interfaces of the AOS governance system:

1. **Decision API** -- submit a tool call for governance evaluation
2. **Journal API** -- query and export the audit journal
3. **Approval API** -- manage human approval workflows
4. **Attestation API** -- retrieve and verify Governance Proofs
5. **Policy API** -- load, validate, and inspect policies
6. **Telemetry API** -- expose gate metrics for monitoring and federation

---

## Table of Contents

1. [Scope](#1-scope)
2. [Normative References](#2-normative-references)
3. [Terms and Definitions](#3-terms-and-definitions)
4. [General Requirements](#4-general-requirements)
5. [Decision API](#5-decision-api)
6. [Journal API](#6-journal-api)
7. [Approval API](#7-approval-api)
8. [Attestation API](#8-attestation-api)
9. [Policy API](#9-policy-api)
10. [Telemetry API](#10-telemetry-api)
11. [Error Format](#11-error-format)
12. [Authentication and Authorization](#12-authentication-and-authorization)
13. [Conformance Testing](#13-conformance-testing)
14. [Security Considerations](#14-security-considerations)
15. [Relationship to Other Standards](#15-relationship-to-other-standards)

---

## 1. Scope

### 1.1 What This Standard Covers

- REST API endpoint definitions for all gate interfaces
- Request and response JSON schemas
- WebSocket event schemas for real-time interactions (approval, telemetry)
- Error format and error codes
- Authentication requirements
- Versioning strategy for API evolution
- Content-Type and encoding requirements

### 1.2 What This Standard Does Not Cover

- Policy evaluation logic (see AOS-CORE-001)
- Policy document format (see AOS-LANG-001)
- Cryptographic operations (see AOS-CRYPTO-001)
- Federation protocols between gates (see AOS-CORE-003)
- Client SDK implementations (implementation-specific)

### 1.3 Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## 2. Normative References

- **AOS-CORE-001 v1.0** -- Deterministic Policy Gate
- **AOS-LANG-001 v1.0** -- AOS Policy Language
- **AOS-CRYPTO-001 v1.0** -- Cryptographic Standards
- **AOS-CORE-003 v1.0** -- Multi-Agent Trust Federation
- **RFC 2119** -- Requirement Level Key Words
- **RFC 7807** -- Problem Details for HTTP APIs
- **RFC 8259** -- JSON Data Interchange Format
- **RFC 9110** -- HTTP Semantics
- **OpenAPI Specification 3.1.0** -- API description standard

---

## 3. Terms and Definitions

Terms defined in AOS-CORE-001, AOS-LANG-001, and AOS-CRYPTO-001 apply. Additional terms:

**Gate Endpoint:** An HTTP or WebSocket endpoint exposed by a DPG instance that conforms to this specification.

**Decision Request:** A structured request from an agent (or agent proxy) asking the gate to evaluate a tool call against the active policy.

**Journal Entry:** A single record in the audit journal, corresponding to one evaluated tool call.

---

## 4. General Requirements

### 4.1 Transport

**R-API-001:** All gate endpoints MUST be served over HTTPS (TLS 1.2 or later). Unencrypted HTTP MUST NOT be used in production deployments. Development deployments MAY use HTTP on localhost only.

**R-API-002:** All request and response bodies MUST use `application/json` (RFC 8259) with UTF-8 encoding.

### 4.2 API Versioning

**R-API-003:** All API endpoints MUST be prefixed with the API version: `/v1/`. Version numbers increment on breaking changes. Non-breaking additions (new optional fields, new endpoints) do not require a version bump.

### 4.3 Request IDs

**R-API-004:** Every API request MUST include a unique request identifier in the `X-Request-Id` header (UUID v4). If the client does not provide one, the gate MUST generate one. The request ID MUST be included in all responses, journal entries, and Governance Proofs related to the request.

### 4.4 Timestamps

**R-API-005:** All timestamps in API requests and responses MUST be ISO 8601 format with timezone (UTC RECOMMENDED): `2026-06-05T16:00:00Z`.

---

## 5. Decision API

The Decision API is the primary interface between the agent and the gate. Every tool call passes through this API for governance evaluation.

### 5.1 Submit Decision Request

```
POST /v1/decisions
```

**Request Body:**

```json
{
  "toolName": "write_file",
  "arguments": {
    "path": "/workspace/src/main.py",
    "content": "print('hello')"
  },
  "context": {
    "agentId": "<agent identity>",
    "sessionId": "<session UUID>",
    "conversationId": "<conversation UUID, optional>",
    "delegationId": "<delegation UUID, if delegated task>",
    "userMessage": "<the user request that triggered this tool call, optional>"
  },
  "metadata": {
    "requestedAt": "<ISO 8601>",
    "clientVersion": "<agent SDK version>"
  }
}
```

**Response — ALLOW (200 OK):**

```json
{
  "requestId": "<UUID>",
  "decision": "ALLOW",
  "toolName": "write_file",
  "evaluationResult": {
    "checks": {
      "toolExists": true,
      "toolEnabled": true,
      "categoryClean": true,
      "scopeValid": true,
      "budgetAvailable": true,
      "approvalGranted": true,
      "restrictionValid": null
    },
    "budgetRemaining": {
      "calls": 847,
      "bytes": 48234567
    }
  },
  "governanceProof": {
    "proofId": "<UUID>",
    "hash": "<SHA-256 of proof>",
    "signature": "<Ed25519 signature>",
    "gateId": "<gate public key>",
    "timestamp": "<ISO 8601>"
  },
  "policySnapshot": {
    "policyId": "<UUID>",
    "policyVersion": "<semver>",
    "policyHash": "<SHA-256>"
  },
  "executionToken": "<opaque token authorizing tool execution>",
  "tokenExpiry": "<ISO 8601, typically 30 seconds from now>"
}
```

**Response — DENY (200 OK, decision is DENY):**

```json
{
  "requestId": "<UUID>",
  "decision": "DENY",
  "toolName": "write_file",
  "reason": "SCOPE_VIOLATION",
  "detail": "Path '/etc/passwd' is outside the allowed scope [/workspace/src/**]",
  "evaluationResult": {
    "checks": {
      "toolExists": true,
      "toolEnabled": true,
      "categoryClean": true,
      "scopeValid": false,
      "budgetAvailable": true,
      "approvalGranted": null,
      "restrictionValid": null
    }
  },
  "governanceProof": {
    "proofId": "<UUID>",
    "hash": "<SHA-256>",
    "signature": "<Ed25519 signature>",
    "gateId": "<gate public key>",
    "timestamp": "<ISO 8601>"
  },
  "policySnapshot": {
    "policyId": "<UUID>",
    "policyVersion": "<semver>",
    "policyHash": "<SHA-256>"
  }
}
```

**Response — ESCALATE (200 OK, decision is ESCALATE):**

```json
{
  "requestId": "<UUID>",
  "decision": "ESCALATE",
  "toolName": "send_email",
  "reason": "APPROVAL_REQUIRED",
  "detail": "Tool 'send_email' requires first-use approval (T3 in standard mission)",
  "approvalRequest": {
    "approvalId": "<UUID>",
    "approvers": ["operator@example.com"],
    "timeout": "PT15M",
    "expiresAt": "<ISO 8601>",
    "websocketUrl": "/v1/approvals/ws/<approvalId>"
  },
  "policySnapshot": {
    "policyId": "<UUID>",
    "policyVersion": "<semver>",
    "policyHash": "<SHA-256>"
  }
}
```

> **Design note:** The Decision API returns 200 OK for all evaluation outcomes (ALLOW, DENY, ESCALATE). HTTP status codes indicate transport-level success/failure, not governance decisions. A DENY is a successful governance evaluation, not an HTTP error.

### 5.2 Confirm Execution

After the agent executes the tool (on ALLOW), it MUST confirm execution:

```
POST /v1/decisions/{requestId}/confirm
```

**Request Body:**

```json
{
  "executionToken": "<token from ALLOW response>",
  "result": {
    "success": true,
    "output": "<summary of tool output, truncated to 4KB>",
    "sideEffects": ["file_written:/workspace/src/main.py"],
    "executedAt": "<ISO 8601>",
    "durationMs": 127
  }
}
```

**Response (200 OK):**

```json
{
  "requestId": "<UUID>",
  "confirmed": true,
  "journalEntryId": "<UUID of the completed journal entry>"
}
```

**R-API-006:** If the agent does not confirm execution within the `tokenExpiry` window, the gate MUST log the decision as `EXECUTION_UNCONFIRMED` and increment the anomaly counter. The execution token becomes invalid.

---

## 6. Journal API

The Journal API provides access to the audit trail for compliance, monitoring, and forensic analysis.

### 6.1 Query Journal Entries

```
GET /v1/journal?from={ISO8601}&to={ISO8601}&tool={name}&decision={ALLOW|DENY|ESCALATE}&limit={int}&offset={int}
```

**Response (200 OK):**

```json
{
  "entries": [
    {
      "entryId": "<UUID>",
      "requestId": "<UUID>",
      "timestamp": "<ISO 8601>",
      "toolName": "write_file",
      "decision": "ALLOW",
      "reason": null,
      "agentId": "<agent identity>",
      "sessionId": "<session UUID>",
      "policyId": "<UUID>",
      "policyVersion": "<semver>",
      "policyHash": "<SHA-256>",
      "governanceProofId": "<UUID>",
      "executionConfirmed": true,
      "budgetConsumed": {
        "calls": 1,
        "bytes": 14
      },
      "delegationId": "<UUID or null>"
    }
  ],
  "pagination": {
    "total": 1847,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### 6.2 Get Single Journal Entry

```
GET /v1/journal/{entryId}
```

Returns the full journal entry including the complete tool arguments, execution result, and Governance Proof.

### 6.3 Export Journal (Compliance)

```
GET /v1/journal/export?from={ISO8601}&to={ISO8601}&format={json|csv|spdx}
```

**R-API-007:** The export endpoint MUST support at minimum `json` format. `csv` and `spdx` formats are RECOMMENDED for Enterprise and Sovereign tiers.

### 6.4 Journal Chain Verification

```
GET /v1/journal/verify?from={ISO8601}&to={ISO8601}
```

**Response (200 OK):**

```json
{
  "chainValid": true,
  "entriesVerified": 1847,
  "firstEntry": "<UUID>",
  "lastEntry": "<UUID>",
  "merkleRoot": "<SHA-256 of Merkle tree root>",
  "gaps": [],
  "tamperedEntries": []
}
```

---

## 7. Approval API

The Approval API manages human-in-the-loop approval workflows.

### 7.1 List Pending Approvals

```
GET /v1/approvals?status=pending
```

**Response (200 OK):**

```json
{
  "approvals": [
    {
      "approvalId": "<UUID>",
      "requestId": "<UUID>",
      "toolName": "send_email",
      "riskTier": "T3",
      "approvalType": "first-use",
      "requestedAt": "<ISO 8601>",
      "expiresAt": "<ISO 8601>",
      "agentId": "<agent identity>",
      "arguments": {
        "to": "team@example.com",
        "subject": "Build Report"
      },
      "status": "pending"
    }
  ]
}
```

### 7.2 Submit Approval Decision

```
POST /v1/approvals/{approvalId}
```

**Request Body:**

```json
{
  "decision": "APPROVED",
  "approvedBy": "<operator identity>",
  "comment": "Approved — recipient is internal",
  "signature": "<Ed25519 signature of approval>"
}
```

`decision` MUST be `"APPROVED"` or `"DENIED"`.

**Response (200 OK):**

```json
{
  "approvalId": "<UUID>",
  "decision": "APPROVED",
  "effectiveScope": "first-use",
  "expiresAt": "<ISO 8601, when first-use approval expires>"
}
```

### 7.3 WebSocket Approval Stream

```
WS /v1/approvals/ws/{approvalId}
```

Provides real-time updates on an approval request. The agent connects to this WebSocket after receiving an ESCALATE response. Events:

```json
{ "event": "APPROVAL_PENDING", "approvalId": "<UUID>", "timeout": "PT15M" }
{ "event": "APPROVAL_GRANTED", "approvalId": "<UUID>", "approvedBy": "<operator>" }
{ "event": "APPROVAL_DENIED", "approvalId": "<UUID>", "deniedBy": "<operator>", "reason": "<string>" }
{ "event": "APPROVAL_EXPIRED", "approvalId": "<UUID>" }
```

---

## 8. Attestation API

The Attestation API provides access to Governance Proofs for external verification.

### 8.1 Get Governance Proof

```
GET /v1/attestations/{proofId}
```

**Response (200 OK):**

```json
{
  "proofId": "<UUID>",
  "type": "GOVERNANCE_PROOF",
  "version": "1.0",
  "gateId": "<gate Ed25519 public key>",
  "requestId": "<UUID>",
  "decision": "ALLOW",
  "toolName": "write_file",
  "policyHash": "<SHA-256>",
  "timestamp": "<ISO 8601>",
  "previousProofHash": "<SHA-256 of previous proof in chain>",
  "contentHash": "<SHA-256 of [decision + toolName + arguments + policyHash + timestamp]>",
  "signature": "<Ed25519 signature over contentHash>",
  "chainDepth": 1847
}
```

### 8.2 Verify Governance Proof

```
POST /v1/attestations/verify
```

**Request Body:**

```json
{
  "proofId": "<UUID>",
  "expectedGateId": "<gate public key, optional>",
  "expectedPolicyHash": "<SHA-256, optional>",
  "verifyChain": true
}
```

**Response (200 OK):**

```json
{
  "valid": true,
  "signatureValid": true,
  "chainValid": true,
  "policyHashMatch": true,
  "gateIdMatch": true,
  "proofAge": "PT2M30S"
}
```

### 8.3 Get Governance Proof Chain (Multi-Agent)

```
GET /v1/attestations/chain/{delegationId}
```

Returns the complete Governance Proof Chain (AOS-CORE-003 Section 6.4) for a delegated task:

```json
{
  "delegationId": "<UUID>",
  "chainLength": 3,
  "proofs": [
    { "depth": 0, "gateId": "<root DPG>", "proofId": "<UUID>", ... },
    { "depth": 1, "gateId": "<delegate DPG>", "proofId": "<UUID>", "parentProofId": "<UUID>", ... },
    { "depth": 2, "gateId": "<sub-delegate DPG>", "proofId": "<UUID>", "parentProofId": "<UUID>", ... }
  ],
  "chainValid": true,
  "restrictionEnvelopesValid": true
}
```

---

## 9. Policy API

The Policy API manages policy lifecycle operations.

### 9.1 Get Active Policy

```
GET /v1/policies/active
```

Returns the currently active policy document (in APL format, AOS-LANG-001).

### 9.2 Validate Policy

```
POST /v1/policies/validate
```

**Request Body:** A complete APL document.

**Response (200 OK):**

```json
{
  "valid": true,
  "aplVersion": "1.0",
  "policyId": "<UUID>",
  "policyVersion": "<semver>",
  "hashValid": true,
  "computedHash": "<SHA-256>",
  "validationResults": {
    "syntactic": { "passed": 9, "failed": 0, "errors": [] },
    "semantic": { "passed": 12, "failed": 0, "warnings": ["SEM-010: budget value exceeds 100x calibration for tool 'write_file'"], "errors": [] },
    "crossReference": { "passed": 5, "failed": 0, "errors": [] }
  }
}
```

### 9.3 Load Policy

```
POST /v1/policies/load
```

Loads a new policy. Requires operator authentication. The previous active policy transitions to DEPRECATED.

**Request Body:**

```json
{
  "policy": { ... },
  "operatorSignature": "<Ed25519 signature>",
  "reason": "Quarterly policy update — tightened network scope"
}
```

**Response (200 OK):**

```json
{
  "loaded": true,
  "previousPolicyId": "<UUID>",
  "newPolicyId": "<UUID>",
  "transitionedAt": "<ISO 8601>"
}
```

### 9.4 Policy Diff

```
POST /v1/policies/diff
```

Compares two policies and returns the differences:

```json
{
  "policyA": "<UUID or inline policy>",
  "policyB": "<UUID or inline policy>"
}
```

**Response (200 OK):**

```json
{
  "toolsAdded": ["new_tool"],
  "toolsRemoved": ["old_tool"],
  "toolsModified": [
    {
      "name": "write_file",
      "changes": [
        { "field": "scope.constraints.pathAllowlist", "old": ["/workspace/**"], "new": ["/workspace/src/**"] },
        { "field": "budget.limits.calls", "old": 1200, "new": 800 }
      ]
    }
  ],
  "categoriesAdded": ["market_manipulation"],
  "categoriesRemoved": [],
  "globalBudgetChanges": [],
  "scopeWidened": false,
  "scopeNarrowed": true
}
```

---

## 10. Telemetry API

The Telemetry API exposes gate metrics for monitoring, alerting, and the System Governance Layer (AOS-CORE-003 Section 9).

### 10.1 Get Current Metrics

```
GET /v1/telemetry/metrics
```

**Response (200 OK):**

```json
{
  "gateId": "<gate public key>",
  "timestamp": "<ISO 8601>",
  "uptime": "P3DT14H22M",
  "policyId": "<UUID>",
  "metrics": {
    "decisions": {
      "total": 18472,
      "allowed": 17839,
      "denied": 591,
      "escalated": 42,
      "rate": {
        "perMinute": 12.3,
        "perHour": 738
      }
    },
    "budgets": {
      "globalUtilization": 0.42,
      "toolUtilization": {
        "write_file": 0.67,
        "read_file": 0.31,
        "network.request": 0.55
      }
    },
    "approvals": {
      "pending": 1,
      "avgResponseTime": "PT2M15S",
      "expiredCount": 3
    },
    "journal": {
      "entries": 18472,
      "chainLength": 18472,
      "lastVerified": "<ISO 8601>",
      "integrityStatus": "VALID"
    },
    "errors": {
      "total": 7,
      "categories": {
        "SCOPE_VIOLATION": 4,
        "BUDGET_EXCEEDED": 2,
        "CATEGORY_PROHIBITED": 1
      }
    },
    "delegations": {
      "inbound": 3,
      "outbound": 7,
      "active": 10
    }
  }
}
```

### 10.2 Prometheus-Compatible Metrics

```
GET /v1/telemetry/prometheus
```

Returns metrics in Prometheus exposition format for integration with standard monitoring stacks:

```
# HELP aos_decisions_total Total governance decisions
# TYPE aos_decisions_total counter
aos_decisions_total{decision="ALLOW"} 17839
aos_decisions_total{decision="DENY"} 591
aos_decisions_total{decision="ESCALATE"} 42

# HELP aos_budget_utilization Current budget utilization ratio
# TYPE aos_budget_utilization gauge
aos_budget_utilization{tool="write_file"} 0.67
aos_budget_utilization{tool="read_file"} 0.31

# HELP aos_approval_pending Current pending approval count
# TYPE aos_approval_pending gauge
aos_approval_pending 1

# HELP aos_journal_chain_length Audit journal chain length
# TYPE aos_journal_chain_length counter
aos_journal_chain_length 18472
```

### 10.3 Health Check

```
GET /v1/health
```

**Response (200 OK):**

```json
{
  "status": "HEALTHY",
  "gateId": "<gate public key>",
  "aplVersion": "1.0",
  "policyLoaded": true,
  "policyId": "<UUID>",
  "journalIntegrity": "VALID",
  "uptime": "P3DT14H22M"
}
```

**R-API-008:** The health endpoint MUST NOT require authentication. It is used for load balancer health checks and should respond within 100ms.

---

## 11. Error Format

**R-API-009:** All API errors MUST use RFC 7807 (Problem Details for HTTP APIs) format:

```json
{
  "type": "https://aos-governance.org/errors/policy-not-loaded",
  "title": "Policy Not Loaded",
  "status": 503,
  "detail": "No active policy is loaded. The gate is in fail-closed mode and will deny all requests.",
  "instance": "/v1/decisions",
  "requestId": "<UUID>",
  "timestamp": "<ISO 8601>"
}
```

### 11.1 Standard Error Codes

| HTTP Status | Error Type | When |
|-------------|-----------|------|
| 400 | `invalid-request` | Malformed request body, missing required fields |
| 401 | `authentication-required` | Missing or invalid authentication credentials |
| 403 | `authorization-denied` | Authenticated but not authorized for this operation |
| 404 | `resource-not-found` | Journal entry, approval, or attestation not found |
| 409 | `conflict` | Policy load conflicts with active policy; approval already resolved |
| 422 | `validation-failed` | Policy validation failed (APL schema or semantic) |
| 429 | `rate-limited` | API rate limit exceeded |
| 500 | `internal-error` | Unexpected gate error |
| 503 | `policy-not-loaded` | No active policy; gate in fail-closed mode |

---

## 12. Authentication and Authorization

### 12.1 Agent-to-Gate Authentication

**R-API-010:** Agent requests to the Decision API MUST be authenticated. The gate MUST support at least one of:

| Method | Description | Tier |
|--------|-------------|------|
| **Bearer token** | Pre-shared token issued by operator | Foundation+ |
| **Mutual TLS** | Client certificate authentication | Enterprise+ |
| **Ed25519 signed request** | Request body signed with agent's Ed25519 key | Sovereign |

### 12.2 Operator-to-Gate Authentication

**R-API-011:** Operator requests (Policy API, Approval API) MUST use stronger authentication than agent requests. The gate MUST support at least:

| Method | Description | Tier |
|--------|-------------|------|
| **Bearer token + IP allowlist** | Token restricted to known operator IPs | Foundation+ |
| **Mutual TLS + RBAC** | Client certificate with role-based access | Enterprise+ |
| **Ed25519 signature + multi-party** | Signed by operator key, countersigned by second operator for critical operations | Sovereign |

### 12.3 API Rate Limiting

**R-API-012:** The gate MUST enforce rate limits on all API endpoints. RECOMMENDED defaults:

| Endpoint | Rate Limit |
|----------|-----------|
| Decision API | 1000 req/min per agent |
| Journal API | 100 req/min per client |
| Approval API | 50 req/min per operator |
| Attestation API | 200 req/min per client |
| Policy API | 10 req/min per operator |
| Telemetry API | 60 req/min per client |
| Health check | unlimited |

---

## 13. Conformance Testing

### 13.1 Core Conformance Tests

| Test ID | Input | Expected Output |
|---------|-------|----------------|
| API-T001 | Valid decision request for allowed tool | 200 OK, decision: ALLOW, executionToken present |
| API-T002 | Decision request for tool not in policy | 200 OK, decision: DENY, reason: TOOL_NOT_IN_POLICY |
| API-T003 | Decision request with scope violation | 200 OK, decision: DENY, reason: SCOPE_VIOLATION |
| API-T004 | Decision request requiring approval | 200 OK, decision: ESCALATE, approvalRequest present |
| API-T005 | Confirm execution with valid token | 200 OK, confirmed: true |
| API-T006 | Confirm execution with expired token | 400, error: invalid-request |
| API-T007 | Query journal entries with date range | 200 OK, entries array, pagination |
| API-T008 | Verify journal chain integrity | 200 OK, chainValid: true |
| API-T009 | Submit approval (APPROVED) | 200 OK, decision: APPROVED |
| API-T010 | Submit approval (DENIED) | 200 OK, decision: DENIED |
| API-T011 | Get Governance Proof by ID | 200 OK, valid proof with signature |
| API-T012 | Verify Governance Proof | 200 OK, valid: true, signatureValid: true |
| API-T013 | Validate a valid APL policy | 200 OK, valid: true |
| API-T014 | Validate an invalid APL policy (missing categories) | 200 OK, valid: false, errors: [SEM-003] |
| API-T015 | Load new policy with operator auth | 200 OK, loaded: true |
| API-T016 | Load policy without operator auth | 401, authentication-required |
| API-T017 | Get telemetry metrics | 200 OK, metrics object |
| API-T018 | Get Prometheus metrics | 200 OK, text/plain exposition format |
| API-T019 | Health check | 200 OK, status: HEALTHY |
| API-T020 | Decision request without authentication | 401, authentication-required |
| API-T021 | Decision request exceeding rate limit | 429, rate-limited |
| API-T022 | Get Governance Proof Chain for delegation | 200 OK, chain with proofs from multiple gates |

---

## 14. Security Considerations

### 14.1 Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| **Unauthenticated decision requests** | CRITICAL | R-API-010 mandatory authentication |
| **Journal tampering via API** | CRITICAL | Journal is append-only; API provides read-only access. Write is internal only. |
| **Approval spoofing** | HIGH | Operator authentication (R-API-011); Ed25519 signed approvals |
| **Policy injection** | CRITICAL | Operator authentication; policy validation before load; hash verification |
| **Telemetry data leakage** | MEDIUM | Telemetry endpoint requires authentication (except health check) |
| **Rate limit bypass** | MEDIUM | Rate limiting per authenticated identity, not per IP |
| **Governance Proof forgery** | CRITICAL | Ed25519 signature verification; chain integrity verification |
| **Execution token replay** | HIGH | Tokens are single-use, time-limited (30s default), bound to request ID |

### 14.2 Limitations

| Limitation | Reason | Mitigation |
|-----------|--------|------------|
| **No GraphQL support** | REST is simpler and more auditable | GraphQL adapter can be built as a proxy |
| **No gRPC support** | JSON/REST is more universally supported | gRPC adapter planned for high-throughput deployments |
| **WebSocket for approvals only** | SSE is insufficient for bidirectional approval; REST is sufficient for other endpoints | Future versions may add SSE for telemetry streaming |

---

## 15. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| **AOS-CORE-001** | The gate implementation that exposes these APIs. Decision API maps to the 11-step pipeline. |
| **AOS-LANG-001** | Policy API consumes and validates APL documents defined by LANG-001. |
| **AOS-CRYPTO-001** | Attestation API serves Governance Proofs with signatures and hashes defined by CRYPTO-001. |
| **AOS-CORE-003** | Attestation API serves Governance Proof Chains; Decision API handles delegation restriction checks. |
| **AOS-POL-001** | Journal API and Policy Diff support the policy lifecycle defined in POL-001. |

---

## Appendix A: OpenAPI 3.1 Summary

The full OpenAPI 3.1 specification is published at `schemas/aos-api-v1.0.openapi.yaml` in the AOS standards repository. This appendix provides a summary of all endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/decisions` | Submit tool call for governance evaluation |
| POST | `/v1/decisions/{requestId}/confirm` | Confirm tool execution |
| GET | `/v1/journal` | Query journal entries |
| GET | `/v1/journal/{entryId}` | Get single journal entry |
| GET | `/v1/journal/export` | Export journal for compliance |
| GET | `/v1/journal/verify` | Verify journal chain integrity |
| GET | `/v1/approvals` | List pending approvals |
| POST | `/v1/approvals/{approvalId}` | Submit approval decision |
| WS | `/v1/approvals/ws/{approvalId}` | WebSocket approval stream |
| GET | `/v1/attestations/{proofId}` | Get Governance Proof |
| POST | `/v1/attestations/verify` | Verify Governance Proof |
| GET | `/v1/attestations/chain/{delegationId}` | Get Governance Proof Chain |
| GET | `/v1/policies/active` | Get active policy |
| POST | `/v1/policies/validate` | Validate APL document |
| POST | `/v1/policies/load` | Load new policy |
| POST | `/v1/policies/diff` | Compare two policies |
| GET | `/v1/telemetry/metrics` | Get gate metrics (JSON) |
| GET | `/v1/telemetry/prometheus` | Get gate metrics (Prometheus) |
| GET | `/v1/health` | Health check |

---

## Appendix B: AI Disclosure

This standard was drafted with the assistance of AI tools under human editorial control. The API design, endpoint architecture, and security model were specified by the author. AI tools assisted with structural refinement, schema formatting, and cross-referencing with existing AOS standards. All normative requirements and design decisions reflect the author's judgment.

---

## Appendix C: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-05 | Initial publication. |
