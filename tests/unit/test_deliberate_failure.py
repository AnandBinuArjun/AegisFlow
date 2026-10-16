import os

import pytest


def test_deliberate_failure_toggle():
    """
    Acceptance Criteria:
    CI fails on a deliberately failing test when AEGIS_FAIL_TEST=1 is set.
    When unset, the test validates the failure trigger mechanism.
    """
    should_fail = os.getenv("AEGIS_FAIL_TEST", "0").lower() in ("1", "true", "yes")
    if should_fail:
        pytest.fail("DELIBERATE TEST FAILURE: Verification that CI fails when a test fails.")
    assert True
