import importlib, sys
from app.api.v1.endpoints import health, auth, licenses, activate, setup, students, parents, teachers, staff, qr, nfc, academic, finance, hr, inventory, library, cafeteria, communication, events, users, branches, attendance, ws, schools, audit_logs, support_tickets, reports, telegram, settings

modules = ['health', 'auth', 'licenses', 'activate', 'setup', 'students', 'parents', 'teachers', 'staff', 'qr', 'nfc', 'academic', 'finance', 'hr', 'inventory', 'library', 'cafeteria', 'communication', 'events', 'users', 'branches', 'attendance', 'ws', 'schools', 'audit_logs', 'support_tickets', 'reports', 'telegram', 'settings']

for name in modules:
    mod = sys.modules.get(f'app.api.v1.endpoints.{name}')
    if mod:
        r = getattr(mod, 'router', None)
        if r:
            rc = len(r.routes)
            if rc == 0:
                print(f'WARNING: {name}.router has 0 routes!')
            else:
                print(f'OK: {name}.router has {rc} routes')
        else:
            print(f'WARNING: {name} has no router attribute')
    else:
        print(f'WARNING: {name} not imported')
