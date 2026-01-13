# Railway Deployment Guide - THD Dashboard

This guide will walk you through deploying your Home Depot KPI Dashboard to Railway.app from Windows.

## Prerequisites

1. Git installed on Windows
2. Railway.app account (free tier available)
3. Railway CLI installed (optional, but recommended)

## Important Notes

### Windows vs Linux Compatibility

Your app is currently developed on Windows and uses some Windows-specific features:

**WILL WORK on Railway (Linux):**
- Flask backend with JWT authentication
- React frontend
- Data upload and processing (pandas, openpyxl)
- PDF generation (weasyprint)
- Dashboard, charts, and analytics

**WILL NOT WORK on Railway (Linux):**
- Email service (uses Windows-only pywin32 and Outlook COM objects)
- The email features will be disabled on Railway automatically

The app gracefully handles missing email functionality - users will see that email is unavailable.

## Step 1: Prepare Your Repository

### 1.1 Check Your Deployment Files

You should now have these files in your project root:
- `nixpacks.toml` - Build configuration
- `railway.json` - Railway deployment settings
- `.dockerignore` - Files to exclude from deployment

### 1.2 Create Environment Variables File

In the Railway dashboard (later steps), you'll need to set these environment variables:

```
SECRET_KEY=homedepot-dashboard-secret-key-2024-production
JWT_SECRET_KEY=jwt-secret-key-homedepot-2024-production
PORT=${{PORT}}
FLASK_DEBUG=false
FLASK_ENV=production
```

Note: Railway automatically provides the PORT variable.

### 1.3 Clean Up and Commit

Open PowerShell or Command Prompt in your project directory:

```powershell
# Check git status
git status

# Add the new deployment files
git add nixpacks.toml railway.json .dockerignore backend/.env.example

# Commit the changes
git commit -m "Add Railway deployment configuration"
```

## Step 2: Install Railway CLI (Optional but Recommended)

Open PowerShell as Administrator:

```powershell
# Install via npm (if you have Node.js)
npm install -g @railway/cli

# OR download the installer from https://docs.railway.app/develop/cli
```

Verify installation:
```powershell
railway --version
```

Login to Railway:
```powershell
railway login
```

## Step 3: Deploy to Railway

### Option A: Deploy via Railway CLI (Recommended)

1. Open PowerShell in your project directory:

```powershell
# Initialize Railway project
railway init

# You'll be prompted to:
# - Create a new project or select existing
# - Name your project (e.g., "thd-dashboard")

# Link to your project
railway link

# Set environment variables
railway variables set SECRET_KEY="homedepot-dashboard-secret-key-2024-production"
railway variables set JWT_SECRET_KEY="jwt-secret-key-homedepot-2024-production"
railway variables set FLASK_DEBUG="false"
railway variables set FLASK_ENV="production"

# Deploy
railway up
```

2. Once deployed, get your URL:
```powershell
railway domain
```

### Option B: Deploy via GitHub (Alternative)

1. Push your code to GitHub:

```powershell
# If you haven't already set up a remote
git remote add origin https://github.com/YOUR_USERNAME/THD-Dashboard.git

# Push to GitHub
git push -u origin main
```

2. Go to [Railway.app](https://railway.app) and sign in

3. Click "New Project" > "Deploy from GitHub repo"

4. Select your `THD-Dashboard` repository

5. Railway will automatically detect the `nixpacks.toml` and start building

## Step 4: Configure Environment Variables in Railway Dashboard

1. Go to your Railway project dashboard

2. Click on your service

3. Go to "Variables" tab

4. Add these variables:
   - `SECRET_KEY`: `homedepot-dashboard-secret-key-2024-production`
   - `JWT_SECRET_KEY`: `jwt-secret-key-homedepot-2024-production`
   - `FLASK_DEBUG`: `false`
   - `FLASK_ENV`: `production`

5. Railway automatically provides `PORT` - don't add it manually

6. Click "Deploy" to restart with new variables

## Step 5: Monitor Deployment

### Via Railway CLI:
```powershell
# View logs
railway logs

# Check status
railway status
```

### Via Railway Dashboard:
1. Go to your project
2. Click on the deployment
3. View "Deployments" tab for build logs
4. View "Logs" tab for runtime logs

## Step 6: Access Your Application

### Get Your URL:

**Via CLI:**
```powershell
railway domain
```

**Via Dashboard:**
1. Go to your service in Railway
2. Click "Settings"
3. Under "Domains", click "Generate Domain"
4. Your app will be available at: `https://your-app-name.up.railway.app`

## Step 7: Test Your Deployment

1. Open your Railway URL in a browser

2. Test the login:
   - Username: `admin`
   - Password: `homedepot123`

3. Upload test data (if you're logged in as dev or admin)

4. Verify dashboards load correctly

5. Check that PDF generation works (email will show as unavailable)

## Troubleshooting

### Build Fails

**Check the build logs:**
```powershell
railway logs --deployment
```

**Common issues:**
- Missing dependencies: Check `backend/requirements.txt`
- Node.js version: nixpacks.toml specifies nodejs-18_x
- Python version: nixpacks.toml specifies python311

### App Crashes After Deploy

**Check runtime logs:**
```powershell
railway logs
```

**Common issues:**
- Port binding: Make sure app.py uses `PORT` env variable
- Missing environment variables
- File paths: Use relative paths, not Windows absolute paths
- Database/data directory: Make sure `backend/data/` is created

### Cannot Access Application

1. Check if deployment is successful:
   ```powershell
   railway status
   ```

2. Make sure domain is generated:
   ```powershell
   railway domain
   ```

3. Check if service is running in Railway dashboard

### PDF Generation Issues

If PDFs don't work:
- Check that weasyprint dependencies are installed (nixpacks should handle this)
- View logs for weasyprint errors
- The nixpacks.toml includes gcc-unwrapped for native dependencies

## Managing Your Deployment

### Update Your App

After making changes:

```powershell
# Commit your changes
git add .
git commit -m "Your changes description"

# Push to deploy
railway up
# OR if using GitHub
git push origin main
```

Railway will automatically rebuild and redeploy.

### View Environment Variables

```powershell
railway variables
```

### Rollback Deployment

In Railway Dashboard:
1. Go to "Deployments"
2. Find the previous successful deployment
3. Click the three dots menu
4. Select "Redeploy"

### Scale Your Service

Railway free tier includes:
- 500 hours of usage per month
- $5 credit
- Automatic sleep after inactivity

For production use, consider upgrading to a paid plan.

## Security Recommendations

1. **Change default passwords** in `backend/config.py` before production
2. **Use strong SECRET_KEY and JWT_SECRET_KEY** - generate random strings
3. **Enable HTTPS** - Railway provides this automatically
4. **Add authentication rate limiting** for production
5. **Regular security updates** - keep dependencies updated

## Updating Dependencies

### Backend (Python):
```powershell
cd backend
# Update requirements.txt with new versions
railway up
```

### Frontend (Node.js):
```powershell
cd frontend
npm update
npm run build
git commit -am "Update frontend dependencies"
railway up
```

## Cost Estimation

Railway Free Tier:
- 500 hours/month (enough for 24/7 if you're the only user)
- $5 credit
- After free tier: ~$5-10/month for small app

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

## Next Steps

Once deployed successfully:

1. Test all features thoroughly
2. Update the README.md with your Railway URL
3. Share the URL with your team
4. Set up a custom domain (optional)
5. Configure monitoring/alerts via Railway dashboard
6. Consider setting up a staging environment

## Notes on Email Functionality

Since your app uses Windows Outlook COM automation (pywin32), email features will not work on Railway's Linux servers. The app will:
- Show "Email service not available" in the UI
- Disable email/draft buttons automatically
- PDF preview will still work
- All other features remain functional

To add email on Railway, you would need to:
1. Use a proper email service (SendGrid, AWS SES, Mailgun)
2. Modify `backend/email_service.py` to use SMTP instead of COM
3. This is a separate feature enhancement outside this deployment

## Summary

Your deployment configuration is now complete. The app will:
- Build the React frontend
- Set up Python environment with all dependencies
- Serve React build via Flask
- Run on Railway's infrastructure
- Scale automatically
- Provide HTTPS by default

Windows-specific email features will be gracefully disabled, but all core functionality (dashboard, analytics, data upload, PDF reports) will work perfectly on Railway's Linux environment.
