"""Rate limiting en memoria (MVP monolito)."""
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status

_buckets: dict[str, list[datetime]] = defaultdict(list)


def check_rate_limit(key: str, *, max_calls: int, window_seconds: int) -> None:
    now = datetime.now(UTC)
    window_start = now - timedelta(seconds=window_seconds)
    hits = [t for t in _buckets[key] if t > window_start]
    if len(hits) >= max_calls:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas solicitudes. Intente más tarde.",
        )
    hits.append(now)
    _buckets[key] = hits