import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Reemplaza estos valores por los de tu proyecto Supabase.
const SUPABASE_URL = "https://jxetcadstgvcrfkphofe.supabase.co";
const SUPABASE_ANON_KEY = "TU_ANON_KEY";
const LOCAL_PREVIEW = location.protocol === "file:" || new URLSearchParams(location.search).has("preview");

const supabase = LOCAL_PREVIEW ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginMsg = document.getElementById("loginMsg");
const expenseMsg = document.getElementById("expenseMsg");

const kpiIncomeToday = document.getElementById("kpiIncomeToday");
const kpiPending = document.getElementById("kpiPending");
const kpiConfirmed = document.getElementById("kpiConfirmed");
const kpiMargin = document.getElementById("kpiMargin");

const reservationsBody = document.getElementById("reservationsBody");
const incomeBody = document.getElementById("incomeBody");
const marginBody = document.getElementById("marginBody");

function money(value) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "USD" }).format(Number(value || 0));
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
}

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
    .from("v_income_daily")
    .select("day,currency,income")
    .order("day", { ascending: false })
    .limit(10);

  if (error) {
    incomeBody.innerHTML = `<tr><td colspan="3">${error.message}</td></tr>`;
    return;
  }

  incomeBody.innerHTML = data
    .map((r) => `
      <tr>
        <td>${r.day}</td>
        <td>${r.currency}</td>
        <td>${money(r.income)}</td>
      </tr>
    `)
    .join("");

  const today = toDateInputValue();
  const rowToday = data.find((row) => row.day === today);
  kpiIncomeToday.textContent = money(rowToday?.income || 0);
}

async function loadMarginTable() {
  if (LOCAL_PREVIEW) return;

  const { data, error } = await supabase
    .from("v_margin_by_reservation")
    .select("reservation_code, paid_total, total_expenses, gross_margin")
    .order("reservation_code", { ascending: false })
    .limit(12);

  if (error) {
    marginBody.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
    return;
  }

  marginBody.innerHTML = data
    .map((r) => `
      <tr>
        <td>${r.reservation_code}</td>
        <td>${money(r.paid_total)}</td>
        <td>${money(r.total_expenses)}</td>
        <td>${money(r.gross_margin)}</td>
      </tr>
    `)
    .join("");

  const totalMargin = data.reduce((acc, row) => acc + Number(row.gross_margin || 0), 0);
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

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

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
