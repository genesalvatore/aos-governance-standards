/**
 * AOS Reference Gate — Cryptographic Operations
 * 
 * Implements Governance Proof generation defined in:
 * - AOS-CRYPTO-001 v1.0 (Cryptographic Standards)
 * 
 * NOTE: This reference implementation uses SHA-256 for hashing.
 * Ed25519 signatures are simulated with HMAC-SHA-256 for simplicity.
 * Production implementations MUST use actual Ed25519 (per AOS-CRYPTO-001).
 * 
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, createHmac, randomUUID } from 'node:crypto';
import type { GovernanceProof, Decision } from './types.js';

// ─── Governance Proof Input ─────────────────────────────────────────

export interface GovernanceProofInput {
  gateId: string;
  requestId: string;
  decision: Decision;
  toolName: string;
  policyHash: string;
  timestamp: string;
  previousProofHash: string;
  chainDepth: number;
}

// ─── Governance Proof Generation ────────────────────────────────────

/**
 * Create a Governance Proof for a gate decision.
 * 
 * AOS-CRYPTO-001 Section 6:
 * - Content hash = SHA-256(decision + toolName + policyHash + timestamp)
 * - Signature = Ed25519(contentHash) [simulated as HMAC in reference]
 * - Chain link = previousProofHash
 */
export function createGovernanceProof(input: GovernanceProofInput): GovernanceProof {
  const proofId = randomUUID();

  // Compute content hash
  // CRYPTO-001: Hash covers decision + tool + policy + timestamp
  const contentToHash = [
    input.decision,
    input.toolName,
    input.policyHash,
    input.timestamp,
    input.previousProofHash,
  ].join('|');

  const contentHash = createHash('sha256').update(contentToHash).digest('hex');

  // Compute signature (HMAC-SHA-256 simulation of Ed25519)
  // Production: Use actual Ed25519 with gate's private key
  const signature = createHmac('sha256', input.gateId)
    .update(contentHash)
    .digest('hex');

  // Compute overall proof hash (for chaining)
  const proofHash = createHash('sha256')
    .update(contentHash + signature)
    .digest('hex');

  return {
    proofId,
    type: 'GOVERNANCE_PROOF',
    version: '1.0',
    gateId: input.gateId,
    requestId: input.requestId,
    decision: input.decision,
    toolName: input.toolName,
    policyHash: input.policyHash,
    timestamp: input.timestamp,
    previousProofHash: input.previousProofHash,
    contentHash,
    signature,
    chainDepth: input.chainDepth,
  };
}

/**
 * Verify a Governance Proof.
 * 
 * Checks:
 * 1. Content hash is correctly computed
 * 2. Signature is valid for the given gate ID
 * 3. Chain link matches expected previous hash
 */
export function verifyGovernanceProof(
  proof: GovernanceProof,
  expectedGateId?: string,
  expectedPolicyHash?: string,
  expectedPreviousHash?: string
): {
  valid: boolean;
  signatureValid: boolean;
  chainValid: boolean;
  policyHashMatch: boolean;
  gateIdMatch: boolean;
} {
  // Recompute content hash
  const contentToHash = [
    proof.decision,
    proof.toolName,
    proof.policyHash,
    proof.timestamp,
    proof.previousProofHash,
  ].join('|');

  const computedContentHash = createHash('sha256').update(contentToHash).digest('hex');
  const contentHashValid = computedContentHash === proof.contentHash;

  // Verify signature (HMAC simulation)
  const expectedSignature = createHmac('sha256', proof.gateId)
    .update(proof.contentHash)
    .digest('hex');
  const signatureValid = contentHashValid && expectedSignature === proof.signature;

  // Chain link verification
  const chainValid = expectedPreviousHash !== undefined
    ? proof.previousProofHash === expectedPreviousHash
    : true;

  // Optional verifications
  const policyHashMatch = expectedPolicyHash !== undefined
    ? proof.policyHash === expectedPolicyHash
    : true;

  const gateIdMatch = expectedGateId !== undefined
    ? proof.gateId === expectedGateId
    : true;

  return {
    valid: signatureValid && chainValid && policyHashMatch && gateIdMatch,
    signatureValid,
    chainValid,
    policyHashMatch,
    gateIdMatch,
  };
}

/**
 * Compute SHA-256 hash of arbitrary content.
 * Utility for policy hash computation (LANG-001 R-LANG-025).
 */
export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
