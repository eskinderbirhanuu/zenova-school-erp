from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, licenses, setup
from app.api.v1.endpoints import students, parents, teachers, staff, qr, nfc
from app.api.v1.endpoints import academic
from app.api.v1.endpoints import finance
from app.api.v1.endpoints import hr
from app.api.v1.endpoints import inventory
from app.api.v1.endpoints import library
from app.api.v1.endpoints import cafeteria
from app.api.v1.endpoints import communication
from app.api.v1.endpoints import events
from app.api.v1.endpoints import telegram
from app.api.v1.endpoints import users, activate, branches, attendance, ws, schools, audit_logs, support_tickets, reports, settings

router = APIRouter(prefix="/api/v1")
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(licenses.router, prefix="", tags=["licenses"])
router.include_router(activate.router, prefix="", tags=["activate"])
router.include_router(setup.router, prefix="", tags=["setup"])
router.include_router(students.router, prefix="", tags=["students"])
router.include_router(parents.router, prefix="", tags=["parents"])
router.include_router(teachers.router, prefix="", tags=["teachers"])
router.include_router(staff.router, prefix="", tags=["staff"])
router.include_router(qr.router, prefix="", tags=["qr"])
router.include_router(nfc.router, prefix="", tags=["nfc"])
router.include_router(academic.router, prefix="", tags=["academic"])
router.include_router(finance.router, prefix="", tags=["finance"])
router.include_router(hr.router, prefix="", tags=["hr"])
router.include_router(inventory.router, prefix="", tags=["inventory"])
router.include_router(library.router, prefix="", tags=["library"])
router.include_router(cafeteria.router, prefix="", tags=["cafeteria"])
router.include_router(communication.router, prefix="", tags=["communication"])
router.include_router(events.router, prefix="/events", tags=["events"])
router.include_router(users.router, prefix="", tags=["users"])
router.include_router(branches.router, prefix="", tags=["branches"])
router.include_router(attendance.router, prefix="", tags=["attendance"])
router.include_router(schools.router, prefix="", tags=["schools"])
router.include_router(audit_logs.router, prefix="", tags=["audit"])
router.include_router(support_tickets.router, prefix="", tags=["support"])
router.include_router(reports.router, prefix="", tags=["reports"])
router.include_router(telegram.router, prefix="", tags=["telegram"])
router.include_router(settings.router, prefix="", tags=["settings"])

