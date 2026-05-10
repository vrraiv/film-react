from __future__ import annotations

import json
import random
from collections import defaultdict
from pathlib import Path
from typing import Any

DEFAULT_DATASET = Path("local/film-diary-ml-dataset-v1.json")


def load_dataset(path: Path = DEFAULT_DATASET) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict) or not isinstance(payload.get("rows"), list):
        raise ValueError("Dataset must be a JSON object with a rows array.")
    return payload


def watched_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        row
        for row in rows
        if row.get("rowKind") == "logged"
        and row.get("labelType") == "observed_rating"
        and isinstance(row.get("labels"), dict)
    ]


def release_decade(row: dict[str, Any]) -> str:
    year = row.get("year")
    if isinstance(year, int) and 1800 <= year <= 2200:
        return f"{(year // 10) * 10}s"
    if isinstance(year, float) and year.is_integer() and 1800 <= year <= 2200:
        return f"{(int(year) // 10) * 10}s"
    return "unknown"


def _stable_row_key(row: dict[str, Any]) -> tuple[str, str, str]:
    return (
        str(row.get("movieId") or ""),
        str(row.get("tmdbId") or ""),
        str(row.get("title") or ""),
    )


def split_train_test_by_decade(
    rows: list[dict[str, Any]],
    test_fraction: float = 0.2,
    random_state: int = 42,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    if not 0 < test_fraction < 1:
        raise ValueError("test_fraction must be between 0 and 1.")

    rng = random.Random(random_state)
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for row in rows:
        groups[release_decade(row)].append(row)

    train: list[dict[str, Any]] = []
    test: list[dict[str, Any]] = []
    summary_groups: dict[str, dict[str, int]] = {}

    for decade in sorted(groups):
        group = sorted(groups[decade], key=_stable_row_key)
        rng.shuffle(group)

        if len(group) <= 1:
            test_count = 0
        else:
            test_count = max(1, round(len(group) * test_fraction))
            test_count = min(test_count, len(group) - 1)

        group_test = group[:test_count]
        group_train = group[test_count:]
        test.extend(group_test)
        train.extend(group_train)
        summary_groups[decade] = {
            "total": len(group),
            "train": len(group_train),
            "test": len(group_test),
        }

    return train, test, {
        "strategy": "random_by_release_decade",
        "testFraction": test_fraction,
        "randomState": random_state,
        "groups": summary_groups,
        "trainRows": len(train),
        "testRows": len(test),
    }
