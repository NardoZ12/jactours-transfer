(function () {
  // TODO: replace with the real Supabase anon key (Project Settings > API) before this can log in for real.
  var SUPABASE_URL = "https://jxetcadstgvcrfkphofe.supabase.co";
  var SUPABASE_ANON_KEY = "TU_ANON_KEY";

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
      '<div class="jac-account-dialog" role="dialog" aria-modal="true" aria-label="Iniciar sesi\u00f3n">' +
      '<button class="jac-account-close" type="button" aria-label="Cerrar" data-close="1">x</button>' +
      '<h3>Iniciar sesi\u00f3n</h3>' +
      '<p>Ingresa con tu correo y contrase\u00f1a.</p>' +
      '<form class="jac-account-form" novalidate>' +
      '<label>Correo electr\u00f3nico<input type="email" name="email" autocomplete="email" required></label>' +
      '<label>Contrase\u00f1a<input type="password" name="password" autocomplete="current-password" required></label>' +
      '<p class="jac-account-error" hidden></p>' +
      '<button type="submit" class="jac-account-link primary">Entrar</button>' +
      '</form>' +
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

    modal.querySelector(".jac-account-form").addEventListener("submit", function (event) {
      event.preventDefault();
      handleLoginSubmit(event.target, base);
    });

    document.body.appendChild(modal);
  }

  function handleLoginSubmit(form, base) {
    var email = form.email.value.trim();
    var password = form.password.value;
    var errorEl = form.querySelector(".jac-account-error");
    var submitBtn = form.querySelector('button[type="submit"]');

    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Entrando...";

    import("https://esm.sh/@supabase/supabase-js@2")
      .then(function (mod) {
        var supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabase.auth.signInWithPassword({ email: email, password: password });
      })
      .then(function (result) {
        if (result.error) throw result.error;
        window.location.href = base + "index.html";
      })
      .catch(function (err) {
        errorEl.textContent = (err && err.message) || "No se pudo iniciar sesi\u00f3n.";
        errorEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Entrar";
      });
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

  function ensureMenuLoginLink() {
    document.querySelectorAll('[data-framer-name="Bottones"]').forEach(function (bottones) {
      // Two "Bottones" nodes exist: the compact always-visible header widget, and the
      // full mobile menu panel (identified by the nav link <ul> right before it). Only
      // the latter is the "menu" the login link should live in.
      var prev = bottones.previousElementSibling;
      if (!prev || prev.tagName !== "UL") return;
      if (bottones.querySelector(".jac-menu-login-link")) return;

      var link = document.createElement("a");
      link.href = "#";
      link.className = "jac-menu-login-link";
      link.textContent = "Iniciar sesión";
      link.addEventListener("click", function (event) {
        event.preventDefault();
        openModal();
      });

      // The weather/language widgets are hidden via CSS; put the link in that same
      // row, next to the button, instead of stacking it above the whole "Bottones" box.
      var row = bottones.querySelector('[data-framer-name="Desktop"]') || bottones;
      row.appendChild(link);
    });
  }

  function ensureAccountAccess() {
    if (!document.body) return;
    ensureModal();
    ensureMenuLoginLink();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureAccountAccess);
  } else {
    ensureAccountAccess();
  }

  // Framer re-renders the mobile menu after hydration; keep watching for it.
  new MutationObserver(function () {
    ensureMenuLoginLink();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
