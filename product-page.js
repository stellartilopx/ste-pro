const productDetails = document.querySelector("#product-details");
const productNotice = document.querySelector("#product-notice");
const toast = document.querySelector(".toast");
const productId = new URLSearchParams(window.location.search).get("id");

let toastTimeout;
let currentProduct;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function setProductNotice(message, isError = false) {
  productNotice.textContent = message;
  productNotice.hidden = !message;
  productNotice.classList.toggle("product-error", isError);
}

function renderProduct(product) {
  currentProduct = product;
  productDetails.hidden = false;

  const productImage = document.querySelector("#product-image");
  const stockStatus = document.querySelector("#stock-status");
  const quantityInput = document.querySelector("#product-quantity");
  const decreaseButton = document.querySelector("#quantity-decrease");
  const increaseButton = document.querySelector("#quantity-increase");
  const addToCartButton = document.querySelector("#add-to-cart");

  productImage.src = product.image;
  productImage.alt = product.imageAlt;
  document.querySelector("#product-category").textContent = product.category;
  document.querySelector("#product-name").textContent = product.name;
  document.querySelector("#product-price").textContent = window.marketplace.formatPrice(product.price);
  document.querySelector("#product-description").textContent = product.description;
  document.title = `${product.name} — STE Commerce`;
  quantityInput.max = product.stock;

  if (product.stock > 0) {
    stockStatus.textContent = `In stock — ${product.stock} available`;
    stockStatus.classList.add("in-stock");
    stockStatus.classList.remove("out-of-stock");
  } else {
    stockStatus.textContent = "Currently out of stock";
    stockStatus.classList.add("out-of-stock");
    stockStatus.classList.remove("in-stock");
    quantityInput.disabled = true;
    decreaseButton.disabled = true;
    increaseButton.disabled = true;
    addToCartButton.disabled = true;
  }
}

window.marketplace.updateCartBadge();

document.querySelector("#quantity-decrease").addEventListener("click", () => {
  const quantityInput = document.querySelector("#product-quantity");
  quantityInput.value = Math.max(1, Number(quantityInput.value) - 1);
});

document.querySelector("#quantity-increase").addEventListener("click", () => {
  const quantityInput = document.querySelector("#product-quantity");
  quantityInput.value = Math.min(currentProduct.stock, Number(quantityInput.value) + 1);
});

document.querySelector("#product-quantity").addEventListener("change", (event) => {
  const requestedQuantity = Number(event.target.value);
  event.target.value = Number.isFinite(requestedQuantity)
    ? Math.min(currentProduct.stock, Math.max(1, Math.floor(requestedQuantity)))
    : 1;
});

document.querySelector("#add-to-cart").addEventListener("click", () => {
  const quantity = Number(document.querySelector("#product-quantity").value);

  if (!currentProduct || !Number.isInteger(quantity) || quantity < 1 || quantity > currentProduct.stock) {
    showToast("Choose a quantity that is currently in stock.");
    return;
  }

  try {
    window.marketplace.addItemsToCart(currentProduct.id, quantity);
    window.marketplace.updateCartBadge();
    showToast(`${quantity} × ${currentProduct.name} added to your bag.`);
  } catch (error) {
    showToast(error.message);
  }
});

async function loadProduct() {
  if (!productId) {
    setProductNotice("No product was selected. Return to the marketplace to browse available items.", true);
    return;
  }

  setProductNotice("Loading product...");

  try {
    await window.marketplace.currencyReady;
    const products = await window.fetchActiveProducts();
    window.productCatalog = products;
    const product = products.find((item) => item.id === productId);

    if (!product) {
      setProductNotice("This product is unavailable or no longer active. Return to the marketplace to browse available items.", true);
      return;
    }

    renderProduct(product);
    productDetails.dataset.source = "supabase";
    setProductNotice("");
  } catch (error) {
    const fallbackProduct = window.productCatalog.find((item) => item.id === productId);

    if (fallbackProduct) {
      renderProduct(fallbackProduct);
      productDetails.dataset.source = "fallback";
      setProductNotice(`Unable to load live product data (${error.message}). Showing the sample product instead.`, true);
    } else {
      setProductNotice(`Unable to load this product (${error.message}). Please try again later.`, true);
    }
  }
}

loadProduct();
window.addEventListener("marketplacecurrencychange", () => {
  if (currentProduct) {
    renderProduct(currentProduct);
  }
});
