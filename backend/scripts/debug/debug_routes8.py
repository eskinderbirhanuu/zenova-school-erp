# Monkey-patch include_router to see what's happening
import sys
for key in list(sys.modules.keys()):
    if 'app' in key:
        del sys.modules[key]

from fastapi import APIRouter
original_include = APIRouter.include_router

def debug_include(self, router, **kwargs):
    route_count = len(router.routes)
    print(f'include_router: prefix={kwargs.get("prefix","?")}, tags={kwargs.get("tags","?")}, sub_routes={route_count}')
    return original_include(self, router, **kwargs)

APIRouter.include_router = debug_include

from app.api.v1.router import router
print(f'\nFinal router routes: {len(router.routes)}')
