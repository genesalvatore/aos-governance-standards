# AOS-CORE-001: Performance & Latency Analysis

**Document ID:** AOS-EVIDENCE-007  
**Analyst:** Silas (Antigravity Agent)  
**Date:** 2026-06-03  
**Purpose:** Quantify DPG enforcement overhead and address the #1 enterprise adoption objection

---

## The Question Every CTO Asks

> "How much latency does DPG add to my agent's operations?"

**Answer: Less than the network round-trip of a single API call.**

---

## Per-Step Latency Model

### Foundation Tier

| Step | Operation | Estimated Latency | Notes |
|------|-----------|------------------|-------|
| 1 | Policy integrity (SHA-256 hash) | ~0.1ms | Cached after first verification; re-verify on policy reload only |
| 2 | Tool lookup (map/dict) | ~0.01ms | O(1) hash map lookup |
| 3 | Scope validation (path resolution) | ~0.5ms | `realpath()` syscall + pattern match |
| 4 | Budget check (counter read/write) | ~0.2ms | In-memory counter with periodic flush |
| 5 | Category classification | ~1-3ms | Depends on classifier complexity; simple rule-based: <1ms; LLM-based: variable |
| 6 | Approval check (cache lookup) | ~0.01ms | Previously approved → cache hit; new approval → async wait (not counted) |
| 7 | Pre-execution journal write | ~0.5ms | Append to file; buffered write |
| 8 | Attestation generation (Ed25519 sign) | ~0.05ms | Ed25519 is extremely fast (~60K signatures/sec) |
| 9 | Tool execution | Variable | The actual work — DPG doesn't add to this |
| 10 | Post-execution journal write | ~0.5ms | Same as step 7 |
| 11 | Return result | ~0.01ms | Serialize attestation |
| **Total (Foundation)** | | **~2-5ms** | Without category classification: ~1.5ms |

### Enterprise Tier (adds to Foundation)

| Additional Operation | Estimated Latency | Notes |
|---------------------|------------------|-------|
| mTLS handshake | ~2-5ms (first connection); 0ms (connection reuse) | One-time per session |
| DNS resolution + pinning | ~1-2ms | Cached after first resolution |
| Journal chain hash | ~0.1ms | SHA-256 of previous entry + current |
| Journal signing | ~0.05ms | Ed25519 |
| Opaque denial formatting | ~0.01ms | Trivial string replacement |
| **Total (Enterprise add)** | | **~3-7ms first call; <1ms subsequent** |

### Sovereign Tier (adds to Enterprise)

| Additional Operation | Estimated Latency | Notes |
|---------------------|------------------|-------|
| HSM signing (via PKCS#11) | ~5-20ms | Hardware-dependent; network HSM adds latency |
| Hardware attestation verification | ~2-5ms | TPM quote verification |
| TLA+ model check (offline) | N/A | Not per-request; done at deployment time |
| **Total (Sovereign add)** | | **~7-25ms** |

---

## Total Latency Summary

| Tier | First Request | Subsequent Requests | Amortized Average |
|------|---------------|--------------------|--------------------|
| Foundation | ~5ms | ~2-3ms | **<3ms** |
| Enterprise | ~12ms | ~3-5ms | **<5ms** |
| Sovereign | ~35ms | ~10-25ms | **<15ms** |

---

## Context: What's Slow?

The DPG overhead is insignificant compared to the operations it governs:

| Operation | Typical Latency |
|-----------|----------------|
| LLM API call (GPT-4, Claude) | 500-5,000ms |
| Database write | 5-50ms |
| HTTP API call | 50-500ms |
| File write (SSD) | 0.1-1ms |
| **DPG enforcement (Foundation)** | **2-3ms** |

**DPG adds <1% overhead to the total round-trip of a governed operation.**

An agent waiting 2 seconds for GPT-4 to respond won't notice 3ms of enforcement. The governance is effectively invisible.

---

## Bottleneck Analysis

### Bottleneck 1: Category Classification (Step 5)

The largest variable is the category classifier. Options:

| Approach | Latency | Accuracy | Recommended For |
|----------|---------|----------|----------------|
| Rule-based keywords | <0.1ms | Medium | Foundation |
| Regex patterns | <0.5ms | Medium-High | Foundation/Enterprise |
| Embedding similarity | 5-20ms | High | Enterprise |
| LLM classification | 100-2000ms | Highest | Sovereign (with caching) |

**Recommendation:** Use rule-based at Foundation, embedding at Enterprise, and cached LLM at Sovereign. Cache results by tool+arguments pattern to avoid re-classification.

### Bottleneck 2: Human Approval (Step 6)

Approval wait time is unbounded — it depends on how fast the human responds. This is intentional (R-APR-004 specifies a timeout, default 5 minutes).

**Optimization:** First-use approval mode reduces approval frequency to once per tool per session. Most operations after the first approval resolve in ~0.01ms (cache hit).

### Bottleneck 3: Journal Write (Steps 7, 10)

Two writes per request (pre + post). At high throughput:

| Throughput | Journal Write Strategy | Latency |
|-----------|----------------------|---------|
| <100 req/sec | Direct append | ~0.5ms |
| 100-1000 req/sec | Buffered write (flush every 100ms) | ~0.1ms avg |
| >1000 req/sec | Async write + WAL | ~0.01ms avg |

**Foundation implementations should use direct append.** Buffered writes are an optimization for high-throughput Enterprise deployments.

### Bottleneck 4: HSM Signing (Sovereign)

HSM operations are inherently slower than software signing:

| HSM Type | Signing Latency |
|----------|----------------|
| Local USB HSM (YubiHSM) | ~5-10ms |
| Network HSM (AWS CloudHSM) | ~10-20ms |
| Software HSM (SoftHSM) | ~0.5ms (testing only) |

**Optimization:** Batch attestation signing where applicable, or use a local HSM for latency-sensitive deployments.

---

## Throughput Capacity

| Tier | Estimated Max Throughput | Limiting Factor |
|------|-------------------------|----------------|
| Foundation | ~5,000 req/sec | Journal write I/O |
| Enterprise | ~2,000 req/sec | mTLS + chain hashing |
| Sovereign | ~100-500 req/sec | HSM signing |

For context: a single AI agent typically makes 1-10 tool calls per minute. Even 100 concurrent agents would generate ~1,000 req/min = ~17 req/sec. **Foundation tier handles this with 99.7% headroom.**

---

## The Sales Pitch

> "DPG adds less latency than your logging framework. Your agent won't notice it's there. But your auditor will notice when every action has a signed attestation and an immutable record. That's the difference between 'we think our agent is safe' and 'we can prove our agent is safe.'"

---

*AOS-EVIDENCE-007 — Performance & Latency Analysis*  
*Compiled by Silas (Antigravity Agent)*  
*Prior art established: 2026-06-03*
