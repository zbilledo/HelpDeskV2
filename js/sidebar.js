/**
 * @file sidebar.js
 * @description Loads the sidebar component onto the page when the DOM content is fully loaded.
 */

import { loadComponent } from "./utils.js";
import { applyDarkMode } from "/js/dark-mode.js";

document.addEventListener("DOMContentLoaded", async () => {

    /** Load Component */
    // Inject the sidebar HTML template into the #sidebar element
    await loadComponent("#sidebar", "/components/sidebar.html");

    /** Active Nav Link */
    // Compares each sidebar link's href against the current page path and adds
    // the "active" class to the matching list item so it appears highlighted
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            link.closest("li").classList.add("active");
        }
    });

});