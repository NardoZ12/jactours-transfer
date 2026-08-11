const SUPABASE_FUNCTIONS_BASE = "https://TU_PROYECTO.functions.supabase.co";

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function money(value, currency = "USD") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency }).format(Number(value || 0));
}

async function callFunction(path, payload) {
  const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Error en solicitud");
  }
  return data;
}

function parseQuery() {
  const query = new URLSearchParams(window.location.search);
  return {
    code: query.get("code"),
    token: query.get("token"),
    email: query.get("email"),
    orderId: query.get("orderId"),
    prefill: query.get("prefill"),
  };
}

function hydrateCheckoutDraft() {
  const form = qs("#checkoutForm");
  if (!form) return;

  const query = parseQuery();
  if (query.prefill !== "1") return;

  try {
    const raw = localStorage.getItem("jacBookingDraft");
    if (!raw) return;
    const draft = JSON.parse(raw);

    if (draft?.serviceDate && qs("#serviceDate")) qs("#serviceDate").value = draft.serviceDate;
    if (typeof draft?.adults !== "undefined" && qs("#adults")) qs("#adults").value = String(draft.adults);
    if (typeof draft?.children !== "undefined" && qs("#children")) qs("#children").value = String(draft.children);
    if (draft?.customerName && qs("#customerName")) qs("#customerName").value = draft.customerName;
    if (draft?.customerEmail && qs("#customerEmail")) qs("#customerEmail").value = draft.customerEmail;
    if (draft?.customerPhone && qs("#customerPhone")) qs("#customerPhone").value = draft.customerPhone;
    if (draft?.product && qs("#notes")) qs("#notes").value = `Reserva iniciada desde: ${draft.product}`;
  } catch (_error) {
    // Ignore malformed local draft and continue with blank form.
  }
}

async function initCheckoutPage() {
  const form = qs("#checkoutForm");
  if (!form) return;

  hydrateCheckoutDraft();

  const msg = qs("#checkoutMsg");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    msg.textContent = "Creando reserva...";
    msg.className = "msg";

    try {
      const extras = qsa(".extra-row").map((row) => ({
        code: row.dataset.code || null,
        title: row.querySelector("[data-extra-title]")?.value || "Extra",
        quantity: Number(row.querySelector("[data-extra-qty]")?.value || 1),
        unit_price: Number(row.querySelector("[data-extra-price]")?.value || 0),
      }));

      const reservationPayload = {
        service_id: qs("#serviceId").value,
        service_date: qs("#serviceDate").value,
        service_time: qs("#serviceTime").value || null,
        customer_name: qs("#customerName").value,
        customer_email: qs("#customerEmail").value,
        customer_phone: qs("#customerPhone").value,
        hotel: qs("#hotel").value,
        pickup_address: qs("#pickupAddress").value,
        notes: qs("#notes").value,
        adults: Number(qs("#adults").value || 0),
        children: Number(qs("#children").value || 0),
        infants: Number(qs("#infants").value || 0),
        tax_amount: Number(qs("#taxAmount").value || 0),
        discount: Number(qs("#discount").value || 0),
        commission_amount: Number(qs("#commissionAmount").value || 0),
        deposit_percent: Number(qs("#depositPercent").value || 100),
        extras,
      };

      const reservationData = await callFunction("create-reservation", reservationPayload);
      const reservation = reservationData.reservation;

      const paymentMode = qs("#paymentMode").value;
      const paymentData = await callFunction("create-paypal-order", {
        reservationId: reservation.id,
        amountMode: paymentMode,
      });

      window.location.href = paymentData.approveLink;
    } catch (error) {
      msg.textContent = `Error: ${error.message}`;
      msg.className = "msg err";
    }
  });
}

async function initReservationStatusPage() {
  const container = qs("#statusContainer");
  if (!container) return;

  const msg = qs("#statusMsg");
  const form = qs("#statusForm");

  const render = (data) => {
    const r = data.reservation;
    qs("#rCode").textContent = r.reservation_code;
    qs("#rName").textContent = r.customer_name;
    qs("#rDate").textContent = `${r.service_date} ${r.service_time || ""}`.trim();
    qs("#rStatus").textContent = r.status;
    qs("#rPayStatus").textContent = r.payment_status;
    qs("#rTotal").textContent = money(r.grand_total || r.total, r.currency || "USD");
    qs("#rPaid").textContent = money(r.amount_paid, r.currency || "USD");
    qs("#rDue").textContent = money(r.amount_due, r.currency || "USD");

    const paymentRows = (data.payments || []).map((p) => `
      <tr>
        <td>${p.created_at?.slice(0, 10) || "-"}</td>
        <td>${p.status}</td>
        <td>${money(p.amount, p.currency || "USD")}</td>
      </tr>
    `).join("");
    qs("#paymentsBody").innerHTML = paymentRows || '<tr><td colspan="3">Sin pagos</td></tr>';

    const extrasRows = (data.extras || []).map((x) => `
      <tr>
        <td>${x.title}</td>
        <td>${x.quantity}</td>
        <td>${money(x.total, r.currency || "USD")}</td>
      </tr>
    `).join("");
    qs("#extrasBody").innerHTML = extrasRows || '<tr><td colspan="3">Sin extras</td></tr>';
  };

  const query = parseQuery();
  if (query.code || query.token) {
    try {
      const data = await callFunction("reservation-status", {
        reservationCode: query.code,
        token: query.token,
        email: query.email,
      });
      render(data);
      container.hidden = false;
      if (data.reservation?.customer_token) {
        const link = `cancelar-reprogramar.html?token=${encodeURIComponent(data.reservation.customer_token)}`;
        qs("#manageLink").setAttribute("href", link);
      }
    } catch (error) {
      msg.textContent = `Error: ${error.message}`;
      msg.className = "msg err";
    }
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      msg.textContent = "Consultando...";
      msg.className = "msg";

      try {
        const data = await callFunction("reservation-status", {
          reservationCode: qs("#queryCode").value,
          email: qs("#queryEmail").value,
        });
        render(data);
        container.hidden = false;
        msg.textContent = "Reserva encontrada";
        msg.className = "msg ok";

        if (data.reservation?.customer_token) {
          const link = `cancelar-reprogramar.html?token=${encodeURIComponent(data.reservation.customer_token)}`;
          qs("#manageLink").setAttribute("href", link);
        }
      } catch (error) {
        msg.textContent = `Error: ${error.message}`;
        msg.className = "msg err";
      }
    });
  }
}

async function initManageReservationPage() {
  const form = qs("#manageForm");
  if (!form) return;

  const msg = qs("#manageMsg");
  const query = parseQuery();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    msg.textContent = "Procesando...";
    msg.className = "msg";

    try {
      const action = qs("#action").value;
      const payload = {
        token: query.token || qs("#token").value,
        action,
        reason: qs("#reason").value,
        newServiceDate: qs("#newServiceDate").value || null,
        newServiceTime: qs("#newServiceTime").value || null,
      };

      const data = await callFunction("manage-reservation", payload);
      msg.textContent = `Solicitud completada: ${data.status}`;
      msg.className = "msg ok";
    } catch (error) {
      msg.textContent = `Error: ${error.message}`;
      msg.className = "msg err";
    }
  });
}

async function initConfirmationPage() {
  const captureBtn = qs("#capturePaymentBtn");
  if (!captureBtn) return;

  const msg = qs("#confirmationMsg");
  const query = parseQuery();
  if (query.orderId) {
    qs("#orderIdValue").textContent = query.orderId;
  }

  captureBtn.addEventListener("click", async () => {
    const orderId = qs("#orderId").value || query.orderId;
    if (!orderId) {
      msg.textContent = "Debes indicar orderId";
      msg.className = "msg err";
      return;
    }

    msg.textContent = "Confirmando pago...";
    msg.className = "msg";

    try {
      const data = await callFunction("capture-paypal-order", { orderId });
      msg.textContent = `Pago confirmado. CaptureId: ${data.captureId || "n/a"}`;
      msg.className = "msg ok";
    } catch (error) {
      msg.textContent = `Error: ${error.message}`;
      msg.className = "msg err";
    }
  });
}

initCheckoutPage();
initReservationStatusPage();
initManageReservationPage();
initConfirmationPage();
