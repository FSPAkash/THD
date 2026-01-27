# Render Build Fix

## Issue
Build was failing with:
```
sh: 1: react-scripts: Permission denied
```

## Root Cause
On Linux, `npm run build` doesn't always set correct execute permissions for `react-scripts`.

## Solution
Changed from `npm run build` to `npx react-scripts build` in both:
- `build.sh`
- `render.yaml`

Using `npx` ensures the script runs with proper permissions.

## Updated Files
1. **build.sh** - Line 11: Changed to `npx react-scripts build`
2. **render.yaml** - Line 7: Changed to `npx react-scripts build`

## Next Steps

### 1. Commit the Fix
```powershell
git add build.sh render.yaml
git commit -m "Fix: Use npx for react-scripts to resolve permission issue"
git push origin main
```

### 2. Redeploy on Render
Render will automatically detect the push and rebuild.

Or manually trigger:
1. Go to your service in Render dashboard
2. Click "Manual Deploy" > "Clear build cache & deploy"

### 3. Monitor Build
Watch the logs. You should now see:
```
> npx react-scripts build
Creating an optimized production build...
Compiled successfully!
```

## Build Time
Expected: 3-5 minutes

## Alternative Build Command

If the build script still has issues, you can use this build command directly in Render dashboard:

```bash
pip install -r backend/requirements.txt && cd frontend && npm install && npx react-scripts build && cd ..
```

This bypasses the build.sh script entirely.

## Verification

After successful build, check:
1. Build logs show "Compiled successfully"
2. App starts without errors
3. Frontend loads correctly at your Render URL
4. Can login and access dashboard

## Common Issues

### "Cannot find module 'react-scripts'"
- Solution: Ensure `react-scripts` is in `frontend/package.json` dependencies
- Check: Should be `"react-scripts": "5.0.1"`

### "npm ERR! missing script: build"
- Solution: Verify `frontend/package.json` has build script
- Check: `"build": "react-scripts build"`

### Build succeeds but app shows blank page
- Check start command: `cd backend && gunicorn app:app --bind 0.0.0.0:$PORT`
- Verify Flask serves from `../frontend/build`
- Check browser console for errors

## Status
Build fix applied. Ready to commit and deploy.
