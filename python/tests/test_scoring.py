import json

import pytest

from ephem.kernels import REPO_ROOT
from export.scoring import evaluate_site

GOLDEN = json.loads((REPO_ROOT / "contracts" / "fixtures" / "golden-score.json").read_text())


@pytest.mark.parametrize("case", GOLDEN["cases"], ids=lambda c: c["name"])
def test_golden_score(case):
    ev = evaluate_site(case["metrics"], GOLDEN["config"], case.get("pending", []))
    assert ev["valid"] == case["expected"]["valid"]
    assert ev["score"] == case["expected"]["score"]
    for c in ev["checks"]:
        if c.get("pending"):
            assert c["value"] is None and c["margin"] is None and c["ok"]
