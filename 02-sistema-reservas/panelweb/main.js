import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Reemplaza estos valores por los de tu proyecto Supabase.
const SUPABASE_URL = "https://jxetcadstgvcrfkphofe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_aN6W7TXtid9mCFeDHovBlw_B5ieoxGG";
const LOCAL_PREVIEW = location.protocol === "file:" || new URLSearchParams(location.search).has("preview");

const supabase = LOCAL_PREVIEW ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginMsg = document.getElementById("loginMsg");
const expenseMsg = document.getElementById("expenseMsg");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const kpiIncomeToday = document.getElementById("kpiIncomeToday");
const kpiPending = document.getElementById("kpiPending");
const kpiConfirmed = document.getElementById("kpiConfirmed");
const kpiMargin = document.getElementById("kpiMargin");

const reservationsBody = document.getElementById("reservationsBody");
const incomeBody = document.getElementById("incomeBody");
const marginBody = document.getElementById("marginBody");
const servicesBody = document.getElementById("servicesBody");
const servicesCount = document.getElementById("servicesCount");
const servicesMsg = document.getElementById("servicesMsg");

function money(value) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

document.getElementById("expenseDate").value = toDateInputValue();

const demoReservations = [
  { reservation_code: "DB-260808-AX12QZ", customer_name: "Maria Perez", service_date: "2026-08-12", status: "confirmed", total: 145 },
  { reservation_code: "DB-260808-BN77KD", customer_name: "Carlos Ramirez", service_date: "2026-08-13", status: "pending", total: 95 },
  { reservation_code: "DB-260808-ZT55PA", customer_name: "Ana Gomez", service_date: "2026-08-14", status: "confirmed", total: 230 },
];

const demoIncome = [
  { day: toDateInputValue(), currency: "USD", income: 420 },
  { day: "2026-08-07", currency: "USD", income: 310 },
  { day: "2026-08-06", currency: "USD", income: 190 },
];

const demoMargin = [
  { reservation_code: "DB-260808-AX12QZ", paid_total: 145, total_expenses: 40, gross_margin: 105 },
  { reservation_code: "DB-260808-BN77KD", paid_total: 95, total_expenses: 20, gross_margin: 75 },
  { reservation_code: "DB-260808-ZT55PA", paid_total: 230, total_expenses: 85, gross_margin: 145 },
];

if (LOCAL_PREVIEW) {
  const localPreviewLink = document.getElementById("localPreviewLink");
  if (localPreviewLink) {
    localPreviewLink.textContent = "Vista local activa";
    localPreviewLink.removeAttribute("href");
  }
  if (loginMsg) {
    loginMsg.textContent = "Credenciales demo cargadas para pruebas visuales.";
  }
}

async function checkSession() {
  if (LOCAL_PREVIEW) {
    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
    await loadDemoDashboard();
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
    await loadDashboard();
  }
}

async function loadDashboard() {
  if (LOCAL_PREVIEW) {
    await loadDemoDashboard();
    return;
  }

  await Promise.all([
    loadReservations(),
    loadIncomeDaily(),
    loadMarginTable(),
    loadServices(),
  ]);
}

async function loadDemoDashboard() {
  reservationsBody.innerHTML = demoReservations
    .map((r) => `
      <tr>
        <td>${r.reservation_code}</td>
        <td>${r.customer_name}</td>
        <td>${r.service_date}</td>
        <td>${r.status}</td>
        <td>${money(r.total)}</td>
      </tr>
    `)
    .join("");

  incomeBody.innerHTML = demoIncome
    .map((r) => `
      <tr>
        <td>${r.day}</td>
        <td>${r.currency}</td>
        <td>${money(r.income)}</td>
      </tr>
    `)
    .join("");

  marginBody.innerHTML = demoMargin
    .map((r) => `
      <tr>
        <td>${r.reservation_code}</td>
        <td>${money(r.paid_total)}</td>
        <td>${money(r.total_expenses)}</td>
        <td>${money(r.gross_margin)}</td>
      </tr>
    `)
    .join("");

  kpiPending.textContent = String(demoReservations.filter((r) => r.status === "pending").length);
  kpiConfirmed.textContent = String(demoReservations.filter((r) => r.status === "confirmed").length);
  kpiIncomeToday.textContent = money(demoIncome.find((row) => row.day === toDateInputValue())?.income || 0);
  kpiMargin.textContent = money(demoMargin.reduce((acc, row) => acc + Number(row.gross_margin || 0), 0));
  loginMsg.textContent = "Modo vista local activo. No usa Supabase.";
  renderServices([
    { id: "demo-1", title: "Isla Saona Clasica", category: "excursion", base_price: 49, offer_price: 39, offer_label: "Oferta web", offer_active: true },
    { id: "demo-2", title: "Tiara 50", category: "yate", base_price: 49, offer_price: null, offer_label: "", offer_active: false },
  ]);
}

function renderServices(services) {
  servicesCount.textContent = `${services.length} experiencias`;
  servicesBody.innerHTML = services.map((service) => `
    <tr data-service-id="${escapeHtml(service.id)}">
      <td><strong>${escapeHtml(service.title)}</strong></td>
      <td>${escapeHtml(service.category)}</td>
      <td><input class="price-input" data-field="base_price" type="number" min="0" step="0.01" value="${Number(service.base_price || 0)}" aria-label="Precio de ${escapeHtml(service.title)}"></td>
      <td><input class="price-input" data-field="offer_price" type="number" min="0" step="0.01" value="${service.offer_price ?? ""}" placeholder="Sin oferta" aria-label="Precio de oferta de ${escapeHtml(service.title)}"></td>
      <td><input class="offer-label-input" data-field="offer_label" type="text" maxlength="80" value="${escapeHtml(service.offer_label)}" placeholder="Ej. Oferta web" aria-label="Etiqueta de oferta de ${escapeHtml(service.title)}"></td>
      <td><label class="offer-toggle"><input data-field="offer_active" type="checkbox" ${service.offer_active ? "checked" : ""}><span>Publicar</span></label></td>
      <td><button class="service-save" type="button">Guardar</button></td>
    </tr>
  `).join("");
}

async function loadServices() {
  if (LOCAL_PREVIEW) return;

  servicesMsg.textContent = "";
  const { data, error } = await supabase
    .from("services")
    .select("id,slug,title,category,base_price,offer_price,offer_label,offer_active")
    .order("category")
    .order("title");

  if (error) {
    servicesBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  renderServices(data);
}

servicesBody.addEventListener("click", async (event) => {
  const button = event.target.closest(".service-save");
  if (!button) return;
  const row = button.closest("tr[data-service-id]");

  if (LOCAL_PREVIEW) {
    servicesMsg.textContent = "Vista local: los cambios no se guardaron.";
    return;
  }

  const basePrice = Number(row.querySelector('[data-field="base_price"]').value);
  const offerInput = row.querySelector('[data-field="offer_price"]');
  const offerPrice = offerInput.value === "" ? null : Number(offerInput.value);
  const offerActive = row.querySelector('[data-field="offer_active"]').checked;
  if (!Number.isFinite(basePrice) || basePrice < 0 || (offerActive && (offerPrice === null || offerPrice < 0))) {
    servicesMsg.textContent = "Revisa los precios: una oferta activa necesita un precio valido.";
    return;
  }

  button.disabled = true;
  button.textContent = "Guardando...";
  const payload = {
    base_price: basePrice,
    offer_price: offerPrice,
    offer_label: row.querySelector('[data-field="offer_label"]').value.trim() || null,
    offer_active: offerActive,
  };
  const { data: updatedService, error } = await supabase
    .from("services")
    .update(payload)
    .eq("id", row.dataset.serviceId)
    .select("id,offer_active,offer_price,base_price")
    .maybeSingle();

  button.disabled = false;
  button.textContent = "Guardar";
  if (error) {
    servicesMsg.textContent = `Error al guardar: ${error.message}`;
  } else if (!updatedService) {
    servicesMsg.textContent = "No se guardo: tu usuario no tiene permiso para editar servicios.";
  } else {
    servicesMsg.textContent = "Precio y oferta actualizados.";
  }
});

async function loadReservations() {
  if (LOCAL_PREVIEW) return;

  const { data, error } = await supabase
    .from("reservations")
    .select("reservation_code, customer_name, service_date, status, total")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    reservationsBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
    return;
  }

  reservationsBody.innerHTML = data
    .map((r) => `
      <tr>
        <td>${r.reservation_code}</td>
        <td>${r.customer_name}</td>
        <td>${r.service_date ?? "-"}</td>
        <td>${r.status}</td>
        <td>${money(r.total)}</td>
      </tr>
    `)
    .join("");

  const pending = data.filter((r) => r.status === "pending").length;
  const confirmed = data.filter((r) => r.status === "confirmed").length;
  kpiPending.textContent = String(pending);
  kpiConfirmed.textContent = String(confirmed);
}

async function loadIncomeDaily() {
  if (LOCAL_PREVIEW) return;

  const { data, error } = await supabase
    .from("payments")
    .select("created_at,currency,amount,status")
    .order("created_at", { ascending: false });

  if (error) {
    incomeBody.innerHTML = `<tr><td colspan="3">${error.message}</td></tr>`;
    return;
  }

  const byDay = new Map();
  for (const payment of data || []) {
    if (payment.status !== "captured") continue;
    const day = new Date(payment.created_at).toISOString().slice(0, 10);
    const current = Number(byDay.get(day) || 0) + Number(payment.amount || 0);
    byDay.set(day, current);
  }

  const rows = [...byDay.entries()]
    .map(([day, income]) => ({ day, currency: "USD", income }))
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, 10);

  incomeBody.innerHTML = rows
    .map((r) => `
      <tr>
        <td>${r.day}</td>
        <td>${r.currency}</td>
        <td>${money(r.income)}</td>
      </tr>
    `)
    .join("");

  const today = toDateInputValue();
  const rowToday = rows.find((row) => row.day === today);
  kpiIncomeToday.textContent = money(rowToday?.income || 0);
}

async function loadMarginTable() {
  if (LOCAL_PREVIEW) return;

  const [{ data: reservations, error: reservationsError }, { data: payments, error: paymentsError }, { data: expenses, error: expensesError }] = await Promise.all([
    supabase.from("reservations").select("id,reservation_code,total"),
    supabase.from("payments").select("reservation_id,amount,status"),
    supabase.from("expenses").select("reservation_id,amount"),
  ]);

  if (reservationsError || paymentsError || expensesError) {
    marginBody.innerHTML = `<tr><td colspan="4">${reservationsError?.message || paymentsError?.message || expensesError?.message}</td></tr>`;
    return;
  }

  const paidByReservation = new Map();
  for (const payment of payments || []) {
    if (payment.status !== "captured") continue;
    const current = Number(paidByReservation.get(payment.reservation_id) || 0) + Number(payment.amount || 0);
    paidByReservation.set(payment.reservation_id, current);
  }

  const expensesByReservation = new Map();
  for (const expense of expenses || []) {
    const current = Number(expensesByReservation.get(expense.reservation_id) || 0) + Number(expense.amount || 0);
    expensesByReservation.set(expense.reservation_id, current);
  }

  const rows = (reservations || [])
    .map((reservation) => {
      const paidTotal = Number(paidByReservation.get(reservation.id) || 0);
      const totalExpenses = Number(expensesByReservation.get(reservation.id) || 0);
      const grossMargin = paidTotal - totalExpenses;
      return {
        reservation_code: reservation.reservation_code,
        paid_total: paidTotal,
        total_expenses: totalExpenses,
        gross_margin: grossMargin,
      };
    })
    .sort((a, b) => (b.reservation_code || "").localeCompare(a.reservation_code || ""))
    .slice(0, 12);

  marginBody.innerHTML = rows
    .map((r) => `
      <tr>
        <td>${r.reservation_code}</td>
        <td>${money(r.paid_total)}</td>
        <td>${money(r.total_expenses)}</td>
        <td>${money(r.gross_margin)}</td>
      </tr>
    `)
    .join("");

  const totalMargin = rows.reduce((acc, row) => acc + Number(row.gross_margin || 0), 0);
  kpiMargin.textContent = money(totalMargin);
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (LOCAL_PREVIEW) {
    loginMsg.textContent = "Modo vista local activo";
    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
    await loadDemoDashboard();
    return;
  }

  loginMsg.textContent = "Ingresando...";

  const email = emailInput.value;
  const password = passwordInput.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginMsg.textContent = `Error: ${error.message}`;
    return;
  }

  loginMsg.textContent = "Acceso correcto";
  loginCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
  await loadDashboard();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  if (LOCAL_PREVIEW) {
    loginCard.classList.remove("hidden");
    dashboard.classList.add("hidden");
    loginMsg.textContent = "Modo vista local";
    return;
  }

  await supabase.auth.signOut();
  dashboard.classList.add("hidden");
  loginCard.classList.remove("hidden");
});

document.getElementById("refreshBtn").addEventListener("click", loadDashboard);

document.getElementById("expenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (LOCAL_PREVIEW) {
    expenseMsg.textContent = "Modo vista local: el gasto no se guardó";
    return;
  }

  expenseMsg.textContent = "Guardando...";

  const payload = {
    reservation_id: document.getElementById("expenseReservationId").value || null,
    category: document.getElementById("expenseCategory").value,
    amount: Number(document.getElementById("expenseAmount").value),
    currency: document.getElementById("expenseCurrency").value,
    expense_date: document.getElementById("expenseDate").value,
    notes: document.getElementById("expenseNotes").value || null,
  };

  const { error } = await supabase.from("expenses").insert(payload);
  if (error) {
    expenseMsg.textContent = `Error: ${error.message}`;
    return;
  }

  expenseMsg.textContent = "Gasto guardado";
  await loadMarginTable();
});

checkSession();
