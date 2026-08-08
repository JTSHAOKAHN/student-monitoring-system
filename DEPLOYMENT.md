# ExamGuardian — Vercel Deployment Guide

## Important: Authentication Issues with Vercel Deployment

The authentication failure you're experiencing is likely due to **Supabase redirect URL configuration**. Supabase requires your deployment URL to be configured in their dashboard for authentication to work properly.

## Step 1: Configure Supabase Redirect URLs

Before deploying to Vercel, you MUST configure your Supabase project:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication → URL Configuration**
4. Add your Vercel deployment URL (you'll get this after deploying):
   - For example: `https://your-app.vercel.app/auth`
   - Also add: `https://your-app.vercel.app/**`

**Alternative for testing:** Use `http://localhost:3000/**` during development

## Step 2: Configure Vercel Environment Variables

**IMPORTANT:** Since your project structure has the Next.js app in the `frontend` folder, Vercel should automatically detect this. If not, make sure to set the "Root Directory" to `frontend` in your Vercel project settings.

In your Vercel project settings, add these environment variables:

### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_email@example.com
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
ADMIN_SESSION_SECRET=generate-a-random-secret-for-production
```

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI
```bash
npm install -g vercel
cd C:\Users\jjjjt\OneDrive\Desktop\Student-Monitoring-System
vercel
```

### Option B: Using Vercel Dashboard
1. Push your code to GitHub
2. Import your repository in Vercel
3. Vercel will automatically detect the Next.js project
4. The root directory should be automatically detected as `frontend`
5. Add environment variables from Step 2
6. Deploy

## Step 4: Update Supabase with Production URL

After Vercel deployment:
1. Copy your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Go back to Supabase Dashboard → Authentication → URL Configuration
3. Add your production URL:
   - `https://your-app.vercel.app/auth`
   - `https://your-app.vercel.app/**`

## Step 5: Create Teacher Account

Teachers use Supabase Auth (separate from admin):

1. After deployment, go to `https://your-app.vercel.app/auth?role=teacher`
2. Click "Sign up"
3. Enter teacher email and password
4. This creates a teacher account in Supabase
5. Use these credentials to log in as teacher

## Login Credentials Summary

### Admin Portal:
- **URL**: `/admin/login`
- **Username**: Set in ADMIN_USERNAME environment variable
- **Password**: Set in ADMIN_PASSWORD environment variable

### Teacher Portal:
- **URL**: `/auth?role=teacher`
- **Email**: You need to create this via Supabase Auth sign-up
- **Password**: You set this during sign-up

### Student Portal:
- **URL**: `/student/login`
- **Student ID**: Student 1-35
- **Passcode**: `student123` (default)

## Troubleshooting Authentication Issues

### Issue: "Authentication failed" on Vercel
**Solution**: Configure Supabase redirect URLs with your Vercel domain

### Issue: "Database connection failed"
**Solution**: Ensure SUPABASE_SERVICE_ROLE_KEY is correct in Vercel environment variables

### Issue: "CORS errors"
**Solution**: Add your Vercel domain to Supabase allowed origins in API settings

### Issue: "Environment variables not working"
**Solution**: 
1. Make sure variables are set in Vercel project settings (not just locally)
2. Redeploy after adding environment variables
3. Variables starting with `NEXT_PUBLIC_` are available in browser

## Current .env.local Configuration

Your `.env.local` file should include all the required API keys and configuration values. Make sure to add these to Vercel environment variables during deployment.

## Important Security Notes

1. **Never commit** `.env.local` to git (it's already in .gitignore)
2. **Change default passwords** before production deployment
3. **Generate a random ADMIN_SESSION_SECRET** for production
4. **Use strong passwords** for teacher accounts
5. **Enable Supabase RLS** policies (already configured in rls.sql)

## Testing Checklist Before Production

- [ ] Supabase redirect URLs configured
- [ ] All environment variables set in Vercel
- [ ] Database schema executed in Supabase
- [ ] Storage bucket created with policies
- [ ] Teacher account created via Supabase Auth
- [ ] Student login works (Student 1-35)
- [ ] Admin login works
- [ ] PDF upload functionality tested
- [ ] Email notifications tested (if using Resend)
