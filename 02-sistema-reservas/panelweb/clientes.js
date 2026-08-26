import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://jxetcadstgvcrfkphofe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_aN6W7TXtid9mCFeDHovBlw_B5ieoxGG";
const LOCAL_PREVIEW = location.protocol === "file:" || new URLSearchParams(location.search).has("preview");
const supabase = LOCAL_PREVIEW ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const clientsBody = document.getElementById("clientsBody");
const clientsMsg = document.getElementById("clientsMsg");
const clientFilter = document.getElementById("clientFilter");
const sortBy = document.getElementById("sortBy");
const refreshBtn = document.getElementById("refreshBtn");
const backBtn = document.getElementById("backBtn");
const clientDetailPanel = document.getElementById("clientDetailPanel");
const closeDetailBtn = document.getElementById("closeDetailBtn");
const reservationHistoryBody = document.getElementById("reservationHistoryBody");

let allClients = [];

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

async function ensureSession() {
  if (LOCAL_PREVIEW) return true;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "./index.html";
    return false;
  }
  return true;
}

async function loadClients() {
  if (!(await ensureSession())) return;

  if (LOCAL_PREVIEW) {
    allClients = [
      { customer_name: "Maria Perez", customer_email: "maria@example.com", customer_phone: "809-555-0101", total_spent: 450, reservations_count: 3, last_reservation: "2026-08-20" },
      { customer_name: "Carlos Ramirez", customer_email: "carlos@example.com", customer_phone: "809-555-0102", total_spent: 250, reservations_count: 2, last_reservation: "2026-08-18" },
    ];
    renderClients(allClients);
    return;
  }

  try {
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("customer_name,customer_email,customer_phone,grand_total,created_at,service_date")
      .order("created_at", { ascending: false });

    if (error) {
      clientsMsg.textContent = error.message;
      return;
    }

    const clientMap = new Map();
    (reservations || []).forEach((r) => {
      const key = (r.customer_email || r.customer_phone || r.customer_name).toLowerCase();
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          customer_name: r.customer_name,
          customer_email: r.customer_email,
          customer_phone: r.customer_phone,
          total_spent: 0,
          reservations_count: 0,
          last_reservation: r.service_date || r.created_at,
        });
      }
      const client = clientMap.get(key);
      client.total_spent += Number(r.grand_total || 0);
      client.reservations_count += 1;
      if (r.service_date > client.last_reservation) {
        client.last_reservation = r.service_date || r.created_at;
      }
    });

    allClients = Array.from(clientMap.values());
    renderClients(allClients);
  } catch (error) {
    clientsMsg.textContent = `Error: ${error.message}`;
  }
}

function renderClients(clients) {
  if (clients.length === 0) {
    clientsBody.innerHTML = '<tr><td colspan="7">No se encontraron clientes</td></tr>';
    return;
  }

  clientsBody.innerHTML = clients
    .map((c) => `
      <tr>
        <td><strong>${escapeHtml(c.customer_name)}</strong></td>
        <td>${escapeHtml(c.customer_email || "-")}</td>
        <td>${escapeHtml(c.customer_phone || "-")}</td>
        <td>${c.reservations_count}</td>
        <td>${money(c.total_spent)}</td>
        <td>${c.last_reservation || "-"}</td>
        <td>
          <button class="view-btn" data-email="${escapeHtml(c.customer_email || "")}" data-name="${escapeHtml(c.customer_name)}">Ver</button>
        </td>
      </tr>
    `)
    .join("");

  clientsBody.addEventListener("click", async (e) => {
    if (e.target.classList.contains("view-btn")) {
      const email = e.target.dataset.email;
      const name = e.target.dataset.name;
      await loadClientDetails(email, name);
    }
  });
}

async function loadClientDetails(email, name) {
  if (!(await ensureSession())) return;

  if (LOCAL_PREVIEW) {
    reservationHistoryBody.innerHTML = `
      <tr><td>DB-260808-AX12QZ</td><td>2026-08-20</td><td>Isla Saona</td><td>confirmed</td><td>$145.00</td><td>paid</td></tr>
      <tr><td>DB-260808-BN77KD</td><td>2026-08-15</td><td>Yate Privado</td><td>confirmed</td><td>$305.00</td><td>paid</td></tr>
    `;
    clientDetailPanel.style.display = "block";
    return;
  }

  try {
    const { data, error } = await supabase
      .from("reservations")
      .select("reservation_code,service_date,service_id,status,grand_total,payment_status")
      .eq("customer_email", email)
      .order("service_date", { ascending: false });

    if (error) throw error;

    reservationHistoryBody.innerHTML = (data || [])
      .map((r) => `
        <tr>
          <td>${r.reservation_code}</td>
          <td>${r.service_date || "-"}</td>
          <td>${r.service_id || "-"}</td>
          <td><span class="badge status-${r.status}">${r.status}</span></td>
          <td>${money(r.grand_total || 0)}</td>
          <td>${r.payment_status}</td>
        </tr>
      `)
      .join("");

    if (data.length === 0) {
      reservationHistoryBody.innerHTML = '<tr><td colspan="6">Sin reservas</td></tr>';
    }

    clientDetailPanel.style.display = "block";
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

function filterAndSort() {
  const query = clientFilter.value.toLowerCase();
  const sort = sortBy.value;

  let filtered = allClients.filter((c) =>
    c.customer_name.toLowerCase().includes(query) ||
    (c.customer_email && c.customer_email.toLowerCase().includes(query)) ||
    (c.customer_phone && c.customer_phone.includes(query))
  );

  if (sort === "name") {
    filtered.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
  } else if (sort === "spending") {
    filtered.sort((a, b) => b.total_spent - a.total_spent);
  } else if (sort === "recent") {
    filtered.sort((a, b) => (b.last_reservation || "").localeCompare(a.last_reservation || ""));
  }

  renderClients(filtered);
}

clientFilter.addEventListener("input", filterAndSort);
sortBy.addEventListener("change", filterAndSort);
refreshBtn.addEventListener("click", loadClients);
closeDetailBtn.addEventListener("click", () => {
  clientDetailPanel.style.display = "none";
});
backBtn.addEventListener("click", () => {
  window.location.href = "./index.html";
});

loadClients();
