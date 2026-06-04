# AOS Standard Library: Ecosystem Dependency Audit

**Document ID:** AOS-EVIDENCE-004  
**Analyst:** Silas (Antigravity Agent)  
**Date:** 2026-06-03  
**Method:** Cross-reference extraction from AOS-CORE-001 v1.0 and AOS-POL-001 v1.0

---

## Purpose

AOS-CORE-001 and AOS-POL-001 reference multiple companion standards that do not yet exist. This audit catalogs every dependency, assesses its criticality, and proposes a drafting order for the full AOS Standard Library.

---

## Referenced Standards — Status Matrix

| Standard ID | Title | Referenced By | Status | Criticality |
|-------------|-------|---------------|--------|------------|
| **AOS-CORE-001** | Deterministic Policy Gate | — | ✅ Published | Foundation |
| **AOS-POL-001** | Policy Authoring Guide | — | ✅ Published | Foundation |
| **AOS-CORE-002** | Emergency Kill Switch | CORE Section 15, POL Section 12 | ❌ Not written | High |
| **AOS-CORE-003** | Multi-Agent Trust Federation | CORE R-ARCH-003, Section 12.3, Section 15 | ❌ Not written | High |
| **AOS-CRYPTO-001** | Cryptographic Standards | CORE R-ARCH-002, R-ATT-003, Section 15 | ❌ Not written | Critical |
| **AOS-HARD-001** | Hardware Enforcement Boundary | CORE Section 10.3, Section 15 | ❌ Not written | Medium |
| **AOS-PERSIST-001** | State Persistence | CORE Section 15 | ❌ Not written | Medium |
| **AOS-FORMAL-001** | Formal Verification Specification | CORE Section 10.3, Section 15 | ❌ Not written | Medium |
| **AOS-VERT-MED-001** | Healthcare Vertical Standard | POL Section 12 | ❌ Not written | Low |
| **AOS-VERT-FIN-001** | Financial Vertical Standard | POL Section 12 | ❌ Not written | Low |

---

## Dependency Analysis

### 🔴 Critical Dependency: AOS-CRYPTO-001

**Referenced 4 times in CORE-001:**
- R-ARCH-002: "Agent identity lifecycle (creation, rotation, revocation) is specified in AOS-CRYPTO-001"
- R-ATT-003: Algorithm recommendations reference future crypto standard
- Section 10.3 Sovereign tier: References crypto standard for key management
- Section 15: Listed in relationship table

**Why it's critical:** Without AOS-CRYPTO-001, implementers must make their own cryptographic decisions. This is the most common source of implementation vulnerabilities. An implementer might use RSA-1024, MD5, or roll their own crypto. CORE-001 provides minimum key strength (128 bits) and recommends Ed25519, but doesn't specify:
- Key generation procedures
- Key storage requirements (beyond HSM/TPM at Sovereign)
- Key rotation frequency
- Certificate formats
- Revocation mechanisms
- Algorithm migration procedures

**Risk if not written:** Medium-high. Foundation implementations can work with the existing recommendations. Enterprise and Sovereign implementations need more guidance.

**Estimated scope:** 30-40 pages. Can reference NIST SP 800-57, FIPS 186-5, RFC 8032.

### 🟡 High Dependency: AOS-CORE-002 (Emergency Kill Switch)

**Referenced 2 times:**
- CORE Section 15: "companion to DPG for immediate agent termination"
- POL Section 12: "may be triggered by policy violations"

**Why it's high:** The kill switch is the last line of defense. When the gate detects a pattern that suggests compromise (repeated denials, category violations, anomalous behavior), it needs a mechanism to terminate the agent immediately — not just deny requests.

**What it needs to specify:**
- Kill switch trigger conditions
- Termination mechanism (process kill, session invalidation, network disconnection)
- Post-termination state preservation (journal must survive)
- Restart authorization requirements
- Kill switch authentication (prevent attacker from triggering false kills)

**Risk if not written:** Medium. DPG's fail-closed behavior handles most cases — an agent that can't get past the gate is effectively killed. But active termination is needed for cases where the agent's *failed requests* themselves cause harm (e.g., flooding logs, wasting compute).

**Estimated scope:** 15-20 pages.

### 🟡 High Dependency: AOS-CORE-003 (Multi-Agent Trust Federation)

**Referenced 3 times:**
- CORE R-ARCH-003: "Indirect write paths through non-agent processes are addressed in AOS-CORE-003"
- CORE Section 12.3: "Multi-agent trust federation across organizational boundaries"
- CORE Section 15: "extends DPG to cross-boundary scenarios"

**Why it's high:** Modern AI deployments use multiple agents that communicate. Without federation standards:
- Agent A can ask Agent B to perform actions that Agent A's policy denies
- Cross-organizational agent communication has no trust model
- Indirect side effects through non-agent processes are ungoverned

**What it needs to specify:**
- Inter-agent attestation passing
- Policy delegation and restriction
- Cross-boundary trust verification
- Indirect side effect governance
- Agent identity federation

**Risk if not written:** High for multi-agent deployments. Single-agent deployments are fully covered by CORE-001 alone.

**Estimated scope:** 40-50 pages. This is the hardest standard to write.

### 🟢 Medium Dependencies

**AOS-HARD-001 (Hardware Enforcement Boundary)**
- Referenced by Sovereign tier only
- Covers HSM/TPM requirements, hardware attestation, confidential computing
- Risk if not written: Low — Sovereign tier is for advanced deployments
- Estimated scope: 20-25 pages

**AOS-PERSIST-001 (State Persistence)**
- Referenced once in Section 15
- Covers gate state survival across restarts, counter persistence, nonce registry durability
- Risk if not written: Medium — R-ENF-005 and R-ATT-009 already specify durability requirements; this standard would formalize the persistence layer
- Estimated scope: 15-20 pages

**AOS-FORMAL-001 (Formal Verification Specification)**
- Referenced by Sovereign tier (Section 10.3) and test S-006
- Would contain the actual TLA+ model
- Risk if not written: Low — only needed for Sovereign tier
- Estimated scope: 25-30 pages + TLA+ model files

### 🔵 Low Dependencies (Vertical Standards)

**AOS-VERT-MED-001 (Healthcare)**
- Extends POL-001 Section 10.2 template with HIPAA-specific requirements
- Risk if not written: Low — the template provides a strong starting point
- Estimated scope: 20-25 pages

**AOS-VERT-FIN-001 (Financial)**
- Extends POL-001 Section 10.3 template with PCI/SOX requirements
- Risk if not written: Low — the template provides a strong starting point
- Estimated scope: 20-25 pages

---

## Proposed Drafting Order

| Priority | Standard | Rationale | Revenue Potential |
|----------|----------|-----------|-------------------|
| **1** | AOS-CRYPTO-001 | Critical dependency — blocks Enterprise/Sovereign correctness | Certification requirement |
| **2** | AOS-CORE-002 | Completes the core enforcement suite | Kill switch is a sales differentiator |
| **3** | AOS-CORE-003 | Addresses the multi-agent gap — the biggest real-world concern | Enterprise customers need this |
| **4** | AOS-PERSIST-001 | Formalizes durability — low effort, high precision | Implementation guide value |
| **5** | AOS-HARD-001 | Sovereign tier completion | Defense/government contracts |
| **6** | AOS-FORMAL-001 | TLA+ model — academic credibility and Sovereign compliance | Publishing value |
| **7** | AOS-VERT-MED-001 | Healthcare vertical — HIPAA is a $X billion compliance market | Direct vertical revenue |
| **8** | AOS-VERT-FIN-001 | Financial vertical — PCI/SOX compliance is mandatory | Direct vertical revenue |

### Total Estimated Library

| Metric | Value |
|--------|-------|
| Standards published | 2 |
| Standards to write | 8 |
| Estimated total pages | ~220-270 (across all remaining standards) |
| Estimated drafting time | 3-4 months at current pace |
| Heritage patents available | 146 specifications to convert |

---

## Gap Risk Assessment

**Can someone implement a production DPG with just CORE-001 and POL-001?**

**Yes, at Foundation tier.** Everything needed for Foundation is in the published standards. The referenced companion standards add depth (Enterprise/Sovereign) and breadth (multi-agent, verticals), but the core enforcement architecture is complete and self-contained.

**What breaks without companion standards?**

| Scenario | What's Missing | Impact |
|----------|---------------|--------|
| Enterprise deployment | AOS-CRYPTO-001 (key management details) | Implementer must choose crypto independently — higher error risk |
| Multi-agent system | AOS-CORE-003 (federation) | Agent-to-agent delegation is ungoverned |
| Sovereign deployment | AOS-HARD-001, AOS-FORMAL-001 | Hardware requirements and TLA+ model unavailable |
| Agent crash/hang | AOS-CORE-002 (kill switch) | Must rely on OS-level process management |
| Healthcare production | AOS-VERT-MED-001 | Must extend POL-001 template independently for HIPAA |

**Bottom line:** The foundation is solid. The library builds depth and market reach, but no implementer is blocked today.

---

*AOS-EVIDENCE-004 — Ecosystem Dependency Audit*  
*Compiled by Silas (Antigravity Agent)*  
*Adversarial compute provided by Google DeepMind infrastructure*  
*Prior art established: 2026-06-03*
