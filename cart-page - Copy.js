const cartItemsContainer = document.querySelector("#cart-items");
const cartLayout = document.querySelector("#cart-layout");
const emptyCartMessage = document.querySelector("#cart-empty");
const cartItemCount = document.querySelector("#cart-item-count");
const subtotalElement = document.querySelector("#cart-subtotal");
const totalElement = document.querySelector("#cart-total");
const toast = document.querySelector(".toast");

let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function createCartItem(item, product) {
  const row = document.createElement("article");
  row.className = "cart-item";
  row.dataset.productId = product.id;

  const imageLink = document.createElement("a");
  imageLink.className = "cart-item-image";
  imageLink.href = `product.html?id=${encodeURIComponent(product.id)}`;
  imageLink.setAttribute("aria-label", `View ${product.name}`);

  const image = document.createElement("img");
  image.src = product.image;
  image.alt = product.imageAlt;
  imageLink.append(image);

  const details = document.createElement("div");
  details.className = "cart-item-details";

  const nameLink = document.createElement("a");
  nameLink.className = "cart-item-name";
  nameLink.href = imageLink.href;
  nameLink.textContent = product.name;

  const category = document.createElement("p");
  category.className = "cart-item-category";
  category.textContent = product.category;

  const stock = document.createElement("p");
  stock.className = "cart-item-stock";
  stock.textContent = `${product.stock} available`;

  const controls = document.createElement("div");
  controls.className = "cart-item-controls";

  const quantityLabel = document.createElement("label");
  quantityLabel.className = "visually-hidden";
  quantityLabel.htmlFor = `quantity-${product.id}`;
  quantityLabel.textContent = `Quantity for ${product.name}`;

  const quantityControl = document.createElement("div");
  quantityControl.className = "quantity-input cart-quantity";

  const decreaseButton = document.createElement("button");
  decreaseButton.type = "button";
  decreaseButton.dataset.action = "decrease";
  decreaseButton.setAttribute("aria-label", `Decrease ${product.name} quantity`);
  decreaseButton.textContent = "−";

  const quantityInput = document.createElement("input");
  quantityInput.id = `quantity-${product.id}`;
  quantityInput.type = "number";
  quantityInput.min = "1";
  quantityInput.max = String(product.stock);
  quantityInput.value = String(item.quantity);
  quantityInput.inputMode = "numeric";
  quantityInput.setAttribute("aria-label", `Quantity for ${product.name}`);

  const increaseButton = document.createElement("button");
  increaseButton.type = "button";
  increaseButton.dataset.action = "increase";
  increaseButton.setAttribute("aria-label", `Increase ${product.name} quantity`);
  increaseButton.textContent = "+";

  quantityControl.append(decreaseButton, quantityInput, increaseButton);
  controls.append(quantityLabel, quantityControl);

  const removeButton = document.createElement("button");
  removeButton.className = "remove-cart-item";
  removeButton.type = "button";
  removeButton.dataset.action = "remove";
  removeButton.textContent = "Remove";
  removeButton.setAttribute("aria-label", `Remove ${product.name} from cart`);

  details.append(nameLink, category, stock, controls, removeButton);

  const pricing = document.createElement("div");
  pricing.className = "cart-item-pricing";

  const unitPrice = document.createElement("p");
  unitPrice.className = "cart-unit-price";
  unitPrice.textContent = window.marketplace.formatPrice(product.price);

  const lineTotal = document.createElement("p");
  lineTotal.className = "cart-line-total";
  lineTotal.textContent = window.marketplace.formatPrice(product.price * item.quantity);
  pricing.append(unitPrice, lineTotal);

  row.append(imageLink, details, pricing);
  return row;
}

function renderCart() {
  const items = window.marketplace.getCartItems();
  const productsById = new Map(window.productCatalog.map((product) => [product.id, product]));
  const cartTotalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => {
    const product = productsById.get(item.productId);
    return total + product.price * item.quantity;
  }, 0);

  cartItemsContainer.replaceChildren(
    ...items.map((item) => createCartItem(item, productsById.get(item.productId))),
  );
  cartLayout.hidden = items.length === 0;
  emptyCartMessage.hidden = items.length > 0;
  cartItemCount.textContent = `${cartTotalQuantity} ${cartTotalQuantity === 1 ? "item" : "items"}`;
  subtotalElement.textContent = window.marketplace.formatPrice(subtotal);
  totalElement.textContent = window.marketplace.formatPrice(subtotal);
  window.marketplace.updateCartBadge();
}

async function loadCart() {
  const cartNotice = document.querySelector("#cart-notice");

  try {
    await window.marketplace.currencyReady;
    window.productCatalog = await window.fetchActiveProducts();
    cartNotice.hidden = true;
  } catch (error) {
    cartNotice.textContent = `Unable to refresh marketplace information (${error.message}). Using sample products where available and the default currency if settings are unavailable.`;
    cartNotice.hidden = false;
  }

  try {
    renderCart();
  } catch (error) {
    cartLayout.hidden = true;
    emptyCartMessage.hidden = true;
    cartNotice.textContent = `Unable to display your cart (${error.message}). Product information could not be verified.`;
    cartNotice.hidden = false;
  }
}

cartItemsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const cartItem = button.closest(".cart-item");
  const productId = cartItem.dataset.productId;
  const currentItem = window.marketplace.getCartItems().find((item) => item.productId === productId);

  if (button.dataset.action === "remove") {
    window.marketplace.removeCartItem(productId);
    showToast("Product removed from your cart.");
    renderCart();
    return;
  }

  const product = window.productCatalog.find((item) => item.id === productId);
  const nextQuantity = button.dataset.action === "increase"
    ? Math.min(product.stock, currentItem.quantity + 1)
    : Math.max(1, currentItem.quantity - 1);

  window.marketplace.setCartItemQuantity(productId, nextQuantity);
  renderCart();
});

cartItemsContainer.addEventListener("change", (event) => {
  if (!event.target.matches(".cart-quantity input")) {
    return;
  }

  const cartItem = event.target.closest(".cart-item");
  const productId = cartItem.dataset.productId;
  const product = window.productCatalog.find((item) => item.id === productId);
  const requestedQuantity = Number(event.target.value);
  const quantity = Number.isFinite(requestedQuantity)
    ? Math.min(product.stock, Math.max(1, Math.floor(requestedQuantity)))
    : 1;

  window.marketplace.setCartItemQuantity(productId, quantity);
  renderCart();
});

window.addEventListener("marketplacecurrencychange", renderCart);
loadCart();
