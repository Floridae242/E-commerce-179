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
 * and wires up the filter controls..
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

  const productsHTML = products.map((product, index) => {
    const plate = String(index + 1).padStart(2, '0');
    const wide = ((index + 1) % 5 === 0); // every fifth plate breaks the rhythm
    return `
    <article class="plate ${wide ? 'plate--wide' : ''}" style="--reveal-delay:${Math.min(index, 11) * 40}ms">
      <div class="plate__frame">
        <span class="plate__number" aria-hidden="true">№&nbsp;${plate}</span>
        <a href="#" class="plate__media quick-view-btn" data-product-id="${product.id}" data-bs-target="#modaltoggle" data-bs-toggle="modal" aria-label="View ${escapeHtml(product.name)}">
          <img src="${product.image_url}" alt="${escapeHtml(product.name)}" class="plate__image" loading="lazy">
        </a>
        <aside class="plate__sheet" aria-hidden="true">
          <p class="plate__sheet-line mono">Plate ${plate} · ${escapeHtml(product.category || 'Edit')}</p>
          <p class="plate__sheet-copy">${escapeHtml(product.description || 'A quiet object built for honest wear.')}</p>
          <button type="button" class="plate__cta add-to-cart" data-id="${product.id}">
            <span>Add to bag</span>
            <span class="plate__cta-rule" aria-hidden="true"></span>
            <span class="mono">+</span>
          </button>
        </aside>
      </div>
      <div class="plate__caption">
        <span class="plate__index mono">№ ${plate} ${product.category ? `· <span class="plate__cat">${escapeHtml(product.category)}</span>` : ''}</span>
        <h3 class="plate__name"><em>${escapeHtml(product.name)}</em></h3>
        <span class="plate__price mono">$${Number(product.price).toFixed(2)}</span>
      </div>
    </article>`;
  }).join('');

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

  if (searchInput)    searchInput.addEventListener('input', debounce(applyFilters, 300));
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
      <div class="editorial-empty">
        <span class="mono">— No matches —</span>
        <h4>Nothing in this cabinet.</h4>
        <p>Try a different word, or open the edit at large.</p>
      </div>
    `;
    if (resultCount) resultCount.textContent = '00 / 00';
    return;
  }

  renderProducts(working);
  if (resultCount) {
    const total = window.allProducts.length;
    const fmt = (n) => String(n).padStart(2, '0');
    resultCount.textContent = working.length === total
      ? `${fmt(total)} / ${fmt(total)} · the full edit`
      : `${fmt(working.length)} / ${fmt(total)} · filtered`;
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
