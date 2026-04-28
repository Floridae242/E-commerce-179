// Entry point: Trigger the request when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', requestProducts);

/**
 * requestProducts()
 * Initiates the sequence to fetch and display products.
 * Handles the UI states (Loading, Success, Error).
 */
async function requestProducts() {
  const container = document.getElementById('product-grid');
  const spinner = document.getElementById('loading-spinner');
  const errorDiv = document.getElementById('error-message');

  // 1. SHOW LOADING STATE (Data is in transit)
  spinner.style.display = 'block';
  container.innerHTML = ''; 
  errorDiv.style.display = 'none';

  try {
    // 2. FETCH() - Send the GET request to the server
    const response = await fetch('./data/json/products.json');

    // Proactive Edge Case: fetch() doesn't throw an error for 404s (File Not Found).
    // We must manually check if the response is "ok" (HTTP 200-299).
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - File not found`);
    }

    // 3. RETURN JSON - Parse the response body into a JavaScript Array
    const products = await response.json();

    // 4. RENDER UI - Pass the data to our rendering function
    renderProducts(products);

  } catch (error) {
    // ERROR CATCH - Triggers if network fails, or if our 'throw new Error' fires
    console.error("Data Flow Failed:", error);
    errorDiv.innerText = "🚨 Failed to load products. Please try again later.";
    errorDiv.style.display = 'block';
  } finally {
    // CLEANUP - Always hide the spinner whether the request succeeded or failed
    spinner.style.display = 'none';
  }
}

/**
 * renderProducts()
 * Maps over the JSON array and injects HTML into the DOM.
 * Uses the EXACT same HTML structure as the original template's product cards.
 */
function renderProducts(products) {
  const container = document.getElementById('product-grid');
  
  // Clean Architecture: Instead of appending to innerHTML inside a loop 
  // (which causes expensive DOM repaints), we build a single string and inject it once.
  const productsHTML = products.map(product => `
    <div class="col mb-4">
      <div class="product-card position-relative">
        <div class="card-img">
          <img src="${product.image_url}" alt="${product.name}" class="product-image img-fluid">
          <div class="cart-concern position-absolute d-flex justify-content-center">
            <div class="cart-button d-flex gap-2 justify-content-center align-items-center">
              <button type="button" class="btn btn-light" data-bs-toggle="modal" data-bs-target="#modallong">
                <svg class="shopping-carriage">
                  <use xlink:href="#shopping-carriage"></use>
                </svg>
              </button>
              <button type="button" class="btn btn-light" data-bs-target="#modaltoggle" data-bs-toggle="modal">
                <svg class="quick-view">
                  <use xlink:href="#quick-view"></use>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="card-detail d-flex justify-content-between align-items-center mt-3">
          <h3 class="card-title fs-6 fw-normal m-0">
            <a href="index.html">${product.name}</a>
          </h3>
          <span class="card-price fw-bold">$${product.price.toFixed(2)}</span>
        </div>
      </div>
    </div>
  `).join('');

  container.innerHTML = productsHTML;
}
