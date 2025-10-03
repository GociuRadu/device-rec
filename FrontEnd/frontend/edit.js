
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const pid = params.get("id");
  if (!pid) {
    location.href = "index.html";
    return;
  }

  fetch(`${BASE_URL}/products/${pid}`)
    .then(r => r.json())
    .then(p => {
      document.getElementById("name").value = p.name;
      document.getElementById("type").value = p.type;
      document.getElementById("price").value = p.price;
      document.getElementById("color").value = p.color || "";
      document.getElementById("battery").value = p.battery || "";
      document.getElementById("image").value = p.image || "";
      document.getElementById("features").value = (p.features || []).join(";");
      document.getElementById("tags").value = (p.tags || []).join(",");
    })
    .catch(() => alert("Eroare la incarcare produs"));

  document.getElementById("editForm").addEventListener("submit", e => {
    e.preventDefault();

    const prod = {
      name: document.getElementById("name").value,
      type: document.getElementById("type").value,
      price: parseFloat(document.getElementById("price").value),
      color: document.getElementById("color").value,
      battery: document.getElementById("battery").value,
      image: document.getElementById("image").value,
      features: document.getElementById("features").value.split(";").map(s => s.trim()).filter(Boolean),
      tags: document.getElementById("tags").value.split(",").map(s => s.trim()).filter(Boolean)
    };

    fetch(`${BASE_URL}/products/${pid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prod)
    })
      .then(r => {
        if (r.ok) {
          alert("Modificarile au fost salvate.");
          window.location.href = "index.html";
        } else {
          throw new Error("Eroare PUT");
        }
      })
      .catch(() => alert("Eroare la modificare produs!"));
  });
});
