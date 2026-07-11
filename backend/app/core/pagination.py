from math import ceil
from sqlalchemy.orm import Query
from app.schemas.pagination import PaginatedResponse


def paginate(query: Query, page: int = 1, page_size: int = 50, max_page_size: int = 200):
    page = max(page, 1)
    page_size = max(1, min(page_size, max_page_size))
    total = query.count()
    total_pages = max(1, ceil(total / page_size))
    offset = (page - 1) * page_size
    return query.offset(offset).limit(page_size), total, page, page_size, total_pages


def build_paginated_response(items: list, total: int, page: int, page_size: int, total_pages: int) -> PaginatedResponse:
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
