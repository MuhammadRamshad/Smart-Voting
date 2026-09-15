import Dexie, { type Table } from "dexie";

export interface QueuedVote {
  id?: number;                   // auto-increment primary key
  clientRequestId: string;       // UUID idempotency key
  electionId: string;
  candidateId: number;
  voterCommitment: string;       // keccak256 hash of voter + election
  capturedAt: Date;
  authToken: string;             // short-lived JWT for sync
  status: "pending" | "synced" | "failed" | "dead_letter";
  attempts: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
}

export class VotingDatabase extends Dexie {
  votes!: Table<QueuedVote, number>;

  constructor() {
    super("SmartVotingDB");
    this.version(1).stores({
      votes: "++id, clientRequestId, status, electionId",
    });
  }
}

/** Singleton Dexie instance — safe to import anywhere in client code */
export const db = new VotingDatabase();

// ─── Queue Operations ─────────────────────────────────────────────────────────

export async function queueVote(
  vote: Omit<QueuedVote, "id" | "status" | "attempts">
): Promise<void> {
  await db.votes.add({ ...vote, status: "pending", attempts: 0 });
}

export async function getPendingVotes(): Promise<QueuedVote[]> {
  return db.votes.where("status").equals("pending").toArray();
}

export async function markVoteSynced(clientRequestId: string): Promise<void> {
  await db.votes
    .where("clientRequestId")
    .equals(clientRequestId)
    .modify({ status: "synced" });
}

export async function markVoteFailed(
  clientRequestId: string,
  errorMessage: string,
  attempts: number
): Promise<void> {
  const MAX_ATTEMPTS = 5;
  await db.votes
    .where("clientRequestId")
    .equals(clientRequestId)
    .modify({
      status: attempts >= MAX_ATTEMPTS ? "dead_letter" : "failed",
      errorMessage,
      attempts,
      lastAttemptAt: new Date(),
    });
}

// ─── Retry Helpers ────────────────────────────────────────────────────────────

/**
 * Exponential backoff with ±30% jitter.
 * Capped at 30 seconds.
 */
export function getBackoffDelay(attempts: number): number {
  const base = 1_000;
  const max = 30_000;
  const exponential = Math.min(max, base * Math.pow(2, attempts));
  const jitter = Math.random() * 0.3 * exponential;
  return exponential + jitter;
}

/**
 * Replays all pending votes through the provided handler.
 * On success, marks the vote as synced.
 * On failure, marks as failed and waits for the backoff delay before continuing.
 */
export async function replayQueue(
  onVote: (vote: QueuedVote) => Promise<void>
): Promise<void> {
  const pending = await getPendingVotes();

  for (const vote of pending) {
    try {
      await onVote(vote);
      await markVoteSynced(vote.clientRequestId);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error during sync";
      const newAttempts = vote.attempts + 1;
      await markVoteFailed(vote.clientRequestId, message, newAttempts);
      await new Promise((resolve) =>
        setTimeout(resolve, getBackoffDelay(newAttempts))
      );
    }
  }
}
