# ZENOVA — School Management Platform

Enterprise School ERP for Ethiopian schools (500–20,000 students). Runs on your local server — no internet required after setup.

## Features

| Module | What it does |
|--------|--------------|
| **Student Management** | Register, transfer, graduate students. Track transcripts, ID cards, medical records. |
| **Attendance** | Daily attendance via NFC, QR scan, or manual bulk entry. Export reports. |
| **Grades & Exams** | Mark entry, exam scheduling, report cards, cumulative transcripts. |
| **Finance** | Invoices, payments, student wallets, budgeting, payroll, double-entry accounting. |
| **Library** | Book catalog, borrowing/returns, fines, membership. |
| **Cafeteria** | Product management, order processing, wallet payments. |
| **HR & Payroll** | Employee records, contracts, leave management, performance reviews, payroll runs. |
| **Inventory** | Stock tracking, purchase orders, suppliers, asset management. |
| **NFC / QR** | Contactless student identification for attendance and payments. |
| **Communication** | Announcements, internal messaging, notifications. |
| **Parent Portal** | Parents view grades, attendance, invoices, and payments for their children. |
| **Student Portal** | Students view timetable, grades, attendance, fee balances. |
| **Multi-branch** | Single school, multiple branches. Centralized or independent management. |

## Setup

### First-time Activation

After your IT admin deploys the server, open the setup wizard:

```
http://<server-ip>/setup-wizard/
```

Steps:
1. Enter your Main License Key (provided by ZENOVA)
2. Create your school profile (name, code, upload logo)
3. Create the Admin account (email + strong password)
4. (Optional) Enter Branch License Key for additional branches
5. Complete the Setup Wizard: create academic year → classes → sections → subjects → add teachers
6. Start using ZENOVA at `http://<server-ip>/login`

### Default Login

| Role | How to log in |
|------|---------------|
| **Admin** | Use the email and password you set during setup wizard |
| **Teachers / Staff** | Login with Employee ID (e.g., `ZNV-ADM-1A2B3C`) + temporary password provided by admin |
| **Students** | Login with username/password provided by registrar |
| **Parents** | Login with email/password set during registration or provided by school |

## Daily Operations

### Access URLs

| Page | URL |
|------|-----|
| School Login | `http://<server-ip>/login` |
| Super Admin Login | `http://<server-ip>/super-admin/login` |
| Setup Wizard | `http://<server-ip>/setup-wizard/` |
| Parent Portal | `http://<server-ip>/parent/login` |
| Student Portal | `http://<server-ip>/student/login` |

### Role-based Dashboards

Each role sees a tailored dashboard:
- **Director** — School-wide KPIs, revenue, attendance stats, staff overview
- **Admin** — Daily operations, attendance summaries, pending tasks
- **Teacher** — Class attendance, grade entry, timetable
- **Finance** — Invoices, payments, reports
- **Registrar** — Student registration, transfers, transcripts
- **HR** — Employee management, leave requests
- **Librarian** — Book catalog, borrowing dashboard
- **Parent** — Children's grades, attendance, fee payments
- **Student** — Own timetable, grades, attendance

### Student ID Cards

Generate NFC-enabled ID cards with custom design (colors, logo, layout). Cards work for:
- Attendance scanning (NFC tap or QR scan)
- Cafeteria payments (wallet deduction)
- Library borrowing
- Gate access

## Backup

### Automatic (recommended)

The server takes daily backups at 3:00 AM. Backups are kept for 7 days.

### Manual Backup via Web Interface

1. Log in as Admin
2. Go to **Settings → Backup**
3. Click **Create Backup**
4. Download the backup file for safekeeping

### Manual Backup via Server

Ask your IT admin to run:

```bash
# One-liner backup
docker compose exec db pg_dump -U zenova zenova_prod > backup_$(date +%Y%m%d).sql
```

### What to backup

- **Database** (most important) — All student, staff, financial, and configuration data
- **Upload directory** — Student photos, ID card designs, school logo
- **License file** — Your `.lic` activation file

### Restore (IT Admin)

```bash
cat backup.sql | docker compose exec -T db psql -U zenova zenova_prod
```

## Password Recovery (Offline)

No internet? No problem. ZENOVA has a hierarchical offline recovery chain:

1. **Super Admin** → Uses Recovery Key + 10 Recovery Codes (generated at setup)
2. **School Owner** → Recovery by Super Admin
3. **Director / Admin** → Recovery by School Owner
4. **Teacher / Registrar / Staff** → Recovery by Admin
5. **Student** → Recovery by Registrar
6. **Parent** → Recovery by Admin

### Recovery Codes

- 10 single-use codes generated at account creation
- Store codes securely (e.g., school safe, password manager)
- When codes run low, generate new ones from account settings

### Emergency

On the Ubuntu server, Super Admin can run:
```bash
sudo zenova-reset-password
```

## System Requirements for Reference

| Component | Requirement |
|-----------|-------------|
| Server RAM | 4 GB minimum |
| Server CPU | 4 cores recommended |
| Storage | 50 GB SSD |
| Network | Static IP on school LAN |
| Users supported | Up to 20,000 students |

## Browser Support

| Browser | Status |
|---------|--------|
| Google Chrome | ✅ Full support |
| Mozilla Firefox | ✅ Full support |
| Microsoft Edge | ✅ Full support |
| Opera | ✅ Supported |
| Safari (mobile) | ✅ Supported |
| Chrome (mobile) | ✅ Supported |

## Support

| Issue | Contact |
|-------|---------|
| Technical issues | Your school's IT administrator |
| License / Activation | ZENOVA support via the control center |
| Feature requests | Submit through your IT admin |
| Emergency server down | Your IT admin restores from backup |

Your IT admin has access to:
- Deployment scripts in `deploy/`
- Full operations manual at `docs/OPERATIONS_MANUAL.md`
- Monitoring dashboard at `/api/v1/health/`
- Docker logs via `docker compose logs`

## FAQ

**Q: Do I need internet to use ZENOVA?**
A: No. Internet is only needed for initial license activation. After that, everything runs on your school LAN.

**Q: How often should we back up?**
A: Daily automatic backups are configured. Keep weekly off-server copies (external drive or cloud).

**Q: Can parents pay fees online?**
A: Yes, through the Parent Portal. Chapa payment gateway is supported (must be enabled by your admin).

**Q: How many students can we register?**
A: Up to 20,000 students per school. Contact ZENOVA for larger deployments.

**Q: Can we use NFC cards for attendance?**
A: Yes. ZENOVA supports NFC cards and QR codes for contactless attendance, payments, and library borrowing.

**Q: Is there a mobile app?**
A: The web interface is mobile-responsive. Open `http://<server-ip>` on any phone browser.
