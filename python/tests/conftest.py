from __future__ import annotations

import pytest

from ephem.kernels import have_kernels, kernels_dir


@pytest.fixture(scope="session")
def kernels():
    """Load the SPICE kernels, or skip the test when ``data_raw/kernels`` is missing (e.g. CI)."""
    if not have_kernels():
        pytest.skip(f"SPICE kernels not found in {kernels_dir()} (run: python -m ephem.kernels)")
    from ephem.kernels import furnsh_all

    furnsh_all()
    return kernels_dir()
