# LIMITATIONS.md — Smart Voting System

> This document is a required part of the project deliverable. It provides an honest, complete statement of what this prototype does and does not guarantee. Read it before drawing any conclusions about the system's real-world applicability.

---

## What This System Is

This is an **academic/capstone demonstrator** built as a final-year undergraduate project. It combines blockchain smart contracts, AI behavioral scoring, and a Progressive Web App to demonstrate how these technologies can be integrated for an e-voting context.

---

## What This System Is NOT

### 1. Not Security-Audited

This system **has not undergone any security audit, penetration test, or formal verification**.

- The smart contracts have not been audited by a third-party security firm.
- The backend API has not been tested against the OWASP Top 10.
- The JWT implementation, rate limiting, and RBAC have not been independently reviewed.
- Real voting systems used in government elections are subject to years of certification, multi-party auditing, and formal verification processes that are entirely out of scope here.

### 2. ML Model Trained on Synthetic Data

The AI fraud-detection model (Isolation Forest + rules engine) was **trained entirely on synthetic/simulated data** generated to represent plausible patterns of normal and suspicious voting behavior.

- **There is no real election fraud dataset** available to train on, and it would be inappropriate to use one without extensive oversight even if it existed.
- Because the model was not trained on real fraud patterns, its **real-world accuracy is unproven and likely poor**.
- The model's outputs should be treated as **demonstration heuristics**, not as reliable fraud indicators.
- The Benford's law and turnout-outlier checks in the aggregate audit panel are **research-inspired demonstrations** of published election forensics techniques — they are labeled clearly in the UI and must not be interpreted as fraud verdicts.

### 3. AI Flags for Human Review Only — Never Auto-Blocks

By design, the AI layer **never silently discards, alters, or blocks a vote**. A high risk score means the vote attempt is added to a human review queue while still being processed. This is an intentional design constraint documented in the spec. Any modification to remove this constraint would fundamentally change the ethical character of the system.

### 4. Coercion-Resistance Not Solved

This system provides **no coercion-resistance or receipt-freeness**.

- A voter could be coerced into voting a certain way and then forced to show their confirmation screen.
- A voter could sell their credentials.
- These are open research problems in e-voting cryptography (involving techniques like blind signatures, mix-nets, zero-knowledge proofs) that are out of scope for this prototype.

### 5. Voter Identity / Registration Out of Scope

This prototype **does not solve voter identity issuance or civil registry integration**.

- Voter eligibility is assumed to come from a pre-verified voter roll uploaded into the system.
- The face liveness check (face-api.js) is a client-side JavaScript library — it is not equivalent to a certified biometric identity verification system.
- The "liveness" detection (blink detection) is a basic anti-spoofing measure and would not defeat a sophisticated adversary with a 3D mask or a deepfake video.

### 6. Not Targeting Any Real Network

All blockchain components target **Hardhat Network (local development chain) only**.

- No real ETH is used.
- No real blockchain security properties (finality, decentralization, censorship resistance) apply to the local development chain.
- This system must never be deployed to Ethereum mainnet or any real public chain without a full security audit.

### 7. Not Production-Ready Infrastructure

- No HTTPS/TLS configuration (uses `localhost` HTTP in dev mode)
- No secrets management (uses `.env` files)
- No container orchestration or production deployment scripts
- No database backup or disaster-recovery plan
- No load testing has been performed
- Socket.IO CORS is set to allow all origins (development only)

### 8. Privacy Limitations

- While vote choices are never stored in MongoDB and no PII is stored on-chain, the face descriptors (128-dimensional numerical vectors from face-api.js) are temporarily stored in MongoDB during the authentication session. Although these are not photographs, they could potentially be used to reconstruct facial similarity. In a real system, these would require GDPR-compliant handling.
- OTPs in this demo are printed to the server console rather than sent via SMS, which is not production-safe.

---

## What the System DOES Demonstrate (Within Its Scope)

| Capability | Status |
|-----------|--------|
| Immutable vote records via Solidity smart contracts | ✅ Demonstrated |
| One-vote-per-voter enforcement on-chain | ✅ Enforced via commitment mapping |
| Role-separated admin access (AccessControl) | ✅ ELECTION_ADMIN_ROLE, OFFICIAL_ROLE |
| Real-time behavioral risk scoring (per-vote) | ✅ Rules engine + Isolation Forest |
| Human-review flagging (no auto-block) | ✅ Enforced by design |
| Offline vote queuing with idempotent sync | ✅ Dexie.js + clientRequestId |
| Live admin dashboard via WebSockets | ✅ Socket.IO + chain events |
| Multi-factor authentication (OTP + face liveness) | ✅ JWT-based MFA flow |
| Blockchain audit trail explorer | ✅ On-chain VoteCast events |

---

## Recommended Before Any Real Deployment

If this prototype were ever to be extended toward real use (which is not recommended without significant work), the following would be minimum requirements:

1. Full smart contract audit by a recognized security firm
2. Replace synthetic ML model with an approach designed for real operational environments (and consult with election security experts)
3. Integrate a certified biometric identity verification SDK
4. Implement end-to-end encryption of ballot payloads
5. Add receipt-freeness and coercion-resistance mechanisms
6. GDPR/privacy-law compliance review for all data stored
7. Full penetration test and vulnerability assessment
8. Compliance review for election law in the relevant jurisdiction
9. Multi-party oversight and key management for contract deployment
10. Independent security audit of the entire infrastructure

---

*This LIMITATIONS.md was written as part of the project deliverable requirements and reflects an honest assessment of the prototype's scope.*
