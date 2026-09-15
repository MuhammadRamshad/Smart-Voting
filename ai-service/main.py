"""
AI-Powered Fraud Detection Microservice
Academic prototype demonstrating real-time behavioral risk scoring and aggregate election forensics.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from models.risk_scorer import RiskScorer
from models.aggregate_audit import AggregateAuditor
from config import settings

app = FastAPI(
    title="Smart Voting AI Fraud Detection Microservice",
    description="Behavioral anomaly risk scoring and statistical election forensics (Academic Prototype)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

risk_scorer: Optional[RiskScorer] = None

@app.on_event("startup")
def startup_event():
    global risk_scorer
    print("[AI Microservice] Initializing RiskScorer and synthetic models...")
    risk_scorer = RiskScorer()
    print("[AI Microservice] Ready to accept scoring requests.")

class VoteFeatures(BaseModel):
    device_fingerprint_hash: str
    device_seen_before: bool = False
    ip_velocity: int = 0
    geo_implausible: bool = False
    timing_regularity: float = 0.0
    face_confidence: float = 1.0
    liveness_score: float = 1.0
    duplicate_hash: bool = False
    time_since_last_attempt: float = 999.0
    voter_hash: str
    election_id: str

class RiskResponse(BaseModel):
    risk_score: float
    flagged: bool
    review_required: bool
    reason_codes: List[str]
    contributing_factors: List[Dict[str, Any]]
    confidence_caveat: str

class TurnoutGroup(BaseModel):
    group: str
    eligible: int
    voted: int

class AggregateAuditRequest(BaseModel):
    election_id: str
    vote_counts: List[int]
    turnout_data: List[TurnoutGroup] = []

class AggregateAuditResponse(BaseModel):
    election_id: str
    benford_test: Dict[str, Any]
    turnout_outliers: Dict[str, Any]
    round_number_check: Dict[str, Any]
    disclaimer: str

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "AI Fraud Detection Microservice",
        "model_loaded": risk_scorer is not None and risk_scorer.model is not None,
        "risk_threshold": settings.risk_threshold
    }

@app.post("/score", response_model=RiskResponse)
def score_vote(features: VoteFeatures):
    if risk_scorer is None:
        raise HTTPException(status_code=503, detail="Model is still initializing")
    
    result = risk_scorer.score(features.dict())
    return result

@app.post("/audit/aggregate", response_model=AggregateAuditResponse)
def audit_aggregate(req: AggregateAuditRequest):
    benford = AggregateAuditor.benford_test(req.vote_counts)
    turnout = AggregateAuditor.turnout_outlier_check([t.dict() for t in req.turnout_data])
    round_num = AggregateAuditor.round_number_check(req.vote_counts)

    return {
        "election_id": req.election_id,
        "benford_test": benford,
        "turnout_outliers": turnout,
        "round_number_check": round_num,
        "disclaimer": "All aggregate forensic metrics are research-inspired heuristics for demonstration purposes only. They are not legal verdicts of irregularity."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
