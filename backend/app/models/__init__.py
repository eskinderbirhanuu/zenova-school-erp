from app.database import Base

from app.models.user import User
from app.models.role import Role
from app.models.server import ServerIdentity, ServerRole
from app.models.school import School
from app.models.branch import Branch
from app.models.license import License, LicenseType, LicenseStatus
from app.models.audit_log import AuditLog
from app.models.student import Student
from app.models.parent import Parent
from app.models.parent_student_link import ParentStudentLink
from app.models.teacher_profile import TeacherProfile
from app.models.staff_profile import StaffProfile
from app.models.teacher_grade_assignment import TeacherGradeAssignment
from app.models.teacher_section_assignment import TeacherSectionAssignment
from app.models.qr_code import QRCode
from app.models.nfc_card import NFCCard
from app.models.number_sequence import NumberSequence
from app.models.academic_year import AcademicYear, Semester
from app.models.class_ import ClassGrade
from app.models.section import Section
from app.models.subject import Subject
from app.models.classroom import Classroom
from app.models.timetable import TimetableEntry
from app.models.exam import ExamType, Exam, ExamResult
from app.models.report_card import ReportCard, PromotionRecord
from app.models.assignment import Assignment
from app.models.account import Account
from app.models.journal import JournalEntry, JournalLine
from app.models.fee import FeeType, FeeStructure, FeeAssignment
from app.models.invoice import Invoice, InvoiceLine
from app.models.payment import Payment
from app.models.wallet import Wallet, WalletTransaction
from app.models.scholarship import Scholarship
from app.models.period import AccountingPeriod
from app.models.payroll import PayrollRun, PayrollItem
from app.models.budget import Budget, BudgetItem
from app.models.procurement import PurchaseRequest, PurchaseOrder, GoodsReceipt
from app.models.inventory import InventoryCategory, InventoryItem, StockMovement, Supplier
from app.models.inventory_asset import InventoryAsset
from app.models.contract import EmployeeContract
from app.models.leave import LeaveType, LeaveRequest, LeaveBalance
from app.models.attendance import Attendance
from app.models.performance import PerformanceReview
from app.models.recruitment import JobPosting
from app.models.library import BookCategory, Book, BookBorrowing
from app.models.library_member import LibraryMember
from app.models.library_fine import LibraryFine
from app.models.cafeteria import CafeteriaProduct, CafeteriaOrder, CafeteriaOrderItem
from app.models.communication import Announcement, Notification, Message
from app.models.notification_preference import NotificationPreference
from app.models.telegram_bot import SchoolTelegramBot
from app.models.event import Event
from app.models.support_ticket import SupportTicket
from app.models.report import Report
from app.models.school_settings import SchoolSettings
from app.models.sync_queue import SyncQueue, SyncOperation, SyncStatus
from app.models.sync_inbound import SyncInbound
from app.models.conflict_log import ConflictLog
from app.models.student_document import StudentDocument
from app.models.announcement import Announcement
from app.models.archive import ArchiveJob, ArchivedRecord
