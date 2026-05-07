/**
 * @file navbar.js
 * @description Loads the Navbar component onto the page
 */

import { loadComponent } from "./utils.js";

document.addEventListener("DOMContentLoaded", async () => {

    /** Load Component */
    // Inject the navbar HTML template into the #navbar element
    await loadComponent("#navbar", "/components/navbar.html");

});