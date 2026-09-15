# AI-Powered Blockchain-Based Smart Voting System

> **Academic Prototype** — This is a capstone/final-year project demonstrator. It is NOT intended for real government elections and has NOT been security-audited. See `LIMITATIONS.md` for a full scope statement.

---

## Overview

A full-stack, blockchain-secured voting system combining:

- **Tamper-evident blockchain ledger** — Solidity smart contracts on a local Hardhat network record every cast vote immutably
- **AI fraud detection** — Python FastAPI microservice scores each vote attempt in real-time using a rules engine + Isolation Forest model, flagging suspicious behavior for human review
- **Offline-first PWA** — Next.js voter interface works offline via Service Worker + IndexedDB queue with idempotent sync
- **Live admin dashboard** — WebSocket-powered live vote ticker, flagged-vote review queue, and on-chain audit trail explorer

---

## Monorepo Structure

```
Vote/
├── contracts/          <- Solidity contracts + Hardhat
├── web/                <- Next.js 14 (App Router) + TypeScript + Tailwind
├── ai-service/         <- Python FastAPI fraud-detection microservice
├── docs/               <- Architecture diagrams and design notes
├── README.md           <- This file
└── LIMITATIONS.md      <- Honest scope limitations
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20 LTS |
| npm | >= 10 |
| Python | >= 3.11 |
| pip | >= 24 |
| MongoDB | >= 7.0 (running locally) |

---

## Quick Start

### Step 1: Install dependencies

```bash
# Smart contracts
cd contracts && npm install

# Web app
cd ../web && npm install

# AI service
cd ../ai-service && pip install -r requirements.txt
```

### Step 2: Configure environment variables

```bash
cp contracts/.env.example contracts/.env
cp web/.env.example web/.env
cp ai-service/.env.example ai-service/.env
```

Edit `web/.env` — set your MongoDB URI and a strong JWT secret.

### Step 3: Start Hardhat local blockchain (Terminal 1)

```bash
cd contracts
npx hardhat node
```

### Step 4: Deploy smart contracts (Terminal 2)

```bash
cd contracts
npm run deploy:local
```

This deploys all contracts and writes ABIs + addresses to `web/contracts/`.

### Step 5: Start AI service (Terminal 3)

```bash
cd ai-service
uvicorn main:app --reload --port 8001
```

Trains the model on synthetic data at first start (~5 seconds). API docs: http://localhost:8001/docs

### Step 6: Start web app (Terminal 4)

```bash
cd web
npm run dev
```

App runs at http://localhost:3000

---

## Access Points

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/login | Voter login |
| http://localhost:3000/admin/dashboard | Admin live dashboard |
| http://localhost:3000/admin/elections | Manage elections |
| http://localhost:3000/admin/flagged | Flagged vote review |
| http://localhost:3000/admin/audit | Blockchain audit trail |
| http://localhost:8001/docs | AI service Swagger UI |

---

## Voter Flow

1. Enter Voter ID → receive OTP (printed to console in dev mode)
2. Enter 6-digit OTP
3. Camera opens — face-api.js blink/liveness detection + face descriptor capture
4. Select candidate on ballot screen
5. Submit → AI risk scoring → blockchain write
6. On-chain transaction hash shown on confirmation screen

### Offline Voting

If offline when submitting:
- Vote saved to IndexedDB (Dexie.js) with UUID idempotency key
- UI shows "Queued — will sync when online"
- Auto-syncs on reconnect with exponential backoff + jitter
- Dead-letter list shown if 5 retries fail

---

## Admin Flow

1. Login at `/admin/dashboard`
2. Create elections (title, candidates, start/end times)
3. Monitor live vote ticker via WebSocket
4. Review AI-flagged votes — annotate as cleared/escalated (never alters ballot)
5. Browse blockchain audit trail

---

## Running Tests

```bash
cd contracts
npx hardhat test
```

Covers: double-vote rejection, unauthorized election creation, vote-after-close, event correctness, access control.

---

## Security Architecture (Prototype-Grade)

| Layer | Mechanism |
|-------|-----------|
| Rate limiting | Token-bucket per IP, independent of ML |
| MFA | OTP (factor 1) + face-api.js liveness (factor 2) |
| AI risk scoring | Real-time behavioral scoring, human review only |
| Blockchain | Immutable vote records once mined |
| RBAC | Smart contract AccessControl + API-layer role checks |
| Privacy | No PII on-chain — salted hashes only |

---

## See Also

- `LIMITATIONS.md` — honest statement of what this prototype does NOT guarantee
- `ai-service/README.md` — AI service documentation
- `docs/` — architecture diagrams
