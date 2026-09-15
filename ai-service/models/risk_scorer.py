"""
Hybrid Risk Scorer (Explainable Rules Engine + Isolation Forest)
Flags vote attempts for HUMAN REVIEW only. Never silently discards or alters votes.
"""

import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from data.synthetic_generator import get_training_data
from config import settings

class RiskScorer:
    def __init__(self):
        self.model_path = settings.model_path
        self.model: IsolationForest = None
        self.load_or_train_model()

    def train(self, X):
        model = IsolationForest(
            contamination=0.2,
            random_state=42,
            n_estimators=100
        )
        model.fit(X)
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(model, self.model_path)
        self.model = model
        print(f"[RiskScorer] Isolation Forest trained and saved to {self.model_path}")

    def load_or_train_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                print(f"[RiskScorer] Loaded existing model from {self.model_path}")
                return
            except Exception as e:
                print(f"[RiskScorer] Error loading model: {e}. Retraining...")
        
        X = get_training_data()
        self.train(X)

    def score(self, features: dict) -> dict:
        device_seen = 1 if features.get("device_seen_before", False) else 0
        ip_velocity = int(features.get("ip_velocity", 0))
        geo_implausible = 1 if features.get("geo_implausible", False) else 0
        timing_reg = float(features.get("timing_regularity", 0.0))
        face_conf = float(features.get("face_confidence", 1.0))
        liveness_score = float(features.get("liveness_score", 1.0))
        dup_hash = 1 if features.get("duplicate_hash", False) else 0
        time_since = float(features.get("time_since_last_attempt", 999.0))

        # 1. Deterministic Explainable Rules Engine
        reason_codes = []
        contributing_factors = []
        rule_score = 0.0

        if dup_hash == 1:
            reason_codes.append("DUPLICATE_VOTER_HASH")
            contributing_factors.append({"factor": "duplicate_hash", "weight": 0.95, "detail": "Voter commitment hash previously marked as voted"})
            rule_score += 0.95

        if liveness_score < 0.4:
            reason_codes.append("LIVENESS_FAILED")
            contributing_factors.append({"factor": "liveness_score", "weight": 0.70, "detail": f"Biometric liveness score ({liveness_score:.2f}) below acceptable threshold"})
            rule_score += 0.70
        elif liveness_score < 0.65:
            reason_codes.append("LOW_LIVENESS_CONFIDENCE")
            contributing_factors.append({"factor": "liveness_score", "weight": 0.35, "detail": f"Marginal liveness score ({liveness_score:.2f})"})
            rule_score += 0.35

        if face_conf < 0.5:
            reason_codes.append("LOW_FACE_CONFIDENCE")
            contributing_factors.append({"factor": "face_confidence", "weight": 0.40, "detail": f"Face match confidence ({face_conf:.2f}) is weak"})
            rule_score += 0.40

        if ip_velocity > 5:
            reason_codes.append("HIGH_IP_VELOCITY")
            contributing_factors.append({"factor": "ip_velocity", "weight": 0.50, "detail": f"{ip_velocity} attempts from this IP within 5 minutes"})
            rule_score += 0.50
        elif ip_velocity > 2:
            reason_codes.append("ELEVATED_IP_VELOCITY")
            contributing_factors.append({"factor": "ip_velocity", "weight": 0.25, "detail": f"{ip_velocity} attempts from this IP within 5 minutes"})
            rule_score += 0.25

        if geo_implausible == 1:
            reason_codes.append("GEO_IMPLAUSIBLE")
            contributing_factors.append({"factor": "geo_implausible", "weight": 0.60, "detail": "Geographically implausible submission location transition"})
            rule_score += 0.60

        if timing_reg > 0.85:
            reason_codes.append("BOT_TIMING_PATTERN")
            contributing_factors.append({"factor": "timing_regularity", "weight": 0.45, "detail": "Scripted/robotic submission timing interval regularity"})
            rule_score += 0.45

        if time_since < 10.0:
            reason_codes.append("RAPID_RESUBMISSION")
            contributing_factors.append({"factor": "time_since_last_attempt", "weight": 0.50, "detail": f"Submitting again after only {time_since:.1f}s"})
            rule_score += 0.50

        if device_seen == 0 and ip_velocity > 2:
            reason_codes.append("NEW_DEVICE_HIGH_VELOCITY")
            contributing_factors.append({"factor": "device_fingerprint", "weight": 0.30, "detail": "Unrecognized device with elevated IP velocity"})
            rule_score += 0.30

        rules_score = min(1.0, rule_score)

        # 2. Isolation Forest Score
        iso_score = 0.0
        if self.model is not None:
            feat_vector = np.array([[
                device_seen,
                ip_velocity,
                geo_implausible,
                timing_reg,
                face_conf,
                liveness_score,
                dup_hash,
                time_since
            ]])
            raw_decision = self.model.decision_function(feat_vector)[0]
            # Normal scores ~ >0, anomaly ~ <0. Convert to 0-1 risk score:
            iso_score = float(np.clip(1.0 / (1.0 + np.exp(raw_decision * 12.0)), 0.0, 1.0))

        final_risk = float(max(rules_score, iso_score))
        flagged = bool(final_risk >= settings.risk_threshold)

        if flagged and not reason_codes:
            reason_codes.append("UNSUPERVISED_ANOMALY")
            contributing_factors.append({"factor": "isolation_forest", "weight": iso_score, "detail": "Feature vector cluster outlier detected by Isolation Forest"})

        return {
            "risk_score": round(final_risk, 3),
            "flagged": flagged,
            "review_required": flagged,
            "reason_codes": reason_codes,
            "contributing_factors": contributing_factors,
            "confidence_caveat": "This score is generated by a heuristic rules engine and an Isolation Forest model trained on synthetic simulation data. It is intended solely for flagging items for human review, NOT as a definitive fraud verdict."
        }
