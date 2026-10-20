"""Quantitative relationship analysis based on Chinese BaZi features.

The module deliberately keeps the metaphysical vocabulary at the feature
extraction boundary.  The numeric output is a heuristic signal for the
product's report layer, not a scientific or psychological diagnosis.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping
from datetime import datetime, timedelta
from typing import Any


STEMS = "甲乙丙丁戊己庚辛壬癸"
BRANCHES = "子丑寅卯辰巳午未申酉戌亥"

# A reproducible, modern birthday-game mapping based on twelve selected jieqi
# boundaries. It is not a claim that the historical twelve ci were zodiac signs.
TWELVE_CI_BOUNDARIES = (
    ("大雪", "xingji", "星纪", "丑"),
    ("小寒", "xuanxiao", "玄枵", "子"),
    ("立春", "yuzhi", "娵訾", "亥"),
    ("惊蛰", "jianglou", "降娄", "戌"),
    ("清明", "daliang", "大梁", "酉"),
    ("立夏", "shishen", "实沈", "申"),
    ("芒种", "chunshou", "鹑首", "未"),
    ("小暑", "chunhuo", "鹑火", "午"),
    ("立秋", "chunwei", "鹑尾", "巳"),
    ("白露", "shouxing", "寿星", "辰"),
    ("寒露", "dahuo", "大火", "卯"),
    ("立冬", "ximu", "析木", "寅"),
)

_JIEQI_KEY_ALIASES = {
    "DA_XUE": "大雪",
    "XIAO_HAN": "小寒",
    "LI_CHUN": "立春",
    "JING_ZHE": "惊蛰",
    "QING_MING": "清明",
    "LI_XIA": "立夏",
    "MANG_ZHONG": "芒种",
    "XIAO_SHU": "小暑",
    "LI_QIU": "立秋",
    "BAI_LU": "白露",
    "HAN_LU": "寒露",
    "LI_DONG": "立冬",
}

STEM_ELEMENTS = {
    "甲": "木",
    "乙": "木",
    "丙": "火",
    "丁": "火",
    "戊": "土",
    "己": "土",
    "庚": "金",
    "辛": "金",
    "壬": "水",
    "癸": "水",
}

STEM_YIN_YANG = {
    "甲": "阳",
    "乙": "阴",
    "丙": "阳",
    "丁": "阴",
    "戊": "阳",
    "己": "阴",
    "庚": "阳",
    "辛": "阴",
    "壬": "阳",
    "癸": "阴",
}

BRANCH_ELEMENTS = {
    "子": "水",
    "丑": "土",
    "寅": "木",
    "卯": "木",
    "辰": "土",
    "巳": "火",
    "午": "火",
    "未": "土",
    "申": "金",
    "酉": "金",
    "戌": "土",
    "亥": "水",
}

SIX_CLASHES = {
    frozenset(("子", "午")),
    frozenset(("丑", "未")),
    frozenset(("寅", "申")),
    frozenset(("卯", "酉")),
    frozenset(("辰", "戌")),
    frozenset(("巳", "亥")),
}

SIX_HARMS = {
    frozenset(("子", "未")),
    frozenset(("丑", "午")),
    frozenset(("寅", "巳")),
    frozenset(("卯", "辰")),
    frozenset(("申", "亥")),
    frozenset(("酉", "戌")),
}

SIX_COMBINES = {
    frozenset(("子", "丑")),
    frozenset(("寅", "亥")),
    frozenset(("卯", "戌")),
    frozenset(("辰", "酉")),
    frozenset(("巳", "申")),
    frozenset(("午", "未")),
}

PUNISHMENT_TRIADS = {
    "恃势之刑": frozenset(("寅", "巳", "申")),
    "无恩之刑": frozenset(("丑", "戌", "未")),
}

NO_COURTESY_PUNISHMENT = frozenset(("子", "卯"))
SELF_PUNISHMENT_BRANCHES = frozenset(("辰", "午", "酉", "亥"))

# Positive values improve a capability score; values for drain_rate and
# friction increase the amount of strain, so lower is better for those two.
TEN_GOD_MODIFIERS = {
    "正印": {"trust_cap": 6, "synergy": 4, "drain_rate": -3, "friction": -4, "stickiness": 4},
    "偏印": {"trust_cap": 1, "synergy": 3, "drain_rate": 4, "friction": 2, "stickiness": 3},
    "正官": {"trust_cap": 5, "synergy": 3, "drain_rate": 2, "friction": 1, "stickiness": 4},
    "七杀": {"trust_cap": -4, "synergy": 4, "drain_rate": 6, "friction": 7, "stickiness": 5},
    "正财": {"trust_cap": 4, "synergy": 5, "drain_rate": 1, "friction": -1, "stickiness": 4},
    "偏财": {"trust_cap": 2, "synergy": 6, "drain_rate": 3, "friction": 1, "stickiness": 5},
    "食神": {"trust_cap": 5, "synergy": 7, "drain_rate": -4, "friction": -4, "stickiness": 6},
    "伤官": {"trust_cap": -3, "synergy": 5, "drain_rate": 5, "friction": 6, "stickiness": 4},
    "比肩": {"trust_cap": 3, "synergy": 3, "drain_rate": 2, "friction": 1, "stickiness": 6},
    "劫财": {"trust_cap": -2, "synergy": 2, "drain_rate": 6, "friction": 5, "stickiness": 7},
}

RELATION_MODIFIERS = {
    "六冲": {"trust_cap": -7, "synergy": -5, "drain_rate": 6, "friction": 9, "stickiness": 4},
    "六害": {"trust_cap": -5, "synergy": -2, "drain_rate": 4, "friction": 5, "stickiness": 3},
    "六合": {"trust_cap": 5, "synergy": 6, "drain_rate": -2, "friction": -2, "stickiness": 7},
    "恃势之刑": {"trust_cap": -3, "synergy": 3, "drain_rate": 6, "friction": 7, "stickiness": 5},
    "无恩之刑": {"trust_cap": -5, "synergy": -2, "drain_rate": 7, "friction": 8, "stickiness": 4},
    "无礼之刑": {"trust_cap": -4, "synergy": 1, "drain_rate": 4, "friction": 7, "stickiness": 3},
    "自刑": {"trust_cap": -4, "synergy": -1, "drain_rate": 5, "friction": 6, "stickiness": 2},
}

DIMENSION_BASELINES = {
    "trust_cap": 60,
    "synergy": 60,
    "drain_rate": 30,
    "friction": 30,
    "stickiness": 40,
}

# A two-hour earthly-branch interval normally contributes one candidate. Zi hour
# straddles midnight, so it is evaluated at both 00:00 and 23:00 when the day
# changes at 23:00. This is 13 test instants covering the 12 traditional hours.
HOUR_SCENARIOS: tuple[tuple[int, str, str], ...] = (
    (23, "子", "子时（23:00–00:00段，跨日边界）"),
    (0, "子", "子时（00:00–01:00段）"),
    (2, "丑", "丑时（代表时刻 02:00）"),
    (4, "寅", "寅时（代表时刻 04:00）"),
    (6, "卯", "卯时（代表时刻 06:00）"),
    (8, "辰", "辰时（代表时刻 08:00）"),
    (10, "巳", "巳时（代表时刻 10:00）"),
    (12, "午", "午时（代表时刻 12:00）"),
    (14, "未", "未时（代表时刻 14:00）"),
    (16, "申", "申时（代表时刻 16:00）"),
    (18, "酉", "酉时（代表时刻 18:00）"),
    (20, "戌", "戌时（代表时刻 20:00）"),
    (22, "亥", "亥时（代表时刻 22:00）"),
)

CALCULATION_CONVENTION = {
    "input_calendar": "公历",
    "timezone": "中国标准时间（UTC+08:00）",
    "year_boundary": "立春交接时刻",
    "month_boundary": "十二节交接时刻，不按农历初一换月",
    "day_boundary": "23:00 子时换日（lunar-python sect=1）",
    "true_solar_time": False,
    "note": "这是本产品公开采用的传统排盘口径，不代表不同流派只有这一种规则，也不构成科学预测。",
}


def _mapping(value: Any) -> Mapping[str, Any]:
    if isinstance(value, Mapping):
        return value
    model_dump = getattr(value, "model_dump", None)
    if callable(model_dump):
        return model_dump()
    to_dict = getattr(value, "dict", None)
    if callable(to_dict):
        return to_dict()
    raise TypeError("bazi must be a mapping or a Pydantic model")


def _normalise_pillar(value: Any) -> str:
    pillar = str(value or "").strip()
    if len(pillar) < 2 or pillar[0] not in STEMS or pillar[1] not in BRANCHES:
        raise ValueError(f"invalid Gan-Zhi pillar: {value!r}")
    return pillar[:2]


def _normalise_stem(value: Any) -> str:
    stem = str(value or "").strip()
    if stem and stem[0] in STEMS:
        return stem[0]
    raise ValueError(f"invalid heavenly stem: {value!r}")


def _normalise_branch(value: Any) -> str:
    branch = str(value or "").strip()
    if branch and branch[0] in BRANCHES:
        return branch[0]
    raise ValueError(f"invalid earthly branch: {value!r}")


def extract_bazi_features(year: int, month: int, day: int, hour: int | None = None) -> dict[str, Any]:
    """Convert a solar birth date into the three- or four-pillar BaZi record.

    When ``hour`` is omitted, Solar.fromYmd is used and the time pillar is
    intentionally left out.  This gives a six-character record while keeping
    the uncertainty explicit through ``has_hour=False``.
    """

    try:
        birth_date = datetime(int(year), int(month), int(day))
    except (TypeError, ValueError) as exc:
        raise ValueError("year, month and day must form a valid Gregorian date") from exc

    if hour is not None and (not isinstance(hour, int) or not 0 <= hour <= 23):
        raise ValueError("hour must be an integer from 0 to 23, or None")

    try:
        from lunar_python import Solar
    except ImportError as exc:  # pragma: no cover - exercised when deps are absent
        raise RuntimeError("lunar-python is required; install backend/requirements.txt first") from exc

    if hour is None:
        solar = Solar.fromYmd(birth_date.year, birth_date.month, birth_date.day)
    else:
        solar = Solar.fromYmdHms(birth_date.year, birth_date.month, birth_date.day, hour, 0, 0)

    lunar = solar.getLunar()
    eight_char = lunar.getEightChar()
    # sect=1 uses the late-Zi (23:00) day-boundary convention. The library's
    # default is sect=2 (midnight), so set this explicitly and expose it below.
    eight_char.setSect(1)
    month_boundary_terms = {item[0] for item in TWELVE_CI_BOUNDARIES}
    minute_boundary_terms: list[dict[str, str]] = []
    if hour is not None:
        seen_boundaries: set[tuple[str, str]] = set()
        for key, term_solar in lunar.getJieQiTable().items():
            name = _JIEQI_KEY_ALIASES.get(str(key), str(key))
            if name not in month_boundary_terms:
                continue
            at = datetime.strptime(term_solar.toYmdHms(), "%Y-%m-%d %H:%M:%S")
            identifier = (name, at.isoformat())
            if at.date() == birth_date.date() and at.hour == hour and (at.minute or at.second) and identifier not in seen_boundaries:
                minute_boundary_terms.append({"term": name, "at": at.strftime("%Y-%m-%d %H:%M:%S")})
                seen_boundaries.add(identifier)
    pillars: dict[str, str | None] = {
        "year": _normalise_pillar(eight_char.getYear()),
        "month": _normalise_pillar(eight_char.getMonth()),
        "day": _normalise_pillar(eight_char.getDay()),
        "hour": _normalise_pillar(eight_char.getTime()) if hour is not None else None,
    }
    populated_pillars = {key: value for key, value in pillars.items() if value is not None}
    stems = {key: value[0] for key, value in populated_pillars.items()}
    branches = {key: value[1] for key, value in populated_pillars.items()}
    hidden_stems = {
        "year": list(eight_char.getYearHideGan()),
        "month": list(eight_char.getMonthHideGan()),
        "day": list(eight_char.getDayHideGan()),
        "hour": list(eight_char.getTimeHideGan()) if hour is not None else None,
    }

    return {
        "calendar": "solar",
        "birth": {"year": birth_date.year, "month": birth_date.month, "day": birth_date.day, "hour": hour},
        "reference_time": "00:00" if hour is None else f"{hour:02d}:00",
        "minute_boundary_terms": minute_boundary_terms,
        "pillars": pillars,
        "characters": [character for pillar in populated_pillars.values() for character in pillar],
        "stems": stems,
        "branches": branches,
        "hidden_stems": hidden_stems,
        "year_stem": stems["year"],
        "month_stem": stems["month"],
        "day_stem": stems["day"],
        "day_branch": branches["day"],
        "has_hour": hour is not None,
        "pillar_count": len(populated_pillars),
        "calculation_convention": CALCULATION_CONVENTION.copy(),
    }


def analyze_birth_time_uncertainty(birth: Mapping[str, Any]) -> dict[str, Any] | None:
    """List pillar alternatives for the 13 disclosed representative hour cases.

    This is a sensitivity check, not an exhaustive minute-level birth-time search.
    In particular, a jieqi transition within an hour needs the actual minute.
    """
    if birth.get("hour") is not None:
        return None

    samples = []
    for hour, branch, label in sorted(HOUR_SCENARIOS, key=lambda item: item[0]):
        chart = extract_bazi_features(
            int(birth["year"]), int(birth["month"]), int(birth["day"]), hour
        )
        samples.append({
            "hour": hour,
            "branch": branch,
            "label": label,
            "pillars": {key: chart["pillars"][key] for key in ("year", "month", "day")},
        })

    pillar_options = {
        key: list(dict.fromkeys(sample["pillars"][key] for sample in samples))
        for key in ("year", "month", "day")
    }
    return {
        "candidate_count": len(samples),
        "pillar_options": pillar_options,
        "changing_pillars": [key for key, options in pillar_options.items() if len(options) > 1],
        "samples": samples,
        "note": "未知时辰时，三柱以 00:00 为展示基准，并非全部确定；按 13 个代表时刻核对年、月、日柱。23:00 可换日，节气当天也可能换年或换月；节气交接所在小时仍需准确分钟核实。",
    }


def calculate_ten_god(my_day_stem: str, target_day_stem: str) -> str:
    """Return the target day's Ten-God relationship from my day-master view."""

    my_stem = _normalise_stem(my_day_stem)
    target_stem = _normalise_stem(target_day_stem)
    my_element = STEM_ELEMENTS[my_stem]
    target_element = STEM_ELEMENTS[target_stem]
    same_polarity = STEM_YIN_YANG[my_stem] == STEM_YIN_YANG[target_stem]

    if my_element == target_element:
        return "比肩" if same_polarity else "劫财"
    if (my_element, target_element) in {("木", "火"), ("火", "土"), ("土", "金"), ("金", "水"), ("水", "木")}:
        return "食神" if same_polarity else "伤官"
    if (target_element, my_element) in {("木", "火"), ("火", "土"), ("土", "金"), ("金", "水"), ("水", "木")}:
        return "偏印" if same_polarity else "正印"
    if (my_element, target_element) in {("木", "土"), ("土", "水"), ("水", "火"), ("火", "金"), ("金", "木")}:
        return "偏财" if same_polarity else "正财"
    if (target_element, my_element) in {("木", "土"), ("土", "水"), ("水", "火"), ("火", "金"), ("金", "木")}:
        return "七杀" if same_polarity else "正官"
    raise ValueError(f"cannot derive Ten-God relationship for {my_stem} and {target_stem}")


BAZI_FLOW_MONTH_TERMS = (
    ("立春", "立春"), ("惊蛰", "惊蛰"), ("清明", "清明"), ("立夏", "立夏"),
    ("芒种", "芒种"), ("小暑", "小暑"), ("立秋", "立秋"), ("白露", "白露"),
    ("寒露", "寒露"), ("立冬", "立冬"), ("大雪", "大雪"),
    # The table keeps the following winter's terms under canonical aliases.
    ("小寒", "XIAO_HAN"), ("立春", "LI_CHUN"),
)


def calculate_bazi_luck(
    year: int,
    month: int,
    day: int,
    hour: int,
    gender: str,
    selected_year: int,
) -> dict[str, Any]:
    """Calculate the traditional DaYun/LiuNian sequence using lunar-python.

    The birth hour is required because the start-of-luck calculation depends on
    it. Callers must pass an explicitly selected representative hour when the
    recorded birth time is unknown; this function never invents one.
    """
    try:
        birth_date = datetime(int(year), int(month), int(day))
    except (TypeError, ValueError) as exc:
        raise ValueError("year, month and day must form a valid Gregorian date") from exc
    if not isinstance(hour, int) or not 0 <= hour <= 23:
        raise ValueError("hour must be an integer from 0 to 23")
    if gender not in {"male", "female"}:
        raise ValueError("gender must be male or female")
    if not isinstance(selected_year, int) or not 1900 <= selected_year <= 2300:
        raise ValueError("selected_year must be an integer from 1900 to 2300")

    try:
        from lunar_python import Solar
    except ImportError as exc:  # pragma: no cover - exercised when deps are absent
        raise RuntimeError("lunar-python is required; install backend/requirements.txt first") from exc

    try:
        solar = Solar.fromYmdHms(birth_date.year, birth_date.month, birth_date.day, hour, 0, 0)
        eight_char = solar.getLunar().getEightChar()
        eight_char.setSect(1)
        yun = eight_char.getYun(1 if gender == "male" else 0, 1)
        start_solar = yun.getStartSolar()
        day_stem = _normalise_stem(eight_char.getDay()[0])
        year_stem = _normalise_stem(eight_char.getYear()[0])
        natal_pillars = {
            position: _normalise_pillar(pillar)
            for position, pillar in (
                ("year", eight_char.getYear()),
                ("month", eight_char.getMonth()),
                ("day", eight_char.getDay()),
                ("hour", eight_char.getTime()),
            )
        }
        natal_branches = {position: pillar[1] for position, pillar in natal_pillars.items()}
        jie_qi_table = Solar.fromYmdHms(selected_year, 6, 1, 12, 0, 0).getLunar().getJieQiTable()
        flow_month_boundaries = []
        for label, key in BAZI_FLOW_MONTH_TERMS:
            term = jie_qi_table.get(key)
            if term is None:
                raise ValueError(f"missing solar-term boundary: {key}")
            flow_month_boundaries.append({"name": label, "solar_datetime": term.toYmdHms()})
        periods = []
        selected_months = []
        for da_yun in yun.getDaYun():
            # lunar-python uses index 0 for the period before the first DaYun.
            if da_yun.getIndex() == 0:
                continue
            gan_zhi = _normalise_pillar(da_yun.getGanZhi())
            annuals = []
            for liu_nian in da_yun.getLiuNian():
                annual_gan_zhi = _normalise_pillar(liu_nian.getGanZhi())
                annual_year = int(liu_nian.getYear())
                if annual_year == selected_year:
                    selected_months = []
                    for liu_yue in liu_nian.getLiuYue():
                        month_gan_zhi = _normalise_pillar(liu_yue.getGanZhi())
                        selected_months.append({
                            "index": int(liu_yue.getIndex()),
                            "month_number": int(liu_yue.getIndex()) + 1,
                            "branch": month_gan_zhi[1],
                            "ganzhi": month_gan_zhi,
                            "stem_ten_god": calculate_ten_god(day_stem, month_gan_zhi[0]),
                            "start_jieqi": flow_month_boundaries[int(liu_yue.getIndex())]["name"],
                            "start_solar_datetime": flow_month_boundaries[int(liu_yue.getIndex())]["solar_datetime"],
                            "end_jieqi": flow_month_boundaries[int(liu_yue.getIndex()) + 1]["name"],
                            "end_solar_datetime": flow_month_boundaries[int(liu_yue.getIndex()) + 1]["solar_datetime"],
                            "natal_branch_relations": _natal_branch_relations(natal_branches, month_gan_zhi[1], "flow_month", "month"),
                            "time_layer_relations": _period_branch_relations([
                                ("dayun", "cycle", gan_zhi[1]),
                                ("flow_year", "year", annual_gan_zhi[1]),
                                ("flow_month", "month", month_gan_zhi[1]),
                            ]),
                            "all_layer_branch_context": [
                                {"position": f"natal.{position}", "ganzhi": pillar}
                                for position, pillar in natal_pillars.items()
                            ] + [
                                {"position": "dayun.cycle", "ganzhi": gan_zhi},
                                {"position": "flow_year.year", "ganzhi": annual_gan_zhi},
                                {"position": "flow_month.month", "ganzhi": month_gan_zhi},
                            ],
                            "all_layer_relations": _all_layer_branch_relations(
                                natal_branches,
                                [
                                    ("dayun", "cycle", gan_zhi[1]),
                                    ("flow_year", "year", annual_gan_zhi[1]),
                                    ("flow_month", "month", month_gan_zhi[1]),
                                ],
                            ),
                        })
                annuals.append({
                    "year": annual_year,
                    "nominal_age": int(liu_nian.getAge()),
                    "ganzhi": annual_gan_zhi,
                    "stem_ten_god": calculate_ten_god(day_stem, annual_gan_zhi[0]),
                    "natal_branch_relations": _natal_branch_relations(natal_branches, annual_gan_zhi[1], "flow_year", "year"),
                })
            periods.append({
                "index": int(da_yun.getIndex()),
                "start_year": int(da_yun.getStartYear()),
                "end_year": int(da_yun.getEndYear()),
                "start_age": int(da_yun.getStartAge()),
                "end_age": int(da_yun.getEndAge()),
                "ganzhi": gan_zhi,
                "stem_ten_god": calculate_ten_god(day_stem, gan_zhi[0]),
                "natal_branch_relations": _natal_branch_relations(natal_branches, gan_zhi[1], "dayun", "cycle"),
                "years": annuals,
            })
    except (AttributeError, TypeError, ValueError, IndexError) as exc:
        raise ValueError("could not derive the luck-cycle data for this birth input") from exc

    if not periods:
        raise ValueError("the selected birth input does not have a usable DaYun range")

    direction = "顺行" if yun.isForward() else "逆行"
    return {
        "birth": {"year": birth_date.year, "month": birth_date.month, "day": birth_date.day, "hour": hour},
        "gender": gender,
        "direction": direction,
        "direction_basis": f"年干{year_stem}属{STEM_YIN_YANG[year_stem]}，结合本页临时选择的排盘口径，由 lunar-python 推导顺逆。",
        "day_master": day_stem,
        "selected_year": selected_year,
        "months": selected_months,
        "start": {
            "solar_datetime": start_solar.toYmdHms(),
            "age_years": int(yun.getStartYear()),
            "age_months": int(yun.getStartMonth()),
            "age_days": int(yun.getStartDay()),
            "age_hours": int(yun.getStartHour()),
        },
        "cycles": periods,
        "calculation_basis": [
            "排盘库：lunar-python；起运参数使用 getYun(gender, sect=1)。",
            "sect=1 的起运换算口径：三日折一年、一日折四个月、一时辰折十日。",
            "起运时刻只精确到本页提供的整点；出生分钟未知，节气交接附近可能影响结果。",
            "流年十神按本命日干与流年天干的五行生克、阴阳关系推导；只列盘面依据，不据此断定现实吉凶。",
            "八字流月按 lunar-python 的流年流月序列展示十二个节气月，寅月为第一月；起止时刻取该库节气表，按中国标准时间显示，不等同于公历自然月或农历月。",
        ],
    }


def _branch_entries(owner: str, bazi: Mapping[str, Any]) -> list[dict[str, str]]:
    raw_branches = bazi.get("branches")
    if not isinstance(raw_branches, Mapping):
        raw_pillars = bazi.get("pillars")
        raw_branches = {}
        if isinstance(raw_pillars, Mapping):
            for position, pillar in raw_pillars.items():
                if pillar:
                    raw_branches[position] = str(pillar)[1:2]

    entries: list[dict[str, str]] = []
    for position in ("year", "month", "day", "hour"):
        branch = raw_branches.get(position) if isinstance(raw_branches, Mapping) else None
        if branch:
            entries.append({"owner": owner, "position": position, "branch": _normalise_branch(branch)})
    return entries


def _day_stem(bazi: Mapping[str, Any]) -> str:
    if bazi.get("day_stem"):
        return _normalise_stem(bazi["day_stem"])
    stems = bazi.get("stems")
    if isinstance(stems, Mapping) and stems.get("day"):
        return _normalise_stem(stems["day"])
    pillars = bazi.get("pillars")
    if isinstance(pillars, Mapping) and pillars.get("day"):
        return _normalise_stem(str(pillars["day"])[0])
    raise ValueError("bazi is missing the day stem")


def _relation_for_pair(first: str, second: str) -> str | None:
    pair = frozenset((first, second))
    if pair in SIX_CLASHES:
        return "六冲"
    if pair in SIX_HARMS:
        return "六害"
    if pair in SIX_COMBINES:
        return "六合"
    if pair == NO_COURTESY_PUNISHMENT:
        return "无礼之刑"
    return None


def _scope_for_entries(entries: list[dict[str, str]]) -> str:
    owners = {entry["owner"] for entry in entries}
    if owners == {"user", "target"}:
        return "cross"
    if owners == {"user"}:
        return "natal_user"
    if owners == {"target"}:
        return "natal_target"
    return "combined"


def _build_branch_relations(user_entries: list[dict[str, str]], target_entries: list[dict[str, str]]) -> list[dict[str, Any]]:
    entries = user_entries + target_entries
    relations: list[dict[str, Any]] = []

    for index, first in enumerate(entries):
        for second in entries[index + 1 :]:
            relation = _relation_for_pair(first["branch"], second["branch"])
            if relation:
                relations.append(
                    {
                        "type": "地支关系",
                        "name": relation,
                        "branches": first["branch"] + second["branch"],
                        "scope": _scope_for_entries([first, second]),
                        "positions": [
                            f"{first['owner']}.{first['position']}",
                            f"{second['owner']}.{second['position']}",
                        ],
                    }
                )

    for punishment_name, punishment_branches in PUNISHMENT_TRIADS.items():
        matching = [entry for entry in entries if entry["branch"] in punishment_branches]
        if punishment_branches.issubset({entry["branch"] for entry in matching}):
            relations.append(
                {
                    "type": "三刑",
                    "name": punishment_name,
                    "branches": "".join(sorted(punishment_branches, key=BRANCHES.index)),
                    "scope": _scope_for_entries(matching),
                    "positions": [f"{entry['owner']}.{entry['position']}" for entry in matching],
                }
            )

    branch_counts = Counter(entry["branch"] for entry in entries)
    for branch in SELF_PUNISHMENT_BRANCHES:
        if branch in branch_counts and branch_counts[branch] >= 2:
            matching = [entry for entry in entries if entry["branch"] == branch]
            relations.append(
                {
                    "type": "自刑",
                    "name": "自刑",
                    "branches": branch + branch,
                    "scope": _scope_for_entries(matching),
                    "positions": [f"{entry['owner']}.{entry['position']}" for entry in matching],
                }
            )

    return relations


def _natal_branch_relations(
    natal_branches: Mapping[str, str],
    period_branch: str,
    period_owner: str,
    period_position: str,
) -> list[dict[str, Any]]:
    natal_entries = [
        {"owner": "natal", "position": position, "branch": _normalise_branch(branch)}
        for position, branch in natal_branches.items()
    ]
    period_entry = {
        "owner": period_owner,
        "position": period_position,
        "branch": _normalise_branch(period_branch),
    }
    relations = _build_branch_relations(natal_entries, [period_entry])
    return [
        {
            "name": relation["name"],
            "branches": relation["branches"],
            "positions": relation["positions"],
        }
        for relation in relations
        if f"{period_owner}.{period_position}" in relation["positions"]
    ]


def _period_branch_relations(periods: list[tuple[str, str, str]]) -> list[dict[str, Any]]:
    entries = [
        {"owner": owner, "position": position, "branch": _normalise_branch(branch)}
        for owner, position, branch in periods
    ]
    relations = _build_branch_relations([], entries)
    return [
        {
            "name": relation["name"],
            "branches": relation["branches"],
            "positions": relation["positions"],
        }
        for relation in relations
    ]


def _all_layer_branch_relations(
    natal_branches: Mapping[str, str],
    periods: list[tuple[str, str, str]],
) -> list[dict[str, Any]]:
    natal_entries = [
        {"owner": "natal", "position": position, "branch": _normalise_branch(branch)}
        for position, branch in natal_branches.items()
    ]
    period_entries = [
        {"owner": owner, "position": position, "branch": _normalise_branch(branch)}
        for owner, position, branch in periods
    ]
    return [
        {
            "name": relation["name"],
            "branches": relation["branches"],
            "positions": relation["positions"],
        }
        for relation in _build_branch_relations(natal_entries, period_entries)
    ]


def _clamp(value: float) -> int:
    return max(5, min(95, int(round(value))))


def analyze_interaction(user_bazi: Mapping[str, Any], target_bazi: Mapping[str, Any]) -> dict[str, Any]:
    """Score the interaction between two extracted BaZi feature records."""

    user = _mapping(user_bazi)
    target = _mapping(target_bazi)
    user_day_stem = _day_stem(user)
    target_day_stem = _day_stem(target)
    ten_god = calculate_ten_god(user_day_stem, target_day_stem)
    user_entries = _branch_entries("user", user)
    target_entries = _branch_entries("target", target)
    relations = _build_branch_relations(user_entries, target_entries)

    scores: dict[str, float] = {key: float(value) for key, value in DIMENSION_BASELINES.items()}
    modifiers_applied: list[dict[str, Any]] = []

    ten_god_modifier = TEN_GOD_MODIFIERS[ten_god]
    for dimension, delta in ten_god_modifier.items():
        scores[dimension] += delta
    modifiers_applied.append({"source": f"十神:{ten_god}", "weight": 1, "deltas": ten_god_modifier})

    for relation in relations:
        weight = 1.0 if relation["scope"] in {"cross", "combined"} else 0.35
        raw_modifier = RELATION_MODIFIERS[relation["name"]]
        weighted_modifier = {dimension: round(delta * weight, 2) for dimension, delta in raw_modifier.items()}
        for dimension, delta in weighted_modifier.items():
            scores[dimension] += delta
        modifiers_applied.append(
            {
                "source": relation["name"],
                "scope": relation["scope"],
                "weight": weight,
                "deltas": weighted_modifier,
            }
        )

    dimensions = {dimension: _clamp(value) for dimension, value in scores.items()}
    risk_pressure = (
        dimensions["friction"] * 0.45
        + dimensions["drain_rate"] * 0.35
        + (100 - dimensions["trust_cap"]) * 0.20
        - dimensions["synergy"] * 0.08
    )
    if risk_pressure >= 56 or (
        dimensions["friction"] >= 78 and dimensions["drain_rate"] >= 55
    ):
        risk_level = "RED"
    elif risk_pressure >= 37:
        risk_level = "YELLOW"
    else:
        risk_level = "GREEN"

    relation_counts = dict(Counter(relation["name"] for relation in relations))
    risk_reasons: list[str] = []
    if dimensions["friction"] >= 60:
        risk_reasons.append("意见表达或边界管理容易形成高摩擦")
    if dimensions["drain_rate"] >= 55:
        risk_reasons.append("关系中的情绪与注意力消耗偏高")
    if dimensions["trust_cap"] < 45:
        risk_reasons.append("信任建立需要更多可验证的承诺")
    if any(name in relation_counts for name in ("六冲", "六害", "无恩之刑", "无礼之刑", "自刑")):
        risk_reasons.append("存在需要优先设置边界的地支冲害或刑象")
    if not risk_reasons:
        risk_reasons.append("当前组合没有明显的高压信号，适合通过稳定互动积累信任")

    return {
        "ten_god": ten_god,
        "day_stems": {"user": user_day_stem, "target": target_day_stem},
        "dimensions": dimensions,
        "risk_level": risk_level,
        "risk_pressure": round(risk_pressure, 2),
        "branch_relations": relations,
        "relation_counts": relation_counts,
        "risk_reasons": risk_reasons,
        "modifiers_applied": modifiers_applied,
    }


def _candidate_label(hour: int, branch: str, unknown: bool) -> str:
    if unknown:
        return next(label for candidate_hour, candidate_branch, label in HOUR_SCENARIOS if candidate_hour == hour and candidate_branch == branch)
    qualifier = "· 23:00跨日段" if hour == 23 else "· 00:00段" if hour == 0 else ""
    return f"{hour:02d}:00（{branch}时{qualifier}）"


def analyze_time_scenarios(
    user_birth: Mapping[str, Any],
    target_birth: Mapping[str, Any],
) -> dict[str, Any] | None:
    """Compare the most and least favorable hour assumptions for this pair.

    The extrema are relative to the engine's transparent heuristic risk_pressure,
    not probabilities or predictions. When both hours are unknown, all 13 x 13
    representative instants are evaluated; the duplicated Zi branch represents
    its two sides of the 23:00 day boundary.
    """

    user_hour = user_birth.get("hour")
    target_hour = target_birth.get("hour")
    user_unknown = user_hour is None
    target_unknown = target_hour is None
    if not user_unknown and not target_unknown:
        return None

    def options(birth: Mapping[str, Any], unknown: bool) -> list[tuple[int, str, str]]:
        if unknown:
            return list(HOUR_SCENARIOS)
        hour = int(birth["hour"])
        branch_index = ((hour + 1) // 2) % 12
        branch = BRANCHES[branch_index]
        return [(hour, branch, _candidate_label(hour, branch, False))]

    user_options = options(user_birth, user_unknown)
    target_options = options(target_birth, target_unknown)
    target_charts = [
        (hour, branch, label, extract_bazi_features(**{**target_birth, "hour": hour}))
        for hour, branch, label in target_options
    ]
    evaluated: list[dict[str, Any]] = []

    for user_candidate, user_branch, user_label in user_options:
        scenario_user_birth = {**user_birth, "hour": user_candidate}
        user_bazi = extract_bazi_features(**scenario_user_birth)
        for target_candidate, target_branch, target_label, target_bazi in target_charts:
            interaction = analyze_interaction(user_bazi, target_bazi)
            evaluated.append(
                {
                    "label": f"我方：{user_label} · 对方：{target_label}",
                    "assumed_hours": {"user": user_candidate, "target": target_candidate},
                    "assumed_branches": {"user": user_branch, "target": target_branch},
                    "user_bazi": user_bazi,
                    "target_bazi": target_bazi,
                    "interaction": interaction,
                }
            )

    evaluated.sort(key=lambda item: item["interaction"]["risk_pressure"])
    if target_unknown and user_unknown:
        mode = "both_unknown"
    elif target_unknown:
        mode = "target_unknown"
    else:
        mode = "user_unknown"

    warning_counts = Counter(
        warning
        for item in evaluated
        for warning in item["interaction"]["risk_reasons"]
    )
    compact_scenarios = [
        {
            "label": item["label"],
            "assumed_hours": item["assumed_hours"],
            "assumed_branches": item["assumed_branches"],
            "risk_level": item["interaction"]["risk_level"],
            "risk_pressure": item["interaction"]["risk_pressure"],
            "dimensions": item["interaction"]["dimensions"],
            "risk_reasons": item["interaction"]["risk_reasons"],
            "branch_relations": [
                {"name": relation["name"], "branches": relation["branches"]}
                for relation in item["interaction"]["branch_relations"]
            ],
        }
        for item in evaluated
    ]

    return {
        "mode": mode,
        "candidate_count": len(evaluated),
        "hour_branch_count": 12,
        "day_boundary_note": "子时横跨 23:00 换日边界；未知时辰时，23:00–00:00 与 00:00–01:00 分别计算。若生日处于节气交接当天，交接小时内的具体分钟仍可能改变年、月柱。",
        "ranking_method": "从每个时辰的代表整点中，按本产品五维启发式风险压力排序；两端仅是已抽取情境内的相对结果，不覆盖节气交接小时的全部分钟。",
        "best_case": evaluated[0],
        "worst_case": evaluated[-1],
        "extremes_are_distinct": evaluated[0]["label"] != evaluated[-1]["label"],
        "all_scenarios": compact_scenarios,
        "common_warnings": [
            {"text": warning, "count": count}
            for warning, count in warning_counts.most_common()
            if count == len(evaluated)
        ],
        "time_sensitive_warnings": [
            {"text": warning, "count": count}
            for warning, count in warning_counts.most_common()
            if count < len(evaluated)
        ],
    }


def calculate_twelve_ci(year: int, month: int, day: int, hour: int | None = None) -> dict[str, Any]:
    """Map a Gregorian date to the product's disclosed seasonal twelve-ci game.

    This deliberately does not present the mapping as a historical personality
    system: historical twelve-ci are celestial divisions, while the birthday
    interpretation and compatibility prompts are modern editorial content.
    """
    try:
        birth_day = datetime(int(year), int(month), int(day))
    except (TypeError, ValueError) as exc:
        raise ValueError("year, month and day must form a valid Gregorian date") from exc
    if hour is not None and (not isinstance(hour, int) or not 0 <= hour <= 23):
        raise ValueError("hour must be an integer from 0 to 23, or None")

    try:
        from lunar_python import Solar
    except ImportError as exc:  # pragma: no cover - exercised when deps are absent
        raise RuntimeError("lunar-python is required; install backend/requirements.txt first") from exc

    terms = {term: (identifier, name, branch) for term, identifier, name, branch in TWELVE_CI_BOUNDARIES}
    boundaries_by_time: dict[datetime, str] = {}
    for solar_year in range(birth_day.year - 1, birth_day.year + 2):
        try:
            table = Solar.fromYmdHms(solar_year, 7, 1, 12, 0, 0).getLunar().getJieQiTable()
        except (ValueError, RuntimeError) as exc:
            raise ValueError("birth date is outside the supported solar-term calculation range") from exc
        for key, solar in table.items():
            term = _JIEQI_KEY_ALIASES.get(str(key), str(key))
            if term not in terms:
                continue
            try:
                boundary_at = datetime.strptime(solar.toYmdHms(), "%Y-%m-%d %H:%M:%S")
            except (AttributeError, ValueError) as exc:
                raise RuntimeError("lunar-python returned an invalid solar-term timestamp") from exc
            boundaries_by_time[boundary_at] = term

    boundaries = sorted((instant, term) for instant, term in boundaries_by_time.items())
    if len(boundaries) < 3:
        raise RuntimeError("could not load enough solar-term boundaries for this date")

    day_start = birth_day
    day_end = day_start + timedelta(days=1)
    reference = day_start.replace(hour=hour or 0) if hour is not None else day_start

    def interval_index(instant: datetime) -> int:
        matches = [index for index, (at, _) in enumerate(boundaries) if at <= instant]
        if not matches or matches[-1] >= len(boundaries) - 1:
            raise RuntimeError("could not determine the twelve-ci seasonal interval")
        return matches[-1]

    indexes = [interval_index(reference)]
    if hour is None:
        indexes.extend(
            index
            for index, (at, _) in enumerate(boundaries)
            if day_start < at < day_end
        )
    else:
        # The UI accepts an hour but not a minute. If a solar-term transition
        # occurs during that hour, the exact interval is unknowable; include
        # the interval after the transition instead of silently choosing :00.
        hour_start = day_start.replace(hour=hour)
        hour_end = hour_start + timedelta(hours=1)
        indexes.extend(
            interval_index(at)
            for at, _ in boundaries
            if hour_start < at < hour_end
        )
    indexes = list(dict.fromkeys(indexes))

    candidates: list[dict[str, str]] = []
    for index in indexes:
        start_at, start_term = boundaries[index]
        end_at, end_term = boundaries[index + 1]
        identifier, name, branch = terms[start_term]
        candidates.append({
            "id": identifier,
            "name": name,
            "earthly_branch": branch,
            "start_term": start_term,
            "end_term": end_term,
            "start_at": start_at.strftime("%Y-%m-%d %H:%M:%S"),
            "end_at": end_at.strftime("%Y-%m-%d %H:%M:%S"),
        })

    boundary_note = None
    if len(candidates) > 1:
        boundary_note = (
            "所填出生小时内跨越节气边界，但未提供分钟，故同时列出边界前后两种可能；这不是优劣排序。"
            if hour is not None
            else "生日当天跨越节气边界且未提供出生时刻，故同时列出边界前后两种可能；这不是优劣排序。"
        )

    return {
        "has_hour": hour is not None,
        "timezone": "中国标准时间 UTC+08:00",
        "candidates": candidates,
        "boundary_note": boundary_note,
        "method_note": (
            "本产品以选定节气时刻制作现代生日体验映射。历史十二次是天文分区，"
            "其与节气的对应随年代变化；生日性格与双人配对内容为原创趣味解读，非古籍结论。"
        ),
    }
