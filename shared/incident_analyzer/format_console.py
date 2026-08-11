"""Console report formatting matching HealthCore CONTEXT expected layout."""

from __future__ import annotations

from .analyze import AnalysisResult
from .constants import INVALID_RULE_LABELS, INVALID_RULE_ORDER, SATISFACTION_LABELS


def _dot_line(label: str, value: str, width: int = 40) -> str:
    dots = "." * max(2, width - len(label))
    return f"{label} {dots} {value}"


def _tree_line(label: str, value: str, width: int = 34, last: bool = False) -> str:
    # ASCII branches avoid Windows console width/encoding corruption that can
    # visually duplicate later sections when UTF-8 box-drawing is misdecoded.
    branch = "+-" if last else "|-"
    dots = "." * max(2, width - len(label))
    return f"  {branch} {label} {dots} {value}"


def format_console_report(result: AnalysisResult) -> str:
    lines: list[str] = [
        "=" * 60,
        "  HEALTHCORE - PATIENT INCIDENT REPORT ANALYSIS",
        f"  Source file: {result.source_name}",
        "=" * 60,
        "",
        _dot_line("TOTAL RECORDS IN FILE", str(result.total_records), 36),
        _tree_line("Valid records", str(result.valid_count), 28, last=False),
        _tree_line("Invalid / incomplete", str(result.invalid_count), 28, last=True),
        "",
        "INVALID RECORDS BREAKDOWN",
    ]

    # Show rules that appear in CONTEXT expected output order; include zeros only
    # for the six rules in the sample distribution, plus any triggered extras.
    display_rules = [
        rule
        for rule in INVALID_RULE_ORDER
        if rule != "score_out_of_range" or result.invalid_by_rule.get(rule, 0) > 0
    ]
    for index, rule in enumerate(display_rules):
        label = INVALID_RULE_LABELS[rule]
        count = result.invalid_by_rule.get(rule, 0)
        lines.append(
            _tree_line(label, str(count), 34, last=index == len(display_rules) - 1)
        )

    lines.extend(["", "BREAKDOWN BY CATEGORY (valid records)"])
    categories = list(result.category_counts.items())
    for index, (category, count) in enumerate(categories):
        pct = (count / result.valid_count * 100) if result.valid_count else 0.0
        lines.append(
            _tree_line(
                category,
                f"{count}  ({pct:.1f}%)",
                28,
                last=index == len(categories) - 1,
            )
        )

    lines.extend(["", "BREAKDOWN BY STATUS (valid records)"])
    statuses = [("OPEN", result.status_counts.get("OPEN", 0)),
                ("CLOSED", result.status_counts.get("CLOSED", 0)),
                ("DISCARDED", result.status_counts.get("DISCARDED", 0))]
    for index, (status, count) in enumerate(statuses):
        pct = (count / result.valid_count * 100) if result.valid_count else 0.0
        lines.append(
            _tree_line(
                status,
                f"{count}  ({pct:.1f}%)",
                28,
                last=index == len(statuses) - 1,
            )
        )

    lines.extend(
        ["", "BREAKDOWN BY COUNTRY (valid records) - recommended, not required"]
    )
    countries = [("US", result.country_counts.get("US", 0)),
                 ("UK", result.country_counts.get("UK", 0))]
    for index, (country, count) in enumerate(countries):
        pct = (count / result.valid_count * 100) if result.valid_count else 0.0
        lines.append(
            _tree_line(
                country,
                f"{count}  ({pct:.1f}%)",
                28,
                last=index == len(countries) - 1,
            )
        )

    avg = (
        f"{result.satisfaction_average:.2f}"
        if result.satisfaction_average is not None
        else "n/a"
    )
    lines.extend(
        [
            "",
            "SATISFACTION INDEX (closed cases)",
            f"  Scored cases: {result.satisfaction_scored_cases} of "
            f"{result.satisfaction_closed_cases}",
            f"  Average score: {avg} / 5.00",
        ]
    )
    for score in range(1, 6):
        label = f"Score {score} ({SATISFACTION_LABELS[score]})"
        count = result.satisfaction_score_counts.get(score, 0)
        lines.append(
            _tree_line(label, str(count), 34, last=score == 5)
        )

    lines.extend(["", "=" * 60])
    return "\n".join(lines)
