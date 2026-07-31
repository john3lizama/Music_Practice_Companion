"""Outbound email.

Uses Resend's HTTP API when RESEND_API_KEY is configured; otherwise logs the
message so the flow is fully testable in dev without an email provider.
"""
import logging

import requests

from .config import settings

logger = logging.getLogger("email")

RESEND_URL = "https://api.resend.com/emails"


def send_email(to: str, subject: str, text: str) -> bool:
    """Send an email. Returns True if handed off to a provider."""
    if not settings.RESEND_API_KEY:
        # Dev fallback — never log secrets in prod; reset links are
        # short-lived and this path only runs when no provider is set.
        logger.info("EMAIL (no provider configured) to=%s subject=%r\n%s", to, subject, text)
        return False
    try:
        res = requests.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": settings.EMAIL_FROM,
                "to": [to],
                "subject": subject,
                "text": text,
            },
            timeout=10,
        )
        res.raise_for_status()
        return True
    except requests.RequestException:
        logger.exception("email send failed to=%s", to)
        return False
