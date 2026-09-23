// JAC Tours Booking Redirect - Replaces continue button with payment gateway
(function () {
  const PAYMENT_GATEWAY_URL = 'https://jac-pay-flow.base44.app/';
  let observerActive = false;

  function extractPrice() {
    const bodyText = document.body.innerText;
    const priceMatches = bodyText.match(/US\$[\d,]+\.?\d*/g);
    return priceMatches && priceMatches.length > 0
      ? priceMatches[priceMatches.length - 1].replace('US$', '')
      : null;
  }

  function replaceButton() {
    // Busca todos los botones
    const allButtons = Array.from(document.querySelectorAll('button'));

    for (const btn of allButtons) {
      const btnText = btn.textContent.trim();

      // Si ya fue reemplazado, skip
      if (btn.className.includes('jac-reserve-button')) {
        continue;
      }

      // Busca el botón "Continuar"
      if (btnText === 'Continuar') {
        console.log('[JAC] Encontrado botón "Continuar", reemplazando...');

        const price = extractPrice();
        const tourName = document.querySelector('h1')?.textContent || document.title;

        // Crea el nuevo botón
        const newBtn = document.createElement('button');
        newBtn.className = 'jac-reserve-button';
        newBtn.type = 'button';

        newBtn.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <span>RESERVAR AHORA</span>
            <strong style="font-size: 24px;">US$${price || '?'}</strong>
          </div>
        `;

        newBtn.style.cssText = `
          width: 100%;
          padding: 24px 32px;
          background: linear-gradient(135deg, #f27d2e 0%, #d96b25 100%);
          color: white;
          border: none;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 10px;
          font-family: 'Poppins', sans-serif;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 8px 24px rgba(242, 125, 46, 0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        `;

        // Eventos
        newBtn.addEventListener('mouseover', function () {
          this.style.transform = 'translateY(-4px)';
          this.style.boxShadow = '0 12px 32px rgba(242, 125, 46, 0.4)';
          this.style.background = 'linear-gradient(135deg, #e8722f 0%, #c85a1f 100%)';
        });

        newBtn.addEventListener('mouseout', function () {
          this.style.transform = 'none';
          this.style.boxShadow = '0 8px 24px rgba(242, 125, 46, 0.3)';
          this.style.background = 'linear-gradient(135deg, #f27d2e 0%, #d96b25 100%)';
        });

        newBtn.addEventListener('click', function (e) {
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

        // Reemplaza el botón
        btn.replaceWith(newBtn);
        console.log('[JAC] ✓ Botón reemplazado exitosamente');
        return true;
      }
    }

    return false;
  }

  function startObserver() {
    if (observerActive) return;
    observerActive = true;

    const observer = new MutationObserver(() => {
      replaceButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    console.log('[JAC] Observador activado');
  }

  function init() {
    console.log('[JAC] Inicializando script de reservas');

    // Intenta reemplazar inmediatamente
    replaceButton();

    // Reintentos
    setTimeout(() => replaceButton(), 500);
    setTimeout(() => replaceButton(), 1000);
    setTimeout(() => replaceButton(), 2000);

    // Activa observador para detectar cambios dinámicos
    startObserver();
  }

  // Espera a que DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // También intenta después de load
  window.addEventListener('load', () => {
    setTimeout(() => replaceButton(), 1000);
  });
})();
