import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://jxetcadstgvcrfkphofe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_aN6W7TXtid9mCFeDHovBlw_B5ieoxGG";
const LOCAL_PREVIEW = location.protocol === "file:" || new URLSearchParams(location.search).has("preview");
const supabase = LOCAL_PREVIEW ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  if (LOCAL_PREVIEW) return true;

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

  if (LOCAL_PREVIEW) {
    body.innerHTML = `
      <tr><td>DB-260808-AX12QZ</td><td>Maria Perez</td><td>2026-08-12</td><td>confirmed</td><td>paid</td><td>$145.00</td></tr>
      <tr><td>DB-260808-BN77KD</td><td>Carlos Ramirez</td><td>2026-08-13</td><td>pending</td><td>unpaid</td><td>$95.00</td></tr>
    `;
    const msg = document.getElementById("reservasMsg");
    if (msg) msg.textContent = "Vista local activa";
    return;
  }

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

  if (LOCAL_PREVIEW) {
    dateInput.value = todayDate();
    document.getElementById("manifestBody").innerHTML = `
      <tr><td>09:00</td><td>DB-260808-AX12QZ</td><td>Maria Perez</td><td>Hotel Riu</td><td>809-555-0101</td><td>confirmed</td></tr>
      <tr><td>11:30</td><td>DB-260808-BN77KD</td><td>Carlos Ramirez</td><td>Zona Colonial</td><td>809-555-0102</td><td>pending</td></tr>
    `;
    const msg = document.getElementById("manifestMsg");
    if (msg) msg.textContent = "Vista local activa";
    return;
  }

  const dateInput = document.getElementById("manifestDate");
  dateInput.value = todayDate();

  async function fetchManifest(dateValue) {
    const body = document.getElementById("manifestBody");
    const { data, error } = await supabase
      .from("reservations")
      .select("id,reservation_code,customer_name,customer_phone,pickup_address,hotel,service_time,status,created_at")
      .eq("service_date", dateValue)
      .order("service_time", { ascending: true });

    if (error) {
      document.getElementById("manifestMsg").textContent = error.message;
      return;
    }

    if (!data || data.length === 0) {
      body.innerHTML = '<tr><td colspan="6">No hay reservas para esta fecha</td></tr>';
      return;
    }

    body.innerHTML = data
      .map((r) => {
        var statusClass = r.status === "confirmed" ? "status-confirmed" : r.status === "pending" ? "status-pending" : "status-cancelled";
        return `
        <tr class="${statusClass}">
          <td><strong>${r.service_time || "-"}</strong></td>
          <td>${r.reservation_code}</td>
          <td>${r.customer_name}</td>
          <td>${r.pickup_address || r.hotel || "-"}</td>
          <td>${r.customer_phone || "-"}</td>
          <td><span class="badge ${statusClass}">${r.status}</span></td>
        </tr>
      `;
      })
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

  if (LOCAL_PREVIEW) {
    document.getElementById("reportKpis").innerHTML = `
      <article class="kpi card"><h3>Ingresos Hoy</h3><p>$420.00</p></article>
      <article class="kpi card"><h3>Ingresos Semana</h3><p>$1,980.00</p></article>
      <article class="kpi card"><h3>Ingresos Mes</h3><p>$7,340.00</p></article>
      <article class="kpi card"><h3>Ticket Promedio</h3><p>$123.00</p></article>
    `;

    tbody.innerHTML = `
      <tr><td>DB-260808-AX12QZ</td><td>$145.00</td><td>$120.00</td><td>$25.00</td><td>paid</td></tr>
      <tr><td>DB-260808-BN77KD</td><td>$95.00</td><td>$95.00</td><td>$0.00</td><td>unpaid</td></tr>
    `;
    const msg = document.getElementById("financeMsg");
    if (msg) msg.textContent = "Vista local activa";
    return;
  }

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
