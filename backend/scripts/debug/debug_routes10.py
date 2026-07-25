from app.main import app
for r in app.routes:
    tn = type(r).__name__
    path = getattr(r, 'path', '?')
    methods = getattr(r, 'methods', None)
    print(f'  {tn}: path={path}, methods={methods}')
print(f'Total: {len(app.routes)}')
