# AOS Governance Charter

**Document:** AOS Foundation Governance Charter  
**Version:** 1.0  
**Date:** 2026-06-05  
**Status:** Adopted  
**Author:** Eugene Christopher Salvatore, Founder

---

## 1. Mission

The AOS Foundation exists to develop, maintain, and promote the AOS Governance Standard — an open, royalty-free specification for deterministic AI agent governance. The Foundation ensures that the standard remains technically excellent, vendor-neutral, and freely implementable by any organization.

---

## 2. Principles

1. **Open by default.** All normative specifications are published under CC-BY-4.0. All reference implementations are Apache 2.0. All Essential Claims are covered by the RF Patent Covenant.

2. **Merit-based participation.** Leadership positions are earned through sustained, high-quality contributions to the standard, not through corporate affiliation or financial contribution.

3. **Vendor neutrality.** No single organization may control the standard's direction. The standard serves implementors, deployers, and end users — not any single vendor's commercial interests.

4. **Technical excellence.** Decisions are made on technical merit, not politics. Every normative requirement must be testable, and every claim must be falsifiable.

5. **Backwards compatibility.** Minor version updates MUST NOT break conformant implementations. Major version updates require a 12-month deprecation notice.

---

## 3. Organizational Structure

### 3.1 Roles

| Role | Responsibility | Selection | Term |
|------|---------------|-----------|------|
| **Founder** | Strategic direction, IP custodianship, final authority on constitutional matters | Permanent (Eugene Christopher Salvatore) | Indefinite |
| **Specification Committee Chair** | Chairs spec meetings, manages release schedule, breaks tie votes | Elected by Specification Committee | 2 years, renewable |
| **Specification Committee Member** | Reviews normative changes, votes on spec modifications, maintains standards quality | Nominated by maintainers, confirmed by Committee vote | 2 years, renewable |
| **Maintainer** | Merges contributions, triages issues, reviews PRs, mentors contributors | Nominated by existing maintainers after sustained contribution record | Indefinite (revocable by Committee vote) |
| **Contributor** | Submits issues, PRs, and feedback | Self-selected (DCO required) | N/A |
| **IP Committee Member** | Reviews patent implications, manages RF Patent Covenant, handles Essential Claims exclusions | Appointed by Founder with Committee confirmation | 3 years |
| **Security Response Team Member** | Handles vulnerability reports, coordinates fixes, manages disclosure | Appointed by Committee Chair | 2 years |

### 3.2 Specification Committee

The Specification Committee is the primary decision-making body for the AOS standard.

**Composition:** 5-9 members, including the Chair. At least 3 members must be from different organizations. The Founder is an ex-officio member with voting rights.

**Quorum:** Simple majority of seated members.

**Meeting cadence:** Monthly, with extraordinary meetings called by the Chair as needed.

**Decision process:**

| Decision Type | Required Vote |
|--------------|--------------|
| Editorial changes | Maintainer approval (no Committee vote needed) |
| New informative content | Simple majority |
| New normative requirements | Two-thirds majority |
| Modification of existing requirements | Two-thirds majority |
| New specification document | Two-thirds majority + 60-day public review |
| Charter amendments | Three-quarters majority + Founder approval |

### 3.3 IP Committee

The IP Committee manages the intellectual property aspects of the standard.

**Composition:** 3-5 members with IP law expertise. At least one member must have patent law experience.

**Responsibilities:**

- Administer the RF Patent Covenant
- Process Essential Claims exclusion requests (per Covenant Section 6)
- Review new specifications for patent implications
- Maintain the patent registry
- Advise the Specification Committee on IP matters

### 3.4 Security Response Team

The Security Response Team handles security vulnerabilities in published standards.

**Composition:** 3-5 members with security expertise.

**Process:**

1. Vulnerability reported to security@aos-governance.org
2. Team acknowledges within 48 hours
3. Team assesses severity and affected standards
4. Fix developed in private
5. Coordinated disclosure: fix published simultaneously with advisory
6. 90-day embargo maximum

---

## 4. Specification Lifecycle

### 4.1 New Specification Process

```
1. PROPOSAL      → GitHub Issue with rationale (anyone)
2. DRAFT         → Specification Committee assigns working group
3. PUBLIC REVIEW → 60-day public comment period
4. IP REVIEW     → IP Committee reviews for patent implications
5. VOTE          → Specification Committee vote (two-thirds)
6. PUBLISHED     → Assigned standard ID, versioned, committed
```

### 4.2 Versioning

| Version Type | Criteria | Committee Vote | Notice Period |
|-------------|----------|---------------|--------------|
| **Patch** (1.0.x) | Editorial corrections only | Maintainer approval | None |
| **Minor** (1.x.0) | New optional requirements, new informative content | Simple majority | 30-day notice |
| **Major** (x.0.0) | Breaking changes, new mandatory requirements | Two-thirds majority | 12-month deprecation |

### 4.3 Deprecation

A standard or requirement MAY be deprecated when:

- It is superseded by a new standard
- It is found to be technically unsound
- It conflicts with a legal or regulatory change

Deprecated standards remain available for 12 months after deprecation. Implementations conformant to a deprecated standard remain conformant until the deprecation period expires.

---

## 5. Public Participation

### 5.1 Issue Tracking

All specification work is tracked via public GitHub Issues. Anyone may:

- File issues reporting bugs, ambiguities, or gaps
- Comment on open issues
- Submit pull requests (with DCO sign-off)
- Participate in public review periods

### 5.2 Mailing List

The aos-governance-discuss mailing list is open to all. Announcements of new standards, public review periods, and Committee decisions are posted there.

### 5.3 Annual Report

The Foundation publishes an annual report covering:

- Standards published and updated
- Committee membership changes
- Patent covenant activity
- Conformance program statistics
- Financial summary (if applicable)

---

## 6. Conformance and Certification

### 6.1 Conformance Program

The AOS Foundation maintains a conformance program (aos-certified) that allows implementations to demonstrate compliance with the standard.

**Self-certification (Foundation tier):**
- Run the published TCK test suite
- Submit results to the conformance registry
- Use the "AOS Conformant" mark

**Third-party certification (Enterprise/Sovereign):**
- Engage an accredited testing laboratory
- Pass the full TCK with witnessed test runs
- Submit results to the Foundation
- Use the "AOS Certified" mark

### 6.2 Trademark Policy

"AOS," "AOS Foundation," "AOS Governance Standard," "Deterministic Policy Gate," and "AOS Certified" are trademarks of the AOS Foundation. Use of these marks is governed by the AOS Trademark Policy (published separately).

Conformant implementations may use the "AOS Conformant" or "AOS Certified" marks subject to:

- Passing the applicable conformance tests
- Maintaining conformance with each new patch release
- Not implying Foundation endorsement beyond conformance

---

## 7. Financial Matters

### 7.1 Funding Model

The AOS Foundation is funded through:

- Certification fees (Enterprise/Sovereign tier)
- Training and educational materials
- Optional sponsorships (non-voting, acknowledged on website)
- No pay-to-play: financial contribution does not grant specification influence

### 7.2 Budget Transparency

The Foundation's annual budget is published in the annual report. Major expenditure categories:

- Infrastructure (hosting, CI/CD, testing)
- Legal (patent maintenance, trademark defense)
- Events (standards meetings, conferences)
- Administration

---

## 8. Amendments

This charter may be amended by a three-quarters vote of the Specification Committee with Founder approval. Proposed amendments must be published for 30-day public comment before the vote.

---

## 9. Effective Date

This charter takes effect on the date of publication and applies to all AOS Foundation activities thereafter.

---

*AOS Foundation Governance Charter v1.0*  
*Adopted: 2026-06-05*  
*"AOS" and "AOS Foundation" are trademarks of AOS Foundation.*
