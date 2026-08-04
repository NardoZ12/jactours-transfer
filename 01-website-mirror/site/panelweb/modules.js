import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://TU_PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU_ANON_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function money(value) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function todayDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "./index.html";
    return false;
  }
  return true;
}

async function loadReservasPage() {
  const body = document.getElementById("reservasBody");
  if (!body) return;

  if (!(await ensureSession())) return;

  const { data, error } = await supabase
    .from("reservations")
    .select("reservation_code,customer_name,service_date,status,payment_status,grand_total,total")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    document.getElementById("reservasMsg").textContent = error.message;
    return;
  }

  body.innerHTML = data
    .map((r) => `
      <tr>
        <td>${r.reservation_code}</td>
        <td>${r.customer_name}</td>
        <td>${r.service_date || "-"}</td>
        <td>${r.status}</td>
        <td>${r.payment_status}</td>
        <td>${money(r.grand_total || r.total)}</td>
      </tr>
    `)
    .join("");
}

async function loadManifestPage() {
  const form = document.getElementById("manifestForm");
  if (!form) return;

  if (!(await ensureSession())) return;

  const dateInput = document.getElementById("manifestDate");
  dateInput.value = todayDate();

  async function fetchManifest(dateValue) {
    const body = document.getElementById("manifestBody");
    const { data, error } = await supabase
      .from("reservations")
      .select("id,reservation_code,customer_name,customer_phone,pickup_address,hotel,service_time,status")
      .eq("service_date", dateValue)
      .order("service_time", { ascending: true });

    if (error) {
      document.getElementById("manifestMsg").textContent = error.message;
      return;
    }

    body.innerHTML = data
      .map((r) => `
        <tr>
          <td>${r.service_time || "-"}</td>
          <td>${r.reservation_code}</td>
          <td>${r.customer_name}</td>
          <td>${r.pickup_address || r.hotel || "-"}</td>
          <td>${r.customer_phone || "-"}</td>
          <td>${r.status}</td>
        </tr>
      `)
      .join("");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await fetchManifest(dateInput.value);
  });

  await fetchManifest(dateInput.value);
}

async function loadFinancePage() {
  const tbody = document.getElementById("financeBody");
  if (!tbody) return;

  if (!(await ensureSession())) return;

  const { data: kpis, error: kpiError } = await supabase
    .from("v_dashboard_kpis")
    .select("*")
    .limit(1)
    .single();

  if (!kpiError && kpis) {
    document.getElementById("reportKpis").innerHTML = `
      <article class="kpi card"><h3>Ingresos Hoy</h3><p>${money(kpis.ingresos_hoy)}</p></article>
      <article class="kpi card"><h3>Ingresos Semana</h3><p>${money(kpis.ingresos_semana)}</p></article>
      <article class="kpi card"><h3>Ingresos Mes</h3><p>${money(kpis.ingresos_mes)}</p></article>
      <article class="kpi card"><h3>Ticket Promedio</h3><p>${money(kpis.ticket_promedio)}</p></article>
    `;
  }

  const { data, error } = await supabase
    .from("reservations")
    .select("reservation_code,grand_total,total,amount_paid,amount_due,payment_status")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    document.getElementById("financeMsg").textContent = error.message;
    return;
  }

  tbody.innerHTML = data
    .map((r) => `
      <tr>
        <td>${r.reservation_code}</td>
        <td>${money(r.grand_total || r.total)}</td>
        <td>${money(r.amount_paid)}</td>
        <td>${money(r.amount_due)}</td>
        <td>${r.payment_status}</td>
      </tr>
    `)
    .join("");
}

loadReservasPage();
loadManifestPage();
loadFinancePage();
