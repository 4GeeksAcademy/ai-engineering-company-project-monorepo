#!/usr/bin/env python3
"""Validate the Brasaland Monday leadership n8n export.

Checks JSON shape, the Monday 07:00 America/Bogota schedule, central API
calls, COP/USD report copy, CSV + email + Slack delivery, the failure branch,
and that the file does not contain live secrets. Also executes the embedded
chain-week and report functions with Node so the formatter is proven without
starting n8n.

Exit 0 when the export is importable by these checks. Exit 1 otherwise.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKFLOW_PATH = REPO_ROOT / "workflows" / "brasaland-monday-leadership-report.n8n.json"

LOCATION_IDS = (
    "co-med-centro",
    "co-med-elpoblado",
    "co-bog-chapinero",
    "co-bog-norte",
    "co-cali-norte",
    "co-barranquilla",
    "co-cartagena",
    "co-pereira",
    "us-mia-brickell",
    "us-mia-downtown",
    "us-orlando",
    "us-tampa",
    "us-ftlauderdale",
    "us-jacksonville",
)
KPI_LABELS = (
    "Purchase cost",
    "Waste cost",
    "Waste ratio",
    "Stockout frequency",
    "Price alert frequency",
)
SECRET_PATTERNS = (
    re.compile(r"xox[baprs]-"),
    re.compile(r"sk-[A-Za-z0-9]{8,}"),
    re.compile(r"BEGIN [A-Z ]*PRIVATE KEY"),
    re.compile(r"postgres(?:ql)?://"),
    re.compile(r"mongodb(?:\+srv)?://"),
    re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
)
WEEK_INSTANTS = (
    "2026-09-28T12:00:00+00:00",
    "2026-09-28T11:59:00+00:00",
    "2026-09-27T23:00:00+00:00",
    "2026-09-30T15:00:00+00:00",
    "2026-03-02T04:30:00+00:00",
    "2026-03-02T05:00:00+00:00",
    "2026-11-02T12:00:00+00:00",
)


def previous_chain_week_bounds(now: datetime) -> tuple[str, str]:
    """Mirror data/pipelines/pipeline.py previous_chain_week_bounds (stdlib only)."""
    bogota = ZoneInfo("America/Bogota")
    current = now.astimezone(bogota)
    days_since_monday = current.weekday()
    this_monday = (current - timedelta(days=days_since_monday)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    window_end = this_monday
    window_start = this_monday - timedelta(days=7)
    return window_start.date().isoformat(), window_end.date().isoformat()


def _node_map(workflow: dict) -> dict[str, dict]:
    return {node["name"]: node for node in workflow["nodes"]}


def _outputs(workflow: dict, name: str) -> list[list[str]]:
    main = workflow["connections"].get(name, {}).get("main", [])
    outputs = []
    for group in main:
        outputs.append([edge["node"] for edge in group])
    return outputs


def _connected(workflow: dict, src: str, dst: str, output_index: int = 0) -> bool:
    outputs = _outputs(workflow, src)
    if output_index >= len(outputs):
        return False
    return dst in outputs[output_index]


def _js(node: dict) -> str:
    return node["parameters"]["jsCode"]


def _extract_fn(source: str, name: str) -> str:
    start = f"// BRASALAND_FN {name}"
    end = f"// BRASALAND_FN_END {name}"
    start_at = source.find(start)
    end_at = source.find(end)
    if start_at < 0 or end_at < 0 or end_at <= start_at:
        raise ValueError(f"missing markers for {name}")
    return source[start_at + len(start) : end_at]


def _run_node(script: str, payload: str) -> str:
    completed = subprocess.run(
        ["node", "-e", script],
        input=payload,
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or completed.stdout.strip())
    return completed.stdout


def _check_behavior(workflow: dict, errors: list[str]) -> None:
    nodes = _node_map(workflow)
    try:
        week_fn = _extract_fn(_js(nodes["Resolve last chain week"]), "chainWeekBounds")
        report_fn = _extract_fn(
            _js(nodes["Format leadership report"]), "formatLeadershipReport"
        )
    except (KeyError, ValueError) as error:
        errors.append(f"embedded function markers: {error}")
        return

    week_script = (
        week_fn
        + """
const fs = require('fs');
const instants = JSON.parse(fs.readFileSync(0, 'utf8'));
const rows = instants.map((iso) => {
  const bounds = chainWeekBounds(iso);
  return { iso, week_start: bounds.week_start, week_end: bounds.week_end, timezone: bounds.timezone };
});
process.stdout.write(JSON.stringify(rows));
"""
    )
    try:
        week_rows = json.loads(_run_node(week_script, json.dumps(list(WEEK_INSTANTS))))
    except (RuntimeError, json.JSONDecodeError) as error:
        errors.append(f"chain week node execution: {error}")
        week_rows = []
    for row in week_rows:
        instant = datetime.fromisoformat(row["iso"])
        expected_start, expected_end = previous_chain_week_bounds(instant)
        if row["week_start"] != expected_start or row["week_end"] != expected_end:
            errors.append(
                f"chain week {row['iso']}: got {row['week_start']}..{row['week_end']} "
                f"expected {expected_start}..{expected_end}"
            )
        if row.get("timezone") != "America/Bogota":
            errors.append(f"chain week timezone for {row['iso']}")

    sample = {
        "week_start": "2026-09-21",
        "locations": [
            {
                "location_id": "co-med-centro",
                "country": "Colombia",
                "currency": "COP",
                "total_purchase_cost": 1000,
                "total_waste_cost": 250.5,
                "waste_ratio": 0.1,
                "stockout_events_count": 2,
                "price_alert_events_count": 1,
            },
            {
                "location_id": "us-mia-downtown",
                "country": "United States",
                "currency": "USD",
                "total_purchase_cost": 50,
                "total_waste_cost": 5,
                "waste_ratio": 0.25,
                "stockout_events_count": 0,
                "price_alert_events_count": 3,
            },
        ],
    }
    empty = {"week_start": "2026-09-21", "locations": []}
    report_script = (
        report_fn
        + """
const fs = require('fs');
const cases = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = cases.map((item) => formatLeadershipReport(item.payload, item.week_end));
process.stdout.write(JSON.stringify(out));
"""
    )
    try:
        reports = json.loads(
            _run_node(
                report_script,
                json.dumps(
                    [
                        {"payload": sample, "week_end": "2026-09-28"},
                        {"payload": empty, "week_end": "2026-09-28"},
                    ]
                ),
            )
        )
    except (RuntimeError, json.JSONDecodeError) as error:
        errors.append(f"report formatter execution: {error}")
        return
    report, empty_report = reports
    text = report["report_text"]
    for label in KPI_LABELS:
        if label not in text:
            errors.append(f"sample report missing {label}")
    for snippet in (
        "COP 1,000.00",
        "USD 50.00",
        "Medellín Centro",
        "Miami Downtown",
        "10.00%",
        "25.00%",
        "America/Bogota",
        "Mariana Restrepo",
        "Felipe Guerrero",
        "Lucía Fernández",
    ):
        if snippet not in text:
            errors.append(f"sample report missing {snippet!r}")
    if report["cop_purchase_cost"] != 1000 or report["usd_purchase_cost"] != 50:
        errors.append("sample currency totals drifted")
    csv_lines = report["csv"].strip().split("\n")
    if not csv_lines[0].startswith("week_start,week_end_exclusive,location_id"):
        errors.append("CSV header mismatch")
    if len(csv_lines) != 3:
        errors.append(f"expected 2 CSV data rows, got {len(csv_lines) - 1}")
    if "co-med-centro" not in report["csv"] or "us-mia-downtown" not in report["csv"]:
        errors.append("CSV missing location ids")
    if "No per-location rows were returned for this chain week." not in empty_report["report_text"]:
        errors.append("empty week should say no rows were returned")
    if empty_report["csv"].strip().count("\n") != 0:
        errors.append("empty week CSV should be a header only")


def validate(path: Path = WORKFLOW_PATH) -> list[str]:
    errors: list[str] = []
    try:
        raw = path.read_text(encoding="utf-8")
        workflow = json.loads(raw)
    except (OSError, json.JSONDecodeError) as error:
        return [f"workflow JSON: {error}"]

    if not isinstance(workflow, dict):
        return ["workflow export must be one JSON object (n8n import-from-file shape)"]

    for pattern in SECRET_PATTERNS:
        if pattern.search(raw):
            errors.append(f"possible secret matched {pattern.pattern}")

    if workflow.get("name") != "Brasaland Monday leadership report":
        errors.append("workflow name")
    if workflow.get("active") is not False:
        errors.append("workflow must import inactive until credentials are set")
    settings = workflow.get("settings") or {}
    if settings.get("timezone") != "America/Bogota":
        errors.append("settings.timezone must be America/Bogota")
    if settings.get("executionOrder") != "v1":
        errors.append("settings.executionOrder must be v1")

    nodes = workflow.get("nodes")
    connections = workflow.get("connections")
    if not isinstance(nodes, list) or not nodes:
        return errors + ["nodes must be a non-empty list"]
    if not isinstance(connections, dict):
        return errors + ["connections must be an object"]

    names = []
    for item in nodes:
        for field in ("id", "name", "type", "typeVersion", "position", "parameters"):
            if field not in item:
                errors.append(f"node missing {field}: {item.get('name')}")
        if not isinstance(item.get("position"), list) or len(item["position"]) != 2:
            errors.append(f"node position: {item.get('name')}")
        names.append(item.get("name"))
    if len(names) != len(set(names)):
        errors.append("node names must be unique")

    by_name = _node_map(workflow)
    for source, spec in connections.items():
        if source not in by_name:
            errors.append(f"connection source missing: {source}")
            continue
        for group in spec.get("main", []):
            for edge in group:
                if edge.get("type") != "main" or edge.get("node") not in by_name:
                    errors.append(f"bad edge from {source} to {edge}")

    schedule = by_name.get("Monday 07:00 America/Bogota")
    if not schedule or schedule["type"] != "n8n-nodes-base.scheduleTrigger":
        errors.append("schedule trigger missing")
    else:
        interval = schedule["parameters"].get("rule", {}).get("interval", [])
        expression = interval[0].get("expression") if interval else None
        if expression != "0 7 * * 1":
            errors.append(f"cron expression must be 0 7 * * 1, got {expression}")
        if interval and interval[0].get("field") != "cronExpression":
            errors.append("schedule field must be cronExpression")

    manual = by_name.get("Manual test")
    if not manual or manual["type"] != "n8n-nodes-base.manualTrigger":
        errors.append("manual trigger missing")

    required_edges = (
        ("Manual test", "API base URL", 0),
        ("Monday 07:00 America/Bogota", "API base URL", 0),
        ("API base URL", "Resolve last chain week", 0),
        ("Resolve last chain week", "Login to central API", 0),
        ("Login to central API", "Access token present", 0),
        ("Login to central API", "Describe failure", 1),
        ("Access token present", "Pull weekly location performance", 0),
        ("Access token present", "Missing access token", 1),
        ("Missing access token", "Describe failure", 0),
        ("Pull weekly location performance", "Format leadership report", 0),
        ("Pull weekly location performance", "Describe failure", 1),
        ("Format leadership report", "Write weekly CSV", 0),
        ("Format leadership report", "Email delivery configured", 0),
        ("Format leadership report", "Slack delivery configured", 0),
        ("Format leadership report", "Describe failure", 1),
        ("Write weekly CSV", "Describe failure", 1),
        ("Email delivery configured", "Send leadership email", 0),
        ("Send leadership email", "Describe failure", 1),
        ("Slack delivery configured", "Post leadership Slack", 0),
        ("Post leadership Slack", "Describe failure", 1),
        ("Describe failure", "Write failure note", 0),
        ("Describe failure", "Failure email configured", 0),
        ("Describe failure", "Failure Slack configured", 0),
        ("Failure email configured", "Email failure notice", 0),
        ("Failure Slack configured", "Slack failure notice", 0),
    )
    for src, dst, index in required_edges:
        if not _connected(workflow, src, dst, index):
            errors.append(f"missing connection {src} [{index}] -> {dst}")

    for notice in ("Email failure notice", "Slack failure notice", "Write failure note"):
        if _connected(workflow, notice, "Describe failure", 0) or _connected(
            workflow, notice, "Describe failure", 1
        ):
            errors.append(f"{notice} must not loop back into Describe failure")

    login = by_name.get("Login to central API", {})
    login_params = login.get("parameters", {})
    if login.get("type") != "n8n-nodes-base.httpRequest":
        errors.append("login node type")
    if "/auth/login" not in str(login_params.get("url")):
        errors.append("login URL must call /auth/login")
    login_body = str(login_params.get("jsonBody"))
    if "BRASALAND_STAFF_EMAIL" not in login_body or "BRASALAND_STAFF_PASSWORD" not in login_body:
        errors.append("login body must use staff email and password env placeholders")
    if login.get("onError") != "continueErrorOutput":
        errors.append("login must continue on the error output")

    pull = by_name.get("Pull weekly location performance", {})
    pull_params = pull.get("parameters", {})
    if "/reporting/weekly-location-performance" not in str(pull_params.get("url")):
        errors.append("performance URL")
    query = json.dumps(pull_params.get("queryParameters", {}))
    headers = json.dumps(pull_params.get("headerParameters", {}))
    if "week_start" not in query:
        errors.append("performance query must pass week_start")
    if "Authorization" not in headers or "Bearer" not in headers:
        errors.append("performance request must send Authorization Bearer")
    if pull.get("onError") != "continueErrorOutput":
        errors.append("performance pull must continue on the error output")

    base = by_name.get("API base URL", {})
    base_text = json.dumps(base.get("parameters", {}))
    if "BRASALAND_API_BASE_URL" not in base_text:
        errors.append("API base URL must read BRASALAND_API_BASE_URL")

    format_node = by_name.get("Format leadership report", {})
    format_code = _js(format_node) if format_node else ""
    for label in KPI_LABELS + ("COP", "USD", "America/Bogota"):
        if label not in format_code:
            errors.append(f"format node missing {label}")
    for location_id in LOCATION_IDS:
        if location_id not in format_code:
            errors.append(f"format node missing location {location_id}")

    csv_node = by_name.get("Write weekly CSV", {})
    if csv_node.get("type") != "n8n-nodes-base.readWriteFile":
        errors.append("CSV node type")
    if csv_node.get("parameters", {}).get("operation") != "write":
        errors.append("CSV node must write")
    if "brasaland-reports" not in str(csv_node.get("parameters", {}).get("fileName")):
        errors.append("CSV path must be under the n8n reports directory")

    for email_name in ("Send leadership email", "Email failure notice"):
        email = by_name.get(email_name, {})
        if email.get("type") != "n8n-nodes-base.emailSend":
            errors.append(f"{email_name} type")
        cred = email.get("credentials", {}).get("smtp", {})
        if cred.get("name") != "Brasaland leadership SMTP":
            errors.append(f"{email_name} SMTP credential placeholder name")
        if cred.get("id") != "brasaland-smtp-placeholder":
            errors.append(f"{email_name} must not embed a real SMTP credential id")
    if "fileAttachments" not in json.dumps(
        by_name.get("Send leadership email", {}).get("parameters", {})
    ):
        errors.append("leadership email should attach the CSV binary")

    for slack_name in ("Post leadership Slack", "Slack failure notice"):
        slack = by_name.get(slack_name, {})
        if slack.get("type") != "n8n-nodes-base.slack":
            errors.append(f"{slack_name} type")
        if slack.get("parameters", {}).get("operation") != "post":
            errors.append(f"{slack_name} must post a message")
        cred = slack.get("credentials", {}).get("slackApi", {})
        if cred.get("name") != "Brasaland Slack":
            errors.append(f"{slack_name} Slack credential placeholder name")
        if cred.get("id") != "brasaland-slack-placeholder":
            errors.append(f"{slack_name} must not embed a real Slack credential id")
        if "BRASALAND_SLACK_CHANNEL" not in json.dumps(slack.get("parameters", {})):
            errors.append(f"{slack_name} channel must come from env")

    failure = by_name.get("Describe failure", {})
    failure_code = _js(failure) if failure else ""
    if "FAILED" not in failure_code or "password=[redacted]" not in failure_code:
        errors.append("failure note must describe the failure and redact passwords")

    triggers = {"Manual test", "Monday 07:00 America/Bogota"}
    inbound = {name: 0 for name in by_name}
    for source, spec in connections.items():
        for group in spec.get("main", []):
            for edge in group:
                inbound[edge["node"]] = inbound.get(edge["node"], 0) + 1
    for name, node in by_name.items():
        if node["type"] == "n8n-nodes-base.stickyNote":
            continue
        if name in triggers:
            continue
        if inbound.get(name, 0) < 1:
            errors.append(f"node is not reachable from a connection: {name}")

    if not errors:
        _check_behavior(workflow, errors)
    return errors


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else WORKFLOW_PATH
    errors = validate(path)
    if errors:
        print(f"INVALID {path}")
        for error in errors:
            print(f"- {error}")
        return 1
    workflow = json.loads(path.read_text(encoding="utf-8"))
    print(f"OK {path.name}")
    print(f"nodes={len(workflow['nodes'])}")
    print("schedule=0 7 * * 1 timezone=America/Bogota active=false")
    print("sample COP purchase=1000.00 USD purchase=50.00")
    print(f"chain-week instants checked={len(WEEK_INSTANTS)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
