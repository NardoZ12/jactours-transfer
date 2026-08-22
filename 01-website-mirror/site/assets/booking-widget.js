(function () {
  var SELECTOR_IFRAME = 'iframe[src*="calendly.com"]';
  var SUPABASE_URL = 'https://jxetcadstgvcrfkphofe.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_aN6W7TXtid9mCFeDHovBlw_B5ieoxGG';

  function money(value) {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  }

  function parsePriceCandidates(text) {
    if (!text) return [];
    var values = [];
    var rx = /USD\s*([0-9]+(?:[.,][0-9]{1,2})?)/gi;
    var m;
    while ((m = rx.exec(text)) !== null) {
      var v = Number(String(m[1]).replace(',', '.'));
      if (!Number.isNaN(v) && v > 0) values.push(v);
    }
    return values;
  }

  function detectBasePrice(root) {
    var text = root && root.textContent ? root.textContent : document.body.textContent || '';
    var prices = parsePriceCandidates(text).filter(function (v) { return v < 10000; });
    if (!prices.length) return 45;
    return Math.min.apply(Math, prices);
  }

  function detectTitle() {
    var h1 = document.querySelector('h1');
    if (h1 && h1.textContent.trim()) return h1.textContent.trim();
    var og = document.querySelector('meta[property="og:title"]');
    if (og && og.content) return og.content.trim();
    return document.title.replace(/\s*\|.*$/, '').trim() || 'Excursion';
  }

  function detectSlug() {
    var filename = (window.location.pathname || '').split('/').pop() || '';
    return decodeURIComponent(filename).replace(/\.html$/i, '');
  }

  function loadCatalogService() {
    var slug = detectSlug();
    if (!slug) return Promise.resolve(null);
    var endpoint = SUPABASE_URL + '/rest/v1/services?select=title,base_price,offer_price,offer_label,offer_active&active=eq.true&slug=eq.' + encodeURIComponent(slug) + '&limit=1';
    return fetch(endpoint, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY
      }
    })
      .then(function (response) {
        if (!response.ok) throw new Error('No se pudo cargar el precio');
        return response.json();
      })
      .then(function (rows) { return rows[0] || null; })
      .catch(function () { return null; });
  }

  function buildMarkup(title, basePrice, service) {
    var hasOffer = service && service.offer_active && service.offer_price !== null;
    var regularPrice = service ? Number(service.base_price || 0) : basePrice;
    var offerMarkup = hasOffer
      ? '<div class="jac-offer"><span>' + (service.offer_label || 'Oferta') + '</span><del>' + money(regularPrice) + '</del></div>'
      : '';
    return '' +
      '<section class="jac-booking-widget">' +
      '  <div class="jac-booking-head">' +
      '    <h3>Reserva directa - ' + title + '</h3>' +
      '    <p>Selecciona fecha, cantidad de personas y continua al pago.</p>' +
      '  </div>' +
      '  <div class="jac-booking-body">' +
      '    <div class="jac-step is-active" data-jac-step="1">' +
      '      <div class="jac-grid">' +
      '        <label class="jac-label jac-grid-1">Fecha del tour<input class="jac-input" data-jac-date type="date" required /></label>' +
      '        <label class="jac-label">Adultos<input class="jac-input" data-jac-adults type="number" min="1" value="1" /></label>' +
      '        <label class="jac-label">Ninos<input class="jac-input" data-jac-children type="number" min="0" value="0" /></label>' +
      '      </div>' +
      '      <div class="jac-summary">' +
      '        <div class="jac-summary-row"><span>Precio por persona</span><strong data-jac-base>' + money(basePrice) + '</strong></div>' +
      offerMarkup +
      '        <div class="jac-summary-row"><span>Total estimado</span><strong class="jac-total" data-jac-total>' + money(basePrice) + '</strong></div>' +
      '      </div>' +
      '      <div class="jac-actions">' +
      '        <button type="button" class="jac-btn jac-btn-primary" data-jac-next>Continuar</button>' +
      '      </div>' +
      '    </div>' +
      '    <div class="jac-step" data-jac-step="2">' +
      '      <div class="jac-grid">' +
      '        <label class="jac-label jac-grid-1">Nombre completo<input class="jac-input" data-jac-name type="text" placeholder="Nombre y apellido" /></label>' +
      '        <label class="jac-label">Email<input class="jac-input" data-jac-email type="email" placeholder="correo@ejemplo.com" /></label>' +
      '        <label class="jac-label">Telefono<input class="jac-input" data-jac-phone type="tel" placeholder="809..." /></label>' +
      '        <label class="jac-label jac-grid-1">Tarjeta<input class="jac-input" data-jac-card type="text" inputmode="numeric" placeholder="0000 0000 0000 0000" /></label>' +
      '      </div>' +
      '      <div class="jac-actions">' +
      '        <button type="button" class="jac-btn jac-btn-ghost" data-jac-back>Atras</button>' +
      '        <button type="button" class="jac-btn jac-btn-ghost" data-jac-card-pay>Pagar con tarjeta</button>' +
      '        <button type="button" class="jac-btn jac-btn-primary" data-jac-paypal>Pagar con PayPal</button>' +
      '      </div>' +
      '      <p class="jac-note">La reserva pasa al checkout para confirmar pago y disponibilidad.</p>' +
      '      <p class="jac-msg" data-jac-msg></p>' +
      '    </div>' +
      '  </div>' +
      '</section>';
  }

  function toIsoDate(value) {
    if (!value) return '';
    var d = new Date(value + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  function checkoutPath() {
    var path = (window.location.pathname || '').replace(/\\/g, '/');
    if (path.indexOf('/en/servicios/') !== -1 || path.indexOf('/servicios/') !== -1) return '../checkout.html?prefill=1';
    if (path.indexOf('/en/') !== -1 || path.indexOf('/panelweb/') !== -1) return '../checkout.html?prefill=1';
    return 'checkout.html?prefill=1';
  }

  async function mountWidget(host) {
    if (!host || host.dataset.jacBookingApplied === '1') return;
    host.dataset.jacBookingApplied = '1';
    var service = await loadCatalogService();
    var title = service && service.title ? service.title : detectTitle();
    var fallbackPrice = detectBasePrice(document.body);
    var basePrice = service
      ? Number(service.offer_active && service.offer_price !== null ? service.offer_price : service.base_price)
      : fallbackPrice;
    host.innerHTML = buildMarkup(title, basePrice, service);

    var step1 = host.querySelector('[data-jac-step="1"]');
    var step2 = host.querySelector('[data-jac-step="2"]');
    var dateEl = host.querySelector('[data-jac-date]');
    var adultsEl = host.querySelector('[data-jac-adults]');
    var childrenEl = host.querySelector('[data-jac-children]');
    var totalEl = host.querySelector('[data-jac-total]');
    var msgEl = host.querySelector('[data-jac-msg]');

    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    var minDate = yyyy + '-' + mm + '-' + dd;
    dateEl.min = minDate;
    dateEl.value = minDate;

    function computeTotal() {
      var adults = Math.max(0, Number(adultsEl.value || 0));
      var children = Math.max(0, Number(childrenEl.value || 0));
      var pax = adults + children;
      var total = pax * basePrice;
      if (pax === 0) total = basePrice;
      totalEl.textContent = money(total);
      return { adults: adults, children: children, total: total };
    }

    adultsEl.addEventListener('input', computeTotal);
    childrenEl.addEventListener('input', computeTotal);
    computeTotal();

    host.querySelector('[data-jac-next]').addEventListener('click', function () {
      if (!dateEl.value) {
        alert('Selecciona una fecha para continuar.');
        return;
      }
      step1.classList.remove('is-active');
      step2.classList.add('is-active');
    });

    host.querySelector('[data-jac-back]').addEventListener('click', function () {
      step2.classList.remove('is-active');
      step1.classList.add('is-active');
    });

    host.querySelector('[data-jac-card-pay]').addEventListener('click', function () {
      msgEl.textContent = 'Recibimos tus datos. En el siguiente paso conectaremos este pago con la pasarela.';
    });

    host.querySelector('[data-jac-paypal]').addEventListener('click', function () {
      var c = computeTotal();
      var draft = {
        product: title,
        serviceDate: toIsoDate(dateEl.value),
        adults: c.adults,
        children: c.children,
        unitPrice: basePrice,
        total: c.total,
        customerName: (host.querySelector('[data-jac-name]') || {}).value || '',
        customerEmail: (host.querySelector('[data-jac-email]') || {}).value || '',
        customerPhone: (host.querySelector('[data-jac-phone]') || {}).value || ''
      };

      try {
        localStorage.setItem('jacBookingDraft', JSON.stringify(draft));
      } catch (_e) {}

      window.location.href = checkoutPath();
    });
  }

  function replaceCalendly() {
    var iframes = Array.prototype.slice.call(document.querySelectorAll(SELECTOR_IFRAME));
    if (!iframes.length) return;

    iframes.forEach(function (iframe) {
      var host = iframe.closest('.framer-gbl1aq-container') || iframe.parentElement;
      mountWidget(host);
    });
  }

  function init() {
    replaceCalendly();
    var obs = new MutationObserver(function () {
      replaceCalendly();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(replaceCalendly, 600);
    setTimeout(replaceCalendly, 1600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
