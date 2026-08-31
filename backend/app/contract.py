"""JSON v1 通信契约校验。

只校验网页当前使用的公共字段。XAFS/XRD 专属字段放在
``technique_payload`` 中原样保存，服务不猜测其物理含义。
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

TECHNIQUES = {"xafs", "xrd"}
SAMPLE_STATES = {"queued", "running", "completed", "failed"}
TREND_RANGES = ("today", "week", "month")


class ContractError(ValueError):
    """请求 JSON 不符合 v1 契约。"""


def _object(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ContractError(f"{field} 必须是 JSON object")
    return value


def _array(value: Any, field: str, maximum: int) -> list[Any]:
    if not isinstance(value, list):
        raise ContractError(f"{field} 必须是 JSON array")
    if len(value) > maximum:
        raise ContractError(f"{field} 最多允许 {maximum} 项")
    return value


def _text(value: Any, field: str, *, allow_empty: bool = False, maximum: int = 200) -> str:
    if not isinstance(value, str) or (not allow_empty and not value.strip()):
        raise ContractError(f"{field} 必须是非空字符串")
    if len(value) > maximum:
        raise ContractError(f"{field} 最长 {maximum} 个字符")
    return value


def _number(value: Any, field: str, minimum: float = 0, maximum: float | None = None) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ContractError(f"{field} 必须是数字")
    if value < minimum or (maximum is not None and value > maximum):
        raise ContractError(f"{field} 超出允许范围")
    return value


def _iso_time(value: Any, field: str) -> str:
    text = _text(value, field, maximum=64)
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ContractError(f"{field} 必须是 ISO 8601 时间") from exc
    if parsed.tzinfo is None:
        raise ContractError(f"{field} 必须包含时区，例如 +08:00 或 Z")
    return text


def _sample(item: Any, technique: str, index: int) -> dict[str, Any]:
    value = _object(item, f"records[{index}]")
    state = _text(value.get("state"), f"records[{index}].state", maximum=20)
    if state not in SAMPLE_STATES:
        raise ContractError(f"records[{index}].state 仅支持 {sorted(SAMPLE_STATES)}")
    if _text(value.get("technique"), f"records[{index}].technique", maximum=8).lower() != technique:
        raise ContractError(f"records[{index}].technique 必须与路径中的 {technique} 一致")
    progress = value.get("progress")
    return {
        "id": _text(value.get("id"), f"records[{index}].id", maximum=80),
        "name": _text(value.get("name"), f"records[{index}].name", maximum=160),
        "applicant": _text(value.get("applicant", "—"), f"records[{index}].applicant", allow_empty=True, maximum=80),
        "group": _text(value.get("group", "—"), f"records[{index}].group", allow_empty=True, maximum=120),
        "technique": technique,
        "instrument": _text(value.get("instrument"), f"records[{index}].instrument", maximum=80),
        "state": state,
        "startedAt": _text(value.get("startedAt", "—"), f"records[{index}].startedAt", allow_empty=True, maximum=40),
        "duration": _text(value.get("duration", "—"), f"records[{index}].duration", allow_empty=True, maximum=40),
        **({"progress": _number(progress, f"records[{index}].progress", 0, 100)} if progress is not None else {}),
        **({"measuredAt": _text(value["measuredAt"], f"records[{index}].measuredAt", allow_empty=True, maximum=40)} if value.get("measuredAt") is not None else {}),
        "tags": [_text(tag, f"records[{index}].tags", maximum=60) for tag in _array(value.get("tags", []), f"records[{index}].tags", 20)],
    }


def _queue_item(item: Any, technique: str, index: int) -> dict[str, Any]:
    value = _object(item, f"queue[{index}]")
    if _text(value.get("technique"), f"queue[{index}].technique", maximum=8).lower() != technique:
        raise ContractError(f"queue[{index}].technique 必须与路径中的 {technique} 一致")
    position = _number(value.get("position"), f"queue[{index}].position", 1)
    if not isinstance(position, int):
        raise ContractError(f"queue[{index}].position 必须是整数")
    return {
        "position": position,
        "sampleId": _text(value.get("sampleId"), f"queue[{index}].sampleId", maximum=80),
        "sampleName": _text(value.get("sampleName"), f"queue[{index}].sampleName", maximum=160),
        "technique": technique,
        "scheduledAt": _text(value.get("scheduledAt", "—"), f"queue[{index}].scheduledAt", allow_empty=True, maximum=40),
        "estimate": _text(value.get("estimate", "—"), f"queue[{index}].estimate", allow_empty=True, maximum=40),
    }


def validate_snapshot(payload: Any, technique: str) -> dict[str, Any]:
    """校验并规范化一帧完整看板数据。"""
    if technique not in TECHNIQUES:
        raise ContractError("technique 仅支持 xafs 或 xrd")
    value = _object(payload, "request body")
    if value.get("schema_version") != 1:
        raise ContractError("schema_version 当前必须为 1")
    if _text(value.get("technique"), "technique", maximum=8).lower() != technique:
        raise ContractError(f"JSON technique 与路径 {technique} 不一致")

    instrument = _object(value.get("instrument"), "instrument")
    connection = _text(instrument.get("connection"), "instrument.connection", maximum=16).lower()
    if connection not in {"online", "offline"}:
        raise ContractError("instrument.connection 仅支持 online 或 offline")
    progress = _number(instrument.get("scanProgress"), "instrument.scanProgress", 0, 100)
    total_points = _number(instrument.get("totalPoints"), "instrument.totalPoints", 0)
    scanned_points = _number(instrument.get("scannedPoints"), "instrument.scannedPoints", 0)
    if not isinstance(total_points, int) or not isinstance(scanned_points, int):
        raise ContractError("instrument.totalPoints 和 scannedPoints 必须是整数")
    if total_points and scanned_points > total_points:
        raise ContractError("instrument.scannedPoints 不能大于 totalPoints")

    trends = _object(value.get("trends"), "trends")
    normalized_trends: dict[str, list[float]] = {}
    for range_name in TREND_RANGES:
        numbers = _array(trends.get(range_name), f"trends.{range_name}", 120)
        if not numbers:
            raise ContractError(f"trends.{range_name} 至少需要一个数值")
        normalized_trends[range_name] = [_number(number, f"trends.{range_name}[{i}]") for i, number in enumerate(numbers)]

    active_sample_id = instrument.get("activeSampleId")
    technique_payload = _object(value.get("technique_payload", {}), "technique_payload")
    return {
        "schema_version": 1,
        "technique": technique,
        "source_instance_id": _text(value.get("source_instance_id"), "source_instance_id", maximum=100),
        "source_event_id": _text(value.get("source_event_id"), "source_event_id", maximum=160),
        "observed_at": _iso_time(value.get("observed_at"), "observed_at"),
        "instrument": {
            "id": _text(instrument.get("id"), "instrument.id", maximum=80),
            "name": _text(instrument.get("name"), "instrument.name", maximum=100),
            "technique": technique,
            "connection": connection,
            **({"activeSampleId": _text(active_sample_id, "instrument.activeSampleId", maximum=80)} if active_sample_id else {}),
            "currentValue": _text(instrument.get("currentValue", "—"), "instrument.currentValue", allow_empty=True, maximum=80),
            "scanProgress": progress,
            "totalPoints": total_points,
            "scannedPoints": scanned_points,
            "remaining": _text(instrument.get("remaining", "—"), "instrument.remaining", allow_empty=True, maximum=40),
        },
        "records": [_sample(item, technique, i) for i, item in enumerate(_array(value.get("records", []), "records", 200))],
        "queue": [_queue_item(item, technique, i) for i, item in enumerate(_array(value.get("queue", []), "queue", 100))],
        "trends": normalized_trends,
        "technique_payload": technique_payload,
    }


def validate_heartbeat(payload: Any, technique: str) -> dict[str, str | int]:
    """校验心跳；心跳只续期连接，不改写上一帧业务数据。"""
    value = _object(payload, "request body")
    if value.get("schema_version") != 1:
        raise ContractError("schema_version 当前必须为 1")
    if _text(value.get("technique"), "technique", maximum=8).lower() != technique:
        raise ContractError(f"JSON technique 与路径 {technique} 不一致")
    return {
        "schema_version": 1,
        "technique": technique,
        "source_instance_id": _text(value.get("source_instance_id"), "source_instance_id", maximum=100),
        "source_event_id": _text(value.get("source_event_id"), "source_event_id", maximum=160),
        "observed_at": _iso_time(value.get("observed_at"), "observed_at"),
    }
