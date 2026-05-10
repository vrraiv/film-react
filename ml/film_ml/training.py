from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .dataset import split_train_test_by_decade, watched_rows
from .features import numeric, row_to_features
from .model import MODEL_VERSION, TARGETS, TargetSpec, predict_probabilities, train_logistic_regression
from .testing import calibration_buckets, ranking_metrics

DEFAULT_OUTPUT_DIR = Path("ml/outputs")


@dataclass(frozen=True)
class TrainingConfig:
    test_fraction: float = 0.2
    min_class_count: int = 12
    ks: list[int] = field(default_factory=lambda: [5, 10, 25])
    max_iter: int = 2000
    learning_rate: float = 0.04
    l2: float = 0.0001
    random_state: int = 42


@dataclass(frozen=True)
class TrainingRun:
    metrics: dict[str, Any]
    predictions: list[dict[str, Any]]
    models: dict[str, dict[str, Any]]
    train_rows: list[dict[str, Any]]
    test_rows: list[dict[str, Any]]


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


def can_train(y: list[int], min_class_count: int) -> tuple[bool, str]:
    positives = sum(y)
    negatives = len(y) - positives
    if positives < min_class_count:
        return False, f"only {positives} positives"
    if negatives < min_class_count:
        return False, f"only {negatives} negatives"
    return True, "ok"


def evaluate_target(
    target: TargetSpec,
    y_true: list[int],
    ml_scores: list[float],
    baseline_scores: list[float],
    ks: list[int],
) -> dict[str, Any]:
    return {
        "target": target.name,
        "testRows": len(y_true),
        "testPositiveRate": sum(y_true) / len(y_true) if y_true else None,
        "ml": ranking_metrics(y_true, ml_scores, ks),
        "v1Baseline": ranking_metrics(y_true, baseline_scores, ks),
        "calibrationBuckets": calibration_buckets(y_true, ml_scores),
    }


def prediction_identity(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "movieId": row.get("movieId"),
        "tmdbId": row.get("tmdbId"),
        "title": row.get("title"),
        "rowKind": row.get("rowKind"),
        "split": row.get("split"),
    }


def train_and_evaluate(
    dataset: dict[str, Any],
    config: TrainingConfig = TrainingConfig(),
    dataset_path: Path | None = None,
) -> TrainingRun:
    rows = dataset["rows"]
    watched = watched_rows(rows)
    train_rows, test_rows, split_summary = split_train_test_by_decade(
        watched,
        test_fraction=config.test_fraction,
        random_state=config.random_state,
    )
    all_features = [row_to_features(row) for row in rows]
    metrics: dict[str, Any] = {
        "modelVersion": MODEL_VERSION,
        "dataset": str(dataset_path) if dataset_path else None,
        "split": split_summary,
        "rows": {
            "total": len(rows),
            "watched": len(watched),
            "train": len(train_rows),
            "test": len(test_rows),
            "candidate": len([row for row in rows if row.get("rowKind") == "candidate"]),
        },
        "targets": {},
    }
    predictions = [prediction_identity(row) | {"modelVersion": MODEL_VERSION} for row in rows]
    models: dict[str, dict[str, Any]] = {}

    for target in TARGETS:
        target_train_rows = rows_with_boolean_label(train_rows, target.label_key)
        target_test_rows = rows_with_boolean_label(test_rows, target.label_key)
        y_train = labels_for(target_train_rows, target.label_key)
        trainable, reason = can_train(y_train, config.min_class_count)
        if not trainable:
            metrics["targets"][target.name] = {
                "trained": False,
                "reason": reason,
                "trainPositiveCount": sum(y_train),
                "trainRows": len(y_train),
                "testRowsWithLabel": len(target_test_rows),
            }
            for prediction in predictions:
                prediction[target.probability_key] = None
            continue

        model = train_logistic_regression(
            [row_to_features(row) for row in target_train_rows],
            y_train,
            config.max_iter,
            config.learning_rate,
            config.l2,
        )
        probabilities = predict_probabilities(model, all_features)
        for prediction, probability in zip(predictions, probabilities):
            prediction[target.probability_key] = probability

        y_test = labels_for(target_test_rows, target.label_key)
        test_probabilities = predict_probabilities(model, [row_to_features(row) for row in target_test_rows])
        baseline_scores = [
            numeric((row.get("v1Scores") or {}).get("satisfactionScore"))
            for row in target_test_rows
        ]
        metrics["targets"][target.name] = {
            "trained": True,
            "trainRows": len(y_train),
            "trainPositiveCount": sum(y_train),
            "test": evaluate_target(target, y_test, test_probabilities, baseline_scores, config.ks),
        }
        models[target.name] = model

    return TrainingRun(
        metrics=metrics,
        predictions=predictions,
        models=models,
        train_rows=train_rows,
        test_rows=test_rows,
    )


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def write_training_artifacts(
    run: TrainingRun,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    source_dataset: Path | None = None,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for target_name, model in run.models.items():
        write_json(output_dir / f"{target_name}_{MODEL_VERSION}.json", model)
    write_json(output_dir / "metrics.json", run.metrics)
    write_json(output_dir / "predictions.json", {
        "modelVersion": MODEL_VERSION,
        "sourceDataset": str(source_dataset) if source_dataset else None,
        "predictions": run.predictions,
    })
