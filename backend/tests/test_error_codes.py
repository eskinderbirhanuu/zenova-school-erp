"""Tests for the error code system — ErrorCode enum, exception classes, HTTP handler mapping."""
from fastapi import HTTPException, status
import pytest
from app.core.error_codes import ErrorCode
from app.core.exceptions import (
    AppException,
    NotFoundException,
    ConflictException,
    UnauthorizedException,
    ForbiddenException,
    BadRequestException,
    ValidationException,
    ServiceUnavailableException,
    TooManyRequestsException,
    RequestEntityTooLargeException,
    UnsupportedMediaTypeException,
)


class TestErrorCodeEnum:
    def test_auth_codes(self):
        assert ErrorCode.AUTH_INVALID_CREDENTIALS.value == "AUTH_001"
        assert ErrorCode.AUTH_TOKEN_EXPIRED.value == "AUTH_002"
        assert ErrorCode.AUTH_CSRF_INVALID.value == "AUTH_013"

    def test_permission_codes(self):
        assert ErrorCode.PERM_FORBIDDEN.value == "PERM_001"
        assert ErrorCode.PERM_INSUFFICIENT_ROLE.value == "PERM_003"

    def test_not_found_codes(self):
        assert ErrorCode.NOT_FOUND_GENERIC.value == "NF_001"
        assert ErrorCode.NOT_FOUND_USER.value == "NF_002"
        assert ErrorCode.NOT_FOUND_LICENSE.value == "NF_007"

    def test_conflict_codes(self):
        assert ErrorCode.CONFLICT_GENERIC.value == "CONF_001"
        assert ErrorCode.CONFLICT_DUPLICATE_EMAIL.value == "CONF_002"

    def test_validation_codes(self):
        assert ErrorCode.VALIDATION_GENERIC.value == "VAL_001"
        assert ErrorCode.VALIDATION_INVALID_EMAIL.value == "VAL_002"

    def test_rate_limit_codes(self):
        assert ErrorCode.RATE_LIMIT_EXCEEDED.value == "RL_001"
        assert ErrorCode.RATE_LIMIT_LOGIN.value == "RL_002"

    def test_service_codes(self):
        assert ErrorCode.SERVICE_UNAVAILABLE.value == "SRV_001"
        assert ErrorCode.SERVICE_CHAPA_DOWN.value == "SRV_002"

    def test_request_codes(self):
        assert ErrorCode.REQ_BAD_REQUEST.value == "REQ_001"
        assert ErrorCode.REQ_ENTITY_TOO_LARGE.value == "REQ_002"

    def test_internal_codes(self):
        assert ErrorCode.INTERNAL_SERVER_ERROR.value == "INT_001"
        assert ErrorCode.INTERNAL_ENCRYPTION_ERROR.value == "INT_003"

    def test_all_codes_are_unique(self):
        values = [e.value for e in ErrorCode]
        assert len(values) == len(set(values)), "Duplicate error code values detected"


class TestExceptionClasses:
    def test_app_exception_default_code(self):
        exc = AppException(detail="test error")
        assert exc.code == ErrorCode.INTERNAL_SERVER_ERROR
        assert exc.status_code == 500
        assert exc.detail == "test error"

    def test_app_exception_custom_code(self):
        exc = AppException(detail="custom", status_code=400, code=ErrorCode.REQ_BAD_REQUEST)
        assert exc.code == ErrorCode.REQ_BAD_REQUEST
        assert exc.status_code == 400

    def test_not_found_exception(self):
        exc = NotFoundException()
        assert exc.code == ErrorCode.NOT_FOUND_GENERIC
        assert exc.status_code == 404

    def test_not_found_custom(self):
        exc = NotFoundException(detail="Student not found", code=ErrorCode.NOT_FOUND_STUDENT)
        assert exc.code == ErrorCode.NOT_FOUND_STUDENT
        assert exc.status_code == 404
        assert exc.detail == "Student not found"

    def test_conflict_exception(self):
        exc = ConflictException()
        assert exc.code == ErrorCode.CONFLICT_GENERIC
        assert exc.status_code == 409

    def test_conflict_custom(self):
        exc = ConflictException(detail="Email already registered", code=ErrorCode.CONFLICT_DUPLICATE_EMAIL)
        assert exc.code == ErrorCode.CONFLICT_DUPLICATE_EMAIL

    def test_unauthorized_exception(self):
        exc = UnauthorizedException()
        assert exc.code == ErrorCode.AUTH_INVALID_CREDENTIALS
        assert exc.status_code == 401

    def test_forbidden_exception(self):
        exc = ForbiddenException()
        assert exc.code == ErrorCode.PERM_FORBIDDEN
        assert exc.status_code == 403

    def test_bad_request_exception(self):
        exc = BadRequestException()
        assert exc.code == ErrorCode.REQ_BAD_REQUEST
        assert exc.status_code == 400

    def test_validation_exception(self):
        exc = ValidationException()
        assert exc.code == ErrorCode.VALIDATION_GENERIC
        assert exc.status_code == 422

    def test_service_unavailable_exception(self):
        exc = ServiceUnavailableException()
        assert exc.code == ErrorCode.SERVICE_UNAVAILABLE
        assert exc.status_code == 503

    def test_too_many_requests_exception(self):
        exc = TooManyRequestsException()
        assert exc.code == ErrorCode.RATE_LIMIT_EXCEEDED
        assert exc.status_code == 429

    def test_entity_too_large_exception(self):
        exc = RequestEntityTooLargeException()
        assert exc.code == ErrorCode.REQ_ENTITY_TOO_LARGE
        assert exc.status_code == 413

    def test_unsupported_media_type_exception(self):
        exc = UnsupportedMediaTypeException()
        assert exc.code == ErrorCode.REQ_UNSUPPORTED_MEDIA
        assert exc.status_code == 415

    def test_exception_is_http_exception(self):
        exc = ConflictException()
        assert isinstance(exc, HTTPException)
        assert exc.status_code == 409


class TestAppExceptionHandler:
    def test_error_response_shape(self):
        """Verify the JSON response shape from the exception handler."""
        from fastapi import FastAPI, HTTPException
        from fastapi.responses import JSONResponse
        from fastapi.testclient import TestClient
        from app.core.exceptions import AppException, NotFoundException
        from app.core.error_codes import ErrorCode
        from app.core.exceptions import AppException

        # Build minimal app with handlers matching main.py's pattern
        app = FastAPI()

        @app.exception_handler(AppException)
        async def handler(request, exc: AppException):
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "detail": exc.detail,
                    "code": exc.code.value if hasattr(exc.code, "value") else exc.code,
                },
            )

        @app.exception_handler(HTTPException)
        async def http_handler(request, exc: HTTPException):
            code_map = {400: "REQ_001", 401: "AUTH_001", 403: "PERM_001", 404: "NF_001",
                         409: "CONF_001", 422: "VAL_001", 429: "RL_001", 503: "SRV_001"}
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail, "code": code_map.get(exc.status_code, "INT_001")},
            )

        @app.get("/test-not-found")
        def raise_not_found():
            raise NotFoundException(detail="Custom not found", code=ErrorCode.NOT_FOUND_USER)

        @app.get("/test-http")
        def raise_http():
            raise HTTPException(status_code=403, detail="Forbidden")

        client = TestClient(app)

        resp = client.get("/test-not-found")
        assert resp.status_code == 404
        body = resp.json()
        assert body["detail"] == "Custom not found"
        assert body["code"] == "NF_002"

        resp = client.get("/test-http")
        assert resp.status_code == 403
        body = resp.json()
        assert body["detail"] == "Forbidden"
        assert body["code"] == "PERM_001"
