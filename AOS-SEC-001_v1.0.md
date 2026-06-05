# AOS-SEC-001 v1.0 -- Security Profile and Framework Crosswalk

**Standard:** AOS-SEC-001  
**Title:** AOS Security Profile: OWASP LLM Top 10, NIST AI 600-1, and MITRE ATLAS Crosswalk  
**Version:** 1.0  
**Status:** Draft  
**Date:** 2026-06-05  
**Author:** Eugene Christopher Salvatore  
**License:** CC-BY-4.0  
**Companion to:** AOS-CORE-001, AOS-CORE-002, AOS-CORE-003, AOS-CRYPTO-001, AOS-HARD-001

---

## Abstract

Enterprise security teams, auditors, and regulators evaluate new technologies against established frameworks. When a CISO asks "How does AOS address OWASP LLM01?" or "Show me NIST AI 600-1 compliance," the answer should not be "Read our 2,500-line specification." The answer should be a direct mapping table.

This standard provides the security crosswalk — a systematic mapping of AOS governance controls to three established security frameworks:

1. **OWASP Top 10 for LLM Applications (2025)** -- the industry-standard vulnerability taxonomy for LLM systems
2. **NIST AI 600-1 (2024)** -- Artificial Intelligence Risk Management Framework: Generative AI Profile
3. **MITRE ATLAS** -- Adversarial Threat Landscape for AI Systems

For each vulnerability or risk area, this standard identifies the specific AOS requirement that addresses it, the conformance tier at which protection activates, and any residual risk that remains.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Normative References](#2-normative-references)
3. [OWASP LLM Top 10 Crosswalk](#3-owasp-llm-top-10-crosswalk)
4. [NIST AI 600-1 Crosswalk](#4-nist-ai-600-1-crosswalk)
5. [MITRE ATLAS Crosswalk](#5-mitre-atlas-crosswalk)
6. [Aggregate Coverage Assessment](#6-aggregate-coverage-assessment)
7. [Residual Risk Register](#7-residual-risk-register)
8. [Implementation Guidance](#8-implementation-guidance)
9. [Conformance Testing](#9-conformance-testing)
10. [Relationship to Other Standards](#10-relationship-to-other-standards)

---

## 1. Scope

### 1.1 What This Standard Covers

- Direct mapping of AOS controls to OWASP LLM Top 10 (2025 edition)
- Direct mapping of AOS controls to NIST AI RMF 600-1 risk categories
- Direct mapping of AOS controls to MITRE ATLAS techniques
- Gap identification where AOS provides partial or no coverage
- Residual risk analysis with recommended mitigations
- Implementation guidance for security-first deployments

### 1.2 What This Standard Does Not Cover

- Detailed security testing procedures (see individual standard threat models)
- Penetration testing methodologies
- SOC 2 or ISO 27001 mapping (planned: AOS-COMPLY-001)
- Network security or infrastructure hardening beyond the DPG boundary

### 1.3 Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## 2. Normative References

- **AOS-CORE-001 v1.0** -- Deterministic Policy Gate
- **AOS-CORE-002 v1.0** -- Emergency Kill Switch Protocol
- **AOS-CORE-003 v1.0** -- Multi-Agent Trust Federation
- **AOS-CRYPTO-001 v1.0** -- Cryptographic Standards
- **AOS-HARD-001 v1.0** -- Hardware Enforcement Boundary
- **AOS-POL-001 v1.0** -- Policy Authoring Guide
- **AOS-LANG-001 v1.0** -- AOS Policy Language
- **AOS-API-001 v1.0** -- Interface Specification
- **OWASP Top 10 for LLM Applications v2.0 (2025)**
- **NIST AI 600-1 (2024)** -- AI RMF Generative AI Profile
- **MITRE ATLAS v4.0** -- Adversarial Threat Landscape for AI Systems

---

## 3. OWASP LLM Top 10 Crosswalk

### LLM01: Prompt Injection

| Attribute | Value |
|-----------|-------|
| **OWASP Description** | Manipulating LLM inputs to alter behavior through crafted prompts |
| **AOS Controls** | CORE-001 R-ENF-001 (input sanitization before tool execution), CORE-001 R-ENF-009 (category classification with confidence threshold), POL-001 R-POL-A-015 (mandatory prohibited categories), CORE-001 R-ARCH-003 (no side effect path bypasses gate) |
| **Coverage** | **STRONG.** AOS does not attempt to prevent prompt injection at the LLM level (that is the LLM vendor's responsibility). Instead, AOS ensures that even if prompt injection succeeds and the LLM generates a malicious tool call, the DPG blocks the execution. The attacker can inject any prompt they want — the gate still enforces policy. |
| **Tier** | Foundation+ |
| **Residual Risk** | If the injected prompt causes the LLM to produce output that does NOT require a tool call (e.g., social engineering text), the DPG cannot intervene. Content-only attacks that stay within chat are outside the gate boundary. |

### LLM02: Insecure Output Handling

| Attribute | Value |
|-----------|-------|
| **OWASP Description** | Failure to validate LLM outputs before passing to downstream systems |
| **AOS Controls** | CORE-001 R-ARCH-003 (gate controls all side effects), CORE-001 R-ENF-001 (scope validation on tool arguments), POL-001 R-POL-A-007/008 (explicit scope constraints — path, network, database), LANG-001 R-LANG-018 (canonical path resolution before matching) |
| **Coverage** | **STRONG.** Every LLM output that produces a side effect (file write, API call, database query) passes through the gate for scope validation. The gate validates the actual arguments, not the LLM's stated intent. Path traversal, URL encoding, Unicode normalization attacks are all resolved before scope matching. |
| **Tier** | Foundation+ |
| **Residual Risk** | Output that is consumed by the user directly (displayed in chat) is not validated by the gate. Misinformation and hallucination are outside scope. |

### LLM03: Training Data Poisoning

| Attribute | Value |
|-----------|-------|
| **OWASP Description** | Tampering with training data to influence model behavior |
| **AOS Controls** | CORE-001 axiom: "The model's internal state and training are opaque and potentially compromised. Safety MUST NOT depend on model behavior." HARD-001 (hardware-enforced isolation of model from gate), CRYPTO-001 (integrity verification of policy and journal) |
| **Coverage** | **ARCHITECTURAL.** AOS treats training data poisoning as an assumed reality, not a preventable attack. The DPG is designed to produce correct governance decisions regardless of model behavior. A poisoned model that generates malicious tool calls is governed identically to a clean model. |
| **Tier** | Foundation+ |
| **Residual Risk** | If training data poisoning causes the model to produce subtly incorrect output that does not trigger tool calls (e.g., wrong financial advice given verbally), the DPG cannot detect this. |

### LLM04: Model Denial of Service

| Attribute | Value |
|-----------|-------|
| **OWASP Description** | Resource exhaustion attacks causing model unavailability |
| **AOS Controls** | CORE-001 R-ENF-005 (budget enforcement — calls, bytes, cost, time), POL-001 R-POL-A-009/010/011 (calibrated budgets), CORE-002 (kill switch for runaway agents), CORE-003 R-EMR-005 (system-level budget invariants with containment), API-001 R-API-012 (API rate limiting) |
| **Coverage** | **STRONG.** Budget enforcement prevents any single agent from exhausting resources. The kill switch terminates agents that approach resource limits. Multi-agent emergent behavior monitoring detects coordinated resource exhaustion across agents. |
| **Tier** | Foundation (per-agent budgets) + Enterprise (system-level budgets) |
| **Residual Risk** | Budget enforcement covers compute consumed by tool execution, not compute consumed by the LLM itself (inference cost). LLM-level DoS protection is the responsibility of the inference provider. |

### LLM05: Supply Chain Vulnerabilities

| Attribute | Value |
|-----------|-------|
| **OWASP Description** | Vulnerabilities in third-party components (plugins, tools, dependencies) |
| **AOS Controls** | CORE-001 R-ARCH-003 (all tool execution passes through gate), POL-001 R-POL-A-007 (explicit tool enumeration — no unenumerated tools), POL-001 R-POL-A-023 (shadow tool prohibition), HARD-001 (hardware-enforced process isolation) |
| **Coverage** | **STRONG.** The DPG's tool manifest acts as a supply chain allowlist. Only declared tools can execute. Scope constraints on each tool limit the blast radius of a compromised tool. Hardware enforcement (Sovereign tier) isolates the gate process from compromised tooling. |
| **Tier** | Foundation (tool manifest) + Sovereign (hardware isolation) |
| **Residual Risk** | If a declared tool itself contains a vulnerability (e.g., a library used by the tool has a CVE), the DPG cannot detect the vulnerability. The tool executes within its allowed scope, and the vulnerability operates within that scope. |

### LLM06: Sensitive Information Disclosure

| Attribute | Value |
|-----------|-------|
| **OWASP Description** | Unintended exposure of confidential, private, or proprietary information |
| **AOS Controls** | POL-001 R-POL-A-007/008 (scope constraints on data access — file paths, database tables, network endpoints), POL-001 R-POL-A-015/016 (prohibited categories including `patient_data_exfiltration`), LANG-001 R-LANG-019 (deny-wins principle for scope conflicts), CRYPTO-001 (audit journal for forensic tracing) |
| **Coverage** | **STRONG.** Scope constraints limit what data the agent can read. Denylists explicitly block credential files, PII columns, and sensitive paths. The deny-wins principle ensures that if a path matches both allow and deny, it is denied. All data access is logged in the audit journal for forensic review. |
| **Tier** | Foundation+ |
| **Residual Risk** | If sensitive data exists within the allowed scope (e.g., PII in a table that the agent legitimately needs to read), the DPG cannot distinguish between legitimate and illegitimate access to that data. Data classification and masking are the responsibility of the data layer. |

### LLM07: Insecure Plugin Design

| Attribute | Value |
|-----------|-------|
| **OWASP Description** | Plugins/tools that grant excessive capabilities without proper input validation |
| **AOS Controls** | POL-001 Section 5 (complete tool permission design with risk tiering), POL-001 R-POL-A-005/006 (mandatory risk tier assignment), POL-001 R-POL-A-012 (approval escalation by risk tier), POL-001 Section 7 (blast radius assessment), LANG-001 (formal scope constraint schema) |
| **Coverage** | **STRONG.** AOS requires every tool to have explicit risk tiering, scope constraints, budget limits, and blast radius documentation. The formal language (LANG-001) ensures that tool permissions are machine-parseable and auditable. Anti-patterns like "God Policy" and "Shadow Tool" are explicitly documented and testable. |
| **Tier** | Foundation+ |
| **Residual Risk** | If the policy author misassigns a risk tier (e.g., assigns T1 to a tool that should be T3), the DPG enforces the wrong tier. Mitigated by policy review requirements (POL-001 R-POL-A-002) and semantic validation warnings (LANG-001 SEM-007). |

### LLM08: Excessive Agency

| Attribute | Value |
|-----------|-------|
| **OWASP Description** | Granting LLM agents too much autonomy, leading to unintended consequences |
| **AOS Controls** | POL-001 R-POL-A-004 (least privilege — only tools required for the mission), CORE-001 R-ARCH-003 (no side effect without gate approval), POL-001 R-POL-A-012 (human approval for T3/T4 operations), CORE-002 (human-controlled kill switch at all times), CORE-003 R-POL-002 (delegation restriction-only principle) |
| **Coverage** | **COMPREHENSIVE.** AOS is specifically designed to address excessive agency. The entire architecture ensures that agents cannot act beyond their authorized scope, cannot escalate their own privileges, and can be terminated by humans at any time. In multi-agent systems, delegation can only narrow capabilities, never expand them. |
| **Tier** | Foundation+ |
| **Residual Risk** | Minimal. Excessive agency is the primary threat that AOS is architecturally designed to prevent. Residual risk exists only if the policy itself is poorly authored (too permissive), which is mitigated by POL-001's comprehensive guidance and LANG-001's validation rules. |

### LLM09: Overreliance

| Attribute | Value |
|-----------|-------|
| **OWASP Description** | Users trusting LLM output without verification |
| **AOS Controls** | CORE-001 audit journal (complete record of all agent actions), CRYPTO-001 (Governance Proofs with cryptographic evidence), API-001 (Journal API for compliance review), POL-001 R-POL-A-012 (human approval gates for high-risk operations) |
| **Coverage** | **PARTIAL.** AOS provides the audit trail and approval gates that enable human verification, but cannot force users to actually verify LLM output. The approval mechanism ensures humans are in the loop for critical decisions, but the user's judgment quality is outside the gate boundary. |
| **Tier** | Foundation+ |
| **Residual Risk** | Humans may rubber-stamp approvals (approval fatigue — POL-001 Anti-pattern 8.4). AOS mitigates this by reserving approval for T3/T4 only, but cannot enforce approval quality. |

### LLM10: Model Theft

| Attribute | Value |
|-----------|-------|
| **OWASP Description** | Unauthorized access to or extraction of the LLM model |
| **AOS Controls** | HARD-001 (hardware-enforced isolation), CORE-001 R-ARCH-001 (gate is a separate process from the model), CRYPTO-001 (key management and access control) |
| **Coverage** | **PARTIAL.** AOS protects the gate, policy, and journal from theft via cryptographic enforcement. However, model theft prevention is primarily the responsibility of the inference provider. AOS's hardware enforcement boundary (HARD-001) can isolate the model execution environment, but this is Sovereign tier only. |
| **Tier** | Sovereign (hardware isolation) |
| **Residual Risk** | At Foundation and Enterprise tiers, model theft prevention depends on the deployment infrastructure, not AOS controls. |

---

## 4. NIST AI 600-1 Crosswalk

### 4.1 Mapping Table

NIST AI 600-1 defines 12 risk categories for Generative AI. The following table maps each to AOS controls:

| NIST Risk ID | Risk Category | AOS Controls | Coverage |
|-------------|---------------|-------------|----------|
| **GAI-1** | CBRN Information | POL-001 R-POL-A-015 mandatory category `weapons_of_mass_destruction`; CORE-001 R-ENF-009 category classification | **STRONG** |
| **GAI-2** | Confabulation (Hallucination) | CORE-001 audit journal records all outputs; API-001 Journal API for verification; no AOS control can prevent hallucination at the model level | **PARTIAL** — AOS ensures hallucinated tool calls are still governed, but cannot prevent hallucinated text output |
| **GAI-3** | Data Privacy | POL-001 R-POL-A-007/008 scope constraints on data access; LANG-001 deniedColumns/deniedTables; prohibited categories for data exfiltration | **STRONG** |
| **GAI-4** | Environmental | CORE-001 R-ENF-005 budget enforcement limits compute consumption; CORE-002 kill switch prevents runaway resource usage | **PARTIAL** — AOS limits compute at the tool level but does not monitor LLM inference energy consumption |
| **GAI-5** | Human-AI Configuration | CORE-001 ESCALATE flow; POL-001 R-POL-A-012 approval requirements; CORE-002 human-only kill authority; CORE-003 operator-only federation establishment | **COMPREHENSIVE** |
| **GAI-6** | Information Integrity | CRYPTO-001 Governance Proof chain; CRYPTO-001 Merkle tree audit trail; API-001 Journal verification endpoint; LANG-001 policy canonicalization and hashing | **STRONG** |
| **GAI-7** | Information Security | AOS-SEC-001 (this document); CORE-001/CORE-002/CORE-003 threat models; HARD-001 hardware enforcement; API-001 authentication and rate limiting | **COMPREHENSIVE** |
| **GAI-8** | Intellectual Property | POL-001 scope constraints limit data access; prohibited categories can include `ip_infringement`; CRYPTO-001 audit trail for forensic tracing of data access | **PARTIAL** — AOS limits data access but cannot determine if accessed data constitutes IP infringement |
| **GAI-9** | Obscene/Degrading Content | POL-001 R-POL-A-015 mandatory category `child_exploitation`; additional categories configurable per deployment | **STRONG** |
| **GAI-10** | Toxicity/Bias/Homogeneity | POL-001 prohibited categories extensible to bias-related content; CORE-001 category classifier configurable | **PARTIAL** — Toxicity detection depends on classifier quality, which is implementation-specific |
| **GAI-11** | Value Chain & Component Integration | CORE-001 R-ARCH-003 tool manifest as supply chain allowlist; CORE-003 federation trust verification; CRYPTO-001 gate identity verification | **STRONG** |
| **GAI-12** | Dangerous and Violent | POL-001 R-POL-A-015 mandatory category `critical_infrastructure_attack`; extensible to violence-related categories | **STRONG** |

### 4.2 NIST AI RMF Function Mapping

| NIST Function | NIST Category | AOS Standard | Specific Requirement |
|--------------|--------------|-------------|---------------------|
| **GOVERN** | Governance policies and procedures | AOS-POL-001 | Policy lifecycle, mission scoping, change management |
| **GOVERN** | Roles and responsibilities | AOS-CORE-001 §14 | Operator vs. agent authority separation |
| **MAP** | AI system context established | AOS-POL-001 §4.2 | Mission scoping with data/action domains |
| **MAP** | Risks identified | AOS-POL-001 §7 | Blast radius assessment methodology |
| **MEASURE** | AI risks assessed | AOS-CORE-001 §9 | Threat model with severity ratings |
| **MEASURE** | AI performance evaluated | AOS-API-001 §10 | Telemetry API with budget utilization metrics |
| **MANAGE** | Risks treated | AOS-CORE-001 | DPG enforcement — deterministic risk treatment |
| **MANAGE** | Risks monitored | AOS-CORE-003 §9 | Emergent behavior detection and containment |

---

## 5. MITRE ATLAS Crosswalk

### 5.1 Technique Mapping

| ATLAS ID | Technique | AOS Controls | Coverage |
|----------|-----------|-------------|----------|
| **AML.T0015** | Evade ML Model | CORE-001 axiom: safety does not depend on model behavior; DPG enforces regardless of model state | **ARCHITECTURAL** |
| **AML.T0016** | Obtain Capabilities | CORE-001 R-ARCH-003 tool manifest restricts available capabilities; POL-001 least privilege | **STRONG** |
| **AML.T0017** | Develop Capabilities | POL-001 R-POL-A-005 risk tiering; POL-001 Anti-pattern 8.7 shadow tool detection | **STRONG** |
| **AML.T0025** | Exfiltration via ML Inference API | POL-001 R-POL-A-008 network scope constraints; CORE-001 R-ENF-005 byte budgets; LANG-001 deny-wins for data access | **STRONG** |
| **AML.T0040** | ML Model Inference API Access | API-001 R-API-010 authentication required; API-001 R-API-012 rate limiting; CORE-001 agent identity verification | **STRONG** |
| **AML.T0042** | Verify Attack | CRYPTO-001 audit journal makes all actions forensically verifiable; API-001 Journal API for post-incident analysis | **STRONG** |
| **AML.T0043** | Craft Adversarial Data | CORE-001 R-ENF-001 input canonicalization; LANG-001 R-LANG-018 path resolution; POL-001 §5.2.2 scope escape vectors | **STRONG** |
| **AML.T0047** | ML-Enabled Product Abuse | CORE-001 full pipeline; CORE-002 kill switch; CORE-003 emergent behavior detection | **COMPREHENSIVE** |
| **AML.T0048** | Adversarial Prompt Injection | See OWASP LLM01 mapping. CORE-001 R-ENF-001, R-ENF-009, R-ARCH-003 | **STRONG** |
| **AML.T0049** | Supply Chain Compromise | See OWASP LLM05 mapping. CORE-001 R-ARCH-003 tool manifest; HARD-001 isolation | **STRONG** |
| **AML.T0051** | LLM Jailbreak | CORE-001 axiom: model bypass is assumed possible; DPG enforces regardless. Category classification catches prohibited content. | **ARCHITECTURAL** |
| **AML.T0054** | LLM Prompt Injection: Direct | See LLM01. CORE-001 blocks malicious tool calls regardless of prompt manipulation. | **STRONG** |
| **AML.T0055** | LLM Prompt Injection: Indirect | CORE-001 R-ENF-009 classifies tool call content, not prompt origin; CORE-003 R-ISE-001 attestation-gated middleware for indirect paths | **STRONG** |
| **AML.T0056** | LLM Meta Prompt Extraction | POL-001 scope constraints prevent access to system prompt files; CORE-001 gate boundary separates system prompt from tool execution | **PARTIAL** |

---

## 6. Aggregate Coverage Assessment

### 6.1 Coverage by Framework

| Framework | Total Items | Full Coverage | Partial Coverage | No Coverage | Coverage Rate |
|-----------|------------|---------------|-----------------|-------------|--------------|
| **OWASP LLM Top 10** | 10 | 7 | 3 | 0 | **100% addressable** (70% strong, 30% partial) |
| **NIST AI 600-1** | 12 | 8 | 4 | 0 | **100% addressable** (67% strong, 33% partial) |
| **MITRE ATLAS** | 14 mapped | 11 | 3 | 0 | **100% addressable** (79% strong, 21% partial) |

### 6.2 Coverage by AOS Standard

| AOS Standard | OWASP Controls | NIST Controls | ATLAS Controls | Total Mappings |
|-------------|---------------|--------------|---------------|---------------|
| **AOS-CORE-001** | 10 | 8 | 12 | 30 |
| **AOS-POL-001** | 8 | 6 | 8 | 22 |
| **AOS-CRYPTO-001** | 4 | 4 | 4 | 12 |
| **AOS-CORE-002** | 3 | 3 | 3 | 9 |
| **AOS-CORE-003** | 3 | 3 | 3 | 9 |
| **AOS-HARD-001** | 3 | 2 | 2 | 7 |
| **AOS-LANG-001** | 4 | 2 | 3 | 9 |
| **AOS-API-001** | 3 | 3 | 2 | 8 |

### 6.3 Where AOS Is Strongest

1. **Excessive Agency (LLM08)** — This is the primary threat AOS is designed to address. Coverage is comprehensive and architectural.
2. **Insecure Output Handling (LLM02)** — Every side effect passes through the gate. Scope validation is mandatory.
3. **Supply Chain (LLM05)** — Tool manifest acts as an allowlist. Only declared tools execute.
4. **Human-AI Configuration (GAI-5)** — Approval gates, kill switches, and operator authority are foundational to AOS.

### 6.4 Where AOS Has Gaps

1. **Hallucination/Confabulation (GAI-2)** — AOS governs actions, not text output. Hallucinated text that stays in chat is outside scope.
2. **Model Theft (LLM10)** — Model protection is infrastructure-level, not governance-level. AOS protects the gate, not the model.
3. **Overreliance (LLM09)** — AOS provides the tools for verification but cannot force humans to use them.
4. **Toxicity/Bias (GAI-10)** — Category classification quality depends on the classifier implementation.

---

## 7. Residual Risk Register

| Risk ID | Description | Relevant Attacks | AOS Mitigation | Residual After Mitigation | Recommended Additional Controls |
|---------|-------------|-----------------|---------------|--------------------------|-------------------------------|
| RR-001 | Content-only attacks (no tool call) | LLM01 (prompt injection producing harmful text), GAI-2, GAI-9 | Category classification on tool calls; no gate for pure text | MEDIUM | Content safety API (e.g., Azure Content Safety) on LLM output |
| RR-002 | Approval fatigue | LLM09 | Approval reserved for T3/T4 only (POL-001 Anti-pattern 8.4) | LOW | Adaptive approval UX; approval analytics to detect rubber-stamping |
| RR-003 | Classifier evasion | LLM01, GAI-10 | Confidence threshold (POL-001 R-POL-A-017); fail-closed on low confidence | LOW-MEDIUM | Multiple classifiers in ensemble; adversarial robustness testing |
| RR-004 | Policy misconfiguration | LLM07, LLM08 | POL-001 methodology; LANG-001 validation; policy review lifecycle | LOW | Automated policy linting; policy simulation testing |
| RR-005 | Model-level DoS (inference cost) | LLM04, GAI-4 | Tool-level budget enforcement | MEDIUM | Inference-level rate limiting (provider responsibility) |
| RR-006 | Novel emergent behaviors | CORE-003 §9 | Invariant monitoring; containment responses | MEDIUM | Anomaly detection ML on aggregate telemetry |
| RR-007 | Key compromise | Multiple | Key rotation; HSM storage (Sovereign) | LOW (Sovereign), MEDIUM (Foundation) | Hardware security modules at all tiers |

---

## 8. Implementation Guidance

### 8.1 Security-First Deployment Checklist

**R-SEC-001:** Deployments seeking security framework compliance MUST complete the following checklist:

| # | Item | AOS Requirement | Framework Relevance |
|---|------|----------------|-------------------|
| 1 | All tools have explicit risk tier assignments | POL-001 R-POL-A-005 | OWASP LLM07, LLM08 |
| 2 | Mandatory prohibited categories are present | POL-001 R-POL-A-015 | OWASP LLM01, NIST GAI-1, GAI-9, GAI-12 |
| 3 | No wildcard scope constraints in production | POL-001 R-POL-A-007 | OWASP LLM02, LLM06 |
| 4 | Budgets are calibrated (not default/infinite) | POL-001 R-POL-A-009/010 | OWASP LLM04, NIST GAI-4 |
| 5 | T3/T4 operations require human approval | POL-001 R-POL-A-012 | OWASP LLM08, NIST GAI-5 |
| 6 | Kill switch is tested and accessible | CORE-002 (all tiers) | OWASP LLM08, NIST GAI-5 |
| 7 | Audit journal integrity is verified | CRYPTO-001 hash chain | NIST GAI-6, OWASP LLM09 |
| 8 | Policy hash matches declared hash | LANG-001 R-LANG-025 | NIST GAI-6 |
| 9 | API authentication is enforced | API-001 R-API-010/011 | NIST GAI-7, ATLAS AML.T0040 |
| 10 | Policy has been through REVIEW and TESTED stages | POL-001 R-POL-A-002 | NIST GOVERN function |

### 8.2 Framework Compliance Evidence

For each framework, the following evidence artifacts demonstrate compliance:

| Framework | Required Evidence | AOS Source |
|-----------|------------------|-----------|
| **OWASP LLM Top 10** | Tool manifest with risk tiers; prohibited category list; budget configuration; approval records; journal export | POL-001 policy document; API-001 Journal export |
| **NIST AI 600-1** | Risk management documentation; blast radius assessments; governance proof chain; telemetry metrics | POL-001 blast radius docs; CRYPTO-001 proofs; API-001 Telemetry |
| **MITRE ATLAS** | Threat model mapping; scope constraints; incident response via kill switch; forensic journal | CORE-001 threat model; CORE-002 kill records; CRYPTO-001 journal |

---

## 9. Conformance Testing

### 9.1 Core Conformance Tests

| Test ID | Input | Expected Output |
|---------|-------|----------------|
| SEC-T001 | Tool call matching prohibited category `weapons_of_mass_destruction` | DENY (validates OWASP LLM01, NIST GAI-1) |
| SEC-T002 | Tool call with path traversal attempt | DENY with SCOPE_VIOLATION (validates OWASP LLM02, ATLAS AML.T0043) |
| SEC-T003 | Tool call exceeding budget | DENY with BUDGET_EXCEEDED (validates OWASP LLM04) |
| SEC-T004 | Tool call for undeclared tool | DENY with TOOL_NOT_IN_POLICY (validates OWASP LLM05, LLM07) |
| SEC-T005 | T4 tool call without approval | ESCALATE with APPROVAL_REQUIRED (validates OWASP LLM08, NIST GAI-5) |
| SEC-T006 | Journal chain verification after 100 entries | chainValid: true (validates NIST GAI-6) |
| SEC-T007 | Decision API request without authentication | 401 (validates NIST GAI-7, ATLAS AML.T0040) |
| SEC-T008 | Kill switch activation and agent termination | Agent terminated; journal records kill (validates OWASP LLM08) |
| SEC-T009 | Data access to denied column | DENY with SCOPE_VIOLATION (validates OWASP LLM06, NIST GAI-3) |
| SEC-T010 | Policy load with mismatched hash | Rejected (validates NIST GAI-6) |

---

## 10. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| **AOS-CORE-001** | Provides the majority of security controls mapped in this document. CORE-001's 11-step pipeline is the primary enforcement mechanism. |
| **AOS-CORE-002** | Kill switch provides the emergency response mechanism mapped to OWASP LLM04/LLM08 and NIST GAI-5. |
| **AOS-CORE-003** | Multi-agent controls provide emergent behavior detection and delegation governance mapped to ATLAS AML.T0047. |
| **AOS-CRYPTO-001** | Cryptographic controls provide information integrity mapped to NIST GAI-6. |
| **AOS-POL-001** | Policy authoring controls provide the governance framework mapped to NIST GOVERN function. |
| **AOS-LANG-001** | Formal language provides the validation layer that prevents policy misconfiguration (RR-004). |
| **AOS-API-001** | API security controls provide authentication and rate limiting mapped to NIST GAI-7. |
| **AOS-HARD-001** | Hardware enforcement provides the isolation layer for model theft prevention (OWASP LLM10). |

---

## Appendix A: AI Disclosure

This standard was drafted with the assistance of AI tools under human editorial control. The crosswalk mappings, coverage assessments, and residual risk analysis were developed by the author through systematic comparison of AOS requirements against each framework's published vulnerability and risk catalogs. AI tools assisted with structural formatting and cross-referencing. All mappings and coverage assessments reflect the author's judgment.

---

## Appendix B: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-05 | Initial publication. OWASP LLM Top 10 (2025), NIST AI 600-1, MITRE ATLAS v4.0. |
