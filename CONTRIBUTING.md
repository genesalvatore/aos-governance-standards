# Contributing to AOS Governance Standards

Thank you for your interest in contributing to the AOS Governance Standard. This document establishes the contribution process, intellectual property requirements, and quality standards for all contributions to the AOS specification library.

---

## Table of Contents

1. [Types of Contributions](#types-of-contributions)
2. [Developer Certificate of Origin (DCO)](#developer-certificate-of-origin-dco)
3. [Entity Contributor License Agreement (CLA)](#entity-contributor-license-agreement-cla)
4. [Contribution Process](#contribution-process)
5. [Quality Standards](#quality-standards)
6. [Normative vs. Informative Content](#normative-vs-informative-content)
7. [Review Process](#review-process)
8. [IP Policy Summary](#ip-policy-summary)

---

## Types of Contributions

| Type | Description | IP Requirement | Review Level |
|------|-------------|---------------|-------------|
| **Editorial** | Typo fixes, formatting, broken links | DCO sign-off | Maintainer review |
| **Clarification** | Rewording for clarity without changing requirements | DCO sign-off | Two maintainer reviews |
| **Informative addition** | Examples, worked scenarios, deployment guides | DCO sign-off | Two maintainer reviews |
| **Normative addition** | New requirements (R-XXX), new conformance tests | DCO sign-off + Entity CLA (if corporate) | Specification Committee review |
| **New standard** | Entirely new specification document | DCO sign-off + Entity CLA (if corporate) | Specification Committee + IP Committee review |
| **Security vulnerability** | Vulnerability in a published standard | Private disclosure to security@aos-governance.org | Security Response Team |

---

## Developer Certificate of Origin (DCO)

All contributions to the AOS standards repository MUST include a DCO sign-off. The DCO certifies that you have the right to submit the contribution under the project's license terms.

### Sign-Off Procedure

Add a `Signed-off-by` line to every commit message:

```
Signed-off-by: Your Name <your.email@example.com>
```

You can automate this with `git commit -s`.

### DCO Text (v1.1)

By making a contribution to this project, I certify that:

> **(a)** The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
>
> **(b)** The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or
>
> **(c)** The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.
>
> **(d)** I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project or the open source license(s) involved.

This is the standard DCO used by the Linux kernel, Git, and hundreds of other open source projects.

---

## Entity Contributor License Agreement (CLA)

### When Required

An Entity CLA is required when:

- You are contributing on behalf of your employer
- Your contribution includes normative requirements (R-XXX identifiers)
- Your contribution proposes a new specification document
- Your employer has patents that may be relevant to the contribution

### What It Covers

The Entity CLA grants the AOS Foundation:

1. **Copyright license:** A perpetual, worldwide, non-exclusive, royalty-free license to reproduce, prepare derivative works, publicly display, and distribute the contribution under CC-BY-4.0.

2. **Patent license:** A perpetual, worldwide, non-exclusive, royalty-free patent license to make, use, sell, and distribute implementations of the contribution, subject to the RF Patent Covenant.

3. **Right to sublicense:** The AOS Foundation may sublicense these rights consistent with the project's license terms.

### What It Does NOT Cover

- The CLA does NOT transfer ownership of your intellectual property
- The CLA does NOT prevent you from using your contribution in your own products
- The CLA does NOT grant rights beyond what is needed for the standard

### How to Sign

1. Download the Entity CLA from `legal/ENTITY_CLA.md`
2. Have an authorized representative of your organization sign it
3. Submit the signed CLA to ip-committee@aos-governance.org
4. Your organization will be added to the CLA signatory list

---

## Contribution Process

### Step 1: Open an Issue

Before writing any contribution, open a GitHub Issue describing:

- **What** you want to change
- **Why** the change is needed
- **Which standard(s)** are affected
- **Whether** the change is normative or informative

For normative changes, the Issue will be triaged by the Specification Committee.

### Step 2: Fork and Branch

```bash
git clone https://github.com/aos-governance/aos-standards.git
cd aos-standards
git checkout -b your-branch-name
```

### Step 3: Make Changes

Follow the quality standards in Section 5. Ensure:

- All commits include DCO sign-off (`git commit -s`)
- Normative changes use RFC 2119 language correctly
- New requirements have unique R-XXX identifiers
- Cross-references to other standards are accurate

### Step 4: Submit Pull Request

- Reference the GitHub Issue in the PR description
- Complete the PR template checklist
- Confirm DCO sign-off on all commits
- If normative: confirm Entity CLA is on file (if applicable)

### Step 5: Review

- Editorial/Clarification: 1-2 maintainer reviews
- Informative: 2 maintainer reviews
- Normative: Specification Committee review (minimum 3 members)
- New standard: Specification Committee + IP Committee (60-day public review)

---

## Quality Standards

### Language

- Use RFC 2119 keywords (MUST, SHALL, SHOULD, MAY) only in normative sections
- Use informative language ("is recommended," "typically," "for example") in non-normative sections
- Write for an international audience — avoid idioms, slang, and culture-specific references
- Use American English spelling for consistency with existing standards

### Structure

- Every normative requirement MUST have a unique identifier (e.g., R-POL-A-026)
- Every requirement MUST be testable — if you can't write a test for it, it's not a requirement
- Cross-references MUST use the format: "AOS-CORE-001 R-ENF-001" (standard + requirement ID)
- Section numbering MUST be sequential and hierarchical

### Testing

- Every new normative requirement MUST include at least one conformance test
- Tests MUST specify input, expected output, and the requirement(s) being tested
- Negative tests (inputs that MUST be rejected) are as important as positive tests

### AI Disclosure

- If AI tools were used in drafting the contribution, disclose this in the PR description
- AI assistance is welcome — human editorial judgment is required
- All normative requirements must be reviewed and approved by a human

---

## Normative vs. Informative Content

| Marker | Type | Legal Weight |
|--------|------|-------------|
| Section titled "Normative" or Part I | Normative | Binding on implementations |
| Contains RFC 2119 keywords (MUST, SHALL) | Normative | Binding on implementations |
| Section titled "Informative," Appendix, or NOTE | Informative | Guidance only |
| Examples, worked scenarios, templates | Informative | Guidance only |

**Rule:** If in doubt, make it informative. Normative requirements impose obligations on every implementation and should be added carefully.

---

## Review Process

### Maintainer Review

For editorial and informative contributions:

1. Maintainer reviews for accuracy, clarity, and consistency
2. Maintainer verifies DCO sign-off
3. Maintainer merges or requests changes

### Specification Committee Review

For normative contributions:

1. Committee reviews for technical soundness
2. Committee reviews for consistency with existing standards
3. Committee reviews for testability
4. 14-day public comment period (for significant additions)
5. Committee votes (simple majority for additions, supermajority for modifications to existing requirements)

### IP Committee Review

For new standards:

1. IP Committee reviews for patent implications
2. 60-day public review period with exclusion opportunity (per RF Patent Covenant Section 6)
3. IP Committee confirms no Essential Claims conflicts
4. IP Committee approves for publication

---

## IP Policy Summary

| Content Type | License | Patent Coverage |
|-------------|---------|----------------|
| Normative specifications | CC-BY-4.0 | RF Patent Covenant (Essential Claims) |
| Code and tooling | Apache 2.0 | Apache 2.0 patent grant |
| Examples and fixtures | CC0 1.0 (public domain) | No patent implications |
| Conformance test data | Apache 2.0 | Apache 2.0 patent grant |

By contributing, you agree that your contribution will be licensed under the applicable license for its content type.

For questions about IP policy, contact: ip-committee@aos-governance.org

---

## Code of Conduct

Contributors are expected to behave professionally and respectfully. The AOS Foundation adopts the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) as its code of conduct.

Reports of abusive, harassing, or otherwise unacceptable behavior may be sent to conduct@aos-governance.org.

---

*This contribution guide is part of the AOS Governance Standard.*  
*Last updated: 2026-06-05*
