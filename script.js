const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#site-search");
const productGrid = document.querySelector("#featured-products");
const productCards = [...productGrid.querySelectorAll(".product-card")];
const emptySearchMessage = document.querySelector(".empty-search");
const featuredStatus = document.querySelector("#featured-status");
const featuredStatusMessage = document.querySelector("#featured-status-message");
const retryButton = document.querySelector("#featured-retry");
const toast = document.querySelector(".toast");
const newsletterForm = document.querySelector(".newsletter-form");

let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function updateProductCard(card, product) {
  card.dataset.productId = product.id;
  card.dataset.productName = `${product.name} ${product.category} ${product.description}`.toLowerCase();

  const imageLink = card.querySelector(".product-image .product-detail-link");
  const image = imageLink.querySelector("img");
  const detailLink = `product.html?id=${encodeURIComponent(product.id)}`;
  imageLink.href = detailLink;
  imageLink.setAttribute("aria-label", `View ${product.name} details`);
  image.src = product.image;
  image.alt = product.imageAlt;

  const nameLink = card.querySelector(".product-info .product-detail-link");
  nameLink.href = detailLink;
  nameLink.querySelector("h3").textContent = product.name;
  nameLink.querySelector("p").textContent = product.category;
  card.querySelector(".price").textContent = window.marketplace.formatPrice(product.price);

  const quickAddButton = card.querySelector(".quick-add");
  quickAddButton.setAttribute("aria-label", `Add ${product.name} to bag`);
  quickAddButton.disabled = product.stock < 1;
  quickAddButton.title = product.stock < 1 ? "Out of stock" : `Add ${product.name} to bag`;

  const tag = imageLink.querySelector(".product-tag");
  if (tag) {
    tag.remove();
  }
}

function filterProducts(searchTerm) {
  const query = searchTerm.trim().toLowerCase();
  let visibleProductCount = 0;

  productCards.forEach((card) => {
    const isMatch = card.dataset.productName.includes(query);
    card.hidden = !isMatch;
    if (isMatch) visibleProductCount += 1;
  });

  emptySearchMessage.hidden = visibleProductCount > 0;
}

function showProducts(products, source) {
  window.productCatalog = products;
  productGrid.dataset.source = source;
  productCards.forEach((card, index) => {
    const product = products[index];
    if (product) {
      updateProductCard(card, product);
      card.hidden = false;
    } else {
      card.hidden = true;
    }
  });

  featuredStatus.hidden = source === "supabase";
  if (source === "fallback") {
    featuredStatusMessage.textContent = "Unable to load live featured products. Showing sample products instead.";
    retryButton.hidden = false;
  } else if (source === "supabase") {
    retryButton.hidden = true;
  }

  filterProducts(searchInput.value);
}

function refreshFeaturedPrices() {
  productCards.forEach((card, index) => {
    const product = window.productCatalog[index];
    if (product) {
      card.querySelector(".price").textContent = window.marketplace.formatPrice(product.price);
    }
  });
}

async function loadFeaturedProducts() {
  featuredStatus.hidden = false;
  featuredStatusMessage.textContent = "Loading featured products...";
  retryButton.hidden = true;
  productGrid.hidden = true;

  try {
    await window.marketplace.currencyReady;
    const products = await window.fetchActiveProducts();
    showProducts(products, "supabase");
    featuredStatusMessage.textContent = "Featured products loaded from the live catalog.";
  } catch (error) {
    showProducts(window.productCatalog, "fallback");
    featuredStatusMessage.textContent = `Unable to load live featured products (${error.message}). Showing sample products instead.`;
  } finally {
    productGrid.hidden = false;
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  filterProducts(searchInput.value);
  document.querySelector("#featured").scrollIntoView({ behavior: "smooth" });
});

searchInput.addEventListener("input", () => {
  filterProducts(searchInput.value);
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".quick-add");
  if (!button || button.disabled) {
    return;
  }

  const card = button.closest(".product-card");
  const productName = card.querySelector("h3").textContent;
  const productId = card.dataset.productId;

  try {
    window.marketplace.addItemsToCart(productId, 1);
    window.marketplace.updateCartBadge();
    showToast(`${productName} added to your bag.`);
  } catch (error) {
    showToast(error.message);
  }
});

newsletterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const emailInput = newsletterForm.querySelector("input");
  showToast("Thanks for subscribing to STE Commerce updates.");
  newsletterForm.reset();
  emailInput.focus();
});

retryButton.addEventListener("click", loadFeaturedProducts);
window.addEventListener("marketplacecurrencychange", refreshFeaturedPrices);
window.marketplace.updateCartBadge();
loadFeaturedProducts();
