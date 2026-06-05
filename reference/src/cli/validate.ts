#!/usr/bin/env node
/**
 * aos-validate — CLI Policy Validator
 * 
 * Validates an APL policy document against AOS-LANG-001 rules.
 * 
 * Usage:
 *   aos-validate <policy-file.json>
 *   aos-validate --lint <policy-file.json>
 * 
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validatePolicy, lintPolicy } from '../validator.js';
import type { PolicyDocument } from '../types.js';

const args = process.argv.slice(2);
const doLint = args.includes('--lint');
const filePath = args.find(a => !a.startsWith('--'));

if (!filePath) {
  console.error('Usage: aos-validate [--lint] <policy-file.json>');
  process.exit(1);
}

const absPath = resolve(filePath);
let content: string;
try {
  content = readFileSync(absPath, 'utf-8');
} catch (err) {
  console.error(`Error: Could not read file '${absPath}'`);
  process.exit(1);
}

let policy: unknown;
try {
  policy = JSON.parse(content);
} catch (err) {
  console.error('Error: File is not valid JSON');
  process.exit(1);
}

// Validate
const result = validatePolicy(policy);

console.log('');
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║       AOS Policy Validator (AOS-LANG-001 v1.0)       ║');
console.log('╚═══════════════════════════════════════════════════════╝');
console.log('');
console.log(`  Policy ID:      ${result.policyId}`);
console.log(`  Policy Version: ${result.policyVersion}`);
console.log(`  APL Version:    ${result.aplVersion}`);
console.log(`  Hash Valid:     ${result.hashValid ? '✅' : '❌'}`);
console.log(`  Computed Hash:  ${result.computedHash.slice(0, 16)}...`);
console.log('');

if (result.valid) {
  console.log('  ✅ VALID — Policy conforms to AOS-LANG-001 v1.0');
} else {
  console.log('  ❌ INVALID — Policy has validation errors:');
  console.log('');
  for (const error of result.errors) {
    console.log(`    [${error.code}] ${error.message}`);
    if (error.path) console.log(`           at: ${error.path}`);
  }
}

if (result.warnings.length > 0) {
  console.log('');
  console.log('  ⚠️  Warnings:');
  for (const warn of result.warnings) {
    console.log(`    [${warn.code}] ${warn.message}`);
  }
}

// Lint (if requested)
if (doLint && result.valid) {
  console.log('');
  console.log('  ──────────────────────────────────────────────────');
  console.log('  Policy Lint Results (AOS-POL-001 Best Practices)');
  console.log('');

  const lintResult = lintPolicy(policy as PolicyDocument);
  console.log(`  Score: ${lintResult.score}/100`);
  console.log('');

  if (lintResult.issues.length === 0) {
    console.log('  ✅ No issues found');
  } else {
    for (const issue of lintResult.issues) {
      const icon = issue.severity === 'error' ? '❌' :
                   issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${icon} [${issue.code}] ${issue.message}`);
    }
  }
}

console.log('');
process.exit(result.valid ? 0 : 1);
