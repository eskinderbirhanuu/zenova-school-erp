ZENOVA School ERP — Customer Release Package
==============================================

This package contains everything needed to deploy ZENOVA on your
Ubuntu server.

WHAT'S INCLUDED
---------------
- Docker images (pre-built, no source code)
- docker-compose.yml (deployment configuration)
- install.sh (installation script)

REQUIREMENTS
------------
- Ubuntu 20.04+ (or any Linux with Docker)
- Docker Engine 24+ (https://docs.docker.com/engine/install/ubuntu/)
- 4GB+ RAM, 20GB+ disk space
- Active internet connection for first setup

INSTALLATION
------------
1. Upload this package to your server:
     scp zenova-v1.0.0.zip user@server:~

2. Unzip:
     unzip zenova-v1.0.0.zip -d zenova
     cd zenova

3. Run installer:
     bash install.sh

4. Edit configuration:
     nano .env
   Set at minimum:
   - SECRET_KEY (generate: openssl rand -hex 32)
   - DB_PASSWORD (choose a strong password)
   - ZENOVA_LICENSE_KEY (provided by ZENOVA team)
   - SCHOOL_ID (provided during registration)

5. Start the system:
     docker compose up -d

6. Access web interface:
     http://YOUR_SERVER_IP:3000

SUPPORT
-------
Email: support@zenovaerp.com
License Server: https://superadmin.free.nf

(c) 2026 ZENOVA. All rights reserved.
Proprietary software — no source code distribution.
