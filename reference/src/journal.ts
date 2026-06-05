/**
 * AOS Reference Gate — Audit Journal
 * 
 * Implements the append-only, hash-chained audit journal defined in:
 * - AOS-CORE-001 v1.0 Sections 4.11, R-JRN-001 through R-JRN-004
 * - AOS-CRYPTO-001 v1.0 Section 7 (hash chain)
 * - AOS-API-001 v1.0 Section 6 (Journal API)
 * 
 * INVARIANTS:
 * - R-JRN-001: Every evaluation produces a journal entry
 * - R-JRN-002: Journal is append-only (no UPDATE, no DELETE)
 * - R-JRN-004: Entries form a hash chain for tamper detection
 * 
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, randomUUID } from 'node:crypto';
import type { JournalEntry, Decision, DenyReason } from './types.js';

// ─── Journal Record Input ───────────────────────────────────────────

export interface JournalRecordInput {
  requestId: string;
  timestamp: string;
  toolName: string;
  decision: Decision;
  reason: DenyReason | null;
  agentId: string;
  sessionId: string;
  policyId: string;
  policyVersion: string;
  policyHash: string;
  governanceProofId: string;
  executionConfirmed: boolean;
  budgetConsumed?: {
    calls: number;
    bytes: number;
  };
}

// ─── Journal Class ──────────────────────────────────────────────────

export class Journal {
  /**
   * The entries array is append-only.
   * R-JRN-002: No method exists to update or delete entries.
   */
  private readonly entries: JournalEntry[] = [];
  private lastHash: string = '0'.repeat(64); // Genesis hash

  /**
   * Append a new journal entry.
   * R-JRN-001: Every evaluation must be recorded.
   * R-JRN-004: Each entry includes hash of previous entry.
   */
  record(input: JournalRecordInput): JournalEntry {
    const entryId = randomUUID();

    // Compute hash chain link
    const contentToHash = JSON.stringify({
      entryId,
      requestId: input.requestId,
      timestamp: input.timestamp,
      toolName: input.toolName,
      decision: input.decision,
      reason: input.reason,
      policyHash: input.policyHash,
      governanceProofId: input.governanceProofId,
      previousEntryHash: this.lastHash,
    });

    const entryHash = createHash('sha256').update(contentToHash).digest('hex');

    const entry: JournalEntry = {
      entryId,
      requestId: input.requestId,
      timestamp: input.timestamp,
      toolName: input.toolName,
      decision: input.decision,
      reason: input.reason,
      agentId: input.agentId,
      sessionId: input.sessionId,
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      policyHash: input.policyHash,
      governanceProofId: input.governanceProofId,
      executionConfirmed: input.executionConfirmed,
      budgetConsumed: input.budgetConsumed,
      previousEntryHash: this.lastHash,
      entryHash,
    };

    // Append-only: push to array, update hash pointer
    this.entries.push(entry);
    this.lastHash = entryHash;

    return entry;
  }

  /**
   * Mark an entry's execution as confirmed.
   * This is the ONLY mutation allowed on a journal entry.
   * R-JRN-002: This does not modify the hash chain — executionConfirmed
   * is a late-binding field that does not participate in the chain hash.
   */
  confirmExecution(requestId: string): boolean {
    const entry = this.entries.find(e => e.requestId === requestId);
    if (!entry) return false;
    entry.executionConfirmed = true;
    return true;
  }

  /**
   * Verify the hash chain integrity.
   * AOS-CRYPTO-001: Walk the chain and verify each link.
   * Returns true if the chain is intact, false if tampered.
   */
  verifyChain(): boolean {
    let previousHash = '0'.repeat(64); // Genesis

    for (const entry of this.entries) {
      // Verify previous hash link
      if (entry.previousEntryHash !== previousHash) {
        return false;
      }

      // Recompute hash
      const contentToHash = JSON.stringify({
        entryId: entry.entryId,
        requestId: entry.requestId,
        timestamp: entry.timestamp,
        toolName: entry.toolName,
        decision: entry.decision,
        reason: entry.reason,
        policyHash: entry.policyHash,
        governanceProofId: entry.governanceProofId,
        previousEntryHash: entry.previousEntryHash,
      });

      const computedHash = createHash('sha256').update(contentToHash).digest('hex');
      if (computedHash !== entry.entryHash) {
        return false;
      }

      previousHash = entry.entryHash;
    }

    return true;
  }

  /**
   * Query entries with filtering.
   * API-001 Section 6.1
   */
  query(options?: {
    from?: string;
    to?: string;
    tool?: string;
    decision?: Decision;
    limit?: number;
    offset?: number;
  }): { entries: JournalEntry[]; total: number; hasMore: boolean } {
    let filtered = [...this.entries];

    if (options?.from) {
      filtered = filtered.filter(e => e.timestamp >= options.from!);
    }
    if (options?.to) {
      filtered = filtered.filter(e => e.timestamp <= options.to!);
    }
    if (options?.tool) {
      filtered = filtered.filter(e => e.toolName === options.tool);
    }
    if (options?.decision) {
      filtered = filtered.filter(e => e.decision === options.decision);
    }

    const total = filtered.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    const page = filtered.slice(offset, offset + limit);

    return {
      entries: page,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get a single entry by ID.
   */
  getEntry(entryId: string): JournalEntry | undefined {
    return this.entries.find(e => e.entryId === entryId);
  }

  /**
   * Get all entries (for export).
   */
  getEntries(): ReadonlyArray<JournalEntry> {
    return this.entries;
  }

  /**
   * Get the hash of the last entry (for chaining).
   */
  getLastProofHash(): string {
    return this.lastHash;
  }

  /**
   * Get the current journal length.
   */
  getLength(): number {
    return this.entries.length;
  }

  /**
   * Export journal as JSON (API-001 Section 6.3).
   */
  export(options?: { from?: string; to?: string }): string {
    let entries = [...this.entries];
    if (options?.from) {
      entries = entries.filter(e => e.timestamp >= options.from!);
    }
    if (options?.to) {
      entries = entries.filter(e => e.timestamp <= options.to!);
    }
    return JSON.stringify({ entries, exportedAt: new Date().toISOString() }, null, 2);
  }
}
