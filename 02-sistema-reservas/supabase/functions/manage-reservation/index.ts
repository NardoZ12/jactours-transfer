import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nowUtc() {
  return new Date();
}

function parseServiceDateTime(serviceDate: string, serviceTime: string | null) {
  const datePart = serviceDate;
  const timePart = serviceTime || "00:00:00";
  return new Date(`${datePart}T${timePart}Z`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, action, reason, newServiceDate, newServiceTime } = body;

    if (!token || !action) {
      return new Response(JSON.stringify({ error: "token y action son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["cancel", "reschedule"].includes(action)) {
      return new Response(JSON.stringify({ error: "action debe ser cancel o reschedule" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: reservation, error } = await supabase
      .from("reservations")
      .select("id,reservation_code,status,service_id,service_date,service_time,adults,children,infants")
      .eq("customer_token", token)
      .single();

    if (error || !reservation) {
      return new Response(JSON.stringify({ error: "Reserva no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (["cancelled", "completed", "no_show"].includes(reservation.status)) {
      return new Response(JSON.stringify({ error: "La reserva no permite cambios" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: service } = await supabase
      .from("services")
      .select("id,cancellation_hours")
      .eq("id", reservation.service_id)
      .single();

    const cancellationWindowHours = Number(service?.cancellation_hours || 24);
    const reservationDateTime = parseServiceDateTime(reservation.service_date, reservation.service_time);
    const cutoff = new Date(reservationDateTime.getTime() - cancellationWindowHours * 60 * 60 * 1000);

    if (nowUtc() > cutoff) {
      return new Response(JSON.stringify({ error: `No se puede modificar dentro de las ${cancellationWindowHours}h previas al servicio` }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pax = Number(reservation.adults || 0) + Number(reservation.children || 0) + Number(reservation.infants || 0);

    if (action === "cancel") {
      await supabase
        .from("reservations")
        .update({
          status: "cancelled",
          cancellation_reason: reason || null,
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", reservation.id);

      if (reservation.service_date) {
        const slotTime = reservation.service_time || "00:00:00";
        const { data: slot } = await supabase
          .from("service_inventory_slots")
          .select("id,reserved")
          .eq("service_id", reservation.service_id)
          .eq("service_date", reservation.service_date)
          .eq("service_time", slotTime)
          .eq("unit_key", "general")
          .maybeSingle();

        if (slot?.id) {
          await supabase
            .from("service_inventory_slots")
            .update({ reserved: Math.max(Number(slot.reserved || 0) - pax, 0) })
            .eq("id", slot.id);
        }
      }

      await supabase.from("reservation_customer_actions").insert({
        reservation_id: reservation.id,
        action_type: "cancelacion",
        old_service_date: reservation.service_date,
        old_service_time: reservation.service_time,
        reason: reason || null,
      });

      await supabase.from("reservation_events").insert({
        reservation_id: reservation.id,
        event_type: "reservation_cancelled",
        old_value: reservation.status,
        new_value: "cancelled",
        notes: reason || "Cancelacion solicitada por cliente",
      });

      return new Response(JSON.stringify({ ok: true, status: "cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newServiceDate) {
      return new Response(JSON.stringify({ error: "newServiceDate es requerido para reprogramacion" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetTime = newServiceTime || reservation.service_time || "00:00:00";
    const { data: existingSlot } = await supabase
      .from("service_inventory_slots")
      .select("id,capacity,reserved")
      .eq("service_id", reservation.service_id)
      .eq("service_date", newServiceDate)
      .eq("service_time", targetTime)
      .eq("unit_key", "general")
      .maybeSingle();

    const defaultCapacity = existingSlot?.capacity || 9999;
    const reserved = Number(existingSlot?.reserved || 0);

    if (reserved + pax > Number(defaultCapacity)) {
      return new Response(JSON.stringify({ error: "Sin cupo para la nueva fecha/hora" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingSlot?.id) {
      await supabase
        .from("service_inventory_slots")
        .update({ reserved: reserved + pax })
        .eq("id", existingSlot.id);
    } else {
      await supabase.from("service_inventory_slots").insert({
        service_id: reservation.service_id,
        service_date: newServiceDate,
        service_time: targetTime,
        unit_key: "general",
        capacity: defaultCapacity,
        reserved: pax,
      });
    }

    const currentTime = reservation.service_time || "00:00:00";
    const { data: currentSlot } = await supabase
      .from("service_inventory_slots")
      .select("id,reserved")
      .eq("service_id", reservation.service_id)
      .eq("service_date", reservation.service_date)
      .eq("service_time", currentTime)
      .eq("unit_key", "general")
      .maybeSingle();

    if (currentSlot?.id) {
      await supabase
        .from("service_inventory_slots")
        .update({ reserved: Math.max(Number(currentSlot.reserved || 0) - pax, 0) })
        .eq("id", currentSlot.id);
    }

    await supabase
      .from("reservations")
      .update({
        service_date: newServiceDate,
        service_time: newServiceTime || reservation.service_time,
      })
      .eq("id", reservation.id);

    await supabase.from("reservation_customer_actions").insert({
      reservation_id: reservation.id,
      action_type: "reprogramacion",
      old_service_date: reservation.service_date,
      old_service_time: reservation.service_time,
      new_service_date: newServiceDate,
      new_service_time: newServiceTime || reservation.service_time,
      reason: reason || null,
    });

    await supabase.from("reservation_events").insert({
      reservation_id: reservation.id,
      event_type: "reservation_rescheduled",
      old_value: `${reservation.service_date} ${reservation.service_time || ""}`.trim(),
      new_value: `${newServiceDate} ${newServiceTime || reservation.service_time || ""}`.trim(),
      notes: reason || "Reprogramacion solicitada por cliente",
    });

    return new Response(JSON.stringify({ ok: true, status: "rescheduled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
