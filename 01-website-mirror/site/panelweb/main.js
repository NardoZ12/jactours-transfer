import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Reemplaza estos valores por los de tu proyecto Supabase.
const SUPABASE_URL = "https://jxetcadstgvcrfkphofe.supabase.co";
const SUPABASE_ANON_KEY = "TU_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
    await loadDashboard();
  }
}

async function loadDashboard() {
  await Promise.all([
    loadReservations(),
    loadIncomeDaily(),
    loadMarginTable(),
  ]);
}

async function loadReservations() {
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
  await supabase.auth.signOut();
  dashboard.classList.add("hidden");
  loginCard.classList.remove("hidden");
});

document.getElementById("refreshBtn").addEventListener("click", loadDashboard);

document.getElementById("expenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
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
