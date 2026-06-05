# AOS-CORE-003 v1.0 -- Multi-Agent Trust Federation Protocol

**Standard:** AOS-CORE-003  
**Title:** Deterministic Governance for Multi-Agent Systems: Trust Federation, Kill Propagation, and Indirect Side Effect Control  
**Version:** 1.0  
**Status:** Draft  
**Date:** 2026-06-05  
**Author:** Eugene Christopher Salvatore  
**License:** CC-BY-4.0  
**Heritage:** AOS-PATENT-047 (Unanimous Consensus Protocol), AOS-PATENT-142 (Mass Agent Constitutional Governance)  
**Companion to:** AOS-CORE-001 (Deterministic Policy Gate), AOS-CORE-002 (Emergency Kill Switch), AOS-CRYPTO-001 (Cryptographic Standards)

---

## Abstract

AOS-CORE-001 governs a single agent. AOS-CORE-002 terminates a single agent. In production, agents do not operate alone. An orchestrator agent delegates tasks to worker agents. A customer-facing agent calls a database agent which calls a validation agent. A swarm of 1,000 agents collaboratively processes a corpus. In every multi-agent scenario, the single-agent governance model breaks down in predictable ways:

1. **Policy bypass via delegation:** Agent A's policy denies file deletion. Agent A asks Agent B to delete the file. Agent B's policy allows file deletion. The file is deleted. No policy was violated -- but the intent of Agent A's policy was circumvented.

2. **Ungoverned indirect writes:** Agent A cannot write to the production database directly (its DPG denies it). But Agent A writes to a shared message queue. A non-agent process reads the queue and writes to the database. The DPG never saw the write.

3. **Kill propagation failure:** Agent A is killed via Tier 1 severance (CORE-002). Agent A had previously delegated a long-running task to Agent B. Agent B continues executing the delegated task. The kill did not propagate.

4. **Attestation isolation:** Agent A's DPG produces a Governance Proof for every tool call. Agent B's DPG produces its own proofs. But no mechanism verifies that Agent B's proofs satisfy Agent A's policy requirements. Cross-gate attestation is unverified.

5. **Emergent behavior:** 1,000 agents individually comply with policy. Collectively, their interactions produce an emergent behavior (market manipulation, resource exhaustion, coordinated deception) that no individual policy anticipated.

This standard specifies the protocols for governing multi-agent systems: how agents establish trust, how policies propagate across boundaries, how kills propagate through delegation chains, how indirect side effects are governed, and how emergent behaviors are detected and contained.

> **Design philosophy:** Single-agent governance is necessary but not sufficient. The DPG ensures "this agent is governed." The federation protocol ensures "this system of agents is governed." The gap between them is where real-world failures occur.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Normative References](#2-normative-references)
3. [Terms and Definitions](#3-terms-and-definitions)
4. [Architecture](#4-architecture)
5. [Trust Federation](#5-trust-federation)
6. [Policy Propagation](#6-policy-propagation)
7. [Kill Propagation](#7-kill-propagation)
8. [Indirect Side Effect Governance](#8-indirect-side-effect-governance)
9. [Emergent Behavior Detection](#9-emergent-behavior-detection)
10. [Conformance Testing](#10-conformance-testing)
11. [Security Considerations](#11-security-considerations)
12. [Relationship to Other Standards](#12-relationship-to-other-standards)

---

## 1. Scope

### 1.1 What This Standard Covers

This standard specifies the governance protocols for systems containing two or more autonomous agents, each governed by its own DPG instance (AOS-CORE-001). It covers:

- **Trust federation:** How DPG instances establish, verify, and revoke mutual trust
- **Policy propagation:** How an upstream agent's policy constraints flow downstream through delegation chains
- **Kill propagation:** How a kill signal (AOS-CORE-002) propagates through the delegation graph to terminate all affected agents
- **Indirect side effect control:** How side effects produced through non-agent intermediaries (message queues, shared databases, webhook pipelines) are brought under governance
- **Emergent behavior detection:** How collective agent behavior is monitored for patterns that violate system-level invariants even when individual agents comply with policy

### 1.2 What This Standard Does Not Cover

- Single-agent policy enforcement (see AOS-CORE-001)
- Single-agent termination (see AOS-CORE-002)
- Inter-organizational federation across independent AOS deployments with separate governance authorities (planned: AOS-FED-001)
- Agent-to-human delegation (human tasks are outside the DPG boundary)
- LLM-to-LLM prompt injection across agent boundaries (see AOS-SEC-001, planned)

### 1.3 Relationship to Tiers

| Tier | Multi-Agent Requirements |
|------|-----------------------|
| **Foundation** | Delegation tracking and kill propagation through delegation chains. Basic attestation forwarding. Emergent behavior detection is RECOMMENDED. |
| **Enterprise** | All Foundation requirements. Full policy propagation with restriction semantics. Cross-gate attestation verification. Indirect side effect governance via attestation-gated middleware. Emergent behavior detection is REQUIRED. |
| **Sovereign** | All Enterprise requirements. Hardware-backed inter-gate authentication. Consensus protocols for critical multi-agent decisions. Emergent behavior detection with automated containment. |

### 1.4 Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## 2. Normative References

- **AOS-CORE-001 v1.0** -- Deterministic Policy Gate specification
- **AOS-CORE-002 v1.0** -- Emergency Kill Switch Protocol
- **AOS-CRYPTO-001 v1.0** -- Cryptographic Standards for Agent Governance
- **AOS-POL-001 v1.0** -- Policy Authoring Guide
- **AOS-HARD-001 v1.0** -- Hardware Enforcement Boundary
- **RFC 2119** -- Key words for use in RFCs to Indicate Requirement Levels
- **RFC 8555** -- ACME Protocol (challenge-response verification model reference)

---

## 3. Terms and Definitions

Terms defined in AOS-CORE-001 Section 3, AOS-CORE-002 Section 3, and AOS-CRYPTO-001 Section 3 apply. Additional terms:

**Delegation:** An agent (the delegator) requests another agent (the delegate) to perform a task on its behalf. Delegation creates a governance relationship: the delegate's actions are attributable to the delegator for policy purposes.

**Delegation Chain:** An ordered sequence of delegation relationships: Agent A delegates to Agent B, which delegates to Agent C. The chain has a root (the originating agent) and a leaf (the final executor). Policy constraints accumulate along the chain -- they can only become more restrictive, never less.

**Federation:** A trust relationship between two or more DPG instances that enables cross-gate attestation verification, policy propagation, and kill propagation. Federation is not automatic -- it requires explicit configuration by authorized operators.

**Federation Graph:** The directed graph of all delegation and federation relationships in a multi-agent system. Nodes are DPG instances. Edges are trust relationships with associated policy restrictions. The graph may be hierarchical (tree), flat (mesh), or hybrid.

**Governance Proof Chain:** An ordered sequence of Governance Proofs (AOS-CRYPTO-001) linked by delegation references. Each proof in the chain references the proof that authorized the delegation. The chain enables end-to-end verification: a verifier can trace any action back to the root agent's original intent and confirm that every intermediate step was governed.

**Policy Restriction:** A constraint added by a delegator to a delegate's policy scope. Restrictions can only narrow the delegate's authority -- never expand it. A delegator cannot grant permissions that its own policy denies.

**Indirect Side Effect:** A side effect produced through a path that does not pass through a DPG instance. Example: Agent A writes to a message queue; a non-agent consumer reads the queue and writes to a database. The database write is an indirect side effect of Agent A's action.

**Emergent Behavior:** A collective behavior pattern that arises from the interactions of multiple individually-governed agents, where the collective behavior violates system-level invariants even though no individual agent violates its own policy.

**Containment:** The automated response to detected emergent behavior: throttling, isolation, selective kill, or full-swarm severance, depending on severity.

---

## 4. Architecture

### 4.1 Multi-Agent Governance Model

```
                    SYSTEM-LEVEL GOVERNANCE
                    (Emergent Behavior Monitor)
                              |
              ________________|________________
             |                |                |
        [DPG-A]          [DPG-B]          [DPG-C]
        Agent A          Agent B          Agent C
           |                |                |
           |   delegation   |                |
           +--------------->+                |
           |                |   delegation   |
           |                +--------------->+
           |                                 |
           |     Governance Proof Chain      |
           +<---------- - - - - - - - ------>+
```

**R-FED-001:** In a multi-agent system, each agent MUST be governed by its own DPG instance as specified in AOS-CORE-001. Agents MUST NOT share DPG instances unless complete request isolation is enforced within the shared gate (AOS-CORE-001 Gate Boundary definition). This standard governs the relationships BETWEEN DPG instances.

**R-FED-002:** The multi-agent governance architecture operates at three layers:

| Layer | Responsibility | Standard |
|-------|---------------|----------|
| **Agent Layer** | Individual agent policy enforcement | AOS-CORE-001 |
| **Federation Layer** | Cross-agent trust, policy propagation, kill propagation, indirect side effect control | AOS-CORE-003 (this standard) |
| **System Layer** | Emergent behavior detection, system-level invariants, containment | AOS-CORE-003 Section 9 |

### 4.2 Federation Topologies

**R-FED-003:** This standard supports three federation topologies. Implementations MUST support at least Hierarchical. Enterprise and Sovereign tiers MUST support all three.

#### 4.2.1 Hierarchical (Tree)

```
          [Root DPG]
          /        \
     [DPG-A]    [DPG-B]
     /    \         |
[DPG-C] [DPG-D]  [DPG-E]
```

A single root DPG delegates to child DPGs. Policy flows downward (root to leaves). Kill propagates downward. Attestation flows upward (leaves to root). This is the most common topology for orchestrator-worker patterns.

#### 4.2.2 Mesh (Peer-to-Peer)

```
[DPG-A] <-----> [DPG-B]
   ^               ^
   |               |
   v               v
[DPG-C] <-----> [DPG-D]
```

All DPGs are peers with bidirectional trust. Any agent can delegate to any other. Policy is negotiated per-delegation. This topology is used for collaborative agent swarms.

#### 4.2.3 Hub-and-Spoke

```
         [Hub DPG]
        /  |  |  \
[DPG-A] [DPG-B] [DPG-C] [DPG-D]
```

A central hub mediates all inter-agent communication. Spoke agents cannot communicate directly -- all delegation passes through the hub. The hub enforces system-level policy. This topology provides the strongest governance guarantees at the cost of the hub becoming a single point of failure.

**R-FED-004:** Regardless of topology, the following invariant MUST hold: **no agent may acquire capabilities through delegation that exceed its own policy scope.** Delegation can only restrict, never expand.

---

## 5. Trust Federation

### 5.1 Federation Establishment

**R-FED-005:** Before two DPG instances can participate in delegation, they MUST establish a federation relationship. Federation establishment requires:

1. **Mutual identity verification:** Each DPG presents its gate identity (Ed25519 public key, AOS-CRYPTO-001 R-ID-001) to the other. Identity verification uses the challenge-response protocol specified in R-FED-006.

2. **Policy capability exchange:** Each DPG declares its policy capabilities -- the tool categories it governs, the risk categories it evaluates, and the maximum permission scope it can grant. This enables the federating DPG to determine whether the peer can satisfy delegation requirements.

3. **Trust level assignment:** The operator configures the trust level for the federation relationship. Trust levels determine what kinds of delegation are permitted:

| Trust Level | Meaning | Permitted Delegation |
|-------------|---------|---------------------|
| **VERIFY_ONLY** | The peer's attestations can be verified but no delegation is permitted | Cross-gate audit verification only |
| **RESTRICTED** | Delegation is permitted within explicitly enumerated tool categories and risk levels | Named tools at specified risk levels only |
| **STANDARD** | Delegation is permitted for any tool category that both DPGs govern, subject to policy restriction | Any governed tool, restricted by delegator's policy |
| **ELEVATED** | Full delegation with minimal restrictions. Reserved for tightly coupled agent families. | Any governed tool, delegator's full policy scope |

4. **Operator authorization:** Federation establishment MUST be authorized by a human operator. Agents MUST NOT autonomously establish federation relationships. The federation configuration MUST be committed to the audit trail with the authorizing operator's signature.

**R-FED-006:** Identity verification MUST use a challenge-response protocol:

```
Federation Handshake:

DPG-A -> DPG-B:  { "type": "FEDERATION_CHALLENGE",
                    "gate_id_a": "<DPG-A public key>",
                    "nonce_a": "<random 256-bit nonce>",
                    "timestamp": "<ISO 8601>",
                    "signature_a": "<Ed25519 signature over above fields>" }

DPG-B -> DPG-A:  { "type": "FEDERATION_RESPONSE",
                    "gate_id_b": "<DPG-B public key>",
                    "nonce_b": "<random 256-bit nonce>",
                    "nonce_a_echo": "<echoed nonce from challenge>",
                    "capabilities": { <policy capability declaration> },
                    "signature_b": "<Ed25519 signature over above fields>" }

DPG-A -> DPG-B:  { "type": "FEDERATION_CONFIRM",
                    "nonce_b_echo": "<echoed nonce from response>",
                    "trust_level": "<VERIFY_ONLY|RESTRICTED|STANDARD|ELEVATED>",
                    "operator_id": "<authorizing operator>",
                    "operator_signature": "<Ed25519 signature>",
                    "signature_a": "<Ed25519 signature over above fields>" }
```

Both DPGs MUST verify the other's signature before accepting the federation. The handshake MUST complete within 5 seconds; timeout results in federation failure.

### 5.2 Federation Registry

**R-FED-007:** Each DPG MUST maintain a federation registry -- a persistent, signed data structure listing all active federation relationships. The registry entry for each peer MUST contain:

```
Federation Registry Entry:

{
  "peer_gate_id": "<peer DPG public key>",
  "trust_level": "<VERIFY_ONLY|RESTRICTED|STANDARD|ELEVATED>",
  "established_at": "<ISO 8601 timestamp>",
  "established_by": "<operator identity>",
  "capabilities": { <peer's declared policy capabilities> },
  "restrictions": [ <list of explicit delegation restrictions> ],
  "last_heartbeat": "<ISO 8601 timestamp>",
  "status": "<ACTIVE|SUSPENDED|REVOKED>"
}
```

**R-FED-008:** Federation relationships MUST be revocable by an authorized operator at any time. Revocation takes effect immediately -- all pending delegations to the revoked peer are terminated. Revocation MUST be committed to the audit trail.

### 5.3 Federation Heartbeat

**R-FED-009:** Active federation relationships MUST be maintained by periodic heartbeat. Each DPG MUST send a signed heartbeat to each federated peer at a configurable interval (default: 60 seconds). The heartbeat contains:

- The DPG's gate identity
- Current timestamp
- Current policy version hash (to detect policy drift)
- Current federation registry hash (to detect topology changes)

**R-FED-010:** If a DPG does not receive a heartbeat from a federated peer within 3x the heartbeat interval (default: 180 seconds), it MUST suspend the federation relationship. Suspended federations block new delegations but do not immediately terminate in-progress delegations. After 5x the heartbeat interval (default: 300 seconds) without heartbeat, the federation MUST be revoked and all delegations terminated.

---

## 6. Policy Propagation

### 6.1 The Restriction-Only Principle

**R-POL-001:** When Agent A delegates a task to Agent B, Agent A's DPG MUST attach a **policy restriction envelope** to the delegation request. The restriction envelope specifies the maximum permission scope for the delegated task. Agent B's DPG MUST enforce both its own policy AND the restriction envelope. The effective policy for the delegated task is the intersection (most restrictive combination) of:

1. Agent B's own policy (as configured by Agent B's operator)
2. The restriction envelope from Agent A's delegation
3. Any restriction envelopes from upstream delegators (if this is a chain)

**R-POL-002:** The restriction envelope MUST NOT expand Agent B's capabilities beyond what Agent A's own policy allows. A delegator cannot grant permissions it does not have. Formally: for every tool call T and every policy dimension D, the restriction envelope's permission for (T, D) MUST be less than or equal to Agent A's own permission for (T, D).

This is the **restriction-only principle:** delegation can only narrow, never widen.

### 6.2 Restriction Envelope Structure

**R-POL-003:** The restriction envelope MUST contain:

```
Policy Restriction Envelope:

{
  "delegation_id": "<UUID>",
  "delegator_gate_id": "<delegating DPG public key>",
  "delegate_gate_id": "<receiving DPG public key>",
  "timestamp": "<ISO 8601>",
  "task_description_hash": "<SHA-256 of the delegated task description>",
  "restrictions": {
    "allowed_tools": ["<list of permitted tool names, or '*' for all>"],
    "denied_tools": ["<list of explicitly denied tools>"],
    "max_risk_level": <1-5>,
    "max_budget": {
      "tool_calls": <integer or null>,
      "cost_usd": <float or null>,
      "time_seconds": <integer or null>
    },
    "allowed_categories": ["<list of permitted AOS-POL-001 categories>"],
    "denied_categories": ["<list of denied categories>"],
    "scope_constraints": {
      "file_paths": ["<allowed path patterns>"],
      "network_targets": ["<allowed network destinations>"],
      "data_classifications": ["<allowed data classification levels>"]
    }
  },
  "parent_delegation_id": "<UUID of upstream delegation, if chained>",
  "chain_depth": <integer>,
  "max_chain_depth": <integer>,
  "delegator_signature": "<Ed25519 signature over all above fields>"
}
```

**R-POL-004:** The delegate's DPG MUST verify the delegator's signature before accepting the restriction envelope. An unsigned or invalidly signed envelope MUST be rejected.

**R-POL-005:** Delegation chains MUST have a configurable maximum depth (default: 5). A delegation that would exceed the maximum chain depth MUST be rejected. This prevents unbounded delegation chains that obscure governance accountability.

### 6.3 Policy Evaluation with Restrictions

**R-POL-006:** When a delegate agent submits a tool call to its DPG, the DPG MUST evaluate the call against BOTH its own policy AND the active restriction envelope(s). The evaluation order is:

1. **Step 0:** Interrupt check (AOS-CORE-002 -- kill check as always)
2. **Step 0.5:** Restriction envelope check -- does this tool call fall within the restriction envelope's allowed scope?
3. **Steps 1-11:** Normal CORE-001 policy evaluation against the agent's own policy
4. **Final decision:** ALLOW only if BOTH the restriction check and the policy evaluation return ALLOW

If the restriction envelope denies the tool call but the agent's own policy would allow it, the decision is DENY with reason `DELEGATION_RESTRICTION`. The audit record MUST note both the restriction denial and the agent's own policy result.

### 6.4 Delegation Attestation

**R-POL-007:** Every delegation MUST produce a Governance Proof (AOS-CRYPTO-001) that links the delegated action to the original delegation request. The delegation proof contains:

- The delegation_id
- The delegator's Governance Proof for the delegation request itself (proving the delegator was governed when it requested the delegation)
- The delegate's Governance Proof for the tool call
- The restriction envelope (proving the call was within the delegator's authorized scope)
- The chain of all upstream delegation proofs (for chained delegations)

This creates a **Governance Proof Chain** -- an end-to-end cryptographic proof that every step in a multi-agent workflow was individually governed, collectively restricted, and attributable to the original intent.

---

## 7. Kill Propagation

### 7.1 Delegation-Aware Kill

**R-KILL-001:** When an agent is killed (AOS-CORE-002), the kill MUST propagate to all agents that hold active delegations from the killed agent. This is **delegation-aware kill propagation.**

The propagation rules:

| Scenario | Propagation Rule |
|----------|-----------------|
| Agent A is killed; Agent B has an active delegation from A | Agent B's delegation from A is immediately terminated. If B has no other active delegations or independent tasks, B SHOULD be killed (Tier 1). If B has other work, only the A-delegated tasks are terminated. |
| Agent A is killed; Agent B delegated to Agent C on behalf of A | Both B's delegation from A and C's delegation from B (for A's task) are terminated. The kill propagates through the full delegation chain. |
| Cluster kill (Tier 2) targets a cluster containing Agent A | Kill propagates to all agents with delegations from any agent in the killed cluster, following the same rules as Tier 1. |
| Global kill (Tier 3) | All agents are killed. No propagation logic needed -- everything dies. |

**R-KILL-002:** Kill propagation MUST be tracked in the delegation graph. Each DPG MUST maintain a record of:

- Outbound delegations (tasks this agent has delegated to others)
- Inbound delegations (tasks delegated to this agent by others)
- The delegation chain for each task (full path from root to leaf)

When a kill signal is received, the DPG MUST:

1. Terminate all local agent execution (per CORE-002)
2. Send delegation termination signals to all DPGs holding outbound delegations from this agent
3. The delegation termination signal carries the kill signal's reason code and the killed agent's identity
4. Each receiving DPG terminates the specific delegated tasks (not necessarily the entire agent)

### 7.2 Delegation Termination Signal

**R-KILL-003:** The delegation termination signal MUST contain:

```
Delegation Termination Signal:

{
  "type": "DELEGATION_TERMINATED",
  "delegation_id": "<UUID of the terminated delegation>",
  "terminated_by": "<gate ID of the DPG that initiated termination>",
  "reason": "<kill reason code from CORE-002>",
  "original_kill_signal_id": "<UUID of the kill signal that triggered this>",
  "timestamp": "<ISO 8601>",
  "propagation_depth": <integer>,
  "signature": "<Ed25519 signature>"
}
```

**R-KILL-004:** The receiving DPG MUST verify the delegation termination signal's signature against the federation registry. A termination signal from a non-federated peer MUST be rejected (this prevents spoofed kill propagation).

**R-KILL-005:** Kill propagation MUST complete within 5 seconds for the entire delegation graph (all depths). If a downstream DPG does not acknowledge the delegation termination within 5 seconds, the upstream DPG MUST escalate to the downstream DPG's operator and log a PROPAGATION_TIMEOUT event.

### 7.3 Orphan Detection

**R-KILL-006:** After kill propagation completes, the system MUST scan for orphaned delegations -- delegation relationships where the root agent has been killed but downstream agents were not reached (e.g., due to network partition or federation revocation). Orphaned delegations MUST be flagged for operator review.

**R-KILL-007:** Orphaned agents (agents whose only remaining work is from a killed delegation chain) SHOULD be automatically killed after a configurable grace period (default: 60 seconds). The audit record MUST note the kill as `ORPHAN_CLEANUP` with a reference to the original kill signal.

---

## 8. Indirect Side Effect Governance

### 8.1 The Indirect Write Problem

AOS-CORE-001 R-ARCH-003 requires that "no side effect path SHALL exist that bypasses the gate." In a multi-agent system, indirect side effect paths emerge through shared infrastructure:

```
DIRECT (governed):        Agent -> DPG -> Tool -> Database
INDIRECT (ungoverned):    Agent -> DPG -> Message Queue -> Consumer -> Database
                                                          ^^^^^^^^^^^^^^^^^^
                                                          Not governed by any DPG
```

This section specifies how to bring indirect paths under governance.

### 8.2 Attestation-Gated Middleware

**R-ISE-001:** Shared infrastructure that receives writes from agent-initiated processes MUST implement attestation verification. Before accepting a write, the middleware MUST verify that the write carries a valid Governance Proof (AOS-CRYPTO-001) from the originating agent's DPG.

**R-ISE-002:** The attestation-gating protocol for middleware:

1. Agent's DPG approves a tool call that writes to a message queue (or other intermediary)
2. The DPG attaches the Governance Proof to the message payload (as a metadata header or envelope field)
3. The message passes through the intermediary (queue, event bus, webhook pipeline)
4. The downstream consumer receives the message
5. Before processing the message, the consumer verifies the Governance Proof:
   - Signature validity (Ed25519 verification against the originating DPG's public key)
   - Policy evaluation result (must be ALLOW)
   - Timestamp freshness (must be within configurable window, default: 300 seconds)
   - Chain integrity (hash chain must be valid)
6. If verification fails, the consumer MUST reject the message and log a GOVERNANCE_PROOF_INVALID event

**R-ISE-003:** The Governance Proof attached to intermediary messages MUST include:

- The original tool call's Governance Proof (from CORE-001)
- The delegation chain proofs (if the write originates from a delegated task)
- A forwarding signature from the intermediary (proving the message was not tampered in transit)

### 8.3 Non-Agent Process Registration

**R-ISE-004:** Non-agent processes that consume messages from agent-initiated pipelines and produce side effects MUST be registered with the system governance layer. Registration requires:

- A process identity (Ed25519 key pair)
- The list of side effects the process can produce (e.g., database writes, API calls, file system changes)
- The Governance Proof verification policy (which DPGs' proofs are accepted)
- Operator authorization for the registration

**R-ISE-005:** Registered non-agent processes MUST log all side effects with a reference to the originating Governance Proof. These logs MUST be committed to the audit trail (AOS-CRYPTO-001 hash chain) for end-to-end traceability.

### 8.4 Unregistered Process Detection

**R-ISE-006:** The system governance layer SHOULD monitor for unregistered processes that access shared infrastructure. Detection methods include:

- Database audit logs showing writes from unregistered process IDs
- Message queue consumer groups containing unregistered consumers
- Network traffic analysis showing connections to governed resources from ungoverned processes

Detected unregistered processes MUST trigger an alert to the system operator. The system MAY block unregistered process access to governed resources (Enterprise+ tiers).

---

## 9. Emergent Behavior Detection

### 9.1 System-Level Invariants

**R-EMR-001:** System operators MUST define system-level invariants -- properties that must hold for the multi-agent system as a whole, regardless of individual agent compliance. Examples:

| Invariant | Violation Example |
|-----------|-------------------|
| Total system spend must not exceed $X/hour | 100 agents each spend $0.50/hour = $50/hour; individually compliant, collectively over budget |
| No more than N agents may access resource R concurrently | 50 agents each have individual access permission; simultaneous access causes resource exhaustion |
| No coordinated market actions across agents | Each agent independently decides to sell; collective selling triggers market manipulation detection |
| Total data exfiltration rate must not exceed Y MB/hour | Each agent reads within its individual limit; collectively they exfiltrate the entire database |
| No circular delegation chains | Agent A delegates to B, B to C, C to A -- infinite loop |

**R-EMR-002:** System-level invariants MUST be defined in a machine-readable format and evaluated by the System Governance Layer (Section 4.1). Invariants operate on aggregate metrics, not individual agent actions.

### 9.2 Monitoring Architecture

**R-EMR-003:** The System Governance Layer MUST collect aggregate telemetry from all DPG instances in the federation:

```
System Governance Layer:

                    [Invariant Monitor]
                    /    |    |    \
              metrics  metrics  metrics  metrics
                /        |        |        \
           [DPG-A]   [DPG-B]   [DPG-C]   [DPG-D]

Metrics collected per DPG per interval:
  - Tool call count (by category)
  - Budget consumption (cost, time, call count)
  - Delegation count (inbound and outbound)
  - Resource access patterns (which resources, how often)
  - Kill/deny/escalate event counts
  - Governance Proof generation rate
```

**R-EMR-004:** Each DPG MUST expose a telemetry endpoint (authenticated, accessible only to the System Governance Layer) that reports the metrics listed in R-EMR-003 at a configurable interval (default: 10 seconds). The telemetry endpoint MUST NOT be accessible to agents.

### 9.3 Containment Responses

**R-EMR-005:** When the System Governance Layer detects a system-level invariant violation, it MUST execute a containment response proportional to the severity:

| Severity | Detection | Containment Response |
|----------|-----------|---------------------|
| **LOW** | Aggregate metric approaching threshold (80% of limit) | Alert operators. Reduce per-agent budgets proactively. |
| **MEDIUM** | Aggregate metric has exceeded threshold | Throttle: reduce all agents' tool call rate to 50%. Alert operators. |
| **HIGH** | Multiple invariants violated simultaneously, or single critical invariant violated | Selective kill: identify and kill the agents contributing most to the violation (top N by metric). Alert operators with forensic data. |
| **CRITICAL** | Emergent behavior detected that poses immediate risk (market manipulation, coordinated deception, physical safety) | Cluster kill (Tier 2) or Global kill (Tier 3) via CORE-002. Full system checkpoint. |

**R-EMR-006:** Containment responses MUST be logged in the audit trail with:
- The invariant that was violated
- The aggregate metric values at the time of violation
- The list of agents identified as contributors
- The containment action taken
- The operator notification status

### 9.4 Circular Delegation Detection

**R-EMR-007:** The System Governance Layer MUST detect circular delegation chains (A delegates to B, B delegates to C, C delegates to A). Circular chains MUST be immediately broken by terminating the most recent delegation in the cycle. The audit record MUST note the cycle with all participating agents.

**R-EMR-008:** To prevent circular chains proactively, each delegation request MUST include the full delegation chain (Section 6.2, `parent_delegation_id` and `chain_depth`). A DPG MUST reject any delegation request where its own gate_id appears in the chain.

---

## 10. Conformance Testing

### 10.1 Test Categories

| Category | ID Range | Description |
|----------|---------|-------------|
| Federation establishment | FED-T001 to FED-T010 | Trust setup, handshake, registry |
| Policy propagation | POL-T001 to POL-T010 | Restriction envelopes, restriction-only principle |
| Kill propagation | KILL-T001 to KILL-T010 | Delegation-aware kill, orphan detection |
| Indirect side effects | ISE-T001 to ISE-T005 | Attestation-gated middleware |
| Emergent behavior | EMR-T001 to EMR-T005 | Invariant monitoring, containment |

### 10.2 Core Conformance Tests

| Test ID | Input | Expected Output |
|---------|-------|----------------|
| FED-T001 | Two DPGs attempt federation with valid credentials | Federation established; registry entry created in both DPGs |
| FED-T002 | DPG-A attempts federation with expired/invalid credentials | Federation rejected; no registry entry created |
| FED-T003 | Operator revokes federation between DPG-A and DPG-B | All delegations between A and B terminated; registry updated |
| FED-T004 | DPG-B stops sending heartbeats for 180+ seconds | Federation suspended; new delegations blocked |
| FED-T005 | DPG-B stops heartbeats for 300+ seconds | Federation revoked; all delegations terminated |
| POL-T001 | Agent A (file_delete denied) delegates file deletion to Agent B | Agent B's DPG denies the delegation (restriction-only principle) |
| POL-T002 | Agent A delegates task with max_risk_level=2; Agent B attempts risk-level-3 tool call | Agent B's DPG denies the call (restriction envelope exceeded) |
| POL-T003 | Delegation chain reaches max_chain_depth | Delegation rejected; chain not extended |
| POL-T004 | Agent A delegates to Agent B with budget limit; B exhausts budget | B's remaining delegated tasks terminated; B's own tasks continue |
| POL-T005 | Restriction envelope with invalid delegator signature | Delegation rejected by delegate's DPG |
| KILL-T001 | Kill Agent A (Tier 1); Agent B has active delegation from A | B's delegation from A terminated; if B has no other work, B is killed |
| KILL-T002 | Kill Agent A; A delegated to B; B delegated to C (for A's task) | Kill propagates: A killed, B's A-delegation terminated, C's B-delegation (for A) terminated |
| KILL-T003 | Kill Agent A; network partition prevents reaching Agent C downstream | Propagation timeout logged; C flagged as orphan; operator alerted |
| KILL-T004 | Spoofed kill propagation from non-federated DPG | Delegation termination signal rejected (signature verification failure) |
| KILL-T005 | Kill Agent A; Agent B has both A-delegated and independent tasks | Only A-delegated tasks on B terminated; B's independent tasks continue |
| ISE-T001 | Message with valid Governance Proof arrives at attestation-gated middleware | Message accepted; side effect executed; audit logged |
| ISE-T002 | Message without Governance Proof arrives at attestation-gated middleware | Message rejected; GOVERNANCE_PROOF_INVALID logged |
| ISE-T003 | Message with expired Governance Proof (timestamp > 300s old) | Message rejected |
| EMR-T001 | 10 agents collectively exceed system budget invariant | Throttle response triggered; operators alerted |
| EMR-T002 | Circular delegation chain A->B->C->A attempted | C's DPG rejects delegation (cycle detected); audit logged |
| EMR-T003 | Critical emergent behavior detected (simulated) | Cluster kill (Tier 2) executed via CORE-002 |

---

## 11. Security Considerations

### 11.1 Threat Model

| Threat | Severity | Mitigation | Residual Risk |
|--------|----------|------------|---------------|
| **Agent bypasses DPG via delegation** | CRITICAL | Restriction-only principle (R-POL-002); delegate's DPG enforces restriction envelope | If delegate's DPG is compromised, restrictions are not enforced. Mitigated by cross-gate attestation verification. |
| **Spoofed federation handshake** | HIGH | Ed25519 challenge-response (R-FED-006); operator authorization required | If operator credentials are compromised, false federations can be established. Mitigated by multi-party auth for Sovereign tier. |
| **Kill propagation blocked by malicious delegate** | HIGH | Delegation termination has 5-second timeout with escalation (R-KILL-005); orphan detection (R-KILL-006) | If downstream DPG ignores termination signal, delegate continues until orphan cleanup. Mitigated by watchdog timer. |
| **Governance Proof forgery in middleware** | CRITICAL | Ed25519 signature verification (R-ISE-002); chain integrity check | If originating DPG's private key is compromised, forged proofs are accepted. Mitigated by key rotation and HSM storage. |
| **Emergent behavior evades detection** | HIGH | System-level invariants (R-EMR-001); aggregate telemetry (R-EMR-003) | Novel emergent behaviors not covered by defined invariants will not be detected. Mitigated by invariant updates and anomaly detection. |
| **Circular delegation causes infinite loop** | MEDIUM | Chain depth limit (R-POL-005); cycle detection (R-EMR-008) | If chain tracking is corrupted, cycles may form. Mitigated by System Governance Layer monitoring. |
| **Restriction envelope tampering** | CRITICAL | Delegator signature verification (R-POL-004); envelope is immutable after signing | If delegator's key is compromised, tampered envelopes could expand delegate's permissions. Mitigated by key rotation. |
| **Federation heartbeat spoofing** | MEDIUM | Heartbeat is signed with gate key (R-FED-009) | If gate key is compromised, false heartbeats maintain revoked federations. Mitigated by periodic re-verification. |
| **Indirect write through unregistered process** | HIGH | Unregistered process detection (R-ISE-006); attestation-gated middleware | If middleware does not implement attestation gating, indirect writes remain ungoverned. Mitigated by Enterprise+ requirement. |

### 11.2 Limitations

| Limitation | Reason | Mitigation |
|-----------|--------|------------|
| **Cannot govern non-AOS agents** | Federation requires DPG instances on both sides | Integration adapters can wrap non-AOS agents with a DPG proxy |
| **Emergent behavior detection is reactive** | Invariant monitoring detects violations after they begin, not before | Proactive budget reduction at 80% threshold (R-EMR-005 LOW severity) |
| **Attestation-gated middleware requires adoption** | Existing infrastructure (databases, queues) does not natively verify Governance Proofs | Proxy/sidecar pattern can add attestation verification without modifying existing infrastructure |
| **Federation scalability** | Full-mesh federation has O(n^2) heartbeat overhead for n agents | Hub-and-spoke topology reduces to O(n); hierarchical to O(n) |
| **Cross-organization federation not covered** | This standard covers intra-organization federation only | AOS-FED-001 (planned) will address cross-organizational trust |

---

## 12. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| **AOS-CORE-001** | Parent standard. CORE-003 extends single-agent DPG governance to multi-agent systems. Every requirement in CORE-001 continues to apply per-agent. |
| **AOS-CORE-002** | Kill propagation. CORE-003 defines how CORE-002 kill signals propagate through delegation graphs. |
| **AOS-CRYPTO-001** | Governance Proof Chains. CORE-003 extends single Governance Proofs to linked chains that prove end-to-end governance across delegation boundaries. |
| **AOS-POL-001** | Policy restrictions. CORE-003 defines how POL-001 policies are restricted and propagated in delegation chains. |
| **AOS-HARD-001** | Hardware-backed federation. Sovereign-tier federation uses hardware-backed gate identities and HSM-protected keys. |
| **EU AI Act Art. 14** | Human oversight extends to multi-agent systems. CORE-003 ensures that human kill authority propagates through all delegation relationships. |

---

## Appendix A: Prior Art and Provenance

This standard was converted from the following provisional patent specifications:

| Patent | Title | Filed | Contribution to CORE-003 |
|--------|-------|-------|------------------------|
| AOS-PATENT-047 | Unanimous Consensus Protocol for Multi-Node Autonomous Systems | 2026-01-10 | Multi-agent consensus model, federation establishment, trust verification |
| AOS-PATENT-142 | Mass Agent Constitutional Governance with Emergent Behavior Containment | 2026-03-01 | Emergent behavior detection, containment responses, system-level invariants |
| AOS-PATENT-015 | Deterministic Policy Gate and Cryptographic Execution Boundary for Autonomous AI Systems | 2026-01-10 | Per-agent DPG architecture extended to multi-agent context |

Prior art is established upon public publication. This standard is published under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). The [AOS Foundation RF Patent Covenant](RF-PATENT-COVENANT.md) grants royalty-free rights to practice the normative portions of this standard in any conforming implementation.

---

## Appendix B: AI Disclosure

This standard was drafted with the assistance of AI tools under human editorial control. The original patent specifications, architecture, and strategic decisions were provided by the author. AI tools assisted with structural refinement, cross-referencing, and technical review. All normative requirements and architectural decisions reflect the author's judgment.

---

## Appendix C: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-05 | Initial publication. Converted from AOS-PATENT-047 and AOS-PATENT-142. |
