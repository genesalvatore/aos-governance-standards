# AOS-PERSIST-001 v1.0 — Agent State Persistence Standard

**Status:** Published  
**Version:** 1.0  
**Date:** 2026-06-05  
**License:** CC-BY-4.0  
**Depends on:** AOS-CORE-001 v1.0, AOS-CRYPTO-001 v1.0, AOS-CORE-003 v1.0  

---

## 1. Abstract

This standard defines the requirements for persisting AI agent operational state across session boundaries, process restarts, host migrations, and catastrophic failures. It specifies a deterministic state serialization format, integrity verification, and recovery protocol that ensures an agent's governance context — including its active policy, journal position, budget counters, and approval state — survives any interruption without corruption, loss, or replay vulnerability.

**Scope:** This standard governs the persistence of *governance-relevant state* managed by the Deterministic Policy Gate (DPG). It does NOT govern the persistence of model weights, conversation history, or application-layer state — those are the responsibility of the agent framework.

---

## 2. Problem Statement

Agentic AI systems fail in three persistence-related modes that current frameworks do not address:

1. **State Amnesia:** After a crash or restart, the agent operates as if no prior decisions were made. Budget counters reset to zero. Approval grants vanish. The journal chain breaks. An agent that was 90% through its budget appears to have a full budget again.

2. **State Corruption:** Partial writes during a crash leave the state file in an inconsistent state. The policy says "100 calls remaining" but the journal shows 95 calls already made. The gate cannot determine which is correct.

3. **State Replay:** An attacker replaces the current state file with an older version. Budget counters roll back. Denied approvals reappear as granted. The journal loses entries, making it appear that prohibited actions never occurred.

These failures violate the core DPG invariant: **every tool call must be evaluated against the current, accurate governance context.** If the governance context is stale, corrupted, or missing, the gate cannot enforce policy correctly.

---

## 3. Terms and Definitions

> Terms defined in AOS-CORE-001 Section 3 apply throughout this document.

| Term | Definition |
|------|-----------|
| **Checkpoint** | A complete, consistent snapshot of gate state at a specific point in time |
| **State Epoch** | A monotonically increasing counter that identifies the temporal ordering of checkpoints |
| **WAL (Write-Ahead Log)** | A sequential log of state mutations written before they are applied to the checkpoint |
| **Recovery Point** | The combination of the last valid checkpoint plus all WAL entries after it |
| **State Seal** | A cryptographic commitment binding a checkpoint to its epoch, policy hash, and journal position |

---

## 4. Architecture

### 4.1 State Components

The DPG governance state consists of the following components, all of which MUST be persisted:

| Component | Type | Size Estimate | Mutation Frequency |
|-----------|------|--------------|-------------------|
| Active policy | PolicyDocument | 2–50 KB | Low (policy changes) |
| Policy hash | string | 64 bytes | Low (policy changes) |
| Budget counters | BudgetState | 200 bytes–2 KB | Every ALLOW decision |
| Budget window timestamps | Map<string, ISO8601> | 100 bytes–1 KB | Every budget window reset |
| Approval grants | Set<string> | 100 bytes–1 KB | Approval events |
| Journal position | { lastHash, length } | 128 bytes | Every decision |
| Pending executions | Map<string, PendingExecution> | 1–10 KB | Every ALLOW, cleared on confirm |
| Gate configuration | GateConfig | 200 bytes | Rarely (reconfiguration) |
| State epoch | uint64 | 8 bytes | Every checkpoint |
| Federation trust store | TrustBundle[] | 1–10 KB | Trust rotation events |

**R-PERSIST-001:** Implementations MUST persist ALL components listed in this table. Omitting any component creates a state gap that violates the DPG invariant.

### 4.2 Persistence Architecture

```
┌─────────────────────────────────────────────────┐
│                  DPG Runtime                     │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Policy   │  │  Budget  │  │   Journal    │   │
│  │  Engine   │  │  Tracker │  │   Writer     │   │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │               │            │
│       └──────────┬───┴───────────────┘            │
│                  │                                │
│         ┌───────▼────────┐                       │
│         │  State Manager │                       │
│         └───────┬────────┘                       │
│                 │                                │
├─────────────────┼────────────────────────────────┤
│                 │     Persistence Layer           │
│    ┌────────────▼──────────────┐                 │
│    │     Write-Ahead Log       │                 │
│    │  (append-only, fsync'd)   │                 │
│    └────────────┬──────────────┘                 │
│                 │                                │
│    ┌────────────▼──────────────┐                 │
│    │     Checkpoint Store      │                 │
│    │  (atomic write, sealed)   │                 │
│    └───────────────────────────┘                 │
└─────────────────────────────────────────────────┘
```

**R-PERSIST-002:** The persistence layer MUST use a write-ahead log (WAL) pattern. State mutations are written to the WAL before being applied to the in-memory state. On recovery, the WAL is replayed from the last checkpoint to reconstruct current state.

**R-PERSIST-003:** Checkpoint writes MUST be atomic. Implementations MUST use one of:
- Write to temporary file + `fsync` + atomic rename
- Database transaction with SERIALIZABLE isolation
- Copy-on-write filesystem snapshot

A partially-written checkpoint MUST NOT be loadable.

---

## 5. Checkpoint Format

### 5.1 Serialization

**R-PERSIST-004:** Checkpoints MUST be serialized as JSON with the following top-level structure:

```json
{
  "formatVersion": "AOS-PERSIST-001/1.0",
  "gateId": "string — matches GateConfig.gateId",
  "epoch": 42,
  "timestamp": "2026-06-05T17:00:00.000Z",
  "seal": {
    "algorithm": "HMAC-SHA-256",
    "value": "hex-encoded seal value",
    "inputs": {
      "epoch": 42,
      "policyHash": "sha256:...",
      "journalPosition": "sha256:...",
      "journalLength": 1547,
      "budgetFingerprint": "sha256:..."
    }
  },
  "policy": { "...PolicyDocument..." },
  "budgetState": {
    "global": { "calls": 847, "bytes": 4521890, "cost": 12.47 },
    "perTool": {
      "read_file": { "calls": 412, "bytes": 3200000 },
      "write_file": { "calls": 87, "bytes": 890000 }
    },
    "windowStart": {
      "global": "2026-06-05T16:00:00.000Z",
      "read_file": "2026-06-05T16:00:00.000Z"
    }
  },
  "approvals": {
    "firstUse": ["run_command", "deploy"],
    "session": []
  },
  "journalPosition": {
    "lastHash": "sha256:...",
    "length": 1547
  },
  "pendingExecutions": {},
  "config": { "...GateConfig..." },
  "federation": {
    "trustedGates": [],
    "delegationTokens": []
  }
}
```

**R-PERSIST-005:** The `epoch` field MUST be a monotonically increasing unsigned 64-bit integer. Each checkpoint MUST have a strictly greater epoch than the previous checkpoint. Implementations MUST reject any checkpoint with an epoch ≤ the current epoch (anti-replay).

**R-PERSIST-006:** The `seal` field MUST be computed over the concatenation of `epoch + policyHash + journalPosition.lastHash + journalLength + budgetFingerprint`. The `budgetFingerprint` is the SHA-256 hash of the canonical JSON serialization of `budgetState`.

### 5.2 Seal Verification

On checkpoint load, the implementation MUST:

1. Recompute the seal from the checkpoint's content
2. Compare the recomputed seal to the stored `seal.value`
3. Verify that `epoch > lastKnownEpoch`
4. Verify that `journalPosition.lastHash` matches the actual journal's last entry hash

If any verification fails, the checkpoint MUST be rejected. The gate MUST enter fail-closed mode until a valid checkpoint is restored or the operator explicitly initializes fresh state.

**R-PERSIST-007:** Seal verification failure MUST be logged as a P0 security event. This may indicate state tampering.

---

## 6. Write-Ahead Log (WAL)

### 6.1 WAL Entry Format

Each WAL entry records a single state mutation:

```json
{
  "walSequence": 15847,
  "timestamp": "2026-06-05T17:03:42.127Z",
  "epoch": 42,
  "type": "BUDGET_CONSUME",
  "payload": {
    "tool": "read_file",
    "calls": 1,
    "bytes": 4096
  },
  "previousHash": "sha256:...",
  "entryHash": "sha256:..."
}
```

**R-PERSIST-008:** WAL entries MUST be hash-chained using the same algorithm as the journal (AOS-CRYPTO-001). The WAL forms an independent chain from the journal — they are not interleaved.

**R-PERSIST-009:** WAL entries MUST be flushed to durable storage (`fsync` or equivalent) before the corresponding state mutation is acknowledged. This ensures that no acknowledged mutation is lost on crash.

### 6.2 WAL Entry Types

| Type | Payload | When |
|------|---------|------|
| `POLICY_LOAD` | Full PolicyDocument | Policy loaded or hot-reloaded |
| `BUDGET_CONSUME` | { tool, calls, bytes } | ALLOW decision |
| `BUDGET_RESET` | { tool, window } | Budget window expires |
| `APPROVAL_GRANT` | { tool, type, approver } | Approval granted |
| `APPROVAL_REVOKE` | { tool, reason } | Approval revoked |
| `EXECUTION_CONFIRM` | { requestId } | Execution confirmed |
| `EXECUTION_EXPIRE` | { requestId } | Execution token expired |
| `TRUST_ADD` | { gateId, certificate } | Federation trust added |
| `TRUST_REVOKE` | { gateId, reason } | Federation trust revoked |
| `CONFIG_UPDATE` | Partial GateConfig | Configuration changed |

**R-PERSIST-010:** Implementations MUST support all WAL entry types listed in this table. Unknown WAL entry types encountered during replay MUST cause a recovery failure (fail-closed), not silent skip.

### 6.3 WAL Compaction

The WAL grows indefinitely without compaction. Implementations MUST compact the WAL by:

1. Writing a new checkpoint (capturing all current state)
2. Verifying the new checkpoint passes seal verification
3. Truncating all WAL entries with `walSequence < checkpoint.walSequence`

**R-PERSIST-011:** WAL compaction MUST NOT occur during active request evaluation. The compaction process MUST acquire an exclusive lock or use a quiescent point to ensure no in-flight mutations are lost.

**R-PERSIST-012:** Implementations SHOULD compact the WAL when it exceeds 10,000 entries or 10 MB, whichever comes first. This is a RECOMMENDATION — implementations MAY use different thresholds based on their I/O characteristics.

---

## 7. Recovery Protocol

### 7.1 Startup Recovery Sequence

On gate startup, the persistence layer MUST execute the following recovery sequence:

```
1. LOCATE checkpoint file
   ├─ Found → goto 2
   └─ Not found → FRESH START (initialize empty state, epoch = 0)

2. LOAD checkpoint
   ├─ Parse succeeds → goto 3
   └─ Parse fails → CORRUPT CHECKPOINT
      ├─ Backup checkpoint exists → load backup, goto 3
      └─ No backup → FAIL CLOSED (operator intervention required)

3. VERIFY seal
   ├─ Seal valid → goto 4
   └─ Seal invalid → TAMPER DETECTED
      └─ Log P0 event → FAIL CLOSED

4. VERIFY epoch
   ├─ epoch > lastKnownEpoch → goto 5
   └─ epoch <= lastKnownEpoch → REPLAY ATTACK DETECTED
      └─ Log P0 event → FAIL CLOSED

5. LOCATE WAL file
   ├─ Found → goto 6
   └─ Not found → CHECKPOINT-ONLY RECOVERY
      └─ State = checkpoint state (some mutations may be lost)
      └─ Log WARNING: WAL missing, recovery may be incomplete

6. REPLAY WAL entries (in sequence order)
   ├─ All entries valid → RECOVERY COMPLETE
   │   └─ State = checkpoint + WAL replay
   └─ Entry parse/hash failure → PARTIAL RECOVERY
       └─ State = checkpoint + valid WAL entries before failure
       └─ Log WARNING: WAL truncated at entry N

7. WRITE new checkpoint with incremented epoch
   └─ This anchors the recovered state and compacts the WAL

8. RESUME normal operation
```

**R-PERSIST-013:** The recovery sequence MUST be idempotent. Running recovery multiple times on the same checkpoint + WAL MUST produce identical state.

**R-PERSIST-014:** During recovery, the gate MUST NOT accept any decision requests. The gate enters `RECOVERING` health status until Step 8 completes.

### 7.2 Consistency Guarantees

| Failure Mode | Data Loss | Recovery Time | Invariant Preserved? |
|-------------|-----------|---------------|---------------------|
| Clean shutdown | None | < 1s | ✅ Yes |
| Process crash (WAL intact) | None | < 5s | ✅ Yes |
| Process crash (WAL partial) | Last N uncommitted mutations | < 5s | ✅ Yes (budget over-counted, not under-counted) |
| Disk failure (checkpoint intact) | WAL entries since checkpoint | Recovery time | ⚠️ Partial — budget may over-count |
| Full disk loss | All state | N/A | ❌ No — requires operator re-initialization |
| State file replacement (replay) | Detected and rejected | N/A | ✅ Yes (anti-replay) |

**R-PERSIST-015:** On partial WAL loss, budget counters MUST be reconstructed from the checkpoint values, which represent a *conservative* (higher) estimate of consumption. This ensures the gate never *under-counts* budget usage after recovery — it may deny requests that would have been allowed, but it will never allow requests that should be denied.

---

## 8. Checkpoint Scheduling

### 8.1 Checkpoint Triggers

Implementations MUST create a checkpoint on any of the following events:

| Trigger | Rationale |
|---------|-----------|
| Policy load/reload | Policy is the highest-value state component |
| Every N ALLOW decisions (default: 100) | Limits WAL size between checkpoints |
| Budget window reset | Captures the clean budget state |
| Approval grant or revoke | Approval state affects security decisions |
| Clean shutdown signal (SIGTERM) | Ensures clean recovery on next start |
| Timer (default: every 5 minutes) | Bounds maximum recovery time |

**R-PERSIST-016:** Implementations MUST create a checkpoint on clean shutdown. Failure to checkpoint on shutdown increases recovery time and data loss risk.

**R-PERSIST-017:** Implementations SHOULD create a checkpoint on policy load. The policy is the most critical state component; losing a policy load event on crash forces the operator to re-load the policy after recovery.

### 8.2 Checkpoint Retention

**R-PERSIST-018:** Implementations MUST retain at least the 2 most recent valid checkpoints. The current checkpoint may be corrupt (detected on next load); the previous checkpoint provides a fallback.

**R-PERSIST-019:** At Sovereign tier, implementations MUST retain at least 10 checkpoints and MUST archive checkpoints to a separate storage medium (e.g., object storage, tape). This provides forensic recovery capability for audit investigations.

---

## 9. Multi-Gate Persistence

### 9.1 Shared-Nothing Persistence

In multi-gate deployments (AOS-CORE-003), each gate MUST maintain its own independent persistence store.

**R-PERSIST-020:** Gates MUST NOT share checkpoint files, WAL files, or state databases. State isolation is a security boundary — a compromised gate's state MUST NOT affect other gates.

### 9.2 State Replication

For high-availability deployments, implementations MAY replicate state across gate instances using the following constraints:

**R-PERSIST-021:** State replication MUST use the checkpoint format defined in Section 5. Raw WAL replication is NOT permitted (WAL entries reference internal state that may differ between instances).

**R-PERSIST-022:** The replicated checkpoint MUST be sealed with the originating gate's key AND verified by the receiving gate before acceptance. The receiving gate MUST NOT accept a replicated checkpoint with an epoch ≤ its own current epoch.

### 9.3 Federation State Persistence

When a gate participates in a federation (AOS-CORE-003), the federation trust store MUST be persisted as part of the checkpoint.

**R-PERSIST-023:** Trust rotation events (trust additions, revocations, certificate updates) MUST be recorded as WAL entries. On recovery, the trust store MUST be reconstructed from the checkpoint + WAL to ensure no trust revocations are lost.

---

## 10. Storage Backend Requirements

### 10.1 Backend Interface

Implementations MUST support at minimum ONE storage backend. The following interface defines the required operations:

```typescript
interface PersistenceBackend {
  // Checkpoint operations
  writeCheckpoint(checkpoint: Checkpoint): Promise<void>;
  readCheckpoint(): Promise<Checkpoint | null>;
  readPreviousCheckpoint(): Promise<Checkpoint | null>;
  
  // WAL operations
  appendWAL(entry: WALEntry): Promise<void>;
  readWAL(afterSequence: number): Promise<WALEntry[]>;
  truncateWAL(beforeSequence: number): Promise<void>;
  
  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;
}
```

### 10.2 Backend Implementations

| Backend | Foundation | Enterprise | Sovereign | Notes |
|---------|-----------|-----------|-----------|-------|
| Local filesystem | ✅ Required | ✅ Supported | ⚠️ With encrypted volume | Default for single-node |
| SQLite | ✅ Supported | ✅ Recommended | ⚠️ With WAL mode + encryption | Good balance of simplicity and durability |
| PostgreSQL | ❌ Overhead | ✅ Supported | ✅ Recommended | Multi-node, SERIALIZABLE transactions |
| etcd/Consul | ❌ Overhead | ✅ Supported | ✅ Supported | Distributed consensus |
| S3/GCS (checkpoint only) | ❌ Latency | ⚠️ Archive only | ✅ Archive | Checkpoint archival, not active WAL |

**R-PERSIST-024:** At Sovereign tier, checkpoint files MUST be encrypted at rest using AES-256-GCM or equivalent. The encryption key MUST be stored in a hardware security module (HSM) or key management service — not on the same filesystem as the checkpoint.

---

## 11. Performance Requirements

| Operation | Maximum Latency | Rationale |
|-----------|----------------|-----------|
| WAL append (single entry) | 5 ms (p99) | Must not add significant overhead to decision pipeline |
| Checkpoint write | 500 ms (p99) | Acceptable for periodic operation |
| Recovery (checkpoint + 1000 WAL entries) | 10 seconds | Gate must recover quickly after crash |
| Seal verification | 10 ms (p99) | Performed once on startup |

**R-PERSIST-025:** WAL append latency MUST NOT exceed 10 ms at p99 under normal operating conditions. If WAL append consistently exceeds this threshold, the persistence backend is a bottleneck and MUST be upgraded or the checkpoint frequency MUST be increased (to reduce WAL length).

**R-PERSIST-026:** Implementations MUST measure and expose persistence latency metrics via the telemetry API (AOS-API-001). The following metrics MUST be available:

- `aos_wal_append_duration_seconds` (histogram)
- `aos_checkpoint_write_duration_seconds` (histogram)
- `aos_recovery_duration_seconds` (gauge, set on startup)
- `aos_wal_entries_since_checkpoint` (gauge)

---

## 12. Security Considerations

### 12.1 Threat Model

| Threat | Mitigation | Requirement |
|--------|-----------|-------------|
| Checkpoint tampering | Seal verification (Section 5.2) | R-PERSIST-006 |
| State replay (rollback) | Monotonic epoch counter | R-PERSIST-005 |
| WAL truncation | Hash chain verification | R-PERSIST-008 |
| Checkpoint theft (confidentiality) | Encryption at rest | R-PERSIST-024 |
| WAL injection (fake entries) | Hash chain + seal binding | R-PERSIST-008 |
| Race condition on write | Atomic checkpoint writes | R-PERSIST-003 |
| Recovery manipulation | Idempotent recovery | R-PERSIST-013 |

### 12.2 Sovereign Tier Additional Requirements

**R-PERSIST-027:** At Sovereign tier, the state seal MUST use Ed25519 signatures (not HMAC). The signing key MUST be stored in an HSM.

**R-PERSIST-028:** At Sovereign tier, WAL entries MUST be individually signed. This prevents an attacker from injecting entries even if they compromise the WAL file.

**R-PERSIST-029:** At Sovereign tier, checkpoint archives MUST be retained for the regulatory retention period (minimum 7 years for financial services, 6 years for HIPAA, or as specified by applicable regulation).

---

## 13. Conformance Requirements

### 13.1 Conformance Levels

| Level | Requirements |
|-------|-------------|
| **PERSIST-L1 (Foundation)** | R-PERSIST-001 through R-PERSIST-017 |
| **PERSIST-L2 (Enterprise)** | L1 + R-PERSIST-018 through R-PERSIST-023, R-PERSIST-025, R-PERSIST-026 |
| **PERSIST-L3 (Sovereign)** | L2 + R-PERSIST-024, R-PERSIST-027 through R-PERSIST-029 |

### 13.2 Conformance Tests

| Test ID | Requirement | Test Description |
|---------|------------|-----------------|
| PERSIST-T001 | R-PERSIST-001 | Crash gate mid-request → recover → verify all state components present |
| PERSIST-T002 | R-PERSIST-003 | Kill gate during checkpoint write → verify no corrupt checkpoint on restart |
| PERSIST-T003 | R-PERSIST-005 | Present checkpoint with epoch ≤ current → verify rejection |
| PERSIST-T004 | R-PERSIST-006 | Modify checkpoint content without updating seal → verify rejection |
| PERSIST-T005 | R-PERSIST-007 | Tamper with checkpoint → verify P0 security event logged |
| PERSIST-T006 | R-PERSIST-009 | Kill gate after WAL write but before checkpoint → verify WAL replays |
| PERSIST-T007 | R-PERSIST-010 | Inject unknown WAL entry type → verify fail-closed |
| PERSIST-T008 | R-PERSIST-013 | Run recovery twice → verify identical state |
| PERSIST-T009 | R-PERSIST-015 | Partial WAL loss → verify budget over-counts (conservative) |
| PERSIST-T010 | R-PERSIST-016 | Send SIGTERM → verify checkpoint created before exit |

---

## 14. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| AOS-CORE-001 v1.0 | Defines the gate state that PERSIST-001 persists |
| AOS-CRYPTO-001 v1.0 | Defines the cryptographic algorithms for seals and chains |
| AOS-CORE-003 v1.0 | Defines federation trust store that must be persisted |
| AOS-API-001 v1.0 | Defines telemetry endpoints for persistence metrics |
| AOS-HARD-001 v1.0 | At Sovereign tier, checkpoint encryption keys may reside in hardware |

---

## Appendix A: Prior Art and Provenance

This standard was developed as part of the AOS Governance Standard suite, based on established database recovery patterns (ARIES, WAL, checkpoint/recovery) adapted for the unique requirements of AI governance state. The combination of monotonic epoch counters, cryptographic seals, and anti-replay verification is novel to AI governance contexts.

Prior art is established upon public publication. The publication date constitutes the prior art date for all methods, systems, and patterns described herein.

---

## Appendix B: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-05 | Initial standard release |

---

## Appendix C: AI Disclosure

This document was developed through a collaborative process. The original architecture, strategic analysis, and editorial decisions were provided by the author. AI tools assisted with technical review, adversarial analysis, drafting, and structural refinement under human editorial control.

---

*AOS-PERSIST-001 v1.0 — Agent State Persistence Standard*  
*Published by the AOS Foundation under CC-BY-4.0*  
*Prior art established: 2026-06-05*  
*"AOS," "AOS Foundation," and "Deterministic Policy Gate" are trademarks of AOS Foundation. CC-BY-4.0 governs copyright licensing only; trademark rights are reserved.*

---

## About the AOS Foundation

The AOS Foundation develops and publishes open standards for autonomous AI governance. The Foundation's mission is to ensure that AI systems operate within deterministic, auditable, human-governed boundaries — and that the standards defining those boundaries are freely available to everyone.

Standards governance is conducted through public GitHub repositories. Contributions, issues, and review requests are welcome from all parties.

- Standards repository: [github.com/genesalvatore/aos-governance-standards](https://github.com/genesalvatore/aos-governance-standards)
- Website: [aos-governance.com](https://aos-governance.com)
