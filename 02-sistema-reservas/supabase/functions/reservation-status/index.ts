import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reservationCode, email, token } = await req.json();
    if (!reservationCode && !token) {
      return new Response(JSON.stringify({ error: "reservationCode o token es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let query = supabase
      .from("reservations")
      .select("id,reservation_code,status,payment_status,lead_stage,service_date,service_time,customer_name,customer_email,customer_phone,hotel,pickup_address,notes,subtotal,extras_amount,tax_amount,discount,commission_amount,grand_total,amount_paid,amount_due,currency,customer_token,created_at,updated_at")
      .limit(1);

    if (token) {
      query = query.eq("customer_token", token);
    } else {
      query = query.eq("reservation_code", reservationCode);
      if (email) {
        query = query.eq("customer_email", String(email).trim().toLowerCase());
      }
    }

    const { data: reservation, error } = await query.maybeSingle();

    if (error || !reservation) {
      return new Response(JSON.stringify({ error: "Reserva no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: extras } = await supabase
      .from("reservation_extras")
      .select("code,title,quantity,unit_price,total")
      .eq("reservation_id", reservation.id);

    const { data: payments } = await supabase
      .from("payments")
      .select("id,status,amount,currency,provider,created_at,paypal_order_id,paypal_capture_id")
      .eq("reservation_id", reservation.id)
      .order("created_at", { ascending: false });

    const { data: assignments } = await supabase
      .from("reservation_assignments")
      .select("resource_type,resource_name,resource_id,assigned_at,notes")
      .eq("reservation_id", reservation.id)
      .order("assigned_at", { ascending: false });

    const { data: events } = await supabase
      .from("reservation_events")
      .select("event_type,old_value,new_value,notes,created_at")
      .eq("reservation_id", reservation.id)
      .order("created_at", { ascending: false })
      .limit(30);

    return new Response(JSON.stringify({ reservation, extras: extras || [], payments: payments || [], assignments: assignments || [], events: events || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
