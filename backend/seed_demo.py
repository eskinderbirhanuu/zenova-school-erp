"""Seed demo data — run: python seed_demo.py"""
from app.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.school import School
from app.models.branch import Branch
from app.models.student import Student
from app.models.parent import Parent
from app.models.teacher_profile import TeacherProfile
from app.models.staff_profile import StaffProfile
from app.models.academic_year import AcademicYear
from app.models.class_ import ClassGrade
from app.models.section import Section
from app.models.subject import Subject
from app.models.account import Account
from app.models.fee import FeeType
from app.models.library import BookCategory, Book
from app.models.inventory import InventoryCategory, InventoryItem, Supplier
from app.models.cafeteria import CafeteriaProduct
from app.core.security import get_password_hash
import uuid
from datetime import date, datetime

db = SessionLocal()

school = db.query(School).first()
if not school:
    school = School(id=str(uuid.uuid4()), name="Zenova Demo School", code="ZDS001", is_setup_complete=True)
    db.add(school); db.commit(); db.refresh(school)

# Seed honeytoken watermark records
from app.services.watermark import watermark_seed_data
watermark_seed_data(db, school.id)

branch = db.query(Branch).first()
if not branch:
    branch = Branch(id=str(uuid.uuid4()), name="Main Campus", code="MC001", school_id=school.id)
    db.add(branch); db.commit(); db.refresh(branch)

role_map = {r.name: r for r in db.query(Role).all()}
created_users = []

super_admin = db.query(User).filter(User.email == "super@zenova.app").first()
if not super_admin and "SUPER_ADMIN" in role_map:
    super_admin = User(id=str(uuid.uuid4()), email="super@zenova.app",
                       hashed_password=get_password_hash("admin123"),
                       full_name="Super Admin", is_active=True,
                       role_id=role_map["SUPER_ADMIN"].id, school_id=None, branch_id=None)
    db.add(super_admin); created_users.append(super_admin)

for role_name, email_prefix in [
    ("ADMIN","admin"),("DIRECTOR","director"),("REGISTRAR","registrar"),
    ("TEACHER","teacher"),("FINANCE","finance"),("HR","hr"),
    ("INVENTORY","inventory"),("LIBRARY","library"),("CAFETERIA","cafe"),
]:
    u = db.query(User).filter(User.email == f"{email_prefix}@zenova.app").first()
    if not u:
        u = User(id=str(uuid.uuid4()), email=f"{email_prefix}@zenova.app",
                 hashed_password=get_password_hash("demo123"),
                 full_name=f"Demo {role_name.title()}", is_active=True,
                 role_id=role_map[role_name].id, school_id=school.id, branch_id=branch.id)
        db.add(u); created_users.append(u)
db.commit()

teacher_user = db.query(User).filter(User.email == "teacher@zenova.app").first()
registrar_user = db.query(User).filter(User.email == "registrar@zenova.app").first()

# Academic Year
ay = db.query(AcademicYear).first()
if not ay:
    ay = AcademicYear(id=str(uuid.uuid4()), name="2025/2026", start_date=date(2025,9,1), end_date=date(2026,8,31), is_current=True, school_id=school.id)
    db.add(ay); db.commit(); db.refresh(ay)

# Classes
class_map = {}
for cn in ["Grade 9","Grade 10","Grade 11","Grade 12"]:
    c = db.query(ClassGrade).filter(ClassGrade.name == cn).first()
    if not c:
        c = ClassGrade(id=str(uuid.uuid4()), name=cn, code=cn.replace(" ","").upper(), school_id=school.id)
        db.add(c); db.commit(); db.refresh(c)
    class_map[cn] = c

# Sections
section_map = {}
for cn, c in class_map.items():
    for sn in ["A","B"]:
        sec = db.query(Section).filter(Section.name == sn, Section.class_id == c.id).first()
        if not sec:
            sec = Section(id=str(uuid.uuid4()), name=sn, class_id=c.id)
            db.add(sec); db.commit(); db.refresh(sec)
        section_map[f"{cn}-{sn}"] = sec

# Subjects
for sn in ["Mathematics","English","Science","History"]:
    for grade in class_map.values():
        if not db.query(Subject).filter(Subject.name == sn, Subject.class_id == grade.id).first():
            db.add(Subject(id=str(uuid.uuid4()), name=sn, code=sn[:3].upper(), class_id=grade.id))
db.commit()

# Teacher Profile
if teacher_user and not db.query(TeacherProfile).filter(TeacherProfile.user_id == teacher_user.id).first():
    db.add(TeacherProfile(id=str(uuid.uuid4()), user_id=teacher_user.id, teacher_id="TCH001"))
    db.commit()

# Students
sections = list(section_map.values())
for i, (fn, ln, sid) in enumerate([
    ("Abebe","Kebede","STU001"),("Tigist","Mekonnen","STU002"),
    ("Dawit","Alemayehu","STU003"),("Meron","Tesfaye","STU004"),
    ("Henok","Wondimu","STU005"),("Selam","Hailu","STU006"),
    ("Biruk","Assefa","STU007"),("Frehiwot","Girma","STU008"),
]):
    if not db.query(Student).filter(Student.student_id == sid).first():
        sec = sections[i % len(sections)]
        db.add(Student(id=str(uuid.uuid4()), first_name=fn, middle_name="M", last_name=ln, student_id=sid,
                       gender="Male" if i%2==0 else "Female", date_of_birth=date(2005,1,1), status="active",
                       admission_date=date(2025,9,1), school_id=school.id,
                       grade_id=sec.class_id, section_id=sec.id,
                       academic_year_id=ay.id, registered_by=registrar_user.id if registrar_user else school.id))
db.commit()

# Parents
for fn, ln, sid in [("Abebe","Kebede","STU001"),("Tigist","Mekonnen","STU002"),("Dawit","Alemayehu","STU003"),("Meron","Tesfaye","STU004")]:
    if not db.query(Parent).filter(Parent.parent_id == sid).first():
        db.add(Parent(id=str(uuid.uuid4()), parent_id=sid, full_name=f"{fn} {ln}",
                      phone_1=f"+2519{str(uuid.uuid4())[:8]}", school_id=school.id))
db.commit()

# Accounts
for acct_num, name, atype, normal in [("1000","Cash","asset","debit"),("1100","AR","asset","debit"),("2000","AP","liability","credit"),("3000","Revenue","revenue","credit"),("4000","Expenses","expense","debit")]:
    if not db.query(Account).filter(Account.account_number == acct_num).first():
        db.add(Account(id=str(uuid.uuid4()), account_number=acct_num, name=name, account_type=atype, normal_side=normal, school_id=school.id))
db.commit()

# Fee types
for fn in ["Tuition","Registration","Lab Fee","Sports Fee"]:
    if not db.query(FeeType).filter(FeeType.name == fn).first():
        db.add(FeeType(id=str(uuid.uuid4()), name=fn, school_id=school.id, frequency="annual"))
db.commit()

# Library
for cn in ["Textbook","Reference","Fiction","Science"]:
    if not db.query(BookCategory).filter(BookCategory.name == cn).first():
        db.add(BookCategory(id=str(uuid.uuid4()), name=cn, school_id=school.id))
db.commit()

for title, author, cat_name in [("Math G9","John Smith","Textbook"),("Biology 101","Jane Doe","Science"),("World History","Alan Turing","Reference"),("English Lit","Robert Frost","Fiction")]:
    if not db.query(Book).filter(Book.title == title).first():
        cat = db.query(BookCategory).filter(BookCategory.name == cat_name).first()
        db.add(Book(id=str(uuid.uuid4()), title=title, author=author, isbn=str(uuid.uuid4())[:13],
                    category_id=cat.id if cat else None, total_quantity=10, available_quantity=10, school_id=school.id))
db.commit()

# Inventory
for cn in ["Stationery","Furniture","Electronics"]:
    if not db.query(InventoryCategory).filter(InventoryCategory.name == cn).first():
        db.add(InventoryCategory(id=str(uuid.uuid4()), name=cn, school_id=school.id))
db.commit()

for sku, name, cat_name, qty, min_qty in [("SKU001","Notebooks","Stationery",500,50),("SKU002","Desks","Furniture",120,10),("SKU003","Markers","Stationery",200,30)]:
    if not db.query(InventoryItem).filter(InventoryItem.name == name).first():
        cat = db.query(InventoryCategory).filter(InventoryCategory.name == cat_name).first()
        db.add(InventoryItem(id=str(uuid.uuid4()), sku=sku, name=name, category_id=cat.id if cat else None,
                             quantity=qty, min_quantity=min_qty, unit="pcs", school_id=school.id))
db.commit()

# Suppliers
for sn in ["Ethio Books","Office Plus","Tech Supplies"]:
    if not db.query(Supplier).filter(Supplier.name == sn).first():
        db.add(Supplier(id=str(uuid.uuid4()), name=sn, contact_person="Contact",
                        email=f"{sn.lower().replace(' ','')}@email.com", phone="+251911111111",
                        school_id=school.id))
db.commit()

# Cafeteria
for name, price in [("Sandwich",45),("Juice",30),("Pasta",55),("Coffee",20),("Tea",15)]:
    if not db.query(CafeteriaProduct).filter(CafeteriaProduct.name == name).first():
        db.add(CafeteriaProduct(id=str(uuid.uuid4()), name=name, price=price, stock=100, school_id=school.id))
db.commit()

# Staff profile for HR
staff_user = db.query(User).filter(User.email == "hr@zenova.app").first()
if staff_user and not db.query(StaffProfile).filter(StaffProfile.user_id == staff_user.id).first():
    db.add(StaffProfile(id=str(uuid.uuid4()), user_id=staff_user.id, staff_id="STF001", department="Human Resources"))
    db.commit()

print("=" * 50)
print("  Demo data seeded successfully!")
print("=" * 50)
print()
print("Login credentials:")
print("  super@zenova.app / admin123  (SUPER_ADMIN)")
for rn, ep in [("ADMIN","admin"),("DIRECTOR","director"),("REGISTRAR","registrar"),("TEACHER","teacher"),("FINANCE","finance"),("HR","hr"),("INVENTORY","inventory"),("LIBRARY","library"),("CAFETERIA","cafe")]:
    print(f"  {ep}@zenova.app / demo123   ({rn})")

db.close()
