# AOS Reference Gate

**The official reference implementation of the AOS Deterministic Policy Gate.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Tests](https://img.shields.io/badge/TCK-43%2F43_PASS-brightgreen.svg)](#conformance-tests)
[![AOS](https://img.shields.io/badge/AOS-CORE--001_v1.0-orange.svg)](../AOS-CORE-001_v1.0.md)

---

## Overview

This is a fully functional implementation of the AOS Deterministic Policy Gate (DPG), conforming to AOS-CORE-001 v1.0. It implements:

- **11-step evaluation pipeline** — the core DPG from request to decision
- **Append-only audit journal** — hash-chained for tamper detection (CRYPTO-001)
- **Governance Proof generation** — cryptographic decision attestation
- **Policy validation & linting** — LANG-001 conformance + POL-001 best practices
- **REST API server** — 15 endpoints implementing API-001
- **43 TCK conformance tests** — executable proof of standard compliance

## Quick Start

```bash
# Install dependencies
npm install

# Run the conformance tests
npm test

# Start the API server
npm start

# In another terminal, load a policy
curl -X POST http://localhost:8401/v1/policies/load \
  -H "Content-Type: application/json" \
  -d @examples/dev-assistant-policy.json

# Evaluate a tool call
curl -X POST http://localhost:8401/v1/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "read_file",
    "arguments": { "path": "/workspace/src/main.ts" },
    "context": { "agentId": "my-agent", "sessionId": "session-1" }
  }'

# Check health
curl http://localhost:8401/v1/telemetry/health
```

## API Endpoints

| Method | Path | Description | Spec |
|--------|------|-------------|------|
| POST | `/v1/decisions` | Evaluate tool call | API-001 §5.1 |
| POST | `/v1/decisions/:id/confirm` | Confirm execution | API-001 §5.2 |
| GET | `/v1/journal` | Query journal entries | API-001 §6.1 |
| GET | `/v1/journal/:id` | Get single entry | API-001 §6.2 |
| GET | `/v1/journal/export` | Export journal (JSON/CSV) | API-001 §6.3 |
| GET | `/v1/journal/verify` | Verify hash chain | API-001 §6.4 |
| POST | `/v1/approvals/:tool` | Grant approval | API-001 §7.1 |
| POST | `/v1/attestation/verify` | Verify Governance Proof | API-001 §8 |
| POST | `/v1/policies/load` | Load policy | API-001 §9.1 |
| GET | `/v1/policies/current` | Get loaded policy info | API-001 §9.2 |
| POST | `/v1/policies/validate` | Validate policy (no load) | API-001 §9.3 |
| POST | `/v1/policies/lint` | Lint policy | API-001 §9.4 |
| GET | `/v1/telemetry/metrics` | Metrics (JSON/Prometheus) | API-001 §10.1 |
| GET | `/v1/telemetry/health` | Health check | API-001 §10.3 |

## CLI Tools

```bash
# Validate a policy file
npx aos-validate examples/dev-assistant-policy.json

# Validate with linting
npx aos-validate --lint examples/dev-assistant-policy.json
```

## Project Structure

```
reference/
├── src/
│   ├── index.ts          # Public API exports
│   ├── types.ts          # TypeScript type definitions (LANG-001 + API-001)
│   ├── gate.ts           # Core DPG — 11-step pipeline (CORE-001)
│   ├── journal.ts        # Append-only hash-chained journal (CRYPTO-001)
│   ├── crypto.ts         # Governance Proof generation (CRYPTO-001)
│   ├── validator.ts      # Policy validation + linting (LANG-001, POL-001)
│   ├── api/
│   │   └── server.ts     # REST API server (API-001)
│   └── cli/
│       └── validate.ts   # CLI policy validator
├── tests/
│   └── tck.test.ts       # TCK conformance tests (43 tests)
├── examples/
│   └── dev-assistant-policy.json  # Example policy
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Conformance Tests

The TCK verifies conformance with:

| Suite | Tests | Standard |
|-------|-------|----------|
| Deterministic Policy Gate | 14 | CORE-001 |
| Audit Journal | 4 | CORE-001, CRYPTO-001 |
| Scope Validation | 8 | CORE-001 |
| Policy Validation | 10 | LANG-001 |
| Policy Linting | 3 | POL-001 |
| Health & Metrics | 3 | API-001 |
| Enterprise Tier | 1 | CORE-001 |
| **Total** | **43** | |

## Known Limitations

This is a **reference implementation** — it prioritizes clarity over performance:

1. **Category classification:** Uses a no-op classifier. Production implementations should use an NLP model (see `GateConfig.categoryClassifier`).
2. **Cryptographic signatures:** Uses HMAC-SHA-256 as a simulation of Ed25519. Production must use actual Ed25519 per AOS-CRYPTO-001.
3. **Storage:** In-memory only. Production should persist journal to durable storage.
4. **Authentication:** No API authentication. Production must implement API-001 R-API-010/011.
5. **Rate limiting:** Not implemented. Production must implement per-client rate limiting.

## License

Apache 2.0 — see [LICENSE](../LICENSE)
