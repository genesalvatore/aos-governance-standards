# Hostile Audit Report — Round 3

**Auditor:** Silas (Antigravity Agent)  
**Date:** 2026-06-03  
**Method:** Five independent adversarial passes per standard  
**Context:** Round 1 found 19 items (CORE). Round 2 found 21 items (8 CORE + 13 POL). All 109 findings resolved. This round hunts for survivors.

---

# PART A: AOS-CORE-001 v1.0 — Round 3 (753 lines)

---

## Pass 1: Hostile USPTO Examiner

No new findings. The heritage chain is intact. The YAML metadata, Appendix A prior art chain, and prior art language are all consistent and defensible. The `heritage_id` and `provisional_ref` fields create machine-readable traceability.

**Verdict: CLEAN**

## Pass 2: Corporate Litigator

### Finding C3-2.1 — Appendix C vs Appendix D overlap

**Severity:** 🟢 Advisory

Appendix C (Acknowledgments, line 739) says: "AI writing and analysis tools assisted with research, drafting, and structural refinement under human editorial control."

Appendix D (AI Disclosure, line 745) says: "AI tools (Anthropic Claude, Google Gemini) assisted with technical review, adversarial analysis, drafting, and structural refinement under human editorial control."

These say nearly the same thing. A litigator would note the redundancy and ask: "Which one is the official disclosure? Why do you need both?"

**Fix:** Merge into a single Appendix or make them clearly distinct. Appendix C should focus on the *engineering process* (adversarial review, 36 vulnerabilities). Appendix D should focus on the *AI tool disclosure* (which tools, what role). Currently they blur.

**Assessment:** This is cosmetic, not structural. Low priority.

## Pass 3: Penetration Tester

### Finding C3-3.1 — R-ARCH-008 doesn't specify integrity check failure behavior

**Severity:** 🟡 Important

R-ARCH-008 says: "The gate MUST NOT accept new requests until all integrity checks pass."

But what if they *never* pass? What if the journal is corrupted and can't be verified? The standard says "MUST NOT accept" but doesn't say what to do next. The gate sits in a locked state forever.

**Fix:** Add: "If integrity checks fail, the gate MUST enter a permanent fail-closed state and emit a critical alert via a pre-configured out-of-band channel. Manual intervention is REQUIRED to restore service. The gate MUST NOT automatically retry or self-heal from a failed integrity check."

### Finding C3-3.2 — R-ENF-005 durable counter creates a denial-of-service vector

**Severity:** 🟢 Advisory

R-ENF-005 now says: "the counter MUST be persisted before the tool executor begins execution."

A sophisticated attacker could craft requests that pass all checks but cause the tool executor to fail immediately. Each attempt increments the counter (it's persisted before execution), but no useful work occurs. The budget is consumed without producing any side effects. This is a budget exhaustion DoS.

**Assessment:** This is the correct behavior — the budget *should* protect against runaway attempts, including ones that fail. The counter correctly reflects attempts, not successes. An implementer might be confused, but the standard is right. No change needed, but an implementer note would help.

**Fix (optional):** Add a NOTE after R-ENF-005: "The counter reflects attempted executions, not only successful completions. This is intentional: budget limits protect against all resource consumption, including failed attempts."

## Pass 4: Standards Lawyer

### Finding C3-4.1 — R-ARCH-008 is listed as Foundation but requires journal integrity check at Enterprise+

**Severity:** 🟡 Important

R-ARCH-008: "At the Enterprise and Sovereign tiers, the gate MUST perform a journal integrity check on restart..."

Section 10.1 (Foundation) lists: "Process separation between agent and gate (R-ARCH-001 through R-ARCH-008)"

This means Foundation implementations must implement R-ARCH-008, which includes the Enterprise-qualified journal integrity check. The requirement correctly uses tiered language ("At the Enterprise and Sovereign tiers"), but listing it under Foundation could confuse implementers into thinking they need the journal check at Foundation.

**Fix:** This is actually fine as written — the Foundation requirement is "verify the integrity of all tool executors before accepting requests" (first sentence). The journal check is explicitly Enterprise+. The R-ARCH range listing is correct because Foundation implementations still need the base R-ARCH-008 behavior (executor integrity check). No change needed, but confirm this interpretation is intentional.

**Assessment:** The tiered language within the requirement handles this correctly. **No change needed.**

## Pass 5: Implementing Engineer

### Finding C3-5.1 — Threat model table missing R-ARCH-008 entry

**Severity:** 🟡 Important

Section 12.2 (Known Attack Vectors) has an entry for "Gate crash as bypass" → R-ARCH-007. But R-ARCH-008 closes a different attack: "state manipulation during gate downtime." The restart integrity check isn't mapped in the threat table.

**Fix:** Add to Section 12.2:

| Attack | Mitigation |
|--------|-----------|
| State manipulation during gate downtime | R-ARCH-008: Restart integrity check (Enterprise+: journal verification) |

### Finding C3-5.2 — AOS-FORMAL-001 and AOS-PERSIST-001 not in Relationship table

**Severity:** 🟢 Advisory

Section 10.3 references AOS-FORMAL-001 (formal verification spec). Section 15 (Relationship to Other Standards) lists AOS-PERSIST-001 but NOT AOS-FORMAL-001.

**Fix:** Add to Section 15:

| Standard | Relationship |
|----------|-------------|
| AOS-FORMAL-001 | Formal Verification Specification — TLA+ model for Sovereign tier verification (Section 10.3) |

---

## AOS-CORE-001 Round 3 Summary

| Pass | Findings | Critical | Important | Advisory |
|------|----------|----------|-----------|----------|
| USPTO Examiner | 0 | 0 | 0 | 0 |
| Corporate Litigator | 1 | 0 | 0 | 1 |
| Penetration Tester | 2 | 0 | 1 | 1 |
| Standards Lawyer | 1 | 0 | 0 | 0 (false positive) |
| Implementing Engineer | 2 | 0 | 1 | 1 |
| **Total** | **6** | **0** | **2** | **3** (+1 false positive) |

**Zero criticals. Two importants. Three advisories. One false positive (correctly tiered language).**

---

# PART B: AOS-POL-001 v1.0 — Round 3 (627 lines)

---

## Pass 1: Hostile USPTO Examiner

No new findings. The `heritage_id: "none (original companion standard)"` is correct and explicit. The Sensitive Mission definition is a novel contribution properly established.

**Verdict: CLEAN**

## Pass 2: Corporate Litigator

No new findings. The template disclaimers are now strong enough ("informative examples, not compliance-ready configurations"). The anti-patterns section uses professional, non-disparaging language.

**Verdict: CLEAN**

## Pass 3: Penetration Tester

### Finding P3-3.1 — Healthcare template path traversal in denylist

**Severity:** 🟢 Advisory

Line 463: `pathDenylist: - "/data/output/summaries/../**"`

This denylist pattern uses `..` literally, which is unusual. It's trying to prevent path traversal *above* the summaries directory. But if the gate resolves paths to canonical form (per AOS-CORE-001 R-ENF-001), the traversal `../` would be resolved *before* the denylist is checked. The denylist pattern would never match because the resolved path wouldn't contain `..`.

**Assessment:** This is defense-in-depth. Even if it's redundant with R-ENF-001's canonical resolution, having it in the denylist costs nothing and signals intent. However, it could mislead implementers into thinking denylist patterns catch pre-resolution paths.

**Fix (optional):** Replace with a comment: `# Note: path traversal is handled by gate-level canonical resolution (AOS-CORE-001 R-ENF-001). This denylist entry is defense-in-depth.`

## Pass 4: Standards Lawyer

### Finding P3-4.1 — Section 11.2 item 7 uses normative language in informative section

**Severity:** 🟡 Important

Section 11 (Policy Change Management) is in Part II (Informative Implementation Guidance). But item 7 in Section 11.2 uses MUST language: "The gate MUST check the policy expiration time..."

Normative requirements (MUST) should be in Part I. Informative guidance uses SHOULD/RECOMMENDED.

**Fix:** Either:
- Move item 7 to Part I as a new normative requirement (e.g., R-POL-A-023 in Section 4.1), or
- Change to "The gate SHOULD check the policy expiration time..." to keep it informative

Given the security importance of this requirement, **promoting it to Part I as R-POL-A-023 is recommended.**

### Finding P3-4.2 — Section 4.3 uses normative language

**Severity:** 🟡 Important

Section 4.3 (Policy Format, line 140) says: "The policy integrity hash... MUST be computed over all fields..."

This is in Part I, which is correct. But it's in a subsection (4.3) that doesn't have an R-POL-A identifier. Every other normative requirement in Part I has an R-POL-A-XXX identifier for traceability.

**Fix:** Assign an identifier: "**R-POL-A-023:** The policy format is implementation-specific per AOS-CORE-001 Section 13.4..." (or renumber if item 7 from 11.2 takes R-POL-A-023).

## Pass 5: Implementing Engineer

### Finding P3-5.1 — Templates missing `sensitive` field in mission declaration

**Severity:** 🟡 Important

R-POL-A-003 now requires: "Whether the mission is classified as sensitive (see Sensitive Mission definition in Section 3)."

But none of the three reference templates include this field. The Code Review template (10.1) and Healthcare template (10.2) don't declare `sensitive: true/false` in their mission blocks.

**Fix:** Add to each template's mission block:
- Code Review: `sensitive: false`
- Healthcare: `sensitive: true  # HIPAA PHI`
- Financial: `sensitive: true  # PCI regulated`

---

## AOS-POL-001 Round 3 Summary

| Pass | Findings | Critical | Important | Advisory |
|------|----------|----------|-----------|----------|
| USPTO Examiner | 0 | 0 | 0 | 0 |
| Corporate Litigator | 0 | 0 | 0 | 0 |
| Penetration Tester | 1 | 0 | 0 | 1 |
| Standards Lawyer | 2 | 0 | 2 | 0 |
| Implementing Engineer | 1 | 0 | 1 | 0 |
| **Total** | **4** | **0** | **3** | **1** |

**Zero criticals. Three importants. One advisory.**

---

# Combined Round 3 Summary

| Standard | Findings | Critical | Important | Advisory |
|----------|----------|----------|-----------|----------|
| AOS-CORE-001 | 6 | 0 | 2 | 3 (+1 FP) |
| AOS-POL-001 | 4 | 0 | 3 | 1 |
| **Total** | **10** | **0** | **5** | **4** (+1 FP) |

## Convergence Trend

| Round | Findings | Critical | Important | Advisory |
|-------|----------|----------|-----------|----------|
| Round 1 (CORE only) | 19 | 2 | 14 | 3 |
| Round 2 (both) | 21 | 0 | 15 | 6 |
| Round 3 (both) | 10 | 0 | 5 | 4 |
| **Trajectory** | **↓ 52%** | **→ 0** | **↓ 67%** | **↓ 33%** |

The standards are converging. Finding count dropped 52% round-over-round. Criticals have been zero for two consecutive rounds. The remaining 5 importants are all structural hygiene (identifier assignment, threat table completeness, section placement) — not architectural gaps.

**Assessment: These standards are approaching publication readiness.** One more fix pass on the 5 importants and they're done.
