const supabaseConfig = window.supabaseConfig;

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  window.supabaseClientError = "The Supabase browser client did not load.";
} else if (!supabaseConfig?.url || !supabaseConfig?.publishableKey) {
  window.supabaseClientError = "Supabase project configuration is missing.";
} else {
  window.supabaseClient = window.supabase.createClient(
    supabaseConfig.url,
    supabaseConfig.publishableKey,
  );
}

function mapSupabaseProduct(row) {
  const price = Number(row.price);
  const stock = Number(row.stock);

  if (
    row.active !== true
    || !row.id
    || !row.name
    || !row.category
    || typeof row.image !== "string"
    || !row.image
    || !Number.isFinite(price)
    || !Number.isInteger(stock)
    || stock < 0
  ) {
    throw new Error("The products table returned a product with invalid data.");
  }

  return {
    id: String(row.id),
    name: row.name,
    category: row.category,
    price,
    image: row.image,
    imageAlt: row.image_alt || row.name,
    description: row.description || "",
    stock,
  };
}

window.mapSupabaseProduct = mapSupabaseProduct;

async function fetchActiveProducts() {
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

  return data.map(mapSupabaseProduct);
}

window.fetchActiveProducts = fetchActiveProducts;
