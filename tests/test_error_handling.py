from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api.app import app  # pylint: disable=wrong-import-position
from errors import error_body  # pylint: disable=wrong-import-position


class InventoryErrorHandlingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def _assert_error_envelope(self, response, status_code: int, code: str) -> dict:
        body = response.json()
        self.assertEqual(response.status_code, status_code)
        self.assertEqual(body["status"], status_code)
        self.assertEqual(body["code"], code)
        self.assertIn("message", body)
        self.assertIn("detail", body)
        serialized = json.dumps(body).lower()
        self.assertNotIn("traceback", serialized)
        self.assertNotIn('file "', serialized)
        return body

    def test_missing_product_returns_404(self) -> None:
        response = self.client.patch("/inventory/999999", json={"delta": 1})
        body = self._assert_error_envelope(response, 404, "not_found")
        self.assertIn("not found", str(body["detail"]).lower())
        self.assertIn("not found", body["message"].lower())

    def test_negative_alert_threshold_returns_400(self) -> None:
        response = self.client.get("/inventory/alerts", params={"threshold": -1})
        body = self._assert_error_envelope(response, 400, "bad_request")
        self.assertIn("threshold", str(body["detail"]).lower())

    def test_missing_incident_csv_is_404_without_filesystem_path(self) -> None:
        response = self.client.post(
            "/api/incidents/analyze/summary",
            json={"input_file": "does-not-exist.csv", "output_file": "results.csv"},
        )
        body = self._assert_error_envelope(response, 404, "not_found")
        self.assertNotIn("/Users/", body["detail"])
        self.assertNotIn("does-not-exist.csv", body["detail"])

    def test_invalid_incident_upload_type_is_400(self) -> None:
        response = self.client.post(
            "/api/incidents/analyze/upload/summary",
            files={"file": ("notes.txt", b"hello", "text/plain")},
        )
        self._assert_error_envelope(response, 400, "bad_request")

    def test_invalid_json_body_returns_structured_422(self) -> None:
        response = self.client.post("/users", json={"email": "not-an-email", "password": "secret-password"})
        body = self._assert_error_envelope(response, 422, "validation_error")
        self.assertIsInstance(body["detail"], list)
        self.assertTrue(any("email" in item.get("loc", []) for item in body["detail"]))
        self.assertNotIn("ctx", body["detail"][0])

    def test_unhandled_exception_is_structured_500_without_traceback(self) -> None:
        client = TestClient(app, raise_server_exceptions=False)
        with patch("inventory.load_products", side_effect=RuntimeError("secret boom /Users/hidden")):
            response = client.get("/inventory")
        body = self._assert_error_envelope(response, 500, "internal_error")
        self.assertEqual(body["message"], "Internal server error")
        self.assertEqual(body["detail"], "Internal server error")
        serialized = json.dumps(body)
        self.assertNotIn("secret boom", serialized)
        self.assertNotIn("/Users/hidden", serialized)

    def test_error_body_helper_shape(self) -> None:
        payload = error_body(404, "Product 1 not found")
        self.assertEqual(
            payload,
            {
                "status": 404,
                "code": "not_found",
                "message": "Product 1 not found",
                "detail": "Product 1 not found",
            },
        )

    def test_error_body_redacts_connection_strings_keys_and_paths(self) -> None:
        leaks = [
            "could not connect postgres://user:hunter2@db.internal:5432/brasaland",
            "openai failed api_key=sk-live-secretvalue",
            "read failed at /Users/rickymacbookpro/Projects/secret.env",
        ]
        for leak in leaks:
            body = error_body(500, leak)
            serialized = json.dumps(body)
            self.assertNotIn("postgres://", serialized.lower())
            self.assertNotIn("sk-live", serialized)
            self.assertNotIn("/Users/", serialized)
            self.assertNotIn("hunter2", serialized)
            self.assertEqual(body["message"], "Internal server error")

    def test_external_service_error_returns_503_without_internals(self) -> None:
        from services.safe_errors import ExternalServiceError

        client = TestClient(app, raise_server_exceptions=False)
        with patch(
            "inventory.load_products",
            side_effect=ExternalServiceError("language model"),
        ):
            response = client.get("/inventory")
        body = self._assert_error_envelope(response, 503, "service_unavailable")
        self.assertEqual(body["message"], "language model is unavailable")
        serialized = json.dumps(body)
        self.assertNotIn("postgres://", serialized)
        self.assertNotIn("sk-", serialized)


class SafeExternalCallTests(unittest.TestCase):
    def test_call_external_maps_failures(self) -> None:
        from services.safe_errors import ExternalServiceError, call_external

        with self.assertRaises(ExternalServiceError) as raised:
            call_external(
                "language model",
                lambda: (_ for _ in ()).throw(
                    RuntimeError("auth failed api_key=sk-secret postgres://db")
                ),
            )
        self.assertEqual(str(raised.exception), "language model is unavailable")
        self.assertNotIn("sk-secret", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
