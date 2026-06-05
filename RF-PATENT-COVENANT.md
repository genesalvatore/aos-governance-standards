# AOS Foundation -- Royalty-Free Patent Covenant

**Document:** RF-PATENT-COVENANT  
**Version:** 2.0  
**Date:** 2026-06-05  
**Status:** Active  
**Author:** Eugene Christopher Salvatore  
**License for this document:** CC-BY-4.0  
**Modeled on:** W3C Patent Policy (2020), Open Web Foundation Agreement 1.0, Red Hat Patent Promise

---

## 1. Purpose

This covenant removes patent risk from the adoption of AOS Governance Standards. The AOS Foundation ("Foundation") hereby commits that the patents listed in the Patent Registry (Section 10) will not be asserted against any person or entity that implements the Released Specifications in conformance with their normative requirements.

The Foundation's goal is to establish AOS as an open, implementable, royalty-free governance standard. This covenant provides the legal basis for that commitment. It is designed to give implementers, regulators, and certification bodies confidence that conforming implementations will not face patent assertions from the Foundation or its contributors.

---

## 2. Definitions

### 2.1 Essential Claims

**"Essential Claims"** means all claims in any patent or patent application in any jurisdiction in the world that would necessarily be infringed by an implementation of the Normative Portions of a Released Specification. A claim is "necessarily infringed" only if there is no technically reasonable non-infringing alternative for implementing the normative requirement.

Essential Claims do NOT include claims that would be infringed only by:

(a) Optional, informative, or non-normative portions of the specification (including Part II of AOS-CORE-001, informational appendices, examples, and design rationale blocks)

(b) Implementation choices not dictated by the specification (e.g., choice of programming language, operating system, database engine, or deployment topology)

(c) Reference implementations, example code, test data, or test fixtures, which are separately licensed under Apache-2.0

(d) Enabling technologies not themselves set forth in the specification (e.g., general-purpose cryptography, operating system process management, network transport protocols, semiconductor manufacturing)

(e) Technology developed elsewhere and merely incorporated by reference (e.g., RFC 6962 Merkle trees, Ed25519, SHA-256)

(f) Design patents and design registrations

### 2.2 Released Specification

**"Released Specification"** means a final, versioned AOS standard that has been:

1. Published by the Foundation under CC-BY-4.0
2. Designated with a standard identifier of the form `AOS-{CATEGORY}-{NUMBER}` (e.g., AOS-CORE-001, AOS-POL-001, AOS-HARD-001, AOS-CRYPTO-001)
3. Marked with a status of "Published" or "Active"
4. Completed a minimum 60-day public review period (Section 7)

Draft specifications, working drafts, and specifications with status "Draft" are NOT Released Specifications. This covenant does not extend to draft documents.

### 2.3 Normative Portions

**"Normative Portions"** means the sections of a Released Specification that contain mandatory requirements using RFC 2119 language (MUST, SHALL, REQUIRED) and conformance test requirements. Sections explicitly marked as "Informative," "Non-Normative," "Note," "Example," or "Design Rationale" are not Normative Portions.

### 2.4 Conforming Implementation

**"Conforming Implementation"** means a software or hardware system that satisfies the mandatory normative requirements of a Released Specification at any conformance tier (Foundation, Enterprise, or Sovereign) and passes the applicable conformance tests defined in the specification.

### 2.5 Contributor

**"Contributor"** means any individual or entity that has submitted normative text, architectural requirements, or conformance test definitions to a Released Specification and has executed the AOS Foundation Contributor Agreement.

### 2.6 Licensee

**"Licensee"** means any person or entity that benefits from this covenant by implementing a Conforming Implementation of a Released Specification.

---

## 3. Grant of Covenant

### 3.1 Foundation Commitment

The Foundation covenants that it will not assert Essential Claims against any Licensee for making, having made, using, selling, offering for sale, importing, distributing, or otherwise exploiting any Conforming Implementation of the Released Specifications.

### 3.2 Contributor Commitment

Each Contributor, as a condition of contributing normative text to a Released Specification, commits to grant the same royalty-free covenant described in Section 3.1 with respect to Essential Claims owned or controlled by that Contributor. This commitment is memorialized in the AOS Foundation Contributor Agreement.

### 3.3 Scope of Grant

This covenant extends to:

(a) All Released Specifications published as of the date of this covenant

(b) All future Released Specifications, subject to the exclusion procedures in Section 7

(c) All conformance tiers (Foundation, Enterprise, Sovereign) defined in the Released Specifications

(d) All implementations worldwide, regardless of commercial or non-commercial purpose

(e) The right to sublicense under the same terms to downstream users, distributors, and integrators

### 3.4 What This Covenant Does NOT Grant

This covenant does NOT grant:

(a) Rights to use AOS Foundation trademarks, service marks, or certification marks (see Section 9)

(b) License to patent claims that are infringed by non-conforming implementations

(c) License to patent claims that are infringed only by implementation choices beyond the Normative Portions

(d) License to patent claims not listed in the Patent Registry (Section 10) unless those claims are Essential Claims as defined in Section 2.1

---

## 4. Defensive Termination

### 4.1 Trigger

If a Licensee (or any entity in which the Licensee holds a controlling interest) initiates a patent infringement action against:

(a) The Foundation, or

(b) Any Contributor, for practicing the Released Specifications, or

(c) Any other Licensee, for implementing a Conforming Implementation of the Released Specifications

then this covenant terminates automatically with respect to that Licensee, effective as of the date the patent infringement action was filed.

### 4.2 Scope of Termination

Termination under Section 4.1 applies only to the Licensee that initiated the patent assertion. All other Licensees retain the full benefit of this covenant. Termination does not revive retroactively -- the Licensee's prior activities under the covenant (before the filing date) are not subject to assertion.

### 4.3 Cure

If the Licensee withdraws the patent infringement action within 30 calendar days of filing and provides written notice of withdrawal to the Foundation, the covenant is automatically reinstated for that Licensee.

---

## 5. Irrevocability

### 5.1 General Rule

This covenant is **irrevocable** with respect to any Released Specification. Once a specification achieves "Released" status and the public review period (Section 7) has closed, the Foundation cannot retroactively withdraw the royalty-free commitment for that specification.

### 5.2 Survival

The royalty-free commitment survives:

(a) Dissolution of the Foundation

(b) Transfer or assignment of the Foundation's patent portfolio

(c) Acquisition of the Foundation or its assets

(d) Any change in the Foundation's governance structure

Any successor entity or assignee of the Foundation's patent portfolio is bound by this covenant with respect to all Released Specifications as of the date of succession or assignment. The Foundation will include this covenant as a condition of any patent assignment or organizational restructuring.

---

## 6. Disclosure Obligations

### 6.1 Foundation Disclosure

The Foundation will disclose, to the best of its knowledge, all patent claims that it believes may be Essential Claims with respect to each Released Specification. Disclosure will be published in the Patent Registry (Section 10) and updated as new patents are filed or granted.

### 6.2 Contributor Disclosure

Contributors are expected to disclose patent claims of which they are personally aware that they believe could become Essential Claims with respect to a Released Specification. Contributors are NOT required to conduct a patent search. Disclosure obligations are triggered by actual knowledge, not constructive knowledge.

### 6.3 Third-Party Patents

This covenant addresses only patents owned or controlled by the Foundation and its Contributors. The Foundation cannot grant rights under patents owned by third parties. If a third party believes that a Released Specification infringes its patent claims, the Foundation will:

(a) Evaluate whether the claim is an Essential Claim as defined in Section 2.1

(b) If the claim is Essential, seek to negotiate a royalty-free commitment from the third party

(c) If a royalty-free commitment cannot be obtained, consider specification amendments to design around the claim

(d) Publish the status of all known third-party patent claims in the Patent Registry

---

## 7. Public Review and Exclusion

### 7.1 Review Period

For each new Released Specification (or major revision of an existing one), the Foundation will provide a minimum **60-day public review period** during which:

(a) The draft specification is published for public comment

(b) The Foundation discloses any known Essential Claims (Section 6.1)

(c) Any party may submit comments, objections, or patent disclosures

(d) Contributors may exercise their Exclusion right (Section 7.2)

### 7.2 Contributor Exclusion

During the public review period, a Contributor may exclude specific patent claims from the royalty-free commitment by:

(a) Providing written notice to the Foundation identifying the specific patent claims excluded

(b) Identifying the specific normative requirements to which the excluded claims relate

(c) Providing a reasonable explanation of why the claims cannot be committed royalty-free

Exclusion notices are published on the Foundation's website for transparency. The Foundation may elect to amend the specification to avoid the excluded claims. If the excluded claims remain Essential after the review period closes, the Foundation will note the exclusion in the Patent Registry.

### 7.3 After Review Period Closes

Once the public review period closes and the specification achieves "Released" status:

(a) No further exclusions may be made for that version of the specification

(b) The royalty-free commitment becomes irrevocable (Section 5)

(c) The specification is listed in the Patent Registry with its covered patents

---

## 8. Relationship to Code Licenses

### 8.1 Specification Documents

AOS specification documents are licensed under **CC-BY-4.0** (Creative Commons Attribution 4.0 International). CC-BY-4.0 governs copyright only and does not address patent rights. This covenant (RF-PATENT-COVENANT) addresses the patent dimension.

### 8.2 Reference Implementations and Tooling

Code artifacts -- including reference implementations, SDKs, validators, conformance test runners, and policy linters -- are licensed under **Apache License 2.0**. The Apache 2.0 license includes its own contributor patent grant (Section 3 of Apache 2.0), which provides patent protection for the specific code artifacts. This covenant provides the additional patent protection needed for independent implementations that do not derive from the reference code.

### 8.3 Examples and Test Fixtures

Example code, sample configurations, and test fixture data embedded within specification documents are licensed under **CC-BY-4.0** as part of the specification document. Standalone example repositories may be licensed under Apache-2.0 or MIT at the Foundation's discretion. Patent protection for examples and fixtures flows from this covenant's coverage of the Normative Portions they illustrate.

### 8.4 Why Both Are Necessary

Apache 2.0 alone is not sufficient for a standard. Apache 2.0's patent grant covers only the specific code in the licensed repository. If a third party independently implements the AOS specification without using the reference code, Apache 2.0's patent grant does not protect them. This covenant closes that gap by committing the Foundation's patents against ALL Conforming Implementations, regardless of code lineage.

---

## 9. Trademarks and Certification

### 9.1 No Trademark Grant

This covenant does not grant any rights to use:

- "AOS" as a trademark
- "AOS Foundation" as a trademark
- "AOS Certified" or any certification marks
- The AOS logo or visual identity

### 9.2 Certification Program

Use of the "AOS Certified" mark requires:

(a) Passing the conformance test suite (TCK) for the applicable Released Specification and tier

(b) Executing the AOS Certification Agreement (terms published separately)

(c) Annual recertification against the current Released Specification version

Certification is separate from and independent of this patent covenant. An implementation may benefit from this covenant without being certified, and certification does not expand the scope of this covenant.

---

## 10. Patent Registry

The following patents are committed under this covenant as of the date of publication. This registry will be updated as additional patents are filed, granted, or committed.

### 10.1 Foundation-Owned Patents

| Patent ID | Application No. | Title | Filed | Essential to |
|-----------|----------------|-------|-------|-------------|
| AOS-PATENT-015 | 63/969,499 | Deterministic Policy Gate and Cryptographic Execution Boundary for Autonomous AI Systems | 2026-01-10 | AOS-CORE-001 |
| AOS-PATENT-012 | 63/957,860 | Asynchronous Out-of-Band Execution Interrupt Protocol for Autonomous Systems | 2026-01-10 | AOS-CORE-002 |
| AOS-PATENT-009 | 63/957,856 | Real-Time Agent State Serialization and Cross-Platform Reconstitution Protocol | 2026-01-10 | AOS-CORE-002 |
| AOS-PATENT-071 | 63/957,xxx | Triple-Redundancy Cognitive State Checkpointing | 2026-01-10 | AOS-CORE-002 |
| AOS-PATENT-119 | 63/957,925 | Merkle-Tree Authenticated Content-Addressable Data Structure as Immutable Agent State Substrate | 2026-01-10 | AOS-CRYPTO-001 |
| AOS-PATENT-120 | 63/969,541 | Cryptographic Methods for Agent Identity Verification, Protection, and Tamper-Proof State Integrity | 2026-01-10 | AOS-CRYPTO-001 |
| AOS-PATENT-134 | 63/958,xxx | Merkle-Tree Authenticated Evidence Verification System (AOS Attest) | 2026-01-10 | AOS-CRYPTO-001 |
| AOS-PATENT-047 | 63/957,834 | Unanimous Consensus Protocol for Multi-Node Autonomous Systems | 2026-01-10 | AOS-CORE-001, AOS-CORE-003, AOS-CRYPTO-001 |
| AOS-PATENT-142 | 63/993,716 | Mass Agent Constitutional Governance with Emergent Behavior Containment | 2026-03-01 | AOS-CORE-003 |
| AOS-PATENT-144 | 63/993,xxx | Atomic Transactional Rollback for Ephemeral Agent Execution Environments via CoW Filesystems | 2026-04-04 | AOS-HARD-001 |
| AOS-PATENT-145 | 63/993,xxx | Syscall Trajectory Baselining for Zero-Day Context Poisoning Detection | 2026-04-04 | AOS-HARD-001 |
| AOS-PATENT-118 | 63/957,975 | Autonomous Physical Layer Network Severance and Survival Protocol | 2026-01-10 | AOS-HARD-001 |

### 10.2 Blanket Commitment

In addition to the patents specifically listed above, the Foundation commits that ALL patents and patent applications in the AOS portfolio (currently 145 filings across 4 waves, January-April 2026) that contain Essential Claims with respect to any Released Specification are subject to this covenant. The specific patent list in Section 10.1 is provided for transparency and convenience; the blanket commitment in this section governs if a patent is omitted from the list but contains Essential Claims.

### 10.3 Known Third-Party Patents

As of the date of this covenant, the Foundation is not aware of any third-party patents that are Essential Claims with respect to the Released Specifications. This section will be updated if third-party claims are identified.

| Patent | Owner | Status | Essential to | RF Commitment |
|--------|-------|--------|-------------|---------------|
| (none known) | -- | -- | -- | -- |

### 10.4 Registry Updates

The Patent Registry will be updated:

(a) When new AOS patents are filed or granted

(b) When new Released Specifications are published

(c) When third-party patent claims are identified

(d) When Contributors exercise exclusion rights (Section 7.2)

Updates are published on the Foundation's website and committed to the `aos-governance-standards` repository.

---

## 11. Limitation of Liability

This covenant is provided "AS IS" without warranty of any kind, express or implied, including but not limited to warranties of non-infringement. The Foundation does not warrant that no third-party patents exist that may be infringed by a Conforming Implementation. Licensees are responsible for their own patent clearance and freedom-to-operate analysis.

---

## 12. Severability

If any provision of this covenant is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The parties agree to negotiate in good faith to replace the invalid provision with a valid provision that most closely approximates the intent of the original.

---

## 13. Amendments

This covenant may be amended by the Foundation, provided that:

(a) Amendments apply only to future Released Specifications (no retroactive changes)

(b) Amendments are published with a minimum 60-day public comment period

(c) No amendment may reduce the royalty-free commitment for any already-Released Specification

---

## 14. Contact

Patent disclosures, exclusion notices, and questions regarding this covenant should be directed to:

**AOS Foundation**  
Email: patents@aos-governance.org  
Repository: github.com/aos-foundation/governance-standards  
Web: aos-governance.org

---

## Appendix A: Summary for Implementers

**If you are implementing an AOS specification, here is what you need to know:**

1. **You can implement any Released Specification royalty-free.** The Foundation will not assert its patents against your Conforming Implementation.

2. **This applies at all tiers.** Foundation, Enterprise, and Sovereign implementations are all covered.

3. **This applies regardless of commercial purpose.** Open-source projects, commercial products, internal enterprise systems, government deployments -- all covered.

4. **The commitment is irrevocable.** Once a specification is Released, the Foundation cannot take back the royalty-free commitment.

5. **There is a defensive termination clause.** If you sue the Foundation, Contributors, or other implementers over AOS patents, you lose the benefit of this covenant.

6. **Trademarks are separate.** You can implement the spec without using AOS trademarks. If you want to call your implementation "AOS Certified," you need to pass the conformance tests and sign the certification agreement.

7. **Code and specs have different licenses.** Specs are CC-BY-4.0 (copyright). Code is Apache-2.0 (copyright + patent grant). This covenant covers the patent gap for independent implementations.

---

## Appendix B: AI Disclosure

This covenant was drafted with the assistance of AI tools under human editorial control. The legal structure, strategic decisions, and patent commitments reflect the author's judgment. This covenant is modeled on established open-standard patent policies (W3C Patent Policy, Open Web Foundation Agreement 1.0, Red Hat Patent Promise) adapted for the AOS governance standard context.

---

**AOS Foundation**  
Published: 2026-06-05  
Document version: 2.0
