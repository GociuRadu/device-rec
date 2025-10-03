document.addEventListener("DOMContentLoaded", () => {
    const body = document.querySelector("body"),
        nav = document.querySelector("nav"),
        modeToggle = document.querySelector(".dark-Light"),
        searchToggle = document.querySelector(".searchToggle"),
        sidebarOpen = document.querySelector(".sidebarOpen"),
        sidebarClose = document.querySelector(".sidebarClose");

    let getMode = localStorage.getItem("mode");
    if (getMode === "dark-mode") {
        body.classList.add("dark");
    }

    modeToggle?.addEventListener("click", () => {
        modeToggle.classList.toggle("active");
        body.classList.toggle("dark");
        localStorage.setItem("mode", body.classList.contains("dark") ? "dark-mode" : "light-mode");
    });

    searchToggle?.addEventListener("click", () => {
        searchToggle.classList.toggle("active");
    });

    sidebarOpen?.addEventListener("click", () => {
        nav.classList.add("active");
    });

    sidebarClose?.addEventListener("click", () => {
        nav.classList.remove("active");
    });

    body.addEventListener("click", e => {
        const clickedElm = e.target;
        if (!clickedElm.closest(".sidebarOpen") && !clickedElm.closest(".menu")) {
            nav.classList.remove("active");
        }
    });
   const user = localStorage.getItem("loggedInUser");
if (user) {
  document.getElementById("userIcon").style.display = "block";
}
const userIcon = document.getElementById("userIcon");
if (userIcon) {
  userIcon.addEventListener("click", () => {
    window.location.href = "login.html";  
  });
}

});
