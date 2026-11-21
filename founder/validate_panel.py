"""Validate the complete 100-agent panel, including fields panel.py does not check.

Read-only: prints a compact JSON verification record, never repairs buyer answers.
Run from the repository root with the reviewed local Python runtime.
"""
import hashlib
import json
import math
from collections import Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent
PANEL = BASE / "panel"
state = json.loads((PANEL / "panel.json").read_text(encoding="utf-8"))
personas = json.loads((PANEL / "personas.json").read_text(encoding="utf-8"))
errors = []
expected = {f"P{i:03}" for i in range(1, 101)}
actual = {p.stem for p in (PANEL / "answers").glob("*.json")}
brief_ids = {p.stem for p in (PANEL / "briefs").glob("*.md")}
if brief_ids != expected:
    errors.append("Expected exactly 100 buyer briefs")
for brief_id in sorted(brief_ids):
    brief = (PANEL / "briefs" / (brief_id + ".md")).read_text(encoding="utf-8")
    if state["pitch"] not in brief or state["customer"]["target"] not in brief:
        errors.append(brief_id + ": brief lacks common pitch or target")
if state["n"] != 100 or len(personas) != 100:
    errors.append("Panel size must be exactly 100")
if actual != expected:
    errors.append(f"Missing {sorted(expected-actual)}; unexpected {sorted(actual-expected)}")
if state["pitch"] != (BASE / "pitch.md").read_text(encoding="utf-8").strip():
    errors.append("Working pitch changed after the baseline was dealt")
if state["customer"] != json.loads((BASE / "customer.json").read_text(encoding="utf-8")):
    errors.append("Working customer profile changed after the baseline was dealt")
price_fields = ["price_too_cheap", "price_cheap", "price_expensive", "price_too_expensive"]
answers = []
for path in sorted((PANEL / "answers").glob("*.json")):
    try:
        a = json.loads(path.read_text(encoding="utf-8"))
        if a.get("id") != path.stem or not isinstance(a.get("buys"), bool):
            raise ValueError("wrong identity or buy flag")
        if a.get("reason_code") not in {"price", "habit", "need", "trust", "quality", "convenience", "timing", "values", "other"}:
            raise ValueError("invalid reason code")
        for field in ["reason", "objection", "would_change_my_mind"]:
            if not isinstance(a.get(field), str) or (field != "would_change_my_mind" and not a[field].strip()):
                raise ValueError("missing text field " + field)
        purchases = a.get("purchases_first_month")
        if type(purchases) is not int or purchases != int(a["buys"]):
            raise ValueError("subscription count must be 0 for no and 1 for yes")
        prices = [a[field] for field in price_fields]
        if any(type(v) not in (int, float) or not math.isfinite(v) or v < 0 for v in prices):
            raise ValueError("price must be a finite nonnegative number")
        if prices != sorted(prices):
            raise ValueError("price thresholds out of order")
        answers.append(a)
    except (ValueError, KeyError, TypeError) as exc:
        errors.append(path.stem + ": " + str(exc))
segments = dict(Counter(p["segment"] for p in personas))
if len(segments) != 4 or set(segments.values()) != {25}:
    errors.append("Expected four segments of 25 each")
record = {
    "valid": not errors,
    "expected": 100,
    "validated_answers": len(answers),
    "segments": segments,
    "seed": state["seed"],
    "pitch_sha256": hashlib.sha256(state["pitch"].encode()).hexdigest(),
    "customer_sha256": hashlib.sha256((BASE / "customer.json").read_bytes()).hexdigest(),
    "errors": errors,
}
print(json.dumps(record, ensure_ascii=False, indent=2))
raise SystemExit(0 if record["valid"] else 1)
