import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomPassword() {
  return `${crypto.randomUUID()}A1!`;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
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
      .select("id,base_price,offer_price,offer_active,currency,active")
      .eq("id", body.service_id)
      .single();

    if (serviceError || !service || !service.active) {
      return new Response(JSON.stringify({ error: "Service not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adults = toNumber(body.adults, 0);
    const children = toNumber(body.children, 0);
    const infants = toNumber(body.infants, 0);
    const pax = adults + children + infants;

    const rawExtras = Array.isArray(body.extras) ? body.extras : [];
    const extras = rawExtras
      .map((item: Record<string, unknown>) => {
        const quantity = Math.max(toNumber(item.quantity, 1), 1);
        const unitPrice = Math.max(toNumber(item.unit_price, 0), 0);
        return {
          code: item.code ? String(item.code) : null,
          title: String(item.title || "Extra"),
          quantity,
          unit_price: roundMoney(unitPrice),
          total: roundMoney(quantity * unitPrice),
        };
      })
      .filter((extra: { total: number }) => extra.total > 0);

    const extrasAmount = roundMoney(extras.reduce((acc: number, item: { total: number }) => acc + item.total, 0));
    const unitPrice = service.offer_active && service.offer_price != null
      ? Number(service.offer_price)
      : Number(service.base_price);
    const subtotal = roundMoney(unitPrice * Math.max(pax, 1));
    const discount = roundMoney(Math.max(toNumber(body.discount, 0), 0));
    const taxAmount = roundMoney(Math.max(toNumber(body.tax_amount, 0), 0));
    const commissionAmount = roundMoney(Math.max(toNumber(body.commission_amount, 0), 0));
    const grandTotal = roundMoney(Math.max(subtotal + extrasAmount + taxAmount - discount + commissionAmount, 0));
    const depositPct = Math.max(Math.min(toNumber(body.deposit_percent, 100), 100), 0);
    const paymentDueMode = depositPct > 0 && depositPct < 100 ? "deposito" : "total";
    const depositRequired = roundMoney(grandTotal * (depositPct / 100));

    const slotTime = body.service_time || "00:00:00";

    const { data: slot } = await supabase
      .from("service_inventory_slots")
      .select("id,capacity,reserved")
      .eq("service_id", service.id)
      .eq("service_date", body.service_date)
      .eq("service_time", slotTime)
      .eq("unit_key", "general")
      .maybeSingle();

    const currentReserved = Number(slot?.reserved || 0);
    const slotCapacity = Number(slot?.capacity || service.capacity_total || 9999);

    if (currentReserved + pax > slotCapacity) {
      return new Response(JSON.stringify({ error: "No hay cupo disponible para la fecha/hora seleccionada" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      extras_amount: extrasAmount,
      tax_amount: taxAmount,
      commission_amount: commissionAmount,
      discount,
      total: grandTotal,
      grand_total: grandTotal,
      deposit_required: depositRequired,
      amount_due: grandTotal,
      payment_due_mode: paymentDueMode,
      currency: body.currency || service.currency || "USD",
      sales_channel: "web",
      status: "pending",
      payment_status: "unpaid",
    };

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert(payload)
      .select("id,reservation_code,total,grand_total,currency,status,payment_status,customer_token")
      .single();

    if (reservationError || !reservation) {
      return new Response(JSON.stringify({ error: reservationError?.message || "Could not create reservation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (extras.length > 0) {
      const extrasRows = extras.map((item: { code: string | null; title: string; quantity: number; unit_price: number; total: number }) => ({
        reservation_id: reservation.id,
        code: item.code,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: extrasError } = await supabase.from("reservation_extras").insert(extrasRows);
      if (extrasError) {
        return new Response(JSON.stringify({ error: extrasError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (slot?.id) {
      const { error: slotUpdateError } = await supabase
        .from("service_inventory_slots")
        .update({ reserved: currentReserved + pax })
        .eq("id", slot.id);

      if (slotUpdateError) {
        return new Response(JSON.stringify({ error: slotUpdateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { error: slotInsertError } = await supabase
        .from("service_inventory_slots")
        .insert({
          service_id: service.id,
          service_date: body.service_date,
          service_time: slotTime,
          unit_key: "general",
          capacity: slotCapacity,
          reserved: pax,
        });

      if (slotInsertError) {
        return new Response(JSON.stringify({ error: slotInsertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await supabase.from("reservation_events").insert({
      reservation_id: reservation.id,
      event_type: "reservation_created",
      new_value: reservation.status,
      notes: `Reserva creada por ${normalizedEmail}`,
    });

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
