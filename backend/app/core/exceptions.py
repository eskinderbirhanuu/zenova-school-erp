"""Centralized application exceptions with FastAPI exception_handlers support.

All domain-level errors should inherit from ``AppException`` so the
global handler in ``main.py`` can return a uniform JSON response.
"""


class AppException(Exception):
    """Base application exception with HTTP status code and detail message."""

    def __init__(self, detail: str, status_code: int = 500):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class NotFoundException(AppException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail, status_code=404)


class ConflictException(AppException):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(detail, status_code=409)


class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(detail, status_code=401)


class ForbiddenException(AppException):
    def __init__(self, detail: str = "Forbidden"):
        super().__init__(detail, status_code=403)


class BadRequestException(AppException):
    def __init__(self, detail: str = "Bad request"):
        super().__init__(detail, status_code=400)


class ValidationException(AppException):
    def __init__(self, detail: str = "Validation error"):
        super().__init__(detail, status_code=422)


class ServiceUnavailableException(AppException):
    def __init__(self, detail: str = "Service temporarily unavailable"):
        super().__init__(detail, status_code=503)
