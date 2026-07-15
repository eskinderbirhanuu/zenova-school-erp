# SSL Certificate Setup with Certbot

## First-time issuance
```bash
# Stop nginx temporarily to free port 80
docker compose -f deploy/docker-compose.vps.yml stop nginx

# Issue certificate
docker run -it --rm -v certbot-conf:/etc/letsencrypt -v certbot-data:/var/www/certbot certbot/certbot certonly --standalone -d yourdomain.com

# Restart nginx
docker compose -f deploy/docker-compose.vps.yml up -d nginx
```

## Auto-renewal
Certbot auto-renewal runs as a service in `docker-compose.vps.yml` (profile: `ssl`):
```bash
# Enable the certbot renewal container
docker compose -f deploy/docker-compose.vps.yml --profile ssl up -d certbot
```
The container checks every 12 hours and renews expiring certificates.

## Nginx config reference
Add to your nginx.conf:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ...
}
```
