"""Offline ML helpers for the film diary export."""

from .dataset import DEFAULT_DATASET, load_dataset, split_train_test_by_decade, watched_rows
from .training import TrainingConfig, train_and_evaluate, write_training_artifacts

__all__ = [
    "DEFAULT_DATASET",
    "TrainingConfig",
    "load_dataset",
    "split_train_test_by_decade",
    "train_and_evaluate",
    "watched_rows",
    "write_training_artifacts",
]
