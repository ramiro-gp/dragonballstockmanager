# Supabase setup

## SQL

Run these files in Supabase SQL Editor:

1. `security_hardening_v1.sql`
2. `admin_tools_v1.sql`
3. `catalog_master_v1.sql`
4. `catalog_master_fix_404_407.sql` if you already ran the first catalog migration before June 16, 2026.
5. `stock_catalog_validation_v1.sql`
6. `stock_reserved_sold_v1.sql`

Paste each file completely in a new query and run it.

`catalog_master_v1.sql` creates the master Cromeros catalog and links current `stock_cards` rows when possible. It is additive: it does not delete stock, products, sales, or seller data.

`catalog_master_fix_404_407.sql` inserts missing hidden cards 404-407 for projects that already ran the first catalog migration.

`stock_catalog_validation_v1.sql` makes Supabase reject invalid card stock writes and auto-fill `catalog_card_id` when possible.

`stock_reserved_sold_v1.sql` makes reserved sales reserve stock and confirmed sales decrement stock permanently, keeps public checkout validation aligned with `quantity - reserved`, and adds the optional internal delivery status for sales, without rewriting existing rows.

## Optional resets

Run `reset_operational_data_v1.sql` only when you intentionally want to start the app with a clean operational database.

It keeps Auth users, owner seller profiles, owner settings, and the Cromeros master catalog. It deletes seller stock, products, sales, sale lines, payments, balance adjustments, and non-owner seller profiles.

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
