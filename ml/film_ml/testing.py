from __future__ import annotations

import math
from typing import Any


def precision_at_k(y_true: list[int], scores: list[float], k: int) -> float | None:
    if not y_true:
        return None
    k = min(k, len(y_true))
    ranked = sorted(zip(scores, y_true), reverse=True)[:k]
    return sum(label for _, label in ranked) / k


def recall_at_k(y_true: list[int], scores: list[float], k: int) -> float | None:
    positives = sum(y_true)
    if positives == 0:
        return None
    k = min(k, len(y_true))
    ranked = sorted(zip(scores, y_true), reverse=True)[:k]
    return sum(label for _, label in ranked) / positives


def hit_rate_at_k(y_true: list[int], scores: list[float], k: int) -> float | None:
    if not y_true:
        return None
    k = min(k, len(y_true))
    ranked = sorted(zip(scores, y_true), reverse=True)[:k]
    return 1.0 if any(label for _, label in ranked) else 0.0


def dcg(labels: list[int]) -> float:
    return sum(((2 ** label) - 1) / math.log2(index + 2) for index, label in enumerate(labels))


def ndcg_at_k(y_true: list[int], scores: list[float], k: int) -> float | None:
    if not y_true:
        return None
    k = min(k, len(y_true))
    ranked_labels = [label for _, label in sorted(zip(scores, y_true), reverse=True)[:k]]
    ideal_labels = sorted(y_true, reverse=True)[:k]
    ideal = dcg(ideal_labels)
    if ideal == 0:
        return None
    return dcg(ranked_labels) / ideal


def calibration_buckets(y_true: list[int], scores: list[float], bucket_count: int = 5) -> list[dict[str, Any]]:
    buckets = []
    for bucket in range(bucket_count):
        low = bucket / bucket_count
        high = (bucket + 1) / bucket_count
        pairs = [
            (score, label)
            for score, label in zip(scores, y_true)
            if (low <= score < high) or (bucket == bucket_count - 1 and score == high)
        ]
        if not pairs:
            buckets.append({"low": low, "high": high, "count": 0, "avgProbability": None, "observedRate": None})
            continue
        buckets.append({
            "low": low,
            "high": high,
            "count": len(pairs),
            "avgProbability": sum(score for score, _ in pairs) / len(pairs),
            "observedRate": sum(label for _, label in pairs) / len(pairs),
        })
    return buckets


def ranking_metrics(y_true: list[int], scores: list[float], ks: list[int]) -> dict[str, Any]:
    return {
        f"precisionAt{k}": precision_at_k(y_true, scores, k)
        for k in ks
    } | {
        f"recallAt{k}": recall_at_k(y_true, scores, k)
        for k in ks
    } | {
        f"hitRateAt{k}": hit_rate_at_k(y_true, scores, k)
        for k in ks
    } | {
        f"ndcgAt{k}": ndcg_at_k(y_true, scores, k)
        for k in ks
    }
