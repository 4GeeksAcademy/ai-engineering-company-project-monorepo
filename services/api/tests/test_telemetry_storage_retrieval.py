"""Tests for fetch_telemetry_events_dataframe (app.models.telemetry_storage).

Uses a fake SQLModel Session whose `.execute(...)` returns a fake result
object with a `.fetchmany()` that yields rows in several chunks — this
exercises the chunked-retrieval loop directly (more rows than
`TELEMETRY_REPORT_FETCH_CHUNK_SIZE`) without a live database, proving the
whole matching result set is read, not just the first chunk.
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.models.telemetry_storage import (
    TELEMETRY_REPORT_FETCH_CHUNK_SIZE,
    fetch_telemetry_events_dataframe,
    telemetry_events_table,
)

UTC = timezone.utc
COLUMN_NAMES = [c.name for c in telemetry_events_table.columns]


def _make_row(i: int) -> tuple:
    return (
        f"00000000-0000-0000-0000-{i:012d}",
        datetime(2026, 11, 1, tzinfo=UTC),
        "s1",
        "1",
        "page_viewed",
        "1.0.0",
        None,
        {"route": "/inventory", "referrer_route": None},
    )


def _fake_db_with_rows(all_rows: list[tuple], chunk_size: int):
    """A fake Session whose execute(...).fetchmany(n) paginates over
    `all_rows`, exactly like a real server-side cursor would."""
    remaining = list(all_rows)

    def fetchmany(requested_chunk_size):
        assert requested_chunk_size == chunk_size
        nonlocal remaining
        batch, remaining = remaining[:requested_chunk_size], remaining[requested_chunk_size:]
        return batch

    fake_result = MagicMock()
    fake_result.fetchmany.side_effect = lambda n=chunk_size: fetchmany(n)

    fake_db = MagicMock()
    fake_db.execute.return_value = fake_result
    return fake_db, fake_result


def test_fetch_reads_every_row_across_multiple_chunks_beyond_the_default_page_size():
    total_rows = TELEMETRY_REPORT_FETCH_CHUNK_SIZE * 2 + 7  # forces 3 fetchmany() calls
    all_rows = [_make_row(i) for i in range(total_rows)]
    fake_db, fake_result = _fake_db_with_rows(all_rows, TELEMETRY_REPORT_FETCH_CHUNK_SIZE)

    df = fetch_telemetry_events_dataframe(
        fake_db, datetime(2026, 11, 1, tzinfo=UTC), datetime(2026, 11, 2, tzinfo=UTC)
    )

    assert len(df) == total_rows
    # two full chunks + one partial + one empty call to detect exhaustion
    assert fake_result.fetchmany.call_count == 4
    fake_result.close.assert_called_once()


def test_fetch_returns_empty_dataframe_with_correct_columns_when_no_rows_match():
    fake_db, _ = _fake_db_with_rows([], TELEMETRY_REPORT_FETCH_CHUNK_SIZE)

    df = fetch_telemetry_events_dataframe(
        fake_db, datetime(2026, 11, 1, tzinfo=UTC), datetime(2026, 11, 2, tzinfo=UTC)
    )

    assert df.empty
    assert list(df.columns) == COLUMN_NAMES


def test_fetch_uses_server_side_cursor_streaming():
    """`stream_results=True` is what makes the server-side cursor actually
    paginate at the wire level rather than buffering the whole result set
    client-side first — assert the statement carries that execution option."""
    fake_db, _ = _fake_db_with_rows([], TELEMETRY_REPORT_FETCH_CHUNK_SIZE)

    fetch_telemetry_events_dataframe(
        fake_db, datetime(2026, 11, 1, tzinfo=UTC), datetime(2026, 11, 2, tzinfo=UTC)
    )

    executed_statement = fake_db.execute.call_args.args[0]
    assert executed_statement._execution_options.get("stream_results") is True
