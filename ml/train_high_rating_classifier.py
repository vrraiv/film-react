#!/usr/bin/env python3
"""Train a local high-rating classifier prototype from the app's ML export.

This script is intentionally isolated from the React app runtime. It reads the
JSON dataset exported by the app, trains simple logistic regression baselines, evaluates
against V1 deterministic scores, and writes predictions for later app ingestion.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

MODEL_VERSION = "high_rating_stdlib_logreg_v0.2.0"
DEFAULT_DATASET = Path("local/film-diary-ml-dataset-v1.json")
DEFAULT_OUTPUT_DIR = Path("ml/outputs")


@dataclass(frozen=True)
class TargetSpec:
    name: str
    label_key: str
    probability_key: str


TARGETS = [
    TargetSpec("high_rating", "ratingAtLeast4", "mlHighRatingProbability"),
    TargetSpec("strong_rating", "ratingAtLeast45", "mlStrongRatingProbability"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train local ML recommender prototype.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--validation-fraction", type=float, default=0.2)
    parser.add_argument("--min-positive-count", type=int, default=12)
    parser.add_argument("--ks", type=int, nargs="+", default=[5, 10, 25])
    parser.add_argument("--max-iter", type=int, default=2000)
    parser.add_argument("--learning-rate", type=float, default=0.04)
    parser.add_argument("--l2", type=float, default=0.0001)
    parser.add_argument("--random-state", type=int, default=42)
    return parser.parse_args()


def load_dataset(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict) or not isinstance(payload.get("rows"), list):
        raise ValueError("Dataset must be a JSON object with a rows array.")
    return payload


def as_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip().lower() for item in value if str(item).strip()]


def add_multi(features: dict[str, float], prefix: str, values: Iterable[str]) -> None:
    for value in values:
        clean = str(value).strip().lower()
        if clean:
            features[f"{prefix}={clean}"] = 1.0


def numeric(value: Any, default: float = 0.0) -> float:
    return float(value) if isinstance(value, (int, float)) and math.isfinite(value) else default


def row_to_features(row: dict[str, Any]) -> dict[str, float]:
    labels = row.get("labels") if isinstance(row.get("labels"), dict) else {}
    scores = row.get("v1Scores") if isinstance(row.get("v1Scores"), dict) else {}
    candidate = row.get("candidateMetadata") if isinstance(row.get("candidateMetadata"), dict) else {}
    feature_rows = row.get("featureClassifications") if isinstance(row.get("featureClassifications"), list) else []

    features: dict[str, float] = {
        "bias": 1.0,
        "runtime_scaled": numeric(row.get("runtime")) / 180,
        "year_scaled": (numeric(row.get("year"), 1980) - 1980) / 50,
        "manual_tag_count": float(len(as_list(row.get("manualTags")))),
        "tmdb_genre_count": float(len(as_list(row.get("tmdbGenres")))),
        "tmdb_keyword_count": min(float(len(as_list(row.get("tmdbKeywords")))), 30.0) / 30,
        "cast_count": float(len(as_list(row.get("cast")))),
        "writer_count": float(len(as_list(row.get("writers")))),
        "country_count": float(len(as_list(row.get("countries")))),
        "language_count": float(len(as_list(row.get("languages")))),
        "v1_interest": numeric(scores.get("interestScore")),
        "v1_satisfaction": numeric(scores.get("satisfactionScore")),
        "v1_risk": numeric(scores.get("riskScore")),
        "v1_confidence": numeric(scores.get("confidenceScore")),
        "v1_final_score": numeric(candidate.get("finalScore")),
        "watched": 1.0 if labels.get("watched") is True else 0.0,
        "sampled_unknown": 1.0 if labels.get("sampledNegativeOrUnknown") is True else 0.0,
    }

    add_multi(features, "manual_tag", as_list(row.get("manualTags")))
    add_multi(features, "tmdb_genre", as_list(row.get("tmdbGenres")))
    add_multi(features, "tmdb_keyword", as_list(row.get("tmdbKeywords")))
    add_multi(features, "writer", as_list(row.get("writers")))
    add_multi(features, "cast", as_list(row.get("cast")))
    add_multi(features, "country", as_list(row.get("countries")))
    add_multi(features, "language", as_list(row.get("languages")))

    director = row.get("director")
    if isinstance(director, str) and director.strip():
        features[f"director={director.strip().lower()}"] = 1.0

    for feature in feature_rows:
        if not isinstance(feature, dict):
            continue
        feature_type = str(feature.get("type", "")).strip().lower()
        key = str(feature.get("key", "")).strip().lower()
        classification = str(feature.get("classification", "")).strip().lower()
        if feature_type and key:
            stem = f"profile_feature={feature_type}:{key}"
            features[stem] = 1.0
            features[f"{stem}:affinity"] = numeric(feature.get("affinityScore"))
            features[f"{stem}:expected"] = numeric(feature.get("expectedSatisfactionScore"))
            features[f"{stem}:risk"] = numeric(feature.get("riskScore"))
            features[f"{stem}:confidence"] = numeric(feature.get("confidenceScore"))
        if feature_type and classification:
            features[f"classification={feature_type}:{classification}"] = 1.0

    return features


def watched_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        row
        for row in rows
        if row.get("rowKind") == "logged"
        and row.get("labelType") == "observed_rating"
        and isinstance(row.get("labels"), dict)
    ]


def parse_date(value: Any) -> datetime:
    if not isinstance(value, str) or not value:
        return datetime.min
    try:
        return datetime.fromisoformat(value[:10])
    except ValueError:
        return datetime.min


def split_rows(rows: list[dict[str, Any]], validation_fraction: float) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    train = [row for row in rows if row.get("split") == "train"]
    validation = [row for row in rows if row.get("split") == "validation"]
    if train and validation:
        return train, validation

    ordered = sorted(rows, key=lambda row: (parse_date(row.get("watchedDate")), str(row.get("movieId") or "")))
    validation_count = max(1, round(len(ordered) * validation_fraction))
    validation_start = max(0, len(ordered) - validation_count)
    return ordered[:validation_start], ordered[validation_start:]


def labels_for(rows: list[dict[str, Any]], label_key: str) -> list[int]:
    labels = []
    for row in rows:
        value = row.get("labels", {}).get(label_key)
        if value is True:
            labels.append(1)
        elif value is False:
            labels.append(0)
        else:
            raise ValueError(f"Missing boolean label {label_key} for row {row.get('movieId')}")
    return labels


def rows_with_boolean_label(rows: list[dict[str, Any]], label_key: str) -> list[dict[str, Any]]:
    return [
        row
        for row in rows
        if isinstance(row.get("labels"), dict)
        and isinstance(row["labels"].get(label_key), bool)
    ]


def can_train(y: list[int], min_positive_count: int) -> tuple[bool, str]:
    positives = sum(y)
    negatives = len(y) - positives
    if positives < min_positive_count:
        return False, f"only {positives} positives"
    if negatives < min_positive_count:
        return False, f"only {negatives} negatives"
    return True, "ok"


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


def evaluate_target(target: TargetSpec, y_true: list[int], ml_scores: list[float], baseline_scores: list[float], ks: list[int]) -> dict[str, Any]:
    return {
        "target": target.name,
        "validationRows": len(y_true),
        "validationPositiveRate": sum(y_true) / len(y_true) if y_true else None,
        "ml": ranking_metrics(y_true, ml_scores, ks),
        "v1Baseline": ranking_metrics(y_true, baseline_scores, ks),
        "calibrationBuckets": calibration_buckets(y_true, ml_scores),
    }


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def prediction_identity(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "movieId": row.get("movieId"),
        "tmdbId": row.get("tmdbId"),
        "title": row.get("title"),
        "rowKind": row.get("rowKind"),
        "split": row.get("split"),
    }


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    dataset = load_dataset(args.dataset)
    rows = dataset["rows"]
    watched = watched_rows(rows)
    train_rows, validation_rows = split_rows(watched, args.validation_fraction)
    all_features = [row_to_features(row) for row in rows]
    metrics: dict[str, Any] = {
      "modelVersion": MODEL_VERSION,
      "dataset": str(args.dataset),
      "rows": {
          "total": len(rows),
          "watched": len(watched),
          "train": len(train_rows),
          "validation": len(validation_rows),
          "candidate": len([row for row in rows if row.get("rowKind") == "candidate"]),
      },
      "targets": {},
    }
    predictions = [prediction_identity(row) | {"modelVersion": MODEL_VERSION} for row in rows]

    for target in TARGETS:
        target_train_rows = rows_with_boolean_label(train_rows, target.label_key)
        target_validation_rows = rows_with_boolean_label(validation_rows, target.label_key)
        y_train = labels_for(target_train_rows, target.label_key)
        trainable, reason = can_train(y_train, args.min_positive_count)
        if not trainable:
            metrics["targets"][target.name] = {
                "trained": False,
                "reason": reason,
                "trainPositiveCount": sum(y_train),
                "trainRows": len(y_train),
                "validationRowsWithLabel": len(target_validation_rows),
            }
            for prediction in predictions:
                prediction[target.probability_key] = None
            continue

        model = train_logistic_regression(
            [row_to_features(row) for row in target_train_rows],
            y_train,
            args.max_iter,
            args.learning_rate,
            args.l2,
        )
        probabilities = predict_probabilities(model, all_features)
        for prediction, probability in zip(predictions, probabilities):
            prediction[target.probability_key] = probability

        y_validation = labels_for(target_validation_rows, target.label_key)
        validation_probabilities = predict_probabilities(model, [row_to_features(row) for row in target_validation_rows])
        baseline_scores = [
            numeric((row.get("v1Scores") or {}).get("satisfactionScore"))
            for row in target_validation_rows
        ]
        metrics["targets"][target.name] = {
            "trained": True,
            "trainRows": len(y_train),
            "trainPositiveCount": sum(y_train),
            "validation": evaluate_target(target, y_validation, validation_probabilities, baseline_scores, args.ks),
        }
        write_json(args.output_dir / f"{target.name}_{MODEL_VERSION}.json", model)

    write_json(args.output_dir / "metrics.json", metrics)
    write_json(args.output_dir / "predictions.json", {
        "modelVersion": MODEL_VERSION,
        "sourceDataset": str(args.dataset),
        "predictions": predictions,
    })
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
