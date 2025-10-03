
document.addEventListener("DOMContentLoaded", () => {
  setupLogin();
  setupRegister();
});
//formularu de login
function setupLogin() {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("login-error");

  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    loginError.innerText = "";

    const username = getTrimmedValue("loginUsername");
    const password = getTrimmedValue("loginPassword");

    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data?.success) {
        if (data.user) {
          localStorage.setItem("loggedInUser", JSON.stringify(data.user));
        }
        window.location.href = "index.html";
      } else {
        loginError.innerText = "Date incorecte.";
      }
    } catch (err) {
      console.error("eroare login", err);
      loginError.innerText = "Eroare de retea.";
    }
  });
}
//formularu de register
function setupRegister() {
  const registerForm = document.getElementById("registerForm");
  const registerError = document.getElementById("register-error");
  const loginError = document.getElementById("login-error");

  registerForm.addEventListener("submit", async e => {
    e.preventDefault();
    registerError.innerText = "";

    const username = getTrimmedValue("registerUsername");
    const password = getTrimmedValue("registerPassword");

    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (res.status === 201) {
        toggleForms();
        loginError.style.color = "green";
        loginError.innerText = "Cont creat. Logheaza-te.";
      } else if (res.status === 409) {
        registerError.innerText = "Utilizator deja existent.";
      } else {
        registerError.innerText = "Eroare server.";
      }
    } catch (err) {
      console.error("eroare register", err);
      registerError.innerText = "Eroare de retea.";
    }
  });
}
//schimba intre cele doua in functie de nevoie(cateodata crapa)
function toggleForms() {
  const loginSec = document.getElementById("login-section");
  const registerSec = document.getElementById("register-section");

  const isLoginVisible = loginSec.style.display !== "none";
  loginSec.style.display = isLoginVisible ? "none" : "block";
  registerSec.style.display = isLoginVisible ? "block" : "none";
}

function getTrimmedValue(id) {
  return document.getElementById(id).value.trim();
}
