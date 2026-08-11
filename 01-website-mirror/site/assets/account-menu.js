(function () {
  var observerStarted = false;

  function createMenu() {
    if (!document.body || document.querySelector('.jac-account-menu')) return;

    var menu = document.createElement('div');
    menu.className = 'jac-account-menu';
    menu.innerHTML = '\n      <button class="jac-account-button" type="button" aria-label="Cuenta" aria-expanded="false">\n        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">\n          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>\n          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>\n        </svg>\n      </button>\n      <div class="jac-account-panel" role="menu">\n        <a class="jac-account-link primary" href="https://panel.jactourspuntacana.com/" role="menuitem">Iniciar sesión</a>\n        <a class="jac-account-link" href="https://panel.jactourspuntacana.com/cliente-registro.html" role="menuitem">Registrarse</a>\n      </div>\n    ';

    var button = menu.querySelector('.jac-account-button');
    var close = function () {
      menu.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
    };
    var toggle = function () {
      var open = menu.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(open));
    };

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    document.addEventListener('click', function (event) {
      if (!menu.contains(event.target)) close();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close();
    });

    document.body.appendChild(menu);
  }

  function ensureMenu() {
    createMenu();

    if (observerStarted || !document.body) return;
    observerStarted = true;

    var observer = new MutationObserver(function () {
      if (!document.querySelector('.jac-account-menu')) {
        createMenu();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureMenu);
  } else {
    ensureMenu();
  }
})();
