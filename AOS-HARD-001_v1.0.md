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
| **Syscall trajectory monitor** | **Kernel-trusted** | Runs in kernel space via eBPF. Agent cannot modify eBPF programs without CAP_BPF (denied by policy). |
| **CoW filesystem layer** | **Kernel-trusted** | OverlayFS/Btrfs managed by kernel. Agent writes to upper layer only. Rollback is kernel operation. |
| **OS kernel** | **Partially trusted** | The kernel manages CoW and eBPF, but the hardware gate does NOT depend on kernel integrity for enforcement decisions. |
| **Agent process** | **UNTRUSTED** | Same as AOS-CORE-001 Axiom 1. |

Key difference from AOS-CORE-001: In the software-only architecture, the kernel is **fully trusted** (it enforces process isolation). In AOS-HARD-001, the kernel is **partially trusted** — it manages execution environments but the enforcement decision is made in hardware that the kernel cannot influence.

---

## 5. Hardware Gate Requirements

### 5.1 Physical Isolation

**R-HW-001:** The hardware gate MUST execute on dedicated silicon physically separated from the agent's CPU. The gate MUST NOT share memory, cache, or execution pipelines with the agent's processor. Acceptable implementations include:

- Dedicated FPGA connected via PCIe or dedicated bus
- Dedicated ASIC on the system board
- Dedicated co-processor with its own memory subsystem
- Smartcard / secure element with enforcement logic

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
- Physical presence (e.g., physical jumper, button press) OR multi-party authorization from at least two independent key holders
- Journal entry recording the firmware version change, the old and new firmware hashes, and the authorization evidence

**R-HW-009:** The hardware gate MUST support firmware version attestation. External verifiers MUST be able to query the gate for its current firmware version and verify that version against a published reference hash.

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

### 6.2 Commit Protocol

**R-COW-004:** If a task completes successfully (all tool calls ALLOWED, all attestations verified), the upper layer modifications MAY be committed to the baseline through a controlled promotion process. Promotion MUST:

- Verify that all tool calls in the task have valid attestations
- Record the promotion in the hardware gate's journal
- Create a new baseline snapshot with a verified integrity hash

**R-COW-005:** Uncommitted upper layers MUST be automatically purged after a configurable timeout (default: 1 hour). No ephemeral state SHALL persist indefinitely.

### 6.3 Residue Prevention

**R-COW-006:** After atomic rollback, the implementation MUST guarantee zero residue. Specifically:

- No files created by the agent remain in the filesystem
- No modifications to existing files persist
- No new processes spawned by the agent survive
- No network connections initiated by the agent remain open
- Memory pages used by the agent are zeroed

This requirement ensures that a denied agent session leaves no trace that could be exploited by subsequent sessions.

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

### 7.3 Runtime Monitoring

**R-SYS-003:** During agent execution, the implementation MUST continuously monitor the agent's syscall stream using kernel-space instrumentation (eBPF, seccomp-bpf, or equivalent) and compare it against the established baseline.

**R-SYS-004:** The following deviations MUST trigger an alert and MAY trigger the hardware kill switch:

| Deviation | Indicator | Likely Cause |
|-----------|-----------|-------------|
| **Velocity anomaly** | Syscall rate exceeds baseline maximum by configurable factor (default: 3x) | Automated payload execution, denial-of-service |
| **Sequence anomaly** | Syscall sequence matches known malicious trajectory (e.g., `socket() → connect() → sendmsg()` to non-allowlisted IP) | Data exfiltration, reverse shell |
| **Entropy anomaly** | Write entropy exceeds baseline maximum | Ransomware encryption, steganographic encoding |
| **Fork depth anomaly** | Process tree depth exceeds baseline maximum | Privilege escalation, fork bomb |
| **Temporal anomaly** | Syscall timing deviates from baseline distribution | Timing side-channel exploitation |

**R-SYS-005:** Syscall monitoring MUST be independent of the agent's process. The monitoring daemon MUST run in a separate security domain (kernel space or dedicated namespace) that the agent cannot access or modify.

**R-SYS-006:** If the syscall monitoring system is terminated or becomes unresponsive, the hardware gate MUST enter fail-closed mode. The agent MUST NOT be permitted to execute while syscall monitoring is unavailable.

---

## 8. Hardware Kill Switch Integration

### 8.1 Physical Termination

**R-KILL-001:** The hardware enforcement boundary MUST include a physical kill switch that can terminate the agent's execution through hardware means (power relay, bus disconnect, or clock disable). The kill switch MUST NOT depend on:

- The agent's cooperation
- The operating system kernel's integrity
- Network connectivity
- Software signal delivery

**R-KILL-002:** The hardware kill switch MUST be triggerable by:

- The hardware gate (on policy violation or journal failure)
- The syscall trajectory monitor (on baseline deviation)
- An external physical control (button, switch, or remote relay)
- A watchdog timer (if the hardware gate becomes unresponsive)

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
