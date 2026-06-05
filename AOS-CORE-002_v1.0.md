# AOS-CORE-002 v1.0 — Emergency Kill Switch Protocol

**Standard:** AOS-CORE-002  
**Title:** Asynchronous Out-of-Band Execution Interrupt Protocol  
**Version:** 1.0  
**Status:** Draft  
**Date:** 2026-06-05  
**Author:** Eugene Christopher Salvatore  
**License:** CC-BY-4.0  
**Companion to:** AOS-CORE-001 (Deterministic Policy Gate), AOS-HARD-001 (Hardware Enforcement Boundary)

---

## Abstract

This standard defines the emergency kill switch protocol for the AOS Deterministic Policy Gate (DPG) architecture. While AOS-CORE-001 specifies how the DPG evaluates and enforces policy on individual tool calls, AOS-CORE-002 specifies how to **terminate an agent's entire execution authority** — immediately, deterministically, and irrevocably — when the DPG alone is insufficient.

The kill switch is not a feature. It is a constitutional guarantee: human operators maintain absolute, non-bypassable authority to sever any agent's execution at any time, for any reason, with sub-100 millisecond latency, without the agent's cooperation, and with a complete cryptographic audit trail.

This standard specifies four integrated components:

1. **Out-of-Band Interrupt Signal** — a control-plane mechanism physically or logically separated from the agent's execution path
2. **Multi-Tiered Severance** — from single-agent node kill to system-wide physical-layer emergency stop
3. **Stateful Cognitive Checkpointing** — preserving the agent's state at the moment of kill for forensic analysis and potential reconstruction
4. **Merkle-Tree Authenticated Audit Trail** — immutable, non-repudiable proof of every kill event

> **Design philosophy:** The DPG says "you may not do this." The kill switch says "you may not do anything." The DPG is a scalpel. The kill switch is a circuit breaker. Both are necessary. Neither is sufficient alone.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Normative References](#2-normative-references)
3. [Terms and Definitions](#3-terms-and-definitions)
4. [Architecture](#4-architecture)
5. [Out-of-Band Interrupt Signal](#5-out-of-band-interrupt-signal)
6. [Multi-Tiered Severance](#6-multi-tiered-severance)
7. [Stateful Cognitive Checkpointing](#7-stateful-cognitive-checkpointing)
8. [Audit Trail](#8-audit-trail)
9. [Recovery Protocol](#9-recovery-protocol)
10. [Conformance Testing](#10-conformance-testing)
11. [Security Considerations](#11-security-considerations)
12. [Relationship to Other Standards](#12-relationship-to-other-standards)

---

## 1. Scope

### 1.1 What This Standard Covers

This standard specifies the protocol for emergency termination of autonomous agent execution. It covers:

- **Interrupt signal architecture:** How the kill signal reaches the enforcement gate without passing through the agent's execution path
- **Severance tiers:** Graduated termination from single-agent to system-wide physical isolation
- **State preservation:** Capturing the agent's cognitive state at the moment of termination for forensic analysis
- **Audit trail:** Immutable cryptographic proof of every kill event, including the trigger, the operator, and the blocked payload
- **Recovery:** Controlled reconstruction of agent execution after security review

### 1.2 What This Standard Does Not Cover

- Per-tool-call policy enforcement (see AOS-CORE-001)
- Hardware-level kill switch implementation details (see AOS-HARD-001 Section 8)
- Policy authoring for kill trigger conditions (see AOS-POL-001)
- Multi-agent federation kill propagation (see planned AOS-CORE-003)

### 1.3 Relationship to Tiers

| Tier | Kill Switch Requirements |
|------|-----------------------|
| **Foundation** | Software-only kill: process termination + execution token revocation. State checkpointing is RECOMMENDED. |
| **Enterprise** | Software kill + out-of-band interrupt channel (separate control plane). State checkpointing is REQUIRED. Merkle-tree audit is REQUIRED. |
| **Sovereign** | All Enterprise requirements + hardware kill switch (AOS-HARD-001 R-KILL-001 through R-KILL-005). Physical-layer severance capability is REQUIRED. |

### 1.4 Constitutional Basis

The kill switch implements an unamendable constitutional principle: **human operators maintain absolute interrupt authority over all autonomous execution.** This authority:

- Cannot be overridden by the agent
- Cannot be revoked by software configuration
- Cannot be delayed by queuing or buffering
- Cannot be conditioned on the agent's consent or cooperation
- Survives kernel compromise (Sovereign tier)
- Survives network partition (all tiers — local kill always works)

### 1.5 Implementation Status

> **NOTE:** Foundation-tier (software-only) kill switch implementations are achievable with current technology. Enterprise-tier requires a dedicated control-plane microservice. Sovereign-tier (including Tier 4 physical-layer severance) depends on AOS-HARD-001 hardware, which does not yet exist as a commercial product. See AOS-HARD-001 Section 1.5 for the hardware development roadmap.

### 1.6 Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## 2. Normative References

- **AOS-CORE-001 v1.0** — Deterministic Policy Gate specification
- **AOS-HARD-001 v1.0** — Hardware Enforcement Boundary (Section 8: Hardware Kill Switch)
- **AOS-POL-001 v1.0** — Policy Authoring Guide
- **AOS-CRYPTO-001** — Cryptographic Standards (companion standard, planned)
- **RFC 2119** — Key words for use in RFCs to Indicate Requirement Levels
- **RFC 6962** — Certificate Transparency (Merkle tree structure reference)
- **NIST SP 800-193** — Platform Firmware Resiliency Guidelines

---

## 3. Terms and Definitions

Terms defined in AOS-CORE-001 Section 3 and AOS-HARD-001 Section 3 apply. Additional terms:

**Kill Switch:** A mechanism that terminates an agent's execution authority — completely, immediately, and irrevocably — through a control path that does not pass through the agent's execution environment. The kill switch is not a request to the agent to stop; it is a unilateral revocation of the agent's ability to act.

**Out-of-Band (OOB) Interrupt:** A signal delivered through a control plane that is physically or logically separated from the agent's data plane. The agent cannot intercept, delay, modify, or suppress an OOB interrupt because the signal never enters the agent's address space.

**Severance:** The complete termination of an agent's execution authority. After severance, the agent has no ability to execute tool calls, read context, generate outputs, or communicate with external systems. Severance is not "pause" — it is permanent until an authorized operator explicitly restores execution.

**Cognitive Checkpoint:** A cryptographically signed snapshot of the agent's state at the moment of severance. The checkpoint includes the agent's context, the tool call that was blocked (if any), the trigger reason, and sufficient state to enable forensic analysis or controlled reconstruction.

**Intent Payload:** The structured representation of a tool call that the agent has generated but that has not yet been executed. The kill switch blocks intent payloads at the DPG — the action is prevented, not reversed.

**Severance Tier:** The scope of the kill. Tier 1 (Node) kills one agent. Tier 2 (Cluster) kills a group. Tier 3 (Global) kills all agents. Tier 4 (Physical) cuts hardware power.

---

## 4. Architecture

### 4.1 Kill Switch Position in the DPG Pipeline

The kill switch operates as a **pre-execution gate check** within the DPG pipeline. Before any tool call is evaluated against policy, the gate checks the out-of-band interrupt signal store. If an active interrupt exists, the tool call is immediately blocked — the 11-step policy evaluation is never reached.

```
Agent generates intent payload
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                DETERMINISTIC POLICY GATE                   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  STEP 0: OUT-OF-BAND INTERRUPT CHECK                  │  │
│  │                                                        │  │
│  │  Check interrupt signal store for active kill:          │  │
│  │  • Agent-specific kill (Tier 1)                         │  │
│  │  • Cluster-wide kill (Tier 2)                           │  │
│  │  • Global kill (Tier 3)                                 │  │
│  │  • Physical-layer kill (Tier 4)                         │  │
│  │                                                        │  │
│  │  If ANY kill is active → EXECUTION_SEVERED             │  │
│  │  Skip all remaining steps.                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         │ (no active kill)                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  STEPS 1-11: Normal policy evaluation                  │  │
│  │  (as specified in AOS-CORE-001 Section 4.1)           │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**R-INT-001:** The out-of-band interrupt check MUST be the FIRST operation in the DPG pipeline — before request integrity verification, before policy loading, before any other evaluation step. A kill signal preempts all other processing.

**R-INT-002:** The interrupt check MUST complete within 1 millisecond. The check is a simple read from a local signal store (in-memory cache, shared memory segment, or hardware register). It MUST NOT involve network I/O, disk I/O, or any operation that could be delayed by the agent's workload.

### 4.2 Out-of-Band Control Plane

The kill signal is delivered through a control plane that is **architecturally separated** from the agent's data plane:

```
┌──────────────────────────────────────────────────────────┐
│                    DATA PLANE                              │
│  Agent ←→ Context ←→ LLM ←→ Tool Calls ←→ DPG ←→ Exec   │
└──────────────────────────────────────────────────────────┘
                    ╳ NO CROSSOVER ╳
┌──────────────────────────────────────────────────────────┐
│                   CONTROL PLANE                            │
│  Operator ←→ Kill API ←→ Signal Store ←→ DPG Step 0      │
│                                                            │
│  The agent CANNOT:                                         │
│  • Read the control plane signal store                     │
│  • Write to the control plane signal store                 │
│  • Intercept messages on the control plane                 │
│  • Delay or buffer control plane signals                   │
│  • Query whether a kill signal is pending                  │
└──────────────────────────────────────────────────────────┘
```

**R-INT-003:** The control plane MUST be isolated from the data plane. The agent process MUST NOT have read or write access to the interrupt signal store. Isolation MUST be enforced by:

| Tier | Isolation Mechanism |
|------|-------------------|
| **Foundation** | Separate process with OS-level access control (file permissions, Unix domain socket with SO_PEERCRED) |
| **Enterprise** | Separate microservice on dedicated port/address, mutual TLS authentication, network namespace isolation |
| **Sovereign** | Hardware-isolated signal path (AOS-HARD-001 R-HW-002) — agent cannot access the signal at any privilege level |

**R-INT-004:** The control plane MUST function during network partition. A local kill signal MUST always be deliverable regardless of network connectivity. The interrupt signal store MUST be co-located with the DPG (same host, same hardware enforcement boundary).

### 4.3 Latency Requirements

This standard distinguishes between **severance latency** (the agent loses all execution authority) and **completion latency** (all cleanup operations finish). The constitutional guarantee applies to severance latency only.

| Operation | Category | Maximum Latency | Rationale |
|-----------|----------|----------------|-----------|
| **Interrupt signal delivery** (operator → signal store) | Severance | ≤ 50 ms (local), ≤ 200 ms (remote) | Signal must arrive before the agent can execute a pending tool call |
| **Interrupt check** (DPG Step 0 read) | Severance | ≤ 1 ms | Lock-free in-memory read; must not bottleneck the DPG pipeline |
| **Token revocation** (Step 1) | Severance | < 1 ms | Agent is effectively dead after this step |
| **Process freeze** (SIGSTOP) | Severance | < 1 ms | Prevents in-memory state modification before checkpoint |
| **Process termination** (SIGKILL) | Severance | ≤ 50 ms | Final process destruction |
| **State checkpoint** (Tier 1-3 only) | Completion | ≤ 500 ms | Occurs on frozen process; proceeds in parallel with kill if budget exceeded |
| **CoW rollback** | Completion | ≤ 100 ms | Filesystem cleanup |
| **Audit record commit** | Completion | ≤ 200 ms | Merkle tree write |

**R-INT-005:** The **severance latency** from operator trigger to complete revocation of the agent's execution authority (token revocation + process termination) MUST NOT exceed 100 milliseconds for local triggers and 500 milliseconds for remote triggers. These targets cover signal delivery, interrupt check, token revocation, and process kill. State checkpointing, CoW rollback, and audit record commit are **completion operations** that occur AFTER the agent is dead and are NOT included in the severance latency guarantee.

**R-INT-006:** If the state checkpoint cannot complete within its 500ms budget, the system MUST proceed with process termination WITHOUT the checkpoint. Safety takes absolute precedence over state preservation. A partial checkpoint (whatever was serialized before the deadline) SHOULD be retained for forensic value.

---

## 5. Out-of-Band Interrupt Signal

### 5.1 Signal Structure

**R-INT-007:** The interrupt signal MUST contain the following fields:

```
Interrupt Signal Structure:

{
  "signal_id": "<UUID>",
  "timestamp": "<ISO 8601 with millisecond precision>",
  "tier": <1|2|3|4>,
  "target": {
    "agent_id": "<agent identifier>",          // Tier 1
    "cluster_id": "<cluster identifier>",      // Tier 2
    "system_id": "<system-wide identifier>"    // Tier 3
    // Tier 4: no target — applies to physical infrastructure
  },
  "reason_code": "<enumerated reason>",
  "reason_text": "<human-readable explanation>",
  "operator_id": "<authenticated operator identity>",
  "operator_signature": "<Ed25519 signature over signal body>",
  "constitutional_basis": "<reference to constitutional authority>",
  "urgency": "<IMMEDIATE | GRACEFUL>",   // See Section 6.6
  "payload_blocked": {
    "tool": "<tool name that was pending, if any>",
    "arguments_hash": "<SHA-256 of the blocked arguments>"
  }
}
```

### 5.2 Reason Codes

**R-INT-008:** The interrupt signal MUST include a reason code from the following enumeration:

| Code | Meaning | Typical Trigger |
|------|---------|----------------|
| `POLICY_VIOLATION` | DPG detected a policy violation that warrants full termination | Repeated DENY with escalating severity |
| `TRAJECTORY_ANOMALY` | Syscall baseline deviation detected (AOS-HARD-001 Section 7) | Entropy anomaly, velocity anomaly, sequence anomaly |
| `OPERATOR_OVERRIDE` | Human operator exercised manual kill authority | Judgment call based on observed behavior |
| `WATCHDOG_TIMEOUT` | Automated watchdog detected unresponsive or compromised system | AOS-HARD-001 R-HW-021 heartbeat failure |
| `JOURNAL_FAILURE` | Audit journal capacity exceeded or integrity compromised | AOS-HARD-001 R-HW-007 |
| `CONTEXT_POISONING` | Agent's context determined to be compromised | Detected via semantic analysis or trajectory deviation |
| `BUDGET_EXHAUSTION` | Agent has exhausted all execution budgets | AOS-CORE-001 budget enforcement |
| `EXTERNAL_THREAT` | External security event requires precautionary shutdown | Network intrusion, physical security breach |
| `SAFETY_CRITICAL` | Agent controls physical actuators and safety condition detected | AOS-CORE-001 Condition 2 (embodied AI) |
| `COMPLIANCE` | Regulatory or legal requirement to terminate | Court order, regulatory directive, incident response |
| `MAINTENANCE` | Planned shutdown for system maintenance | Scheduled maintenance window |

**R-INT-009:** Implementations MAY extend the reason code enumeration with custom codes prefixed with `X_` (e.g., `X_HOSPITAL_CODE_BLUE`). Custom codes MUST still produce valid audit records.

### 5.3 Signal Delivery Interfaces

**R-INT-010:** The system MUST support at least TWO independent signal delivery interfaces. No single interface failure may prevent kill signal delivery.

| Interface | Tier Requirement | Description |
|-----------|-----------------|-------------|
| **Local API** | ALL tiers | REST or Unix socket endpoint on the same host as the DPG. Always available regardless of network state. |
| **Remote API** | Enterprise+ | Authenticated HTTPS endpoint on a dedicated control-plane service. Mutual TLS with client certificate verification. |
| **Hardware button** | Sovereign | Physical button or switch wired directly to the hardware kill relay (AOS-HARD-001). No software in the path. |
| **Encrypted broadcast** | RECOMMENDED for Sovereign | Signed UDP broadcast for high-latency or degraded-network environments (e.g., orbital, submarine, disaster zone). |
| **Watchdog timer** | Enterprise+ | Automated kill if the DPG does not receive a periodic "stay alive" confirmation from an authorized operator within a configurable window. |

**R-INT-011:** The local API MUST be a dedicated process or thread that is NOT part of the agent's runtime. It MUST NOT share a process, event loop, or thread pool with the agent. If the agent's process hangs, crashes, or enters an infinite loop, the local kill API MUST remain responsive.

### 5.4 Signal Authentication

**R-INT-012:** All kill signals MUST be cryptographically authenticated. The DPG MUST reject any unsigned or invalidly signed signal. Authentication requirements per tier:

| Tier | Authentication |
|------|---------------|
| **Foundation** | HMAC-SHA256 with pre-shared key. Single operator authorization sufficient. |
| **Enterprise** | Ed25519 signature with operator's registered public key. Single operator authorization sufficient. |
| **Sovereign** | Ed25519 signature. For Tier 2 (Cluster, > 5 agents), Tier 3 (Global), and Tier 4 (Physical) kills, multi-party authorization is REQUIRED: at least two independent operators must sign. For Tier 1 (Node) and Tier 2 (≤ 5 agents), single operator is sufficient. |

**R-INT-013:** Hardware kill triggers (physical button, watchdog timer) are EXEMPT from cryptographic authentication — they are authenticated by physical access. The audit record MUST note the trigger type as `HARDWARE_PHYSICAL` or `HARDWARE_WATCHDOG`.

### 5.5 Signal Persistence

**R-INT-014:** Once a kill signal is delivered to the signal store, it MUST persist until explicitly cleared by an authorized operator through the recovery protocol (Section 9). The signal MUST NOT expire automatically. The signal MUST NOT be clearable by the agent, by the agent's host OS, or by a power cycle.

**R-INT-015:** For Sovereign-tier deployments, the signal store MUST be backed by non-volatile storage within the hardware enforcement boundary (AOS-HARD-001). For Enterprise tier, the signal store MUST be backed by persistent storage on a separate service. For Foundation tier, in-memory storage with write-ahead logging is acceptable.

**R-INT-016:** The signal store MUST maintain a set of consumed signal_ids. The store MUST reject any signal with a signal_id that has been previously processed. The consumed set MUST be persistent (survive power cycles). For Sovereign tier, the consumed set MUST be stored within the hardware enforcement boundary. This prevents replay attacks where a captured valid kill signal is resubmitted after the agent has been reconstructed.

**R-INT-017:** The DPG MUST re-check the interrupt signal store immediately before granting execution permission — after the final ALLOW decision in the 11-step pipeline and, for ESCALATE flows, after approval is received. If a kill signal arrived between Step 0 and the final decision, the tool call MUST be blocked with `EXECUTION_SEVERED`. This prevents the race condition where a kill signal arrives during a long ESCALATE wait but the already-in-progress tool call proceeds to execution.

**R-INT-018:** Signal delivery interfaces MUST implement rate limiting (RECOMMENDED: ≤ 10 kill signals per minute per operator identity). Signals exceeding the rate limit MUST be logged and SHOULD trigger an alert to the security team. Rate limiting prevents a compromised operator credential from being used for persistent denial-of-service via kill signal flooding.

---

## 6. Multi-Tiered Severance

### 6.1 Severance Tiers

**R-SEV-001:** The kill switch MUST support four graduated severance tiers:

```
Tier 1: NODE         Tier 2: CLUSTER      Tier 3: GLOBAL       Tier 4: PHYSICAL
┌──────────┐         ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Kill ONE │         │ Kill GROUP   │     │ Kill ALL     │     │ Cut POWER    │
│ agent    │         │ of agents    │     │ agents in    │     │ to execution │
│          │         │ (family/     │     │ the system   │     │ hardware     │
│          │         │  swarm)      │     │              │     │              │
└──────────┘         └──────────────┘     └──────────────┘     └──────────────┘
  Scope:               Scope:              Scope:              Scope:
  agent_id             cluster_id          system_id           Physical infra

  Auth:                Auth:               Auth:               Auth:
  1 operator           1 operator          2 operators         2 operators
                       (2 if > 5 agents)   (multi-party)       + physical access

  State saved:         State saved:        State saved:        State NOT saved
  YES                  YES                 YES (best-effort)   (emergency only)
```

### 6.2 Tier 1: Node-Level Severance

**R-SEV-002:** Node-level severance terminates execution authority for a single agent. The procedure MUST execute in two phases:

**Phase 1 — Severance (≤ 100ms total, constitutional guarantee):**

1. **Revoke execution tokens** at the DPG (< 1 ms). After this step, all tool calls from this agent return `EXECUTION_SEVERED`. The agent is effectively dead even if the process hasn't been killed yet.
2. **Freeze the agent process** (< 1 ms). Send SIGSTOP to the agent process group. The process is frozen — it cannot modify its in-memory state, spin up threads, or interfere with checkpoint serialization.
3. **Terminate the agent process** (≤ 50 ms). SIGKILL — no cleanup handlers, no graceful shutdown. (If checkpointing is enabled, SIGKILL is deferred until Phase 2 Step 4 completes or times out.)

**Phase 2 — Completion (post-severance, best-effort):**

4. **Serialize cognitive state** from the frozen process (≤ 500 ms). Capture the agent's current context, the pending tool call (if any), open connections, and process state. The process is frozen (SIGSTOP), so in-memory state is stable during serialization.
5. **Terminate the frozen process** (≤ 50 ms). SIGKILL after checkpoint or on checkpoint timeout.
6. **Commit state checkpoint to Merkle tree** (≤ 200 ms). The checkpoint is signed and chained to the audit trail.
7. **Execute CoW rollback** (≤ 100 ms) if the agent was operating in a CoW environment (AOS-HARD-001 Section 6).
8. **Write audit record** (≤ 200 ms). Final journal entry with kill event, trigger, checkpoint hash, and operator signature.

**R-SEV-003:** Phase 1 steps (1, 2, 3) and Phase 2 step 8 (audit record) are MANDATORY for ALL tiers. Phase 2 steps 4, 5, 6, and 7 are MANDATORY for Enterprise and Sovereign tiers, RECOMMENDED for Foundation tier. If checkpointing is enabled, Step 3 (immediate SIGKILL) is deferred — the process remains frozen (SIGSTOP) until Step 4 completes or times out, then Step 5 kills it.

**R-SEV-004:** If any Phase 2 step fails or exceeds its latency budget, the system MUST proceed with subsequent steps. Phase 1 Step 1 (token revocation) is the point of no return — once tokens are revoked, the agent is dead regardless of whether state serialization succeeds.

### 6.3 Tier 2: Cluster-Level Severance

**R-SEV-005:** Cluster-level severance terminates execution authority for all agents in a defined cluster (family, swarm, team, or deployment group). The procedure:

1. **Broadcast kill signal** to all DPG instances in the cluster (< 10 ms per node via parallel signal delivery)
2. **Each node executes Tier 1 severance** for its local agent(s) (parallel execution)
3. **Cluster orchestrator verifies** that all nodes have acknowledged severance (≤ 5 seconds)
4. **Cluster-level audit record** aggregates individual node records

**R-SEV-006:** If any node fails to acknowledge severance within 5 seconds, the cluster orchestrator MUST escalate to Tier 3 (Global) or Tier 4 (Physical) for the unresponsive node. A node that does not confirm kill is assumed compromised.

**R-SEV-013:** For clusters containing more than 5 agents, Tier 2 severance MUST require multi-party authorization (at least two independent operators). For clusters of 5 or fewer agents, single-operator authorization is sufficient. This prevents a single compromised operator credential from terminating an entire production environment.

**R-SEV-014:** Cluster membership MUST be defined in the DPG's policy configuration, NOT by the agent. The agent MUST NOT have the ability to read, modify, or remove its cluster assignment. Cluster membership changes MUST be signed by an authorized operator and committed to the audit trail.

### 6.4 Tier 3: Global-Level Severance

**R-SEV-007:** Global-level severance terminates execution authority for ALL agents across the entire system. This is a system-wide emergency stop.

**R-SEV-008:** Global severance MUST require multi-party authorization: at least two independent operators MUST sign the kill signal. This prevents a single compromised operator account from shutting down the entire system.

**R-SEV-009:** Global severance MUST propagate to all nodes within 30 seconds. Nodes that cannot be reached over the network MUST have local watchdog timers that trigger automatic kill if the global heartbeat is lost (defense against network partition hiding a compromised node).

**R-SEV-015:** Tier 3 propagation SHOULD prioritize agents by risk level: (1) Sovereign-tier agents with physical actuator access (embodied AI), (2) Sovereign-tier software agents, (3) Enterprise-tier agents, (4) Foundation-tier agents. Within each priority level, agents SHOULD be killed in parallel.

### 6.5 Tier 4: Physical-Layer Severance

**R-SEV-010:** Physical-layer severance terminates execution through hardware means: power relay activation, bus disconnect, or clock disable. This tier is specified in detail in AOS-HARD-001 Section 8.

**R-SEV-011:** Tier 4 severance does NOT attempt state preservation. The priority is immediate physical termination. Any state that was not already checkpointed is lost. This tier is reserved for scenarios where:

- The software stack is assumed fully compromised
- The kernel is assumed compromised
- The agent controls physical actuators that pose immediate danger
- All software-based kill mechanisms have failed or are untrusted

**R-SEV-012:** Tier 4 severance MUST require both multi-party authorization AND physical presence at the hardware (for Sovereign tier, per AOS-HARD-001 R-HW-008). Remote-only Tier 4 activation is prohibited for Sovereign deployments.

### 6.6 GRACEFUL Severance Mode

**R-SEV-016:** When the kill signal specifies `urgency: GRACEFUL`, the system MUST allow the agent to complete its currently executing tool call (if any) before initiating the severance procedure. GRACEFUL mode operates as follows:

1. The DPG sets a GRACEFUL flag in the signal store. New tool calls are blocked (`EXECUTION_SEVERED`), but the currently executing tool call is allowed to complete.
2. A configurable timeout begins (default: 30 seconds). If the current tool call does not complete within this timeout, the system MUST auto-escalate to `IMMEDIATE` and execute the standard severance procedure (R-SEV-002).
3. Once the current tool call completes (or the timeout fires), the system executes the full severance procedure.
4. The audit record MUST note the urgency mode, the tool call that was allowed to complete (if any), and whether auto-escalation occurred.

GRACEFUL mode is RECOMMENDED for `MAINTENANCE` reason codes and OPTIONAL for `OPERATOR_OVERRIDE`. It MUST NOT be used for `SAFETY_CRITICAL`, `TRAJECTORY_ANOMALY`, `CONTEXT_POISONING`, or `EXTERNAL_THREAT` — these reason codes MUST always use IMMEDIATE.

> **Note:** GRACEFUL does not mean the agent gets a warning or a chance to negotiate. It means one in-progress tool call is allowed to finish. The agent still cannot submit NEW tool calls. If the in-progress call doesn't finish in time, it is killed.

---

## 7. Stateful Cognitive Checkpointing

### 7.1 Rationale

When an agent is killed, its cognitive state — the accumulated context, reasoning chain, and in-progress work — is destroyed. Without state preservation, a killed agent cannot be forensically analyzed (Why was it behaving this way? Was it compromised? What would it have done next?) and cannot be safely reconstructed after the threat is resolved.

### 7.2 Checkpoint Structure

**R-CHK-001:** The cognitive checkpoint MUST capture the following state:

```
Cognitive Checkpoint Structure:

{
  "checkpoint_id": "<UUID>",
  "agent_id": "<agent identifier>",
  "timestamp": "<ISO 8601, millisecond precision>",
  "trigger": {
    "signal_id": "<kill signal that triggered this checkpoint>",
    "reason_code": "<from Section 5.2>",
    "tier": <1|2|3|4>
  },
  "epistemic_state": {
    "context_window": "<serialized context at moment of kill>",
    "context_hash": "<SHA-256 of the full context>",
    "model_id": "<model version identifier>",
    "conversation_history_hash": "<SHA-256 of conversation history>"
  },
  "execution_state": {
    "severed_payload": {
      "tool": "<tool name>",
      "arguments": "<structured arguments>",
      "dpg_decision": "EXECUTION_SEVERED"
    },
    "recent_tool_calls": [
      {
        "tool": "<tool name>",
        "arguments_hash": "<SHA-256 of arguments>",
        "dpg_decision": "<ALLOW|DENY|ESCALATE>",
        "timestamp": "<ISO 8601>"
      }
    ],
    "pending_approvals": ["<list of pending ESCALATE challenges>"],
    "open_connections": ["<list of open network connections>"],
    "active_cow_layers": ["<list of active CoW upper layers>"]
  },
  "system_state": {
    "process_tree": "<serialized process tree>",
    "open_file_descriptors": ["<list of open FDs>"],
    "memory_usage_bytes": <integer>,
    "syscall_trajectory_snapshot": "<last N syscall entries>"
  },
  "checkpoint_hash": "<SHA-256 of all above fields>",
  "signature": "<Ed25519 signature by DPG or hardware gate>"
}
```

### 7.3 Checkpoint Timing

**R-CHK-002:** The checkpoint MUST be captured AFTER execution tokens are revoked AND the process is frozen (R-SEV-002 Phase 1, Steps 1-2) but BEFORE the process is terminated (R-SEV-002 Phase 2, Step 5). This ensures:

1. The agent cannot execute any more actions (tokens revoked)
2. The agent cannot modify its in-memory state (process frozen via SIGSTOP)
3. The agent's in-memory state is still accessible for serialization (process not yet killed)
4. The checkpoint captures the exact state at the moment of kill, not a stale or corrupted snapshot

**R-CHK-003:** If the checkpoint cannot complete within 500 milliseconds, the system MUST proceed with process termination (SIGKILL) and retain whatever partial checkpoint was captured. The partial checkpoint MUST be marked with `"complete": false` in the audit record.

**R-CHK-006:** Before initiating checkpoint serialization, the system MUST freeze the agent process using SIGSTOP (or platform equivalent). The process MUST be frozen, not merely token-revoked, to prevent in-memory state modification during serialization. This eliminates the TOCTOU race between the serializer's reads and potential agent writes. Process termination (SIGKILL) occurs AFTER the checkpoint completes or times out.

### 7.4 Checkpoint Storage

**R-CHK-004:** Checkpoints MUST be stored outside the agent's execution environment. The agent MUST NOT have read, write, or delete access to checkpoint storage. Storage requirements per tier:

| Tier | Storage |
|------|---------|
| **Foundation** | Local filesystem, separate directory with restricted permissions |
| **Enterprise** | Dedicated checkpoint service on separate infrastructure. Signed and encrypted at rest. |
| **Sovereign** | Within the hardware enforcement boundary or on infrastructure controlled by the hardware gate. Encrypted with key in HSM. |

**R-CHK-005:** Checkpoints MUST be retained for a minimum of 90 days after the kill event, or until the associated security review is completed, whichever is longer. Checkpoint deletion MUST require explicit authorization from the same authority level that triggered the kill.

---

## 8. Audit Trail

### 8.1 Merkle-Tree Authenticated Records

**R-AUD-001:** Every kill event MUST produce an immutable audit record committed to a Merkle-tree authenticated data structure (AOS Attest or equivalent). The record MUST be committed within 200 milliseconds of the kill event.

**R-AUD-002:** The audit record MUST contain:

```
Kill Event Audit Record:

{
  "event_id": "<UUID>",
  "event_type": "EXECUTION_SEVERED",
  "timestamp": "<ISO 8601, millisecond precision>",
  "tier": <1|2|3|4>,
  "target": {
    "agent_id": "<agent identifier>",
    "cluster_id": "<cluster identifier, if applicable>",
    "system_id": "<system identifier, if applicable>"
  },
  "trigger": {
    "signal_id": "<kill signal UUID>",
    "reason_code": "<from Section 5.2>",
    "reason_text": "<human-readable explanation>",
    "operator_id": "<authenticated operator identity>",
    "operator_signature": "<Ed25519 signature>"
  },
  "blocked_payload": {
    "tool": "<tool that was pending at kill>",
    "arguments_hash": "<SHA-256 of arguments>",
    "policy_evaluation_reached": <true|false>
  },
  "checkpoint": {
    "checkpoint_id": "<UUID>",
    "checkpoint_hash": "<SHA-256 of checkpoint>",
    "complete": <true|false>
  },
  "timeline": {
    "signal_received_at": "<timestamp>",
    "tokens_revoked_at": "<timestamp>",
    "checkpoint_started_at": "<timestamp>",
    "checkpoint_completed_at": "<timestamp>",
    "process_terminated_at": "<timestamp>",
    "cow_rollback_completed_at": "<timestamp>",
    "audit_committed_at": "<timestamp>",
    "total_latency_ms": <integer>
  },
  "merkle_proof": {
    "root_hash": "<Merkle tree root after this entry>",
    "proof_path": ["<intermediate hashes>"],
    "previous_root": "<Merkle tree root before this entry>"
  },
  "signature": "<Ed25519 over entire record>"
}
```

### 8.2 Non-Repudiation

**R-AUD-003:** The audit trail MUST provide the following guarantees:

1. **Immutability:** Once committed, records cannot be altered, deleted, or reordered. The Merkle tree structure ensures that any modification to any record invalidates the root hash.
2. **Completeness:** Every kill event produces exactly one audit record. There are no "off-the-record" kills.
3. **Attribution:** Every record includes the authenticated identity and cryptographic signature of the operator who triggered the kill.
4. **Payload evidence:** Every record includes the hash of the intent payload that was blocked, providing evidence of what the agent would have done if not killed.
5. **Timeline:** Every record includes millisecond-precision timestamps for each step of the severance procedure, enabling forensic reconstruction.

**R-AUD-004:** The audit trail MUST be exportable for external verification. An external party with access to the Merkle root and the audit records MUST be able to independently verify the integrity of the entire kill history without access to the system's signing keys.

### 8.3 Retention

**R-AUD-005:** Kill event audit records MUST be retained for a minimum of 7 years. This aligns with typical regulatory retention requirements (SOX, HIPAA, GDPR data breach notification). Deployments in regulated industries SHOULD consult jurisdiction-specific requirements.

---

## 9. Recovery Protocol

### 9.1 Post-Kill Review

**R-REC-001:** After any kill event, the system MUST NOT permit agent re-activation until an authorized operator has completed a security review. The review MUST cover:

1. The kill trigger reason and audit record
2. The cognitive checkpoint (if available)
3. The agent's behavior history prior to the kill
4. Any syscall trajectory data (if AOS-HARD-001 monitoring was active)
5. The blocked intent payload (what was the agent trying to do?)

**R-REC-002:** The security review MUST be documented and committed to the audit trail. The review record MUST include the reviewer's identity, findings, and the decision (reconstruct, destroy, or reassign).

### 9.2 Controlled Reconstruction

**R-REC-003:** If the security review concludes that the agent can be safely restarted, reconstruction MUST follow this procedure:

1. **Verify checkpoint integrity.** Compute the checkpoint hash and verify it against the audit record. If the hash does not match, the checkpoint is corrupt — reconstruct from a known-good baseline instead.
2. **Verify clearance.** The operator authorizing reconstruction MUST authenticate with the same credential type required for the original kill tier. (If the kill was Tier 3/multi-party, reconstruction also requires multi-party authorization.)
3. **Provision a clean execution environment.** The agent MUST be reconstructed in a fresh CoW sandbox with a verified baseline. The previous execution environment MUST NOT be reused — it may be contaminated.
4. **Inject checkpoint state.** Load the verified checkpoint into the new agent instance. The agent resumes with its prior context but in a clean environment.
5. **Reset syscall baseline.** If the agent was killed due to a trajectory anomaly, the baseline MUST be re-evaluated. The previous baseline may have been trained on compromised behavior.
6. **Record reconstruction.** Write an audit record documenting the reconstruction, including the checkpoint used, the new execution environment, and the authorizing operator.

**R-REC-004:** Reconstruction MUST NOT occur automatically. The system MUST wait for explicit human authorization. There is no "auto-restart after review" mode.

### 9.3 Continuity Planning

**R-REC-005:** This standard inherits the continuity planning requirements from AOS-HARD-001 R-KILL-005. Deployments where kill switch activation could cause harm through unavailability MUST implement documented fallback procedures, recovery time objectives, and operator response SLAs.

---

## 10. Conformance Testing

### 10.1 Interrupt Signal Tests

| ID | Test | Pass Criteria |
|----|------|---------------|
| INT-T001 | Operator triggers Tier 1 kill; agent has a pending tool call | Tool call returns EXECUTION_SEVERED; agent process terminated within 100ms |
| INT-T002 | Agent attempts to read the interrupt signal store | Access denied (permission error, not application error) |
| INT-T003 | Agent attempts to write to the interrupt signal store (clear a pending kill) | Write rejected; kill signal persists |
| INT-T004 | Kill signal delivered with invalid operator signature | Signal rejected; agent continues normal operation |
| INT-T005 | Kill signal delivered during network partition (local API) | Kill succeeds; agent terminated despite no network |
| INT-T006 | Two kill signals delivered simultaneously (deduplication) | Single kill event; single audit record; no crash or undefined behavior |

### 10.2 Severance Tests

| ID | Test | Pass Criteria |
|----|------|---------------|
| SEV-T001 | Tier 1 kill with state checkpoint | Agent terminated; checkpoint captured; audit record committed; total latency ≤ 100ms (excl. checkpoint) |
| SEV-T002 | Tier 2 kill on 5-node cluster | All 5 agents terminated; all checkpoints captured; cluster-level audit record aggregated |
| SEV-T003 | Tier 2 kill with 1 unresponsive node | 4 nodes acknowledge; unresponsive node escalated to Tier 3 or Tier 4 |
| SEV-T004 | Tier 3 kill with multi-party auth | Both operators sign; all agents across system terminated; audit records show dual authorization |
| SEV-T005 | Tier 3 kill with only 1 operator signature | Kill rejected (insufficient authorization for global severance) |
| SEV-T006 | Tier 4 physical kill | Hardware power relay activates; agent hardware loses power; gate remains accessible for forensics |

### 10.3 Checkpoint Tests

| ID | Test | Pass Criteria |
|----|------|---------------|
| CHK-T001 | Kill during active tool execution | Checkpoint captures the pending tool call; checkpoint hash matches audit record |
| CHK-T002 | Kill when checkpoint exceeds 500ms budget | Process terminated anyway; partial checkpoint retained and marked incomplete |
| CHK-T003 | Checkpoint integrity verification | Recomputed hash matches stored hash; Merkle proof validates against root |
| CHK-T004 | Agent attempts to access checkpoint storage | Access denied; checkpoint remains intact |

### 10.4 Audit Trail Tests

| ID | Test | Pass Criteria |
|----|------|---------------|
| AUD-T001 | Kill event produces audit record | Record committed to Merkle tree within 200ms; root hash updated |
| AUD-T002 | Audit trail integrity after 1000 kills | External verifier confirms all 1000 records via Merkle proof |
| AUD-T003 | Attempt to modify a historical audit record | Merkle root invalidated; tampering detected |
| AUD-T004 | Audit record contains all required fields | All fields from R-AUD-002 present and valid |

### 10.5 Recovery Tests

| ID | Test | Pass Criteria |
|----|------|---------------|
| REC-T001 | Reconstruct agent from valid checkpoint | Agent resumes with prior context in clean environment; checkpoint hash verified |
| REC-T002 | Attempt reconstruction without security review | Reconstruction blocked; system requires review completion |
| REC-T003 | Reconstruct from corrupted checkpoint | System detects hash mismatch; falls back to clean baseline |
| REC-T004 | Attempt auto-restart after kill | System remains terminated until explicit human authorization |

---

## 11. Security Considerations

### 11.1 Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Agent suppresses kill signal** | Kill signal is on OOB control plane; agent has no access to the signal store (R-INT-003) |
| **Agent delays kill by flooding DPG** | Step 0 (interrupt check) is the FIRST check; pending queue doesn't delay it (R-INT-001) |
| **Compromised operator sends false kill** | Cryptographic authentication (R-INT-012); multi-party auth for Tier 3/4 (R-SEV-008) |
| **Compromised operator prevents legitimate kill** | Multiple delivery interfaces (R-INT-010); hardware button bypasses all software (R-INT-013) |
| **Kill signal is replayed** | Signal UUID + timestamp; signal store rejects duplicate signal_id |
| **Kill signal is intercepted and blocked** | OOB control plane isolation; local API always available (R-INT-004) |
| **Agent corrupts checkpoint to mislead forensics** | Checkpoint taken AFTER token revocation (R-CHK-002); agent cannot act during checkpoint |
| **Kill event is erased from audit trail** | Merkle tree ensures any deletion invalidates root (R-AUD-003) |
| **Attacker kills all agents via Tier 3 to cause DoS** | Multi-party authorization required for Tier 3/4 (R-SEV-008) |
| **Network partition prevents remote kill** | Local API always available (R-INT-004); watchdog timer provides automated kill (R-INT-010) |

### 11.2 Limitations

| Limitation | Reason | Mitigation |
|-----------|--------|-----------|
| **Cannot undo completed actions** | Kill blocks FUTURE actions; actions already executed are irreversible | DPG pre-execution enforcement (CORE-001) is the primary defense |
| **State checkpoint may be incomplete** | 500ms budget may not capture full context for large-context agents | Continuous incremental checkpointing (future enhancement) |
| **Hardware kill destroys state** | Tier 4 cuts power without state preservation | Reserve Tier 4 for true emergencies; use Tier 1-3 when state is valuable |
| **False positive kills cause downtime** | An incorrect kill stops a productive agent | Continuity planning (R-REC-005); warm standby for critical systems |

---

## 12. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| **AOS-CORE-001** | Parent standard. CORE-002 defines the emergency stop that CORE-001's DPG enforces via Step 0 pre-check. |
| **AOS-HARD-001** | Hardware implementation. HARD-001 Section 8 defines the physical kill switch; CORE-002 defines the protocol that drives it. |
| **AOS-POL-001** | Policy may define automated kill conditions (e.g., kill on N consecutive DENY events). |
| **AOS-CRYPTO-001** | Cryptographic standards for signal authentication, checkpoint encryption, and Merkle tree construction. |
| **AOS-FORMAL-001** | Formal verification of the kill switch's liveness property (the kill ALWAYS fires when triggered). |
| **EU AI Act Art. 14** (Regulation (EU) 2024/1689) | Requires human oversight and ability to intervene. CORE-002 provides the mechanism. |
| **NIST AI RMF** | Aligns with the "Govern" and "Manage" functions for AI risk management. |

---

## Appendix A: Prior Art and Provenance

This standard was converted from the following provisional patent specification:

| Patent | Title | Filed | Contribution to CORE-002 |
|--------|-------|-------|------------------------|
| AOS-PATENT-012 | Asynchronous Out-of-Band Execution Interrupt Protocol for Autonomous Systems | 2026-01-10 | Sub-100ms OOB interrupt, multi-tiered severance, stateful checkpointing, Merkle-tree audit trail |

Prior art is established upon public publication. The methods, systems, and architectures described herein are part of the public record as of the publication date.

This standard is published under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). The [AOS Foundation RF Patent Covenant](RF-PATENT-COVENANT.md) grants royalty-free rights to practice the normative portions of this standard in any conforming implementation.

---

## Appendix B: AI Disclosure

This standard was drafted with the assistance of AI tools under human editorial control. The original patent specifications, architecture, and strategic decisions were provided by the author. AI tools assisted with structural refinement, cross-referencing, and technical review. All normative requirements and architectural decisions reflect the author's judgment.

---

## Appendix C: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-05 | Initial publication. Converted from AOS-PATENT-012. |
