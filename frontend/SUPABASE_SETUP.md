# ExamGuardian — Supabase Setup

Run these steps once in your [Supabase dashboard](https://supabase.com/dashboard).

## 1. Create project

Create a new Supabase project and copy:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service role key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to client)

Copy `frontend/.env.example` to `frontend/.env.local` and fill in the values.

## 2. Run database schema

In **SQL Editor**, run in order:
1. `frontend/src/lib/schema_fixed.sql` (Fixed version with proper table creation order)
2. `frontend/src/lib/rls.sql`
3. `frontend/src/lib/migration_fix_cascade.sql` (only if you have existing PDF uploads)

## 3. Create storage bucket

In **Storage**, create a private bucket named `pdfs`.

Or run in SQL Editor:

```sql
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;
```

Add storage policy so teachers can upload:

```sql
create policy "Teachers upload PDFs"
on storage.objects for insert
with check (bucket_id = 'pdfs' and auth.role() = 'authenticated');

create policy "Teachers read own PDFs"
on storage.objects for select
using (bucket_id = 'pdfs' and auth.role() = 'authenticated');
```

## 4. Enable email auth

In **Authentication → Providers**, enable Email and configure redirect URLs:

**For local development:**
- `http://localhost:3000/auth`
- `http://localhost:3000/**`

**For Vercel deployment:**
- `https://your-vercel-domain.vercel.app/auth`
- `https://your-vercel-domain.vercel.app/**`

## 4.5. Disable email verification (for development/testing)

**IMPORTANT FOR TESTING:** To disable email verification during development:

1. In Supabase Dashboard, go to **Authentication → Providers → Email**
2. Scroll down to **Confirm email** section
3. **Turn OFF** "Confirm email" 
4. Click **Save**

This allows teachers to sign up and log in immediately without email verification.

**Remember to re-enable this before production deployment for security.**

## 5. Other API keys

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | AI question generation from PDFs/images |
| `RESEND_API_KEY` | Email notifications |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Separate admin portal login |
| `CRON_SECRET_KEY` | PDF cleanup job authentication |

## 6. PDF Cleanup Job Setup

The system includes an automatic PDF cleanup mechanism that deletes expired PDFs (24 hours after upload).

### Option 1: Use External Cron Service (Recommended for development)

1. Deploy your application to Vercel or another hosting platform
2. Set up a cron job (cron-job.org, EasyCron, etc.) to call:
   ```
   POST https://your-domain.com/api/cleanup/pdfs
   Headers: Authorization: Bearer YOUR_CRON_SECRET_KEY
   ```
3. Set the cron to run every hour

### Option 2: Supabase Edge Function (Production)

1. Deploy the Edge Function from `supabase/functions/pdf-cleanup/index.ts`
2. Set up a Supabase cron job to trigger it every hour
3. Configure the `CRON_SECRET_KEY` environment variable

## 7. Run locally

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`
