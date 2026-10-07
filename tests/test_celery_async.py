"""Tests for Celery dead-letter recording and retry backoff helpers."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from services.dead_letter import list_dead_letters, record_dead_letter
from services.tasks import run_weekly_pipeline


class DeadLetterTests(unittest.TestCase):
    def test_record_stores_required_fields(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = Path(tmp) / "dlq.sqlite3"
            row = record_dead_letter(
                task_id="abc-123",
                attempt=4,
                error_message="boom",
                db_path=db,
            )
            self.assertEqual(row["task_id"], "abc-123")
            self.assertEqual(row["attempt"], 4)
            self.assertEqual(row["error_message"], "boom")
            self.assertIn("recorded_at", row)

            listed = list_dead_letters(db_path=db)
            self.assertEqual(len(listed), 1)
            self.assertEqual(listed[0]["task_id"], "abc-123")


class PipelineTaskRetryTests(unittest.TestCase):
    def test_retries_use_exponential_countdown_then_dlq(self):
        task = run_weekly_pipeline
        # Exhausted budget: retries already at max_retries
        task.push_request(id="task-42", retries=3)

        with patch("services.tasks._execute_pipeline", side_effect=RuntimeError("fail")):
            with patch("services.tasks.record_dead_letter") as record:
                with self.assertRaises(RuntimeError):
                    task.run("2026-01-01", "2026-01-07")
                record.assert_called_once()
                kwargs = record.call_args.kwargs
                self.assertEqual(kwargs["task_id"], "task-42")
                self.assertEqual(kwargs["attempt"], 4)
                self.assertIn("fail", kwargs["error_message"])

        task.pop_request()

    def test_countdown_grows_exponentially(self):
        task = run_weekly_pipeline
        task.push_request(id="task-1", retries=0)

        with patch("services.tasks._execute_pipeline", side_effect=RuntimeError("fail")):
            with patch.object(task, "retry", side_effect=RuntimeError("retry-called")) as retry_mock:
                with self.assertRaises(RuntimeError):
                    task.run("2026-01-01", "2026-01-07")
                self.assertEqual(retry_mock.call_args.kwargs["countdown"], 1)

        task.pop_request()
        task.push_request(id="task-1", retries=2)
        with patch("services.tasks._execute_pipeline", side_effect=RuntimeError("fail")):
            with patch.object(task, "retry", side_effect=RuntimeError("retry-called")) as retry_mock:
                with self.assertRaises(RuntimeError):
                    task.run("2026-01-01", "2026-01-07")
                self.assertEqual(retry_mock.call_args.kwargs["countdown"], 4)
        task.pop_request()


class CeleryAppConfigTests(unittest.TestCase):
    def test_broker_and_backend_use_redis_url(self):
        with patch.dict("os.environ", {"REDIS_URL": "redis://shared:6379/0"}, clear=False):
            import importlib
            import services.celery_app as celery_app

            importlib.reload(celery_app)
            self.assertEqual(celery_app.app.conf.broker_url, "redis://shared:6379/0")
            self.assertEqual(celery_app.app.conf.result_backend, "redis://shared:6379/0")
            self.assertEqual(celery_app.REDIS_URL, "redis://shared:6379/0")
            self.assertTrue(celery_app.app.conf.worker_send_task_events)
            self.assertTrue(celery_app.app.conf.task_send_sent_event)


class TaskObservabilityTests(unittest.TestCase):
    def test_success_logs_task_id_attempt_status_duration(self):
        task = run_weekly_pipeline
        task.push_request(id="obs-ok", retries=0)
        with patch("services.tasks._execute_pipeline"):
            with patch("services.tasks._log_task_event") as log_event:
                result = task.run("2026-01-01", "2026-01-07")
        task.pop_request()
        log_event.assert_called()
        kwargs = log_event.call_args.kwargs
        self.assertEqual(kwargs["task_id"], "obs-ok")
        self.assertEqual(kwargs["attempt"], 1)
        self.assertEqual(kwargs["status"], "success")
        self.assertIn("duration_ms", kwargs)
        self.assertIsNone(kwargs.get("error"))
        self.assertEqual(result["status"], "success")

    def test_failure_logs_full_error_message(self):
        task = run_weekly_pipeline
        task.push_request(id="obs-fail", retries=0)
        with patch("services.tasks._execute_pipeline", side_effect=RuntimeError("full boom")):
            with patch.object(task, "retry", side_effect=RuntimeError("retry-called")):
                with patch("services.tasks._log_task_event") as log_event:
                    with self.assertRaises(RuntimeError):
                        task.run("2026-01-01", "2026-01-07")
        task.pop_request()
        kwargs = log_event.call_args.kwargs
        self.assertEqual(kwargs["task_id"], "obs-fail")
        self.assertEqual(kwargs["attempt"], 1)
        self.assertEqual(kwargs["status"], "failure")
        self.assertEqual(kwargs["error"], "full boom")
        self.assertIn("duration_ms", kwargs)


if __name__ == "__main__":
    unittest.main()
