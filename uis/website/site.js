(function () {
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.getElementById("primary-nav");
    if (!toggle || !nav) {
        return;
    }
    toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
        const lang = (window.BrasalandLang && window.BrasalandLang.resolveLang()) || "en";
        const close = lang === "es" ? "Cerrar" : "Close";
        const pages = lang === "es" ? "Páginas" : "Pages";
        toggle.textContent = open ? close : pages;
    });
})();
