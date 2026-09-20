import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Stripe-Signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const bodyText = await req.text();
    const payload = JSON.parse(bodyText);
    const eventType = payload.type || payload.event_name;

    console.log(`[Stripe Webhook] Processing event: ${eventType}`);

    if (eventType === "checkout.session.completed" || eventType === "customer.subscription.created") {
      const session = payload.data?.object || payload.data;
      const userId = session.client_reference_id || session.metadata?.user_id;
      const customerEmail = session.customer_details?.email || session.customer_email;
      const planId = session.metadata?.plan || "pro";

      if (userId) {
        await supabase
          .from("user_profiles")
          .upsert(
            {
              user_id: userId,
              subscription_tier: planId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        console.log(`[Stripe Webhook] Upgraded user ${userId} to ${planId}`);
      } else if (customerEmail) {
        // Fallback email lookup
        const { data: userData } = await supabase
          .from("auth.users")
          .select("id")
          .eq("email", customerEmail)
          .maybeSingle();

        if (userData?.id) {
          await supabase
            .from("user_profiles")
            .upsert(
              {
                user_id: userData.id,
                subscription_tier: planId,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );
          console.log(`[Stripe Webhook] Upgraded user by email ${customerEmail} to ${planId}`);
        }
      }
    } else if (eventType === "customer.subscription.deleted") {
      const session = payload.data?.object || payload.data;
      const userId = session.metadata?.user_id;

      if (userId) {
        await supabase
          .from("user_profiles")
          .update({
            subscription_tier: "free",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        console.log(`[Stripe Webhook] Downgraded user ${userId} to free`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Stripe Webhook Error]:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
