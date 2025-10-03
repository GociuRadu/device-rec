//pentru afisare proprietati dupa ce intram pe pagina read more
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("product-details");
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get("id"));

   

    if (!id || isNaN(id)) {
        container.innerHTML = "<p>Produsul nu a fost specificat sau ID-ul este invalid.</p>";
        return;
    }

    fetch(`${BASE_URL}/products/${id}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) throw new Error("Produsul nu a fost găsit.");
                else throw new Error("Eroare la server.");
            }
            return response.json();
        })
        .then(product => {
            const features = Array.isArray(product.features) ? product.features : [];
            const tags = Array.isArray(product.tags) ? product.tags : [];

            container.innerHTML = `
                <div class="card product-detail-card">
                    ${product.image ? `<img src="${product.image}" alt="${product.name}" class="product-image-large">` : ""}
                    <div class="card-content">
                        <span class="product-type">${product.type?.toUpperCase() || "DEVICE"}</span>
                        <h2 class="product-name">${product.name}</h2>
                        <p class="product-price">${product.price} RON</p>
                        <p><strong>Culoare:</strong> ${product.color || "Necunoscută"}</p>
                        <p><strong>Baterie:</strong> ${product.battery || "Necunoscută"}</p>
                        <p><strong>Caracteristici:</strong></p>
                        <ul>
                            ${features.map(f => `<li>${f}</li>`).join("")}
                        </ul>
                        <div class="product-tags">
                            ${tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(error => {
            container.innerHTML = `<p style="color:red;">Eroare: ${error.message}</p>`;
        });
});
