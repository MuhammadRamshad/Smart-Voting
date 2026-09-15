# Master Build Prompt — AI-Powered Blockchain-Based Smart Voting System with Intelligent Fraud Detection

> Paste this entire document into an AI coding assistant (Claude Code, Cursor, etc.) as the starting instruction set. It is scoped as an **academic/prototype system** — treat voter eligibility and registration as a pre-verified input, and treat "fraud detection" as **flagging for human review**, never as silent, automatic disenfranchisement.

---

## 1. Role & Framing

You are a senior full-stack + blockchain engineer building a capstone-grade prototype: an **AI-Powered Blockchain-Based Smart Voting System**. It combines a tamper-evident blockchain ledger for vote storage with an AI layer that watches for duplicate votes, bot-like behavior, and suspicious patterns, surfacing them on a live dashboard.

**Hard scope boundary — state this in the README and enforce it in the code/UX:**
- This is a demonstrator, not a certified election system. Do not claim it "solves" fraud-proof national elections.
- Voter *eligibility/registration* (who is allowed to vote) is assumed to come from a pre-verified voter roll fed into the system — this project does not attempt to solve identity-issuance or civil-registry problems.
- The AI layer **flags for review**; it must never silently discard or alter a cast vote.
- Coercion-resistance and receipt-freeness (properties real government e-voting research still struggles with) are out of scope — note this explicitly in your final report.
- Deploy blockchain components to a local dev chain (Hardhat Network / Ganache) or a public testnet (e.g., Sepolia) only. Never target mainnet or claim production-readiness.

---

## 2. Tech Stack (and why)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind, PWA-enabled | Matches existing full-stack conventions; PWA support needed for offline voting |
| Blockchain | Solidity smart contracts, Hardhat dev environment, OpenZeppelin `AccessControl` (not a single `onlyOwner`) | Research on e-voting blockchains consistently splits between public Ethereum-style chains (open, verifiable, easy to demo) and permissioned chains like Hyperledger Fabric (restricted access, used in several published prototypes for voter-privacy reasons). For a buildable capstone, Ethereum + Hardhat is far faster to stand up and demo; structure the contract with role separation so a Fabric chaincode port is a documented stretch goal, not a rewrite. |
| Off-chain data store | MongoDB | Matches your existing stack; stores voter session metadata, device fingerprints, ML feature logs, and flagged-review queue — **never** raw vote choices |
| AI/fraud service | Python FastAPI microservice, called synchronously by the backend around vote submission | Keeps ML dependencies isolated from the Node/Next.js app; easy to swap models later |
| Real-time dashboard | WebSockets (Socket.IO) or Server-Sent Events | Live anomaly feed and vote-count ticker |
| Offline sync | Dexie.js (IndexedDB wrapper) + Service Worker (Workbox), local-first write queue with idempotency keys | Current offline-first PWA practice treats IndexedDB as the source of truth on-device, queues mutations, and replays them with a `clientRequestId` so a retried sync never double-counts a vote |
| Identity/liveness check | An existing open-source or vendor face-liveness/anti-spoofing SDK, not a custom model | Passive liveness + deepfake detection is an active, hard research area (3D masks, video replay, GAN-generated faces); building this from scratch is out of scope — integrate an existing library/API behind an interface so it's swappable |

---

## 3. System Architecture (text diagram)

```
┌────────────────────┐        ┌──────────────────────┐
│  Voter PWA (Next.js)│◄──────►│  Admin Dashboard (Next.js)│
│  - MFA login         │        │  - Live anomaly feed   │
│  - Face capture       │        │  - Audit trail explorer│
│  - Offline vote queue │        │  - Manual review queue │
└─────────┬────────────┘        └───────────┬───────────┘
          │ REST/WS                          │ REST/WS
          ▼                                  ▼
┌─────────────────────────── Backend API (Next.js API routes / Node) ───────────────────────────┐
│  Auth (OTP + face match) → Risk check (calls AI service) → Vote submit → Chain write            │
└───────┬───────────────────────────┬───────────────────────────────┬────────────────────────────┘
        │                           │                                │
        ▼                           ▼                                ▼
┌───────────────┐        ┌────────────────────┐          ┌────────────────────────┐
│  MongoDB        │        │  AI Fraud Service    │          │  Smart Contracts on      │
│  (off-chain      │        │  (FastAPI, Python)    │          │  Hardhat/testnet chain    │
│  metadata only)  │        │  - anomaly scoring     │          │  - Election, Ballot,      │
│                  │        │  - device fingerprint  │          │    VoterRegistry contracts│
│                  │        │  - bot/rate detection   │          │  - events → audit trail   │
└───────────────┘        └────────────────────┘          └────────────────────────┘
```

---

## 4. Module Specs

Build in this order. Each module below is written so you can hand it to the assistant as its own focused sub-task.

### 4.1 Smart contracts (Solidity + Hardhat)

- `VoterRegistry.sol`: maps a hashed voter ID → `hasVoted` boolean per election ID. Never store PII on-chain — only salted hashes.
- `Election.sol`: election metadata (id, title, candidate list, start/end timestamps, status enum: `Scheduled | Open | Closed | Audited`).
- `Ballot.sol`: `castVote(electionId, candidateId, voterCommitment)` — enforces one vote per voter commitment per election, emits a `VoteCast` event (no plaintext voter identity in the event).
- Use OpenZeppelin `AccessControl` with at least two roles: `ELECTION_ADMIN_ROLE` (create/open/close elections) and `OFFICIAL_ROLE` (can flag/annotate — never alter — a vote record). Avoid a single privileged owner address.
- Use the checks-effects-interactions pattern; guard against re-entrancy and double-submission with a mapping-based nonce/commitment check, not just a `require` on a mutable counter.
- Write Hardhat tests covering: double-vote rejection, unauthorized election creation, vote-after-close rejection, event correctness.
- Deploy scripts targeting `hardhat` (local) and `sepolia` (testnet demo) networks via `.env`-configured RPC + private key.

### 4.2 Backend API (Next.js API routes or a separate Node/Express service)

- `POST /api/auth/request-otp`, `POST /api/auth/verify-otp` — SMS/email OTP as MFA factor one.
- `POST /api/auth/face-verify` — forwards the captured frame to the liveness/match SDK; factor two.
- `POST /api/vote` — orchestrates: confirm both MFA factors passed → call AI fraud service with the request's feature payload (see 4.3) → if risk score is below threshold, sign and submit the transaction to `Ballot.sol`; if above threshold, write to a `flagged_votes` queue in MongoDB **and still allow the vote to be queued for review**, never a silent drop.
- `GET /api/audit/:electionId` — reads on-chain events and returns a verifiable, paginated trail for the explorer view.
- All endpoints behind rate limiting (e.g., `express-rate-limit` or a token-bucket middleware) as a first line of bot defense, independent of the ML layer.

### 4.3 AI fraud-detection microservice (Python, FastAPI)

Design this as **behavioral risk scoring for individual vote attempts**, not as definitive fraud proof — the research literature on ML-based election-fraud detection (Benford's-law tests, Random Forest models on aggregate turnout data, etc.) works at the *precinct/aggregate* level after the fact, not as a real-time per-vote gate. Keep those two use cases separate:

**A. Real-time per-vote risk score** (`POST /score`) — input features:
- Device fingerprint hash + whether it's been seen before this election
- IP address / coarse geolocation, and velocity (same voter credential attempting from geographically implausible locations in a short window)
- Submission timing pattern (interval regularity suggestive of scripted/bot submission)
- Face-match confidence score and liveness score from the SDK
- Duplicate-hash check against `VoterRegistry` state
- Output: a 0–1 risk score plus the top contributing factors (for explainability in the review queue)
- Model: start with a simple, explainable approach — a rules engine combined with an Isolation Forest or logistic regression trained on synthetic/simulated data (label real fraud data does not exist for you to train on; be explicit in your report that this is trained on synthetic scenarios, not real election fraud, so its real-world accuracy is unproven).

**B. Post-election aggregate anomaly view** (`POST /audit/aggregate`) — for the dashboard's "statistical irregularities" panel:
- Simple statistical checks on result distributions across simulated polling groups (e.g., flagging implausibly round vote-share numbers or turnout outliers), inspired by published election-forensics techniques. Label this panel clearly as a **research-inspired heuristic for demonstration**, not a fraud verdict.

Both endpoints return structured JSON with a score, reason codes, and a confidence caveat — the frontend must never render these as "FRAUD DETECTED," only as "flagged for review."

### 4.4 Voter PWA (Next.js)

- Login → OTP → face capture (liveness SDK) → ballot screen → confirmation screen showing the on-chain transaction hash once mined.
- PWA manifest + service worker so the app shell and ballot screen are cacheable.
- If offline when the voter submits: write the vote to the local Dexie/IndexedDB queue with a client-generated idempotency key, show a clear "queued, will sync when online" state, and register a background-sync task.

### 4.5 Offline-to-online sync

- Local IndexedDB is the source of truth on-device until synced; each queued vote carries `{ clientRequestId, electionId, encryptedBallotPayload, capturedAt }`.
- On reconnect, replay the queue against `POST /api/vote`; the backend must be idempotent on `clientRequestId` so a retried sync can never create two votes.
- Surface sync state (pending / synced / failed) in the UI; failed items go to a dead-letter list with a manual retry action, never a silent drop.
- Use exponential backoff with jitter for retries.

### 4.6 Admin live monitoring dashboard

- Live vote-count ticker (via WebSocket/SSE) sourced from on-chain events, not directly from MongoDB, so it reflects the ledger's canonical state.
- Flagged-review queue: list of risk-scored vote attempts with reason codes, and an action to mark reviewed/cleared/escalated (this action is an annotation only — it must not alter the underlying ballot record).
- Blockchain audit trail explorer: paginated list of `VoteCast` events with tx hash, block number, timestamp, and a "verify on-chain" link/lookup.

### 4.7 Data models (MongoDB, off-chain only)

```
voters            { voterHashId, mfaStatus, deviceFingerprints[], createdAt }
elections_meta    { electionId, title, candidates[], status, syncedFromChainAt }
flagged_votes     { attemptId, electionId, riskScore, reasonCodes[], reviewStatus, reviewedBy, reviewedAt }
sync_queue_log    { clientRequestId, deviceId, status, lastAttemptAt }
```

Smart-contract-side state (on-chain, canonical): `Election`, `hasVoted[voterCommitment][electionId]`, `VoteCast` events.

---

## 5. Security & Scope Guardrails (give these to the assistant explicitly)

- Never store plaintext voter identity, face images, or vote choices in MongoDB or in on-chain event logs — hash/commit as appropriate, and store raw biometric captures only transiently in memory during the liveness check, not persisted.
- MFA, rate limiting, and the AI risk score are three independent layers — none of them should be a single point of failure for the whole system.
- All admin actions (creating an election, closing it, reviewing a flagged vote) must be role-gated via `AccessControl`/backend RBAC and logged.
- Every AI-driven decision must be reviewable by a human before it affects a voter (no auto-block).
- Include a `LIMITATIONS.md` in the deliverable that honestly states: this system has not been security-audited, the ML fraud model is trained on synthetic data, coercion-resistance is not solved, and it is not intended for real government elections.

---

## 6. Suggested Build Order (phases)

1. Scaffold monorepo: `/contracts` (Hardhat), `/web` (Next.js), `/ai-service` (FastAPI), `/docs`.
2. Smart contracts + Hardhat tests + local deployment script.
3. Backend API skeleton wired to a locally deployed contract (Hardhat Network) with mocked AI scoring.
4. Voter PWA: auth flow → ballot → confirmation, against the mocked backend.
5. Real AI fraud-scoring service (rules engine first, then the Isolation Forest/logistic model on synthetic data), wired into the vote-submission flow.
6. Admin dashboard: live ticker, flagged-review queue, audit-trail explorer.
7. Offline sync: Dexie queue, service worker, replay + idempotency, conflict/dead-letter UI.
8. Integration pass: end-to-end test casting votes online and offline, confirm one-vote-per-voter enforcement, confirm flagged items surface correctly.
9. Write `README.md` (setup/run instructions) and `LIMITATIONS.md`.

---

## 7. What to Ask the User Before/While Building

When you (the AI assistant) start implementation, confirm:
- Which chain target for the demo: local Hardhat only, or also a public testnet deploy?
- Preferred liveness/face-match SDK (open-source self-hosted vs. a vendor API), since this affects setup complexity and any API-key requirements.
- Scale target for the demo (tens vs. thousands of simulated voters) — this affects whether the AI service needs any real performance tuning or can stay simple.
