import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomPassword() {
  return `${crypto.randomUUID()}A1!`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const required = ["service_id", "service_date", "customer_name", "customer_email", "adults"];
    for (const field of required) {
      if (!body[field]) {
        return new Response(JSON.stringify({ error: `Missing field: ${field}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const normalizedEmail = String(body.customer_email).trim().toLowerCase();
    const customerName = String(body.customer_name).trim();
    const customerPhone = body.customer_phone ? String(body.customer_phone).trim() : null;

    const { data: customerUpsert, error: customerUpsertError } = await supabase
      .from("customer_profiles")
      .upsert(
        {
          email: normalizedEmail,
          full_name: customerName,
          phone: customerPhone,
        },
        { onConflict: "email" },
      )
      .select("id,email,auth_user_id")
      .single();

    if (customerUpsertError || !customerUpsert) {
      return new Response(JSON.stringify({ error: customerUpsertError?.message || "Could not upsert customer profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let customerAuthUserId: string | null = customerUpsert.auth_user_id;
    let customerUserCreated = false;

    if (!customerAuthUserId) {
      const createUserRes = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: randomPassword(),
        email_confirm: false,
        user_metadata: {
          full_name: customerName,
          source: "reservation_checkout",
        },
      });

      if (!createUserRes.error && createUserRes.data.user?.id) {
        customerAuthUserId = createUserRes.data.user.id;
        customerUserCreated = true;

        await supabase
          .from("customer_profiles")
          .update({ auth_user_id: customerAuthUserId })
          .eq("id", customerUpsert.id);
      }
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id,base_price,currency,active")
      .eq("id", body.service_id)
      .single();

    if (serviceError || !service || !service.active) {
      return new Response(JSON.stringify({ error: "Service not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adults = Number(body.adults || 0);
    const children = Number(body.children || 0);
    const infants = Number(body.infants || 0);
    const pax = adults + children + infants;

    const subtotal = Number(service.base_price) * Math.max(pax, 1);
    const discount = Number(body.discount || 0);
    const total = Math.max(subtotal - discount, 0);

    const payload = {
      service_id: service.id,
      service_date: body.service_date,
      service_time: body.service_time || null,
      customer_name: customerName,
      customer_email: normalizedEmail,
      customer_phone: customerPhone,
      customer_auth_user_id: customerAuthUserId,
      hotel: body.hotel || null,
      pickup_address: body.pickup_address || null,
      notes: body.notes || null,
      adults,
      children,
      infants,
      subtotal,
      discount,
      total,
      currency: body.currency || service.currency || "USD",
      sales_channel: "web",
      status: "pending",
      payment_status: "unpaid",
    };

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert(payload)
      .select("id,reservation_code,total,currency,status,payment_status")
      .single();

    if (reservationError || !reservation) {
      return new Response(JSON.stringify({ error: reservationError?.message || "Could not create reservation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reservation, customerUserCreated, customerAuthUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
