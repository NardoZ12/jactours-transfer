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

async function verifyWebhookSignature(req: Request, body: unknown) {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    throw new Error("Missing PAYPAL_WEBHOOK_ID");
  }

  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");
  const transmissionSig = req.headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    throw new Error("Missing PayPal signature headers");
  }

  const accessToken = await getPaypalAccessToken();

  const verifyRes = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: body,
    }),
  });

  if (!verifyRes.ok) {
    const payload = await verifyRes.text();
    throw new Error(`PayPal verify webhook error: ${payload}`);
  }

  const verify = await verifyRes.json();
  return verify.verification_status === "SUCCESS";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType = body?.event_type as string;
    const orderId = body?.resource?.supplementary_data?.related_ids?.order_id || body?.resource?.id;
    const captureId = body?.resource?.id;

    if (!eventType || !orderId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: payment } = await supabase
      .from("payments")
      .select("id,reservation_id")
      .eq("paypal_order_id", orderId)
      .single();

    if (!payment) {
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: "Payment not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      await supabase.from("payments").update({
        status: "captured",
        paypal_capture_id: captureId,
        raw_payload: body,
      }).eq("id", payment.id);

      await supabase.from("reservations").update({
        payment_status: "paid",
        status: "confirmed",
      }).eq("id", payment.reservation_id);
    }

    if (eventType === "PAYMENT.CAPTURE.DENIED" || eventType === "PAYMENT.CAPTURE.REFUNDED") {
      await supabase.from("payments").update({
        status: eventType === "PAYMENT.CAPTURE.REFUNDED" ? "refunded" : "failed",
        raw_payload: body,
      }).eq("id", payment.id);

      await supabase.from("reservations").update({
        payment_status: eventType === "PAYMENT.CAPTURE.REFUNDED" ? "refunded" : "unpaid",
      }).eq("id", payment.reservation_id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
