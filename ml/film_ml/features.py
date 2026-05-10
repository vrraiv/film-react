from __future__ import annotations

import math
from typing import Any, Iterable


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
