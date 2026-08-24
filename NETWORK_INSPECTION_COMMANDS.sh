#!/bin/bash
# Run this on the physical server (192.168.1.6) as user 'p'
# Then share the output for analysis

echo "========== NETWORK INSPECTION =========="
echo "=== ip addr ==="
ip addr
echo ""
echo "=== ip route ==="
ip route
echo ""
echo "=== Netplan config ==="
cat /etc/netplan/*.yaml 2>/dev/null || echo "No netplan files"
echo ""
echo "=== NetworkManager status ==="
nmcli device status 2>/dev/null || echo "NetworkManager not available"
echo ""
echo "=== Listening ports ==="
ss -tlnp | head -40
echo ""
echo "=== Firewall ==="
ufw status verbose 2>/dev/null || iptables -L -n -v | head -40
echo ""
echo "=== Existing Docker containers ==="
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
echo ""
echo "=== Docker networks ==="
docker network ls
echo ""
echo "=== Existing ZENOVA deployments ==="
ls -la /home/p/deploy/ 2>/dev/null || echo "No /home/p/deploy"
ls -la /home/p/zenova-school-erp/ 2>/dev/null || echo "No zenova-school-erp"
echo ""
echo "=== Disk space ==="
df -h /
echo ""
echo "=== Memory ==="
free -h
echo ""
echo "========== END INSPECTION =========="