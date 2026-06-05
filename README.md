# AOS Governance Standard

**The open, royalty-free specification for deterministic AI agent governance.**

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Patent: RF Covenant](https://img.shields.io/badge/Patent-Royalty_Free-green.svg)](RF-PATENT-COVENANT.md)
[![Standards: 12](https://img.shields.io/badge/Standards-12-blue.svg)](#specification-library)

---

## What Is AOS?

AOS is a governance architecture for AI agents. It ensures that every action an AI agent takes — every file write, API call, database query, and email sent — passes through a **Deterministic Policy Gate (DPG)** that enforces scope constraints, budget limits, risk-appropriate approval, and cryptographic audit trails.

The key insight: **safety must not depend on the model's behavior.** AOS treats the AI model as a potentially compromised component and enforces governance at the execution boundary, not the training layer.

---

## Specification Library

| Standard | Title | Size | Status |
|----------|-------|------|--------|
| [AOS-CORE-001](AOS-CORE-001_v1.0.md) | Deterministic Policy Gate | 145.6 KB | Published v1.0 |
| [AOS-CORE-002](AOS-CORE-002_v1.0.md) | Emergency Kill Switch Protocol | 74.1 KB | Published v1.0 |
| [AOS-CORE-003](AOS-CORE-003_v1.0.md) | Multi-Agent Trust Federation | 40.9 KB | Published v1.0 |
| [AOS-CRYPTO-001](AOS-CRYPTO-001_v1.0.md) | Cryptographic Standards | 79.8 KB | Published v1.0 |
| [AOS-POL-001](AOS-POL-001_v1.0.md) | Policy Authoring Guide | 124.5 KB | Published v1.0 |
| [AOS-LANG-001](AOS-LANG-001_v1.0.md) | AOS Policy Language (APL) | 36.6 KB | Published v1.0 |
| [AOS-API-001](AOS-API-001_v1.0.md) | Interface Specification | 27.1 KB | Published v1.0 |
| [AOS-HARD-001](AOS-HARD-001_v1.0.md) | Hardware Enforcement Boundary | 77.0 KB | Published v1.0 |
| [AOS-SEC-001](AOS-SEC-001_v1.0.md) | Security Profile (OWASP/NIST/ATLAS) | 28.2 KB | Published v1.0 |
| [AOS-REG-001](AOS-REG-001_v1.0.md) | EU AI Act Compliance Profile | 33.0 KB | Published v1.0 |

### Supporting Documents

| Document | Description |
|----------|-------------|
| [RF-PATENT-COVENANT](RF-PATENT-COVENANT.md) | Royalty-Free Patent Covenant (W3C-style) |
| [CONTRIBUTING](CONTRIBUTING.md) | Contribution guidelines with DCO/CLA |
| [GOVERNANCE](GOVERNANCE.md) | Foundation governance charter |
| [OSCAL Catalog](oscal/aos-catalog.json) | Machine-readable compliance mappings |

---

## Quick Start

### For Implementors

1. Start with [AOS-CORE-001](AOS-CORE-001_v1.0.md) — the DPG specification
2. Read [AOS-LANG-001](AOS-LANG-001_v1.0.md) — the policy language your gate consumes
3. Implement the [AOS-API-001](AOS-API-001_v1.0.md) endpoints
4. Run the conformance tests

### For Policy Authors

1. Read [AOS-POL-001](AOS-POL-001_v1.0.md) — the policy authoring guide
2. Use the risk tiering decision guide (Section 5.1.1)
3. Follow the budget calibration methodology (Section 5.3.1)
4. Validate your policy with `POST /v1/policies/validate`

### For Compliance Teams

1. [AOS-SEC-001](AOS-SEC-001_v1.0.md) — OWASP/NIST/ATLAS crosswalk
2. [AOS-REG-001](AOS-REG-001_v1.0.md) — EU AI Act mapping
3. [OSCAL Catalog](oscal/aos-catalog.json) — machine-readable controls

---

## Architecture at a Glance

```
┌─────────────────────────────────────────┐
│                AI Agent                  │
│         (model is untrusted)            │
└──────────────┬──────────────────────────┘
               │ tool call request
               ▼
┌─────────────────────────────────────────┐
│        Deterministic Policy Gate         │
│                                         │
│  1. Policy lookup (LANG-001)            │
│  2. Category classification             │
│  3. Scope validation                    │
│  4. Budget enforcement                  │
│  5. Approval check                      │
│  6. Governance Proof (CRYPTO-001)       │
│                                         │
│  Result: ALLOW │ DENY │ ESCALATE        │
└──────────────┬──────────────────────────┘
               │ if ALLOW
               ▼
┌─────────────────────────────────────────┐
│           Tool Execution                 │
│        (scoped, budgeted, logged)       │
└─────────────────────────────────────────┘
```

---

## Conformance Tiers

| Tier | Target | Key Requirements |
|------|--------|-----------------|
| **Foundation** | All deployments | DPG, policy, journal, approval, category enforcement |
| **Enterprise** | Regulated industries | + opaque denials, DNS pinning, blast radius docs, SIEM integration |
| **Sovereign** | Government, critical infrastructure | + hardware enforcement, formal verification, HSM key storage |

---

## Intellectual Property

### Specifications

All normative specifications are licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). You may implement, deploy, and commercialize products based on these specifications with attribution.

### Patents

The [RF Patent Covenant](RF-PATENT-COVENANT.md) grants royalty-free rights to practice all Essential Claims in any conforming implementation. 145 patent filings across 4 waves are covered by the blanket commitment.

### Code

Reference implementations and tooling are licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) with the standard patent grant.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

All contributions require [DCO sign-off](https://developercertificate.org/). Normative contributions from organizations require an Entity CLA.

---

## Governance

See [GOVERNANCE.md](GOVERNANCE.md) for the Foundation governance charter.

---

## Contact

- **Specifications:** specs@aos-governance.org
- **Security vulnerabilities:** security@aos-governance.org (90-day coordinated disclosure)
- **IP/Patent questions:** ip-committee@aos-governance.org
- **General:** info@aos-governance.org

---

*"AOS," "AOS Foundation," "AOS Governance Standard," and "Deterministic Policy Gate" are trademarks of AOS Foundation.*
