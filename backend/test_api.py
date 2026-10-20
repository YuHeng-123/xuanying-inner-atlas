"""FastAPI contract tests that force local Mock mode and never call an LLM."""

from __future__ import annotations

import os
import unittest
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from backend.main import app


class RelationshipApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.no_llm_keys = patch.dict(os.environ, {"LLM_API_KEY": "", "OPENAI_API_KEY": ""})
        self.no_llm_keys.start()
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")

    async def asyncTearDown(self) -> None:
        await self.client.aclose()
        self.no_llm_keys.stop()

    async def test_health_reports_mock_without_credentials(self) -> None:
        response = await self.client.get("/healthz")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "report_mode": "MOCK"})

    async def test_relationship_endpoint_returns_mock_and_unknown_hour_range(self) -> None:
        response = await self.client.post("/api/v1/analyze-relationship", json={
            "user_birth": {"year": 1992, "month": 6, "day": 18, "hour": 12},
            "target_birth": {"year": 1988, "month": 2, "day": 11},
            "relationship_type": "平级同事",
            "concern": "API 自动化测试，不含个人信息。",
        })

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["report_source"], "MOCK")
        self.assertEqual(body["time_scenarios"]["mode"], "target_unknown")
        self.assertEqual(body["time_scenarios"]["candidate_count"], 13)
        self.assertEqual(set(body["interaction"]["dimensions"]), {
            "trust_cap", "synergy", "drain_rate", "friction", "stickiness",
        })
        self.assertTrue(body["report"]["one_sentence_verdict"])

    async def test_invalid_birth_date_is_rejected_as_client_error(self) -> None:
        response = await self.client.post("/api/v1/twelve-ci", json={
            "year": 2025, "month": 2, "day": 30,
        })

        self.assertEqual(response.status_code, 422)

    async def test_mock_uses_concern_as_topic_without_claiming_target_behavior(self) -> None:
        response = await self.client.post("/api/v1/analyze-relationship", json={
            "user_birth": {"year": 1992, "month": 6, "day": 18, "hour": 12},
            "target_birth": {"year": 1988, "month": 2, "day": 11},
            "relationship_type": "直属领导",
            "concern": "任务目标临时变化，我担心职责不清。",
        })
        self.assertEqual(response.status_code, 200, response.text)
        report = response.json()["report"]
        self.assertIn("任务", report["risk_situations"][0])
        self.assertIn("核对", report["risk_signals"][0])
        self.assertNotIn("对方会", report["risk_signals"][0])

    async def test_partial_provider_json_is_labeled_mock(self) -> None:
        with patch("backend.main._call_llm", new=AsyncMock(return_value={"relationship_archetype": "不完整"})):
            response = await self.client.post("/api/v1/analyze-relationship", json={
                "user_birth": {"year": 1992, "month": 6, "day": 18},
                "target_birth": {"year": 1988, "month": 2, "day": 11},
                "relationship_type": "朋友",
            })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["report_source"], "MOCK")
        self.assertNotEqual(response.json()["report"]["relationship_archetype"], "不完整")


if __name__ == "__main__":
    unittest.main()
