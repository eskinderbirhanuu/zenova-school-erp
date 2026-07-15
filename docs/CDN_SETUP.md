# CDN Configuration for Static Assets

## Strategy
Frontend static assets (JS, CSS, images, fonts) are served via Next.js output. For production, place them behind a CDN.

## Option 1: Cloudflare (Free)
1. Add your domain to Cloudflare
2. Set SSL/TLS to Full (Strict)
3. Enable Auto Minify (JS, CSS, HTML)
4. Add Page Rule: `yourdomain.com/_next/static/*` → Cache Level: Standard, Edge Cache TTL: 30 days
5. Enable Brotli compression

## Option 2: Vercel
The frontend auto-deploys to Vercel's edge network with built-in CDN.

## Option 3: Nginx + Cloudflare (self-hosted)
```nginx
location /_next/static {
    expires 365d;
    add_header Cache-Control "public, immutable";
    add_header CDN-Cache-Status $upstream_cache_status;
}

location /api/v1 {
    expires -1;  # no caching for API
}

location / {
    expires 1h;
}
```

## Static files to cache
| Pattern | TTL | Notes |
|---------|-----|-------|
| `/_next/static/*` | 365d | Content-hashed, immutable |
| `/favicon.ico` | 30d | |
| `/images/*` | 30d | |
| `/api/v1/*` | none | Dynamic |

Uploaded files (student photos, ID cards) should be served from object storage (S3/MinIO) in production, not from the app server.
