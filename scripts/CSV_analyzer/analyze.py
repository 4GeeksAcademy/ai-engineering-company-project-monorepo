"""Analyze Nexova support incident exports without exposing customer data."""

import csv
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple


VALID_CATEGORIES = ("TECHNICAL", "BILLING", "ACCESS", "HR_QUERY", "COMPLAINT")
VALID_STATUSES = ("OPEN", "CLOSED", "DISCARDED")
AGENT_ID_PATTERN = re.compile(r"^AGT-\d{2}$")

INVALID_LABELS = {
	"missing_client_company": "Missing client_company",
	"invalid_category": "Invalid or missing category",
	"invalid_email": "Invalid or missing email",
	"closed_without_score": "Closed ticket, no score",
	"invalid_description": "Invalid or missing description",
	"invalid_agent_id": "Invalid or missing agent_id",
	"invalid_satisfaction_score": "Satisfaction score out of range",
}


def clean(value: object) -> str:
	"""Return a trimmed string while tolerating missing CSV values."""
	return str(value or "").strip()


def validate_record(record: Dict[str, str]) -> List[str]:
	"""Return rule keys for a record that is invalid or incomplete."""
	errors: List[str] = []
	if not clean(record.get("client_company")):
		errors.append("missing_client_company")

	if clean(record.get("category")) not in VALID_CATEGORIES:
		errors.append("invalid_category")

	if len(clean(record.get("description"))) < 5:
		errors.append("invalid_description")

	if not AGENT_ID_PATTERN.fullmatch(clean(record.get("agent_id"))):
		errors.append("invalid_agent_id")

	if "@" not in clean(record.get("customer_email")):
		errors.append("invalid_email")

	status = clean(record.get("status"))
	score_text = clean(record.get("satisfaction_score"))
	if status == "CLOSED" and not score_text:
		errors.append("closed_without_score")
	elif score_text:
		try:
			score = int(score_text)
		except ValueError:
			errors.append("invalid_satisfaction_score")
		else:
			if not 1 <= score <= 5:
				errors.append("invalid_satisfaction_score")

	return errors


def load_records(path: Path) -> List[Dict[str, str]]:
	"""Load incident records from a UTF-8, comma-separated CSV file."""
	with path.open("r", encoding="utf-8-sig", newline="") as source:
		reader = csv.DictReader(source)
		if reader.fieldnames is None:
			raise ValueError("The CSV file does not contain a header row.")

		required_fields = {
			"ticket_id",
			"date",
			"client_company",
			"category",
			"description",
			"agent_id",
			"status",
			"customer_email",
			"satisfaction_score",
		}
		missing_fields = sorted(required_fields - set(reader.fieldnames))
		if missing_fields:
			raise ValueError("Missing required CSV columns: " + ", ".join(missing_fields))

		return [dict(record) for record in reader]


def parse_score(record: Dict[str, str]) -> int | None:
	"""Return a valid satisfaction score, or None when it is absent/invalid."""
	score_text = clean(record.get("satisfaction_score"))
	if not score_text:
		return None
	try:
		score = int(score_text)
	except ValueError:
		return None
	return score if 1 <= score <= 5 else None


def percentage(count: int, total: int) -> str:
	return f"{(count / total * 100):.1f}%" if total else "0.0%"


def analyze_records(records: Iterable[Dict[str, str]]) -> Dict[str, object]:
	"""Validate records and calculate the required metrics."""
	record_list = list(records)
	valid_records: List[Dict[str, str]] = []
	invalid_counts: Counter[str] = Counter()

	invalid_record_count = 0
	for record in record_list:
		errors = validate_record(record)
		if errors:
			invalid_counts.update(errors)
			invalid_record_count += 1
		else:
			valid_records.append(record)

	category_counts = Counter(clean(record.get("category")) for record in valid_records)
	status_counts = Counter(clean(record.get("status")) for record in valid_records)
	closed_records = [record for record in valid_records if clean(record.get("status")) == "CLOSED"]
	scores = [score for record in closed_records if (score := parse_score(record)) is not None]
	score_counts = Counter(scores)

	return {
		"total": len(record_list),
		"valid": len(valid_records),
		"invalid": invalid_record_count,
		"invalid_counts": invalid_counts,
		"category_counts": category_counts,
		"status_counts": status_counts,
		"closed_count": len(closed_records),
		"scored_count": len(scores),
		"score_counts": score_counts,
		"average_score": sum(scores) / len(scores) if scores else None,
	}


def print_summary(source_name: str, metrics: Dict[str, object]) -> None:
	"""Print a human-readable summary containing no customer email addresses."""
	invalid_counts = metrics["invalid_counts"]
	category_counts = metrics["category_counts"]
	status_counts = metrics["status_counts"]
	score_counts = metrics["score_counts"]
	valid_count = metrics["valid"]

	print("=" * 60)
	print("  NEXOVA - SUPPORT TICKET ANALYSIS")
	print(f"  Source file: {source_name}")
	print("=" * 60)
	print()
	print(f"TOTAL RECORDS IN FILE .......... {metrics['total']}")
	print(f"  |- Valid records ................ {valid_count}")
	print(f"  `- Invalid / incomplete .......... {metrics['invalid']}")
	print()
	print("INVALID RECORDS BREAKDOWN")
	for key in (
		"missing_client_company",
		"invalid_category",
		"invalid_email",
		"closed_without_score",
		"invalid_description",
		"invalid_agent_id",
		"invalid_satisfaction_score",
	):
		if invalid_counts[key]:
			print(f"  {INVALID_LABELS[key]:<32} {invalid_counts[key]}")
	print()
	print("BREAKDOWN BY CATEGORY (valid records)")
	for category in VALID_CATEGORIES:
		count = category_counts[category]
		print(f"  {category:<29} {count:>3}  ({percentage(count, valid_count)})")
	print()
	print("BREAKDOWN BY STATUS (valid records)")
	for status in VALID_STATUSES:
		count = status_counts[status]
		print(f"  {status:<29} {count:>3}  ({percentage(count, valid_count)})")
	print()
	print("SATISFACTION INDEX (closed tickets)")
	print(f"  Scored tickets: {metrics['scored_count']} of {metrics['closed_count']}")
	average = metrics["average_score"]
	print(f"  Average score: {average:.2f} / 5.00" if average is not None else "  Average score: N/A")
	descriptions = {
		1: "Very dissatisfied",
		2: "Dissatisfied",
		3: "Neutral",
		4: "Satisfied",
		5: "Very satisfied",
	}
	for score in range(1, 6):
		print(f"  |- Score {score} ({descriptions[score]:<17}) ... {score_counts[score]}")
	print()
	print("=" * 60)


def metric_rows(metrics: Dict[str, object]) -> List[Tuple[str, object]]:
	"""Build sanitized rows for the optional results export."""
	rows: List[Tuple[str, object]] = [
		("total_records", metrics["total"]),
		("valid_records", metrics["valid"]),
		("invalid_records", metrics["invalid"]),
	]
	invalid_counts = metrics["invalid_counts"]
	for key in INVALID_LABELS:
		rows.append((f"invalid_{key}", invalid_counts[key]))

	for category in VALID_CATEGORIES:
		rows.append((f"category_{category}", metrics["category_counts"][category]))
	for status in VALID_STATUSES:
		rows.append((f"status_{status}", metrics["status_counts"][status]))
	rows.extend(
		[
			("closed_tickets", metrics["closed_count"]),
			("scored_closed_tickets", metrics["scored_count"]),
			("average_satisfaction_score", f"{metrics['average_score']:.2f}" if metrics["average_score"] is not None else ""),
		]
	)
	for score in range(1, 6):
		rows.append((f"satisfaction_score_{score}", metrics["score_counts"][score]))
	return rows


def export_results(path: Path, metrics: Dict[str, object]) -> None:
	"""Write aggregate metrics only; individual records and emails are never exported."""
	with path.open("w", encoding="utf-8", newline="") as destination:
		writer = csv.writer(destination)
		writer.writerow(("metric", "value"))
		writer.writerows(metric_rows(metrics))


def main(argv: Sequence[str] | None = None) -> int:
	arguments = list(argv if argv is not None else sys.argv[1:])
	if len(arguments) != 1:
		print("Usage: python analyze.py <csv_path>", file=sys.stderr)
		return 2

	input_path = Path(arguments[0])
	try:
		records = load_records(input_path)
		metrics = analyze_records(records)
	except (OSError, csv.Error, ValueError) as error:
		print(f"Error: {error}", file=sys.stderr)
		return 1

	print_summary(input_path.name, metrics)
	answer = input("Export results to CSV? [y / n]: ").strip().lower()
	if answer == "y":
		output_path = Path("results.csv")
		export_results(output_path, metrics)
		print(f"Results exported to {output_path}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
