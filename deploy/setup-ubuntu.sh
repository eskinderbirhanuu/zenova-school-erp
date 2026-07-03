#!/usr/bin/env bash
# ZENOVA Ubuntu Server Auto-Setup
# Run ONCE on the school's Ubuntu server.
# This configures everything so ZENOVA starts automatically on boot.
set -euo pipefail

ZENOVA_USER="${ZENOVA_USER:-zenova}"
ZENOVA_HOME="/home/${ZENOVA_USER}"
ZENOVA_DIR="${ZENOVA_DIR:-${ZENOVA_HOME}/zenova}"
ZENOVA_STATIC_IP="${ZENOVA_STATIC_IP:-192.168.1.100}"
ZENOVA_GATEWAY="${ZENOVA_GATEWAY:-192.168.1.1}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

if [ "$(id -u)" -ne 0 ]; then
    error "Run as root: sudo bash setup-ubuntu.sh"
    exit 1
fi

echo "========================================"
echo "  ZENOVA Ubuntu Server Setup"
echo "========================================"
echo ""

# ─── 1. System updates ─────────────────────────────────────
info "Updating system packages..."
apt update && apt upgrade -y

# ─── 2. Install Docker ─────────────────────────────────────
if ! command -v docker &>/dev/null; then
    info "Installing Docker..."
    apt install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | tee /etc/apt/keyrings/docker.asc > /dev/null
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
info "Docker $(docker --version)"

# ─── 3. Docker auto-start ──────────────────────────────────
info "Enabling Docker auto-start..."
systemctl enable docker
systemctl start docker

# ─── 4. Create zenova user ─────────────────────────────────
if ! id -u "${ZENOVA_USER}" &>/dev/null; then
    info "Creating user '${ZENOVA_USER}'..."
    useradd -m -s /bin/bash "${ZENOVA_USER}"
    usermod -aG docker "${ZENOVA_USER}"
fi

# ─── 5. Deploy ZENOVA files ────────────────────────────────
if [ ! -d "${ZENOVA_DIR}" ]; then
    info "Creating ${ZENOVA_DIR}..."
    mkdir -p "${ZENOVA_DIR}"
fi

# If this script is running from the release package, copy files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/docker-compose.yml" ]; then
    info "Copying deployment files from ${SCRIPT_DIR}..."
    cp "${SCRIPT_DIR}/docker-compose.yml" "${ZENOVA_DIR}/"
    cp "${SCRIPT_DIR}/.env" "${ZENOVA_DIR}/" 2>/dev/null || true
fi

chown -R "${ZENOVA_USER}:${ZENOVA_USER}" "${ZENOVA_DIR}"

# ─── 6. Systemd service ─────────────────────────────────────
info "Installing ZENOVA systemd service..."
cat > /etc/systemd/system/zenova.service << 'SERVICE'
[Unit]
Description=ZENOVA ERP — School Management System
Requires=docker.service
After=docker.service network.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=root
WorkingDirectory=ZENOVA_DIR_PLACEHOLDER
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose pull && /usr/bin/docker compose up -d
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
SERVICE

sed -i "s|ZENOVA_DIR_PLACEHOLDER|${ZENOVA_DIR}|g" /etc/systemd/system/zenova.service

systemctl daemon-reload
systemctl enable zenova
systemctl start zenova || warn "zenova service start may need docker images loaded first"

# ─── 7. Static IP (optional) ────────────────────────────────
if [ "${ZENOVA_STATIC_IP}" != "dhcp" ]; then
    info "Configuring static IP ${ZENOVA_STATIC_IP}..."
    # Find the main interface
    IFACE=$(ip -o -4 route show to default | awk '{print $5}' | head -1)
    if [ -n "${IFACE}" ]; then
        cat > /etc/netplan/01-zenova-static.yaml << NETPLAN
network:
  version: 2
  ethernets:
    ${IFACE}:
      dhcp4: no
      addresses:
        - ${ZENOVA_STATIC_IP}/24
      routes:
        - to: default
          via: ${ZENOVA_GATEWAY}
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
NETPLAN
        netplan apply || warn "netplan apply failed — apply manually: sudo netplan apply"
    else
        warn "Could not detect network interface — set static IP manually"
    fi
fi

# ─── 8. Summary ─────────────────────────────────────────────
echo ""
echo "========================================"
echo "  ZENOVA Ubuntu Setup Complete!"
echo "========================================"
echo ""
echo "  ZENOVA directory: ${ZENOVA_DIR}"
echo "  Auto-start:       enabled (systemd)"
echo "  Docker:           enabled on boot"
echo "  Static IP:        ${ZENOVA_STATIC_IP}"
echo ""
echo "  To load Docker images and start:"
echo "    cd ${ZENOVA_DIR}"
echo "    docker compose up -d"
echo ""
echo "  After setup, access at:"
echo "    http://${ZENOVA_STATIC_IP}:3000"
echo "    http://zenova.local:3000  (add to hosts file)"
echo ""
echo "  Test auto-start:"
echo "    sudo reboot"
