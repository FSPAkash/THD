# Quick Render Deployment - 5 Minutes

## TL;DR - Deploy in 5 Steps

### Step 1: Push to GitHub
```powershell
git add .
git commit -m "Add Render deployment with keep-alive"
git push origin main
```

### Step 2: Go to Render
1. Visit https://render.com
2. Sign up/login with GitHub
3. Click "New +" → "Web Service"

### Step 3: Connect Repo
1. Select `THD-Dashboard` repository
2. Click "Connect"

### Step 4: Configure Service
**Build Command:**
```bash
./build.sh
```

**Start Command:**
```bash
cd backend && gunicorn app:app --bind 0.0.0.0:$PORT
```

**Environment Variables:**
```
SECRET_KEY=homedepot-dashboard-secret-key-2024-production
JWT_SECRET_KEY=jwt-secret-key-homedepot-2024-production
FLASK_ENV=production
FLASK_DEBUG=false
PYTHON_VERSION=3.11.0
```

### Step 5: Deploy
Click "Create Web Service" and wait 3-5 minutes.

## Your App URL
```
https://thd-dashboard.onrender.com
```
(or your chosen name)

## Login
- Username: `admin`
- Password: `homedepot123`

## Keep-Alive Service

Your app includes automatic keep-alive that:
- Pings itself every 14 minutes
- Prevents Render free tier from sleeping
- Keeps response times fast 24/7

Add this environment variable for keep-alive:
```
RENDER_EXTERNAL_URL=https://your-app-name.onrender.com
```

## What Works
- Login & auth
- Dashboard & KPIs
- Data upload
- Charts & analytics
- PDF generation
- Keep-alive (no sleep)

## What Doesn't Work
- Email (Windows-only, shows as unavailable)

## Files Added
- `render.yaml` - Render configuration
- `build.sh` - Build script
- `backend/keep_alive.py` - Keep-alive service
- Updated `backend/requirements.txt` - Added requests
- Updated `backend/app.py` - Initialize keep-alive

## Troubleshooting

**Build fails?**
- Check logs in Render dashboard
- Verify all files committed to git

**App slow on first load?**
- Normal for free tier cold start
- Keep-alive prevents this after initial load

**Keep-alive not working?**
- Add `RENDER_EXTERNAL_URL` environment variable
- Check logs for "Keep-alive service started"

## Cost
- Free tier: $0/month (750 hours)
- With keep-alive: Uses ~1 service worth of hours
- Upgrade to Starter ($7/month) for guaranteed uptime

## Full Guide
See `RENDER_DEPLOYMENT_GUIDE.md` for detailed instructions.

## Update App
```powershell
git add .
git commit -m "Update description"
git push origin main
```
Render auto-deploys on push.

## Security
Change default passwords in `backend/config.py` before production!

## Support
- Full guide: `RENDER_DEPLOYMENT_GUIDE.md`
- Render docs: https://render.com/docs
- Community: https://community.render.com
