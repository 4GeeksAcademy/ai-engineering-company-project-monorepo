from __future__ import annotations

import csv
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from loader import load_csv
from validator import ValidationResult, validate_record


@dataclass
class AnalyzedRecord:
    raw: dict[str, str]
    validation: ValidationResult


class IncidentAnalyzer:
    def __init__(self, records: list[dict[str, str]]):
        self.records = [
            AnalyzedRecord(raw=record, validation=validate_record(record))
            for record in records
        ]

    @classmethod
    def from_file(cls, path: Path, engine: str = "native") -> "IncidentAnalyzer":
        return cls(load_csv(path, engine=engine))

    @property
    def total_processed(self) -> int:
        return len(self.records)

    @property
    def valid_records(self) -> list[AnalyzedRecord]:
        return [r for r in self.records if r.validation.is_valid]

    @property
    def invalid_records(self) -> list[AnalyzedRecord]:
        return [r for r in self.records if not r.validation.is_valid]

    def build_summary(self) -> dict:
        valid = self.valid_records
        category_counter: Counter[str] = Counter()
        score_counter: Counter[str] = Counter()
        scored_values: list[int] = []

        for record in valid:
            category_counter[(record.raw.get("category") or "").strip().upper()] += 1
            raw_score = (record.raw.get("satisfaction_score") or "").strip()
            if raw_score:
                try:
                    score = int(raw_score)
                except ValueError:
                    continue
                if 1 <= score <= 5:
                    scored_values.append(score)
                    score_counter[str(score)] += 1

        average_score = round(sum(scored_values) / len(scored_values), 2) if scored_values else 0.0

        return {
            "general_metrics": {
                "total_processed": self.total_processed,
                "valid_records": len(valid),
                "invalid_records": len(self.invalid_records),
            },
            "category_breakdown": dict(sorted(category_counter.items())),
            "satisfaction_index": {
                "scored_cases": len(scored_values),
                "average_score": average_score,
                "score_distribution": dict(sorted(score_counter.items(), key=lambda x: int(x[0]))),
            },
        }

    def build_console_summary(self) -> str:
        summary = self.build_summary()
        m = summary["general_metrics"]
        lines = [
            "Incident Analysis Summary", "========================",
            f"Total processed: {m['total_processed']}",
            f"Valid records:   {m['valid_records']}",
            f"Invalid records: {m['invalid_records']}", "", "Category breakdown:",
        ]
        for cat, count in summary["category_breakdown"].items():
            lines.append(f"  - {cat}: {count}")
        idx = summary["satisfaction_index"]
        lines += ["", "Satisfaction index:", f"  Scored cases:  {idx['scored_cases']}", f"  Average score: {idx['average_score']:.2f}"]
        for score, count in idx["score_distribution"].items():
            lines.append(f"  Score {score}: {count}")
        if self.invalid_records:
            lines += ["", "Invalid records:"]
            for r in self.invalid_records:
                lines.append(f"  - {r.raw.get('incident_id','unknown')}: {', '.join(r.validation.reasons)}")
        return "\n".join(lines)

    def export_summary_to_csv(self, output_path: Path) -> None:
        summary = self.build_summary()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        rows = [
            ("general", "total_processed", str(summary["general_metrics"]["total_processed"])),
            ("general", "valid_records", str(summary["general_metrics"]["valid_records"])),
            ("general", "invalid_records", str(summary["general_metrics"]["invalid_records"])),
        ]
        for cat, count in summary["category_breakdown"].items():
            rows.append(("category", cat, str(count)))
        idx = summary["satisfaction_index"]
        rows += [("satisfaction", "scored_cases", str(idx["scored_cases"])), ("satisfaction", "average_score", f"{idx['average_score']:.2f}")]
        for score, count in idx["score_distribution"].items():
            rows.append(("satisfaction", f"score_{score}", str(count)))
        with output_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["section", "key", "value"])
            writer.writerows(rows)
