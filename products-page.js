const catalogGrid = document.querySelector("#catalog-grid");
const searchInput = document.querySelector("#catalog-search-input");
const categoryFilter = document.querySelector("#category-filter");
const catalogCount = document.querySelector("#catalog-count");
const emptyMessage = document.querySelector("#catalog-empty");
const catalogStatus = document.querySelector("#catalog-status");
const catalogStatusMessage = document.querySelector("#catalog-status-message");
const retryButton = document.querySelector("#catalog-retry");
let catalogProducts = [];
let isLoading = true;

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card catalog-product-card";

  const imageContainer = document.createElement("div");
  imageContainer.className = "product-image";

  const imageLink = document.createElement("a");
  imageLink.className = "product-detail-link";
  imageLink.href = `product.html?id=${encodeURIComponent(product.id)}`;
  imageLink.setAttribute("aria-label", `View ${product.name} details`);

  const image = document.createElement("img");
  image.src = product.image;
  image.alt = product.imageAlt;
  image.loading = "lazy";
  imageLink.append(image);

  const productInfo = document.createElement("div");
  productInfo.className = "product-info";

  const productNameLink = document.createElement("a");
  productNameLink.className = "product-detail-link catalog-product-name";
  productNameLink.href = imageLink.href;

  const name = document.createElement("h2");
  name.textContent = product.name;
  const category = document.createElement("p");
  category.textContent = product.category;
  productNameLink.append(name, category);

  const price = document.createElement("span");
  price.className = "price";
  price.textContent = window.marketplace.formatPrice(product.price);
  productInfo.append(productNameLink, price);

  const cardFooter = document.createElement("div");
  cardFooter.className = "catalog-card-footer";

  const stockStatus = document.createElement("p");
  stockStatus.className = product.stock > 0 ? "catalog-stock in-stock" : "catalog-stock out-of-stock";
  stockStatus.textContent = product.stock > 0 ? `In stock (${product.stock})` : "Out of stock";

  const viewButton = document.createElement("a");
  viewButton.className = "button button-dark catalog-view-button";
  viewButton.href = imageLink.href;
  viewButton.textContent = "View Product";

  cardFooter.append(stockStatus, viewButton);
  imageContainer.append(imageLink);
  card.append(imageContainer, productInfo, cardFooter);
  return card;
}

function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;
  const filteredProducts = catalogProducts.filter((product) => {
    const matchesSearch = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  catalogGrid.replaceChildren(...filteredProducts.map(createProductCard));
  catalogCount.textContent = `${filteredProducts.length} ${filteredProducts.length === 1 ? "product" : "products"}`;
  emptyMessage.hidden = isLoading || filteredProducts.length > 0;
}

document.querySelector("#catalog-filters").addEventListener("submit", (event) => {
  event.preventDefault();
});

searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);

document.querySelectorAll("[data-category-link]").forEach((link) => {
  link.addEventListener("click", () => {
    categoryFilter.value = link.dataset.categoryLink;
    renderProducts();
  });
});

window.marketplace.updateCartBadge();

async function loadCatalog() {
  isLoading = true;
  catalogGrid.dataset.source = "loading";
  catalogStatus.hidden = false;
  catalogStatusMessage.textContent = "Loading products...";
  retryButton.hidden = true;
  renderProducts();

  try {
    await window.marketplace.currencyReady;
    if (!window.supabaseClient) {
      throw new Error(window.supabaseClientError || "Supabase is not configured.");
    }

    const { data, error } = await window.supabaseClient
      .from("products")
      .select("id, name, category, price, image, image_alt, description, stock, active")
      .eq("active", true);

    if (error) {
      throw error;
    }

    catalogProducts = data.map(window.mapSupabaseProduct);

    isLoading = false;
    catalogGrid.dataset.source = "supabase";
    catalogStatusMessage.textContent = "Products loaded from the live catalog.";
    catalogStatus.hidden = true;
    renderProducts();
  } catch (error) {
    catalogProducts = Array.isArray(window.productCatalog) ? window.productCatalog : [];
    isLoading = false;
    catalogGrid.dataset.source = "fallback";
    catalogStatus.hidden = false;
    catalogStatusMessage.textContent = catalogProducts.length
      ? `Unable to load the live catalog (${error.message}). Showing sample products for now.`
      : `Unable to load products (${error.message}).`;
    retryButton.hidden = false;
    renderProducts();
  }
}

retryButton.addEventListener("click", loadCatalog);
window.addEventListener("marketplacecurrencychange", renderProducts);
loadCatalog();
