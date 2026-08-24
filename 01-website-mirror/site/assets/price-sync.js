(function () {
  var SUPABASE_URL = 'https://jxetcadstgvcrfkphofe.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_aN6W7TXtid9mCFeDHovBlw_B5ieoxGG';

  function money(value) {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  }

  function loadAllServices() {
    var endpoint = SUPABASE_URL + '/rest/v1/services?select=slug,title,base_price,offer_price,offer_label,offer_active&active=eq.true';
    return fetch(endpoint, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY
      }
    })
      .then(function (response) {
        if (!response.ok) throw new Error('No se pudo cargar servicios');
        return response.json();
      })
      .catch(function (error) {
        console.error('Error cargando servicios:', error);
        return [];
      });
  }

  function normalizeSlug(slug) {
    return String(slug)
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã±/g, 'ñ');
  }

  function getCurrentPageSlug() {
    var pathname = window.location.pathname;
    var filename = (pathname || '').split('/').pop() || '';
    return decodeURIComponent(filename).replace(/\.html$/i, '');
  }

  function updatePagePrices(services) {
    if (!services || services.length === 0) return;

    var pageSlug = getCurrentPageSlug();
    var normalizedPageSlug = normalizeSlug(pageSlug);

    var currentService = services.find(function (s) {
      return normalizeSlug(s.slug) === normalizedPageSlug;
    });

    if (!currentService) return;

    // Actualizar precio en el widget
    var priceElements = document.querySelectorAll('[data-jac-service-price], .jac-price, [data-price]');
    priceElements.forEach(function (el) {
      var currentText = el.textContent || '';
      if (currentText.includes('USD') || currentText.match(/\$|[0-9]+/)) {
        var displayPrice = currentService.offer_active && currentService.offer_price !== null
          ? currentService.offer_price
          : currentService.base_price;
        el.textContent = money(displayPrice);
      }
    });

    // Actualizar oferta si existe
    if (currentService.offer_active && currentService.offer_price !== null) {
      var offerElements = document.querySelectorAll('[data-jac-offer], .jac-offer-label');
      offerElements.forEach(function (el) {
        el.textContent = currentService.offer_label || 'OFERTA';
        el.style.display = 'block';
      });

      // Mostrar precio original tachado
      var regularPriceElements = document.querySelectorAll('[data-jac-regular-price]');
      regularPriceElements.forEach(function (el) {
        el.textContent = money(currentService.base_price);
        el.style.textDecoration = 'line-through';
      });
    }
  }

  function updateAllThumbnails(services) {
    // Buscar todas las miniaturas/cards de servicios
    var serviceCards = document.querySelectorAll('[data-service-slug], .service-card, [data-framer-name*="Serv"], a[href*="/servicios/"]');

    serviceCards.forEach(function (card) {
      var href = card.href || card.getAttribute('href') || '';
      if (!href) return;

      var slug = (href.split('/').pop() || '').replace(/\.html$/i, '');
      var normalizedSlug = normalizeSlug(slug);

      var service = services.find(function (s) {
        return normalizeSlug(s.slug) === normalizedSlug;
      });

      if (!service) return;

      // Buscar elementos de precio dentro de la tarjeta o cerca de ella
      var priceEl = card.querySelector('[data-price], .price, [data-jac-price]');
      if (priceEl) {
        var displayPrice = service.offer_active && service.offer_price !== null
          ? service.offer_price
          : service.base_price;
        priceEl.textContent = money(displayPrice);
      }

      // Buscar elemento de oferta
      if (service.offer_active && service.offer_price !== null) {
        var offerEl = card.querySelector('[data-offer], .offer-label, .jac-offer');
        if (offerEl) {
          offerEl.textContent = service.offer_label || 'OFERTA';
          offerEl.style.display = 'block';
        }
      }
    });
  }

  function initPriceSync() {
    loadAllServices().then(function (services) {
      updatePagePrices(services);
      updateAllThumbnails(services);

      // Re-sincronizar cada 30 segundos
      setInterval(function () {
        loadAllServices().then(function (updated) {
          updatePagePrices(updated);
          updateAllThumbnails(updated);
        });
      }, 30000);
    });

    // Inyectar botón de WhatsApp
    injectWhatsAppButton();
  }

  function injectWhatsAppButton() {
    // Verificar que no exista ya
    if (document.querySelector('.jac-whatsapp-btn')) return;

    var whatsappBtn = document.createElement('a');
    whatsappBtn.className = 'jac-whatsapp-btn';
    whatsappBtn.href = 'https://wa.me/18293026170?text=Hola%20JAC%20Tours%2C%20deseo%20realizar%20una%20reserva';
    whatsappBtn.target = '_blank';
    whatsappBtn.rel = 'noopener noreferrer';
    whatsappBtn.innerHTML = '💬';
    whatsappBtn.title = 'Contactar por WhatsApp';

    document.body.appendChild(whatsappBtn);
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPriceSync);
  } else {
    initPriceSync();
  }
})();
