(function () {
  var observerStarted = false;
  var fallbackTimer = null;

  function isVisible(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
  }

  function panelBasePath() {
    var path = (window.location.pathname || "").replace(/\\/g, "/");
    if (path.indexOf("/panelweb/") !== -1) return "./";
    if (path.indexOf("/en/servicios/") !== -1) return "../../panelweb/";
    if (path.indexOf("/en/") !== -1) return "../panelweb/";
    if (path.indexOf("/servicios/") !== -1) return "../panelweb/";
    return "panelweb/";
  }

  function ensureModal() {
    if (document.querySelector(".jac-account-modal")) return;
    var base = panelBasePath();
    var modal = document.createElement("div");
    modal.className = "jac-account-modal";
    modal.setAttribute("hidden", "hidden");
    modal.innerHTML =
      '<div class="jac-account-backdrop" data-close="1"></div>' +
      '<div class="jac-account-dialog" role="dialog" aria-modal="true" aria-label="Acceso de cuenta">' +
      '<button class="jac-account-close" type="button" aria-label="Cerrar" data-close="1">x</button>' +
      '<h3>Tu cuenta</h3>' +
      '<p>Elige como quieres continuar.</p>' +
      '<a class="jac-account-link primary" href="' + base + 'index.html?preview=1">Iniciar sesion</a>' +
      '<a class="jac-account-link" href="' + base + 'cliente-registro.html">Registrarse</a>' +
      '<small>Usuario demo: admin@jactourspuntacana.com</small>' +
      '</div>';

    modal.addEventListener("click", function (event) {
      var target = event.target;
      if (target && target.getAttribute("data-close") === "1") {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });

    document.body.appendChild(modal);
  }

  function openModal() {
    var modal = document.querySelector(".jac-account-modal");
    if (!modal) return;
    modal.removeAttribute("hidden");
    document.body.classList.add("jac-modal-open");
  }

  function closeModal() {
    var modal = document.querySelector(".jac-account-modal");
    if (!modal) return;
    modal.setAttribute("hidden", "hidden");
    document.body.classList.remove("jac-modal-open");
  }

  function findHeaderBadgeHost() {
    var oldHosts = document.querySelectorAll(".jac-account-host");
    for (var h = 0; h < oldHosts.length; h++) {
      if (!isVisible(oldHosts[h])) {
        oldHosts[h].classList.remove("jac-account-host");
        var oldTrigger = oldHosts[h].querySelector(".jac-account-trigger");
        if (oldTrigger) oldTrigger.remove();
      }
    }

    var nodes = document.querySelectorAll("p,span,div");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var text = (node.textContent || "").trim();
      if (!/^(\+\s*\d+|error\s*c|error|asf|c\u00b0)$/i.test(text)) continue;
      if (!isVisible(node)) continue;

      var host = node.parentElement;
      while (host && host !== document.body) {
        if (host.querySelector("svg") && host.children.length >= 2) {
          return { host: host, label: node };
        }
        host = host.parentElement;
      }
    }
    return null;
  }

  function ensureDockedTrigger() {
    var found = findHeaderBadgeHost();
    if (!found || !found.host) return false;
    var host = found.host;

    if (found.label && found.label.parentElement) {
      found.label.textContent = "";
      found.label.parentElement.style.display = "none";
    }

    host.classList.add("jac-account-host");

    var noisyLabels = host.querySelectorAll("p,span,div");
    for (var i = 0; i < noisyLabels.length; i++) {
      var raw = (noisyLabels[i].textContent || "").trim();
      if (/^(\+\s*\d+|error\s*c|error|asf|c\u00b0)$/i.test(raw)) {
        noisyLabels[i].textContent = "";
        noisyLabels[i].style.display = "none";
      }
    }

    if (!host.querySelector(".jac-account-trigger")) {
      var trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "jac-account-trigger";
      trigger.setAttribute("aria-label", "Iniciar sesion o registrarse");
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openModal();
      });
      host.appendChild(trigger);
    }

    return true;
  }

  function ensureFallbackButton() {
    if (document.querySelector(".jac-account-fallback")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "jac-account-fallback";
    button.setAttribute("aria-label", "Cuenta");
    button.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    button.addEventListener("click", function () {
      openModal();
    });
    document.body.appendChild(button);
  }

  function removeFallbackButton() {
    var fallback = document.querySelector(".jac-account-fallback");
    if (fallback) fallback.remove();
  }

  function ensureAccountAccess() {
    if (!document.body) return;
    ensureModal();
    if (ensureDockedTrigger()) {
      removeFallbackButton();
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    } else if (!fallbackTimer) {
      fallbackTimer = setTimeout(function () {
        if (!ensureDockedTrigger()) {
          ensureFallbackButton();
        }
        fallbackTimer = null;
      }, 2000);
    }

    if (observerStarted) return;
    observerStarted = true;
    var observer = new MutationObserver(function () {
      ensureAccountAccess();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureAccountAccess);
  } else {
    ensureAccountAccess();
  }
})();
