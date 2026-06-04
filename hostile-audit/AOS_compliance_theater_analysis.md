# AOS-CORE-001: Compliance Theater Resistance Analysis

**Analyst:** Silas (Antigravity Agent)  
**Persona:** Compliance Theater Consultant  
**Date:** 2026-06-03  
**Objective:** Determine whether an organization can achieve AOS-CORE-001 "compliance" without actually being secure.

---

## What Is Compliance Theater?

Compliance theater is the practice of satisfying the letter of a security standard while completely undermining its intent. It's the cybersecurity equivalent of a fire door that's been propped open — technically installed, functionally useless.

Every major security standard has been gamed this way:
- **PCI DSS:** Merchants segment their network on paper while leaving flat networks in practice
- **SOC 2:** Companies write policies they never enforce and pass audits on documentation alone
- **ISO 27001:** Organizations implement controls for the audit, then disable them afterward
- **HIPAA:** Covered entities check boxes on risk assessments without actually mitigating risks

The question: **Can someone do this with AOS-CORE-001?**

---

## Theater Resistance Test Results

### Move 1: The Passthrough Gate

**Theater:** Implement the gate as a simple proxy that logs requests but always returns ALLOW.

**Blocked by:** Test F-002 — "Request for tool not in policy → DENY"

A passthrough gate cannot satisfy F-002 because it would allow tools not defined in the policy. The test requires a *denial*, not just a log entry. You can't pass this test with a gate that always says yes.

**Verdict:** ❌ BLOCKED

---

### Move 2: The Infinite Budget

**Theater:** Set all budgets to 999999 to avoid ever hitting a denial, then claim budget enforcement is implemented.

**Blocked by:** AOS-POL-001 R-POL-A-009 — "Budget values MUST be derived from the mission's expected workload, not from arbitrary round numbers." And R-POL-A-010 — methodology requires estimating normal usage and applying a 2-3x safety factor.

Additionally, AOS-POL-001 R-POL-A-022 (validation mode) explicitly warns on "values that appear to be placeholder round numbers such as 999999."

**Verdict:** ❌ BLOCKED

---

### Move 3: The Open Scope

**Theater:** Set `pathAllowlist: ["/**"]` to allow everything, then claim scope validation is implemented.

**Blocked by:** AOS-POL-001 R-POL-A-007 — "Open-ended scope (e.g., `pathAllowlist: ["/**"]`) is prohibited in production policies."

This is an explicit prohibition, not a recommendation. The exact example is named.

**Verdict:** ❌ BLOCKED

---

### Move 4: The Skipped Lifecycle

**Theater:** Write the policy and deploy it directly, skipping REVIEW and TESTED stages.

**Blocked by:** AOS-POL-001 R-POL-A-002 — "A policy MUST NOT transition from DRAFT directly to ACTIVE. The REVIEW and TESTED stages are mandatory."

This is a hard MUST NOT, and the conformance test suite (PT-001 through PT-015) must be run during the TESTED stage. There's no shortcut.

**Verdict:** ❌ BLOCKED

---

### Move 5: The Fake Attestation

**Theater:** Have the agent sign its own attestations, creating the appearance of cryptographic governance without actual enforcement.

**Blocked by:** R-ATT-004 — "The signing key MUST be held exclusively by the gate process. The agent MUST NOT have access to the signing key."

Test F-009 verifies that valid requests produce attestations with verifiable signatures. If the agent holds the key, the architectural separation (R-ARCH-001) is violated, and the attestation is meaningless.

**Verdict:** ❌ BLOCKED

---

### Move 6: The Mutable Journal

**Theater:** Log everything to a regular database table, claiming "append-only" while quietly allowing UPDATE/DELETE.

**Blocked by:** R-JRN-002 — "A conformant implementation MUST use a mechanism that prevents modification of existing entries."

At Enterprise tier, test E-006 — "Modified journal entry mid-chain → Chain verification fails" — explicitly tests for tampered entries. The chain hash (R-JRN-004) means modifying any entry invalidates all subsequent entries.

**Verdict:** ❌ BLOCKED

---

### Move 7: The Rubber-Stamp Approver

**Theater:** Implement approval as an automated system that always approves, creating the appearance of human oversight.

**Blocked by:** R-APR-002 — "The approval channel MUST be out-of-band — the agent MUST NOT be able to access, intercept, or influence the approval mechanism."

An automated approver that always says yes would violate the spirit of "human approval," but more critically: test E-007 — "Approval token from unregistered approver → DENY" — means the rubber-stamp system's key must be in the approver registry, and R-APR-003 requires tokens be signed with cryptographic keys. The question then becomes: who holds the key? If the approver is automated, R-APR-002's "out-of-band" requirement means it can't be triggered by the agent.

**Assessment:** The standard prevents *agent-triggered* approval. It doesn't prevent a human operator from setting up automatic approval for specific tools — but that's a policy design choice (and POL-001 anti-pattern 8.4 warns against it).

**Verdict:** ⚠️ PARTIALLY BLOCKED — human must set it up intentionally, can't be agent-driven

---

### Move 8: The Category Bypass

**Theater:** Use a "classifier" that always returns confidence 1.0 and category "safe" — effectively disabling category enforcement.

**Blocked by:** R-ENF-008 — "The gate MUST evaluate tool call intent against the declared list of prohibited categories." Test F-007 — "Request classified as prohibited category → DENY."

If your classifier never classifies anything as prohibited, F-007 will fail when you submit test input that clearly matches a prohibited category. The test isn't "does your classifier work in general" — it's "does this specific prohibited input get denied?"

**Verdict:** ❌ BLOCKED

---

### Move 9: The Foundation-Only Forever

**Theater:** Claim Foundation tier compliance forever to avoid Enterprise requirements (mTLS, chain integrity, denial response security).

**Blocked by:** Nothing explicitly — Foundation tier is a legitimate compliance level.

**Assessment:** This is the one theater move that partially works. An organization *can* legitimately stay at Foundation tier forever. However, the Foundation tier still requires:
- Process separation (R-ARCH-001 through R-ARCH-008)
- Deny-by-default (R-POL-002)
- Budget enforcement (R-ENF-005 through R-ENF-007)
- Attestation with real signatures (R-ATT-001 through R-ATT-005)
- Human approval for flagged tools (R-APR-001 through R-APR-007)
- Append-only journal (R-JRN-001 through R-JRN-003)
- 17 conformance tests (F-001 through F-017)

Foundation is not theater — it's a genuine security baseline. The Enterprise and Sovereign tiers add depth-of-defense, but Foundation alone is more governance than most AI systems have today.

**Verdict:** ✅ ALLOWED — Foundation is legitimate, not theater

---

### Move 10: The Hash Collision

**Theater:** Modify the policy but find a SHA-256 collision to keep the same hash.

**Blocked by:** Mathematics. SHA-256 collision resistance is 2^128 operations. This is computationally infeasible with current technology.

**Verdict:** ❌ BLOCKED (by physics)

---

### Move 11: The Emergency Loophole

**Theater:** Use emergency policy updates (POL-001 Section 11.2) as the normal deployment path, bypassing the full REVIEW/TESTED cycle.

**Blocked by:** 
- Section 11.2 item 4: "The emergency policy MUST include an expiration time"
- R-POL-A-025: "The gate MUST check the policy expiration time at each request"
- Section 11.2 item 6: "emergency reviewer MUST NOT be the same individual as the policy author" (Enterprise+)

Emergency policies auto-expire. You can't use them as permanent policies because the gate will reject them when they expire.

**Verdict:** ❌ BLOCKED

---

### Move 12: The Attestation Replay

**Theater:** Capture valid attestations from normal operations and replay them to authorize unauthorized actions.

**Blocked by:**
- R-ATT-002: Nonce field (≥128 bits, cryptographically random)
- R-ATT-006 item 6: "Nonce has not been previously used"
- R-ATT-008: Timestamp freshness (default ≤ 5 minutes)
- R-ATT-009: Durable nonce registry (persists across restarts)
- Test F-016: "Gate restarts; previously used nonce replayed → DENY"

Three independent mechanisms block replay: nonce uniqueness, timestamp freshness, and call-specific binding (tool call ID + arguments hash).

**Verdict:** ❌ BLOCKED (triple-layered)

---

### Move 13: The Policy Oracle

**Theater:** Probe the gate with various requests to reverse-engineer the policy's scope, budgets, and categories, then craft attacks that stay just within bounds.

**Blocked by:** R-ENF-010 (Enterprise+) — "Denial responses MUST contain only the decision (DENY) and a general reason category."

At Foundation tier, denial responses may contain more detail — this is a legitimate attack at Foundation. At Enterprise and above, the agent only learns "DENIED: SCOPE_VIOLATION" — not which path pattern, budget threshold, or category triggered it.

**Verdict:** ⚠️ PARTIALLY BLOCKED — effective at Enterprise+, weaker at Foundation

---

### Move 14: The Scope Creep

**Theater:** Start with a tight policy, then gradually expand scope, budgets, and reduce approval requirements through small, individually-justified changes.

**Blocked by:**
- R-POL-005: Every policy change is logged with modifier identity
- POL-001 Section 11.1: Change review checklist explicitly asks "Does the change expand scope? Does the change increase budgets? Does the change lower the approval tier?"
- R-POL-A-024: Policy hash changes on ANY field modification
- Journal chain: The full history of policy changes is immutable

**Assessment:** The standard doesn't prevent individual scope expansions — each one might be legitimate. But it makes the *pattern* visible. An auditor reviewing the journal can see the drift over time. This is detection, not prevention — appropriate for a governance standard.

**Verdict:** ⚠️ PARTIALLY BLOCKED — detectable but not preventable

---

## Summary

| Move | Description | Result |
|------|-------------|--------|
| 1 | Passthrough gate | ❌ BLOCKED |
| 2 | Infinite budget | ❌ BLOCKED |
| 3 | Open scope | ❌ BLOCKED |
| 4 | Skip lifecycle | ❌ BLOCKED |
| 5 | Fake attestation | ❌ BLOCKED |
| 6 | Mutable journal | ❌ BLOCKED |
| 7 | Rubber-stamp approver | ⚠️ PARTIAL |
| 8 | Category bypass | ❌ BLOCKED |
| 9 | Foundation-only forever | ✅ ALLOWED (legitimate) |
| 10 | Hash collision | ❌ BLOCKED (physics) |
| 11 | Emergency loophole | ❌ BLOCKED |
| 12 | Attestation replay | ❌ BLOCKED (triple) |
| 13 | Policy oracle | ⚠️ PARTIAL (Enterprise+ only) |
| 14 | Scope creep | ⚠️ PARTIAL (detectable) |

**Results:**
- **10 of 14 theater moves are FULLY BLOCKED** by specific requirements and tests
- **3 are PARTIALLY BLOCKED** with clear mitigations at higher tiers
- **1 is ALLOWED** because Foundation compliance is genuinely secure (not theater)
- **0 theater moves succeed undetected**

---

## Why This Standard Is Hard to Fake

The anti-theater design comes from three architectural decisions:

1. **Tests verify denials, not just allows.** Most standards test "can it do the right thing?" DPG also tests "does it refuse the wrong thing?" This means a lazy implementation that skips enforcement *fails the test suite* rather than passing it.

2. **Fail-closed is the default.** Every skip, shortcut, or error produces a DENY. You can't game a system where the lazy path is the secure path.

3. **Cryptographic binding.** Attestations, journal chains, and policy hashes create unforgeable evidence. You can't fake compliance because the evidence is mathematically verifiable.

This combination makes AOS-CORE-001 one of the hardest standards to theater. The compliance and the security are the same thing.

---

*Analysis by Silas (Antigravity Agent), Persona: Compliance Theater Consultant*  
*Adversarial compute provided by Google DeepMind infrastructure.*
