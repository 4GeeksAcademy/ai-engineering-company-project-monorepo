"""API endpoint tests for async pipeline enqueue + task status."""
from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from pydantic import BaseModel

from services.task_status import get_task_payload, map_celery_status


class PipelineTriggerRequest(BaseModel):
    start_date: str
    end_date: str


def _build_test_app() -> FastAPI:
    """Minimal app with the async endpoints (avoids Supabase/StaticFiles)."""
    import services.task_status as task_status
    from services.tasks import run_weekly_pipeline

    app = FastAPI()

    @app.post("/reporting/pipeline-runs")
    def trigger_pipeline(payload: PipelineTriggerRequest):
        async_result = run_weekly_pipeline.delay(payload.start_date, payload.end_date)
        return JSONResponse(status_code=202, content={"task_id": async_result.id})

    @app.get("/tasks/{task_id}")
    def get_task_status(task_id: str):
        return task_status.get_task_payload(task_id)

    return app


class StatusMappingTests(unittest.TestCase):
    def test_maps_celery_states(self):
        self.assertEqual(map_celery_status("PENDING"), "pending")
        self.assertEqual(map_celery_status("STARTED"), "started")
        self.assertEqual(map_celery_status("SUCCESS"), "success")
        self.assertEqual(map_celery_status("FAILURE"), "failure")
        self.assertEqual(map_celery_status("RETRY"), "pending")
        self.assertEqual(map_celery_status("RECEIVED"), "pending")


class TaskPayloadTests(unittest.TestCase):
    def test_success_payload(self):
        mock_result = MagicMock()
        mock_result.state = "SUCCESS"
        mock_result.result = {"ok": True}
        with patch("services.task_status.AsyncResult", return_value=mock_result):
            payload = get_task_payload("tid-1")
        self.assertEqual(
            payload,
            {"task_id": "tid-1", "status": "success", "result": {"ok": True}},
        )

    def test_failure_payload(self):
        mock_result = MagicMock()
        mock_result.state = "FAILURE"
        mock_result.result = RuntimeError("boom")
        with patch("services.task_status.AsyncResult", return_value=mock_result):
            payload = get_task_payload("tid-2")
        self.assertEqual(payload["status"], "failure")
        self.assertIn("boom", payload["result"]["error"])

    def test_pending_payload(self):
        mock_result = MagicMock()
        mock_result.state = "PENDING"
        mock_result.result = None
        with patch("services.task_status.AsyncResult", return_value=mock_result):
            payload = get_task_payload("tid-3")
        self.assertEqual(
            payload,
            {"task_id": "tid-3", "status": "pending", "result": None},
        )

    def test_started_payload(self):
        mock_result = MagicMock()
        mock_result.state = "STARTED"
        mock_result.result = None
        with patch("services.task_status.AsyncResult", return_value=mock_result):
            payload = get_task_payload("tid-4")
        self.assertEqual(payload["status"], "started")
        self.assertIsNone(payload["result"])


class PipelineEnqueueApiTests(unittest.TestCase):
    def test_trigger_returns_202_with_task_id(self):
        delayed = MagicMock()
        delayed.id = "celery-task-123"
        app = _build_test_app()
        client = TestClient(app)
        with patch("services.tasks.run_weekly_pipeline.delay", return_value=delayed):
            response = client.post(
                "/reporting/pipeline-runs",
                json={"start_date": "2026-01-01", "end_date": "2026-01-07"},
            )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json(), {"task_id": "celery-task-123"})

    def test_trigger_returns_under_200ms_regardless_of_task_duration(self):
        """Enqueue must not wait for the heavy task body."""
        import time

        delayed = MagicMock()
        delayed.id = "fast-task-id"

        def enqueue_only(*_args, **_kwargs):
            return delayed

        app = _build_test_app()
        client = TestClient(app)
        with patch("services.tasks.run_weekly_pipeline.delay", side_effect=enqueue_only):
            # Simulated task body is slow; endpoint must not call it.
            with patch(
                "services.tasks._execute_pipeline",
                side_effect=lambda *_a, **_k: time.sleep(2),
            ):
                started = time.perf_counter()
                response = client.post(
                    "/reporting/pipeline-runs",
                    json={"start_date": "2026-01-01", "end_date": "2026-01-07"},
                )
                elapsed_ms = (time.perf_counter() - started) * 1000

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json(), {"task_id": "fast-task-id"})
        self.assertLess(elapsed_ms, 200)

    def test_get_task_status_endpoint(self):
        app = _build_test_app()
        client = TestClient(app)
        with patch(
            "services.task_status.get_task_payload",
            return_value={"task_id": "abc", "status": "started", "result": None},
        ):
            response = client.get("/tasks/abc")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"task_id": "abc", "status": "started", "result": None},
        )

    def test_get_task_status_across_lifecycle_phases(self):
        """GET /tasks/{task_id} maps each Celery phase to the API status vocabulary."""
        app = _build_test_app()
        client = TestClient(app)
        phases = [
            ("PENDING", "pending", None),
            ("STARTED", "started", None),
            ("SUCCESS", "success", {"done": True}),
            ("FAILURE", "failure", RuntimeError("boom")),
        ]
        for celery_state, expected_status, result_value in phases:
            mock = MagicMock()
            mock.state = celery_state
            mock.result = result_value
            with patch("services.task_status.AsyncResult", return_value=mock):
                response = client.get("/tasks/life-1")
            self.assertEqual(response.status_code, 200)
            body = response.json()
            self.assertEqual(body["task_id"], "life-1")
            self.assertEqual(body["status"], expected_status)
            if expected_status == "success":
                self.assertEqual(body["result"], {"done": True})
            elif expected_status == "failure":
                self.assertIn("boom", body["result"]["error"])
            else:
                self.assertIsNone(body["result"])


if __name__ == "__main__":
    unittest.main()
