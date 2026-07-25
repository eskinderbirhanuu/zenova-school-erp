# Full app load check
import sys
import traceback

# Remove cached modules
for key in list(sys.modules.keys()):
    if 'app.api' in key or 'app.main' in key or 'app.core' in key or 'app.services' in key or 'app.models' in key:
        del sys.modules[key]

try:
    import app.main
    app = app.main.app
    routes = [(r.path, getattr(r, 'methods', set())) for r in app.routes if hasattr(r, 'methods')]
    print('Total API routes in app:', len(routes))
    for p, m in sorted(routes, key=lambda x: x[0]):
        print(' ', m, p)
except Exception as e:
    traceback.print_exc()
