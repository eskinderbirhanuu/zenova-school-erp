"""Centralized application exceptions with FastAPI exception_handlers support.

All domain-level errors should inherit from ``AppException`` so the
global handler in ``main.py`` can return a uniform JSON response.

Inherits from ``HTTPException`` so FastAPI's built-in dependency resolver
catches these automatically during parameter injection, while the custom
handler in ``main.py`` still normalises the response shape.
"""

from fastapi import HTTPException, status as http_status


from app.core.error_codes import ErrorCode


class AppException(HTTPException):
    """Base application exception with HTTP status code, error code, and detail message.

    Inherits from ``HTTPException`` so dependencies (``Depends``) that raise
    these are handled transparently by FastAPI's dependency resolver without
    needing a separate try/except in every caller.
    """

    def __init__(self, detail: str, status_code: int = 500, code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR):
        self.detail = detail
        self.status_code = status_code
        self.code = code
        super().__init__(status_code=status_code, detail=detail)


class NotFoundException(AppException):
    def __init__(self, detail: str = "Resource not found", code: ErrorCode = ErrorCode.NOT_FOUND_GENERIC):
        super().__init__(detail, status_code=404, code=code)


class ConflictException(AppException):
    def __init__(self, detail: str = "Resource already exists", code: ErrorCode = ErrorCode.CONFLICT_GENERIC):
        super().__init__(detail, status_code=409, code=code)


class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Unauthorized", code: ErrorCode = ErrorCode.AUTH_INVALID_CREDENTIALS):
        super().__init__(detail, status_code=401, code=code)


class ForbiddenException(AppException):
    def __init__(self, detail: str = "Forbidden", code: ErrorCode = ErrorCode.PERM_FORBIDDEN):
        super().__init__(detail, status_code=403, code=code)


class BadRequestException(AppException):
    def __init__(self, detail: str = "Bad request", code: ErrorCode = ErrorCode.REQ_BAD_REQUEST):
        super().__init__(detail, status_code=400, code=code)


class ValidationException(AppException):
    def __init__(self, detail: str = "Validation error", code: ErrorCode = ErrorCode.VALIDATION_GENERIC):
        super().__init__(detail, status_code=422, code=code)


class ServiceUnavailableException(AppException):
    def __init__(self, detail: str = "Service temporarily unavailable", code: ErrorCode = ErrorCode.SERVICE_UNAVAILABLE):
        super().__init__(detail, status_code=503, code=code)


class TooManyRequestsException(AppException):
    def __init__(self, detail: str = "Rate limit exceeded", code: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED):
        super().__init__(detail, status_code=429, code=code)


class RequestEntityTooLargeException(AppException):
    def __init__(self, detail: str = "Request entity too large", code: ErrorCode = ErrorCode.REQ_ENTITY_TOO_LARGE):
        super().__init__(detail, status_code=413, code=code)


class UnsupportedMediaTypeException(AppException):
    def __init__(self, detail: str = "Unsupported media type", code: ErrorCode = ErrorCode.REQ_UNSUPPORTED_MEDIA):
        super().__init__(detail, status_code=415, code=code)
