import {loadComponent} from "./utils.js";


document.addEventListener("DOMContentLoaded",async () => {
    await loadComponent("#sidebar", "/components/sidebar.html");
});