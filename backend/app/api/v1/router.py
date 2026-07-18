from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, licenses, setup, dashboard, installer, iga, backup, parent_portal, sync, card_design, webauthn, currencies, password_recovery
from app.api.v1.endpoints import students, parents, teachers, staff, qr, nfc, nfc_v2, corporate, archive, conflicts, sequences, metrics, features
from app.api.v1.endpoints import academic
from app.api.v1.endpoints import finance
from app.api.v1.endpoints import platform_commission
from app.api.v1.endpoints import hr
from app.api.v1.endpoints import inventory
from app.api.v1.endpoints import library
from app.api.v1.endpoints import cafeteria
from app.api.v1.endpoints import communication
from app.api.v1.endpoints import events
from app.api.v1.endpoints import telegram
from app.api.v1.endpoints import users, activate, branches, attendance, ws, schools, audit_logs, support_tickets, reports, settings, report_cards, student_portal, setup_wizard, scanner, announcements
from app.api.v1.endpoints import roles

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
router.include_router(nfc_v2.router, prefix="", tags=["nfc"])
router.include_router(corporate.router, prefix="", tags=["corporate"])
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
router.include_router(dashboard.router, prefix="", tags=["dashboard"])
router.include_router(installer.router, prefix="", tags=["installer"])
router.include_router(iga.router, prefix="", tags=["iga"])
router.include_router(backup.router, prefix="", tags=["backup"])
router.include_router(parent_portal.router, prefix="", tags=["parent-portal"])
router.include_router(sync.router, prefix="", tags=["sync"])
router.include_router(report_cards.router, prefix="", tags=["report-cards"])
router.include_router(student_portal.router, prefix="", tags=["student-portal"])
router.include_router(setup_wizard.router, prefix="", tags=["setup-wizard"])
router.include_router(scanner.router, prefix="", tags=["scanner"])
router.include_router(announcements.router, prefix="", tags=["announcements"])
router.include_router(archive.router, prefix="", tags=["archive"])
router.include_router(conflicts.router, prefix="", tags=["conflicts"])
router.include_router(sequences.router, prefix="", tags=["sequences"])
router.include_router(platform_commission.router, prefix="", tags=["platform-commission"])
router.include_router(metrics.router, prefix="", tags=["metrics"])
router.include_router(card_design.router, prefix="", tags=["card-design"])
router.include_router(webauthn.router, prefix="/auth", tags=["webauthn"])
router.include_router(currencies.router, prefix="/finance", tags=["currencies"])
router.include_router(features.router, prefix="", tags=["features"])
router.include_router(password_recovery.router, prefix="", tags=["password-recovery"])
router.include_router(roles.router, prefix="", tags=["roles"])

