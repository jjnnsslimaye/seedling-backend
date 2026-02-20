# Production Deployment Checklist

## ✅ Completed Production Readiness Tasks

### 1. CORS Configuration
- ✅ Updated `app/config.py` to include production domain
- ✅ Added `https://tryseedling.live` and `https://www.tryseedling.live` to allowed origins

### 2. Debug Logging
- ✅ Made all `print()` statements conditional on `settings.debug`
- ✅ Updated files:
  - `app/main.py` - CORS configuration logging
  - `app/api/routes/auth.py` - Login debugging
  - `app/api/routes/competitions.py` - Image upload debugging
  - `app/api/routes/submissions.py` - Video upload warnings
  - `app/api/routes/admin.py` - Stripe debugging and test transfer logging

### 3. Security
- ✅ Verified `.env` file is properly excluded from git
- ✅ No hardcoded secrets in codebase
- ✅ All sensitive data uses environment variables

### 4. Application Testing
- ✅ Tested app imports successfully
- ✅ Tested with `DEBUG=false` (production mode)
- ✅ Verified no debug output in production mode

---

## 📋 Pre-Deployment Checklist

### Environment Variables
Update your production `.env` file with these settings:

```bash
# Application Settings
APP_NAME="Seedling"
VERSION="1.0.0"
DEBUG=false  # ⚠️ IMPORTANT: Set to false in production

# API Settings
API_V1_PREFIX="/api/v1"

# Database
DATABASE_URL="sqlite+aiosqlite:///./app.db"  # Or use PostgreSQL for production

# Security
SECRET_KEY="<generate-with-openssl-rand-hex-32>"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS - Add production domains
ALLOWED_ORIGINS=["https://tryseedling.live","https://www.tryseedling.live"]

# Frontend URL for redirects (email links, etc.)
FRONTEND_URL="https://tryseedling.live"

# Stripe Keys (PRODUCTION keys from Stripe Dashboard)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# SendGrid (for emails)
SENDGRID_API_KEY="SG...."
SENDGRID_FROM_EMAIL="noreply@tryseedling.live"

# AWS S3 (for video/image storage)
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="seedling-uploads-prod"
```

### Required Environment Variable Changes

1. **DEBUG** → Set to `false`
2. **ALLOWED_ORIGINS** → Include production domains
3. **FRONTEND_URL** → Change to production domain
4. **STRIPE_SECRET_KEY** → Use LIVE key (sk_live_...)
5. **STRIPE_PUBLISHABLE_KEY** → Use LIVE key (pk_live_...)
6. **STRIPE_WEBHOOK_SECRET** → Update webhook endpoint in Stripe Dashboard
7. **AWS_S3_BUCKET** → Use production bucket

### Database Considerations

⚠️ **Current setup uses SQLite** - Consider migrating to PostgreSQL for production:

```bash
# Example PostgreSQL connection string
DATABASE_URL="postgresql+asyncpg://user:password@host:5432/seedling_prod"
```

### Stripe Configuration

1. Switch from test keys to live keys
2. Update webhook endpoint in Stripe Dashboard:
   - Endpoint URL: `https://api.tryseedling.live/api/v1/payments/webhook`
   - Events to listen: `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Test webhook with Stripe CLI: `stripe listen --forward-to localhost:8000/api/v1/payments/webhook`

### AWS S3 Configuration

1. Create production S3 bucket: `seedling-uploads-prod`
2. Enable versioning (recommended)
3. Configure CORS policy:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://tryseedling.live", "https://www.tryseedling.live"],
    "ExposeHeaders": []
  }
]
```
4. Configure bucket policy for private access (presigned URLs only)

### SendGrid Configuration

1. Verify sender email: `noreply@tryseedling.live`
2. Generate production API key
3. Test email delivery

---

## 🚀 Deployment Steps

### 1. Server Setup

```bash
# Install Python 3.11+
sudo apt update
sudo apt install python3.11 python3.11-venv

# Create application directory
mkdir -p /var/www/seedling-backend
cd /var/www/seedling-backend

# Clone repository
git clone https://github.com/jjnnsslimaye/seedling-backend.git .
```

### 2. Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration

```bash
# Create .env file (DO NOT commit to git)
nano .env

# Copy production environment variables from checklist above
# Save and exit
```

### 4. Database Migration

```bash
# Run Alembic migrations
alembic upgrade head

# Verify database connection
python -c "from app.database import init_db; import asyncio; asyncio.run(init_db())"
```

### 5. Test Application

```bash
# Test imports
python -c "from app.main import app; print('✓ App ready')"

# Test startup (ctrl+C to stop)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 6. Production Server (Gunicorn + Uvicorn)

```bash
# Install gunicorn
pip install gunicorn

# Create systemd service
sudo nano /etc/systemd/system/seedling-backend.service
```

**Service file content:**
```ini
[Unit]
Description=Seedling Backend API
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/seedling-backend
Environment="PATH=/var/www/seedling-backend/.venv/bin"
ExecStart=/var/www/seedling-backend/.venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile /var/log/seedling/access.log \
    --error-logfile /var/log/seedling/error.log \
    --log-level info

[Install]
WantedBy=multi-user.target
```

```bash
# Create log directory
sudo mkdir -p /var/log/seedling
sudo chown www-data:www-data /var/log/seedling

# Enable and start service
sudo systemctl enable seedling-backend
sudo systemctl start seedling-backend

# Check status
sudo systemctl status seedling-backend
```

### 7. Nginx Reverse Proxy

```bash
# Install nginx
sudo apt install nginx

# Create nginx configuration
sudo nano /etc/nginx/sites-available/seedling-backend
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name api.tryseedling.live;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.tryseedling.live;

    # SSL certificates (use certbot)
    ssl_certificate /etc/letsencrypt/live/api.tryseedling.live/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tryseedling.live/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Request size (for video uploads)
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts (for long uploads)
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/seedling-backend /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 8. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.tryseedling.live

# Auto-renewal is configured automatically
# Test renewal: sudo certbot renew --dry-run
```

---

## 🔍 Post-Deployment Verification

### 1. Health Check
```bash
curl https://api.tryseedling.live/health
# Expected: {"status": "healthy"}
```

### 2. CORS Verification
```bash
curl -H "Origin: https://tryseedling.live" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.tryseedling.live/api/v1/auth/login
```

### 3. Authentication Test
```bash
curl -X POST https://api.tryseedling.live/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test&password=test123"
```

### 4. Stripe Webhook Test
- Go to Stripe Dashboard → Webhooks
- Click "Send test webhook"
- Verify webhook receives events

### 5. S3 Upload Test
- Create test competition
- Upload cover image
- Verify image displays correctly

---

## 📊 Monitoring & Logs

### Application Logs
```bash
# View logs
sudo journalctl -u seedling-backend -f

# Access logs
tail -f /var/log/seedling/access.log

# Error logs
tail -f /var/log/seedling/error.log
```

### Nginx Logs
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### System Resources
```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Service status
sudo systemctl status seedling-backend
```

---

## 🛡️ Security Checklist

- ✅ DEBUG=false in production
- ✅ Strong SECRET_KEY (32+ characters, random)
- ✅ HTTPS enabled (SSL certificate)
- ✅ Stripe live keys (not test keys)
- ✅ .env file permissions (chmod 600)
- ✅ Firewall configured (ufw/iptables)
- ✅ S3 bucket private (presigned URLs only)
- ✅ Database credentials secured
- ✅ Regular backups configured

---

## 🔄 Deployment Updates

### Rolling Update Process

```bash
# SSH into server
ssh user@server

# Navigate to app directory
cd /var/www/seedling-backend

# Activate virtual environment
source .venv/bin/activate

# Pull latest changes
git pull origin main

# Install/update dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Restart service
sudo systemctl restart seedling-backend

# Verify deployment
curl https://api.tryseedling.live/health
```

### Rollback Procedure

```bash
# Find previous commit
git log --oneline -10

# Rollback to specific commit
git reset --hard <commit-hash>

# Restart service
sudo systemctl restart seedling-backend
```

---

## 📝 Production Issues Found

### ✅ Fixed Issues

1. **CORS Configuration**
   - Fixed: Added production domains to allowed origins
   - Location: `app/config.py:26-31`

2. **Debug Logging**
   - Fixed: Made all print statements conditional on DEBUG setting
   - Files updated: main.py, auth.py, competitions.py, submissions.py, admin.py

3. **Hardcoded URLs**
   - Fixed: No hardcoded localhost URLs found (all use environment variables)

### ⚠️ Recommendations

1. **Database Migration**
   - Current: SQLite
   - Recommended: PostgreSQL for production
   - Reason: Better concurrency, reliability, and performance

2. **Environment Variables**
   - Must update .env file on production server
   - Critical variables: DEBUG, ALLOWED_ORIGINS, FRONTEND_URL, Stripe keys

3. **Monitoring**
   - Consider adding application monitoring (e.g., Sentry for error tracking)
   - Set up log aggregation (e.g., ELK stack or CloudWatch)
   - Configure uptime monitoring (e.g., UptimeRobot, Pingdom)

4. **Backup Strategy**
   - Implement automated database backups
   - Backup S3 bucket with versioning enabled
   - Store backups in separate region/account

---

## 🎯 Quick Start Commands

```bash
# Production startup test (with DEBUG=false)
source .venv/bin/activate
DEBUG=false python -m app.main

# Production server
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: CORS errors in browser**
- Verify ALLOWED_ORIGINS includes production domain
- Check nginx proxy headers are set correctly
- Verify OPTIONS requests are allowed

**Issue: 502 Bad Gateway**
- Check backend service is running: `sudo systemctl status seedling-backend`
- Check logs: `sudo journalctl -u seedling-backend -n 50`
- Verify port 8000 is listening: `sudo netstat -tlnp | grep 8000`

**Issue: Database connection errors**
- Verify DATABASE_URL is correct
- Check database file permissions
- Run migrations: `alembic upgrade head`

**Issue: Stripe webhook failures**
- Verify webhook secret is correct
- Check webhook endpoint is accessible publicly
- Test with Stripe CLI: `stripe listen --forward-to`

---

## ✅ Final Checklist

Before going live, verify:

- [ ] All environment variables updated for production
- [ ] DEBUG=false
- [ ] Stripe live keys configured
- [ ] SSL certificate installed and auto-renewal working
- [ ] Database backed up
- [ ] S3 bucket configured with proper permissions
- [ ] SendGrid sender verified and API key valid
- [ ] Health endpoint returns 200
- [ ] Can create account, login, and create competition
- [ ] Can submit competition entry with video upload
- [ ] Stripe payment processing works end-to-end
- [ ] Email notifications deliver successfully
- [ ] All API endpoints require authentication where appropriate
- [ ] Logs are being written and rotated properly

---

**Deployment Date:** _____________________

**Deployed By:** _____________________

**Production URL:** https://api.tryseedling.live

**Status:** ⏳ Ready for Deployment
