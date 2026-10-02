(function () {
  "use strict";

  var SUPABASE_URL = "https://jxetcadstgvcrfkphofe.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_aN6W7TXtid9mCFeDHovBlw_B5ieoxGG";

  function money(value) {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "USD" }).format(Number(value || 0));
  }

  /* ── Data ─────────────────────────────────────── */

  var EXCURSIONES = [
    { slug: "isla-saona-clasica", name: "Isla Saona Clásica", category: "excursion", emoji: "🏝️", desc: "Catamarán, playa natural y almuerfo buffet en isla paradisíaca", price: 75, type: "personas" },
    { slug: "isla-saona-vip-4-playas", name: "Isla Saona VIP 4 Playas", category: "excursion", emoji: "🚤", desc: "Tour exclusivo por 4 playas con servicio VIP privado", price: 120, type: "personas" },
    { slug: "isla-catalina", name: "Isla Catalina", category: "excursion", emoji: "🏖️", desc: "Snorkel y playa en isla virgen con aguas cristalinas", price: 65, type: "personas" },
    { slug: "isla-catalina-buceo", name: "Isla Catalina Buceo", category: "excursion", emoji: "🤿", desc: "Buceo en arrecife con instructores certificados", price: 85, type: "personas" },
    { slug: "santo-domingo", name: "Santo Domingo City Tour", category: "excursion", emoji: "🏛️", desc: "Zona Colonial, Los Tres Ojos y cuevas históricas", price: 75, type: "personas" },
    { slug: "santo-domingo-privado", name: "Santo Domingo Privado", category: "excursion", emoji: "🚗", desc: "Tour privado con guía exclusivo y transporte VIP", price: 150, type: "personas" },
    { slug: "higuey-city", name: "Higüey City Tour", category: "excursion", emoji: "⛪", desc: "Basílica, mercado y cultura local dominicana", price: 45, type: "personas" },
    { slug: "samana", name: "Samaná Full Day", category: "excursion", emoji: "🐋", desc: "Cascada El Limón, Cayo Levantado y whale watching", price: 95, type: "personas" },
    { slug: "sacred-river", name: "Sacred River", category: "excursion", emoji: "🏞️", desc: "Río sagrado y cuevas taínas con guía", price: 85, type: "personas" },
    { slug: "party-boat-en-punta-cana", name: "Party Boat Punta Cana", category: "excursion", emoji: "🎉", desc: "Fiesta en barco con bebidas y música incluidas", price: 65, type: "personas" },
    { slug: "cocobongo", name: "Coco Bongo", category: "show", emoji: "🎭", desc: "Espectáculo nocturno con drinks libres y show en vivo", price: 75, type: "personas" },
    { slug: "dorado-park", name: "Dorado Park", category: "aventura", emoji: "🏊", desc: "Parque acuático con toboganes y piscinas", price: 55, type: "personas" },
    { slug: "hacienda-park", name: "Hacienda Park", category: "aventura", emoji: "🧗", desc: "Tirolines, senderos y cultura dominicana", price: 65, type: "personas" },
    { slug: "pesca", name: "Pesca Deportiva", category: "excursion", emoji: "🎣", desc: "Pesca en alta mar con equipo incluido", price: 450, type: "personas" },
    {
      slug: "buggies", name: "Buggies Punta Cana", category: "aventura", emoji: "🏎️",
      desc: "Aventura en terrenos rurales, cuevas y playas", price: 70, type: "maquina",
      machines: [
        { name: "Buggy 2 plazas", price: 70, desc: "Para 1 conductor + 1 pasajero" },
        { name: "Buggy 4 plazas", price: 110, desc: "Para 2 adultos + 2 niños" },
        { name: "Can-Am Maverick X3", price: 150, desc: "Potencia premium 4 plazas" },
        { name: "Polaris RZR 1000", price: 180, desc: "Todo terreno extremo 4 plazas" }
      ]
    },
    {
      slug: "atv-4wd", name: "ATV 4WD Adventure", category: "aventura", emoji: "🚙",
      desc: "Cuatriciclos por senderos y plantaciones", price: 65, type: "maquina",
      machines: [
        { name: "ATV Individual", price: 65, desc: "1 persona por cuatriciclo" },
        { name: "ATV Doble", price: 95, desc: "2 personas por cuatriciclo" },
        { name: "ATV Premium 4x4", price: 85, desc: "Potencia extra para 1 persona" }
      ]
    }
  ];

  var PICKUP_OPTIONS = [
    "Mi ubicación actual",
    "Uvero Alto", "Excellence Punta Cana", "Sirenis", "Breathless",
    "Now Onix", "Dreams Onix", "Live Aqua", "Ocean El Faro", "Hard Rock",
    "Bahia Principe Punta Cana", "Riu Republica", "Occidental Caribe",
    "Royalton Splash/Puj", "Los Majestic", "Complejo Riu", "Riu Punta Cana",
    "Riu Bambu", "Riu Macao", "Riu Palace Bavaro", "Iberostar Selection",
    "White Sands", "Punta Cana Princess", "Vik Arena", "Ocean Blue",
    "Karibo", "Caribe Deluxe Princess", "Bavaro Princess",
    "Occ. Punta Cana", "Los Corales", "Palladium Punta Cana",
    "Palladium Bavaro", "Presidential Suites", "Vista Sol",
    "Impressive", "Plaza Turquesa", "Whala Bavaro", "Secret/Dreams Royal",
    "Lopesan", "Hotel de Punta Cana", "Otro lugar"
  ];

  var selectedExcursion = null;
  var selectedMachine = null;

  /* ── Supabase price sync ──────────────────────── */

  function loadServicePrice(slug) {
    var endpoint = SUPABASE_URL + "/rest/v1/services?select=id,title,base_price,offer_price,offer_active&active=eq.true&slug=eq." + encodeURIComponent(slug) + "&limit=1";
    return fetch(endpoint, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY }
    })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { return rows[0] || null; })
      .catch(function () { return null; });
  }

  function syncPrices() {
    EXCURSIONES.forEach(function (exc) {
      loadServicePrice(exc.slug).then(function (svc) {
        if (!svc) return;
        var price = svc.offer_active && svc.offer_price !== null ? svc.offer_price : svc.base_price;
        exc.price = Number(price);
        exc.serviceId = svc.id;
        if (exc.type === "maquina" && exc.machines && exc.machines.length) {
          var diff = price - exc.machines[0].price;
          exc.machines.forEach(function (m) { m.price = Math.max(1, m.price + diff); });
        }
        renderGrid(currentFilter);
        if (selectedExcursion && selectedExcursion.slug === exc.slug) renderBookingForm();
      });
    });
  }

  /* ── Render grid ───────────────────────────────── */

  var currentFilter = "all";
  var grid = document.getElementById("excursionGrid");

  function badgeClass(cat) {
    if (cat === "aventura") return "badge-aventura";
    if (cat === "show") return "badge-show";
    return "badge-excur";
  }
  function badgeLabel(cat) {
    if (cat === "aventura") return "Aventura";
    if (cat === "show") return "Show";
    return "Excursión";
  }

  function renderGrid(filter) {
    currentFilter = filter || "all";
    var items = EXCURSIONES.filter(function (e) {
      return currentFilter === "all" || e.category === currentFilter;
    });
    grid.innerHTML = items.map(function (exc) {
      var isSelected = selectedExcursion && selectedExcursion.slug === exc.slug;
      return "" +
        '<div class="excursion-card' + (isSelected ? " selected" : "") + '" data-slug="' + exc.slug + '">' +
        '  <div class="card-img">' +
        '    <span class="emoji">' + exc.emoji + "</span>" +
        '    <span class="card-badge ' + badgeClass(exc.category) + '">' + badgeLabel(exc.category) + "</span>" +
        "  </div>" +
        '  <div class="card-body">' +
        "    <h3>" + exc.name + "</h3>" +
        "    <p>" + exc.desc + "</p>" +
        '    <div class="card-footer">' +
        '      <div class="card-price">' + money(exc.price) + ' <small>' + (exc.type === "maquina" ? "desde" : "por persona") + "</small></div>" +
        '      <button class="card-btn" data-slug="' + exc.slug + '">Reservar</button>' +
        "    </div>" +
        "  </div>" +
        "</div>";
    }).join("");

    grid.querySelectorAll(".excursion-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var slug = card.dataset.slug;
        selectExcursion(slug);
      });
    });
  }

  /* ── Filters ──────────────────────────────────── */

  document.getElementById("filters").addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-btn");
    if (!btn) return;
    document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    renderGrid(btn.dataset.filter);
  });

  /* ── Booking panel ────────────────────────────── */

  var panel = document.getElementById("bookingPanel");
  var bookingTitle = document.getElementById("bookingTitle");
  var bookingBody = document.getElementById("bookingBody");

  document.getElementById("closeBooking").addEventListener("click", function () {
    panel.classList.remove("active");
    selectedExcursion = null;
    selectedMachine = null;
    renderGrid(currentFilter);
  });

  function selectExcursion(slug) {
    selectedExcursion = EXCURSIONES.filter(function (e) { return e.slug === slug; })[0];
    selectedMachine = null;
    renderGrid(currentFilter);
    renderBookingForm();
    panel.classList.add("active");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function renderBookingForm() {
    if (!selectedExcursion) return;
    var exc = selectedExcursion;
    bookingTitle.textContent = "Reservar: " + exc.name;

    var pickupMarkup = PICKUP_OPTIONS.map(function (o) { return '<option value="' + o + '">' + o + "</option>"; }).join("");

    if (exc.type === "maquina") {
      bookingBody.innerHTML = "" +
        '<div class="form-grid full">' +
        '  <div class="form-group full"><label>Fecha del tour</label><input type="date" id="excDate" min="' + todayStr() + '" value="' + todayStr() + '" /></div>' +
        "</div>" +
        '<div class="form-group full" style="margin-top:14px"><label>Selecciona tu máquina</label>' +
        '  <div class="machine-grid" id="machineGrid">' +
        exc.machines.map(function (m, i) {
          return "" +
            '<button type="button" class="machine-card" data-machine="' + i + '">' +
            "  <h4>" + m.name + "</h4>" +
            '  <div class="machine-price">' + money(m.price) + "</div>" +
            "  <small>" + m.desc + "</small>" +
            "</button>";
        }).join("") +
        "  </div>" +
        "</div>" +
        '<div class="form-grid" style="margin-top:14px">' +
        '  <div class="form-group"><label>Cantidad</label><input type="number" id="excQty" min="1" value="1" /></div>' +
        '  <div class="form-group"><label>Recogida</label><select id="excPickup">' + pickupMarkup + "</select></div>" +
        "</div>" +
        '<div class="summary-box" id="summaryBox"></div>' +
        '<button class="btn-checkout" id="checkoutBtn" disabled>Proceder al Pago</button>';

      bindMachineForm(exc);
    } else {
      bookingBody.innerHTML = "" +
        '<div class="form-grid">' +
        '  <div class="form-group full"><label>Fecha del tour</label><input type="date" id="excDate" min="' + todayStr() + '" value="' + todayStr() + '" /></div>' +
        '  <div class="form-group"><label>Adultos</label><input type="number" id="excAdults" min="1" value="1" /></div>' +
        '  <div class="form-group"><label>Niños 3-9 años</label><input type="number" id="excChildren" min="0" value="0" /></div>' +
        '  <div class="form-group"><label>Menores de 3 años</label><input type="number" id="excInfants" min="0" value="0" /></div>' +
        '  <div class="form-group"><label>Recogida</label><select id="excPickup">' + pickupMarkup + "</select></div>" +
        "</div>" +
        '<div class="summary-box" id="summaryBox"></div>' +
        '<button class="btn-checkout" id="checkoutBtn" disabled>Proceder al Pago</button>';

      bindPersonForm(exc);
    }
  }

  /* ── Machine form logic ───────────────────────── */

  function bindMachineForm(exc) {
    var machineGrid = document.getElementById("machineGrid");
    var qtyEl = document.getElementById("excQty");
    var dateEl = document.getElementById("excDate");
    var pickupEl = document.getElementById("excPickup");
    var summaryBox = document.getElementById("summaryBox");
    var checkoutBtn = document.getElementById("checkoutBtn");

    machineGrid.querySelectorAll(".machine-card").forEach(function (card) {
      card.addEventListener("click", function () {
        machineGrid.querySelectorAll(".machine-card").forEach(function (c) { c.classList.remove("selected"); });
        card.classList.add("selected");
        selectedMachine = exc.machines[Number(card.dataset.machine)];
        updateMachineSummary();
      });
    });

    qtyEl.addEventListener("input", updateMachineSummary);

    function updateMachineSummary() {
      var qty = Math.max(1, Number(qtyEl.value || 1));
      if (!selectedMachine) {
        summaryBox.innerHTML = '<div class="summary-item"><span>Selecciona una máquina para ver el precio</span></div>';
        checkoutBtn.disabled = true;
        return;
      }
      var total = selectedMachine.price * qty;
      summaryBox.innerHTML = "" +
        '<div class="summary-item"><span>Máquina</span><strong>' + selectedMachine.name + "</strong></div>" +
        '<div class="summary-item"><span>Precio por unidad</span><strong>' + money(selectedMachine.price) + "</strong></div>" +
        '<div class="summary-item"><span>Cantidad</span><strong>' + qty + "</strong></div>" +
        '<div class="summary-item"><span>Total a pagar</span><strong>' + money(total) + "</strong></div>";
      checkoutBtn.disabled = false;
    }

    updateMachineSummary();

    checkoutBtn.addEventListener("click", function () {
      var qty = Math.max(1, Number(qtyEl.value || 1));
      var total = selectedMachine.price * qty;
      var draft = {
        type: "excursion",
        excursionType: "maquina",
        product: exc.name + " — " + selectedMachine.name,
        serviceId: exc.serviceId || undefined,
        serviceDate: dateEl.value,
        machineName: selectedMachine.name,
        machinePrice: selectedMachine.price,
        adults: qty,
        children: 0,
        infants: 0,
        unitPrice: selectedMachine.price,
        total: total,
        pickupLocation: pickupEl.value,
        pickupTime: pickupEl.value === "Mi ubicación actual" ? "Según confirmación del operador" : pickupEl.value,
        hotel: pickupEl.value === "Mi ubicación actual" ? "Mi ubicación actual" : pickupEl.value
      };
      localStorage.setItem("jacBookingDraft", JSON.stringify(draft));
      window.location.href = "checkout.html?prefill=1";
    });
  }

  /* ── Person form logic ────────────────────────── */

  function bindPersonForm(exc) {
    var dateEl = document.getElementById("excDate");
    var adultsEl = document.getElementById("excAdults");
    var childrenEl = document.getElementById("excChildren");
    var infantsEl = document.getElementById("excInfants");
    var pickupEl = document.getElementById("excPickup");
    var summaryBox = document.getElementById("summaryBox");
    var checkoutBtn = document.getElementById("checkoutBtn");

    var childRate = exc.price * 0.5;

    function updatePersonSummary() {
      var adults = Math.max(0, Number(adultsEl.value || 0));
      var children = Math.max(0, Number(childrenEl.value || 0));
      var infants = Math.max(0, Number(infantsEl.value || 0));
      var total = adults * exc.price + children * childRate;
      var pax = adults + children + infants;

      summaryBox.innerHTML = "" +
        '<div class="summary-item"><span>Adulto</span><strong>' + money(exc.price) + "</strong></div>" +
        '<div class="summary-item"><span>Niño 3-9 años</span><strong>' + money(childRate) + "</strong></div>" +
        '<div class="summary-item"><span>Menor de 3 años</span><strong>Gratis</strong></div>" +
        '<div class="summary-item"><span>Total personas</span><strong>' + pax + "</strong></div>" +
        '<div class="summary-item"><span>Total a pagar</span><strong>' + money(total) + "</strong></div>";
      checkoutBtn.disabled = (adults + children + infants) === 0;
    }

    [adultsEl, childrenEl, infantsEl].forEach(function (el) {
      el.addEventListener("input", updatePersonSummary);
    });

    updatePersonSummary();

    checkoutBtn.addEventListener("click", function () {
      var adults = Math.max(0, Number(adultsEl.value || 0));
      var children = Math.max(0, Number(childrenEl.value || 0));
      var infants = Math.max(0, Number(infantsEl.value || 0));
      var total = adults * exc.price + children * childRate;
      var draft = {
        type: "excursion",
        excursionType: "personas",
        product: exc.name,
        serviceId: exc.serviceId || undefined,
        serviceDate: dateEl.value,
        adults: adults,
        children: children,
        infants: infants,
        unitPrice: exc.price,
        total: total,
        pickupLocation: pickupEl.value,
        pickupTime: pickupEl.value === "Mi ubicación actual" ? "Según confirmación del operador" : pickupEl.value,
        hotel: pickupEl.value === "Mi ubicación actual" ? "Mi ubicación actual" : pickupEl.value
      };
      localStorage.setItem("jacBookingDraft", JSON.stringify(draft));
      window.location.href = "checkout.html?prefill=1";
    });
  }

  /* ── Init ─────────────────────────────────────── */

  renderGrid("all");
  syncPrices();
})();
