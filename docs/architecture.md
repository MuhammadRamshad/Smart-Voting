# System Architecture

## Component Diagram

```
┌──────────────────────────┐        ┌──────────────────────────────┐
│  Voter PWA (Next.js)      │◄──────►│  Admin Dashboard (Next.js)    │
│  Port: 3000               │        │  Port: 3000                   │
│                           │        │                               │
│  Pages:                   │        │  Pages:                       │
│  /login                   │        │  /admin/dashboard             │
│  /face-verify             │        │  /admin/elections             │
│  /ballot                  │        │  /admin/flagged               │
│  /confirmation            │        │  /admin/audit                 │
│  /offline                 │        │                               │
│                           │        │  Real-time:                   │
│  Offline:                 │        │  - Socket.IO live vote ticker │
│  - Dexie.js queue         │        │  - Flagged vote alerts        │
│  - Service Worker         │        │                               │
│  - Background sync        │        │                               │
└────────────┬─────────────┘        └─────────────┬────────────────┘
             │                                     │
             │   HTTP REST + WebSocket (Socket.IO) │
             └─────────────────┬───────────────────┘
                               │
              ┌────────────────▼──────────────────────────────────┐
              │          Next.js API Routes (Port 3000)            │
              │                                                    │
              │  /api/auth/request-otp  (POST)                    │
              │  /api/auth/verify-otp   (POST)                    │
              │  /api/auth/face-verify  (POST)                    │
              │  /api/vote              (POST)  ← main flow        │
              │  /api/audit/[id]        (GET)                     │
              │  /api/admin/elections   (GET/POST)                │
              │  /api/admin/flagged     (GET/PATCH)               │
              │  /api/admin/stats       (GET)                     │
              │  /api/socket            (Socket.IO)               │
              └──────┬──────────────────┬──────────────────┬──────┘
                     │                  │                  │
              ┌──────▼──────┐  ┌────────▼───────┐  ┌──────▼────────────────┐
              │  MongoDB     │  │  AI Service    │  │  Hardhat Local Chain  │
              │  Port: 27017 │  │  Port: 8001    │  │  Port: 8545           │
              │              │  │                │  │                       │
              │  Collections:│  │  POST /score   │  │  Contracts:           │
              │  - voters    │  │  POST /audit/  │  │  - VoterRegistry.sol  │
              │  - elections │  │    aggregate   │  │  - Election.sol       │
              │  - flagged_  │  │  GET /health   │  │  - Ballot.sol         │
              │    votes     │  │                │  │                       │
              │  - sync_     │  │  Model:        │  │  Events (audit trail):│
              │    queue_log │  │  Rules engine  │  │  - VoteCast           │
              │  - otp_store │  │  + Isolation   │  │  - ElectionCreated    │
              │              │  │    Forest      │  │  - ElectionOpened     │
              └─────────────┘  │  (synthetic     │  │  - ElectionClosed     │
                               │   training data)│  └───────────────────────┘
                               └────────────────┘
```

## Data Flow: Vote Submission

```
Voter clicks "Submit Vote"
         │
         ▼
[Frontend] Validate both MFA factors present (OTP + face JWT)
         │
         ▼
POST /api/vote
  {electionId, candidateId, voterCommitment, authToken}
         │
         ▼
[API Route] Verify JWT (both factors verified)
         │
         ▼
[API Route] Rate limit check (token bucket, 5 req/5min per IP)
         │
         ├── Rate limited? → 429 Too Many Requests
         │
         ▼
[API Route] Build feature payload for AI service
  {device_seen_before, ip_velocity, timing_regularity,
   face_confidence, liveness_score, duplicate_hash, ...}
         │
         ▼
POST http://localhost:8001/score
         │
         ▼
[AI Service] Rules engine → check hard violations
[AI Service] Isolation Forest → anomaly score
[AI Service] Combine → final risk_score 0-1
         │
         ▼
risk_score < threshold (0.6)?
    │                    │
   YES                   NO
    │                    │
    ▼                    ▼
Submit on-chain     Write to flagged_votes collection
(Ballot.castVote)   Vote STILL processed (never silent drop)
    │               Emit socket event to admin dashboard
    │                    │
    └────────────────────┘
         │
         ▼
Wait for transaction mining
         │
         ▼
Return {txHash, blockNumber, candidateId, electionId}
         │
         ▼
[Frontend] Show confirmation screen with tx hash
```

## Data Flow: Offline Vote

```
Voter submits while offline
         │
         ▼
[Frontend] Detect network failure (fetch throws)
         │
         ▼
[offlineQueue.ts] Generate UUID clientRequestId
[offlineQueue.ts] Store in Dexie.js IndexedDB:
  {clientRequestId, electionId, candidateId,
   voterCommitment, capturedAt, authToken, status:'pending'}
         │
         ▼
[SW] Register background-sync tag 'sync-votes'
         │
         ▼
Show UI: "Queued — syncing when online"
         │
         ▼
... (later, when back online) ...
         │
         ▼
[SW] 'sync' event fires → postMessage SYNC_VOTES to page
         │
         ▼
[offlineQueue.ts] replayQueue():
  For each pending vote:
    POST /api/vote with clientRequestId
         │
    API: check SyncQueueLog for clientRequestId
         │
    Already exists? → return cached result (idempotent)
    Not exists?     → process vote normally
         │
    Mark status: 'synced' in IndexedDB + SyncQueueLog
         │
    Failed? → exponential backoff + jitter
            → after 5 failures → 'dead_letter'
         │
[Frontend] Update sync status UI
```

## Smart Contract Roles

```
Roles (OpenZeppelin AccessControl):

DEFAULT_ADMIN_ROLE
  - Can grant/revoke all other roles
  - Held by deployer initially

ELECTION_ADMIN_ROLE
  - Can create elections
  - Can open/close elections
  - Can register voters in VoterRegistry

OFFICIAL_ROLE
  - Can annotate flagged votes (annotation only)
  - Can mark elections as Audited
  - Granted to Ballot.sol contract address
    (so Ballot can call VoterRegistry.markVoted + Election.incrementVote)
```

## Database Schema (MongoDB, Off-chain Only)

```
Collection: voters
{
  voterHashId: String (bcrypt hash of voter ID),  // NOT plaintext
  electionId: String,
  mfaStatus: {
    otpVerified: Boolean,
    faceVerified: Boolean,
    completedAt: Date
  },
  deviceFingerprints: [String],  // hashed
  faceDescriptor: [Number],      // 128-dim, deleted after vote cast
  hasVoted: Boolean,
  createdAt: Date
}
Indexes: {voterHashId, electionId} compound unique

Collection: elections_meta  (off-chain cache of on-chain data)
{
  electionId: String,  // bytes32 hex
  title: String,
  candidates: [{id: Number, name: String}],
  status: String enum,
  startTime: Date,
  endTime: Date,
  syncedFromChainAt: Date
}

Collection: flagged_votes
{
  attemptId: String (UUID),
  electionId: String,
  voterHashId: String (hashed),
  riskScore: Number (0-1),
  reasonCodes: [String],
  contributingFactors: [{factor: String, weight: Number}],
  confidenceCaveat: String,
  reviewStatus: String enum (pending/reviewed/cleared/escalated),
  reviewedBy: String,
  reviewedAt: Date,
  reviewNote: String,
  voteQueued: Boolean
}

Collection: sync_queue_log  (idempotency log for offline sync)
{
  clientRequestId: String (UUID unique),
  deviceId: String (hashed),
  electionId: String,
  status: String enum (pending/synced/failed/dead_letter),
  attempts: Number,
  lastAttemptAt: Date
}

Collection: otp_store (TTL indexed)
{
  identifier: String (voter ID hash),
  otp: String (bcrypt-hashed OTP),
  electionId: String,
  expiresAt: Date,  // TTL index
  used: Boolean
}
```
