"""
Post-election aggregate anomaly view
Academic demonstrator inspired by election-forensics literature (Benford's law, turnout outliers).
Must always be displayed as a heuristic demonstration, never as a fraud verdict.
"""

import math
import numpy as np

BENFORD_DIST = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046]

class AggregateAuditor:
    @staticmethod
    def benford_test(vote_counts: list[int]) -> dict:
        first_digits = []
        for v in vote_counts:
            if v > 0:
                s = str(abs(v))
                first_digits.append(int(s[0]))

        if len(first_digits) < 10:
            return {
                "applicable": False,
                "reason": "Sample size too small (minimum 10 entries required)",
                "observed_distribution": {},
                "expected_distribution": {str(i+1): BENFORD_DIST[i] for i in range(9)},
                "chi_square": None,
                "p_value_approx": None,
                "disclaimer": "Benford's Law is a research heuristic and not definitive proof of fraud."
            }

        counts = {d: first_digits.count(d) for d in range(1, 10)}
        total = len(first_digits)
        observed = {str(d): counts[d] / total for d in range(1, 10)}
        expected = {str(i + 1): BENFORD_DIST[i] for i in range(9)}

        chi_sq = sum(
            ((counts[d] - total * BENFORD_DIST[d - 1]) ** 2) / (total * BENFORD_DIST[d - 1])
            for d in range(1, 10)
        )

        return {
            "applicable": True,
            "sample_size": total,
            "chi_square": round(float(chi_sq), 3),
            "observed_distribution": observed,
            "expected_distribution": expected,
            "deviation_flag": bool(chi_sq > 15.51), # critical val for df=8, alpha=0.05
            "disclaimer": "Benford's Law analysis is an election forensics demonstration heuristic. Departures from Benford's Law frequently occur naturally depending on ballot sizes and district demographics."
        }

    @staticmethod
    def turnout_outlier_check(turnout_data: list[dict]) -> dict:
        rates = []
        for item in turnout_data:
            eligible = item.get("eligible", 0)
            voted = item.get("voted", 0)
            if eligible > 0:
                rates.append(voted / eligible)

        if len(rates) < 3:
            return {
                "applicable": False,
                "reason": "Need at least 3 groups for statistical outlier detection",
                "flagged_groups": [],
                "disclaimer": "Demonstration heuristic only."
            }

        mean = float(np.mean(rates))
        std = float(np.std(rates))
        flagged = []

        for item in turnout_data:
            eligible = item.get("eligible", 0)
            voted = item.get("voted", 0)
            if eligible > 0:
                rate = voted / eligible
                z_score = (rate - mean) / (std if std > 1e-6 else 1.0)
                if abs(z_score) >= 2.0 or rate > 1.0:
                    flagged.append({
                        "group": item.get("group", "Unknown"),
                        "turnout_rate": round(rate, 4),
                        "z_score": round(float(z_score), 2),
                        "eligible": eligible,
                        "voted": voted,
                        "reason": "Turnout > 100%" if rate > 1.0 else f"Statistical turnout outlier (|z| = {abs(z_score):.1f})"
                    })

        return {
            "applicable": True,
            "mean_turnout": round(mean, 4),
            "std_dev": round(std, 4),
            "flagged_groups": flagged,
            "disclaimer": "Turnout distribution analysis flags demographic variance for review; not proof of manipulation."
        }

    @staticmethod
    def round_number_check(vote_counts: list[int]) -> dict:
        round_100 = [v for v in vote_counts if v >= 100 and v % 100 == 0]
        round_50 = [v for v in vote_counts if v >= 50 and v % 50 == 0]
        
        return {
            "total_records": len(vote_counts),
            "count_divisible_by_100": len(round_100),
            "count_divisible_by_50": len(round_50),
            "suspicious_proportion": bool(len(round_100) / max(len(vote_counts), 1) > 0.3),
            "disclaimer": "Round number frequencies are an illustrative indicator from forensic literature."
        }
