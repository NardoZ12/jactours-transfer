import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://jxetcadstgvcrfkphofe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_aN6W7TXtid9mCFeDHovBlw_B5ieoxGG";
const LOCAL_PREVIEW = location.protocol === "file:" || new URLSearchParams(location.search).has("preview");
const supabase = LOCAL_PREVIEW ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const periodFilter = document.getElementById("periodFilter");
const dateRangeContainer = document.getElementById("dateRangeContainer");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const backBtn = document.getElementById("backBtn");
const exportBtn = document.getElementById("exportBtn");
const reportMsg = document.getElementById("reportMsg");

const kpiTotalIncome = document.getElementById("kpiTotalIncome");
const kpiTotalExpenses = document.getElementById("kpiTotalExpenses");
const kpiGrossMargin = document.getElementById("kpiGrossMargin");
const kpiMarginPercent = document.getElementById("kpiMarginPercent");

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

function getDateRange() {
  const today = new Date();
  const period = periodFilter.value;

  if (period === "custom") {
    return {
      from: startDate.value,
      to: endDate.value,
    };
  }

  let from, to = today;

  switch (period) {
    case "today":
      from = today;
      break;
    case "week":
      from = new Date(today);
      from.setDate(today.getDate() - today.getDay());
      break;
    case "month":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "quarter":
      const quarter = Math.floor(today.getMonth() / 3);
      from = new Date(today.getFullYear(), quarter * 3, 1);
      break;
    case "year":
      from = new Date(today.getFullYear(), 0, 1);
      break;
    default:
      from = new Date(today);
  }

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
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

async function loadReport() {
  if (!(await ensureSession())) return;

  const dateRange = getDateRange();
  reportMsg.textContent = "Cargando reporte...";

  if (LOCAL_PREVIEW) {
    kpiTotalIncome.textContent = "$12,450.00";
    kpiTotalExpenses.textContent = "$3,200.00";
    kpiGrossMargin.textContent = "$9,250.00";
    kpiMarginPercent.textContent = "74%";

    document.getElementById("incomeByProductBody").innerHTML = `
      <tr><td>Isla Saona</td><td>12</td><td>$5,880.00</td><td>47%</td></tr>
      <tr><td>Yate Privado</td><td>5</td><td>$6,570.00</td><td>53%</td></tr>
    `;

    document.getElementById("expensesByCategoryBody").innerHTML = `
      <tr><td>Combustible</td><td>8</td><td>$1,600.00</td><td>50%</td></tr>
      <tr><td>Comisiones</td><td>15</td><td>$1,200.00</td><td>37.5%</td></tr>
      <tr><td>Otros</td><td>2</td><td>$400.00</td><td>12.5%</td></tr>
    `;

    document.getElementById("accountsReceivableBody").innerHTML = `
      <tr><td>DB-260808-XYZ</td><td>Juan Pérez</td><td>$450.00</td><td>$250.00</td><td>$200.00</td><td>2026-09-01</td></tr>
    `;

    document.getElementById("dailyMarginBody").innerHTML = `
      <tr><td>2026-08-25</td><td>$1,200.00</td><td>$300.00</td><td>$900.00</td><td>75%</td></tr>
      <tr><td>2026-08-24</td><td>$980.00</td><td>$250.00</td><td>$730.00</td><td>74%</td></tr>
    `;

    reportMsg.textContent = "Reporte demo cargado";
    return;
  }

  try {
    const [{ data: payments }, { data: expenses }, { data: reservations }] = await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .gte("created_at", dateRange.from)
        .lte("created_at", dateRange.to),
      supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", dateRange.from)
        .lte("expense_date", dateRange.to),
      supabase
        .from("reservations")
        .select("*")
        .gte("service_date", dateRange.from)
        .lte("service_date", dateRange.to),
    ]);

    const totalIncome = (payments || [])
      .filter((p) => p.status === "captured")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const grossMargin = totalIncome - totalExpenses;
    const marginPercent = totalIncome > 0 ? Math.round((grossMargin / totalIncome) * 100) : 0;

    kpiTotalIncome.textContent = money(totalIncome);
    kpiTotalExpenses.textContent = money(totalExpenses);
    kpiGrossMargin.textContent = money(grossMargin);
    kpiMarginPercent.textContent = `${marginPercent}%`;

    // Ingresos por producto
    const incomeByProduct = {};
    (reservations || []).forEach((r) => {
      if (!incomeByProduct[r.service_id]) {
        incomeByProduct[r.service_id] = { count: 0, total: 0 };
      }
      incomeByProduct[r.service_id].count += 1;
      incomeByProduct[r.service_id].total += Number(r.grand_total || 0);
    });

    const incomeRows = Object.entries(incomeByProduct)
      .map(([productId, data]) => {
        const percent = totalIncome > 0 ? Math.round((data.total / totalIncome) * 100) : 0;
        return `<tr><td>${productId}</td><td>${data.count}</td><td>${money(data.total)}</td><td>${percent}%</td></tr>`;
      })
      .join("");

    document.getElementById("incomeByProductBody").innerHTML = incomeRows || '<tr><td colspan="4">Sin datos</td></tr>';

    // Gastos por categoría
    const expensesByCategory = {};
    (expenses || []).forEach((e) => {
      if (!expensesByCategory[e.category]) {
        expensesByCategory[e.category] = { count: 0, total: 0 };
      }
      expensesByCategory[e.category].count += 1;
      expensesByCategory[e.category].total += Number(e.amount || 0);
    });

    const expenseRows = Object.entries(expensesByCategory)
      .map(([category, data]) => {
        const percent = totalExpenses > 0 ? Math.round((data.total / totalExpenses) * 100) : 0;
        return `<tr><td>${escapeHtml(category)}</td><td>${data.count}</td><td>${money(data.total)}</td><td>${percent}%</td></tr>`;
      })
      .join("");

    document.getElementById("expensesByCategoryBody").innerHTML = expenseRows || '<tr><td colspan="4">Sin datos</td></tr>';

    // Cuentas por cobrar
    const accountsReceivable = (reservations || [])
      .filter((r) => r.payment_status !== "paid" && r.payment_status !== "full")
      .map((r) => {
        const paid = Number(r.amount_paid || 0);
        const due = Number(r.amount_due || 0);
        return {
          reservation_code: r.reservation_code,
          customer_name: r.customer_name,
          total: Number(r.grand_total || 0),
          paid,
          due,
          service_date: r.service_date,
        };
      });

    const arRows = accountsReceivable
      .map((ar) => `
        <tr>
          <td>${escapeHtml(ar.reservation_code)}</td>
          <td>${escapeHtml(ar.customer_name)}</td>
          <td>${money(ar.total)}</td>
          <td>${money(ar.paid)}</td>
          <td>${money(ar.due)}</td>
          <td>${ar.service_date}</td>
        </tr>
      `)
      .join("");

    document.getElementById("accountsReceivableBody").innerHTML = arRows || '<tr><td colspan="6">Sin cuentas por cobrar</td></tr>';

    // Margen diario
    const dailyMargin = {};
    (payments || [])
      .filter((p) => p.status === "captured")
      .forEach((p) => {
        const day = new Date(p.created_at).toISOString().slice(0, 10);
        if (!dailyMargin[day]) dailyMargin[day] = { income: 0, expenses: 0 };
        dailyMargin[day].income += Number(p.amount || 0);
      });

    (expenses || []).forEach((e) => {
      const day = e.expense_date;
      if (!dailyMargin[day]) dailyMargin[day] = { income: 0, expenses: 0 };
      dailyMargin[day].expenses += Number(e.amount || 0);
    });

    const dmRows = Object.entries(dailyMargin)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30)
      .map(([day, data]) => {
        const margin = data.income - data.expenses;
        const marginPercent = data.income > 0 ? Math.round((margin / data.income) * 100) : 0;
        return `
          <tr>
            <td>${day}</td>
            <td>${money(data.income)}</td>
            <td>${money(data.expenses)}</td>
            <td>${money(margin)}</td>
            <td>${marginPercent}%</td>
          </tr>
        `;
      })
      .join("");

    document.getElementById("dailyMarginBody").innerHTML = dmRows || '<tr><td colspan="5">Sin datos</td></tr>';
    reportMsg.textContent = `Reporte desde ${dateRange.from} hasta ${dateRange.to}`;
  } catch (error) {
    reportMsg.textContent = `Error: ${error.message}`;
  }
}

periodFilter.addEventListener("change", () => {
  const isCustom = periodFilter.value === "custom";
  dateRangeContainer.style.display = isCustom ? "grid" : "none";
  loadReport();
});

startDate.addEventListener("change", loadReport);
endDate.addEventListener("change", loadReport);

backBtn.addEventListener("click", () => {
  window.location.href = "./index.html";
});

exportBtn.addEventListener("click", () => {
  const dateRange = getDateRange();
  const csv = `Reporte Financiero\nPeriodo: ${dateRange.from} a ${dateRange.to}\n\n${kpiTotalIncome.textContent}\n`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-financiero-${dateRange.from}.csv`;
  a.click();
});

// Inicializar
const today = new Date();
startDate.value = toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
endDate.value = toDateInputValue(today);
loadReport();
