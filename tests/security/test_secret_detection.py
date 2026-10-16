import os

from fixtures.synthetic_secrets import SYNTHETIC_SAFE_FIXTURES
from packages.policy.secret_scanner import scan_text_for_secrets


def test_scanner_detects_synthetic_secrets():
    """
    Acceptance Criteria:
    Verifies that the secret scanner detects synthetic test secrets
    using a safe fixture without false negatives.
    """
    # 1. Test AWS Key detection
    aws_matches = scan_text_for_secrets(SYNTHETIC_SAFE_FIXTURES["synthetic_aws_key"])
    assert len(aws_matches) > 0
    assert aws_matches[0]["secret_type"] == "AWS Access Key"

    # 2. Test GitHub PAT detection
    gh_matches = scan_text_for_secrets(SYNTHETIC_SAFE_FIXTURES["synthetic_github_pat"])
    assert len(gh_matches) > 0
    assert gh_matches[0]["secret_type"] == "GitHub Token"

    # 3. Test generic secret keyword detection
    gen_matches = scan_text_for_secrets(SYNTHETIC_SAFE_FIXTURES["synthetic_generic_secret"])
    assert len(gen_matches) > 0
    assert gen_matches[0]["secret_type"] == "Generic Secret Keyword"


def test_repository_clean_of_secrets():
    """
    Ensures that codebase source files (outside of test fixtures and .env.example)
    contain no hardcoded production secrets.
    """
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    target_dirs = ["apps", "packages", "workers"]

    for d in target_dirs:
        full_dir = os.path.join(root_dir, d)
        if not os.path.exists(full_dir):
            continue
        for root, _, files in os.walk(full_dir):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                        matches = scan_text_for_secrets(content)
                        assert len(matches) == 0, f"Potential secret found in {filepath}: {matches}"
