// Booking Redirect Script - Redirige formularios de reserva a pasarela de pago
(function () {
  const PAYMENT_GATEWAY_URL = 'https://jac-pay-flow.base44.app/';
  let alreadyReplaced = false;

  function extractPrice() {
    const bodyText = document.body.innerText;
    const priceMatches = bodyText.match(/US\$[\d,]+\.?\d*/g);
    if (priceMatches && priceMatches.length > 0) {
      return priceMatches[priceMatches.length - 1].replace('US$', '');
    }
    return null;
  }

  function createBookingButton(price, tourName) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'jac-reserve-button';
    button.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 400px;
      padding: 24px 32px;
      margin: 20px auto;
      background: linear-gradient(135deg, #f27d2e 0%, #d96b25 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 8px 24px rgba(242, 125, 46, 0.3);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    button.innerHTML = `
      <span style="display: block; font-size: 18px; font-weight: 700; margin-bottom: 8px;">Reservar Ahora</span>
      ${price ? `<span style="display: block; font-size: 24px; font-weight: 800; color: rgba(255, 255, 255, 0.95);">US$${price}</span>` : ''}
    `;

    button.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      const tourData = {
        tour: tourName,
        price: price || 'Por consultar',
        timestamp: new Date().toISOString()
      };

      sessionStorage.setItem('jac_tour_data', JSON.stringify(tourData));
      window.location.href = PAYMENT_GATEWAY_URL;
    });

    button.addEventListener('mouseover', function () {
      this.style.transform = 'translateY(-4px)';
      this.style.boxShadow = '0 12px 32px rgba(242, 125, 46, 0.4)';
    });

    button.addEventListener('mouseout', function () {
      this.style.transform = 'none';
      this.style.boxShadow = '0 8px 24px rgba(242, 125, 46, 0.3)';
    });

    return button;
  }

  function replaceBookingForms() {
    if (alreadyReplaced) return;

    try {
      const price = extractPrice();
      const tourName = document.querySelector('h1')?.textContent || document.title;

      // Busca específicamente el botón "Continuar"
      const allButtons = Array.from(document.querySelectorAll('button'));

      for (const btn of allButtons) {
        const btnText = btn.textContent.trim();

        if (btnText === 'Continuar') {
          console.log('[JAC] Botón "Continuar" encontrado. Reemplazando...');

          // Obtén el contenedor más cercano (formulario o sección)
          let container = btn.parentElement;

          // Sube hasta encontrar un contenedor adecuado
          let depth = 0;
          while (container && depth < 5) {
            if (container.querySelector('button')) {
              break;
            }
            container = container.parentElement;
            depth++;
          }

          const newButton = createBookingButton(price, tourName);

          // Intenta reemplazar el botón directamente
          try {
            btn.replaceWith(newButton);
            console.log('[JAC] ✓ Botón reemplazado correctamente');
            alreadyReplaced = true;
            return;
          } catch (e) {
            console.log('[JAC] Intentando reemplazar contenedor padre...');
            if (container) {
              const wrapper = document.createElement('div');
              wrapper.style.cssText = 'display: flex; justify-content: center; width: 100%; padding: 20px;';
              wrapper.appendChild(newButton);
              container.parentNode.insertBefore(wrapper, container.nextSibling);
              btn.style.display = 'none';
              console.log('[JAC] ✓ Botón insertado después del contenedor');
              alreadyReplaced = true;
              return;
            }
          }
        }
      }

      // Si no encuentra "Continuar", intenta con otros botones
      for (const btn of allButtons) {
        const btnText = btn.textContent.toLowerCase();
        if (btnText.includes('reservar') || btnText.includes('booking') || btnText.includes('comprar')) {
          console.log('[JAC] Botón alternativo encontrado:', btn.textContent);
          const newButton = createBookingButton(price, tourName);
          btn.replaceWith(newButton);
          alreadyReplaced = true;
          return;
        }
      }

      console.log('[JAC] No se encontró botón "Continuar" aún. Reintentando...');
    } catch (error) {
      console.error('[JAC] Error:', error);
    }
  }

  // Ejecuta cuando el DOM esté listo
  function init() {
    console.log('[JAC] Script de reserva inicializado');
    replaceBookingForms();

    // Reintentos en intervalos
    setTimeout(() => replaceBookingForms(), 500);
    setTimeout(() => replaceBookingForms(), 1000);
    setTimeout(() => replaceBookingForms(), 2000);
    setTimeout(() => replaceBookingForms(), 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Intenta una vez más después de que se carguen todos los recursos
  window.addEventListener('load', () => {
    setTimeout(() => replaceBookingForms(), 1000);
  });

  // Observa cambios en el DOM por si el contenido es dinámico
  const observer = new MutationObserver(() => {
    if (!alreadyReplaced) {
      replaceBookingForms();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
