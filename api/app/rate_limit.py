"""Minimal in-memory sliding-window rate limiter.

Good enough for a single-process deployment (uvicorn on one box). If you scale
to multiple workers/instances, swap for Redis-backed limiting (e.g. slowapi).
"""
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self, max_calls: int, window_seconds: float):
        self.max_calls = max_calls
        self.window = window_seconds
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> None:
        """Raise 429 if `key` exceeded max_calls within the window."""
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.max_calls:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many attempts. Try again later.",
                )
            q.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


# 10 login attempts per minute per client IP.
login_limiter = RateLimiter(max_calls=10, window_seconds=60)


def limit_login(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    login_limiter.check(client_ip)
