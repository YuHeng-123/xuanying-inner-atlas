"""Transparent, rule-based traditional chart readings; not predictive evidence."""

from __future__ import annotations

from collections import Counter
from typing import Any, Mapping

try:
    from .quant_engine import BRANCH_ELEMENTS, STEM_ELEMENTS, STEM_YIN_YANG, calculate_ten_god
except ImportError:  # pragma: no cover
    from quant_engine import BRANCH_ELEMENTS, STEM_ELEMENTS, STEM_YIN_YANG, calculate_ten_god


ELEMENT_NOTE = {
    "木": "传统取象常联系生发与条理；可借此检查计划是否留有调整空间。",
    "火": "传统取象常联系表达与外显；可借此检查沟通是否清楚、是否留有倾听空间。",
    "土": "传统取象常联系承载与稳定；可借此检查承诺、边界与资源安排。",
    "金": "传统取象常联系规则与取舍；可借此检查标准是否清晰且允许复核。",
    "水": "传统取象常联系流动与思考；可借此检查信息是否充分、行动是否及时。",
}

TEN_GOD_NOTE = {
    "比肩": "同类同阴阳：传统十神中的同辈、自主取象。",
    "劫财": "同类异阴阳：传统十神中的同辈、资源竞争取象。",
    "食神": "我生同阴阳：传统十神中的输出、表达取象。",
    "伤官": "我生异阴阳：传统十神中的表达、挑战规则取象。",
    "偏财": "我克同阴阳：传统十神中的资源调度取象。",
    "正财": "我克异阴阳：传统十神中的资源管理取象。",
    "七杀": "克我同阴阳：传统十神中的压力、约束取象。",
    "正官": "克我异阴阳：传统十神中的规则、责任取象。",
    "偏印": "生我同阴阳：传统十神中的学习、支持取象。",
    "正印": "生我异阴阳：传统十神中的支持、积累取象。",
}

POSITION_NOTE = {
    "year": "年柱常用于观察早期环境与外部背景，不单独定义人格。",
    "month": "月柱反映节令与月令，是传统八字判断旺衰的重要上下文；这里不据此断定强弱。",
    "day": "日干称日主；日支是日柱的地支。两者是这份基础解读的中心。",
    "hour": "时柱依赖准确出生时刻；传统解读常将其作为后续发展和表达方式的参考。",
}

SUPPORTING_TEN_GODS = frozenset(("比肩", "劫财", "正印", "偏印"))


def _strength_evidence(
    positions: list[dict[str, Any]],
    month_main_god: str | None,
    same_element_branches: list[str],
    has_hour: bool,
    minute_sensitive: bool,
) -> dict[str, Any]:
    """Disclose a conservative three-signal screening rule, not a final 旺衰论断."""
    other_stems = [item for item in positions if item["position"] != "day"]
    supporting = [f"{item['label']}{item['pillar'][0]}·{item['ten_god']}" for item in other_stems if item["ten_god"] in SUPPORTING_TEN_GODS]
    draining = [f"{item['label']}{item['pillar'][0]}·{item['ten_god']}" for item in other_stems if item["ten_god"] not in SUPPORTING_TEN_GODS]
    month_supports = month_main_god in SUPPORTING_TEN_GODS

    if minute_sensitive:
        status, label = "BOUNDARY_UNCERTAIN", "节气交接小时，需准确分钟"
        review_direction = "输入仅精确到整点；交节前后年、月柱可能不同，暂不判强弱倾向。"
    elif not has_hour:
        status, label = "INCOMPLETE", "时辰未明，暂不判强弱倾向"
        review_direction = "先查看各假设时辰下年、月、日柱是否一致，再核对时柱。"
    elif month_supports and same_element_branches and len(supporting) > len(draining):
        status, label = "SUPPORTIVE", "扶身线索同向（偏旺初筛）"
        review_direction = "扶抑角度可进一步核对食伤、财、官杀；这不是已选定的喜用神。"
    elif not month_supports and not same_element_branches and len(draining) > len(supporting):
        status, label = "STRAINED", "耗制线索同向（偏弱初筛）"
        review_direction = "扶抑角度可进一步核对印、比劫；这不是已选定的喜用神。"
    else:
        status, label = "MIXED", "扶身与耗制线索交错"
        review_direction = "现有三项线索未同向，不生成扶抑方向候选。"

    return {
        "status": status,
        "label": label,
        "month_main_direction": "扶身" if month_supports else "耗泄或克制" if month_main_god else "未知",
        "same_element_branches": same_element_branches,
        "supporting_visible_stems": supporting,
        "draining_visible_stems": draining,
        "review_direction": review_direction,
        "rule_note": "本产品初筛规则：月令主藏干方向、已知地支是否见日主同五行、其他可见天干的扶身与耗制数量三项同向时才提示倾向。三项等权是产品约定，不是古籍给出的分数；未处理合冲后的根气变化、格局成败与调候，故不直接判定喜用神。",
    }


def read_bazi(features: Mapping[str, Any]) -> dict[str, Any]:
    """Explain exactly which visible chart features support each reading line."""
    pillars = features["pillars"]
    day_stem = features["day_stem"]
    element = STEM_ELEMENTS[day_stem]
    counts = Counter({key: 0 for key in ("木", "火", "土", "金", "水")})
    positions: list[dict[str, Any]] = []
    hidden_details: list[dict[str, Any]] = []
    same_element_branches: list[str] = []
    hidden_by_position = features.get("hidden_stems", {})
    for key, label in (("year", "年柱"), ("month", "月柱"), ("day", "日柱"), ("hour", "时柱")):
        pillar = pillars.get(key)
        if not pillar:
            continue
        stem, branch = pillar[0], pillar[1]
        counts[STEM_ELEMENTS[stem]] += 1
        counts[BRANCH_ELEMENTS[branch]] += 1
        god = "日主" if key == "day" else calculate_ten_god(day_stem, stem)
        positions.append({
            "position": key,
            "label": label,
            "pillar": pillar,
            "stem_element": STEM_ELEMENTS[stem],
            "branch_element": BRANCH_ELEMENTS[branch],
            "ten_god": god,
            "explanation": POSITION_NOTE[key] + ("" if key == "day" else f"天干 {stem} 相对日主 {day_stem} 为{god}：{TEN_GOD_NOTE[god]}"),
        })
        hidden = list(hidden_by_position.get(key) or [])
        if any(STEM_ELEMENTS[item] == element for item in hidden):
            same_element_branches.append(f"{label}{branch}")
        hidden_details.append({
            "position": key,
            "label": label,
            "branch": branch,
            "stems": [
                {"stem": item, "element": STEM_ELEMENTS[item], "ten_god": calculate_ten_god(day_stem, item)}
                for item in hidden
            ],
        })
    ordered = sorted(counts.items(), key=lambda item: (-item[1], "木火土金水".index(item[0])))
    frequent = [name for name, count in ordered if count == ordered[0][1]]
    month_hidden = hidden_by_position.get("month") or []
    month_main = month_hidden[0] if month_hidden else None
    month_main_god = calculate_ten_god(day_stem, month_main) if month_main else None
    minute_boundary_terms = features.get("minute_boundary_terms") or []
    minute_sensitive_note = (
        "、".join(f"{item['term']}于{item['at']}交接" for item in minute_boundary_terms)
        + "；当前盘以该小时的整点为基准。若实际出生在交接之后，年柱或月柱可能不同，请核实准确分钟。"
        if minute_boundary_terms else None
    )
    month_exposed_stems = [
        {"stem": stem, "positions": [item["label"] for item in positions if item["position"] != "day" and item["pillar"][0] == stem]}
        for stem in month_hidden
    ]
    return {
        "day_master": day_stem,
        "day_master_element": element,
        "day_master_yin_yang": STEM_YIN_YANG[day_stem],
        "day_master_note": f"{day_stem}属{STEM_YIN_YANG[day_stem]}{element}。{ELEMENT_NOTE[element]}",
        "positions": positions,
        "hidden_stems": hidden_details,
        "seasonal_context": {
            "month_branch": pillars["month"][1],
            "main_hidden_stem": month_main,
            "main_hidden_element": STEM_ELEMENTS[month_main] if month_main else None,
            "main_hidden_ten_god": month_main_god,
            "exposed_stems": month_exposed_stems,
            "same_element_branches": same_element_branches,
            "note": (
                f"月支为{pillars['month'][1]}，主藏干为{month_main}（{STEM_ELEMENTS[month_main]}，相对日主为{calculate_ten_god(day_stem, month_main)}）。"
                if month_main else f"月支为{pillars['month'][1]}。"
            ) + (f"已知地支藏干中，{ '、'.join(same_element_branches) }见与日主同五行。" if same_element_branches else "已知地支藏干中未见与日主同五行。")
            + "这是月令与同类藏干线索，未据此判定身强弱或喜用神。",
        },
        "strength_evidence": _strength_evidence(positions, month_main_god, same_element_branches, bool(features["has_hour"]), bool(minute_boundary_terms)),
        "visible_element_counts": dict(counts),
        "element_note": f"仅统计已知柱的显性天干和地支五行；出现次数最多的是{'、'.join(frequent)}。藏干另列，不与可见计数混算；不能据此断定五行缺失或命格强弱。",
        "has_hour": bool(features["has_hour"]),
        "minute_sensitive_note": minute_sensitive_note,
        "uncertainty_note": (minute_sensitive_note or "已使用填写的整点时刻；若生于时辰或节气交界附近，实际分钟会影响排盘。" if features["has_hour"] else "出生时刻未知：当前年、月、日柱按 00:00 作展示基准，并非全部确定；23:00 可能换日，节气交接当天还可能换年或换月。"),
        "method_note": "公历输入，按立春换年、节气换月、23:00换日和北京时间排盘。藏干采用 lunar-python 的地支藏干表，按库给出的顺序显示；强弱线索采用公开的三项产品初筛规则，不将其冒充古籍定论，也不直接指定喜用神。解释不是科学人格测试或命运预测。",
    }


def compare_bazi(first: Mapping[str, Any], second: Mapping[str, Any], interaction: Mapping[str, Any]) -> dict[str, Any]:
    """Keep the pair reading tied to observable chart relations, not a generic score."""
    relations = interaction.get("branch_relations", [])
    return {
        "ten_god": interaction["ten_god"],
        "ten_god_note": TEN_GOD_NOTE[interaction["ten_god"]],
        "day_master_pair": f"{first['day_stem']}（我） × {second['day_stem']}（对方）",
        "branch_evidence": [
            f"{entry.get('branches', '')} · {entry.get('name', entry.get('type', '地支关系'))}（{entry.get('scope', '跨盘')}）"
            for entry in relations[:12]
        ],
        "reading": (
            "两盘可见地支未触发本产品列出的合、冲、害、刑关系；不要据此推断现实关系必然平稳。"
            if not relations else
            "地支互动只能说明传统盘面中的对应关系；现实中的信任、冲突和利益仍应以实际行为核验。"
        ),
        "uncertainty_note": "若任何一方时辰未知，基准盘按 00:00 展示；23:00 和节气交接可能改变年、月、日柱。下方有利/不利时辰对照仅代表已抽取的情境假设，不代表真实出生时刻。",
    }
