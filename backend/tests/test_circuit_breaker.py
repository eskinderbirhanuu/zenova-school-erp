"""Tests for the CircuitBreaker utility."""
import time
from unittest.mock import MagicMock, patch
import pytest
from app.utils.circuit_breaker import CircuitBreaker, CircuitState, CircuitBreakerOpenError


class TestCircuitBreaker:
    def test_initial_state_closed(self):
        cb = CircuitBreaker("test", failure_threshold=3, recovery_timeout=60)
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0

    def test_sync_call_success(self):
        cb = CircuitBreaker("test", failure_threshold=3, recovery_timeout=60)
        result = cb.call(lambda: 42)
        assert result == 42
        assert cb.failure_count == 0
        assert cb.state == CircuitState.CLOSED

    def test_sync_call_opens_after_threshold(self):
        cb = CircuitBreaker("test", failure_threshold=3, recovery_timeout=60)
        fn = MagicMock(side_effect=ValueError("boom"))
        for _ in range(3):
            with pytest.raises(ValueError):
                cb.call(fn)
        assert cb.state == CircuitState.OPEN
        assert cb.failure_count == 3

    def test_open_circuit_raises_immediately(self):
        cb = CircuitBreaker("test", failure_threshold=1, recovery_timeout=60)
        fn = MagicMock(side_effect=ValueError("boom"))
        with pytest.raises(ValueError):
            cb.call(fn)
        assert cb.state == CircuitState.OPEN
        with pytest.raises(CircuitBreakerOpenError, match="Circuit breaker 'test' is OPEN"):
            cb.call(fn)

    def test_fallback_on_open(self):
        cb = CircuitBreaker("test", failure_threshold=1, recovery_timeout=60)
        fn = MagicMock(side_effect=ValueError("boom"))
        with pytest.raises(ValueError):
            cb.call(fn)
        result = cb.call(fn, fallback=lambda: "fallback_value")
        assert result == "fallback_value"

    def test_fallback_on_failure(self):
        cb = CircuitBreaker("test", failure_threshold=3, recovery_timeout=60)
        fn = MagicMock(side_effect=ValueError("boom"))
        result = cb.call(fn, fallback=lambda: "saved")
        assert result == "saved"
        assert cb.failure_count == 1
        assert cb.state == CircuitState.CLOSED

    @patch("time.monotonic")
    def test_half_open_after_recovery_timeout(self, mock_monotonic):
        cb = CircuitBreaker("test", failure_threshold=1, recovery_timeout=10)
        mock_monotonic.return_value = 100.0
        fn = MagicMock(side_effect=ValueError("boom"))
        with pytest.raises(ValueError):
            cb.call(fn)
        assert cb.state == CircuitState.OPEN
        mock_monotonic.return_value = 111.0
        result = cb.call(lambda: "recovered")
        assert result == "recovered"
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0

    @patch("time.monotonic")
    def test_half_open_failure_reopens(self, mock_monotonic):
        cb = CircuitBreaker("test", failure_threshold=1, recovery_timeout=10, half_open_max_retries=1)
        mock_monotonic.return_value = 100.0
        fn_good = MagicMock(side_effect=[ValueError("boom")])
        with pytest.raises(ValueError):
            cb.call(fn_good)
        assert cb.state == CircuitState.OPEN
        mock_monotonic.return_value = 111.0
        fn_still_bad = MagicMock(side_effect=ValueError("still broken"))
        with pytest.raises(ValueError):
            cb.call(fn_still_bad)
        assert cb.state == CircuitState.OPEN

    def test_async_call_success(self):
        cb = CircuitBreaker("async_test", failure_threshold=3, recovery_timeout=60)

        async def async_fn():
            return 42

        import asyncio
        result = asyncio.run(cb.call_async(async_fn))
        assert result == 42

    def test_async_call_opens_after_threshold(self):
        cb = CircuitBreaker("async_test2", failure_threshold=2, recovery_timeout=60)

        async def failing_fn():
            raise RuntimeError("async fail")

        import asyncio
        for _ in range(2):
            with pytest.raises(RuntimeError):
                asyncio.run(cb.call_async(failing_fn))
        assert cb.state == CircuitState.OPEN

    def test_configurable_thresholds(self):
        cb = CircuitBreaker("custom", failure_threshold=5, recovery_timeout=30, half_open_max_retries=3)
        assert cb.failure_threshold == 5
        assert cb.recovery_timeout == 30
        assert cb.half_open_max_retries == 3
