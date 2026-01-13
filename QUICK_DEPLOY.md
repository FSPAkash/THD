# Quick Railway Deployment Steps

## TL;DR - Get Your App Live in 10 Minutes

### Step 1: Commit Your Files
```powershell
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

### Step 2: Deploy to Railway

**Option A - Railway CLI (Fast):**
```powershell
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Initialize & deploy
railway init
railway up

# Set environment variables
railway variables set SECRET_KEY="homedepot-dashboard-secret-key-2024-production"
railway variables set JWT_SECRET_KEY="jwt-secret-key-homedepot-2024-production"

# Get your URL
railway domain
```

**Option B - GitHub (No CLI):**
1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" > "Deploy from GitHub repo"
4. Select your repo
5. Add environment variables in Railway dashboard:
   - SECRET_KEY
   - JWT_SECRET_KEY
6. Generate domain in Settings

### Step 3: Test
Open your Railway URL and login:
- Username: `admin`
- Password: `homedepot123`

## What Works on Railway
- Login & authentication
- Dashboard with all KPIs
- Data upload (Excel files)
- Charts and visualizations
- Advanced analysis
- PDF report generation

## What Doesn't Work
- Email features (Windows Outlook COM - won't work on Linux)
- The app will show "Email unavailable" - this is normal

## Default Login Credentials
From `backend/config.py`:
- admin / homedepot123
- dev / devmode
- Akash / a123
- Connor / c123

**IMPORTANT:** Change these passwords before production use!

## Files Created for Deployment
- `nixpacks.toml` - Build configuration for Railway
- `railway.json` - Deployment settings
- `.dockerignore` - Files to exclude
- `backend/.env.example` - Environment variable template

## Troubleshooting

**Build fails?**
```powershell
railway logs
```

**Can't access app?**
- Check deployment status: `railway status`
- Generate domain: `railway domain`
- Check Railway dashboard for errors

**App crashes?**
- Check logs for errors
- Verify environment variables are set
- Make sure PORT variable is NOT manually set (Railway provides it)

## Support
Read full guide: `RAILWAY_DEPLOYMENT_GUIDE.md`
