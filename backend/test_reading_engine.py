"""Regression checks for chart evidence shown in the BaZi reading."""

from __future__ import annotations

import unittest

from backend.quant_engine import analyze_birth_time_uncertainty, calculate_ten_god, extract_bazi_features
from backend.reading_engine import read_bazi
from lunar_python.util import LunarUtil


class BaziReadingEvidenceTests(unittest.TestCase):
    def test_known_chart_has_month_hidden_stems_and_ten_gods(self) -> None:
        features = extract_bazi_features(1992, 6, 18, None)
        reading = read_bazi(features)

        self.assertEqual(features["pillars"]["month"], "丙午")
        self.assertEqual(features["hidden_stems"]["month"], ["丁", "己"])
        self.assertIsNone(features["hidden_stems"]["hour"])
        self.assertEqual(reading["seasonal_context"]["main_hidden_stem"], "丁")
        self.assertEqual(reading["seasonal_context"]["main_hidden_ten_god"], "食神")
        self.assertEqual(reading["hidden_stems"][1]["stems"][0]["ten_god"], "食神")
        self.assertNotIn("时柱", [item["label"] for item in reading["hidden_stems"]])
        self.assertIn("未据此判定身强弱或喜用神", reading["seasonal_context"]["note"])
        self.assertEqual(reading["strength_evidence"]["status"], "INCOMPLETE")
        self.assertEqual(features["reference_time"], "00:00")

    def test_unknown_hour_can_change_day_and_jieqi_pillars(self) -> None:
        ordinary = analyze_birth_time_uncertainty({"year": 1992, "month": 6, "day": 18, "hour": None})
        jieqi = analyze_birth_time_uncertainty({"year": 2025, "month": 2, "day": 3, "hour": None})

        assert ordinary is not None and jieqi is not None
        self.assertEqual(ordinary["candidate_count"], 13)
        self.assertEqual(len(ordinary["pillar_options"]["day"]), 2)
        self.assertEqual(len(jieqi["pillar_options"]["year"]), 2)
        self.assertEqual(len(jieqi["pillar_options"]["month"]), 2)
        self.assertIsNone(analyze_birth_time_uncertainty({"year": 1992, "month": 6, "day": 18, "hour": 12}))

    def test_ten_god_table_agrees_with_calendar_library(self) -> None:
        for day_stem in "甲乙丙丁戊己庚辛壬癸":
            for other_stem in "甲乙丙丁戊己庚辛壬癸":
                self.assertEqual(calculate_ten_god(day_stem, other_stem), LunarUtil.SHI_SHEN[day_stem + other_stem])

    def test_strength_screening_discloses_its_non_classical_rule(self) -> None:
        reading = read_bazi(extract_bazi_features(1992, 6, 18, 12))
        strength = reading["strength_evidence"]
        self.assertEqual(strength["status"], "MIXED")
        self.assertIn("三项等权是产品约定", strength["rule_note"])
        self.assertIn("不生成扶抑方向候选", strength["review_direction"])

    def test_known_hour_at_jieqi_boundary_requires_minutes(self) -> None:
        chart = extract_bazi_features(2025, 2, 3, 22)
        reading = read_bazi(chart)

        self.assertEqual(chart["minute_boundary_terms"][0]["term"], "立春")
        self.assertEqual(reading["strength_evidence"]["status"], "BOUNDARY_UNCERTAIN")
        self.assertIn("准确分钟", reading["minute_sensitive_note"])
        self.assertEqual(extract_bazi_features(2025, 2, 3, 21)["minute_boundary_terms"], [])


if __name__ == "__main__":
    unittest.main()
