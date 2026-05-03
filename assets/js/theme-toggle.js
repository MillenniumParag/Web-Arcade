(() => {
    const toggleButton = document.querySelector("[data-theme-toggle]");
    if (!toggleButton) return;

    const storageKey = "web-arcade-theme";
    const root = document.documentElement;
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    const storedTheme = localStorage.getItem(storageKey);
    const initialTheme = storedTheme || (prefersLight ? "light" : "dark");

    const applyTheme = (theme) => {
        root.setAttribute("data-theme", theme);
        localStorage.setItem(storageKey, theme);
        toggleButton.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
        toggleButton.textContent = theme === "dark" ? "Theme: Dark" : "Theme: Light";
    };

    applyTheme(initialTheme);

    toggleButton.addEventListener("click", () => {
        const currentTheme = root.getAttribute("data-theme") || "dark";
        const nextTheme = currentTheme === "light" ? "dark" : "light";
        applyTheme(nextTheme);
    });
})();
