import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function paypalBaseUrl() {
  const env = Deno.env.get("PAYPAL_ENV") || "sandbox";
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPaypalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  }

  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal token error: ${body}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reservationId, amountMode, customAmount } = await req.json();
    if (!reservationId) {
      return new Response(JSON.stringify({ error: "reservationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .select("id,reservation_code,total,grand_total,deposit_required,currency,payment_status,status")
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      return new Response(JSON.stringify({ error: "Reservation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: capturedPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("reservation_id", reservation.id)
      .eq("status", "captured");

    const alreadyPaid = (capturedPayments || []).reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const baseTotal = Number(reservation.grand_total || reservation.total || 0);
    const remaining = Math.max(baseTotal - alreadyPaid, 0);

    if (remaining <= 0) {
      return new Response(JSON.stringify({ error: "La reserva ya esta completamente pagada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let amountToCharge = remaining;
    if (amountMode === "deposito") {
      const depositTarget = Number(reservation.deposit_required || 0);
      const missingDeposit = Math.max(depositTarget - alreadyPaid, 0);
      amountToCharge = Math.max(Math.min(missingDeposit || remaining, remaining), 0.01);
    }

    if (customAmount != null) {
      const parsedCustom = Number(customAmount);
      if (Number.isFinite(parsedCustom) && parsedCustom > 0) {
        amountToCharge = Math.min(parsedCustom, remaining);
      }
    }

    const accessToken = await getPaypalAccessToken();

    const orderRes = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: reservation.id,
            custom_id: reservation.reservation_code,
            amount: {
              currency_code: reservation.currency || "USD",
              value: Number(amountToCharge).toFixed(2),
            },
          },
        ],
      }),
    });

    if (!orderRes.ok) {
      const body = await orderRes.text();
      return new Response(JSON.stringify({ error: "Could not create PayPal order", details: body }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = await orderRes.json();
    const approveLink = (order.links || []).find((l: { rel: string }) => l.rel === "approve")?.href;

    const { error: paymentError } = await supabase.from("payments").insert({
      reservation_id: reservation.id,
      provider: "paypal",
      status: "created",
      paypal_order_id: order.id,
      amount: amountToCharge,
      currency: reservation.currency || "USD",
      raw_payload: order,
    });

    if (paymentError) {
      return new Response(JSON.stringify({ error: "PayPal order created but payment row failed", details: paymentError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        orderId: order.id,
        approveLink,
        amount: amountToCharge,
        remaining,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
