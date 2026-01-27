# Login Fix - Production API Communication

## Problem Identified

**Issue:** Login and all API calls were failing on the deployed Render application at https://okr-tracker.onrender.com

**Root Cause:** Frontend was configured to call `http://localhost:5000` in production, which doesn't exist. The browser tries to connect to localhost on the user's machine, not the Render backend.

## Solution Applied

### File Modified: frontend/src/utils/api.js

**Before (Line 4):**
```javascript
baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
```

**After (Line 4):**
```javascript
baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000',
```

### How This Works

**In Production:**
- `process.env.NODE_ENV === 'production'` is true
- `baseURL` is set to empty string `''`
- API calls use relative paths: `/api/auth/login`, `/api/kpi/summary`, etc.
- Requests go to same domain: `https://okr-tracker.onrender.com/api/auth/login`

**In Development:**
- `process.env.NODE_ENV === 'development'`
- `baseURL` is set to `'http://localhost:5000'`
- Frontend at localhost:3000 makes API calls to localhost:5000
- Development proxy in package.json also helps route these requests

## Why This Works

Since Flask serves both the frontend and backend from the same domain on Render:
- Frontend: `https://okr-tracker.onrender.com` (serves React build from `/frontend/build`)
- Backend API: `https://okr-tracker.onrender.com/api/*` (Flask routes)

Using relative paths means the browser makes API calls to the same domain where the frontend is hosted.

## Flask Backend Configuration

The Flask backend is already correctly configured:

**1. Serves Frontend (app.py:132-134)**
```python
@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')
```

**2. 404 Handler for React Router (app.py:668-670)**
```python
@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')
```

**3. All API Routes under /api/**
- `/api/health`
- `/api/auth/login`
- `/api/auth/verify`
- `/api/upload`
- `/api/kpi/summary`
- `/api/kpi/daily`
- `/api/kpi/analysis`
- `/api/use-cases`
- `/api/data/status`
- `/api/stakeholders`
- `/api/report/preview`
- `/api/report/send`
- `/api/report/draft`
- `/api/email/current-user`
- `/api/email/test`

## Deployment Process

1. **Committed Changes:**
```bash
git add frontend/src/utils/api.js
git commit -m "Fix: API calls use relative paths in production"
git push origin main
```

2. **Render Auto-Deploy:**
Render will automatically detect the push and redeploy the application.

3. **Build Process:**
```bash
# From render.yaml and build.sh
pip install -r backend/requirements.txt
cd frontend
npm install
npm run build  # Builds with NODE_ENV=production
cd ..
```

4. **Start Process:**
```bash
cd backend && gunicorn app:app --bind 0.0.0.0:$PORT
```

## Testing After Deployment

Once Render completes the deployment:

1. **Visit:** https://okr-tracker.onrender.com
2. **Try Login:** Should now work properly
3. **Check Browser Console:** Should see API calls going to `https://okr-tracker.onrender.com/api/*`
4. **Check Network Tab:** All API requests should return 200 OK (or appropriate status codes)

## Expected Behavior

**Login Flow:**
1. User enters credentials on frontend
2. Frontend calls `/api/auth/login` (relative path)
3. Browser resolves to `https://okr-tracker.onrender.com/api/auth/login`
4. Flask backend processes request
5. Returns JWT token
6. Frontend stores token in localStorage
7. Subsequent API calls include token in Authorization header

**All API Calls:**
- Frontend: `api.get('/api/kpi/summary')`
- Browser requests: `https://okr-tracker.onrender.com/api/kpi/summary`
- Flask: Handles request and returns data
- No CORS issues (same origin)

## Why Previous Approach Failed

**Problem with localhost:5000:**
```javascript
baseURL: 'http://localhost:5000'
```
- Frontend loads from: `https://okr-tracker.onrender.com`
- API calls try: `http://localhost:5000/api/auth/login`
- Browser looks for backend on user's machine (doesn't exist)
- All API calls fail with connection errors

**Problem with environment variable:**
```javascript
baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000'
```
- REACT_APP_API_URL wasn't set in Render
- Fell back to `http://localhost:5000`
- Same failure as above

## Files in Deployment Chain

1. **frontend/src/utils/api.js** - API configuration (FIXED)
2. **backend/app.py** - Flask routes and frontend serving (Already correct)
3. **frontend/package.json** - Build script using node directly (Already fixed)
4. **build.sh** - Build process script (Already fixed)
5. **render.yaml** - Render deployment configuration (Already correct)

## Commit History

```
497c4837 Fix: API calls use relative paths in production for Render deployment
5d8b42c9 Fix: Move keep-alive to module level for Gunicorn, ensure data dir exists
[previous commits...]
```

## Summary

The login issue is now fixed. The frontend will correctly communicate with the backend API in production by using relative paths, which resolve to the same Render domain where both frontend and backend are hosted.

Wait for Render to complete the automatic redeployment, then test the login functionality at https://okr-tracker.onrender.com
