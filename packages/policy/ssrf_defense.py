import ipaddress
import socket
from urllib.parse import urlparse

FORBIDDEN_METADATA_IPS = {
    "169.254.169.254",  # AWS, GCP, Azure, OpenStack instance metadata
    "fd00:ec2::254",  # AWS IPv6 metadata
}


class SSRFViolationError(Exception):
    pass


def validate_outbound_url(url: str) -> str:
    """
    Non-negotiable Rule #8:
    Prevent SSRF in any URL-fetching connector. Reject private, loopback,
    link-local, cloud metadata, and reserved destinations.
    """
    if not url:
        raise SSRFViolationError("Empty URL provided.")

    parsed = urlparse(url.strip())

    # 1. Strict Scheme Allowlist
    if parsed.scheme.lower() not in ("http", "https"):
        raise SSRFViolationError(
            f"Prohibited URL scheme '{parsed.scheme}'. Only HTTP and HTTPS are permitted."
        )

    hostname = parsed.hostname
    if not hostname:
        raise SSRFViolationError("URL does not contain a valid hostname.")

    # 2. Check forbidden cloud metadata hostnames directly
    lower_host = hostname.lower()
    if (
        lower_host in ("instance-data", "metadata.google.internal")
        or lower_host in FORBIDDEN_METADATA_IPS
    ):
        raise SSRFViolationError(
            f"Destination hostname '{hostname}' is a prohibited cloud metadata service."
        )

    # 3. Resolve IP address and check IP range
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise SSRFViolationError(f"DNS resolution failed for hostname '{hostname}': {exc}") from exc

    for entry in addr_info:
        ip_str = entry[4][0]
        ip = ipaddress.ip_address(ip_str)

        # Check explicit metadata IP
        if ip_str in FORBIDDEN_METADATA_IPS:
            raise SSRFViolationError(
                f"Destination IP {ip_str} is a protected cloud metadata address."
            )

        # Check private, loopback, link-local, multicast, reserved
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
            raise SSRFViolationError(
                f"Destination IP {ip_str} belongs to a restricted/internal network boundary."
            )

    return url
