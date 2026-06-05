# AOS-LANG-001 v1.0 -- Formal Policy Language Specification

**Standard:** AOS-LANG-001  
**Title:** AOS Policy Language: Formal Grammar, Schema, and Validation  
**Version:** 1.0  
**Status:** Draft  
**Date:** 2026-06-05  
**Author:** Eugene Christopher Salvatore  
**License:** CC-BY-4.0  
**Companion to:** AOS-POL-001 (Policy Authoring Guide), AOS-CORE-001 (Deterministic Policy Gate)

---

## Abstract

AOS-POL-001 defines *how to think about* policy authoring — risk tiers, scope constraints, budget calibration, blast radius assessment. But it does not define a formal, machine-parseable policy language. Without a formal grammar, two compliant implementations could parse the same policy document differently, producing different allow/deny decisions for the same tool call. This defeats the deterministic guarantee that is the foundation of the AOS architecture.

This standard specifies the **AOS Policy Language (APL)** — the formal grammar, schema, and validation rules for policy documents consumed by a Deterministic Policy Gate (AOS-CORE-001). It ensures that any conforming parser, given the same policy document and the same tool call, produces the same evaluation result.

> **Design philosophy:** POL-001 is the driver's manual. LANG-001 is the specification sheet for the steering wheel, pedals, and dashboard — the formal interface between human intent and machine enforcement.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Normative References](#2-normative-references)
3. [Terms and Definitions](#3-terms-and-definitions)
4. [Policy Document Structure](#4-policy-document-structure)
5. [Formal Grammar](#5-formal-grammar)
6. [Schema Definition](#6-schema-definition)
7. [Evaluation Semantics](#7-evaluation-semantics)
8. [Policy Composition](#8-policy-composition)
9. [Canonicalization](#9-canonicalization)
10. [Validation Rules](#10-validation-rules)
11. [Extension Mechanism](#11-extension-mechanism)
12. [Conformance Testing](#12-conformance-testing)
13. [Security Considerations](#13-security-considerations)
14. [Relationship to Other Standards](#14-relationship-to-other-standards)

---

## 1. Scope

### 1.1 What This Standard Covers

- The formal grammar (ABNF) for AOS policy documents
- The JSON Schema for machine validation
- Evaluation semantics: how a policy document maps to allow/deny/escalate decisions
- Policy composition: how base policies and mission policies combine
- Canonicalization: how a policy is reduced to a deterministic byte sequence for hash computation
- Validation rules: syntactic, semantic, and cross-reference validation
- Extension mechanism: how implementations add custom fields without breaking conformance

### 1.2 What This Standard Does Not Cover

- Policy authoring methodology (see AOS-POL-001)
- Gate implementation architecture (see AOS-CORE-001)
- Cryptographic operations on policies (see AOS-CRYPTO-001)
- Federation policy propagation (see AOS-CORE-003)

### 1.3 Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## 2. Normative References

- **AOS-CORE-001 v1.0** -- Deterministic Policy Gate specification
- **AOS-POL-001 v1.0** -- Policy Authoring Guide
- **AOS-CRYPTO-001 v1.0** -- Cryptographic Standards
- **RFC 2119** -- Key words for use in RFCs
- **RFC 5234** -- Augmented BNF for Syntax Specifications (ABNF)
- **RFC 8259** -- The JavaScript Object Notation (JSON) Data Interchange Format
- **RFC 8949** -- Concise Binary Object Representation (CBOR) -- for canonicalization
- **JSON Schema Draft 2020-12** (https://json-schema.org/draft/2020-12/schema)

---

## 3. Terms and Definitions

Terms defined in AOS-CORE-001 and AOS-POL-001 apply. Additional terms:

**APL (AOS Policy Language):** The formal policy language defined by this standard.

**Policy Document:** A valid APL document that, when loaded by a conforming gate, produces deterministic evaluation results for any tool call.

**Canonical Form:** The deterministic byte-sequence representation of a policy document used for hash computation (Section 9). Two policy documents that are semantically identical MUST produce identical canonical forms.

**Schema Registry:** The set of all valid APL schema versions. A conforming gate MUST validate policy documents against the schema for the declared version.

**Extension Namespace:** A vendor-specific namespace (prefixed with `x-`) for custom policy fields that do not affect evaluation semantics.

---

## 4. Policy Document Structure

### 4.1 Top-Level Structure

**R-LANG-001:** A conforming APL document MUST be a valid JSON object (RFC 8259) or a valid YAML document (YAML 1.2) that is losslessly convertible to JSON. When YAML is used, the document MUST NOT use YAML-specific features that have no JSON equivalent (anchors, aliases, custom tags, merge keys).

> **Rationale:** JSON is the canonical serialization. YAML is permitted for human authoring convenience. All validation, hashing, and machine processing operates on the JSON representation.

**R-LANG-002:** The top-level structure of an APL document MUST contain the following fields:

```json
{
  "aplVersion": "1.0",
  "policyId": "<UUID v4>",
  "policyVersion": "<semver>",
  "status": "<DRAFT|REVIEW|TESTED|ACTIVE|DEPRECATED|ARCHIVED>",
  "environment": "<development|staging|production>",
  "created": "<ISO 8601 datetime>",
  "modified": "<ISO 8601 datetime>",
  "author": "<string>",
  "hash": "<SHA-256 hex digest of canonical form, excluding this field>",
  
  "mission": { ... },
  "tools": [ ... ],
  "prohibitedCategories": [ ... ],
  "globalBudgets": { ... },
  "approvalDefaults": { ... },
  
  "extensions": { ... }
}
```

### 4.2 Mission Block

**R-LANG-003:** The `mission` block MUST contain:

```json
{
  "mission": {
    "description": "<human-readable objective>",
    "duration": "<session|time-bounded|persistent>",
    "endTime": "<ISO 8601 datetime, REQUIRED if duration is time-bounded>",
    "dataDomainsInScope": ["<string>", ...],
    "actionDomainsInScope": ["<string>", ...],
    "sensitive": <boolean>,
    "sensitivityJustification": "<string, REQUIRED if sensitive is true>"
  }
}
```

### 4.3 Tool Block

**R-LANG-004:** Each element in the `tools` array MUST conform to:

```json
{
  "name": "<tool identifier>",
  "riskTier": "<T1|T2|T3|T4>",
  "enabled": <boolean, default true>,
  
  "scope": {
    "type": "<filesystem|network|database|command|api|custom>",
    "constraints": { ... }
  },
  
  "budget": {
    "window": "<per-session|per-minute|per-hour|per-day>",
    "limits": {
      "calls": <integer or null>,
      "bytes": <integer or null>,
      "cost": <number or null>,
      "costCurrency": "<ISO 4217 currency code>",
      "concurrent": <integer or null>
    },
    "alertThreshold": <number 0.0-1.0, default 0.8>
  },
  
  "approval": {
    "required": "<none|first-use|every-use>",
    "timeout": "<ISO 8601 duration, e.g. PT15M>",
    "approvers": ["<operator identity>", ...],
    "secondaryApproverRequired": <boolean, default false>
  },
  
  "blastRadius": {
    "scope": "<string>",
    "sensitivity": "<string>",
    "irreversibility": "<reversible|partially-reversible|irreversible>",
    "mitigations": ["<string>", ...]
  }
}
```

### 4.4 Scope Constraint Types

**R-LANG-005:** Each scope type has a defined constraint schema:

#### 4.4.1 Filesystem Scope

```json
{
  "type": "filesystem",
  "constraints": {
    "pathAllowlist": ["<glob pattern>", ...],
    "pathDenylist": ["<glob pattern>", ...],
    "maxFileSize": <integer, bytes>,
    "allowedExtensions": ["<string>", ...],
    "deniedExtensions": ["<string>", ...],
    "resolveSymlinks": <boolean, default true>,
    "resolveRealPath": <boolean, default true>
  }
}
```

#### 4.4.2 Network Scope

```json
{
  "type": "network",
  "constraints": {
    "domainAllowlist": ["<domain pattern>", ...],
    "domainDenylist": ["<domain pattern>", ...],
    "protocolAllowlist": ["<http|https|ws|wss>", ...],
    "portAllowlist": [<integer>, ...],
    "followRedirects": <boolean, default false>,
    "maxResponseSize": <integer, bytes>,
    "methods": ["<GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS>", ...]
  }
}
```

#### 4.4.3 Database Scope

```json
{
  "type": "database",
  "constraints": {
    "allowedTables": ["<table name or pattern>", ...],
    "deniedTables": ["<table name or pattern>", ...],
    "allowedOperations": ["<SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP>", ...],
    "deniedColumns": ["<table.column pattern>", ...],
    "maxRowsReturned": <integer>,
    "maxRowsModified": <integer>
  }
}
```

#### 4.4.4 Command Scope

```json
{
  "type": "command",
  "constraints": {
    "allowedCommands": ["<command pattern>", ...],
    "blockedCommands": ["<command pattern>", ...],
    "allowedArgPatterns": ["<regex>", ...],
    "blockedArgPatterns": ["<regex>", ...],
    "maxExecutionTime": "<ISO 8601 duration>",
    "workingDirectory": "<path>"
  }
}
```

#### 4.4.5 API Scope

```json
{
  "type": "api",
  "constraints": {
    "baseUrls": ["<URL>", ...],
    "allowedEndpoints": ["<path pattern>", ...],
    "deniedEndpoints": ["<path pattern>", ...],
    "methods": ["<HTTP method>", ...],
    "maxRequestSize": <integer, bytes>,
    "maxResponseSize": <integer, bytes>,
    "authentication": "<bearer|api-key|oauth2|none>"
  }
}
```

#### 4.4.6 Custom Scope

```json
{
  "type": "custom",
  "constraints": {
    "customType": "<vendor-defined scope type>",
    "parameters": { "<key>": "<value>", ... }
  }
}
```

### 4.5 Prohibited Categories Block

**R-LANG-006:** The `prohibitedCategories` array MUST contain string identifiers. The following three categories are REQUIRED in every conforming policy (per POL-001 R-POL-A-015):

```json
{
  "prohibitedCategories": [
    "child_exploitation",
    "weapons_of_mass_destruction",
    "critical_infrastructure_attack"
  ]
}
```

Additional categories are deployment-specific. Category identifiers MUST be lowercase, use underscores for word separation, and contain only ASCII alphanumeric characters and underscores. Maximum length: 64 characters.

### 4.6 Global Budgets Block

**R-LANG-007:** The `globalBudgets` block defines system-wide limits that apply across all tools:

```json
{
  "globalBudgets": {
    "window": "<per-session|per-minute|per-hour|per-day>",
    "limits": {
      "totalCalls": <integer>,
      "totalBytes": <integer>,
      "totalCost": <number>,
      "costCurrency": "<ISO 4217>",
      "totalConcurrent": <integer>
    },
    "alertThreshold": <number 0.0-1.0>
  }
}
```

### 4.7 Approval Defaults Block

**R-LANG-008:** The `approvalDefaults` block defines default approval behavior by risk tier (per POL-001 R-POL-A-012):

```json
{
  "approvalDefaults": {
    "T1": { "required": "none" },
    "T2": { "required": "none", "sensitiveMission": "first-use" },
    "T3": { "required": "first-use", "sensitiveMission": "every-use" },
    "T4": { "required": "every-use", "sensitiveMission": "every-use", "secondaryApproverRequired": true }
  }
}
```

Per-tool approval settings (R-LANG-004) override these defaults.

---

## 5. Formal Grammar

### 5.1 ABNF Grammar

**R-LANG-009:** The following ABNF (RFC 5234) defines the abstract syntax of a conforming APL document. The concrete serialization is JSON (RFC 8259) or YAML 1.2 convertible to JSON.

```abnf
; Top-level policy document
policy-document = "{" 
    apl-version ","
    policy-id ","
    policy-version ","
    status ","
    environment ","
    created ","
    modified ","
    author ","
    hash ","
    mission-block ","
    tools-block ","
    categories-block ","
    global-budgets-block ","
    approval-defaults-block
    ["," extensions-block]
"}"

; Metadata fields
apl-version       = %s"aplVersion" ":" quoted-string
policy-id         = %s"policyId" ":" uuid-v4
policy-version    = %s"policyVersion" ":" semver
status            = %s"status" ":" status-value
status-value      = %s"DRAFT" / %s"REVIEW" / %s"TESTED" 
                    / %s"ACTIVE" / %s"DEPRECATED" / %s"ARCHIVED"
environment       = %s"environment" ":" env-value
env-value         = %s"development" / %s"staging" / %s"production"
created           = %s"created" ":" iso8601-datetime
modified          = %s"modified" ":" iso8601-datetime
author            = %s"author" ":" quoted-string
hash              = %s"hash" ":" hex-digest-256

; Mission block
mission-block     = %s"mission" ":" "{" 
    mission-desc ","
    mission-duration ","
    [mission-end-time ","]
    data-domains ","
    action-domains ","
    sensitive
    ["," sensitivity-justification]
"}"
mission-desc      = %s"description" ":" quoted-string
mission-duration  = %s"duration" ":" duration-value
duration-value    = %s"session" / %s"time-bounded" / %s"persistent"
mission-end-time  = %s"endTime" ":" iso8601-datetime
data-domains      = %s"dataDomainsInScope" ":" string-array
action-domains    = %s"actionDomainsInScope" ":" string-array
sensitive         = %s"sensitive" ":" boolean
sensitivity-just  = %s"sensitivityJustification" ":" quoted-string

; Tools block
tools-block       = %s"tools" ":" "[" tool-entry *("," tool-entry) "]"
tool-entry        = "{" 
    tool-name "," 
    risk-tier ","
    [tool-enabled ","]
    scope-block ","
    budget-block ","
    approval-block ","
    blast-radius-block
"}"
tool-name         = %s"name" ":" quoted-string
risk-tier         = %s"riskTier" ":" tier-value
tier-value        = %s"T1" / %s"T2" / %s"T3" / %s"T4"
tool-enabled      = %s"enabled" ":" boolean

; Scope block
scope-block       = %s"scope" ":" "{" 
    scope-type "," 
    scope-constraints 
"}"
scope-type        = %s"type" ":" scope-type-value
scope-type-value  = %s"filesystem" / %s"network" / %s"database" 
                    / %s"command" / %s"api" / %s"custom"
scope-constraints = %s"constraints" ":" json-object

; Budget block
budget-block      = %s"budget" ":" "{" 
    budget-window ","
    budget-limits ","
    [alert-threshold]
"}"
budget-window     = %s"window" ":" window-value
window-value      = %s"per-session" / %s"per-minute" / %s"per-hour" / %s"per-day"
budget-limits     = %s"limits" ":" json-object
alert-threshold   = %s"alertThreshold" ":" number-0-1

; Approval block
approval-block    = %s"approval" ":" "{" 
    approval-req ","
    [approval-timeout ","]
    [approvers ","]
    [secondary-req]
"}"
approval-req      = %s"required" ":" approval-value
approval-value    = %s"none" / %s"first-use" / %s"every-use"
approval-timeout  = %s"timeout" ":" iso8601-duration
approvers         = %s"approvers" ":" string-array
secondary-req     = %s"secondaryApproverRequired" ":" boolean

; Blast radius block
blast-radius-block = %s"blastRadius" ":" "{" 
    br-scope ","
    br-sensitivity ","
    br-irreversibility ","
    br-mitigations
"}"
br-scope           = %s"scope" ":" quoted-string
br-sensitivity     = %s"sensitivity" ":" quoted-string
br-irreversibility = %s"irreversibility" ":" irrev-value
irrev-value        = %s"reversible" / %s"partially-reversible" / %s"irreversible"
br-mitigations     = %s"mitigations" ":" string-array

; Categories block
categories-block  = %s"prohibitedCategories" ":" string-array

; Global budgets block
global-budgets-block = %s"globalBudgets" ":" json-object

; Approval defaults block
approval-defaults-block = %s"approvalDefaults" ":" json-object

; Extensions block (optional)
extensions-block  = %s"extensions" ":" json-object

; Primitives
quoted-string     = DQUOTE *VCHAR DQUOTE
string-array      = "[" [quoted-string *("," quoted-string)] "]"
boolean           = %s"true" / %s"false"
number-0-1        = "0" / "1" / ("0" "." 1*DIGIT)
json-object       = "{" *( quoted-string ":" json-value *("," quoted-string ":" json-value) ) "}"
json-value        = quoted-string / number / boolean / json-object / json-array / "null"
json-array        = "[" [json-value *("," json-value)] "]"
uuid-v4           = 8HEXDIG "-" 4HEXDIG "-" "4" 3HEXDIG "-" HEXDIG 3HEXDIG "-" 12HEXDIG
semver            = 1*DIGIT "." 1*DIGIT ["." 1*DIGIT]
hex-digest-256    = 64HEXDIG
iso8601-datetime  = ; per ISO 8601 extended format with timezone
iso8601-duration  = ; per ISO 8601 duration format (e.g., "PT15M")
```

---

## 6. Schema Definition

### 6.1 JSON Schema

**R-LANG-010:** A conforming APL validator MUST validate policy documents against the following JSON Schema (Draft 2020-12). The full schema is provided in machine-readable form at `schemas/apl-v1.0.schema.json` in the AOS standards repository.

**R-LANG-011:** The schema MUST enforce:

1. All required fields are present
2. All field values conform to their declared types
3. Enum fields contain only permitted values
4. `endTime` is present if and only if `duration` is `"time-bounded"`
5. `sensitivityJustification` is present if and only if `sensitive` is `true`
6. The three mandatory prohibited categories are present
7. All budget values are non-negative
8. All `alertThreshold` values are in the range [0.0, 1.0]
9. Tool names are unique within the `tools` array
10. `policyId` is a valid UUID v4
11. `policyVersion` is valid semver
12. `aplVersion` matches a version supported by the validator

### 6.2 Schema Versioning

**R-LANG-012:** The `aplVersion` field declares the APL schema version. Validators MUST reject documents with unrecognized `aplVersion` values. Schema versions follow the same semver convention as the standard:

- **Minor versions** (1.0 → 1.1): add optional fields. Documents valid under 1.0 remain valid under 1.1.
- **Major versions** (1.x → 2.0): may add required fields, change field semantics, or remove fields. Documents valid under 1.x are NOT guaranteed valid under 2.0.

---

## 7. Evaluation Semantics

### 7.1 The Deterministic Evaluation Contract

**R-LANG-013:** For the same policy document (by canonical hash), the same tool call request (tool name, arguments, and context), the same approval state, the same budget state, and the same governance context, any conforming gate MUST produce the same evaluation result: ALLOW, DENY, or ESCALATE.

This is the **Cross-Vendor Invariance Contract** identified in the ChatGPT deep research report as a P0 requirement for open standardization.

### 7.2 Evaluation Order

**R-LANG-014:** The gate MUST evaluate a tool call against the policy in the following order. Each check is independent; the gate MUST NOT short-circuit unless the result is DENY.

```
1. TOOL EXISTENCE CHECK
   - Is the tool name present in the policy's tools array?
   - If NO → DENY (reason: TOOL_NOT_IN_POLICY)

2. TOOL ENABLED CHECK
   - Is the tool's "enabled" field true?
   - If NO → DENY (reason: TOOL_DISABLED)

3. CATEGORY CHECK
   - Does the tool call's content match any prohibited category?
   - If YES → DENY (reason: CATEGORY_PROHIBITED, category: <matched>)

4. SCOPE CHECK
   - Do the tool call's arguments fall within the tool's scope constraints?
   - If NO → DENY (reason: SCOPE_VIOLATION, constraint: <violated>)

5. BUDGET CHECK
   - Would executing this call exceed any per-tool or global budget limit?
   - If YES → DENY (reason: BUDGET_EXCEEDED, limit: <exceeded>)

6. APPROVAL CHECK
   - Does this call require approval (per tool or per approval defaults)?
   - If YES and approval has not been granted → ESCALATE (reason: APPROVAL_REQUIRED)
   - If YES and approval has been granted and has not expired → continue

7. RESTRICTION ENVELOPE CHECK (multi-agent, per AOS-CORE-003)
   - If this tool call is from a delegated task, does it fall within 
     the restriction envelope?
   - If NO → DENY (reason: DELEGATION_RESTRICTION)

8. RESULT
   - If all checks pass → ALLOW
```

**R-LANG-015:** The evaluation result MUST include:

```json
{
  "decision": "<ALLOW|DENY|ESCALATE>",
  "reason": "<reason code>",
  "detail": "<human-readable explanation>",
  "policyId": "<UUID>",
  "policyVersion": "<semver>",
  "policyHash": "<SHA-256>",
  "toolName": "<string>",
  "checks": {
    "toolExists": <boolean>,
    "toolEnabled": <boolean>,
    "categoryClean": <boolean>,
    "scopeValid": <boolean>,
    "budgetAvailable": <boolean>,
    "approvalGranted": <boolean or null>,
    "restrictionValid": <boolean or null>
  },
  "timestamp": "<ISO 8601>"
}
```

### 7.3 Deny-Reason Codes

**R-LANG-016:** The following deny-reason codes are normative:

| Code | Meaning |
|------|---------|
| `TOOL_NOT_IN_POLICY` | The requested tool is not declared in the policy |
| `TOOL_DISABLED` | The tool is declared but disabled |
| `CATEGORY_PROHIBITED` | The request matched a prohibited category |
| `SCOPE_VIOLATION` | The request arguments violate scope constraints |
| `BUDGET_EXCEEDED` | Executing would exceed a budget limit |
| `APPROVAL_REQUIRED` | The request requires approval that has not been granted |
| `APPROVAL_EXPIRED` | Approval was previously granted but has expired |
| `DELEGATION_RESTRICTION` | The request violates a delegation restriction envelope |
| `POLICY_EXPIRED` | The policy's time-bounded duration has elapsed |
| `POLICY_INVALID` | The policy failed validation (should not occur at runtime) |

Implementations MAY define additional reason codes prefixed with `x-` for vendor-specific denials.

### 7.4 Pattern Matching Semantics

**R-LANG-017:** Pattern matching for scope constraints MUST use the following semantics:

| Pattern | Matching Rule | Example |
|---------|--------------|---------|
| Literal string | Exact match | `"api.github.com"` matches only `api.github.com` |
| `*` (single wildcard) | Matches any single path segment or subdomain | `"*.github.com"` matches `api.github.com` but not `a.b.github.com` |
| `**` (double wildcard) | Matches zero or more path segments | `"/workspace/**"` matches `/workspace/a/b/c.txt` |
| `?` (single char) | Matches exactly one character | `"file?.txt"` matches `file1.txt` but not `file12.txt` |

**R-LANG-018:** Path matching MUST be performed on the resolved, canonical path (after symlink resolution, path traversal resolution, URL decoding, Unicode normalization, and null byte rejection). The gate MUST NOT match against the raw, user-supplied path.

**R-LANG-019:** Denylist entries take precedence over allowlist entries. If a path matches both an allowlist pattern and a denylist pattern, the result is DENY. This is the **deny-wins** principle.

---

## 8. Policy Composition

### 8.1 Base and Mission Policies

**R-LANG-020:** APL supports policy composition through base policies and mission policies. A mission policy MAY declare a `basePolicy` reference:

```json
{
  "basePolicy": {
    "policyId": "<UUID of base policy>",
    "policyHash": "<SHA-256 of base policy canonical form>"
  }
}
```

### 8.2 Composition Rules

**R-LANG-021:** When a mission policy extends a base policy, the following composition rules apply:

| Field | Composition Rule |
|-------|-----------------|
| `prohibitedCategories` | **Union.** The effective category list is the union of base and mission categories. The mission policy MUST NOT remove categories from the base. |
| `tools` | **Override with restriction.** The mission policy MAY add tools not in the base. The mission policy MAY narrow a base tool's scope, budget, or approval requirements. The mission policy MUST NOT widen a base tool's scope or budget. |
| `globalBudgets` | **Minimum.** The effective global budget is the minimum of the base and mission values for each dimension. |
| `approvalDefaults` | **Most restrictive.** The effective approval default is the more restrictive of base and mission for each tier. |
| `mission` | **Mission policy wins.** The mission block is entirely from the mission policy. |

**R-LANG-022:** The composition invariant is the same as AOS-CORE-003's restriction-only principle: **composition can only narrow, never widen.** A mission policy cannot grant more access than the base allows.

### 8.3 Composition Verification

**R-LANG-023:** The gate MUST verify the base policy's hash before composing. If the base policy's actual hash does not match the declared `basePolicy.policyHash`, the gate MUST reject the mission policy (reason: `BASE_POLICY_HASH_MISMATCH`). This prevents composition with a tampered or outdated base policy.

---

## 9. Canonicalization

### 9.1 Purpose

The policy hash (AOS-CORE-001 R-POL-003) requires a deterministic byte sequence. JSON serialization is not deterministic -- key ordering, whitespace, and Unicode escaping vary between implementations. APL defines a canonical form that eliminates this ambiguity.

### 9.2 Canonical Form Rules

**R-LANG-024:** The canonical form of an APL document MUST be produced by the following algorithm:

1. Parse the document into an in-memory object representation
2. Remove the `hash` field (it is excluded from its own computation)
3. Remove all fields in the `extensions` namespace (extensions do not affect the hash)
4. Serialize the object to JSON with the following constraints:
   a. **Key ordering:** All object keys MUST be sorted lexicographically by their Unicode code points (ascending)
   b. **Whitespace:** No whitespace between tokens (no spaces, tabs, or newlines)
   c. **Unicode:** All Unicode characters outside the ASCII printable range (0x20-0x7E) MUST be escaped as `\uXXXX`
   d. **Numbers:** Integers MUST be serialized without decimal points or exponents. Floating-point numbers MUST use the shortest representation that preserves the value. No trailing zeros.
   e. **Strings:** Strings MUST use double quotes. Backslash and double-quote characters MUST be escaped. Control characters MUST be escaped.
   f. **Encoding:** The result MUST be encoded as UTF-8 (no BOM)
5. The canonical form is the resulting byte sequence

**R-LANG-025:** The hash of the canonical form MUST be computed using SHA-256 and represented as a lowercase hexadecimal string (64 characters).

### 9.3 Canonical Form Example

Given this policy fragment:

```json
{
  "aplVersion": "1.0",
  "policyId": "550e8400-e29b-41d4-a716-446655440000",
  "tools": [
    {"name": "read_file", "riskTier": "T1"},
    {"name": "database.query", "riskTier": "T1"}
  ]
}
```

The canonical form (with sorted keys):

```
{"aplVersion":"1.0","policyId":"550e8400-e29b-41d4-a716-446655440000","tools":[{"name":"database.query","riskTier":"T1"},{"name":"read_file","riskTier":"T1"}]}
```

Note: tool entries are sorted by `name` (lexicographic). All array elements that are objects are sorted by their primary key.

**R-LANG-026:** Arrays of objects MUST be sorted by their primary key field before canonicalization. Primary keys by block:

| Block | Primary Key |
|-------|-------------|
| `tools` | `name` |
| `prohibitedCategories` | value (string sort) |
| `approvers` | value (string sort) |
| `mitigations` | value (string sort) |

---

## 10. Validation Rules

### 10.1 Syntactic Validation

**R-LANG-027:** A conforming APL validator MUST check:

| Rule ID | Rule | Severity |
|---------|------|----------|
| SYN-001 | Document is valid JSON or YAML-to-JSON | ERROR |
| SYN-002 | All required fields are present | ERROR |
| SYN-003 | All field types match schema | ERROR |
| SYN-004 | All enum values are valid | ERROR |
| SYN-005 | `policyId` is valid UUID v4 | ERROR |
| SYN-006 | `policyVersion` is valid semver | ERROR |
| SYN-007 | `aplVersion` is recognized | ERROR |
| SYN-008 | Timestamps are valid ISO 8601 | ERROR |
| SYN-009 | Durations are valid ISO 8601 | ERROR |

### 10.2 Semantic Validation

**R-LANG-028:** A conforming APL validator MUST check:

| Rule ID | Rule | Severity |
|---------|------|----------|
| SEM-001 | `endTime` present iff `duration` is `"time-bounded"` | ERROR |
| SEM-002 | `sensitivityJustification` present iff `sensitive` is true | ERROR |
| SEM-003 | Mandatory prohibited categories are present | ERROR |
| SEM-004 | Tool names are unique | ERROR |
| SEM-005 | Budget values are non-negative | ERROR |
| SEM-006 | `alertThreshold` is in [0.0, 1.0] | ERROR |
| SEM-007 | T4 tools have `approval.required` set to `"every-use"` | WARNING |
| SEM-008 | No `pathAllowlist` contains `"/**"` (global wildcard) | WARNING |
| SEM-009 | No `domainAllowlist` contains `"*"` | WARNING |
| SEM-010 | Budget values are not excessively large (> 100x calibration) | WARNING |
| SEM-011 | Policy `status` is not `"DRAFT"` if `environment` is `"production"` | ERROR |
| SEM-012 | Computed hash matches declared `hash` field | ERROR |

### 10.3 Cross-Reference Validation

**R-LANG-029:** A conforming APL validator SHOULD check:

| Rule ID | Rule | Severity |
|---------|------|----------|
| XREF-001 | If `basePolicy` is declared, base exists and hash matches | ERROR |
| XREF-002 | Mission policy does not widen base policy scope | ERROR |
| XREF-003 | Mission policy does not remove base prohibited categories | ERROR |
| XREF-004 | Mission policy global budgets do not exceed base | ERROR |
| XREF-005 | All tools in mission policy are either in base or new | WARNING |

---

## 11. Extension Mechanism

### 11.1 Vendor Extensions

**R-LANG-030:** Implementations MAY add custom fields to any object in the policy document, provided the field name is prefixed with `x-` followed by a vendor identifier:

```json
{
  "x-acme-internalClassification": "restricted",
  "x-acme-approvalWorkflowId": "WF-2026-001"
}
```

**R-LANG-031:** Extension fields MUST NOT affect the evaluation semantics defined in Section 7. A conforming gate that does not recognize an extension field MUST ignore it. Extension fields are excluded from canonical form and hash computation (R-LANG-024, step 3).

### 11.2 Custom Scope Types

**R-LANG-032:** The `"custom"` scope type (Section 4.4.6) allows vendors to define tool-specific constraint schemas. Custom scope constraints are opaque to non-recognizing implementations. A gate that does not recognize a custom scope type MUST either:

(a) Reject the tool call (fail-closed), OR

(b) Evaluate the tool call against all non-custom constraints (budget, approval, category) and log a warning that custom scope validation was skipped

Option (a) is RECOMMENDED.

---

## 12. Conformance Testing

### 12.1 Test Categories

| Category | ID Range | Description |
|----------|---------|-------------|
| Parsing | LANG-T001 to LANG-T010 | Valid/invalid document parsing |
| Validation | LANG-T011 to LANG-T020 | Schema and semantic validation |
| Evaluation | LANG-T021 to LANG-T030 | Deterministic decision output |
| Canonicalization | LANG-T031 to LANG-T035 | Hash computation |
| Composition | LANG-T036 to LANG-T040 | Base/mission policy composition |

### 12.2 Core Conformance Tests

| Test ID | Input | Expected Output |
|---------|-------|----------------|
| LANG-T001 | Valid APL document (JSON) | Parsed successfully |
| LANG-T002 | Valid APL document (YAML) | Parsed successfully; identical to JSON equivalent |
| LANG-T003 | Document missing `aplVersion` | Validation ERROR SYN-002 |
| LANG-T004 | Document with unknown `aplVersion` "99.0" | Validation ERROR SYN-007 |
| LANG-T005 | Document missing mandatory prohibited categories | Validation ERROR SEM-003 |
| LANG-T006 | Document with duplicate tool names | Validation ERROR SEM-004 |
| LANG-T007 | Document with `status: "DRAFT"` and `environment: "production"` | Validation ERROR SEM-011 |
| LANG-T011 | Tool call for tool present in policy, within scope, within budget | Decision: ALLOW |
| LANG-T012 | Tool call for tool not in policy | Decision: DENY, reason: TOOL_NOT_IN_POLICY |
| LANG-T013 | Tool call within scope but budget exceeded | Decision: DENY, reason: BUDGET_EXCEEDED |
| LANG-T014 | Tool call matching prohibited category | Decision: DENY, reason: CATEGORY_PROHIBITED |
| LANG-T015 | Tool call requiring first-use approval, not yet approved | Decision: ESCALATE, reason: APPROVAL_REQUIRED |
| LANG-T016 | Tool call requiring first-use approval, already approved in session | Decision: ALLOW |
| LANG-T017 | Tool call with path traversal attempt (`../../../etc/passwd`) | Decision: DENY, reason: SCOPE_VIOLATION |
| LANG-T018 | Same policy document, same tool call, two different gate implementations | Identical decision |
| LANG-T021 | Canonical form of policy A computed by implementation X and Y | Identical byte sequences |
| LANG-T022 | Policy with extensions; canonical form excludes extensions | Hash identical with and without extensions |
| LANG-T031 | Mission policy extends base; mission narrows scope | Composed policy valid; scope is narrower |
| LANG-T032 | Mission policy extends base; mission widens scope | Validation ERROR XREF-002 |
| LANG-T033 | Mission policy extends base; mission removes prohibited category | Validation ERROR XREF-003 |
| LANG-T034 | Mission policy references base; base hash does not match | Validation ERROR XREF-001 |

---

## 13. Security Considerations

### 13.1 Threat Model

| Threat | Severity | Mitigation | Residual Risk |
|--------|----------|------------|---------------|
| **Policy tampering** | CRITICAL | SHA-256 hash verification (R-LANG-025); canonical form prevents serialization ambiguity | If signing key is compromised, tampered policies with valid hashes could be injected. Mitigated by key rotation and HSM storage. |
| **Scope escape via pattern ambiguity** | HIGH | Canonical pattern matching rules (R-LANG-017); deny-wins principle (R-LANG-019) | Novel escape vectors not covered by normalization may emerge. Mitigated by mandatory path resolution (R-LANG-018). |
| **Category evasion** | HIGH | Category check is independent of scope/budget (R-LANG-014); runs on every call | Adversarial inputs may evade classifier. Mitigated by confidence threshold (POL-001 R-POL-A-017). |
| **Composition widening attack** | CRITICAL | Composition-only-narrows invariant (R-LANG-022); base hash verification (R-LANG-023) | If composition logic has bugs, widening may occur. Mitigated by conformance test LANG-T032. |
| **Extension namespace abuse** | MEDIUM | Extensions excluded from hash and evaluation (R-LANG-031) | Malicious extensions could confuse human reviewers. Mitigated by extension namespace visibility. |
| **YAML-specific attacks** | MEDIUM | YAML features without JSON equivalents are prohibited (R-LANG-001) | YAML parsers may accept non-conforming features by default. Mitigated by JSON-canonical validation. |

### 13.2 Limitations

| Limitation | Reason | Mitigation |
|-----------|--------|------------|
| **Cannot express temporal conditions** | APL 1.0 has no time-of-day or day-of-week constraints | Future APL 1.1 extension. Use external scheduling to load different policies. |
| **Cannot express inter-tool dependencies** | No "tool A only after tool B" semantics | Gate workflow engines can enforce sequential dependencies outside the policy language. |
| **Custom scope types are opaque** | Non-recognizing gates cannot validate custom constraints | Fail-closed behavior (R-LANG-032) ensures safety at the cost of interoperability. |
| **No built-in inheritance** | Single-level base/mission composition only | Deep composition chains are intentionally omitted for simplicity. |

---

## 14. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| **AOS-CORE-001** | The gate that evaluates APL policies. CORE-001 defines the 11-step pipeline; LANG-001 defines the policy format consumed at Steps 1-6. |
| **AOS-POL-001** | The authoring guide. POL-001 teaches how to write good policies; LANG-001 defines the formal language those policies are written in. |
| **AOS-CRYPTO-001** | Hash computation. CRYPTO-001 defines SHA-256 requirements; LANG-001 defines the canonical form that is hashed. |
| **AOS-CORE-003** | Federation. CORE-003's restriction envelopes (Section 6.2) are expressed in APL format. The restriction envelope is itself an APL scope constraint applied at evaluation Step 7. |

---

## Appendix A: Prior Art and Provenance

This standard was developed as an original companion standard to formalize the policy format used in AOS-CORE-001 and AOS-POL-001. It draws on the following prior art:

- **OPA/Rego** (Open Policy Agent) -- general-purpose policy language for cloud-native environments
- **Cedar** (AWS Verified Permissions) -- strongly-typed policy language with formal verification
- **CUE** -- constraint-based configuration language with validation
- **JSON Schema** -- vocabulary for annotating and validating JSON documents
- **JCS (RFC 8785)** -- JSON Canonicalization Scheme (influenced canonicalization design)

AOS Policy Language differs from these in that it is purpose-built for AI agent governance, with mandatory risk tiering, blast radius assessment, and integration with the deterministic gate evaluation pipeline.

This standard is published under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). The [AOS Foundation RF Patent Covenant](RF-PATENT-COVENANT.md) grants royalty-free rights to practice the normative portions of this standard in any conforming implementation.

---

## Appendix B: AI Disclosure

This standard was drafted with the assistance of AI tools under human editorial control. The original architecture, formal grammar design, and evaluation semantics were provided by the author. AI tools assisted with structural refinement, ABNF notation, and cross-referencing with existing AOS standards. All normative requirements and architectural decisions reflect the author's judgment.

---

## Appendix C: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-05 | Initial publication. |
