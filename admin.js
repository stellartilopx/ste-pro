const loginSection = document.querySelector("#admin-login");
const dashboardSection = document.querySelector("#admin-dashboard");
const notice = document.querySelector("#admin-notice");
const loginForm = document.querySelector("#login-form");
const loginSubmitButton = loginForm.querySelector("button[type='submit']");
const productsMessage = document.querySelector("#products-message");
const productsTableBody = document.querySelector("#products-table-body");
const productEditor = document.querySelector("#product-editor");
const productForm = document.querySelector("#product-form");
const editorHeading = document.querySelector("#editor-heading");
const editorMessage = document.querySelector("#editor-message");
const saveProductButton = document.querySelector("#save-product-button");
const productPriceHelp = document.querySelector("#product-price-help");
const currencyForm = document.querySelector("#currency-settings-form");
const currencySelect = document.querySelector("#marketplace-currency");
const currencyMessage = document.querySelector("#currency-settings-message");
const saveCurrencyButton = document.querySelector("#save-currency-button");
const editorFields = {
  id: document.querySelector("#product-id"),
  name: document.querySelector("#product-name"),
  category: document.querySelector("#product-category"),
  price: document.querySelector("#product-price"),
  image: document.querySelector("#product-image"),
  imageAlt: document.querySelector("#product-image-alt"),
  description: document.querySelector("#product-description"),
  stock: document.querySelector("#product-stock"),
};

let products = [];
let editingProductId = null;
let sessionCheckInProgress = false;
let lastVerifiedUserId = null;

function setNotice(message, isError = false) {
  notice.textContent = message;
  notice.classList.toggle("is-error", isError);
  notice.hidden = !message;
}

function setProductsMessage(message, isError = false) {
  productsMessage.textContent = message;
  productsMessage.classList.toggle("is-error", isError);
}

function setEditorMessage(message, isError = false) {
  editorMessage.textContent = message;
  editorMessage.classList.toggle("is-error", isError);
}

function setCurrencyMessage(message, isError = false) {
  currencyMessage.textContent = message;
  currencyMessage.classList.toggle("is-error", isError);
}

function updateProductPriceHelp(currencyCode) {
  productPriceHelp.textContent = `Enter a numeric amount in the selected marketplace currency (${currencyCode}).`;
}

function setAuthenticatedView(user) {
  loginSection.hidden = true;
  dashboardSection.hidden = false;
  lastVerifiedUserId = user.id;
  document.querySelector("#admin-identity").textContent = `Signed in as ${user.email || "administrator"}`;
  setNotice("");
}

function clearAuthenticatedView() {
  dashboardSection.hidden = true;
  loginSection.hidden = false;
  productEditor.hidden = true;
  products = [];
  lastVerifiedUserId = null;
  productsTableBody.replaceChildren();
  document.querySelector("#admin-identity").textContent = "";
}

function explainRoleCheckError(error) {
  const errorMessage = error?.message || "The administrator check failed.";
  return `Administrator access could not be verified (${errorMessage}). This page requires the exposed public is_admin() RPC to securely call private.is_admin(). Ask your Supabase administrator to verify that RPC and its RLS policies.`;
}

async function verifyAdministrator() {
  const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    return null;
  }

  const { data, error } = await window.supabaseClient.rpc("is_admin");
  if (error) {
    throw new Error(explainRoleCheckError(error));
  }

  if (data !== true) {
    throw new Error("This account is not authorized to access the administrator dashboard.");
  }

  return userData.user;
}

function buildTableCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function renderProducts() {
  productsTableBody.replaceChildren();

  if (!products.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No products found.";
    row.append(cell);
    productsTableBody.append(row);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("tr");
    const productCell = document.createElement("td");
    const productInfo = document.createElement("div");
    productInfo.className = "admin-product-cell";
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.image_alt || product.name;
    image.loading = "lazy";
    const details = document.createElement("span");
    details.textContent = `${product.name} · ${product.id}`;
    productInfo.append(image, details);
    productCell.append(productInfo);

    const categoryCell = buildTableCell(product.category);
    const priceCell = buildTableCell(window.marketplace.formatPrice(Number(product.price)));
    const stockCell = buildTableCell(String(product.stock));
    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `admin-status ${product.active ? "is-active" : "is-inactive"}`;
    status.textContent = product.active ? "Active" : "Inactive";
    statusCell.append(status);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "admin-row-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "admin-row-button";
    editButton.dataset.action = "edit";
    editButton.dataset.productId = String(product.id);
    editButton.textContent = "Edit";
    const statusButton = document.createElement("button");
    statusButton.type = "button";
    statusButton.className = "admin-row-button";
    statusButton.dataset.action = "toggle";
    statusButton.dataset.productId = String(product.id);
    statusButton.textContent = product.active ? "Deactivate" : "Activate";
    actions.append(editButton, statusButton);
    actionsCell.append(actions);

    row.append(productCell, categoryCell, priceCell, stockCell, statusCell, actionsCell);
    productsTableBody.append(row);
  });
}

async function loadProducts() {
  setProductsMessage("Loading products...");
  productsTableBody.replaceChildren();

  const { data, error } = await window.supabaseClient
    .from("products")
    .select("id, name, category, price, image, image_alt, description, stock, active")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  products = data || [];
  renderProducts();
  setProductsMessage(`${products.length} product${products.length === 1 ? "" : "s"} loaded.`);
}

async function loadCurrencySettings() {
  await window.marketplace.currencyReady;
  currencySelect.value = window.marketplace.currency.currencyCode;
  updateProductPriceHelp(window.marketplace.currency.currencyCode);

  if (window.marketplaceCurrencyLoadError) {
    setCurrencyMessage(
      `Global currency settings are not available. The storefront currently uses the EUR default. Run the provided marketplace-settings SQL migration before saving a persistent setting. (${window.marketplaceCurrencyLoadError.message})`,
      true,
    );
    return;
  }

  setCurrencyMessage(`Current marketplace currency: ${currencySelect.selectedOptions[0].textContent}.`);
}

async function saveCurrencySettings(event) {
  event.preventDefault();
  saveCurrencyButton.disabled = true;
  setCurrencyMessage("Saving marketplace currency...");

  try {
    const currencyCode = currencySelect.value;
    const { data, error } = await window.supabaseClient
      .from("marketplace_settings")
      .update({ currency_code: currencyCode })
      .eq("id", 1)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error("No global settings row was updated. Apply the marketplace-settings migration first.");
    }

    window.marketplace.setCurrency(currencyCode);
    delete window.marketplaceCurrencyLoadError;
    updateProductPriceHelp(currencyCode);
    setCurrencyMessage(`Marketplace currency saved: ${currencySelect.selectedOptions[0].textContent}.`);
    renderProducts();
  } catch (error) {
    setCurrencyMessage(`Unable to save marketplace currency: ${error.message}`, true);
  } finally {
    saveCurrencyButton.disabled = false;
  }
}

function showProductEditor(product = null) {
  editingProductId = product ? String(product.id) : null;
  productForm.reset();
  setEditorMessage("");
  editorHeading.textContent = product ? "Edit product" : "Add product";
  saveProductButton.textContent = product ? "Save changes" : "Save product";
  editorFields.id.readOnly = Boolean(product);

  if (product) {
    editorFields.id.value = product.id;
    editorFields.name.value = product.name;
    editorFields.category.value = product.category;
    editorFields.price.value = product.price;
    editorFields.image.value = product.image;
    editorFields.imageAlt.value = product.image_alt || product.name;
    editorFields.description.value = product.description || "";
    editorFields.stock.value = product.stock;
  }

  productEditor.hidden = false;
  productEditor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideProductEditor() {
  productEditor.hidden = true;
  productForm.reset();
  editingProductId = null;
  editorFields.id.readOnly = false;
  setEditorMessage("");
}

function getProductFormValues() {
  const id = editorFields.id.value.trim();
  const name = editorFields.name.value.trim();
  const category = editorFields.category.value;
  const image = editorFields.image.value.trim();
  const imageAlt = editorFields.imageAlt.value.trim();
  const description = editorFields.description.value.trim();
  if (!editorFields.price.value.trim() || !editorFields.stock.value.trim()) {
    throw new Error("Enter both a price and a stock quantity.");
  }
  const price = Number(editorFields.price.value);
  const stock = Number(editorFields.stock.value);

  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error("Product ID can only contain letters, numbers, hyphens, and underscores.");
  }
  if (!name || !category || !image || !imageAlt) {
    throw new Error("Complete all required product fields.");
  }
  if (!["Electronics", "Phones", "Computers", "Fashion", "Home", "Beauty", "Books", "Accessories"].includes(category)) {
    throw new Error("Choose a valid marketplace category.");
  }

  let imageUrl;
  try {
    imageUrl = new URL(image);
  } catch {
    throw new Error("Enter a valid image URL.");
  }
  if (imageUrl.protocol !== "https:") {
    throw new Error("Image URL must use HTTPS.");
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be a nonnegative number.");
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("Stock must be a whole number of zero or more.");
  }
  if (!editingProductId && products.some((product) => String(product.id) === id)) {
    throw new Error("A product with this ID already exists.");
  }

  return {
    ...(!editingProductId ? { id } : {}),
    name,
    category,
    price,
    image,
    image_alt: imageAlt,
    description,
    stock,
    ...(!editingProductId ? { active: true } : {}),
  };
}

async function saveProduct(event) {
  event.preventDefault();
  setEditorMessage("");

  let product;
  try {
    product = getProductFormValues();
  } catch (error) {
    setEditorMessage(error.message, true);
    return;
  }

  saveProductButton.disabled = true;
  const isEditing = Boolean(editingProductId);
  try {
    const result = editingProductId
      ? await window.supabaseClient.from("products").update(product).eq("id", editingProductId).select("id").maybeSingle()
      : await window.supabaseClient.from("products").insert(product).select("id").single();

    if (result.error) {
      throw result.error;
    }
    if (!result.data) {
      throw new Error("The database did not confirm the product change. Check the product ID and administrator permissions.");
    }

    hideProductEditor();
    try {
      await loadProducts();
      setProductsMessage(isEditing ? "Product updated." : "Product added.");
    } catch (loadError) {
      setProductsMessage(`Product ${isEditing ? "updated" : "added"}, but the list could not refresh: ${loadError.message}`, true);
    }
  } catch (error) {
    setEditorMessage(`Unable to save product: ${error.message}`, true);
  } finally {
    saveProductButton.disabled = false;
  }
}

async function toggleProductStatus(productId) {
  const product = products.find((item) => String(item.id) === productId);
  if (!product) {
    setProductsMessage("That product is no longer in the current product list. Reload and try again.", true);
    return;
  }

  setProductsMessage(`${product.active ? "Deactivating" : "Activating"} ${product.name}...`);
  const { data, error } = await window.supabaseClient
    .from("products")
    .update({ active: !product.active })
    .eq("id", productId)
    .select("id")
    .maybeSingle();

  if (error) {
    setProductsMessage(`Unable to update product status: ${error.message}`, true);
    return;
  }
  if (!data) {
    setProductsMessage("The database did not confirm the product status change. Check the product ID and administrator permissions.", true);
    return;
  }

  try {
    await loadProducts();
    setProductsMessage(`${product.name} is now ${product.active ? "inactive" : "active"}.`);
  } catch (loadError) {
    setProductsMessage(`Status changed, but the product list could not refresh: ${loadError.message}`, true);
  }
}

async function openDashboard() {
  if (!window.supabaseClient) {
    clearAuthenticatedView();
    setNotice(window.supabaseClientError || "Supabase is not configured.", true);
    return;
  }

  try {
    const user = await verifyAdministrator();
    if (!user) {
      clearAuthenticatedView();
      setNotice("Sign in with an administrator account to continue.");
      return;
    }

    setAuthenticatedView(user);
    await Promise.all([loadProducts(), loadCurrencySettings()]);
  } catch (error) {
    clearAuthenticatedView();
    setNotice(error.message || "Unable to verify administrator access.", true);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginSubmitButton.disabled = true;
  setNotice("Signing in...");

  try {
    const { error } = await window.supabaseClient.auth.signInWithPassword({
      email: document.querySelector("#login-email").value.trim(),
      password: document.querySelector("#login-password").value,
    });
    if (error) {
      throw error;
    }
    await openDashboard();
  } catch (error) {
    setNotice(`Sign-in failed: ${error.message}`, true);
  } finally {
    loginSubmitButton.disabled = false;
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  setNotice("Signing out...");
  const { error } = await window.supabaseClient.auth.signOut();
  if (error) {
    setNotice(`Unable to sign out: ${error.message}`, true);
    return;
  }
  clearAuthenticatedView();
  setNotice("You have been signed out.");
});

document.querySelector("#add-product-button").addEventListener("click", () => showProductEditor());
document.querySelector("#cancel-edit-button").addEventListener("click", hideProductEditor);
document.querySelector("#cancel-form-button").addEventListener("click", hideProductEditor);
productForm.addEventListener("submit", saveProduct);
currencyForm.addEventListener("submit", saveCurrencySettings);
window.addEventListener("marketplacecurrencychange", renderProducts);

productsTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  if (button.dataset.action === "edit") {
    const product = products.find((item) => String(item.id) === button.dataset.productId);
    if (product) {
      showProductEditor(product);
    }
    return;
  }

  if (button.dataset.action === "toggle") {
    button.disabled = true;
    try {
      await toggleProductStatus(button.dataset.productId);
    } catch (error) {
      setProductsMessage(`Unable to update product status: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  }
});

if (window.supabaseClient) {
  window.supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (sessionCheckInProgress) {
      return;
    }
    sessionCheckInProgress = true;
    window.setTimeout(async () => {
      try {
        if (session?.user?.id === lastVerifiedUserId) {
          return;
        }
        if (session) {
          await openDashboard();
        } else {
          clearAuthenticatedView();
          setNotice("Sign in with an administrator account to continue.");
        }
      } finally {
        sessionCheckInProgress = false;
      }
    }, 0);
  });

  openDashboard();
} else {
  clearAuthenticatedView();
  setNotice(window.supabaseClientError || "Supabase is not configured.", true);
}
