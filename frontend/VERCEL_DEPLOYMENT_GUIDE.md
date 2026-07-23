# Frontend Deployment Guide - Vercel

**Project:** AI Study Planner  
**Date:** July 22, 2026  
**Frontend Repository:** GitHub repository with Next.js app  
**Backend API:** https://aistudyplannerbackend.onrender.com  

---

## Prerequisites

Before deploying to Vercel:

1. **Vercel Account**
   - [ ] Create account at https://vercel.com
   - [ ] Connect GitHub account to Vercel
   - [ ] Authorize Vercel to access your repositories

2. **Environment Variables**
   - [ ] Gather all required env vars (see "Environment Variables" section below)
   - [ ] Have Firebase config ready
   - [ ] Have backend API URL ready

3. **Code Ready**
   - [ ] All tests passing locally (`npm run test`)
   - [ ] Build succeeds locally (`npm run build`)
   - [ ] No console errors in dev mode (`npm run dev`)
   - [ ] Code committed and pushed to GitHub

---

## Environment Variables

Create or update `.env.local` in the `/frontend` directory with these variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Backend API
NEXT_PUBLIC_API_URL=https://aistudyplannerbackend.onrender.com

# Environment
NEXT_PUBLIC_ENV=production
```

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Only non-sensitive config should use this prefix.

---

## Step 1: Prepare Repository

### 1.1 Ensure Correct Structure
```
AI-Study-Planner/
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.local
│   ├── next.config.js
│   ├── package.json
│   ├── tsconfig.json
│   └── vercel.json (optional)
├── backend/
└── README.md
```

### 1.2 Verify Build Configuration

Check `frontend/next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure output is correctly set
  output: 'standalone',
  
  // Configure image optimization
  images: {
    domains: ['example.com'],
  },
  
  // Enable SWR and caching
  swcMinify: true,
};

module.exports = nextConfig;
```

### 1.3 Create `vercel.json` (Optional but Recommended)

Create `/frontend/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_FIREBASE_API_KEY": "@firebase_api_key",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": "@firebase_auth_domain",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID": "@firebase_project_id",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET": "@firebase_storage_bucket",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "@firebase_messaging_sender_id",
    "NEXT_PUBLIC_FIREBASE_APP_ID": "@firebase_app_id",
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_ENV": "production"
  }
}
```

### 1.4 Final Pre-Deployment Checks

Run these commands locally:

```bash
cd frontend

# Verify dependencies
npm ci

# Run tests
npm run test -- --run

# Build the project
npm run build

# Check build output size
du -sh .next/

# Start production build locally (optional)
npm run start
```

All should complete without errors.

---

## Step 2: Deploy to Vercel

### Option A: Via Vercel Web Dashboard (Recommended for First-Time)

1. **Visit Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Click "New Project" or "Add New..."

2. **Import Repository**
   - Select "Continue with GitHub"
   - Authenticate with GitHub
   - Select your repository: `AI-Study-Planner`
   - Click "Import"

3. **Configure Project**
   - **Project Name:** `ai-study-planner-frontend`
   - **Framework Preset:** Select "Next.js"
   - **Root Directory:** Set to `frontend/` (very important!)
   - Click "Continue"

4. **Set Environment Variables**
   - Add all variables from "Environment Variables" section above
   - For each variable:
     - Click "Add Environment Variable"
     - Enter variable name (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`)
     - Enter value (from your Firebase project)
     - Select environments: "Production" and "Preview"
   - Click "Deploy"

5. **Wait for Deployment**
   - Vercel will build and deploy
   - This takes 2-5 minutes
   - You'll see deployment progress in real-time
   - Once complete, you'll get a URL like: `https://ai-study-planner-frontend.vercel.app`

### Option B: Via Vercel CLI (Advanced)

```bash
# Install Vercel CLI globally (if not already installed)
npm install -g vercel

# Navigate to frontend directory
cd frontend

# Deploy (first time will prompt for setup)
vercel

# For production deployment
vercel --prod

# View deployment URL
vercel --list
```

---

## Step 3: Configure Custom Domain (Optional)

If you have a custom domain (e.g., `aistudyplanner.com`):

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Navigate to "Domains"
   - Click "Add Domain"
   - Enter your custom domain
   - Follow DNS configuration instructions
   - Add DNS records to your domain registrar

2. **Typical DNS Records:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   
   OR
   
   Type: A
   Name: @
   Value: 76.76.19.165
   ```

3. **Wait for DNS Propagation**
   - Can take 15 minutes to 48 hours
   - Vercel will show status in dashboard

---

## Step 4: Configure Build & Deploy Settings

In Vercel Project Settings:

### 4.1 Build Settings
```
Framework: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm ci
Development Command: npm run dev
```

### 4.2 Node.js Version
- Set to Node.js 18 LTS or higher
- Go to Settings → General → Node.js Version
- Select version compatible with your `package.json`

### 4.3 Serverless Function Configuration
- If using API routes, ensure:
  - Max Duration: 60 seconds (for long-running requests like chat)
  - Memory: 1024 MB (default, adequate for most uses)

### 4.4 Caching & CDN
- Enable automatic caching
- Set cache headers for static assets

---

## Step 5: Configure GitHub Deployment Integration

### 5.1 Auto-Deploy on Push

Vercel automatically deploys when you push to your repository:

```bash
# Make changes locally
git add .
git commit -m "feat: Add new feature"
git push origin main

# Vercel automatically:
# 1. Detects push to main branch
# 2. Triggers new deployment
# 3. Runs build (npm run build)
# 4. Deploys to staging/preview first
# 5. Shows preview URL in GitHub PR (if PR)
# 6. Promotes to production after review
```

### 5.2 Preview Deployments

For each pull request:
- Vercel creates a preview deployment
- GitHub shows preview URL as comment
- Review changes before merging
- Auto-delete preview after PR closes

### 5.3 Production Deployments

- Only push to `main` branch triggers production deployment
- Recommended: Require PR reviews before merging to main
- Use `git tag` for version control

---

## Step 6: Environment-Specific Configuration

### Development/Preview
```env
NEXT_PUBLIC_API_URL=https://aistudyplannerbackend-dev.onrender.com
NEXT_PUBLIC_ENV=development
```

### Production
```env
NEXT_PUBLIC_API_URL=https://aistudyplannerbackend.onrender.com
NEXT_PUBLIC_ENV=production
```

**Set in Vercel Dashboard:**
- Go to Settings → Environment Variables
- Add separate values for Preview vs. Production

---

## Step 7: Verify Deployment

### 7.1 Check Deployment Status
- [ ] Go to vercel.com/dashboard
- [ ] Select your project
- [ ] Look for green checkmark ✓ next to latest deployment
- [ ] Click deployment to see details

### 7.2 Test Application
- [ ] Visit deployed URL
- [ ] Login with test account
- [ ] Upload a material
- [ ] Create a timetable entry
- [ ] Send a chat message
- [ ] Verify all features work

### 7.3 Check for Errors
- [ ] Open browser DevTools Console (F12)
- [ ] Check for JavaScript errors
- [ ] Go to Network tab
- [ ] Verify API calls to backend succeed
- [ ] Check for 4xx or 5xx HTTP errors

### 7.4 Performance Monitoring
- [ ] In Vercel Dashboard, click "Analytics"
- [ ] View Core Web Vitals:
  - [ ] LCP (Largest Contentful Paint) < 2.5s
  - [ ] FID (First Input Delay) < 100ms
  - [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] View traffic and errors

---

## Step 8: SSL Certificate & Security

Vercel automatically provides:
- [ ] Free SSL certificate (HTTPS)
- [ ] Automatic renewal
- [ ] Security headers configured

**Verify:**
```bash
# Check SSL certificate
curl -I https://your-domain.vercel.app
# Should show: "Strict-Transport-Security"
# Should show: "Content-Security-Policy"
```

---

## Step 9: Set Up Monitoring & Alerts

### 9.1 Error Tracking
- Install Sentry (optional but recommended):
  ```bash
  npm install @sentry/nextjs
  ```
- Configure in `next.config.js`
- Get error notifications on production issues

### 9.2 Uptime Monitoring
- Use service like UptimeRobot or Pingdom
- Monitor: https://your-domain.vercel.app/health
- Get alerts if site goes down

### 9.3 Analytics
- Vercel has built-in Web Analytics
- Enable in Project Settings
- Track user behavior and errors

---

## Step 10: Continuous Integration/Continuous Deployment (CI/CD)

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        working-directory: frontend
      
      - name: Run tests
        run: npm run test -- --run
        working-directory: frontend
      
      - name: Build
        run: npm run build
        working-directory: frontend
      
      - name: Deploy to Vercel
        run: vercel --prod
        working-directory: frontend
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
```

---

## Troubleshooting

### Issue: Build Fails

**Error:** `npm ERR! code ENOENT`

**Solution:**
```bash
# Verify package.json exists in /frontend
ls frontend/package.json

# Check root directory setting in Vercel
# Should be: frontend/
```

### Issue: Environment Variables Not Available

**Error:** `undefined` values in app

**Solution:**
1. Verify variables have `NEXT_PUBLIC_` prefix
2. Redeploy after adding variables
3. Check variable name matches exactly

### Issue: API Calls Failing

**Error:** `CORS error` or `Cannot POST /api/...`

**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check backend API is running and accessible
3. Verify CORS settings on backend
4. Check API endpoint paths match

### Issue: Static Files Not Loading

**Error:** 404 for `/images/...` or `/styles/...`

**Solution:**
1. Verify files exist in `public/` directory
2. Check file paths are correct
3. Rebuild and redeploy

### Issue: Deployment Takes Too Long

**Error:** Deployment timeout after 15 minutes

**Solution:**
1. Check build logs for slow step
2. Optimize dependencies (remove unused)
3. Use `npm ci` instead of `npm install`
4. Increase build timeout in `vercel.json`

---

## Production Checklist

Before marking deployment complete:

- [ ] Deployment successful (green checkmark in Vercel)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (HTTPS working)
- [ ] All environment variables set
- [ ] No console errors
- [ ] API calls to backend working
- [ ] Login/logout working
- [ ] File upload working
- [ ] Chat messages sending
- [ ] Analytics/monitoring configured
- [ ] Error tracking (Sentry) configured
- [ ] GitHub deployment integration working
- [ ] Performance metrics acceptable

---

## Post-Deployment Tasks

1. **Notify Stakeholders**
   - Share deployment URL
   - Share staging/production URLs

2. **Monitor First 24 Hours**
   - Check error logs frequently
   - Monitor performance metrics
   - Be ready for quick rollback if needed

3. **Set Up Status Page**
   - Create status.io page (optional)
   - Share with users

4. **Documentation**
   - Update README with deployment URL
   - Document deployment process
   - Create runbook for deployments

---

## Rollback (If Needed)

If deployment has critical issues:

### Via Vercel Dashboard
1. Go to Deployments
2. Find previous stable deployment
3. Click "..." menu
4. Click "Promote to Production"

### Via GitHub
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Vercel will automatically rebuild
```

---

## Useful Vercel Commands

```bash
# Deploy to staging
vercel

# Deploy to production
vercel --prod

# List all deployments
vercel ls

# View logs
vercel logs

# Pull environment variables
vercel env pull

# Remove old deployments
vercel remove [url]

# Get project info
vercel projects list
```

---

## Support & Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/learn/basics/deploying-nextjs-app
- **Vercel CLI Reference:** https://vercel.com/cli
- **Community Support:** https://github.com/vercel/next.js/discussions

---

## Deployment Completed ✓

- **Frontend URL:** [Your Vercel URL]
- **Custom Domain:** [Your domain]
- **Deployment Date:** July 22, 2026
- **Deployed By:** [Your name]
- **Backend API:** https://aistudyplannerbackend.onrender.com
- **Status:** ✓ Live in Production

---

**End of Vercel Deployment Guide**
