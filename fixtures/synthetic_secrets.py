"""
Safe synthetic test secrets used strictly for scanner verification.
None of these are real credentials.
"""

SYNTHETIC_SAFE_FIXTURES = {
    "synthetic_aws_key": "AKIAIOSFODNN7EXAMPLE",
    "synthetic_fake_jwt": (
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
        "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlN5bnRoZXRpYyBUZXN0In0."
        "synthetic_signature_sample_only"
    ),
    "synthetic_github_pat": "ghp_SyntheticTestToken00000000000000000000",
    "synthetic_generic_secret": "secret_key = 'super_secret_dummy_synthetic_value_12345'",
}
