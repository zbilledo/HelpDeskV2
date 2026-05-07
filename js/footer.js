/**
 * @file footer.js
 * @description Loads the footer component onto the page
 */

import { loadComponent } from "./utils.js";

document.addEventListener("DOMContentLoaded", async () => {

    /** Load Component */
    // Inject the footer HTML template into the #footer element
    await loadComponent("#footer", "/components/footer.html");

});