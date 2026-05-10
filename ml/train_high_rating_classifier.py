#!/usr/bin/env python3
"""Train and test the local high-rating classifier from the app's ML export."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from film_ml import DEFAULT_DATASET, TrainingConfig, load_dataset, train_and_evaluate, write_training_artifacts
from film_ml.training import DEFAULT_OUTPUT_DIR


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train local ML recommender prototype.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--test-fraction", type=float, default=0.2)
    parser.add_argument("--min-class-count", type=int, default=12)
    parser.add_argument("--ks", type=int, nargs="+", default=[5, 10, 25])
    parser.add_argument("--max-iter", type=int, default=2000)
    parser.add_argument("--learning-rate", type=float, default=0.04)
    parser.add_argument("--l2", type=float, default=0.0001)
    parser.add_argument("--random-state", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dataset = load_dataset(args.dataset)
    config = TrainingConfig(
        test_fraction=args.test_fraction,
        min_class_count=args.min_class_count,
        ks=args.ks,
        max_iter=args.max_iter,
        learning_rate=args.learning_rate,
        l2=args.l2,
        random_state=args.random_state,
    )
    run = train_and_evaluate(dataset, config, dataset_path=args.dataset)
    write_training_artifacts(run, args.output_dir, source_dataset=args.dataset)
    print(json.dumps(run.metrics, indent=2))


if __name__ == "__main__":
    main()
