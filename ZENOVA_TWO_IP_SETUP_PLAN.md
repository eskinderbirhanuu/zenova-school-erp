# ZENOVA Two-IP Architecture — Physical Server Configuration Plan
# Run on physical server (192.168.1.6) after inspection

## PHASE 1: NETWORK INSPECTION (run first)
# Save output for analysis before proceeding

## PHASE 2: ANALYZE EXISTING SETUP
# From inspection, determine:
# - Primary interface name (e.g., eno1, ens18, eth0)
# - Current IP/subnet/gateway
# - Existing ZENOVA deployment paths
# - Docker network configuration
# - Nginx config location

## PHASE 3: ADD SECONDARY IP (Netplan)
# Edit /etc/netplan/00-installer-config.yaml (or similar)
# Example for adding 192.168.1.101 as secondary:

# network:
#   version: 2
#   renderer: networkd
#   ethernets:
#     <INTERFACE_NAME>:
#       dhcp4: false
#       addresses:
#         - 192.168.1.6/24      # Current primary (keep!)
#         - 192.168.1.101/24    # NEW: Organization IP
#       routes:
#         - to: default
#           via: 192.168.1.1    # Your gateway
#       nameservers:
#         addresses: [8.8.8.8, 1.1.1.1]
#
# Apply: sudo netplan apply
# Verify: ip addr show <INTERFACE_NAME>

## PHASE 4: FIREWALL
# Allow both IPs for required ports only
# sudo ufw allow from 192.168.1.0/24 to 192.168.1.6 port 80,443
# sudo ufw allow from 192.168.1.0/24 to 192.168.1.101 port 80,443
# sudo ufw deny 8000,8001,3000,3001,5432,5433,6379,6380  # Internal ports
# sudo ufw enable

## PHASE 5: DOCKER COMPOSE - SCHOOL ERP (192.168.1.6)
# Location: /home/p/deploy-school/
# docker-compose.vps.yml with:
#   - nginx: binds 192.168.1.6:80,443
#   - backend: 127.0.0.1:8000
#   - frontend: 127.0.0.1:3000
#   - db: 127.0.0.1:5432
#   - redis: 127.0.0.1:6379
#   - ZENOVA_APP_MODE=school
#   - DATABASE_URL=postgresql://.../zenova_school

## PHASE 6: DOCKER COMPOSE - ORG/DEMO (192.168.1.101)
# Location: /home/p/deploy-org/
# docker-compose.org.yml with:
#   - nginx: binds 192.168.1.101:80,443
#   - backend: 127.0.0.1:8001
#   - frontend: 127.0.0.1:3001
#   - db: 127.0.0.1:5433
#   - redis: 127.0.0.1:6380
#   - ZENOVA_APP_MODE=org
#   - DATABASE_URL=postgresql://.../zenova_org

## PHASE 7: NGINX CONFIG - SCHOOL (bind 192.168.1.6)
# server {
#     listen 192.168.1.6:80;
#     listen 192.168.1.6:443 ssl http2;
#     server_name school.zenova.local 192.168.1.6;
#     # ... proxy to frontend:3000, backend:8000
# }

## PHASE 8: NGINX CONFIG - ORG (bind 192.168.1.101)
# server {
#     listen 192.168.1.101:80;
#     listen 192.168.1.101:443 ssl http2;
#     server_name org.zenova.local 192.168.1.101;
#     # ... proxy to frontend:3001, backend:8001
# }

## PHASE 9: SERVICE MANAGEMENT
# Create systemd services or use docker-compose directly
# /etc/systemd/system/zenova-school.service
# /etc/systemd/system/zenova-org.service

## PHASE 10: VALIDATION CHECKLIST
# [ ] ip addr shows both IPs on same interface
# [ ] curl -k https://192.168.1.6/api/v1/health/live -> {"status":"alive"}
# [ ] curl -k https://192.168.1.101/api/v1/health/live -> {"status":"alive"}
# [ ] School login at https://192.168.1.6/login works
# [ ] Org login at https://192.168.1.101/super-admin/login works
# [ ] No cross-access (school IP doesn't serve org routes, vice versa)
# [ ] Reboot survives: sudo reboot && verify both IPs + services

## RECOVERY
# If networking breaks: boot from Ubuntu live USB, mount root, fix netplan
# Backup: /etc/netplan/*.yaml.bak before changes