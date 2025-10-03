document.addEventListener("DOMContentLoaded", () => {
  initUserSection();
  initSearchAndFilters();
  initExportImport();  
});

function initUserSection() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const isAdmin = user?.role === "admin";

  const userIcon = document.getElementById("userIcon");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const userIconSymbol = userIcon.querySelector("i");

  const wrapper = document.createElement("div");
  wrapper.classList.add("user-wrapper");
  userIcon.parentNode.replaceChild(wrapper, userIcon);
  wrapper.appendChild(userIcon);

  if (user) {
    userNameDisplay.innerText = `👤 ${user.username}`;
    userIcon.style.display = "inline-flex";
    if (userIconSymbol) userIconSymbol.style.display = "none";

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Delogare";
    logoutBtn.classList.add("logout-btn");

    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("loggedInUser");
      window.location.reload();
    });

    wrapper.appendChild(logoutBtn);
  } else {
    userIcon.style.display = "inline-flex";
    userNameDisplay.innerText = "";
    if (userIconSymbol) userIconSymbol.style.display = "inline";
  }

  userIcon?.addEventListener("click", () => {
    if (!user) window.location.href = "login.html";
  });
}

function initSearchAndFilters() {
  let productList = [];
  const listContainer = document.getElementById("product-list");
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchButton");
  const filterPopup = document.getElementById("filterPopup");
  const openFilterBtn = document.getElementById("openFilterBtn");
  const closeFilterBtn = document.getElementById("closeFilterBtn");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const priceValue = document.getElementById("priceValue");
  const priceRange = document.getElementById("priceRange");

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const isAdmin = user?.role === "admin";

  fetch(`${BASE_URL}/products?sort=popularity`)
    .then(res => res.json())
    .then(data => {
      productList = data;
      renderProducts(productList, isAdmin);
    })
    .catch(err => {
      console.error("Eroare la incarcare:", err);
      listContainer.innerText = "Eroare la incarcare.";
    });

  searchBtn?.addEventListener("click", () => {
    const query = searchInput.value.trim();
    if (!query) return;

    fetch(`${BASE_URL}/search`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    })
      .then(res => res.json())
      .then(data => renderProducts(data, isAdmin))
      .catch(err => {
        console.error("Eroare la cautare:", err);
        listContainer.innerText = "Eroare la incarcare.";
      });
  });

  openFilterBtn?.addEventListener("click", () => filterPopup.classList.remove("hidden"));
  closeFilterBtn?.addEventListener("click", () => filterPopup.classList.add("hidden"));
  priceRange?.addEventListener("input", () => priceValue.textContent = priceRange.value);

  document.querySelectorAll(".color-box").forEach(box => {
    box.addEventListener("click", () => {
      document.querySelectorAll(".color-box").forEach(x => x.classList.remove("selected"));
      box.classList.add("selected");
    });
  });

  applyFiltersBtn?.addEventListener("click", () => {
    const type = document.getElementById("filterType").value;
    const source = document.getElementById("filterSource")?.value || "";
    const color = document.querySelector(".color-box.selected")?.dataset.color || "";
    const maxPrice = parseInt(priceRange.value) || 100000;
    const validSources = ['emag','cell'];

    const filtered = productList.filter(p => {
      const okType = !type || (p.type?.toLowerCase() === type);
      const okColor = !color || (p.color?.toLowerCase() === color);
      const okPrice = !isNaN(p.price) && p.price <= maxPrice;
      const okSource = !validSources.includes(source) || p.recommended === source;
      return okType && okColor && okPrice && okSource;
    });

    renderProducts(filtered, isAdmin);
    filterPopup.classList.add("hidden");
  });
}

function renderProducts(products, isAdmin) {
  const container = document.getElementById("product-list");
  container.innerHTML = "";

  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product";
    card.innerHTML = `
      <div class="card">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" class="product-image">` : ""}
        <div class="card-content">
          <span class="product-type">${(p.type || "").toUpperCase()}</span>
          <h2 class="product-name">${p.name}</h2>
          <p class="product-price">${p.price} RON</p>
          <p class="product-source">Sursă: ${p.recommended || "necunoscută"}</p>
          <a href="#" class="btn read-more-btn">Read More</a>
        </div>
        <div class="product-info">
          <p class="product-color">Color: ${p.color || "Unknown"}</p>
        </div>
        <div class="product-tags">
          ${Array.isArray(p.tags) ? p.tags.map(t => `<span class="tag">${t}</span>`).join(" ") : ""}
        </div>
        ${isAdmin ? `
          <div class="admin-actions">
            <button class="edit-btn" data-id="${p.id}">Editează</button>
            <button class="delete-btn" data-id="${p.id}">Șterge</button>
          </div>` : ""}
      </div>
    `;

    card.querySelector(".read-more-btn").addEventListener("click", e => {
      e.preventDefault();
      window.location.href = `product.html?id=${p.id}`;
    });

    if (isAdmin) {
      card.querySelector(".edit-btn").addEventListener("click", () => {
        window.location.href = `edit.html?id=${p.id}`;
      });

      card.querySelector(".delete-btn").addEventListener("click", () => {
        if (confirm("Sigur vrei să ștergi acest produs?")) {
          fetch(`${BASE_URL}/products/${p.id}`, {
            method: "DELETE",
            credentials: "include"
          })
            .then(() => card.remove())
            .catch(err => {
              alert("Eroare la ștergere produs.");
              console.error(err);
            });
        }
      });
    }

    container.appendChild(card);
  });
}

function initExportImport() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const isAdmin = user?.role === "admin";

  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const importForm = document.getElementById("importForm");
importForm.style.display="none";
  if (!isAdmin) {
    if (exportJsonBtn) exportJsonBtn.style.display = "none";
    if (exportCsvBtn) exportCsvBtn.style.display = "none";
    if (importForm) importForm.style.display = "none";
    return;
  }

  exportJsonBtn?.addEventListener("click", () => {
    window.open(`${BASE_URL}/export/json`, "_blank");
  });

  exportCsvBtn?.addEventListener("click", () => {
    window.open(`${BASE_URL}/export/csv`, "_blank");
  });

 
  };


