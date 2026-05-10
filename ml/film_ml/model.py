from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

MODEL_VERSION = "high_rating_stdlib_logreg_v0.3.0"


@dataclass(frozen=True)
class TargetSpec:
    name: str
    label_key: str
    probability_key: str


TARGETS = [
    TargetSpec("high_rating", "ratingAtLeast4", "mlHighRatingProbability"),
    TargetSpec("strong_rating", "ratingAtLeast45", "mlStrongRatingProbability"),
]


def dot(weights: dict[str, float], features: dict[str, float]) -> float:
    return sum(weights.get(key, 0.0) * value for key, value in features.items())


def sigmoid(value: float) -> float:
    if value >= 0:
        z = math.exp(-value)
        return 1 / (1 + z)
    z = math.exp(value)
    return z / (1 + z)


def train_logistic_regression(
    feature_rows: list[dict[str, float]],
    labels: list[int],
    max_iter: int,
    learning_rate: float,
    l2: float,
) -> dict[str, Any]:
    weights: dict[str, float] = {}
    positives = sum(labels)
    negatives = len(labels) - positives
    positive_weight = len(labels) / (2 * positives) if positives else 1.0
    negative_weight = len(labels) / (2 * negatives) if negatives else 1.0

    for _ in range(max_iter):
        for features, label in zip(feature_rows, labels):
            prediction = sigmoid(dot(weights, features))
            sample_weight = positive_weight if label == 1 else negative_weight
            error = (prediction - label) * sample_weight
            for key, value in features.items():
                current = weights.get(key, 0.0)
                penalty = 0.0 if key == "bias" else l2 * current
                weights[key] = current - learning_rate * (error * value + penalty)

    return {
        "modelVersion": MODEL_VERSION,
        "modelType": "standard_library_logistic_regression",
        "weights": dict(sorted(weights.items())),
        "training": {
            "iterations": max_iter,
            "learningRate": learning_rate,
            "l2": l2,
            "positiveWeight": positive_weight,
            "negativeWeight": negative_weight,
        },
    }


def predict_probabilities(model: dict[str, Any], feature_rows: list[dict[str, float]]) -> list[float]:
    weights = model["weights"]
    return [sigmoid(dot(weights, features)) for features in feature_rows]
