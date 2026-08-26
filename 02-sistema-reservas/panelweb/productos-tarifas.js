import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://jxetcadstgvcrfkphofe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_aN6W7TXtid9mCFeDHovBlw_B5ieoxGG";
const LOCAL_PREVIEW = location.protocol === "file:" || new URLSearchParams(location.search).has("preview");
const supabase = LOCAL_PREVIEW ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const productsBody = document.getElementById("productsBody");
const productsMsg = document.getElementById("productsMsg");
const productModal = document.getElementById("productModal");
const productForm = document.getElementById("productForm");
const productFormMsg = document.getElementById("productFormMsg");
const productFilter = document.getElementById("productFilter");
const categoryFilter = document.getElementById("categoryFilter");
const addProductBtn = document.getElementById("addProductBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const backBtn = document.getElementById("backBtn");

let allProducts = [];
let currentProductId = null;

function money(value) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function ensureSession() {
  if (LOCAL_PREVIEW) return true;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "./index.html";
    return false;
  }
  return true;
}

async function loadProducts() {
  if (!(await ensureSession())) return;

  if (LOCAL_PREVIEW) {
    allProducts = [
      { id: "1", slug: "isla-saona", title: "Isla Saona Clásica", category: "excursion", base_price: 49, offer_price: 39, offer_label: "Verano", offer_active: true, active: true },
      { id: "2", slug: "tiara-50", title: "Tiara 50", category: "yate", base_price: 500, offer_price: null, offer_label: "", offer_active: false, active: true },
    ];
    renderProducts(allProducts);
    return;
  }

  const { data, error } = await supabase
    .from("services")
    .select("id,slug,title,category,base_price,offer_price,offer_label,offer_active,active")
    .order("category")
    .order("title");

  if (error) {
    productsBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  allProducts = data || [];
  renderProducts(allProducts);
}

function renderProducts(products) {
  productsBody.innerHTML = products
    .map((p) => `
      <tr>
        <td><strong>${escapeHtml(p.title)}</strong></td>
        <td>${escapeHtml(p.category)}</td>
        <td>${money(p.base_price)}</td>
        <td>${p.offer_price !== null ? money(p.offer_price) : "-"}</td>
        <td>${p.offer_active ? `<span class="badge">${escapeHtml(p.offer_label || "OFERTA")}</span>` : "-"}</td>
        <td>${p.active ? "✓" : "✗"}</td>
        <td>
          <button class="edit-btn" data-id="${p.id}">Editar</button>
          <button class="delete-btn" data-id="${p.id}" style="color:#999b85;background:none;border:none;cursor:pointer;padding:4px;">✕</button>
        </td>
      </tr>
    `)
    .join("");

  productsBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("edit-btn")) {
      const id = e.target.dataset.id;
      const product = allProducts.find((p) => p.id === id);
      if (product) openProductModal(product);
    }
  });
}

function openProductModal(product = null) {
  currentProductId = product?.id || null;
  if (product) {
    document.getElementById("productName").value = product.title;
    document.getElementById("productCategory").value = product.category;
    document.getElementById("productSlug").value = product.slug || "";
    document.getElementById("productBasePrice").value = product.base_price || 0;
    document.getElementById("productOfferPrice").value = product.offer_price || "";
    document.getElementById("productOfferLabel").value = product.offer_label || "";
    document.getElementById("productOfferActive").checked = product.offer_active || false;
    document.getElementById("productActive").checked = product.active !== false;
    productFormMsg.textContent = "Editando producto";
  } else {
    productForm.reset();
    document.getElementById("productActive").checked = true;
    productFormMsg.textContent = "Nuevo producto";
  }
  productModal.style.display = "flex";
}

function closeModal() {
  productModal.style.display = "none";
  currentProductId = null;
  productForm.reset();
  productFormMsg.textContent = "";
}

addProductBtn.addEventListener("click", () => openProductModal());
closeModalBtn.addEventListener("click", closeModal);

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (LOCAL_PREVIEW) {
    productFormMsg.textContent = "Vista local: cambios no se guardaron";
    return;
  }

  const payload = {
    title: document.getElementById("productName").value.trim(),
    category: document.getElementById("productCategory").value,
    slug: document.getElementById("productSlug").value.trim().toLowerCase().replace(/\s+/g, "-") || null,
    base_price: Number(document.getElementById("productBasePrice").value),
    offer_price: document.getElementById("productOfferPrice").value ? Number(document.getElementById("productOfferPrice").value) : null,
    offer_label: document.getElementById("productOfferLabel").value.trim() || null,
    offer_active: document.getElementById("productOfferActive").checked,
    active: document.getElementById("productActive").checked,
  };

  if (!payload.title || !payload.category || !payload.base_price) {
    productFormMsg.textContent = "Completa los campos requeridos";
    return;
  }

  if (payload.offer_active && !payload.offer_price) {
    productFormMsg.textContent = "La oferta activa requiere un precio";
    return;
  }

  try {
    if (currentProductId) {
      const { error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", currentProductId);
      if (error) throw error;
      productFormMsg.textContent = "Producto actualizado";
    } else {
      const { error } = await supabase
        .from("services")
        .insert([payload]);
      if (error) throw error;
      productFormMsg.textContent = "Producto creado";
    }
    setTimeout(() => {
      closeModal();
      loadProducts();
    }, 1000);
  } catch (error) {
    productFormMsg.textContent = `Error: ${error.message}`;
  }
});

function filterProducts() {
  const query = productFilter.value.toLowerCase();
  const category = categoryFilter.value;

  const filtered = allProducts.filter((p) => {
    const matchQuery = !query || p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
    const matchCategory = !category || p.category === category;
    return matchQuery && matchCategory;
  });

  renderProducts(filtered);
}

productFilter.addEventListener("input", filterProducts);
categoryFilter.addEventListener("change", filterProducts);

backBtn.addEventListener("click", () => {
  window.location.href = "./index.html";
});

loadProducts();
