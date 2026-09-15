# AI Fraud Detection Microservice (Python FastAPI)

> **Academic Prototype Notice**: This service operates on an explainable rules engine combined with an unsupervised Isolation Forest anomaly model trained on **synthetic data**. It does not reflect real-world election fraud. Flags are intended exclusively for **human review** and must never be used to automatically reject or drop legitimate votes.

## Architecture

1. **Deterministic Rules Engine (`models/risk_scorer.py`)**:
   - Evaluates high IP velocity, duplicate commitment hashes, sudden geographic anomalies, rapid sub-second submissions, and low biometric liveness/face-match scores.
2. **Isolation Forest (`models/risk_scorer.py`)**:
   - Anomaly detection on 8-dimensional behavioral vectors trained on simulated normal/suspicious voting behaviors.
3. **Aggregate Election Forensics (`models/aggregate_audit.py`)**:
   - Demonstrates Benford''s Law distribution testing, turnout outlier Z-score flags, and round-number cluster analysis.

## Setup & Running

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Interactive OpenAPI documentation available at `http://localhost:8001/docs`.
