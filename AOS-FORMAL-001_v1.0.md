# AOS-FORMAL-001 v1.0 — Formal Verification Specification

**Status:** Published  
**Version:** 1.0  
**Date:** 2026-06-05  
**License:** CC-BY-4.0  
**Depends on:** AOS-CORE-001 v1.0, AOS-LANG-001 v1.0  

---

## 1. Abstract

This standard defines the formal properties that a conforming Deterministic Policy Gate (DPG) implementation MUST satisfy, expressed in a notation compatible with model checking (TLA⁺), theorem proving (Coq/Lean), and runtime verification (temporal assertions). It provides:

1. **Safety properties** — bad things never happen (e.g., "no tool call executes without a valid ALLOW decision")
2. **Liveness properties** — good things eventually happen (e.g., "every request eventually receives a decision")
3. **Invariants** — conditions that hold at every reachable state of the gate

This standard does NOT require that all implementations be formally verified. It defines WHAT must be verified, not HOW. Organizations may use model checking, theorem proving, runtime assertion monitoring, or exhaustive testing to demonstrate conformance.

---

## 2. Motivation

The DPG makes a singular architectural claim: **every tool call is evaluated deterministically against the active policy, and the decision is either ALLOW or DENY — never skip, never defer, never silently fail.** This claim is currently verified by:

- Conformance tests (TCK, 43 tests)
- Code review
- Hostile audits (12+ rounds)

These methods are necessary but insufficient. They verify behavior on tested inputs. Formal verification proves properties hold on ALL inputs — including inputs no human anticipated.

The purpose of this standard is to define the verification targets that make the DPG's architectural claim *provable*, not just *testable*.

---

## 3. Formal Model

### 3.1 System State

The DPG state machine is modeled as a tuple:

```
State = ⟨ P, B, A, J, E, H ⟩

Where:
  P : PolicyDocument | ⊥        — Active policy (⊥ = no policy loaded)
  B : ToolName → BudgetState    — Budget counters per tool
  A : ToolName → ApprovalStatus — Approval grants
  J : Sequence⟨JournalEntry⟩    — Append-only journal
  E : RequestId → Token         — Pending execution tokens
  H : SHA256                    — Last journal hash (chain head)
```

### 3.2 Transitions

The gate accepts the following events, each producing a deterministic state transition:

```
Events:
  LoadPolicy(p: PolicyDocument)
  EvaluateRequest(r: DecisionRequest) → DecisionResponse
  ConfirmExecution(id: RequestId, token: Token) → bool
  GrantApproval(tool: ToolName, type: ApprovalType)
  RevokeApproval(tool: ToolName)
  ResetBudgetWindow(tool: ToolName)
```

### 3.3 Decision Function

The core evaluation function is modeled as:

```
Evaluate(state: State, request: DecisionRequest) → ⟨Decision, State'⟩

Where Decision ∈ { ALLOW, DENY, ESCALATE }
And State' = State with updated B, J, E, H
```

---

## 4. Safety Properties

Safety properties assert that the system never enters a prohibited state. Each property is labeled with an identifier and its corresponding AOS-CORE-001 requirement.

### SAFE-001: No Execution Without Decision (R-ARCH-001)

> **For all reachable states and all tool invocations: a tool executes only if the gate has issued an ALLOW decision for that specific request.**

```tla+
SAFE_001 ==
  ∀ execution ∈ Executions :
    ∃ decision ∈ Journal :
      ∧ decision.requestId = execution.requestId
      ∧ decision.decision = "ALLOW"
      ∧ decision.timestamp ≤ execution.timestamp
```

**Informal:** No tool call can bypass the gate. If an execution occurs, there must be a corresponding ALLOW entry in the journal that precedes it temporally.

### SAFE-002: Fail-Closed (R-ARCH-004)

> **If any step of the evaluation pipeline throws an exception, raises an error, or enters an undefined state, the decision MUST be DENY.**

```tla+
SAFE_002 ==
  ∀ request ∈ Requests :
    LET result == TRY Evaluate(state, request) CATCH → ⟨"DENY", _⟩
    IN result.decision ∈ {"ALLOW", "DENY", "ESCALATE"}
    ∧ (ErrorOccurred(request) ⇒ result.decision = "DENY")
```

### SAFE-003: Deny-Wins (R-LANG-019)

> **If a resource appears in both an allowlist and a denylist, the denylist takes precedence.**

```tla+
SAFE_003 ==
  ∀ resource ∈ Resources, tool ∈ Tools :
    LET scope == tool.scope.constraints
    IN (MatchesAny(resource, scope.denylist) ∧ MatchesAny(resource, scope.allowlist))
       ⇒ ScopeCheck(tool, resource) = DENY
```

### SAFE-004: Budget Monotonicity (R-ENF-005)

> **Budget counters never decrease during normal operation. They only increase (on ALLOW) or reset (on window expiry).**

```tla+
SAFE_004 ==
  ∀ t ∈ ToolNames, i, j ∈ Nat :
    (i < j ∧ ¬WindowReset(t, i, j))
    ⇒ B'[t].calls[j] ≥ B[t].calls[i]
```

### SAFE-005: Journal Immutability (R-JRN-003)

> **No journal entry, once written, is ever modified or deleted. The journal is strictly append-only.**

```tla+
SAFE_005 ==
  ∀ i ∈ 1..Len(J), J' ∈ NextStates :
    (i ≤ Len(J)) ⇒ J'[i] = J[i]
```

### SAFE-006: Journal Integrity (R-JRN-004)

> **Every journal entry's hash is computed from its content concatenated with the previous entry's hash. The chain is verifiable.**

```tla+
SAFE_006 ==
  ∀ i ∈ 2..Len(J) :
    J[i].entryHash = SHA256(J[i].content ‖ J[i-1].entryHash)
```

### SAFE-007: No Policy Weakening (R-POL-003)

> **A loaded policy with a declared hash that does not match the computed hash MUST NOT be activated.**

```tla+
SAFE_007 ==
  ∀ p ∈ PolicyLoads :
    (p.declaredHash ≠ ⊥ ∧ p.declaredHash ≠ ComputeHash(p))
    ⇒ state.P = ⊥ ∨ state.P = previousPolicy
```

### SAFE-008: Scope Canonicalization (R-ENF-001)

> **All path arguments are canonicalized (symlinks resolved, `../` collapsed, null bytes rejected) before scope checking.**

```tla+
SAFE_008 ==
  ∀ request ∈ Requests :
    LET raw == request.arguments.path
        canon == Canonicalize(raw)
    IN ScopeCheck(tool, canon) = ScopeCheck(tool, Canonicalize(canon))
    ∧ (Contains(raw, "\0") ⇒ ScopeCheck(tool, raw) = DENY)
```

**Idempotency:** Canonicalization applied twice produces the same result as applied once. This prevents double-encoding attacks.

### SAFE-009: Execution Token Uniqueness

> **No two ALLOW decisions produce the same execution token.**

```tla+
SAFE_009 ==
  ∀ d1, d2 ∈ AllowDecisions :
    d1 ≠ d2 ⇒ d1.executionToken ≠ d2.executionToken
```

### SAFE-010: No Phantom Approvals

> **An approval can only be consumed if it was explicitly granted. No tool starts in an approved state.**

```tla+
SAFE_010 ==
  ∀ tool ∈ RequiresApproval :
    InitialState.A[tool] = NOT_GRANTED
    ∧ (A[tool] = GRANTED ⇒ ∃ grant ∈ GrantEvents : grant.tool = tool)
```

---

## 5. Liveness Properties

Liveness properties assert that desirable outcomes eventually occur. These are weaker than safety properties but important for system usability.

### LIVE-001: Decision Completeness

> **Every well-formed request eventually receives a decision (ALLOW, DENY, or ESCALATE). The gate never silently drops a request.**

```tla+
LIVE_001 ==
  ∀ request ∈ WellFormedRequests :
    ◇ (∃ response ∈ Responses : response.requestId = request.id)
```

**Constraint:** This property holds under fair scheduling. A gate under infinite load may violate this — liveness is bounded by the system's processing capacity.

### LIVE-002: Budget Recovery

> **After a budget window expires, budget counters are reset. An agent denied due to budget exhaustion will eventually be able to make requests again.**

```tla+
LIVE_002 ==
  ∀ tool ∈ Tools :
    □ (BudgetExhausted(tool) ⇒ ◇ BudgetAvailable(tool))
```

### LIVE-003: Approval Resolution

> **An escalated request either receives approval (transitioning to ALLOW) or times out (transitioning to DENY). It does not remain pending indefinitely.**

```tla+
LIVE_003 ==
  ∀ escalation ∈ Escalations :
    ◇ (Approved(escalation) ∨ TimedOut(escalation))
```

### LIVE-004: Journal Growth

> **Every decision (ALLOW, DENY, ESCALATE) produces exactly one journal entry. The journal grows monotonically.**

```tla+
LIVE_004 ==
  ∀ decision ∈ Decisions :
    Len(J') = Len(J) + 1
    ∧ J'[Len(J')] corresponds to decision
```

---

## 6. Invariants

Invariants hold at every reachable state of the system.

### INV-001: Policy Consistency

> **If a policy is loaded, its hash matches the computed hash of its content.**

```tla+
INV_001 ==
  state.P ≠ ⊥ ⇒ state.P.policyHash = ComputeHash(state.P)
```

### INV-002: Budget Non-Negative

> **Budget counters are always non-negative.**

```tla+
INV_002 ==
  ∀ tool ∈ ToolNames :
    B[tool].calls ≥ 0 ∧ B[tool].bytes ≥ 0
```

### INV-003: Journal Chain Validity

> **The journal hash chain is valid at every state. Every entry's hash is derivable from its content and the previous entry's hash.**

```tla+
INV_003 ==
  VerifyChain(J) = TRUE
```

### INV-004: Gate State Determinism

> **Given the same State and the same DecisionRequest, Evaluate always produces the same Decision.**

```tla+
INV_004 ==
  ∀ s ∈ States, r ∈ Requests :
    Evaluate(s, r).decision = Evaluate(s, r).decision
```

**Note:** This is the fundamental determinism property. It prohibits the use of non-deterministic inputs (random numbers, wall-clock time) in the decision pipeline. The only allowed source of non-determinism is the request ID (UUID), which does not affect the decision itself.

### INV-005: Fail-Closed State

> **If no policy is loaded, every request is denied.**

```tla+
INV_005 ==
  state.P = ⊥ ⇒ ∀ r ∈ Requests : Evaluate(state, r).decision = "DENY"
```

### INV-006: Epoch Monotonicity (PERSIST-001)

> **State epochs strictly increase across checkpoints.**

```tla+
INV_006 ==
  ∀ c1, c2 ∈ Checkpoints :
    c1.timestamp < c2.timestamp ⇒ c1.epoch < c2.epoch
```

---

## 7. Verification Methods

This standard defines WHAT must be verified. Organizations may use any of the following methods to demonstrate conformance:

### 7.1 Model Checking (Recommended for FORMAL-L1)

Use TLA⁺, SPIN, or NuSMV to model the gate state machine and verify safety properties SAFE-001 through SAFE-010 and invariants INV-001 through INV-006.

**Advantages:** Exhaustive state exploration, automatic counterexample generation.  
**Limitations:** State explosion for large policy documents. Recommended for policies with ≤ 10 tools and bounded budget values.

### 7.2 Theorem Proving (Recommended for FORMAL-L2)

Use Coq, Lean, or Isabelle/HOL to encode the gate specification and prove the safety/liveness/invariant properties as theorems.

**Advantages:** Unbounded verification, proofs are machine-checkable.  
**Limitations:** Requires significant expertise, proofs are labor-intensive.

### 7.3 Runtime Verification (Recommended for FORMAL-L1)

Instrument the gate implementation with runtime assertions that check safety properties and invariants on every state transition.

**Advantages:** Low barrier to entry, catches violations in production.  
**Limitations:** Verifies executed paths only, not all possible paths.

### 7.4 Property-Based Testing (Recommended for all levels)

Use QuickCheck, Hypothesis, or fast-check to generate random requests and verify that safety properties hold for all generated inputs.

**Advantages:** Excellent coverage for edge cases, relatively easy to implement.  
**Limitations:** Not exhaustive — may miss corner cases that random generation doesn't produce.

---

## 8. Conformance Levels

### 8.1 Level Definitions

| Level | Requirements | Verification Method |
|-------|-------------|-------------------|
| **FORMAL-L0 (Tested)** | All TCK tests pass. Runtime assertions for INV-001 through INV-005. | TCK + runtime assertions |
| **FORMAL-L1 (Model Checked)** | L0 + model checking of SAFE-001 through SAFE-005 against a TLA⁺ model with ≥ 3 tools and ≥ 10 requests. | TLA⁺/SPIN with bounded model |
| **FORMAL-L2 (Proven)** | L1 + theorem proofs for SAFE-001, SAFE-002, SAFE-003, INV-004, INV-005 in Coq/Lean. | Machine-checked proofs |
| **FORMAL-L3 (Certified)** | L2 + independent third-party verification of proofs. Proof artifacts published. | Independent review + publication |

### 8.2 Level Mapping to Tiers

| Gate Tier | Minimum FORMAL Level | Recommended FORMAL Level |
|-----------|---------------------|-------------------------|
| Foundation | FORMAL-L0 | FORMAL-L0 |
| Enterprise | FORMAL-L0 | FORMAL-L1 |
| Sovereign | FORMAL-L1 | FORMAL-L2 or L3 |

**R-FORMAL-001:** Sovereign tier implementations MUST achieve at minimum FORMAL-L1 (model-checked safety properties). This ensures that the gate's safety claims are verified beyond testing.

---

## 9. Reference TLA⁺ Specification (Informative)

The following is an informative TLA⁺ module that models the core DPG. Implementors may use this as a starting point for model checking.

```tla+
---- MODULE DPG ----
EXTENDS Naturals, Sequences, FiniteSets

CONSTANTS Tools, MaxCalls, MaxRequests
VARIABLES state, journal, budgets, approvals, pending

TypeInvariant ==
  ∧ state ∈ {"NO_POLICY", "ACTIVE", "FAIL_CLOSED"}
  ∧ journal ∈ Seq([
      requestId : Nat,
      tool : Tools,
      decision : {"ALLOW", "DENY", "ESCALATE"},
      hash : STRING
    ])
  ∧ budgets ∈ [Tools → 0..MaxCalls]
  ∧ approvals ∈ SUBSET Tools
  ∧ pending ∈ SUBSET Nat

Init ==
  ∧ state = "NO_POLICY"
  ∧ journal = << >>
  ∧ budgets = [t ∈ Tools ↦ 0]
  ∧ approvals = {}
  ∧ pending = {}

\* Load a policy — transitions from NO_POLICY to ACTIVE
LoadPolicy ==
  ∧ state' = "ACTIVE"
  ∧ budgets' = [t ∈ Tools ↦ 0]
  ∧ approvals' = {}
  ∧ UNCHANGED ⟨journal, pending⟩

\* Evaluate a request for tool t
Evaluate(t) ==
  ∧ state = "ACTIVE"
  ∧ t ∈ Tools
  ∧ LET allowed ==
        ∧ budgets[t] < MaxCalls
        ∧ t ∈ Tools  \* Tool exists in policy
     IN
     IF allowed
     THEN
       ∧ budgets' = [budgets EXCEPT ![t] = @ + 1]
       ∧ journal' = Append(journal, [
            requestId ↦ Len(journal) + 1,
            tool ↦ t,
            decision ↦ "ALLOW",
            hash ↦ "computed"
          ])
       ∧ pending' = pending ∪ {Len(journal) + 1}
       ∧ UNCHANGED ⟨state, approvals⟩
     ELSE
       ∧ journal' = Append(journal, [
            requestId ↦ Len(journal) + 1,
            tool ↦ t,
            decision ↦ "DENY",
            hash ↦ "computed"
          ])
       ∧ UNCHANGED ⟨state, budgets, approvals, pending⟩

\* Evaluate with no policy — always DENY
EvaluateNoPolicy(t) ==
  ∧ state = "NO_POLICY"
  ∧ journal' = Append(journal, [
      requestId ↦ Len(journal) + 1,
      tool ↦ t,
      decision ↦ "DENY",
      hash ↦ "computed"
    ])
  ∧ UNCHANGED ⟨state, budgets, approvals, pending⟩

\* Confirm execution
Confirm(id) ==
  ∧ id ∈ pending
  ∧ pending' = pending \ {id}
  ∧ UNCHANGED ⟨state, journal, budgets, approvals⟩

\* Safety: No ALLOW without budget
SafeBudget ==
  ∀ i ∈ 1..Len(journal) :
    journal[i].decision = "ALLOW" ⇒
    budgets[journal[i].tool] ≤ MaxCalls

\* Safety: Fail-closed
SafeFailClosed ==
  state = "NO_POLICY" ⇒
  ∀ i ∈ 1..Len(journal) :
    (journal[i].decision ≠ "ALLOW")

\* Invariant: Journal only grows
JournalMonotonic ==
  Len(journal') ≥ Len(journal)

Next ==
  ∨ LoadPolicy
  ∨ ∃ t ∈ Tools : Evaluate(t)
  ∨ ∃ t ∈ Tools : EvaluateNoPolicy(t)
  ∨ ∃ id ∈ pending : Confirm(id)

Spec == Init ∧ □[Next]_⟨state, journal, budgets, approvals, pending⟩
====
```

---

## 10. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| AOS-CORE-001 v1.0 | Defines the gate behavior that FORMAL-001 formally specifies |
| AOS-LANG-001 v1.0 | Defines the policy language whose semantics are formalized |
| AOS-PERSIST-001 v1.0 | Defines persistence properties (INV-006, epoch monotonicity) |
| AOS-CRYPTO-001 v1.0 | Defines cryptographic properties (SAFE-006, journal integrity) |
| AOS-SEC-001 v1.0 | Security properties map to safety properties in this standard |

---

## Appendix A: Property-to-Requirement Traceability

| Property | AOS-CORE-001 Requirement | Category |
|----------|------------------------|----------|
| SAFE-001 | R-ARCH-001 | Safety |
| SAFE-002 | R-ARCH-004 | Safety |
| SAFE-003 | R-LANG-019 (via AOS-LANG-001) | Safety |
| SAFE-004 | R-ENF-005 | Safety |
| SAFE-005 | R-JRN-003 | Safety |
| SAFE-006 | R-JRN-004 | Safety |
| SAFE-007 | R-POL-003 | Safety |
| SAFE-008 | R-ENF-001 | Safety |
| SAFE-009 | (derived from R-ARCH-001) | Safety |
| SAFE-010 | R-APR-001 | Safety |
| LIVE-001 | R-ARCH-001 (completeness) | Liveness |
| LIVE-002 | R-ENF-005 (recovery) | Liveness |
| LIVE-003 | R-APR-003 | Liveness |
| LIVE-004 | R-JRN-001 | Liveness |
| INV-001 | R-POL-003 | Invariant |
| INV-002 | R-ENF-005 | Invariant |
| INV-003 | R-JRN-004 | Invariant |
| INV-004 | R-ARCH-002 | Invariant |
| INV-005 | R-ARCH-004 | Invariant |
| INV-006 | R-PERSIST-005 | Invariant |

---

## Appendix B: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-05 | Initial standard release |

---

## Appendix C: AI Disclosure

This document was developed through a collaborative process. The original architecture, strategic analysis, and editorial decisions were provided by the author. AI tools assisted with technical review, adversarial analysis, drafting, and structural refinement under human editorial control.

---

*AOS-FORMAL-001 v1.0 — Formal Verification Specification*  
*Published by the AOS Foundation under CC-BY-4.0*  
*Prior art established: 2026-06-05*  
*"AOS," "AOS Foundation," and "Deterministic Policy Gate" are trademarks of AOS Foundation. CC-BY-4.0 governs copyright licensing only; trademark rights are reserved.*

---

## About the AOS Foundation

The AOS Foundation develops and publishes open standards for autonomous AI governance. The Foundation's mission is to ensure that AI systems operate within deterministic, auditable, human-governed boundaries — and that the standards defining those boundaries are freely available to everyone.

Standards governance is conducted through public GitHub repositories. Contributions, issues, and review requests are welcome from all parties.

- Standards repository: [github.com/genesalvatore/aos-governance-standards](https://github.com/genesalvatore/aos-governance-standards)
- Website: [aos-governance.com](https://aos-governance.com)
