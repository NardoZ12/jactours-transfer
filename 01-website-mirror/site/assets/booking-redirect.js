// Booking Redirect Script - Redirige formularios de reserva a pasarela de pago
(function () {
  const PAYMENT_GATEWAY_URL = 'https://jac-pay-flow.base44.app/';

  function replaceBookingForm() {
    // Busca el formulario de reserva (diferentes selectores para diferentes estructuras)
    const formSelectors = [
      'form[name*="reserv"]',
      '[class*="booking"]',
      '[class*="reserv"]',
      '[data-testid*="booking"]',
      '[data-testid*="reserv"]'
    ];

    let form = null;
    for (const selector of formSelectors) {
      form = document.querySelector(selector);
      if (form) break;
    }

    if (!form) return;

    // Busca el precio del tour
    const priceSelectors = [
      '[class*="price"]',
      '[class*="total"]',
      '[data-testid*="price"]',
      '[data-testid*="total"]'
    ];

    let priceElement = null;
    let priceText = 'Reservar';

    for (const selector of priceSelectors) {
      priceElement = form.querySelector(selector);
      if (priceElement) {
        priceText = priceElement.textContent.trim();
        break;
      }
    }

    // Si no encuentra el precio dentro del form, busca en toda la página
    if (!priceElement) {
      for (const selector of priceSelectors) {
        priceElement = document.querySelector(selector);
        if (priceElement && priceElement.textContent.includes('US$')) {
          priceText = priceElement.textContent.trim();
          break;
        }
      }
    }

    // Extrae el número del precio si es necesario
    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    const price = priceMatch ? priceMatch[0] : null;

    // Crea el nuevo botón de reserva
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'jac-reserve-button';
    button.innerHTML = `
      <div class="jac-reserve-content">
        <span class="jac-reserve-text">Reservar Ahora</span>
        ${price ? `<span class="jac-reserve-price">US$${price}</span>` : ''}
      </div>
    `;

    button.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      // Obtén datos de la página
      const tourName = document.querySelector('h1')?.textContent || 'Tour';
      const tourData = {
        tour: tourName,
        price: price || 'Por consultar',
        timestamp: new Date().toISOString()
      };

      // Guarda los datos en sessionStorage para pasarlos a la pasarela
      sessionStorage.setItem('jac_tour_data', JSON.stringify(tourData));

      // Redirige a la pasarela de pago
      window.location.href = PAYMENT_GATEWAY_URL;
    });

    // Reemplaza el formulario
    form.parentNode.replaceChild(button, form);
  }

  // Ejecuta cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceBookingForm);
  } else {
    replaceBookingForm();
  }

  // Intenta de nuevo después de un tiempo (para páginas dinámicas)
  setTimeout(replaceBookingForm, 1500);
})();
