from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.core.exceptions import RequestEntityTooLargeException, UnsupportedMediaTypeException
from app.core.constants import MAX_UPLOAD_SIZE

ALLOWED_UPLOAD_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/csv",
}

UPLOAD_PATHS = (
    "/api/v1/students/import-excel",
    "/api/v1/academic/import-grades",
    "/api/v1/payments/import-excel",
)


class UploadLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method in ("POST", "PUT", "PATCH") and any(
            request.url.path.startswith(p) for p in UPLOAD_PATHS
        ):
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > MAX_UPLOAD_SIZE:
                raise RequestEntityTooLargeException(f"File too large. Max size is {MAX_UPLOAD_SIZE // (1024*1024)} MB")
            content_type = request.headers.get("content-type", "")
            if "multipart/form-data" in content_type:
                pass
            elif content_type and content_type not in ALLOWED_UPLOAD_TYPES:
                raise UnsupportedMediaTypeException(f"Unsupported content type: {content_type}")

        response = await call_next(request)
        return response
