import uuid
from datetime import date
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.models.school import School
from app.models.academic_year import AcademicYear, Semester
from app.models.class_ import ClassGrade
from app.models.section import Section
from app.models.subject import Subject
from app.models.student import Student
from app.models.parent import Parent
from app.models.parent_student_link import ParentStudentLink
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_subject import TeacherSubject
from app.models.teacher_grade_assignment import TeacherGradeAssignment
from app.models.teacher_section_assignment import TeacherSectionAssignment
from app.models.staff_profile import StaffProfile
from app.models.fee import FeeType, FeeStructure
from app.models.inventory import InventoryCategory, InventoryItem
from app.models.supplier import Supplier
from app.models.library import BookCategory, Book
from app.models.cafeteria import CafeteriaProduct
from app.models.leave import LeaveType

ROLE_NAMES = ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "TEACHER", "STAFF", "PARENT", "STUDENT",
              "FINANCE", "HR", "INVENTORY", "LIBRARY", "CAFETERIA", "AUDITOR", "REGISTRAR"]

STUDENT_NAMES = [
    ("Abebe", "Kebede", "M"), ("Tigist", "Hailu", "F"), ("Dawit", "Lemma", "M"),
    ("Meron", "Tesfaye", "F"), ("Biruk", "Alemu", "M"), ("Sara", "Wondimu", "F"),
    ("Henok", "Mekonnen", "M"), ("Betelhem", "Assefa", "F"), ("Ephrem", "Girma", "M"),
    ("Hanna", "Desta", "F"), ("Yonatan", "Tadesse", "M"), ("Selam", "Berhanu", "F"),
    ("Nahom", "Solomon", "M"), ("Ruth", "Tekle", "F"), ("Elias", "Moges", "F"),
    ("Tsion", "Ayele", "F"), ("Mikiyas", "Fikru", "M"), ("Mekdes", "Wubshet", "F"),
    ("Samuel", "Eshete", "M"), ("Birtukan", "Getachew", "F"), ("Yared", "Mulugeta", "M"),
    ("Frehiwot", "Belay", "F"), ("Natnael", "Temesgen", "M"), ("Mahlet", "Zewdu", "F"),
]

TEACHER_NAMES = [
    ("Tesfaye", "Alemayehu", "M", "Mathematics"), ("Eyerusalem", "Shiferaw", "F", "English"),
    ("Getachew", "Worku", "M", "Physics"), ("Mulu", "Dibaba", "F", "Chemistry"),
    ("Berhanu", "Kassa", "M", "Biology"), ("Tigist", "Abera", "F", "History"),
    ("Dereje", "Mekuria", "M", "Geography"), ("Wagaye", "Eshetu", "F", "Amharic"),
]

SUBJECT_NAMES = [
    ("Mathematics", "MATH"), ("English", "ENG"), ("Amharic", "AMH"),
    ("Physics", "PHY"), ("Chemistry", "CHEM"), ("Biology", "BIO"),
    ("History", "HIST"), ("Geography", "GEOG"), ("ICT", "ICT"),
    ("Civics", "CIV"), ("Physical Education", "PE"), ("Art", "ART"),
]


def seed():
    db: Session = SessionLocal()
    try:
        school = db.query(School).filter(School.is_setup_complete == True).first()
        if not school:
            print("No active school found. Run seed_super_admin.py first and activate a school via the web UI.")
            return

        school_id = school.id

        existing = db.query(Student).filter(Student.school_id == school_id).first()
        if existing:
            print("Demo data already exists for this school. Skipping.")
            return

        roles = {}
        for rn in ROLE_NAMES:
            role = db.query(Role).filter(Role.name == rn).first()
            if not role:
                role = Role(id=str(uuid.uuid4()), name=rn)
                db.add(role)
                db.flush()
            roles[rn] = role

        academic_year = AcademicYear(
            id=str(uuid.uuid4()), name="2025/26",
            start_date=date(2025, 9, 1), end_date=date(2026, 7, 31),
            is_current=True, school_id=school_id,
        )
        db.add(academic_year)
        db.flush()

        sem1 = Semester(id=str(uuid.uuid4()), name="Semester 1",
                        academic_year_id=academic_year.id,
                        start_date=date(2025, 9, 1), end_date=date(2026, 1, 31))
        sem2 = Semester(id=str(uuid.uuid4()), name="Semester 2",
                        academic_year_id=academic_year.id,
                        start_date=date(2026, 2, 1), end_date=date(2026, 7, 31))
        db.add_all([sem1, sem2])
        db.flush()

        grades = []
        grade_data = [("Grade 1", "GRD01"), ("Grade 2", "GRD02"), ("Grade 3", "GRD03"),
                      ("Grade 4", "GRD04"), ("Grade 5", "GRD05"), ("Grade 6", "GRD06"),
                      ("Grade 7", "GRD07"), ("Grade 8", "GRD08")]
        for gname, gcode in grade_data:
            g = ClassGrade(id=str(uuid.uuid4()), name=gname, code=gcode, school_id=school_id)
            db.add(g)
            db.flush()
            grades.append(g)

        sections = []
        for g in grades:
            for sn in ["A", "B"]:
                s = Section(id=str(uuid.uuid4()), name=f"{g.name} {sn}",
                           class_id=g.id, capacity=40)
                db.add(s)
                db.flush()
                sections.append(s)

        subjects = []
        for sn, sc in SUBJECT_NAMES:
            sub = Subject(id=str(uuid.uuid4()), name=sn, code=sc,
                         class_id=grades[0].id, is_optional=False)
            db.add(sub)
            db.flush()
            subjects.append(sub)

        teachers = []
        for i, (fn, ln, gen, dept) in enumerate(TEACHER_NAMES):
            employee_id = f"TCH{i+1:03d}"
            existing_user = db.query(User).filter(User.employee_id == employee_id).first()
            if existing_user:
                continue
            user = User(
                id=str(uuid.uuid4()), email=f"{fn.lower()}.{ln.lower()}@zenova.demo",
                employee_id=employee_id,
                hashed_password=get_password_hash("test1234"),
                full_name=f"{fn} {ln}", phone=f"+251911{i+1:04d}",
                role_id=roles["TEACHER"].id, school_id=school_id, is_active=True,
            )
            db.add(user)
            db.flush()
            tp = TeacherProfile(id=str(uuid.uuid4()), user_id=user.id,
                               teacher_id=employee_id,
                               qualification="Bachelor's Degree",
                               department=dept, employment_date=date(2023, 9, 1))
            db.add(tp)
            db.flush()

            ts = TeacherSubject(id=str(uuid.uuid4()), teacher_profile_id=tp.id,
                               subject_id=subjects[i % len(subjects)].id,
                               school_id=school_id)
            db.add(ts)

            tga = TeacherGradeAssignment(id=str(uuid.uuid4()), teacher_id=tp.id,
                                        grade_id=grades[i % len(grades)].id)
            db.add(tga)

            tsa = TeacherSectionAssignment(id=str(uuid.uuid4()), teacher_id=tp.id,
                                          section_id=sections[i % len(sections)].id)
            db.add(tsa)
            teachers.append(tp)

        admin_user = db.query(User).filter(
            User.school_id == school_id, User.role.has(name="ADMIN")
        ).first()
        staff_pass = get_password_hash("test1234")
        staff_users = []
        for i, (sn, roles_key) in enumerate([
            ("Finance Officer", "FINANCE"), ("HR Manager", "HR"),
            ("Inventory Clerk", "INVENTORY"), ("Librarian", "LIBRARY"),
            ("Registrar", "REGISTRAR"),
        ]):
            eid = f"STF{i+1:03d}"
            existing_user = db.query(User).filter(User.employee_id == eid).first()
            if existing_user:
                continue
            user = User(
                id=str(uuid.uuid4()), email=f"{sn.lower().replace(' ', '.')}@zenova.demo",
                employee_id=eid, hashed_password=staff_pass,
                full_name=sn, phone=f"+251922{i+1:04d}",
                role_id=roles.get(roles_key, roles["STAFF"]).id,
                school_id=school_id, is_active=True,
            )
            db.add(user)
            db.flush()
            sp = StaffProfile(id=str(uuid.uuid4()), user_id=user.id, staff_id=eid,
                             department=sn, employment_date=date(2023, 1, 1))
            db.add(sp)
            staff_users.append(user)

        section_index = 0
        for i, (fn, ln, gen) in enumerate(STUDENT_NAMES):
            section = sections[section_index % len(sections)]
            section_index += 1
            student_id = f"STU{i+1:04d}"
            existing_student = db.query(Student).filter(
                Student.student_id == student_id
            ).first()
            if existing_student:
                continue
            dob = date(2010 + (section_index // 2) % 8, (i % 12) + 1, (i % 28) + 1)
            student = Student(
                id=str(uuid.uuid4()), student_id=student_id,
                first_name=fn, last_name=ln, gender=gen,
                date_of_birth=dob, grade_id=section.class_id,
                section_id=section.id, academic_year_id=academic_year.id,
                admission_date=date(2025, 9, 1), status="active",
                school_id=school_id,
            )
            db.add(student)
            db.flush()

            parent_full = f"{'Mr.' if gen == 'M' else 'Mrs.'} {ln}"
            parent_user = User(
                id=str(uuid.uuid4()),
                email=f"parent.{ln.lower()}{i}@zenova.demo",
                employee_id=None, hashed_password=staff_pass,
                full_name=parent_full, phone=f"+251933{i+1:04d}",
                role_id=roles["PARENT"].id, school_id=school_id, is_active=True,
            )
            db.add(parent_user)
            db.flush()
            parent = Parent(
                id=str(uuid.uuid4()), parent_id=f"PAR{i+1:04d}",
                full_name=parent_full, phone_1=f"+251933{i+1:04d}",
                school_id=school_id, user_id=parent_user.id,
            )
            db.add(parent)
            db.flush()
            link = ParentStudentLink(parent_id=parent.id, student_id=student.id,
                                    relationship="Parent", is_primary=True)
            db.add(link)

        tuition = FeeType(id=str(uuid.uuid4()), name="Tuition Fee",
                         frequency="annual", school_id=school_id)
        registration = FeeType(id=str(uuid.uuid4()), name="Registration Fee",
                              frequency="one-time", school_id=school_id)
        activity = FeeType(id=str(uuid.uuid4()), name="Activity Fee",
                          frequency="annual", school_id=school_id)
        db.add_all([tuition, registration, activity])
        db.flush()

        for g in grades[:4]:
            fs = FeeStructure(id=str(uuid.uuid4()), fee_type_id=tuition.id,
                             class_id=g.id, amount=12000.00)
            db.add(fs)

        reg_fee = FeeStructure(id=str(uuid.uuid4()), fee_type_id=registration.id,
                              class_id=grades[0].id, amount=500.00)
        act_fee = FeeStructure(id=str(uuid.uuid4()), fee_type_id=activity.id,
                              class_id=grades[0].id, amount=2000.00)
        db.add_all([reg_fee, act_fee])

        inv_cat = InventoryCategory(id=str(uuid.uuid4()), name="Stationery",
                                   school_id=school_id)
        db.add(inv_cat)
        db.flush()
        for item_name in ["Exercise Book", "Pencil", "Eraser", "Ruler", "Whiteboard Marker"]:
            inv_item = InventoryItem(id=str(uuid.uuid4()), sku=f"STN-{uuid.uuid4().hex[:6].upper()}",
                                    name=item_name, category_id=inv_cat.id,
                                    unit="pcs", quantity=100, min_quantity=10,
                                    unit_price={"Exercise Book": 15, "Pencil": 5, "Eraser": 3,
                                                "Ruler": 10, "Whiteboard Marker": 25}.get(item_name, 10),
                                    school_id=school_id)
            db.add(inv_item)

        supplier = Supplier(id=str(uuid.uuid4()), name="Ethio Stationery PLC",
                           contact_person="Amanuel Tadesse", phone="+251911000000",
                           school_id=school_id)
        db.add(supplier)

        book_cat = BookCategory(id=str(uuid.uuid4()), name="Educational", school_id=school_id)
        db.add(book_cat)
        db.flush()
        for title, author in [("Mathematics Grade 6", "Ministry of Education"),
                              ("English for Ethiopia", "M. Johnson"),
                              ("Amharic Reader", "A. Wondimu"),
                              ("General Science", "Ministry of Education"),
                              ("History of Ethiopia", "B. Tekle")]:
            book = Book(id=str(uuid.uuid4()), title=title, author=author,
                       category_id=book_cat.id, total_quantity=5,
                       available_quantity=5, school_id=school_id)
            db.add(book)

        products = [("Sandwich", 45), ("Juice", 25), ("Pasta", 55), ("Rice with Chicken", 70),
                    ("Tea", 10), ("Coffee", 10), ("Cake", 30), ("Fruit Salad", 40)]
        for pname, price in products:
            prod = CafeteriaProduct(id=str(uuid.uuid4()), name=pname, price=price,
                                    category="Food", stock=50, school_id=school_id)
            db.add(prod)

        leave_types_list = [("Annual Leave", 20, True), ("Sick Leave", 15, True),
                           ("Personal Leave", 5, False), ("Maternity Leave", 90, True)]
        for lt_name, days, is_paid in leave_types_list:
            lt = LeaveType(id=str(uuid.uuid4()), name=lt_name, default_days=days,
                          is_paid=is_paid, school_id=school_id)
            db.add(lt)

        db.commit()
        print("=" * 50)
        print("  Demo Data Created Successfully!")
        print("=" * 50)
        print(f"  School     : {school.name}")
        print(f"  Grades     : {len(grades)}")
        print(f"  Sections   : {len(sections)}")
        print(f"  Subjects   : {len(subjects)}")
        print(f"  Teachers   : {len(teachers)}")
        print(f"  Students   : {len(STUDENT_NAMES)}")
        print(f"  Parents    : {len(STUDENT_NAMES)}")
        print(f"  Staff      : {len(staff_users)}")
        print("─" * 50)
        print("  Demo credentials (all users):")
        print("  Employee ID: TCH001-TCH008, STF001-STF005")
        print("  Password: test1234")
        print("=" * 50)
        print("  Run: docker compose exec backend python scripts/seed_demo_data.py")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
