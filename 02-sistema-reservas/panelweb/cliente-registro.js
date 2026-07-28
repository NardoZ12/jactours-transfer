const SUPABASE_FUNCTIONS_BASE = "https://TU_PROYECTO.functions.supabase.co";

const form = document.getElementById("registerForm");
const msg = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "Creando cuenta...";

  const payload = {
    full_name: document.getElementById("full_name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    password: document.getElementById("password").value,
  };

  const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/register-customer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    msg.textContent = `Error: ${data.error || "No se pudo registrar"}`;
    return;
  }

  msg.textContent = "Cuenta creada. Revisa tu email si tienes confirmacion activa.";
});
