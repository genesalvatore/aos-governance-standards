# AOS-CORE-001: Reference Implementation Specification

**Document ID:** AOS-EVIDENCE-006  
**Author:** Silas (Antigravity Agent)  
**Date:** 2026-06-03  
**Purpose:** Language-agnostic reference implementation for DPG enforcement pipeline + conformance test harness

---

## 1. Gate Architecture

```
┌──────────────┐     Unix Socket / mTLS      ┌──────────────────┐
│              │ ─────────────────────────── │                  │
│    AGENT     │    Request { tool, args }    │   POLICY GATE    │
│  (untrusted) │ ◄─────────────────────────  │   (trusted)      │
│              │    Response { attestation }  │                  │
└──────────────┘                              ├──────────────────┤
                                              │  Policy Engine   │
                                              │  Scope Validator │
                                              │  Budget Manager  │
                                              │  Category Engine │
                                              │  Approval Manager│
                                              │  Attestation Svc │
                                              │  Journal Writer  │
                                              ├──────────────────┤
                                              │  Tool Executors  │
                                              │  (sandboxed)     │
                                              └──────────────────┘
```

---

## 2. Core Data Structures

```pseudocode
// === REQUEST ===
struct ToolRequest {
    agent_id:       string          // R-ARCH-002: unique per-agent
    session_id:     string          // session tracking
    request_id:     string          // unique per-request (UUID v4)
    tool_name:      string          // e.g., "write_file", "http_get"
    arguments:      map<string,any> // tool-specific arguments
    timestamp:      datetime        // request creation time
}

// === POLICY ===
struct Policy {
    metadata:       PolicyMetadata
    mission:        MissionDeclaration
    tools:          list<ToolDefinition>
    budgets:        map<string, BudgetConfig>
    categories:     CategoryConfig
    approval:       ApprovalConfig
    integrity_hash: string          // R-POL-003: SHA-256 of canonical form
    vcs_anchor:     string          // R-POL-004: git commit hash
}

struct ToolDefinition {
    name:           string
    executor:       string          // path to executor binary
    risk_tier:      enum {T1, T2, T3, T4}
    scope:          ScopeConfig
    approval_mode:  enum {NONE, FIRST_USE, EVERY_USE}
    category_check: bool
}

struct ScopeConfig {
    path_allowlist: list<string>    // canonical absolute paths
    path_denylist:  list<string>    // always checked, overrides allow
    domain_allowlist: list<string>  // for network tools
    argument_constraints: map<string, Constraint>
}

struct BudgetConfig {
    max_calls:      int             // per window
    window_seconds: int             // reset interval
    current_count:  int             // persisted counter
    window_start:   datetime        // current window start
}

// === ATTESTATION ===
struct Attestation {
    version:        string          // "1.0"
    gate_id:        string          // gate instance identifier
    agent_id:       string
    request_id:     string
    tool_name:      string
    arguments_hash: string          // SHA-256 of canonical arguments
    policy_hash:    string          // R-POL-003
    decision:       enum {ALLOW, DENY}
    reason:         string          // internal only; opaque at Enterprise+
    nonce:          bytes           // R-ATT-002: ≥128 bits random
    timestamp:      datetime
    approval_ref:   string?         // if approval was required
    signature:      bytes           // R-ATT-003: Ed25519 or equivalent
}

// === JOURNAL ENTRY ===
struct JournalEntry {
    entry_type:     enum {PRE_EXECUTION, POST_EXECUTION}
    timestamp:      datetime
    agent_id:       string
    request_id:     string
    tool_name:      string
    arguments_hash: string
    decision:       enum {ALLOW, DENY}
    denial_reason:  string?
    attestation_ref: string         // reference to attestation
    result_summary: string?         // post-execution only
    chain_hash:     string?         // Enterprise: H(prev_entry || this_entry)
    signature:      bytes?          // Enterprise: gate signature
}
```

---

## 3. The 11-Step Enforcement Pipeline

This is the core of the DPG. Every tool request follows this exact sequence.

```pseudocode
function enforce(request: ToolRequest, policy: Policy) -> EnforcementResult:
    
    // ─── STEP 1: POLICY INTEGRITY ───
    // R-POL-003: Verify policy hasn't been tampered with
    computed_hash = sha256(canonical(policy))
    if computed_hash != policy.integrity_hash:
        journal_write(PRE_EXECUTION, request, DENY, "POLICY_INTEGRITY_FAILURE")
        return DENY("Policy integrity check failed")  // R-ARCH-004: fail-closed
    
    // ─── STEP 2: TOOL LOOKUP ───
    // R-POL-002: Deny-by-default
    tool_def = policy.tools.find(t => t.name == request.tool_name)
    if tool_def == null:
        journal_write(PRE_EXECUTION, request, DENY, "TOOL_NOT_IN_POLICY")
        return DENY("Tool not authorized")
    
    // ─── STEP 3: SCOPE VALIDATION ───
    // R-ENF-001: Canonical path resolution
    if tool_def.scope.path_allowlist is not empty:
        resolved_path = resolve_canonical(request.arguments["path"])
        // Resolve symlinks, normalize, make absolute
        // O_NOFOLLOW equivalent — no symlink following
        
        // Check denylist FIRST (overrides allowlist)
        if any(pattern in tool_def.scope.path_denylist matches resolved_path):
            journal_write(PRE_EXECUTION, request, DENY, "PATH_DENIED")
            return DENY("Scope violation")
        
        // Check allowlist
        if not any(pattern in tool_def.scope.path_allowlist matches resolved_path):
            journal_write(PRE_EXECUTION, request, DENY, "PATH_NOT_ALLOWED")
            return DENY("Scope violation")
    
    // R-ENF-003: URL/domain validation
    if tool_def.scope.domain_allowlist is not empty:
        parsed_url = parse_url(request.arguments["url"])
        // Validate scheme, strip userinfo, resolve authority
        
        if parsed_url.domain not in tool_def.scope.domain_allowlist:
            journal_write(PRE_EXECUTION, request, DENY, "DOMAIN_NOT_ALLOWED")
            return DENY("Scope violation")
        
        // R-ENF-004 (Enterprise): DNS pinning
        if tier >= ENTERPRISE:
            resolved_ip = dns_resolve(parsed_url.domain)
            if is_private_ip(resolved_ip) or is_reserved_ip(resolved_ip):
                journal_write(PRE_EXECUTION, request, DENY, "DNS_PINNING_PRIVATE")
                return DENY("Scope violation")
    
    // R-ENF-002: Argument validation
    for constraint in tool_def.scope.argument_constraints:
        if not constraint.validate(request.arguments):
            journal_write(PRE_EXECUTION, request, DENY, "ARGUMENT_INVALID")
            return DENY("Argument validation failed")
    
    // ─── STEP 4: BUDGET CHECK ───
    // R-ENF-005: Budget enforcement
    budget = policy.budgets[request.tool_name]
    if budget is not null:
        // Check window reset
        if now() - budget.window_start > budget.window_seconds:
            budget.window_start = now()
            budget.current_count = 0
            persist_budget(budget)  // R-ENF-005: crash-durable
        
        // R-ENF-007: Budget exceeded → DENY
        if budget.current_count >= budget.max_calls:
            journal_write(PRE_EXECUTION, request, DENY, "BUDGET_EXCEEDED")
            return DENY("Budget exceeded")
        
        // Increment BEFORE execution (counts attempts, not completions)
        budget.current_count += 1
        persist_budget(budget)
    
    // ─── STEP 5: CATEGORY CHECK ───
    // R-ENF-008: Category enforcement
    if tool_def.category_check:
        classification = classify_intent(request.tool_name, request.arguments)
        
        // R-ENF-009: Low confidence → DENY
        if classification.confidence < CONFIDENCE_THRESHOLD:
            journal_write(PRE_EXECUTION, request, DENY, "CATEGORY_LOW_CONFIDENCE")
            return DENY("Category check failed")
        
        if classification.category in policy.categories.prohibited:
            journal_write(PRE_EXECUTION, request, DENY, "CATEGORY_PROHIBITED")
            return DENY("Category violation")
    
    // ─── STEP 6: APPROVAL CHECK ───
    // R-APR-001: Human approval for flagged tools
    if tool_def.approval_mode == EVERY_USE:
        approval = request_approval(request, tool_def)  // R-APR-002: out-of-band
        if not approval.granted:
            journal_write(PRE_EXECUTION, request, DENY, "APPROVAL_DENIED")
            return DENY("Approval denied")
        // R-APR-003: Verify cryptographic token
        if not verify_approval_token(approval.token, request):
            journal_write(PRE_EXECUTION, request, DENY, "APPROVAL_TOKEN_INVALID")
            return DENY("Approval verification failed")
    
    elif tool_def.approval_mode == FIRST_USE:
        if not has_prior_approval(request.agent_id, request.tool_name):
            approval = request_approval(request, tool_def)
            if not approval.granted:
                journal_write(PRE_EXECUTION, request, DENY, "APPROVAL_DENIED")
                return DENY("Approval denied")
            if not verify_approval_token(approval.token, request):
                journal_write(PRE_EXECUTION, request, DENY, "APPROVAL_TOKEN_INVALID")
                return DENY("Approval verification failed")
            record_approval(request.agent_id, request.tool_name, approval)
    
    // ─── STEP 7: PRE-EXECUTION JOURNAL ───
    // R-JRN-001: Log before execution
    journal_write(PRE_EXECUTION, request, ALLOW, null)
    
    // ─── STEP 8: GENERATE ATTESTATION ───
    // R-ATT-001: Signed attestation
    nonce = crypto_random_bytes(16)  // R-ATT-002: ≥128 bits
    
    // R-ATT-006 item 6: Nonce uniqueness check
    if nonce_registry.contains(nonce):
        // Astronomically unlikely with 128-bit random, but check anyway
        journal_write(PRE_EXECUTION, request, DENY, "NONCE_COLLISION")
        return DENY("Internal error")
    nonce_registry.add(nonce)  // R-ATT-009: durable registry
    
    attestation = Attestation {
        version: "1.0",
        gate_id: GATE_ID,
        agent_id: request.agent_id,
        request_id: request.request_id,
        tool_name: request.tool_name,
        arguments_hash: sha256(canonical(request.arguments)),
        policy_hash: policy.integrity_hash,
        decision: ALLOW,
        nonce: nonce,
        timestamp: now(),
        approval_ref: approval?.token_id,
        signature: sign(GATE_PRIVATE_KEY, attestation_payload)  // R-ATT-004
    }
    
    // ─── STEP 9: EXECUTE TOOL ───
    // R-ARCH-005: Tool executor within gate boundary
    result = execute_tool(tool_def.executor, request.arguments, attestation)
    
    // ─── STEP 10: POST-EXECUTION JOURNAL ───
    // R-JRN-001: Log after execution
    journal_write(POST_EXECUTION, request, ALLOW, result.summary)
    
    // ─── STEP 11: RETURN RESULT ───
    return AllowResult {
        attestation: attestation,
        tool_result: result
    }


// ─── ERROR HANDLER ───
// R-ARCH-004: ANY error in steps 1-11 → DENY
function enforce_safe(request, policy) -> EnforcementResult:
    try:
        return enforce(request, policy)
    catch Exception as e:
        journal_write(PRE_EXECUTION, request, DENY, "INTERNAL_ERROR: " + e.type)
        return DENY("Internal error")  // fail-closed
```

---

## 4. Gate Lifecycle

```pseudocode
function gate_startup():
    // R-ARCH-008: Restart integrity check
    policy = load_policy()
    if sha256(canonical(policy)) != stored_policy_hash:
        log_critical("Policy integrity failure on startup")
        alert_out_of_band("Gate startup integrity failure")
        // Do NOT start — fail-closed
        exit(1)
    
    // Restore durable state
    budgets = restore_budgets()         // R-ENF-005: crash-durable
    nonce_registry = restore_nonces()   // R-ATT-009: durable registry
    
    // Verify journal chain (Enterprise)
    if tier >= ENTERPRISE:
        if not verify_journal_chain():
            log_critical("Journal chain integrity failure")
            alert_out_of_band("Journal tampered")
            exit(1)
    
    // Start listening
    if tier >= ENTERPRISE:
        listener = create_mtls_listener(GATE_CERT, GATE_KEY)  // R-ENT-001
    else:
        listener = create_unix_socket_listener(GATE_SOCKET)
        // R-ARCH-001: Verify peer credentials via SO_PEERCRED
    
    // Register signal handlers
    on_signal(SIGTERM, graceful_shutdown)
    on_signal(SIGCHLD, executor_died)    // R-ARCH-007
    
    log("Gate started. Policy hash: " + policy.integrity_hash)


function gate_shutdown():
    // Persist all durable state
    persist_budgets()
    persist_nonce_registry()
    flush_journal()
    
    // R-ARCH-007: Kill all executor processes
    for executor in active_executors:
        kill(executor.pid, SIGTERM)
        wait(executor.pid, timeout=5)
        if executor.still_alive:
            kill(executor.pid, SIGKILL)
    
    log("Gate shutdown complete")
```

---

## 5. Conformance Test Harness

This is the CompliancePro test runner specification. Each test is a concrete, automatable scenario.

```pseudocode
// ═══════════════════════════════════════
// FOUNDATION TESTS (F-001 through F-017)
// ═══════════════════════════════════════

test F_001_gate_process_isolation():
    """Agent and gate run in separate OS processes"""
    agent_pid = get_agent_pid()
    gate_pid = get_gate_pid()
    assert agent_pid != gate_pid
    assert get_process_user(agent_pid) != get_process_user(gate_pid)
    // Verify no shared memory segments
    assert no_shared_memory(agent_pid, gate_pid)

test F_002_deny_unlisted_tool():
    """Request for tool not in policy → DENY"""
    policy = load_test_policy()  // contains "write_file" only
    result = send_request(tool="delete_database", args={})
    assert result.decision == DENY
    assert journal_contains(request_id, decision=DENY)

test F_003_scope_path_enforcement():
    """Write to path outside allowlist → DENY"""
    policy = load_test_policy()  // pathAllowlist: ["/home/agent/output/"]
    result = send_request(tool="write_file", args={path: "/etc/passwd"})
    assert result.decision == DENY

test F_004_scope_path_traversal():
    """Path traversal attempt → DENY"""
    result = send_request(tool="write_file", 
        args={path: "/home/agent/output/../../etc/passwd"})
    assert result.decision == DENY

test F_005_scope_symlink():
    """Symlink pointing outside allowlist → DENY"""
    // Create symlink: /home/agent/output/link → /etc/
    create_symlink("/home/agent/output/link", "/etc/")
    result = send_request(tool="write_file", 
        args={path: "/home/agent/output/link/passwd"})
    assert result.decision == DENY

test F_006_budget_enforcement():
    """Exceed budget limit → DENY"""
    policy = load_test_policy()  // write_file budget: max_calls=3
    send_request(tool="write_file", args={path: "/home/agent/output/1.txt"})  // 1
    send_request(tool="write_file", args={path: "/home/agent/output/2.txt"})  // 2
    send_request(tool="write_file", args={path: "/home/agent/output/3.txt"})  // 3
    result = send_request(tool="write_file", 
        args={path: "/home/agent/output/4.txt"})  // 4 → over budget
    assert result.decision == DENY

test F_007_category_denied():
    """Request classified as prohibited category → DENY"""
    policy = load_test_policy()  // prohibited: ["credential_access"]
    result = send_request(tool="read_file", args={path: "/home/agent/.ssh/id_rsa"})
    assert result.decision == DENY

test F_008_error_failclosed():
    """Internal error during enforcement → DENY"""
    // Inject fault: corrupt policy mid-request
    inject_fault("policy_corruption")
    result = send_request(tool="write_file", args={path: "/home/agent/output/ok.txt"})
    assert result.decision == DENY

test F_009_attestation_valid():
    """Valid request → attestation with verifiable signature"""
    result = send_request(tool="write_file", 
        args={path: "/home/agent/output/valid.txt", content: "hello"})
    assert result.decision == ALLOW
    assert result.attestation is not null
    assert verify_signature(GATE_PUBLIC_KEY, result.attestation)
    assert result.attestation.tool_name == "write_file"
    assert result.attestation.nonce.length >= 16

test F_010_attestation_fields():
    """Attestation contains all required fields"""
    result = send_allowed_request()
    att = result.attestation
    assert att.version is not null
    assert att.gate_id is not null
    assert att.agent_id is not null
    assert att.request_id is not null
    assert att.tool_name is not null
    assert att.arguments_hash is not null
    assert att.policy_hash is not null
    assert att.decision == ALLOW
    assert att.nonce is not null
    assert att.timestamp is not null
    assert att.signature is not null

test F_011_journal_prepost():
    """Both pre and post execution journal entries exist"""
    result = send_allowed_request()
    entries = get_journal_entries(result.request_id)
    assert entries.count == 2
    assert entries[0].entry_type == PRE_EXECUTION
    assert entries[1].entry_type == POST_EXECUTION
    assert entries[0].timestamp <= entries[1].timestamp

test F_012_policy_hash_verify():
    """Gate rejects tampered policy"""
    // Modify policy file without updating hash
    tamper_policy_file()
    result = send_request(tool="write_file", args={path: "/home/agent/output/test.txt"})
    assert result.decision == DENY

test F_013_approval_required():
    """T3 tool without approval → DENY or approval prompt"""
    policy = load_test_policy()  // write_file approval_mode: EVERY_USE
    result = send_request_without_approval(tool="write_file", args={...})
    assert result.decision == DENY or result.status == AWAITING_APPROVAL

test F_014_rate_limiting():
    """Rapid requests are throttled"""
    results = []
    for i in 1..200:
        results.append(send_request_async(tool="read_file", args={...}))
    denied_count = results.count(r => r.decision == DENY and r.reason == "RATE_LIMITED")
    assert denied_count > 0  // some requests should be rate-limited

test F_015_deny_by_default():
    """Empty policy denies all tool requests"""
    load_empty_policy()  // no tools defined
    result = send_request(tool="write_file", args={...})
    assert result.decision == DENY
    result2 = send_request(tool="read_file", args={...})
    assert result2.decision == DENY

test F_016_nonce_replay():
    """Gate restarts; previously used nonce replayed → DENY"""
    result1 = send_allowed_request()
    nonce = result1.attestation.nonce
    restart_gate()
    // Attempt to use same nonce (simulated replay)
    assert nonce_registry_contains(nonce)  // survived restart

test F_017_restart_integrity():
    """Gate restart with corrupted state → fail to start"""
    corrupt_budget_file()
    try:
        restart_gate()
        assert false  // should not reach here
    catch GateStartupFailure:
        assert true  // correct: failed to start
```

---

## 6. Implementation Notes

### 6.1 Minimum Viable Foundation Implementation

A Foundation-tier DPG can be built with:
- **Language:** Python, Go, Rust, or Node.js
- **IPC:** Unix domain socket (Python: `socket.AF_UNIX`)
- **Crypto:** Ed25519 (Python: `cryptography` library)
- **Journal:** Append-only file with `chattr +a` on Linux
- **Budget:** JSON file with atomic writes
- **Policy:** YAML parsed at startup

**Estimated build time:** 2-4 weeks for a competent engineer.

### 6.2 CompliancePro Test Runner Architecture

```
CompliancePro
├── test_runner/
│   ├── foundation_tests.py    # F-001 through F-017
│   ├── enterprise_tests.py    # E-001 through E-010
│   ├── sovereign_tests.py     # S-001 through S-006
│   └── harness.py             # Test orchestration
├── policy_linter/
│   ├── yaml_parser.py         # Parse policy YAML
│   ├── rules.py               # R-POL-A-001 through R-POL-A-025
│   ├── antipatterns.py        # Section 8 detection
│   └── report.py              # Generate compliance report
├── api/
│   ├── gate_probe.py          # Connect to customer's gate
│   ├── results.py             # Collect and store results
│   └── certificate.py         # Generate signed certificate
└── dashboard/
    ├── compliance_score.py    # Overall score calculation
    ├── trend_graph.py         # Historical compliance trends
    └── alerts.py              # Regression notifications
```

---

*AOS-EVIDENCE-006 — Reference Implementation Specification*  
*Compiled by Silas (Antigravity Agent)*  
*Prior art established: 2026-06-03*
