(function () {
  var SUPABASE_URL = "https://jxetcadstgvcrfkphofe.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_aN6W7TXtid9mCFeDHovBlw_B5ieoxGG";
  var supabaseClientPromise;

  function getSupabaseClient() {
    if (!supabaseClientPromise) {
      supabaseClientPromise = import("https://esm.sh/@supabase/supabase-js@2").then(function (mod) {
        return mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      });
    }
    return supabaseClientPromise;
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
      '<form class="jac-account-form jac-account-password-form" hidden>' +
      '<label>Nueva contrase\u00f1a<input type="password" name="newPassword" autocomplete="new-password" minlength="8" required></label>' +
      '<label>Confirmar contrase\u00f1a<input type="password" name="confirmPassword" autocomplete="new-password" minlength="8" required></label>' +
      '<p class="jac-account-error" hidden></p>' +
      '<button type="submit" class="jac-account-link primary">Guardar contrase\u00f1a</button>' +
      '</form>' +
      '<a class="jac-account-link jac-account-register-link" href="' + base + 'cliente-registro.html">Registrarse</a>' +
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
    modal.querySelector(".jac-account-password-form").addEventListener("submit", function (event) {
      event.preventDefault();
      handlePasswordSubmit(event.target, base);
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

    getSupabaseClient()
      .then(function (supabase) {
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

  function handlePasswordSubmit(form, base) {
    var password = form.newPassword.value;
    var confirmation = form.confirmPassword.value;
    var errorEl = form.querySelector(".jac-account-error");
    var submitBtn = form.querySelector('button[type="submit"]');

    errorEl.hidden = true;
    if (password.length < 8 || password !== confirmation) {
      errorEl.textContent = password.length < 8
        ? "La contrase\u00f1a debe tener al menos 8 caracteres."
        : "Las contrase\u00f1as no coinciden.";
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";
    getSupabaseClient()
      .then(function (supabase) {
        return supabase.auth.updateUser({ password: password });
      })
      .then(function (result) {
        if (result.error) throw result.error;
        window.location.href = base + "index.html";
      })
      .catch(function (err) {
        errorEl.textContent = (err && err.message) || "No se pudo guardar la contrase\u00f1a.";
        errorEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Guardar contrase\u00f1a";
      });
  }

  function showPasswordSetup() {
    var modal = document.querySelector(".jac-account-modal");
    if (!modal) return;
    modal.querySelector("h3").textContent = "Crear contrase\u00f1a";
    modal.querySelector(".jac-account-dialog > p").textContent = "Define la contrase\u00f1a para tu cuenta administrativa.";
    modal.querySelector(".jac-account-form:not(.jac-account-password-form)").hidden = true;
    modal.querySelector(".jac-account-password-form").hidden = false;
    modal.querySelector(".jac-account-register-link").hidden = true;
    openModal();
  }

  function detectPasswordSetup() {
    var hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    var queryParams = new URLSearchParams(window.location.search);
    var type = hashParams.get("type") || queryParams.get("type");
    if (type !== "invite" && type !== "recovery" && !queryParams.has("code")) return;

    getSupabaseClient()
      .then(function (supabase) {
        return supabase.auth.getSession();
      })
      .then(function (result) {
        if (result.data && result.data.session) showPasswordSetup();
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
    detectPasswordSetup();
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
