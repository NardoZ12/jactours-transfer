// Booking Redirect Script - Redirige formularios de reserva a pasarela de pago
(function () {
  const PAYMENT_GATEWAY_URL = 'https://jac-pay-flow.base44.app/';

  function replaceBookingButton() {
    try {
      // Busca el botón "Continuar"
      const buttons = Array.from(document.querySelectorAll('button'));
      const continueBtn = buttons.find(b => b.textContent.trim() === 'Continuar');

      if (!continueBtn) {
        console.log('[JAC] Botón "Continuar" no encontrado');
        return false;
      }

      console.log('[JAC] Botón encontrado');

      // Extrae el precio de la página
      const bodyText = document.body.innerText;
      const priceMatches = bodyText.match(/US\$[\d,]+\.?\d*/g);
      const price = priceMatches && priceMatches.length > 0
        ? priceMatches[priceMatches.length - 1].replace('US$', '')
        : null;

      // Crea el nuevo botón
      const newBtn = document.createElement('button');
      newBtn.className = 'jac-reserve-button';
      newBtn.innerHTML = `RESERVAR AHORA<br>US$${price || '?'}`;
      newBtn.style.cssText = `
        width: 100%;
        padding: 20px;
        background: linear-gradient(135deg, #f27d2e 0%, #d96b25 100%);
        color: white;
        border: 2px solid #f27d2e;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        border-radius: 10px;
        font-family: 'Poppins', sans-serif;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
        box-shadow: 0 8px 24px rgba(242, 125, 46, 0.3);
      `;

      newBtn.addEventListener('mouseover', function () {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 12px 32px rgba(242, 125, 46, 0.4)';
      });

      newBtn.addEventListener('mouseout', function () {
        this.style.transform = 'none';
        this.style.boxShadow = '0 8px 24px rgba(242, 125, 46, 0.3)';
      });

      newBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const tourName = document.querySelector('h1')?.textContent || document.title;
        const tourData = {
          tour: tourName,
          price: price || 'Por consultar',
          timestamp: new Date().toISOString()
        };

        sessionStorage.setItem('jac_tour_data', JSON.stringify(tourData));
        window.location.href = PAYMENT_GATEWAY_URL;
      });

      // Reemplaza el botón
      continueBtn.replaceWith(newBtn);
      console.log('[JAC] ✓ Botón reemplazado correctamente');
      return true;

    } catch (error) {
      console.error('[JAC] Error:', error);
      return false;
    }
  }

  // Ejecuta en diferentes momentos
  function init() {
    console.log('[JAC] Script inicializado');

    // Intento inmediato
    replaceBookingButton();

    // Reintentos
    setTimeout(() => replaceBookingButton(), 300);
    setTimeout(() => replaceBookingButton(), 800);
    setTimeout(() => replaceBookingButton(), 2000);
    setTimeout(() => replaceBookingButton(), 3500);
  }

  // Espera a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Intenta después de que los recursos se carguen
  window.addEventListener('load', () => {
    setTimeout(() => replaceBookingButton(), 1000);
  });
})();
