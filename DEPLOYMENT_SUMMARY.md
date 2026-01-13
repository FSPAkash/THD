# Deployment Summary - Render.com

## Overview

Your THD Dashboard is now configured for deployment on Render.com with automatic keep-alive to prevent cold starts.

## Changes Made

### Railway → Render Migration

Removed Railway files:
- nixpacks.toml
- railway.json
- .dockerignore (Railway-specific)

Added Render files:
- render.yaml
- build.sh
- .env.example

### Keep-Alive Service Added

**New file: `backend/keep_alive.py`**
- Pings server every 14 minutes
- Prevents Render free tier from sleeping
- Automatic initialization on Render.com
- Uses health check endpoint

**Updated: `backend/app.py`**
- Import and initialize keep-alive service
- Only runs when deployed on Render

**Updated: `backend/requirements.txt`**
- Added `requests>=2.31.0` for HTTP pings

## Deployment Files

### 1. render.yaml
```yaml
services:
  - type: web
    name: thd-dashboard
    runtime: python
    buildCommand: pip install && npm install && npm run build
    startCommand: cd backend && gunicorn app:app
    envVars:
      - SECRET_KEY (auto-generated)
      - JWT_SECRET_KEY (auto-generated)
      - FLASK_ENV=production
```

### 2. build.sh
Build script that:
1. Installs Python dependencies
2. Installs Node.js dependencies
3. Builds React frontend

### 3. backend/keep_alive.py
Keep-alive service that:
1. Detects Render environment
2. Gets app URL from RENDER_EXTERNAL_URL
3. Pings /api/health every 14 minutes
4. Runs in background thread

## How Keep-Alive Works

### Problem
Render free tier sleeps after 15 minutes of inactivity, causing 30-60 second cold starts.

### Solution
Keep-alive service pings the app every 14 minutes:

```
App starts → Keep-alive starts → Waits 1 minute
           → Pings /api/health → Waits 14 minutes
           → Pings /api/health → Waits 14 minutes
           → (repeats forever)
```

### Implementation
```python
# In backend/app.py (lines 36-41, 674-676)
try:
    from keep_alive import init_keep_alive
    KEEP_ALIVE_AVAILABLE = True
except ImportError:
    KEEP_ALIVE_AVAILABLE = False

# On startup
if KEEP_ALIVE_AVAILABLE:
    init_keep_alive()
```

The service:
- Only runs on Render (checks RENDER env var)
- Uses RENDER_EXTERNAL_URL automatically
- Logs ping success/failure
- Runs as daemon thread (doesn't block app shutdown)

## Deployment Process

### Quick Deploy (5 minutes)
```powershell
# 1. Commit and push
git add .
git commit -m "Add Render deployment with keep-alive"
git push origin main

# 2. Go to render.com
# 3. New Web Service → Connect GitHub repo
# 4. Set environment variables
# 5. Deploy
```

See [QUICK_DEPLOY_RENDER.md](QUICK_DEPLOY_RENDER.md) for details.

### Full Guide
See [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md) for comprehensive instructions.

## Environment Variables Required

Set these in Render dashboard:

```
SECRET_KEY=homedepot-dashboard-secret-key-2024-production
JWT_SECRET_KEY=jwt-secret-key-homedepot-2024-production
FLASK_ENV=production
FLASK_DEBUG=false
PYTHON_VERSION=3.11.0
RENDER_EXTERNAL_URL=https://your-app-name.onrender.com
```

Render automatically sets:
- PORT (don't set manually)
- RENDER=true

## What Works on Render

- User authentication (JWT)
- Dashboard with all KPIs
- Data upload (Excel)
- Charts & visualizations (Recharts)
- Advanced analysis
- PDF generation (weasyprint/pdfkit)
- Keep-alive service (no sleep)

## What Doesn't Work

- Email service (Windows-only pywin32/Outlook COM)
- App gracefully shows "Email unavailable"

## Testing Keep-Alive

After deployment, check logs for:

```
Keep-alive service started. Pinging https://your-app.onrender.com every 14.0 minutes
Keep-alive ping successful at 2024-01-13 10:14:23
```

If not working:
1. Check RENDER_EXTERNAL_URL is set
2. Check RENDER=true exists (auto-set by Render)
3. View logs for error messages

## Default Credentials

Change these before production:

From `backend/config.py`:
- admin / homedepot123
- dev / devmode
- Akash / a123
- Connor / c123

## Cost

### Render Free Tier
- 750 hours/month
- Shared CPU, 512MB RAM
- Sleeps after 15 minutes (prevented by keep-alive)
- Cost: $0/month

### With Keep-Alive
- Uses same 750 hours
- Stays awake 24/7
- No cold starts
- Still free

### Upgrade Options
- Starter: $7/month (no sleep, better performance)
- Standard: $25/month (production-ready)

## File Structure

```
THD-Dashboard/
├── render.yaml                    # Render service config
├── build.sh                       # Build script
├── .env.example                   # Environment template
├── RENDER_DEPLOYMENT_GUIDE.md     # Full guide (12KB)
├── QUICK_DEPLOY_RENDER.md         # Quick reference (2KB)
├── DEPLOYMENT_SUMMARY.md          # This file
├── backend/
│   ├── app.py                     # Updated with keep-alive
│   ├── keep_alive.py              # Keep-alive service
│   ├── requirements.txt           # Added requests
│   └── ...
└── frontend/
    └── ...
```

## Monitoring

### Built-in (Render Dashboard)
- Real-time logs
- Deploy history
- Health checks
- Uptime metrics

### Keep-Alive Logs
Check for these messages:
```
Keep-alive service started
Keep-alive ping successful
```

### Health Check
Test manually:
```powershell
curl https://your-app.onrender.com/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-13T10:00:00",
  "pdf_available": true,
  "email_available": false
}
```

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Verify requirements.txt and package.json
- Try manual deploy

### App Crashes
- Check runtime logs
- Verify PORT is not manually set
- Check environment variables

### Keep-Alive Not Working
- Add RENDER_EXTERNAL_URL env var
- Check logs for "Keep-alive service started"
- Verify RENDER env var exists

### Slow First Load
- Normal for free tier initial cold start
- Keep-alive prevents subsequent cold starts
- Consider upgrading to paid tier

## Updates

To update your deployed app:

```powershell
# Make changes to code
git add .
git commit -m "Your changes"
git push origin main
```

Render auto-deploys on push (if enabled).

## Security Checklist

Before going to production:

- [ ] Change default passwords in config.py
- [ ] Generate strong SECRET_KEY
- [ ] Generate strong JWT_SECRET_KEY
- [ ] Enable HTTPS only (automatic on Render)
- [ ] Review user permissions
- [ ] Test all features
- [ ] Set up monitoring/alerts
- [ ] Document admin procedures

## Next Steps

1. Read [QUICK_DEPLOY_RENDER.md](QUICK_DEPLOY_RENDER.md)
2. Commit and push changes
3. Deploy to Render
4. Test all features
5. Monitor keep-alive logs
6. Update passwords for production
7. Share URL with team

## Support

- Quick Guide: [QUICK_DEPLOY_RENDER.md](QUICK_DEPLOY_RENDER.md)
- Full Guide: [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md)
- Render Docs: https://render.com/docs
- Render Community: https://community.render.com

## Summary

Your app is now ready for Render.com deployment with:

1. Automatic builds from GitHub
2. Production environment configuration
3. Keep-alive service (prevents sleep)
4. HTTPS by default
5. All core features working (except Windows-specific email)

The keep-alive service ensures fast response times 24/7 by preventing Render's free tier from sleeping.

Ready to deploy!
