# Supabase setup

## SQL

Run these files in Supabase SQL Editor:

1. `security_hardening_v1.sql`
2. `admin_tools_v1.sql`

Paste each file completely in a new query and run it.

## Edge Functions

Deploy the seller creation function:

```bash
supabase functions deploy admin-create-seller
```

The function lets the owner create a seller from the app without exposing the service role key in the frontend.

It uses Supabase Edge Function environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

