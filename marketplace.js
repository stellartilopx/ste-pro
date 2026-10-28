const marketplaceCurrency = window.marketplaceCurrency || { currencyCode: "EUR" };
let marketplacePriceFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: marketplaceCurrency.currencyCode,
});

const cartStorageKey = "ste-commerce-cart-items";

function setMarketplaceCurrency(currencyCode) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
  });

  marketplaceCurrency.currencyCode = currencyCode;
  marketplacePriceFormatter = formatter;
  document.querySelector(".marketplace-settings-warning")?.remove();
  window.dispatchEvent(new CustomEvent("marketplacecurrencychange", {
    detail: { currencyCode },
  }));
}

async function loadMarketplaceCurrency() {
  if (!window.supabaseClient) {
    throw new Error(window.supabaseClientError || "Supabase is not configured.");
  }

  const { data, error } = await window.supabaseClient
    .from("marketplace_settings")
    .select("currency_code")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data?.currency_code) {
    throw new Error("The global marketplace currency setting is not configured.");
  }

  setMarketplaceCurrency(data.currency_code);
}

function showCurrencySettingsWarning(error) {
  const warning = document.createElement("p");
  warning.className = "marketplace-settings-warning";
  warning.setAttribute("role", "status");
  warning.textContent = `Global currency settings could not be loaded (${error.message}). Prices are currently displayed using the default marketplace currency, EUR.`;
  document.body.prepend(warning);
}

const marketplaceCurrencyReady = loadMarketplaceCurrency().catch((error) => {
  window.marketplaceCurrencyLoadError = error;
  showCurrencySettingsWarning(error);
});

function formatMarketplacePrice(amount) {
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid product price: ${amount}`);
  }

  return marketplacePriceFormatter.format(amount);
}

function getCartItems() {
  const storedItems = localStorage.getItem(cartStorageKey);
  const cartItems = storedItems ? JSON.parse(storedItems) : [];

  if (!Array.isArray(cartItems)) {
    throw new Error("Saved cart data is invalid. Clear the cart storage to continue.");
  }

  cartItems.forEach((item) => {
    const product = window.productCatalog.find((catalogItem) => catalogItem.id === item.productId);
    if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > product.stock) {
      throw new Error("Saved cart data contains an invalid product or quantity.");
    }
  });

  return cartItems;
}

function saveCartItems(cartItems) {
  localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
}

function getCartCount() {
  return getCartItems().reduce((total, item) => total + item.quantity, 0);
}

function addItemsToCart(productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`Invalid cart quantity: ${quantity}`);
  }

  const product = window.productCatalog.find((item) => item.id === productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const cartItems = getCartItems();
  const existingItem = cartItems.find((item) => item.productId === productId);
  const updatedQuantity = (existingItem ? existingItem.quantity : 0) + quantity;

  if (updatedQuantity > product.stock) {
    throw new Error(`Only ${product.stock} ${product.name} available.`);
  }

  if (existingItem) {
    existingItem.quantity = updatedQuantity;
  } else {
    cartItems.push({ productId, quantity });
  }

  saveCartItems(cartItems);
  return getCartCount();
}

function setCartItemQuantity(productId, quantity) {
  const product = window.productCatalog.find((item) => item.id === productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
    throw new Error(`Choose a quantity between 1 and ${product.stock}.`);
  }

  const cartItems = getCartItems();
  const item = cartItems.find((cartItem) => cartItem.productId === productId);
  if (!item) {
    throw new Error(`Product is not in the cart: ${productId}`);
  }

  item.quantity = quantity;
  saveCartItems(cartItems);
  return getCartCount();
}

function removeCartItem(productId) {
  saveCartItems(getCartItems().filter((item) => item.productId !== productId));
  return getCartCount();
}

function updateCartBadge() {
  const cartCountElement = document.querySelector(".cart-count");
  const cartButton = document.querySelector(".cart-button");

  if (!cartCountElement || !cartButton) {
    return;
  }

  const count = getCartCount();
  cartCountElement.textContent = count;
  cartButton.setAttribute(
    "aria-label",
    `Shopping bag, ${count} ${count === 1 ? "item" : "items"}`,
  );
}

window.marketplace = {
  formatPrice: formatMarketplacePrice,
  currency: marketplaceCurrency,
  currencyReady: marketplaceCurrencyReady,
  setCurrency: setMarketplaceCurrency,
  addItemsToCart,
  getCartItems,
  getCartCount,
  setCartItemQuantity,
  removeCartItem,
  updateCartBadge,
};
