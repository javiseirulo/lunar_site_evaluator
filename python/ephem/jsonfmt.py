"""JSON writer whose output is already in Prettier's style (``prettier --check .`` runs in CI).

Rules matching Prettier's JSON printer for the data we write: objects always expanded (one key per
line, 2-space indent); arrays of scalars inline when the line fits in ``width`` columns, otherwise
one element per line; arrays of objects one per line; no trailing commas. Numbers use Python's
shortest round-trip ``repr`` (full float64 precision).
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

WIDTH = 100


def _scalar(v: Any) -> str:
    if isinstance(v, float):
        if not math.isfinite(v):
            return "null"  # NaN/inf -> null, never a bare NaN
        if v == 0.0:
            return "0.0" if math.copysign(1.0, v) > 0 else "-0.0"
    return json.dumps(v, ensure_ascii=False, allow_nan=False)


def _is_scalar(v: Any) -> bool:
    return v is None or isinstance(v, str | int | float | bool)


def _fmt(v: Any, indent: int, used: int, trailing: int, width: int) -> str:
    """``used``: columns already on the line before ``v``; ``trailing``: chars after it (comma)."""
    if _is_scalar(v):
        return _scalar(v)
    pad = " " * (indent + 2)
    if isinstance(v, dict):
        if not v:
            return "{}"
        items = list(v.items())
        lines = []
        for i, (k, x) in enumerate(items):
            key = f"{json.dumps(str(k), ensure_ascii=False)}: "
            comma = 1 if i < len(items) - 1 else 0
            body = _fmt(x, indent + 2, indent + 2 + len(key), comma, width)
            lines.append(pad + key + body + ("," if comma else ""))
        return "{\n" + "\n".join(lines) + "\n" + " " * indent + "}"
    if isinstance(v, list | tuple):
        v = list(v)
        if not v:
            return "[]"
        if all(_is_scalar(x) for x in v):
            inline = "[" + ", ".join(_scalar(x) for x in v) + "]"
            if used + len(inline) + trailing <= width:
                return inline
        lines = []
        for i, x in enumerate(v):
            comma = 1 if i < len(v) - 1 else 0
            lines.append(
                pad + _fmt(x, indent + 2, indent + 2, comma, width) + ("," if comma else "")
            )
        return "[\n" + "\n".join(lines) + "\n" + " " * indent + "]"
    raise TypeError(f"cannot serialise {type(v).__name__}")


def dumps(obj: Any, width: int = WIDTH) -> str:
    """Serialise ``obj`` (dict/list/str/int/float/bool/None) in Prettier style, final newline."""
    return _fmt(obj, 0, 0, 0, width) + "\n"


def write(path: Path, obj: Any, width: int = WIDTH) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dumps(obj, width))
    return path
