import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CreateSellerPayload = {
  email?: string;
  password?: string;
  slug?: string;
  displayName?: string;
  whatsapp?: string;
  location?: string;
  months?: number;
  lifetime?: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Missing Supabase environment variables" }, 500);
    }

    const authorization = request.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const { data: ownerData, error: ownerError } = await adminClient
      .from("sellers")
      .select("id, role")
      .eq("id", authData.user.id)
      .eq("role", "owner")
      .maybeSingle();
    if (ownerError || !ownerData) return json({ error: "Not allowed" }, 403);

    const payload = await request.json() as CreateSellerPayload;
    const email = payload.email?.trim().toLowerCase() ?? "";
    const password = payload.password ?? "";
    const slug = normalizeSlug(payload.slug ?? payload.displayName ?? "");
    const displayName = payload.displayName?.trim() ?? "";
    const whatsapp = payload.whatsapp?.trim() ?? "";
    const location = payload.location?.trim() || "CABA";
    const months = Math.min(12, Math.max(1, Number(payload.months ?? 1)));
    const lifetime = Boolean(payload.lifetime);

    if (!email.includes("@") || password.length < 8 || slug.length < 3 || displayName.length < 2 || whatsapp.length < 8) {
      return json({ error: "Invalid seller payload" }, 400);
    }

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !createdUser.user) {
      return json({ error: createError?.message ?? "Could not create auth user" }, 400);
    }

    const sellerId = createdUser.user.id;
    const subscriptionUntil = lifetime ? null : addMonths(new Date(), months);

    const { error: sellerError } = await adminClient.from("sellers").upsert({
      id: sellerId,
      slug,
      display_name: displayName,
      whatsapp,
      role: "seller",
      active: true,
      location,
      shipping_enabled: false,
      shipping_companies: [],
      subscription_plan: lifetime ? "lifetime" : "monthly",
      subscription_until: subscriptionUntil,
    }, { onConflict: "id" });
    if (sellerError) return json({ error: sellerError.message }, 400);

    const { error: settingsError } = await adminClient.from("seller_settings").upsert({
      seller_id: sellerId,
      default_common_price_ars: 400,
      default_fluor_price_ars: 700,
      default_holo_price_ars: 2000,
    }, { onConflict: "seller_id" });
    if (settingsError) return json({ error: settingsError.message }, 400);

    return json({ sellerId, slug }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}
