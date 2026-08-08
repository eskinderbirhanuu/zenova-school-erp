# ZENOVA Production Dry-Run Checklist

## Prerequisites
- [ ] Blank Ubuntu 22.04+ server (or VM) with 4GB+ RAM, 20GB+ disk
- [ ] Docker 24+ and Docker Compose plugin installed
- [ ] Git installed
- [ ] Domain pointing to server IP (for School ERP)
- [ ] License server deployed and reachable (or local license for offline test)

## 1. Network & Firewall
- [ ] SSH access works (port 22)
- [ ] HTTP (80) and HTTPS (443) ports open
- [ ] UFW or iptables configured
- [ ] Static IP configured (if on-prem)

## 2. License Server (cloud)
```bash
cp deploy/.env.license.example deploy/.env.license
# Edit .env.license with strong secrets
./deploy/deploy.sh license
# Verify
curl https://<license-server>/api/v1/license/ping
curl -X POST https://<license-server>/api/v1/license/school-verify \
  -H "Content-Type: application/json" \
  -d '{"key":"test-key","machine_fingerprint":"test"}'
```

## 3. School ERP (customer)
```bash
cp deploy/.env.vps.example deploy/.env.vps
# Edit .env.vps with domain, DB password, license key, license server URL
./deploy/deploy.sh school
```

### Super-Admin Setup (installer flow)
A fresh deploy has **no admin user** until the installer runs — `admin@zenova.app` exists only in backend tests, not in production.

1. In `.env.vps`, set `MASTER_SETUP_KEY=<strong secret>` (maps to `settings.master_setup_key`).
2. Ensure `ZENOVA_LICENSE_SERVER` points at a reachable license server (cloud or local) so `verify_license` passes.
3. Generate a `SUPER_ADMIN` license key (via Control Center → Generate license, or directly on the license server).
4. Confirm readiness: `GET /api/v1/installer/status` → `server_identity_exists:false`, `has_master_key:true`.
5. Initialize the super admin:
```bash
curl -X POST https://<domain>/api/v1/installer/initialize-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "fingerprint":"<server-machine-fingerprint>",
    "master_setup_key":"<MASTER_SETUP_KEY>",
    "super_admin_license":"<SUPER_ADMIN-license-key>",
    "email":"admin@<your-school>.com",
    "password":"<strong-password>"
  }'
```
Expected: `201` → `{success:true, server_id:..., email:..., message:"Super admin server activated successfully"}`. The chosen email/password are then the login credentials (not `admin@zenova.app`).

### Health Checks
- [ ] Super-admin setup completed via installer flow (see above)
- [ ] Login works with the installer-created super-admin credentials
- [ ] Super-admin dashboard loads
- [ ] Admin dashboard loads
- [ ] Teacher dashboard loads
- [ ] Student dashboard loads
- [ ] Parent dashboard loads
- [ ] Registrar dashboard loads
- [ ] Finance dashboard loads
- [ ] Director dashboard loads
- [ ] Library dashboard loads
- [ ] Cafeteria dashboard loads
- [ ] HR dashboard loads
- [ ] Inventory dashboard loads
- [ ] Auditor dashboard loads
- [ ] Corporate dashboard loads

### Feature Checks
- [ ] Create a student → appears in student list
- [ ] Mark attendance → shows in attendance report
- [ ] Generate report card → PDF downloads
- [ ] Process a payment → appears in financial reports
- [ ] Create an announcement → visible to users
- [ ] NFC/QR card registration
- [ ] Password recovery flow (offline-first)

### Backup & Recovery
- [ ] `docker compose exec -T db pg_dump` works
- [ ] Restore from backup works
- [ ] Rollback: `docker compose down` + restore images + `docker compose up -d`

## 4. Control Center (admin)
```bash
cp deploy/.env.cc.example deploy/.env.cc
./deploy/deploy.sh cc
```
- [ ] Login as super admin
- [ ] Generate license key
- [ ] View customers list
- [ ] Upload update package
- [ ] View monitoring dashboard

## 5. Update Simulation
- [ ] Backup DB
- [ ] Deploy new version
- [ ] Run migrations
- [ ] Health check all systems
- [ ] Rollback on failure

## 6. Load Test (optional)
- [ ] 50 concurrent users login
- [ ] 100 concurrent API calls to /api/v1/students
- [ ] Memory stays under 80%