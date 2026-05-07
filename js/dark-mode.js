/**
 * @file dark-mode.js
 * @description Applies dark mode on page load based on saved preference.
 * Import this on every app page.
 */

/** Apply Dark Mode */
// Reads the "darkMode" flag from localStorage and toggles the "dark-mode"
// class on <body> accordingly. Removing the class when false ensures dark mode
// is always explicitly cleared if the preference was turned off.
export function applyDarkMode() {
    const darkMode = localStorage.getItem("darkMode") === "true";
    if (darkMode) {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
}

// Called immediately on import so dark mode is applied before the page renders,
// preventing a flash of the light theme on pages that should be dark
applyDarkMode();