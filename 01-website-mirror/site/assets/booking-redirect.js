// Booking Redirect Script - Redirige formularios de reserva a pasarela de pago
(function () {
  const PAYMENT_GATEWAY_URL = 'https://jac-pay-flow.base44.app/';

  function extractPrice() {
    // Busca el precio en el texto de la página
    const bodyText = document.body.innerText;
    const priceMatches = bodyText.match(/US\$[\d,]+\.?\d*/g);
    if (priceMatches && priceMatches.length > 0) {
      // Toma el precio más alto (probablemente sea el total)
      return priceMatches[priceMatches.length - 1].replace('US$', '');
    }
    return null;
  }

  function createBookingButton() {
    const price = extractPrice();
    const tourName = document.querySelector('h1')?.textContent || document.title;

    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      padding: 40px 20px;
      background: linear-gradient(135deg, rgba(242, 125, 46, 0.05) 0%, rgba(217, 107, 37, 0.05) 100%);
    `;

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

      const tourData = {
        tour: tourName,
        price: price || 'Por consultar',
        timestamp: new Date().toISOString()
      };

      sessionStorage.setItem('jac_tour_data', JSON.stringify(tourData));
      window.location.href = PAYMENT_GATEWAY_URL;
    });

    container.appendChild(button);
    return container;
  }

  function replaceBookingForms() {
    try {
      // Busca botones con texto "Continuar" u "Reservar"
      const allButtons = Array.from(document.querySelectorAll('button'));
      let foundButton = false;

      for (const btn of allButtons) {
        const btnText = btn.textContent.toLowerCase();
        if (
          btnText.includes('continuar') ||
          btnText.includes('reservar') ||
          btnText.includes('booking') ||
          btnText.includes('comprar')
        ) {
          console.log('Botón encontrado:', btn.textContent);

          // Reemplaza el botón y su contexto
          const bookingButton = createBookingButton();
          btn.parentNode.replaceChild(bookingButton, btn);
          foundButton = true;
          break;
        }
      }

      // Si no encuentra botón, busca formularios
      if (!foundButton) {
        const forms = document.querySelectorAll('form');
        if (forms.length > 0) {
          console.log('Formulario encontrado');
          const bookingButton = createBookingButton();
          forms[forms.length - 1].parentNode.replaceChild(bookingButton, forms[forms.length - 1]);
          foundButton = true;
        }
      }

      // Si aún no encuentra nada, agrega el botón al final de la página
      if (!foundButton) {
        console.log('No se encontró botón ni formulario. Insertando al final.');
        const bookingButton = createBookingButton();
        document.body.appendChild(bookingButton);
      }

      return foundButton;
    } catch (error) {
      console.error('Error en replaceBookingForms:', error);
      return false;
    }
  }

  // Usa MutationObserver para detectar cambios dinámicos
  function observeChanges() {
    const observer = new MutationObserver(() => {
      // Si ya reemplazamos, no vuelvas a intentar
      if (!document.querySelector('.jac-reserve-button')) {
        replaceBookingForms();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  // Ejecuta cuando el DOM esté listo
  function init() {
    console.log('Script de reserva inicializado');
    replaceBookingForms();
    setTimeout(() => replaceBookingForms(), 500);
    setTimeout(() => replaceBookingForms(), 1500);
    setTimeout(() => replaceBookingForms(), 3000);

    // Observa cambios futuros
    observeChanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Intenta una vez más después de que se carguen todos los recursos
  window.addEventListener('load', () => {
    setTimeout(() => replaceBookingForms(), 500);
  });
})();
