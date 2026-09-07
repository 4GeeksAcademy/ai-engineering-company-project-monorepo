(function () {
    const STORAGE_KEY = "brasaland-theme";

    function resolveTheme() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "dark" || stored === "light") {
            return stored;
        }
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function applyTheme(theme) {
        if (theme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
        }

        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            const spanish = document.documentElement.lang === "es";
            const dark = theme === "dark";
            button.setAttribute("aria-pressed", dark ? "true" : "false");
            if (dark) {
                button.textContent = spanish ? "Modo claro" : "Light mode";
            } else {
                button.textContent = spanish ? "Modo oscuro" : "Dark mode";
            }
        });
    }

    function toggleTheme() {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
    }

    function wireToggleButtons() {
        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            button.addEventListener("click", toggleTheme);
        });
    }

    applyTheme(resolveTheme());

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", wireToggleButtons);
    } else {
        wireToggleButtons();
    }

    window.BrasalandTheme = { applyTheme, toggleTheme, resolveTheme };
})();
