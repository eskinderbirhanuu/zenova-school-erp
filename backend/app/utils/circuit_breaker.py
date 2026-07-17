import time
import asyncio
import threading
import logging
from enum import Enum
from functools import wraps
from typing import Callable, Optional, Any

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreakerOpenError(Exception):
    def __init__(self, name: str):
        self.breaker_name = name
        super().__init__(f"Circuit breaker '{name}' is OPEN — call rejected without attempting")


class CircuitBreaker:
    """Thread-safe circuit breaker for protecting external service calls.

    State machine: CLOSED -> OPEN -> HALF_OPEN -> CLOSED (or back to OPEN).

    Usage (sync):
        cb = CircuitBreaker("chapa", failure_threshold=5, recovery_timeout=30)
        result = cb.call(external_func, fallback=lambda: None)

    Usage (async):
        result = await cb.call_async(async_func, fallback=async_fallback)
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_retries: int = 1,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_retries = half_open_max_retries

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time = 0.0
        self._half_open_retries = 0
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        self._maybe_recover()
        return self._state

    @property
    def failure_count(self) -> int:
        return self._failure_count

    def reset(self) -> None:
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._half_open_retries = 0
            self._last_failure_time = 0.0

    def _maybe_recover(self) -> None:
        if self._state == CircuitState.OPEN:
            if time.monotonic() - self._last_failure_time >= self.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                self._half_open_retries = 0
                logger.info("Circuit breaker '%s' transitioning to HALF_OPEN", self.name)

    def _on_success(self) -> None:
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                logger.info("Circuit breaker '%s' recovered — closing", self.name)
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._half_open_retries = 0

    def _on_failure(self) -> None:
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.monotonic()
            if self._failure_count >= self.failure_threshold:
                logger.warning(
                    "Circuit breaker '%s' OPENING after %d failures",
                    self.name, self._failure_count,
                )
                self._state = CircuitState.OPEN

    def call(self, func: Callable[[], Any], fallback: Optional[Callable[[], Any]] = None) -> Any:
        with self._lock:
            self._maybe_recover()
            if self._state == CircuitState.OPEN:
                logger.warning("Circuit breaker '%s' is OPEN — fast-failing", self.name)
                if fallback is not None:
                    return fallback()
                raise CircuitBreakerOpenError(self.name)
            if self._state == CircuitState.HALF_OPEN:
                if self._half_open_retries >= self.half_open_max_retries:
                    logger.warning("Circuit breaker '%s' HALF_OPEN retries exhausted — fast-failing", self.name)
                    if fallback is not None:
                        return fallback()
                    raise CircuitBreakerOpenError(self.name)
                self._half_open_retries += 1
        try:
            result = func()
            self._on_success()
            return result
        except Exception as exc:
            logger.warning("Circuit breaker '%s' call failed: %s", self.name, exc)
            self._on_failure()
            if fallback is not None:
                return fallback()
            raise

    async def call_async(self, func: Callable[[], Any], fallback: Optional[Callable[[], Any]] = None) -> Any:
        with self._lock:
            self._maybe_recover()
            if self._state == CircuitState.OPEN:
                logger.warning("Circuit breaker '%s' is OPEN — fast-failing", self.name)
                if fallback is not None:
                    return fallback() if not asyncio.iscoroutinefunction(fallback) else await fallback()
                raise CircuitBreakerOpenError(self.name)
            if self._state == CircuitState.HALF_OPEN:
                if self._half_open_retries >= self.half_open_max_retries:
                    logger.warning("Circuit breaker '%s' HALF_OPEN retries exhausted — fast-failing", self.name)
                    if fallback is not None:
                        return fallback() if not asyncio.iscoroutinefunction(fallback) else await fallback()
                    raise CircuitBreakerOpenError(self.name)
                self._half_open_retries += 1
        try:
            result = await func() if asyncio.iscoroutinefunction(func) else func()
            self._on_success()
            return result
        except Exception as exc:
            logger.warning("Circuit breaker '%s' call failed: %s", self.name, exc)
            self._on_failure()
            if fallback is not None:
                return fallback() if not asyncio.iscoroutinefunction(fallback) else await fallback()
            raise
