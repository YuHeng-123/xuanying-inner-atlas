"""Focused regression checks for the published calendar and unknown-hour rules."""

from __future__ import annotations

import unittest

from backend.main import _prompt_payload
from backend.quant_engine import analyze_interaction, analyze_time_scenarios, calculate_twelve_ci, extract_bazi_features


class CalendarConventionTests(unittest.TestCase):
    def test_gregorian_input_crosses_year_and_month_at_litchun(self) -> None:
        before = extract_bazi_features(2025, 2, 2, 12)
        after = extract_bazi_features(2025, 2, 4, 12)

        self.assertEqual(before["pillars"]["year"], "甲辰")
        self.assertEqual(after["pillars"]["year"], "乙巳")
        self.assertEqual(before["pillars"]["month"][1], "丑")
        self.assertEqual(after["pillars"]["month"][1], "寅")
        self.assertEqual(before["calculation_convention"]["input_calendar"], "公历")
        self.assertIn("23:00", before["calculation_convention"]["day_boundary"])

    def test_late_zi_uses_next_day_under_sect_one(self) -> None:
        late_zi = extract_bazi_features(1992, 6, 18, 23)
        next_day_noon = extract_bazi_features(1992, 6, 19, 12)
        self.assertEqual(late_zi["pillars"]["day"], next_day_noon["pillars"]["day"])


class UnknownHourScenarioTests(unittest.TestCase):
    def test_target_unknown_enumerates_twelve_branches_and_both_zi_edges(self) -> None:
        result = analyze_time_scenarios(
            {"year": 1992, "month": 6, "day": 18, "hour": 12},
            {"year": 1988, "month": 2, "day": 11, "hour": None},
        )
        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result["mode"], "target_unknown")
        self.assertEqual(result["candidate_count"], 13)
        self.assertEqual(result["hour_branch_count"], 12)
        self.assertEqual(result["best_case"]["interaction"]["risk_pressure"], min(
            result["best_case"]["interaction"]["risk_pressure"],
            result["worst_case"]["interaction"]["risk_pressure"],
        ))
        self.assertIn("23:00", result["day_boundary_note"])
        self.assertIn("00:00", result["day_boundary_note"])

    def test_both_unknown_hours_evaluate_each_pair(self) -> None:
        result = analyze_time_scenarios(
            {"year": 1992, "month": 6, "day": 18, "hour": None},
            {"year": 1988, "month": 2, "day": 11, "hour": None},
        )
        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result["mode"], "both_unknown")
        self.assertEqual(result["candidate_count"], 169)
        self.assertLessEqual(
            result["best_case"]["interaction"]["risk_pressure"],
            result["worst_case"]["interaction"]["risk_pressure"],
        )

    def test_known_hours_skip_sensitivity_analysis(self) -> None:
        self.assertIsNone(analyze_time_scenarios(
            {"year": 1992, "month": 6, "day": 18, "hour": 12},
            {"year": 1988, "month": 2, "day": 11, "hour": 9},
        ))

    def test_prompt_redacts_exact_birth_dates_but_includes_scenario_endpoints(self) -> None:
        user_bazi = extract_bazi_features(1992, 6, 18, None)
        target_bazi = extract_bazi_features(1988, 2, 11, None)
        baseline = analyze_interaction(user_bazi, target_bazi)
        scenarios = analyze_time_scenarios(
            {"year": 1992, "month": 6, "day": 18, "hour": None},
            {"year": 1988, "month": 2, "day": 11, "hour": None},
        )
        payload = _prompt_payload("朋友", "", user_bazi, target_bazi, baseline, scenarios)

        self.assertNotIn("birth", payload["user_bazi"])
        self.assertNotIn("birth", payload["target_bazi"])
        self.assertIsNotNone(payload["time_uncertainty_comparison"])

    def test_prompt_does_not_forward_jieqi_transition_timestamp(self) -> None:
        user_bazi = extract_bazi_features(2025, 2, 3, 22)
        target_bazi = extract_bazi_features(1992, 6, 18, 12)
        self.assertTrue(user_bazi["minute_boundary_terms"])

        payload = _prompt_payload("朋友", "", user_bazi, target_bazi, analyze_interaction(user_bazi, target_bazi), None)

        self.assertNotIn("minute_boundary_terms", payload["user_bazi"])
        self.assertNotIn("birth", payload["user_bazi"])
        self.assertNotIn("2025-02-03", str(payload))


class TwelveCiTransitionTests(unittest.TestCase):
    def test_known_hour_that_contains_solar_term_returns_both_candidates(self) -> None:
        result = calculate_twelve_ci(2025, 2, 3, 22)

        self.assertTrue(result["has_hour"])
        self.assertEqual([item["name"] for item in result["candidates"]], ["玄枵", "娵訾"])
        self.assertIn("未提供分钟", result["boundary_note"])

    def test_known_hour_after_transition_returns_single_candidate(self) -> None:
        result = calculate_twelve_ci(2025, 2, 3, 23)

        self.assertEqual(len(result["candidates"]), 1)
        self.assertEqual(result["candidates"][0]["name"], "娵訾")


if __name__ == "__main__":
    unittest.main()
