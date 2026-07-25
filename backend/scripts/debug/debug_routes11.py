from app.main import app

# FastAPI's OpenAPI schema generation is the real test
# It should list all routes from included routers
try:
    schema = app.openapi()
    paths = schema.get('paths', {})
    print(f'OpenAPI paths: {len(paths)}')
    for path in sorted(paths.keys()):
        methods = list(paths[path].keys())
        print(f'  {methods} {path}')
except Exception as e:
    print(f'OpenAPI generation failed: {e}')
    import traceback
    traceback.print_exc()
