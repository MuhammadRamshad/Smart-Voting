"""
Synthetic Training Data Generator for Isolation Forest Anomaly Detection
CAVEAT: This data is purely synthetic and simulated for an academic demonstration prototype.
It does NOT reflect real election fraud. Real-world fraud datasets do not exist for ethical
and security reasons.
"""

import numpy as np

def generate_synthetic_data(n_samples: int = 5000, random_seed: int = 42):
    np.random.seed(random_seed)
    n_normal = int(n_samples * 0.8)
    n_suspicious = n_samples - n_normal

    # Features order:
    # 0: device_seen_before (0 or 1)
    # 1: ip_velocity (attempts in last 5m)
    # 2: geo_implausible (0 or 1)
    # 3: timing_regularity (0-1 float)
    # 4: face_confidence (0-1 float)
    # 5: liveness_score (0-1 float)
    # 6: duplicate_hash (0 or 1)
    # 7: time_since_last_attempt (seconds)

    # 1. Normal samples (80%)
    normal_device = np.random.choice([0, 1], size=n_normal, p=[0.1, 0.9])
    normal_ip_velocity = np.random.poisson(lam=0.5, size=n_normal)
    normal_geo_implausible = np.zeros(n_normal)
    normal_timing_reg = np.random.uniform(0.0, 0.35, size=n_normal)
    normal_face_conf = np.random.uniform(0.75, 1.0, size=n_normal)
    normal_liveness = np.random.uniform(0.80, 1.0, size=n_normal)
    normal_dup_hash = np.zeros(n_normal)
    normal_time_since = np.random.exponential(scale=600.0, size=n_normal) + 30.0

    X_normal = np.column_stack([
        normal_device,
        normal_ip_velocity,
        normal_geo_implausible,
        normal_timing_reg,
        normal_face_conf,
        normal_liveness,
        normal_dup_hash,
        normal_time_since
    ])

    # 2. Suspicious samples (20%)
    susp_device = np.random.choice([0, 1], size=n_suspicious, p=[0.85, 0.15])
    susp_ip_velocity = np.random.randint(4, 25, size=n_suspicious)
    susp_geo_implausible = np.random.choice([0, 1], size=n_suspicious, p=[0.5, 0.5])
    susp_timing_reg = np.random.uniform(0.80, 1.0, size=n_suspicious)
    susp_face_conf = np.random.uniform(0.2, 0.65, size=n_suspicious)
    susp_liveness = np.random.uniform(0.1, 0.55, size=n_suspicious)
    susp_dup_hash = np.random.choice([0, 1], size=n_suspicious, p=[0.7, 0.3])
    susp_time_since = np.random.uniform(0.5, 8.0, size=n_suspicious)

    X_suspicious = np.column_stack([
        susp_device,
        susp_ip_velocity,
        susp_geo_implausible,
        susp_timing_reg,
        susp_face_conf,
        susp_liveness,
        susp_dup_hash,
        susp_time_since
    ])

    X = np.vstack([X_normal, X_suspicious])
    y = np.hstack([np.zeros(n_normal), np.ones(n_suspicious)])

    # Shuffle
    indices = np.arange(len(X))
    np.random.shuffle(indices)
    return X[indices], y[indices]

def get_training_data():
    X, _ = generate_synthetic_data()
    return X
