# AOS-REG-001 v1.0 -- EU AI Act Compliance Profile

**Standard:** AOS-REG-001  
**Title:** EU AI Act Compliance Profile: Article-by-Article Mapping and Evidence Package  
**Version:** 1.0  
**Status:** Draft  
**Date:** 2026-06-05  
**Author:** Eugene Christopher Salvatore  
**License:** CC-BY-4.0  
**Companion to:** AOS-CORE-001, AOS-CORE-002, AOS-POL-001, AOS-CRYPTO-001, AOS-SEC-001

---

## Abstract

The EU AI Act (Regulation (EU) 2024/1689) entered into force on August 1, 2024 and applies incrementally through 2027. It is the world's first comprehensive AI regulation and the de facto compliance baseline for any AI governance framework seeking institutional adoption. Organizations deploying AI agents in the EU, or serving EU data subjects, must demonstrate compliance with the Act's requirements.

This standard provides the complete compliance profile: an article-by-article mapping of EU AI Act obligations to specific AOS controls, the evidence package required for each obligation, gap identification, and implementation guidance. It is designed to be handed directly to a compliance officer, auditor, or notified body as the technical documentation demonstrating how an AOS-governed deployment satisfies the Act's requirements.

> **Scope clarification:** This standard maps AOS governance controls to the EU AI Act. It does NOT certify compliance — compliance is a determination made by the deployer, with assistance from notified bodies or legal counsel, based on the specific AI system, its intended use, and the risk classification. AOS provides the technical controls; the deployer provides the deployment context.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Normative References](#2-normative-references)
3. [EU AI Act Overview](#3-eu-ai-act-overview)
4. [Risk Classification Mapping](#4-risk-classification-mapping)
5. [Chapter 2: High-Risk AI Requirements](#5-chapter-2-high-risk-ai-requirements)
6. [Chapter 3: Transparency Obligations](#6-chapter-3-transparency-obligations)
7. [General-Purpose AI Model Obligations](#7-general-purpose-ai-model-obligations)
8. [Evidence Package](#8-evidence-package)
9. [Deployment Checklist](#9-deployment-checklist)
10. [Gap Analysis](#10-gap-analysis)
11. [Conformance Testing](#11-conformance-testing)
12. [Relationship to Other Standards](#12-relationship-to-other-standards)

---

## 1. Scope

### 1.1 What This Standard Covers

- Article-by-article mapping for all EU AI Act obligations relevant to AI agent governance
- Evidence artifacts required for each obligation
- Gap identification where AOS provides partial coverage
- Deployment checklists for EU AI Act compliance
- Guidance on risk classification of AOS-governed AI systems
- Relationship between AOS conformance tiers and EU AI Act requirements

### 1.2 What This Standard Does Not Cover

- Legal advice or legal sufficiency determinations
- Fundamental rights impact assessments (FRIA) — content-specific, not governance-specific
- Post-market monitoring systems — organizational, not architectural
- Conformity assessment procedures — performed by notified bodies
- AI Liability Directive (Directive (EU) 2024/2853) — separate regulation

### 1.3 Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### 1.4 Disclaimer

This standard is provided for technical guidance and does not constitute legal advice. Organizations MUST consult qualified legal counsel for compliance determinations. The AOS Foundation makes no representation that use of AOS standards alone satisfies EU AI Act obligations. Compliance depends on the specific AI system, deployment context, risk classification, and organizational measures.

---

## 2. Normative References

- **Regulation (EU) 2024/1689** — Artificial Intelligence Act (EU AI Act)
- **AOS-CORE-001 v1.0** — Deterministic Policy Gate
- **AOS-CORE-002 v1.0** — Emergency Kill Switch Protocol
- **AOS-CORE-003 v1.0** — Multi-Agent Trust Federation
- **AOS-CRYPTO-001 v1.0** — Cryptographic Standards
- **AOS-POL-001 v1.0** — Policy Authoring Guide
- **AOS-LANG-001 v1.0** — AOS Policy Language
- **AOS-API-001 v1.0** — Interface Specification
- **AOS-SEC-001 v1.0** — Security Profile

---

## 3. EU AI Act Overview

### 3.1 Act Structure

The EU AI Act classifies AI systems by risk level and applies proportional obligations:

| Risk Level | Examples | Key Obligations |
|-----------|---------|----------------|
| **Unacceptable** | Social scoring, real-time biometric surveillance (with exceptions) | Prohibited (Art. 5) |
| **High-Risk** | AI in critical infrastructure, employment, law enforcement, migration, justice | Full compliance requirements (Art. 6-15) |
| **Limited Risk** | Chatbots, emotion recognition, deepfakes | Transparency obligations (Art. 50) |
| **Minimal Risk** | Spam filters, AI in games | No obligations (voluntary codes) |

### 3.2 Relevance to AI Agents

AI agents governed by AOS typically fall into one of two categories:

1. **High-Risk AI Systems** — When the agent operates in a listed domain (Annex III): credit scoring, employment decisions, critical infrastructure control, law enforcement support, or similar high-stakes applications.

2. **General-Purpose AI Systems** — When the agent uses a general-purpose AI model (e.g., GPT, Claude, Gemini) regardless of application domain. Chapter V obligations apply to the model provider, but downstream deployers have their own obligations.

**R-REG-001:** Organizations deploying AOS-governed agents MUST determine the risk classification of their AI system before selecting the applicable compliance profile. AOS provides the technical controls for all risk levels; the deployer determines which controls are legally required.

### 3.3 Timeline

| Date | Milestone |
|------|-----------|
| August 1, 2024 | Regulation enters into force |
| February 2, 2025 | Prohibited practices and AI literacy apply |
| August 2, 2025 | GPAI model obligations apply; governance rules for notified bodies apply |
| August 2, 2026 | **High-risk obligations apply** (Annex III systems) |
| August 2, 2027 | All remaining obligations apply (Annex I systems) |

---

## 4. Risk Classification Mapping

### 4.1 AOS Tiers vs. EU AI Act Risk Levels

| AOS Tier | Recommended EU AI Act Use |
|----------|--------------------------|
| **Foundation** | Limited Risk and Minimal Risk systems. Also suitable for non-high-risk GPAI deployments. |
| **Enterprise** | **High-Risk** systems (Annex III). Provides the technical documentation, logging, and human oversight required by Articles 9-15. |
| **Sovereign** | High-Risk systems in regulated sectors (financial, healthcare, government) where maximum assurance is required. Formal verification and hardware enforcement exceed Act requirements. |

### 4.2 Classification Decision Guide

```
Step 1: Is the AI system listed in Article 5 (prohibited)?
  YES → STOP. System cannot be deployed.
  NO  → Step 2

Step 2: Is the AI system used in an Annex III area?
  YES → HIGH-RISK. Apply full Article 6-15 profile (Section 5).
  NO  → Step 3

Step 3: Does the AI system interact directly with natural persons?
  YES → LIMITED RISK. Apply transparency obligations (Section 6).
  NO  → MINIMAL RISK. No specific obligations, but AOS controls are RECOMMENDED.
```

---

## 5. Chapter 2: High-Risk AI Requirements (Articles 6-15)

This section maps each high-risk AI system requirement to specific AOS controls.

### Article 6 — Classification Rules

| Requirement | AOS Control | Evidence Artifact | Coverage |
|------------|-------------|-------------------|----------|
| Determine if system is high-risk based on Annex III criteria | R-REG-001: deployer determines classification | Classification decision record | **DEPLOYER RESPONSIBILITY.** AOS provides governance regardless of classification. |
| Significant risk assessment | POL-001 §7 blast radius assessment | Blast radius documentation per tool | **STRONG.** Blast radius exceeds "significant risk" analysis in rigor. |

### Article 8 — Compliance with Requirements

| Requirement | AOS Control | Evidence | Coverage |
|------------|-------------|----------|----------|
| Comply with Articles 9-15 for high-risk systems | AOS Enterprise tier provides technical controls for all articles | Full AOS deployment documentation | **STRONG.** See individual article mappings below. |
| Apply quality management system | POL-001 R-POL-A-001 policy lifecycle (DRAFT→ACTIVE→ARCHIVED) | Policy version history | **STRONG.** |
| Maintain technical documentation | All AOS standards provide normative requirements; policy documents are self-documenting | AOS standard library + deployed policy documents | **STRONG.** |

### Article 9 — Risk Management System

| Requirement | AOS Control | Evidence | Coverage |
|------------|-------------|----------|----------|
| **Art. 9(1):** Establish and maintain risk management system | POL-001 §5.1 risk tiering (T1-T4) with decision guide; POL-001 §7 blast radius methodology | Policy document with tier assignments + blast radius docs | **EXCEEDS.** AOS risk tiering is more granular than EU AI Act's binary approach. |
| **Art. 9(2)(a):** Identify known and foreseeable risks | CORE-001 §9 threat model; SEC-001 full crosswalk; CORE-002 §11 threat model; CORE-003 §11 threat model | Threat models across all standards | **EXCEEDS.** 80-pass hostile audit with 25 personas. |
| **Art. 9(2)(b):** Estimate and evaluate risks | POL-001 §7.1 blast radius assessment (scope + sensitivity + irreversibility) | Per-tool blast radius documentation | **EXCEEDS.** Three-dimensional assessment vs. binary risk estimation. |
| **Art. 9(2)(c):** Evaluate risks from reasonably foreseeable misuse | CORE-001 axiom: model is assumed adversarial; POL-001 §8 anti-patterns; SEC-001 §3 OWASP LLM Top 10 mapping | Anti-pattern documentation + security crosswalk | **STRONG.** |
| **Art. 9(2)(d):** Adopt risk management measures | CORE-001 DPG enforcement; POL-001 scope/budget/approval controls | Deployed policy + gate configuration | **EXCEEDS.** Deterministic enforcement vs. procedural measures. |
| **Art. 9(4):** Residual risk communication | SEC-001 §7 residual risk register | 7-entry residual risk register with mitigations | **STRONG.** |
| **Art. 9(5):** Testing for risk identification | POL-001 §9 policy testing; CORE-001 §10 conformance tests; AUDIT-001 80-pass hostile audit | Test results + audit record | **EXCEEDS.** 130+ conformance tests across the standard library. |

### Article 10 — Data and Data Governance

| Requirement | AOS Control | Evidence | Coverage |
|------------|-------------|----------|----------|
| **Art. 10(1):** Training, validation and testing data quality | N/A — AOS governs agent actions, not model training | N/A | **NOT APPLICABLE.** Model training governance is the GPAI provider's obligation. |
| **Art. 10(2):** Data governance practices | POL-001 R-POL-A-007/008 scope constraints on data access; LANG-001 database scope constraints (allowedTables, deniedColumns) | Policy scope constraint documentation | **PARTIAL.** AOS constrains data access, not data quality. Data governance for training is outside scope. |

### Article 11 — Technical Documentation

| Requirement | AOS Control | Evidence | Coverage |
|------------|-------------|----------|----------|
| **Art. 11(1):** Draw up technical documentation | AOS standard library (10 specifications); deployed policy documents (APL format); AUDIT-001 hostile audit record | Complete AOS deployment package | **EXCEEDS.** ~714 KB of normative specifications, 130+ tests, 80-pass audit. |
| **Art. 11(1):** Documentation demonstrating compliance | This standard (REG-001) provides the compliance mapping | REG-001 mapping tables | **STRONG.** |
| **Art. 11(1):** Keep documentation up-to-date | POL-001 R-POL-A-001 policy lifecycle; LANG-001 R-LANG-012 schema versioning | Policy version history + modification timestamps | **STRONG.** |

### Article 12 — Record-Keeping (Automatic Logging)

| Requirement | AOS Control | Evidence | Coverage |
|------------|-------------|----------|----------|
| **Art. 12(1):** Automatic logging of events | CORE-001 R-JRN-001 through R-JRN-004 mandatory journal; CRYPTO-001 hash chain + Merkle tree | Journal entries via API-001 Journal API | **EXCEEDS.** AOS journal is cryptographically chained and tamper-evident — far beyond "automatically generated logs." |
| **Art. 12(2):** Traceability of AI system functioning | CRYPTO-001 Governance Proofs with full decision context; API-001 Attestation API | Governance Proof chain | **EXCEEDS.** Every decision is cryptographically signed with full context. |
| **Art. 12(3):** Logging for the duration of the system lifecycle | API-001 §6.3 journal export (JSON, CSV, SPDX); journal chain verification | Exported journal archives | **STRONG.** |
| **Art. 12(4):** Logs facilitate post-market monitoring | API-001 §10 Telemetry API; API-001 §6 Journal query with filtering | Telemetry dashboard + journal queries | **STRONG.** |

### Article 13 — Transparency and Provision of Information

| Requirement | AOS Control | Evidence | Coverage |
|------------|-------------|----------|----------|
| **Art. 13(1):** Design for sufficient transparency | LANG-001 R-LANG-015 evaluation result with per-check breakdown; LANG-001 R-LANG-016 normative deny-reason codes; API-001 Decision API response with full detail | Decision API responses | **STRONG.** Every DENY includes a specific reason code and human-readable explanation. |
| **Art. 13(2):** Instructions for use | POL-001 complete authoring guide; deployment checklists (SEC-001 §8.1, this standard §9) | AOS standard library | **STRONG.** |
| **Art. 13(3)(a):** Provider identity | Policy metadata (APL `author` field); AOS standard metadata | Policy document + standard headers | **STRONG.** |
| **Art. 13(3)(b):** Characteristics, capabilities, limitations | CORE-001 §12 limitations; CORE-002 §11 limitations; CORE-003 §11 limitations; SEC-001 §7 residual risk | Limitations documentation across all standards | **EXCEEDS.** Each standard explicitly documents what it cannot do. |
| **Art. 13(3)(d):** Human oversight measures | See Article 14 mapping below | See Art. 14 | **EXCEEDS.** |
| **Art. 13(3)(e):** Expected lifetime, maintenance | POL-001 R-POL-A-001 policy lifecycle; LANG-001 R-LANG-012 schema versioning | Policy lifecycle documentation | **STRONG.** |

### Article 14 — Human Oversight

| Requirement | AOS Control | Evidence | Coverage |
|------------|-------------|----------|----------|
| **Art. 14(1):** Design for effective human oversight | CORE-001 R-APR-001 through R-APR-007 approval system; CORE-002 entire standard (kill switch); POL-001 R-POL-A-012 approval escalation | Approval records + kill switch logs | **EXCEEDS.** AOS provides three levels of human oversight: (1) approval gates for individual actions, (2) policy lifecycle with mandatory REVIEW stage, (3) emergency kill switch with < 1s response time. |
| **Art. 14(2):** Proportionate to risks | POL-001 R-POL-A-012 approval matrix (risk tier × mission sensitivity); POL-001 §5.1 risk tiering | Approval configuration in policy | **EXCEEDS.** Four-tier risk system with configurable approval per tier. |
| **Art. 14(3)(a):** Understand capabilities and limitations | CORE-001 §12 limitations; POL-001 §7 blast radius; SEC-001 residual risk register | Documentation package | **STRONG.** |
| **Art. 14(3)(b):** Aware of automation bias | POL-001 Anti-pattern 8.4 (approval fatigue); POL-001 Anti-pattern 8.10 (trust the model) | Anti-pattern documentation | **STRONG.** Explicitly warns against overreliance on model behavior. |
| **Art. 14(3)(c):** Correctly interpret output | LANG-001 R-LANG-015/016 structured evaluation results; API-001 Decision API response | Structured decision output | **STRONG.** Machine-readable AND human-readable decision explanations. |
| **Art. 14(3)(d):** Decide not to use or disregard | CORE-002 kill switch; POL-001 R-POL-A-001 DEPRECATED status; API-001 Policy Load API for policy changes | Kill switch + policy management | **EXCEEDS.** Operator can terminate agent in < 1s, revoke policy, or modify governance at any time. |
| **Art. 14(4):** Interrupt or override | CORE-002 §4 kill taxonomy (GRACEFUL, IMMEDIATE, EMERGENCY); CORE-002 §5 signal propagation; CORE-003 §7 delegation-aware kill | Kill switch activation records | **EXCEEDS.** Three interrupt levels with < 1s for EMERGENCY. Full propagation through multi-agent delegation chains. |
| **Art. 14(5):** Real-time monitoring | API-001 §10 Telemetry API (JSON + Prometheus); API-001 §10.3 health check; CORE-003 §9 emergent behavior monitoring | Telemetry dashboard | **STRONG.** Real-time budget utilization, decision rates, approval status, journal integrity. |

### Article 15 — Accuracy, Robustness, and Cybersecurity

| Requirement | AOS Control | Evidence | Coverage |
|------------|-------------|----------|----------|
| **Art. 15(1):** Appropriate level of accuracy, robustness, cybersecurity | CORE-001 11-step pipeline; CORE-001 §9 threat model; SEC-001 OWASP/NIST/ATLAS crosswalk | Threat models + security crosswalk | **STRONG.** |
| **Art. 15(2):** Accuracy levels declared in instructions | CORE-001 §12.3 limitations (probabilistic category classification acknowledged); POL-001 R-POL-A-017 classifier confidence threshold | Limitations documentation + classifier configuration | **STRONG.** Explicitly declares the one probabilistic component and its configuration. |
| **Art. 15(3):** Resilience to errors, faults, inconsistencies | CORE-001 R-ARCH-004 (fail-closed); CORE-001 R-ARCH-008 (restart integrity); CORE-002 (kill switch for failure cases) | Gate architecture documentation | **EXCEEDS.** Fail-closed by default. Every error → DENY. |
| **Art. 15(4):** Cybersecurity resilience | SEC-001 complete security crosswalk; CORE-001 threat model; HARD-001 hardware enforcement; CRYPTO-001 cryptographic controls | SEC-001 + threat models | **EXCEEDS.** 100% addressable across OWASP, NIST, and MITRE ATLAS. |
| **Art. 15(5):** Protection against unauthorized third-party manipulation | CORE-001 R-ARCH-003 (no bypass); CRYPTO-001 (policy integrity, journal integrity, attestation signatures); API-001 R-API-010/011 (authentication) | Cryptographic controls documentation | **EXCEEDS.** Cryptographic enforcement makes manipulation mathematically detectable. |

### Article 17 — Quality Management System

| Requirement | AOS Control | Evidence | Coverage |
|------------|-------------|----------|----------|
| **Art. 17(1):** Establish quality management system | POL-001 R-POL-A-001 policy lifecycle; POL-001 R-POL-A-002 mandatory REVIEW/TESTED stages; POL-001 §9 policy testing; POL-001 §11 policy change management | Policy lifecycle documentation | **STRONG.** |
| **Art. 17(1)(a):** Strategy for regulatory compliance | This standard (REG-001) | REG-001 compliance profile | **STRONG.** |
| **Art. 17(1)(c):** Procedures for design, control, verification | POL-001 complete authoring methodology; LANG-001 validation rules; API-001 Policy Validate endpoint | Authoring guide + validation results | **STRONG.** |
| **Art. 17(1)(e):** Examination and testing procedures | AUDIT-001 80-pass hostile audit program; conformance tests across all standards | Audit record + test results | **EXCEEDS.** 25 adversarial personas, 130+ conformance tests, 55 findings resolved. |
| **Art. 17(1)(f):** Technical specifications and standards | AOS standard library (10 specifications) | Standard documents | **EXCEEDS.** |
| **Art. 17(1)(g):** Data management procedures | POL-001 R-POL-A-007/008 scope constraints; LANG-001 database scope constraints | Scope constraint documentation | **STRONG.** |
| **Art. 17(1)(h):** Risk management system | See Article 9 mapping | See Art. 9 | **EXCEEDS.** |
| **Art. 17(1)(j):** Incident handling procedures | CORE-002 kill switch protocol; CORE-003 §9 containment responses | Kill switch + containment documentation | **STRONG.** |

---

## 6. Chapter 3: Transparency Obligations (Article 50)

### Article 50 — Transparency for Certain AI Systems

| Requirement | AOS Control | Evidence | Coverage |
|------------|-------------|----------|----------|
| **Art. 50(1):** Inform natural persons of AI interaction | N/A — deployer responsibility (UI/UX) | Deployer documentation | **DEPLOYER RESPONSIBILITY.** AOS governs the agent; the deployer informs the user. |
| **Art. 50(2):** Mark AI-generated content | N/A — content-level, not governance-level | N/A | **OUT OF SCOPE.** AOS does not generate content; it governs tool execution. |
| **Art. 50(4):** Deepfake disclosure | N/A — content-level | N/A | **OUT OF SCOPE.** |

> **Note:** Article 50 obligations primarily concern the user interface and content labeling, which are the deployer's responsibility. AOS provides the governance and audit infrastructure but does not control the user-facing experience.

---

## 7. General-Purpose AI Model Obligations (Chapter V)

### 7.1 Applicability

Chapter V obligations apply to providers of general-purpose AI models (e.g., OpenAI, Anthropic, Google). AOS is not a GPAI model provider — it is a governance layer deployed by downstream users of GPAI models. However, AOS assists downstream deployers in meeting their obligations when using GPAI models.

### Article 53 — Obligations for GPAI Model Providers

| Requirement | AOS Relevance | Notes |
|------------|--------------|-------|
| **Art. 53(1)(a):** Technical documentation | AOS deployment documentation supplements GPAI provider documentation | Deployer's AOS configuration documents how the GPAI model is governed |
| **Art. 53(1)(b):** Information for downstream providers | API-001 Telemetry API; API-001 Decision API responses | AOS provides structured data about governance decisions to downstream systems |
| **Art. 53(1)(c):** Copyright compliance | POL-001 prohibited categories (can include `ip_infringement`) | Deployer configures content restrictions |
| **Art. 53(1)(d):** Training data summary | N/A — GPAI provider obligation | AOS does not access or manage training data |

### Article 55 — Systemic Risk GPAI Models

| Requirement | AOS Relevance | Notes |
|------------|--------------|-------|
| **Art. 55(1)(a):** Model evaluation | N/A — GPAI provider obligation | AOS evaluates tool calls, not models |
| **Art. 55(1)(b):** Assess and mitigate systemic risks | CORE-003 §9 emergent behavior detection; CORE-002 kill switch | AOS mitigates systemic risk at the execution level |
| **Art. 55(1)(c):** Report serious incidents | API-001 Journal API; CRYPTO-001 Governance Proofs; CORE-002 kill records | AOS provides the evidence trail for incident reporting |
| **Art. 55(1)(d):** Cybersecurity protection | SEC-001 complete security crosswalk | AOS provides cybersecurity controls for the governance layer |

---

## 8. Evidence Package

### 8.1 Core Evidence Artifacts

**R-REG-002:** Organizations deploying AOS-governed systems in the EU SHOULD maintain the following evidence package for compliance demonstration:

| Evidence Artifact | Source | EU AI Act Article | Format |
|------------------|--------|-------------------|--------|
| **Risk classification decision** | Deployer | Art. 6 | Written record |
| **Deployed policy document** | APL format (LANG-001) | Art. 9, 11, 17 | JSON/YAML |
| **Policy version history** | VCS (Git) | Art. 11, 17 | Git log |
| **Blast radius assessments** | Policy blastRadius blocks | Art. 9 | JSON (in policy) |
| **Threat model** | CORE-001 §9, CORE-002 §11, CORE-003 §11 | Art. 9, 15 | Markdown |
| **Security crosswalk** | SEC-001 | Art. 15 | Markdown |
| **Hostile audit record** | AUDIT-001 | Art. 9, 17 | Markdown |
| **Journal export** | API-001 Journal export endpoint | Art. 12 | JSON/CSV |
| **Governance Proof samples** | API-001 Attestation API | Art. 12, 13 | JSON |
| **Kill switch test records** | CORE-002 test logs | Art. 14 | Log files |
| **Telemetry snapshots** | API-001 Telemetry API | Art. 14 | JSON |
| **Approval records** | API-001 Approval API | Art. 14 | JSON |
| **Conformance test results** | TCK runner output | Art. 9, 15 | JSON/XML |
| **This compliance mapping** | REG-001 | Art. 11, 17 | Markdown |

### 8.2 High-Risk Evidence Package (Annex III Systems)

In addition to core evidence, high-risk deployments SHOULD include:

| Evidence Artifact | Source | EU AI Act Article |
|------------------|--------|-------------------|
| **Fundamental Rights Impact Assessment** | Deployer (legal counsel) | Art. 27 |
| **Conformity assessment documentation** | Notified body | Art. 43 |
| **EU Declaration of Conformity** | Deployer | Art. 47 |
| **Registration in EU database** | Deployer | Art. 49 |
| **Post-market monitoring plan** | Deployer | Art. 72 |
| **Serious incident reports** | Deployer (with AOS evidence) | Art. 73 |

---

## 9. Deployment Checklist

### 9.1 Pre-Deployment (All Risk Levels)

| # | Item | Responsible | AOS Requirement |
|---|------|-------------|----------------|
| 1 | Determine EU AI Act risk classification | Deployer | R-REG-001 |
| 2 | Deploy DPG at Enterprise tier (for high-risk) or Foundation tier | Deployer | CORE-001 |
| 3 | Author mission-specific policy with blast radius docs | Policy author | POL-001 |
| 4 | Validate policy against APL schema | Automated | LANG-001, API-001 |
| 5 | Pass policy through REVIEW and TESTED stages | Policy team | POL-001 R-POL-A-002 |
| 6 | Verify kill switch functionality | Operator | CORE-002 |
| 7 | Configure approval escalation for T3/T4 tools | Policy author | POL-001 R-POL-A-012 |
| 8 | Enable audit journal with cryptographic chaining | Gate admin | CRYPTO-001 |
| 9 | Enable telemetry endpoints | Gate admin | API-001 §10 |
| 10 | Document the AI system's intended purpose | Deployer | Art. 13 |

### 9.2 Pre-Deployment (High-Risk Only)

| # | Item | Responsible | EU AI Act Article |
|---|------|-------------|-------------------|
| 11 | Complete Fundamental Rights Impact Assessment | Legal counsel | Art. 27 |
| 12 | Prepare technical documentation package (§8.1 + §8.2) | Compliance team | Art. 11 |
| 13 | Engage notified body for conformity assessment (if required) | Legal counsel | Art. 43 |
| 14 | Register system in EU database | Deployer | Art. 49 |
| 15 | Establish post-market monitoring plan | Deployer | Art. 72 |
| 16 | Establish serious incident reporting procedure | Deployer | Art. 73 |

### 9.3 Operational (Ongoing)

| # | Item | Frequency | AOS Requirement |
|---|------|-----------|----------------|
| 17 | Review and update policy | Quarterly minimum | POL-001 Anti-pattern 8.6 |
| 18 | Verify journal chain integrity | Weekly | API-001 Journal verify |
| 19 | Review approval records | Monthly | API-001 Approval API |
| 20 | Test kill switch | Quarterly | CORE-002 |
| 21 | Review telemetry for anomalies | Continuous | API-001 Telemetry API |
| 22 | Archive journal exports | Per retention policy | Art. 12 |
| 23 | Report serious incidents within 72 hours | As needed | Art. 73 |

---

## 10. Gap Analysis

### 10.1 Areas Where AOS Fully Satisfies Requirements

| EU AI Act Article | AOS Coverage | Assessment |
|------------------|-------------|------------|
| Art. 9 (Risk management) | **EXCEEDS** | Four-tier risk system + blast radius + 80-pass hostile audit |
| Art. 11 (Technical documentation) | **EXCEEDS** | ~714 KB of normative specifications |
| Art. 12 (Record-keeping) | **EXCEEDS** | Cryptographically chained journal with Merkle tree verification |
| Art. 13 (Transparency) | **STRONG** | Structured decision output with reason codes |
| Art. 14 (Human oversight) | **EXCEEDS** | Three layers: approval gates + policy review + kill switch |
| Art. 15 (Accuracy/robustness/security) | **EXCEEDS** | Fail-closed design + 100% framework coverage (SEC-001) |
| Art. 17 (Quality management) | **STRONG** | Policy lifecycle + conformance tests + hostile audit |

### 10.2 Areas Where AOS Provides Partial Coverage

| EU AI Act Article | Gap | Mitigation |
|------------------|-----|------------|
| Art. 10 (Data governance) | AOS governs data access, not data quality or training data | Deployer must implement data quality controls separately. AOS scope constraints provide access governance. |
| Art. 50 (Transparency) | AOS does not control user-facing disclosure | Deployer must implement AI interaction disclosure in the UI. |
| Art. 27 (FRIA) | AOS does not perform fundamental rights assessments | Deployer must engage legal counsel for FRIA. AOS provides the audit trail to support the assessment. |

### 10.3 Areas Outside AOS Scope

| EU AI Act Requirement | Why Outside Scope | Who Is Responsible |
|----------------------|-------------------|-------------------|
| Training data quality (Art. 10) | AOS governs actions, not model training | GPAI model provider |
| Conformity assessment (Art. 43) | Organizational/legal procedure | Notified body + deployer |
| EU database registration (Art. 49) | Administrative requirement | Deployer |
| Content marking/deepfakes (Art. 50) | Content-level, not governance-level | Deployer |
| Post-market monitoring (Art. 72) | Organizational procedure | Deployer |
| Serious incident reporting (Art. 73) | Organizational procedure (AOS provides evidence) | Deployer |

---

## 11. Conformance Testing

### 11.1 EU AI Act Specific Tests

| Test ID | EU AI Act Article | AOS Requirement | Expected Result |
|---------|------------------|----------------|----------------|
| REG-T001 | Art. 9 | POL-001 R-POL-A-005 | All tools have risk tier assignments |
| REG-T002 | Art. 9 | POL-001 R-POL-A-018 | All Enterprise/Sovereign tools have blast radius docs |
| REG-T003 | Art. 12 | CORE-001 R-JRN-001 | Every ALLOW decision produces a journal entry |
| REG-T004 | Art. 12 | CORE-001 R-JRN-002 | Journal entries are append-only (no UPDATE/DELETE) |
| REG-T005 | Art. 12 | CRYPTO-001 hash chain | Journal chain verification passes |
| REG-T006 | Art. 12 | API-001 Journal export | Export produces valid JSON/CSV with all required fields |
| REG-T007 | Art. 13 | LANG-001 R-LANG-015 | Every DENY includes reason code and human-readable detail |
| REG-T008 | Art. 14 | POL-001 R-POL-A-012 | T3/T4 tools require human approval in standard/sensitive missions |
| REG-T009 | Art. 14 | CORE-002 | Kill switch terminates agent within specified timeframe |
| REG-T010 | Art. 14 | API-001 Telemetry | Telemetry endpoint returns real-time metrics |
| REG-T011 | Art. 15 | CORE-001 R-ARCH-004 | Gate failure produces DENY (fail-closed) |
| REG-T012 | Art. 15 | API-001 R-API-010 | Unauthenticated requests are rejected |
| REG-T013 | Art. 17 | POL-001 R-POL-A-002 | Policy cannot transition DRAFT→ACTIVE (skipping REVIEW/TESTED) |
| REG-T014 | Art. 14 | CORE-003 §7 | Kill propagates through delegation chain |
| REG-T015 | Art. 12 | API-001 Attestation | Governance Proof is cryptographically verifiable |

---

## 12. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| **AOS-CORE-001** | Primary enforcement mechanism for Art. 9, 12, 14, 15. |
| **AOS-CORE-002** | Kill switch provides Art. 14 human override capability. |
| **AOS-CORE-003** | Multi-agent governance ensures Art. 14 propagation in federated systems. |
| **AOS-CRYPTO-001** | Cryptographic controls exceed Art. 12 logging and Art. 15 integrity requirements. |
| **AOS-POL-001** | Policy lifecycle satisfies Art. 17 quality management; risk tiering satisfies Art. 9. |
| **AOS-LANG-001** | Formal language ensures Art. 13 transparency through structured decision output. |
| **AOS-API-001** | APIs provide Art. 12 log access, Art. 14 monitoring, and evidence export. |
| **AOS-SEC-001** | Security crosswalk provides Art. 15 cybersecurity evidence. |

---

## Appendix A: Compliance Evidence Matrix (Summary)

| EU AI Act Article | AOS Standard(s) | Coverage | Tier Required |
|------------------|-----------------|----------|---------------|
| Art. 6 (Classification) | REG-001 | Deployer responsibility | — |
| Art. 8 (General compliance) | All | Strong | Enterprise+ |
| Art. 9 (Risk management) | POL-001, SEC-001, AUDIT-001 | **EXCEEDS** | Enterprise+ |
| Art. 10 (Data governance) | POL-001 (access only) | Partial | Enterprise+ |
| Art. 11 (Technical documentation) | All standards | **EXCEEDS** | Enterprise+ |
| Art. 12 (Record-keeping) | CORE-001, CRYPTO-001, API-001 | **EXCEEDS** | Enterprise+ |
| Art. 13 (Transparency) | LANG-001, API-001 | Strong | Enterprise+ |
| Art. 14 (Human oversight) | CORE-001, CORE-002, CORE-003, POL-001 | **EXCEEDS** | Enterprise+ |
| Art. 15 (Accuracy/robustness/security) | CORE-001, SEC-001, HARD-001 | **EXCEEDS** | Enterprise+ |
| Art. 17 (Quality management) | POL-001, LANG-001, AUDIT-001 | Strong | Enterprise+ |
| Art. 50 (Transparency for limited risk) | Deployer responsibility | Out of scope | — |

---

## Appendix B: AI Disclosure

This standard was drafted with the assistance of AI tools under human editorial control. The article-by-article mappings, coverage assessments, and evidence package definitions were developed by the author through systematic comparison of AOS requirements against the EU AI Act text (Regulation (EU) 2024/1689). AI tools assisted with structural formatting, cross-referencing, and gap identification. All compliance assessments and coverage determinations reflect the author's judgment and do not constitute legal advice.

---

## Appendix C: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-05 | Initial publication. Regulation (EU) 2024/1689 mapping. |
