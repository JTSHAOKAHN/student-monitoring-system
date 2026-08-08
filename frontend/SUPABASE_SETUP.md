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
1. `frontend/src/lib/schema.sql`
2. `frontend/src/lib/rls.sql`

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

In **Authentication → Providers**, enable Email and configure redirect URLs for local dev:
- `http://localhost:3000/auth`

## 5. Other API keys

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | AI question generation from PDFs/images |
| `RESEND_API_KEY` | Email notifications |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Separate admin portal login |

## 6. Run locally

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`
