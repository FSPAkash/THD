# Render.com Deployment Guide - THD Dashboard

Complete step-by-step guide to deploy your Home Depot KPI Dashboard to Render.com from Windows.

## Why Render.com?

- Free tier available with 750 hours/month
- Automatic HTTPS
- Zero downtime deployments
- Built-in keep-alive service (pings every 14 minutes to prevent sleep)
- Simpler than Railway, more reliable than Heroku free tier

## Prerequisites

1. Git installed on Windows
2. Render.com account (sign up at https://render.com)
3. GitHub account (for connecting repository)

## Important: Windows vs Linux Compatibility

Your app is developed on Windows. Here's what works on Render (Linux):

### WORKS on Render
- Flask backend with JWT authentication
- React frontend
- Data upload and processing (pandas, openpyxl)
- PDF generation (weasyprint)
- Dashboard, charts, and analytics
- Keep-alive service (prevents cold starts)

### DOES NOT WORK on Render
- Email service (uses Windows-only pywin32 and Outlook COM objects)
- Email features will be automatically disabled
- App will show "Email unavailable" - this is expected

## Deployment Files Created

Your project now includes:

1. **render.yaml** - Render service configuration
   - Defines build and start commands
   - Sets environment variables
   - Specifies Python 3.11 runtime

2. **build.sh** - Build script
   - Installs Python dependencies
   - Builds React frontend
   - Prepares app for production

3. **backend/keep_alive.py** - Keep-alive service
   - Pings server every 14 minutes
   - Prevents Render free tier from sleeping
   - Automatically enabled on Render.com

## Step 1: Prepare Your Repository

### 1.1 Check Git Status

Open PowerShell or Command Prompt in your project directory:

```powershell
cd C:\Users\AkashPatil\THD-Dashboard
git status
```

### 1.2 Commit Render Configuration Files

```powershell
# Add the new Render deployment files
git add render.yaml build.sh backend/keep_alive.py backend/requirements.txt backend/app.py

# Commit the changes
git commit -m "Add Render deployment configuration with keep-alive service"
```

### 1.3 Push to GitHub

If you haven't already pushed to GitHub:

```powershell
# Check your remote
git remote -v

# If no remote exists, add it
git remote add origin https://github.com/YOUR_USERNAME/THD-Dashboard.git

# Push to GitHub
git push -u origin main
```

If you already have a GitHub remote:

```powershell
git push origin main
```

## Step 2: Create Render Account

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended) or email
4. Verify your email if required

## Step 3: Deploy to Render

### 3.1 Create New Web Service

1. Log into your Render dashboard
2. Click "New +" button (top right)
3. Select "Web Service"

### 3.2 Connect Your Repository

1. Click "Connect a repository" or "Configure account"
2. Authorize Render to access your GitHub
3. Select your `THD-Dashboard` repository
4. Click "Connect"

### 3.3 Configure Your Service

Render will auto-detect settings from `render.yaml`, but verify these:

**Basic Settings:**
- Name: `thd-dashboard` (or your preferred name)
- Region: Choose closest to your users (e.g., Oregon, Ohio, Frankfurt)
- Branch: `main`
- Runtime: `Python 3`

**Build & Deploy:**
- Build Command:
  ```bash
  ./build.sh
  ```
  (Or if that doesn't work, use:)
  ```bash
  pip install -r backend/requirements.txt && cd frontend && npm install && npm run build
  ```

- Start Command:
  ```bash
  cd backend && gunicorn app:app --bind 0.0.0.0:$PORT
  ```

**Instance Type:**
- Select: `Free` (or paid tier if needed)

### 3.4 Set Environment Variables

Scroll to "Environment Variables" section and add:

| Key | Value |
|-----|-------|
| `SECRET_KEY` | `homedepot-dashboard-secret-key-2024-production` |
| `JWT_SECRET_KEY` | `jwt-secret-key-homedepot-2024-production` |
| `FLASK_ENV` | `production` |
| `FLASK_DEBUG` | `false` |
| `PYTHON_VERSION` | `3.11.0` |

**Security Note:** Generate strong random keys for production:
```powershell
# In PowerShell, generate random keys:
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### 3.5 Advanced Settings (Optional)

- **Auto-Deploy:** Keep enabled (deploys automatically on git push)
- **Health Check Path:** `/api/health`

### 3.6 Deploy

1. Click "Create Web Service" button
2. Render will start building your app
3. Watch the logs in real-time

## Step 4: Monitor Deployment

### 4.1 Build Phase

Watch the logs for:
```
==> Installing dependencies
==> Building frontend
==> Build succeeded
```

Build typically takes 3-5 minutes.

### 4.2 Deploy Phase

After build completes, app will start:
```
Starting Gunicorn
Listening at: http://0.0.0.0:10000
PDF Available: True
Email Available: False
Keep-alive service started
```

### 4.3 Get Your URL

Once deployed, your app URL will be:
```
https://thd-dashboard.onrender.com
```

(Or whatever name you chose)

## Step 5: Test Your Deployment

### 5.1 Access the Application

1. Click on your app URL in Render dashboard
2. Or navigate to: `https://your-app-name.onrender.com`

### 5.2 Test Login

Login with default credentials:
- Username: `admin`
- Password: `homedepot123`

Or:
- Username: `dev`
- Password: `devmode`

### 5.3 Test Features

1. Check dashboard loads
2. Upload Excel data (as dev/admin user)
3. View KPI charts
4. Check Advanced Analysis
5. Generate PDF report (should work)
6. Try email (will show unavailable - this is expected)

### 5.4 Verify Keep-Alive Service

Check logs for:
```
Keep-alive service started. Pinging https://your-app.onrender.com every 14.0 minutes
Keep-alive ping successful at 2024-01-13 10:14:23
```

## Step 6: Configure Keep-Alive

The keep-alive service is automatic, but you need to set the URL:

### Option A: Automatic (Recommended)

Render automatically provides `RENDER_EXTERNAL_URL` environment variable.

Add this variable in Render dashboard:
- Key: `RENDER_EXTERNAL_URL`
- Value: `https://your-app-name.onrender.com`

### Option B: Manual in Code

Already configured! The keep-alive service will:
1. Auto-detect it's running on Render
2. Use `RENDER_EXTERNAL_URL` environment variable
3. Ping `/api/health` every 14 minutes
4. Keep your app awake 24/7

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Check `backend/requirements.txt` has all dependencies
- Check `frontend/package.json` is valid

**Error: "npm install failed"**
- Check Node.js version in logs
- Try clearing Render build cache (in settings)

**Check logs:**
1. Go to your service in Render
2. Click "Logs" tab
3. Look for error messages in red

### App Crashes After Deploy

**Error: "Address already in use"**
- Make sure start command uses `$PORT` variable
- Should be: `gunicorn app:app --bind 0.0.0.0:$PORT`

**Error: "Module has no attribute"**
- Python path issue
- Make sure start command has `cd backend`

**Error: "No module named 'requests'"**
- Missing dependency
- Add to `backend/requirements.txt`

### Cannot Access Application

**Gets 502 Bad Gateway:**
- App is still starting (wait 30-60 seconds)
- Or app crashed (check logs)

**Takes long to load first time:**
- Normal for Render free tier
- First request wakes the service
- Keep-alive service prevents this after initial load

### Keep-Alive Not Working

**Check logs for:**
```
Keep-alive service not started: No URL configured
```

**Fix:**
1. Add `RENDER_EXTERNAL_URL` environment variable
2. Or check that `RENDER` env var exists (auto-added by Render)

**Verify it's running:**
```
Keep-alive service started
Keep-alive ping successful
```

### PDF Generation Issues

**Error: "weasyprint failed"**
- Render should auto-install system dependencies
- If fails, contact Render support

**Error: "wkhtmltopdf not found"**
- Your code uses both wkhtmltopdf and weasyprint
- weasyprint is more reliable on Linux
- Consider using only weasyprint

## Managing Your Deployment

### Update Your App

After making code changes:

```powershell
# Commit changes
git add .
git commit -m "Your update description"

# Push to GitHub
git push origin main
```

Render will automatically detect the push and redeploy (if auto-deploy is enabled).

### Manual Deploy

In Render dashboard:
1. Go to your service
2. Click "Manual Deploy"
3. Select branch and deploy

### View Logs

Real-time logs:
1. Go to your service
2. Click "Logs" tab
3. See live output

Or use Render CLI:
```powershell
npm install -g @render-tools/cli
render login
render logs
```

### Environment Variables

To update environment variables:
1. Go to your service
2. Click "Environment" tab
3. Update variables
4. Click "Save Changes"
5. Render will automatically redeploy

### Rollback

To rollback to previous deployment:
1. Go to "Events" tab
2. Find previous successful deploy
3. Click "Rollback to this version"

## Performance & Scaling

### Free Tier Limits

Render Free tier includes:
- 750 hours/month (enough for 24/7 with one service)
- Shared CPU
- 512 MB RAM
- Automatic sleep after 15 minutes of inactivity
- Keep-alive prevents sleep

### Sleep Behavior

Without keep-alive:
- Service sleeps after 15 minutes inactivity
- Next request takes 30-60 seconds (cold start)

With keep-alive (your setup):
- Service pings itself every 14 minutes
- Stays awake 24/7
- Fast response times

### Upgrading

For production, consider Starter plan ($7/month):
- No sleep
- More RAM (512MB → 1GB+)
- Faster CPU
- Custom domains
- Automatic SSL

## Security Best Practices

### 1. Change Default Passwords

Edit `backend/config.py`:
```python
USERS = {
    'admin': {
        'password': 'CHANGE_THIS_PASSWORD',
        'role': 'admin',
        'name': 'Administrator'
    },
    # ...
}
```

### 2. Use Strong Secret Keys

Generate secure random keys:
```powershell
# PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Update in Render dashboard environment variables.

### 3. Enable HTTPS Only

Render provides HTTPS by default. Ensure your app redirects HTTP to HTTPS.

### 4. Regular Updates

Keep dependencies updated:
```powershell
# Backend
pip list --outdated
pip install --upgrade package_name

# Frontend
npm outdated
npm update
```

### 5. Monitor Logs

Regularly check Render logs for:
- Failed login attempts
- Error patterns
- Suspicious activity

## Custom Domain (Optional)

### Add Custom Domain

1. Go to your service in Render
2. Click "Settings" tab
3. Scroll to "Custom Domains"
4. Click "Add Custom Domain"
5. Enter your domain (e.g., `dashboard.homedepot.com`)
6. Follow DNS configuration instructions
7. Render automatically provides SSL certificate

### DNS Configuration

Add CNAME record to your DNS:
```
Type: CNAME
Name: dashboard (or @)
Value: your-app-name.onrender.com
```

## Cost Estimation

### Free Tier
- Cost: $0/month
- Includes: 750 hours (31+ days)
- Limitations: Sleep after inactivity (solved with keep-alive)

### Starter Plan
- Cost: $7/month
- No sleep
- Better performance
- Custom domains

### Standard Plan
- Cost: $25/month
- More resources
- Better for production

## Monitoring & Alerts

### Built-in Monitoring

Render provides:
- Real-time logs
- Deploy history
- Health checks
- Uptime monitoring

### External Monitoring (Optional)

Consider using:
- UptimeRobot (free tier available)
- Pingdom
- StatusCake

Set up HTTP monitoring for:
- URL: `https://your-app.onrender.com/api/health`
- Interval: 5 minutes
- Alert: Email/SMS on downtime

## Support Resources

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- Status Page: https://status.render.com
- Support: support@render.com

## Summary

Your THD Dashboard is now deployed on Render.com with:

1. Automatic builds from GitHub
2. Production-ready environment
3. Keep-alive service (no cold starts)
4. HTTPS enabled
5. All features working (except Windows-specific email)

The keep-alive service ensures your app stays responsive 24/7, pinging itself every 14 minutes to prevent the free tier from sleeping.

### What's Working
- User authentication
- Dashboard & KPIs
- Data upload
- Charts & analytics
- PDF generation
- Keep-alive (no sleep)

### What's Not Working
- Email features (Windows-only, gracefully disabled)

Your app is production-ready on Render.com!
