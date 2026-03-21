const baseUrl = '';
let token = null;

async function register() {
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const displayName = document.getElementById('regDisplayName').value;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });
  const json = await res.json();
  document.getElementById('authMsg').innerText = JSON.stringify(json);
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (res.ok) {
    const json = await res.json();
    token = json.token ?? null;
    document.getElementById('authMsg').innerText = 'Logged in. Token stored (if provided).';
  } else {
    document.getElementById('authMsg').innerText = 'Login failed';
  }
}

async function fetchProducts() {
  const res = await fetch(`${baseUrl}/api/products`);
  const products = await res.json();
  return products;
}

function renderProducts(products) {
  const container = document.getElementById('products');
  if (!products || products.length === 0) {
    container.innerHTML = '<p>No products</p>';
    return;
  }
  let html = '<table><thead><tr><th>Id</th><th>Name</th><th>Category</th><th>Price</th><th>Actions</th></tr></thead><tbody>';
  products.forEach(p => {
    html += `<tr id="prod-${p.id}"><td>${p.id}</td><td><input id="name-${p.id}" value="${escapeHtml(p.name)}" /></td><td><input id="cat-${p.id}" value="${escapeHtml(p.category ?? '')}" /></td><td><input id="price-${p.id}" type="number" step="0.01" value="${p.price}" /></td><td><button onclick="updateProduct(${p.id})">Save</button><button onclick="deleteProduct(${p.id})">Delete</button></td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function loadProducts() {
  const products = await fetchProducts();
  renderProducts(products);
}

async function createProduct() {
  const name = document.getElementById('pName').value;
  const category = document.getElementById('pCategory').value;
  const price = parseFloat(document.getElementById('pPrice').value || '0');
  const description = document.getElementById('pDescription').value;
  const res = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, price, category })
  });
  if (res.ok) {
    await loadProducts();
  } else {
    alert('Create failed');
  }
}

async function updateProduct(id) {
  const name = document.getElementById(`name-${id}`).value;
  const category = document.getElementById(`cat-${id}`).value;
  const price = parseFloat(document.getElementById(`price-${id}`).value || '0');
  const res = await fetch(`${baseUrl}/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: null, price, category })
  });
  if (res.ok) {
    await loadProducts();
  } else {
    alert('Update failed');
  }
}

async function deleteProduct(id) {
  const res = await fetch(`${baseUrl}/api/products/${id}`, { method: 'DELETE' });
  if (res.ok) await loadProducts();
  else alert('Delete failed');
}

async function purchase() {
  const buyerId = parseInt(document.getElementById('buyBuyerId').value || '0');
  const productId = parseInt(document.getElementById('buyProductId').value || '0');
  const quantity = parseInt(document.getElementById('buyQuantity').value || '1');
  const res = await fetch(`${baseUrl}/api/transactions/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerId, productId, quantity })
  });
  const json = await res.json();
  document.getElementById('txMsg').innerText = JSON.stringify(json);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&"'<>]/g, function (c) {
    return {'&':'&amp;','"':'&quot;','\'':'&#39;','<':'&lt;','>':'&gt;'}[c];
  });
}

// initial load
window.addEventListener('load', () => {
  loadProducts();
});
