# Render Deployment Guide - Nextus API

## Prerequisites

Before deploying, make sure you have:
1. A GitHub account
2. Your code pushed to GitHub
3. A Render.com account (free)

---

## Step 1: Push Code to GitHub

First, make sure your `nextus_api` folder is pushed to GitHub.

### Option A: If you already have a GitHub repo

```bash
cd e:\Vscodeprojects\nexarats\nextusAG\nextus_api
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Option B: If you need to create a new repo

1. Go to [github.com](https://github.com) → Click **"New"** repository
2. Name it: `nextus-api`
3. Keep it Public or Private (your choice)
4. Click **"Create repository"**
5. Then push your code:

```bash
cd e:\Vscodeprojects\nexarats\nextusAG\nextus_api
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nextus-api.git
git push -u origin main
```

---

## Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended - easier deployment)
4. Authorize Render to access your GitHub

---

## Step 3: Create New Web Service

1. In Render Dashboard, click **"New +"** button (top right)
2. Select **"Web Service"**

![New Web Service](https://docs.render.com/img/new-service.png)

---

## Step 4: Connect Your Repository

1. You'll see a list of your GitHub repos
2. Find **`nextus-api`** (or your repo name)
3. Click **"Connect"** next to it

> **Note**: If you don't see your repo, click "Configure account" to give Render access to more repos.

---

## Step 5: Configure Service Settings

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `nextus-api` |
| **Region** | Choose closest to you (e.g., Singapore, Oregon) |
| **Branch** | `main` |
| **Root Directory** | Leave empty (or `nextus_api` if monorepo) |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### Instance Type
- Select **"Free"** (0.1 CPU, 512 MB RAM)

---

## Step 6: Add Environment Variables

Scroll down to **"Environment Variables"** section. Click **"Add Environment Variable"** for each:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `your-super-secret-key-at-least-32-characters-long` |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | `your-supabase-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASS` | `your-app-password` |
| `SMTP_FROM` | `noreply@nextus.app` |

> **Important**: For Gmail SMTP, you need an "App Password" not your regular password.
> Get one at: https://myaccount.google.com/apppasswords

---

## Step 7: Deploy

1. Click **"Create Web Service"** button at bottom
2. Render will start building and deploying
3. Watch the logs - it takes 2-5 minutes

---

## Step 8: Get Your URL

Once deployed, you'll see:
- **Status**: "Live" (green)
- **URL**: `https://nextus-api.onrender.com` (or similar)

Copy this URL!

---

## Step 9: Test Your Deployment

Open browser or terminal:

```bash
curl https://nextus-api.onrender.com/api/v1/health
```

Expected response:
```json
{"success": true, "message": "Server is healthy"}
```

---

## Step 10: Update Flutter App

1. Open the Nextus mobile app
2. On login screen, tap **⚙️ settings icon** (top right)
3. Enter your Render URL: `https://nextus-api.onrender.com`
4. Tap **"Save & Connect"**
5. Should show **"✅ Connected"**
6. Sign in with your email!

---

## Troubleshooting

### "Build failed"
- Check Render logs for errors
- Make sure `package.json` has all dependencies
- Verify Node version in `engines` field

### "Service is sleeping"
- Free tier sleeps after 15 min of inactivity
- First request takes ~30 seconds to wake up
- This is normal for free tier

### "Connection refused" in app
- Make sure you included `/api/v1` in some requests
- Check CORS settings allow your app origin
- Verify environment variables are set correctly

### "Magic code not received"
- Check SMTP settings in Render environment
- Look at Render logs for email errors
- The code is also logged in console: `🔐 Magic code for email: XXXXXX`

---

## Updating Your Deployment

Render auto-deploys when you push to GitHub:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Render will automatically rebuild and deploy!

---

## Summary

Your deployed API is now at:
```
https://nextus-api.onrender.com
```

API endpoints:
- Health: `GET /api/v1/health`
- Send Code: `POST /api/v1/auth/send-code`
- Verify Code: `POST /api/v1/auth/verify-code`
- User Profile: `GET /api/v1/users/me`

🎉 You're live!
