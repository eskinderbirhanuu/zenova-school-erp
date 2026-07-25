# Check all route types in the app
import sys
for key in list(sys.modules.keys()):
    if 'app' in key:
        del sys.modules[key]

from app.main import app

for r in app.routes:
    tn = type(r).__name__
    if tn == 'APIWebSocketRoute':
        print(f'WS: {r.path}')
    elif tn == 'APIRoute':
        print(f'API: {r.methods} {r.path}')
    elif tn == '_IncludedRouter':
        print(f'Router: {len(r.routes)} sub-routes included')
    elif tn == 'Mount':
        print(f'Mount: {r.path}')
    else:
        print(f'Other ({tn}): path={getattr(r, "path", "?")}')

print(f'\nTotal objects in app.routes: {len(app.routes)}')
