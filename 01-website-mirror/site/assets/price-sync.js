(function () {
  var SUPABASE_URL = 'https://jxetcadstgvcrfkphofe.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_aN6W7TXtid9mCFeDHovBlw_B5ieoxGG';
  var supabaseClient = null;

  function initSupabase() {
    if (typeof window.supabase === 'undefined') {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = function () {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      };
      document.head.appendChild(script);
      return false;
    } else if (!supabaseClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return true;
  }

  function money(value) {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  }

  function loadAllServices() {
    var functionUrl = 'https://jxetcadstgvcrfkphofe.supabase.co/functions/v1/get-services';

    return fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      }
    })
      .then(function (response) {
        if (!response.ok) {
          console.error('HTTP Error:', response.status, response.statusText);
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        console.log('📦 Servicios obtenidos:', data.length);
        return data || [];
      })
      .catch(function (error) {
        console.error('❌ Error cargando servicios:', error);
        return [];
      });
  }

  function normalizeSlug(slug) {
    return String(slug)
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/á|à|â|ä|ã/g, 'a')
      .replace(/é|è|ê|ë/g, 'e')
      .replace(/í|ì|î|ï/g, 'i')
      .replace(/ó|ò|ô|ö|õ/g, 'o')
      .replace(/ú|ù|û|ü/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function getCurrentPageSlug() {
    var pathname = window.location.pathname;
    var filename = (pathname || '').split('/').pop() || '';
    return decodeURIComponent(filename).replace(/\.html$/i, '');
  }

  function displayPrice(service) {
    return service.offer_active && service.offer_price !== null
      ? service.offer_price
      : service.base_price;
  }

  function updatePriceHook(hook, service) {
    var priceElement = hook.querySelector('p, [data-price], .price') || hook;
    var formattedPrice = money(service.base_price);
    if (priceElement.textContent.trim() !== formattedPrice) {
      priceElement.textContent = formattedPrice;
    }
    priceElement.style.textDecoration = service.offer_active && service.offer_price !== null
      ? 'line-through'
      : 'none';
  }

  function updatePriceCard(card, service) {
    var offerPriceElement = card.querySelector('[data-framer-name="Precio"] p, [data-framer-name="Precio"] [data-price]');
    var regularPriceElement = card.querySelector('[data-framer-name="PrecioHook"] p, [data-framer-name="PrecioHook"] [data-price]');

    if (service.offer_active && service.offer_price !== null) {
      var offerPriceFormatted = money(service.offer_price);
      if (offerPriceElement && offerPriceElement.textContent.trim() !== offerPriceFormatted) {
        offerPriceElement.textContent = offerPriceFormatted;
      }
      if (offerPriceElement) {
        offerPriceElement.style.textDecoration = 'none';
      }
    } else {
      var basePriceFormatted = money(service.base_price);
      if (offerPriceElement && offerPriceElement.textContent.trim() !== basePriceFormatted) {
        offerPriceElement.textContent = basePriceFormatted;
      }
      if (offerPriceElement) {
        offerPriceElement.style.textDecoration = 'none';
      }
    }

    if (regularPriceElement) {
      var regularPrice = money(service.base_price);
      if (regularPriceElement.textContent.trim() !== regularPrice) {
        regularPriceElement.textContent = regularPrice;
      }
      regularPriceElement.style.textDecoration = service.offer_active && service.offer_price !== null
        ? 'line-through'
        : 'none';
    }

    var offerBadge = card.querySelector('.jac-dynamic-offer');
    if (service.offer_active && service.offer_price !== null) {
      if (offerBadge) {
        offerBadge.textContent = service.offer_label || 'OFERTA';
      }
    } else if (offerBadge) {
      offerBadge.style.display = 'none';
    }
  }

  function findPriceContainer(card) {
    var current = card;
    for (var level = 0; current && level < 8; level += 1) {
      if (current.querySelector('[data-framer-name="Precio"], [data-framer-name="PrecioHook"]')) {
        return current;
      }
      current = current.parentElement;
    }
    return card;
  }

  function normalizedWords(value) {
    return normalizeSlug(value).replace(/[^a-z0-9áéíóúñ]+/g, ' ').trim().split(/\s+/);
  }

  function findServiceByCardText(card, services) {
    var cardWords = normalizedWords(card.textContent || '');
    return services.reduce(function (best, service) {
      var serviceWords = normalizedWords(service.title);
      var matches = serviceWords.filter(function (word) {
        return word.length > 2 && cardWords.indexOf(word) !== -1;
      }).length;
      if (!best || matches > best.matches) return { service: service, matches: matches };
      return best;
    }, null);
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
        var formattedPrice = money(displayPrice(currentService));
        if (el.textContent.trim() !== formattedPrice) el.textContent = formattedPrice;
      }
    });

    document.querySelectorAll('[data-framer-name="PrecioHook"]').forEach(function (hook) {
      var card = hook.closest('a') || hook.parentElement?.parentElement?.parentElement || hook;
      updatePriceCard(card, currentService);
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
    var serviceCards = document.querySelectorAll('[data-service-slug], .service-card, [data-framer-name*="Serv"], a[href*="servicios/"]');

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
        var formattedPrice = money(displayPrice(service));
        if (priceEl.textContent.trim() !== formattedPrice) priceEl.textContent = formattedPrice;
      }

      updatePriceCard(findPriceContainer(card), service);

      var priceHook = card.matches('[data-framer-name="PrecioHook"]')
        ? card
        : card.querySelector('[data-framer-name="PrecioHook"]');
      if (priceHook && !card.querySelector('[data-framer-name="Precio"]')) {
        updatePriceHook(priceHook, service);
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

    document.querySelectorAll('[data-framer-name="Precio"]').forEach(function (priceBlock) {
      var card = findPriceContainer(priceBlock);
      var match = findServiceByCardText(card, services);
      if (match && match.matches > 0) updatePriceCard(card, match.service);
    });
  }

  function initPriceSync() {
    console.log('🔄 Iniciando sincronización de precios...');

    loadAllServices().then(function (services) {
      console.log('✅ Servicios cargados:', services.length);

      if (!services || services.length === 0) {
        console.warn('⚠️ No se cargaron servicios. Reintentando en 2s...');
        setTimeout(initPriceSync, 2000);
        return;
      }

      updatePagePrices(services);
      updateAllThumbnails(services);

      [500, 1500, 3000].forEach(function (delay) {
        setTimeout(function () {
          updatePagePrices(services);
          updateAllThumbnails(services);
        }, delay);
      });

      var syncTimer;
      var observer = new MutationObserver(function () {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(function () {
          updatePagePrices(services);
          updateAllThumbnails(services);
        }, 100);
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Re-sincronizar cada 15 segundos (más frecuente)
      setInterval(function () {
        console.log('🔄 Re-sincronizando precios...');
        loadAllServices().then(function (updated) {
          if (updated && updated.length > 0) {
            console.log('✅ Precios actualizados:', updated.length);
            updatePagePrices(updated);
            updateAllThumbnails(updated);
          }
        });
      }, 15000);
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
