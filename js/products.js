/**
 * Catalog: data fetching, instant search, category filter, sort, and rendering.
 *
 * Globals exposed for compatibility with the rest of the template:
 *   - window.allProducts        Full product list (source of truth, never mutated after load).
 *   - window.renderProducts(arr) Renders an array of products into #product-grid.
 */

// Source-of-truth dataset; assigned once, then read-only.
window.allProducts = [];

document.addEventListener('DOMContentLoaded', requestProducts);

/**
 * Fetches product data, manages loading/error UI, then triggers the first render
 * and wires up the filter controls.
 */
async function requestProducts() {
  const grid     = document.getElementById('product-grid');
  const spinner  = document.getElementById('loading-spinner');
  const errorDiv = document.getElementById('error-message');

  spinner.style.display = 'block';
  grid.innerHTML = '';
  errorDiv.style.display = 'none';

  try {
    const response = await fetch('./data/json/products.json');
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - File not found`);
    }
    const products = await response.json();

    window.allProducts = products;

    populateCategoryOptions(products);
    initCatalogFilter();
    applyFilters(); // Initial render uses current control values (default = full list).
  } catch (error) {
    console.error('Data Flow Failed:', error);
    errorDiv.innerText = '🚨 Failed to load products. Please try again later.';
    errorDiv.style.display = 'block';
  } finally {
    spinner.style.display = 'none';
    // Signal — even on failure — so dependents (cart.js) can stop waiting.
    document.dispatchEvent(new CustomEvent('productsReady', { detail: window.allProducts }));
  }
}

/**
 * renderProducts()
 * Renders an array of product objects into #product-grid using the template's card markup.
 * Called by both the initial render and the filter pipeline.
 */
function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const productsHTML = products.map(product => `
    <div class="col mb-4">
      <div class="product-card position-relative">
        <div class="card-img">
          <img src="${product.image_url}" alt="${escapeHtml(product.name)}" class="product-image img-fluid">
          ${product.category ? `<span class="product-badge">${escapeHtml(product.category)}</span>` : ''}
          <div class="cart-concern position-absolute d-flex justify-content-center">
            <div class="cart-button d-flex gap-2 justify-content-center align-items-center">
              <button type="button" class="btn btn-light cart-add-btn" data-product-id="${product.id}" aria-label="Add to cart">
                <svg class="shopping-carriage">
                  <use xlink:href="#shopping-carriage"></use>
                </svg>
              </button>
              <button type="button" class="btn btn-light quick-view-btn" data-product-id="${product.id}" data-bs-target="#modaltoggle" data-bs-toggle="modal" aria-label="Quick view">
                <svg class="quick-view">
                  <use xlink:href="#quick-view"></use>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="card-detail d-flex justify-content-between align-items-center mt-3">
          <h3 class="card-title fs-6 fw-normal m-0">
            <a href="index.html">${escapeHtml(product.name)}</a>
          </h3>
          <span class="card-price fw-bold">$${Number(product.price).toFixed(2)}</span>
        </div>
      </div>
    </div>
  `).join('');

  grid.innerHTML = productsHTML;
}
window.renderProducts = renderProducts;

/* ----------------------------- Filter pipeline ---------------------------- */

/**
 * Builds the unique category list from the dataset and populates #categorySelect.
 * "All" is preserved as the first option.
 */
function populateCategoryOptions(products) {
  const select = document.getElementById('categorySelect');
  if (!select) return;

  const categories = Array.from(
    new Set(products.map(p => p.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // Preserve the static "All" option, append the rest.
  const fragment = document.createDocumentFragment();
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    fragment.appendChild(opt);
  });
  select.appendChild(fragment);
}

let filtersInitialized = false;
/**
 * Wires the input/change listeners exactly once.
 */
function initCatalogFilter() {
  if (filtersInitialized) return;

  const searchInput    = document.getElementById('searchInput');
  const categorySelect = document.getElementById('categorySelect');
  const sortSelect     = document.getElementById('sortSelect');

  if (searchInput)    searchInput.addEventListener('input', debounce(applyFilters, 80));
  if (categorySelect) categorySelect.addEventListener('change', applyFilters);
  if (sortSelect)     sortSelect.addEventListener('change', applyFilters);

  filtersInitialized = true;
}

/**
 * Reads the current control values, filters allProducts on BOTH search + category,
 * applies the chosen sort order, then renders. Handles the empty state and
 * the default "show everything" path.
 */
function applyFilters() {
  const searchInput    = document.getElementById('searchInput');
  const categorySelect = document.getElementById('categorySelect');
  const sortSelect     = document.getElementById('sortSelect');
  const grid           = document.getElementById('product-grid');
  const resultCount    = document.getElementById('result-count');
  if (!grid) return;

  const query    = (searchInput?.value || '').trim().toLowerCase();
  const category = categorySelect?.value || 'All';
  const sortKey  = sortSelect?.value || 'default';

  const isDefaultCategory = category === 'All';
  const isEmptyQuery      = query === '';

  let working;
  if (isEmptyQuery && isDefaultCategory) {
    // Fast path: no filters → full dataset.
    working = window.allProducts.slice();
  } else {
    working = window.allProducts.filter(product => {
      const haystack = [
        product.name,
        product.description,
        product.category
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesQuery    = isEmptyQuery || haystack.includes(query);
      const matchesCategory = isDefaultCategory || product.category === category;
      return matchesQuery && matchesCategory;
    });
  }

  working = sortProducts(working, sortKey);

  if (working.length === 0) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="no-results text-center py-5">
          <svg class="no-results-icon mb-3" width="48" height="48" aria-hidden="true">
            <use xlink:href="#search"></use>
          </svg>
          <h4 class="fw-normal mb-2">No results found</h4>
          <p class="text-muted m-0">
            We couldn't find anything matching your search. Try different keywords or pick another category.
          </p>
        </div>
      </div>
    `;
    if (resultCount) resultCount.textContent = '0 products';
    return;
  }

  renderProducts(working);
  if (resultCount) {
    const total = window.allProducts.length;
    resultCount.textContent = working.length === total
      ? `Showing all ${total} products`
      : `Showing ${working.length} of ${total} products`;
  }
}

/**
 * Returns a new array sorted by the requested key. Default leaves order intact.
 */
function sortProducts(list, key) {
  const sorted = list.slice();
  switch (key) {
    case 'price-asc':  return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc': return sorted.sort((a, b) => b.price - a.price);
    case 'name-asc':   return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':  return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:           return sorted;
  }
}

/* -------------------------------- Helpers -------------------------------- */

// Tiny debouncer keeps keystroke filtering snappy without thrashing the DOM.
function debounce(fn, wait) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Defensive escaping: product copy is data-driven, so neutralize HTML before injection.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
