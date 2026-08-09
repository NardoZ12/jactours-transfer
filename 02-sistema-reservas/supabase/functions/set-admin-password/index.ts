import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

const ALLOWED_ROLES = new Set(["admin", "ventas", "operaciones", "contabilidad", "lectura"]);

function generateTempPassword(length = 16) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*_-";
  const all = upper + lower + digits + symbols;

  const pick = (source: string) => source[Math.floor(Math.random() * source.length)];
  const base = [pick(upper), pick(lower), pick(digits), pick(symbols)];

  while (base.length < length) {
    base.push(pick(all));
  }

  for (let i = base.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }

  return base.join("");
}

async function findUserByEmail(supabase: ReturnType<typeof createClient>, email: string) {
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`No se pudo listar usuarios: ${error.message}`);
    }

    const users = data?.users ?? [];
    const found = users.find((u) => (u.email || "").toLowerCase() === email);
    if (found) {
      return found;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const adminSecret = Deno.env.get("ADMIN_BOOTSTRAP_SECRET");
    if (!adminSecret) {
      return new Response(JSON.stringify({ error: "Falta variable ADMIN_BOOTSTRAP_SECRET" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sentSecret = req.headers.get("x-admin-secret") || "";
    if (sentSecret !== adminSecret) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || "Administrador").trim();
    const role = String(body.role || "admin").trim();
    const createIfMissing = body.create_if_missing !== false;
    const emailConfirm = body.email_confirm !== false;

    if (!email) {
      return new Response(JSON.stringify({ error: "email es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return new Response(JSON.stringify({ error: "role invalido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedPassword = body.password ? String(body.password) : "";
    const tempPassword = requestedPassword || generateTempPassword();

    if (tempPassword.length < 8) {
      return new Response(JSON.stringify({ error: "La contrasena debe tener al menos 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    let user = await findUserByEmail(supabase, email);
    let userWasCreated = false;

    if (!user && createIfMissing) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: emailConfirm,
        user_metadata: {
          full_name: fullName,
          source: "admin_bootstrap",
        },
      });

      if (error || !data.user) {
        return new Response(JSON.stringify({ error: error?.message || "No se pudo crear el usuario" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      user = data.user;
      userWasCreated = true;
    }

    if (!user) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado y create_if_missing=false" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: updatedData, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: tempPassword,
      email_confirm: emailConfirm,
      user_metadata: {
        ...(user.user_metadata || {}),
        full_name: fullName,
      },
    });

    if (updateError || !updatedData.user) {
      return new Response(JSON.stringify({ error: updateError?.message || "No se pudo actualizar la contrasena" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const warnings: string[] = [];

    const { error: roleError } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        full_name: fullName,
        role,
      },
      { onConflict: "user_id" },
    );

    if (roleError) {
      warnings.push(`No se pudo asignar role en profiles: ${roleError.message}`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        email,
        user_id: user.id,
        role,
        temporary_password: tempPassword,
        created: userWasCreated,
        warnings,
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
