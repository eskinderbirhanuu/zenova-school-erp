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

### Health Checks
- [ ] Login works (admin@zenova.app / admin123)
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