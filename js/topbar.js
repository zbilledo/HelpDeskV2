import {loadComponent} from "./utils.js";
import {initTicketForm} from "/js/ticket-form-handler.js";

const username = "Garrett2404";
const userEmail = "grjespersen@gmail.com";

document.addEventListener("DOMContentLoaded", async () => {
    await loadComponent("#topbar", "/components/topbar.html");

    const profilePic = document.getElementById("profile-pic");
    const userDropdown = document.getElementById("user-dropdown");

    if (profilePic && userDropdown) {
        // Toggle dropdown on click
        profilePic.addEventListener("click", (event) => {
            event.stopPropagation(); // Prevent closing when clicking the pic
            userDropdown.classList.toggle("show");
        });

        // Close dropdown when clicking anywhere else on the page
        window.addEventListener("click", () => {
            if (userDropdown.classList.contains("show")) {
                userDropdown.classList.remove("show");
            }
        });
    }

    const userProfile = document.getElementById("dropdown-header");

    if (username.length && userEmail.length !== 0) {
        userProfile.innerHTML = `
        <p class="user-name">${username}</p>
        <p class="user-email">${userEmail}</p>
    `;
    } else {
        userProfile.innerHTML = `
        <p class="user-name">Example</p>
        <p class="user-email">example@mail.com</p>
    `;
    }

    const profileName = document.getElementById("main-menu-username");

    if (username.length !== 0) {
        profileName.innerHTML = `
            <p class="main-menu-username">${username}</p>
        `;
    } else {
        profileName.innerHTML = `
            <p class="main-menu-username">Example</p>
        `;
    }


initTicketForm();

});
