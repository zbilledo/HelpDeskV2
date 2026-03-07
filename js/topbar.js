import {loadComponent} from "./utils.js";
import {initTicketForm} from "/js/ticket-form-handler.js";

// const username = "Garrett2404";
// const userEmail = "grjespersen@gmail.com";

document.addEventListener("DOMContentLoaded", async () => {
    await loadComponent("#topbar", "/components/topbar.html");

    const profilePic = document.getElementById("profile-pic");
    const userDropdown = document.getElementById("user-dropdown");
    const storedUser = sessionStorage.getItem("userData");
    const user = storedUser ? JSON.parse(storedUser) : {username: "Guest"};

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

    const logoutLink = document.getElementById("logout-link");
    if (logoutLink) {
        logoutLink.addEventListener("click", (event) => {
            event.preventDefault();
            sessionStorage.removeItem("isLoggedIn");
            sessionStorage.removeItem("userData");
            window.location.href = "/pages/login-page.html";
        });
    }

    const userProfile = document.getElementById("dropdown-header");

    if (userProfile) {
        userProfile.innerHTML = `
        <p class="user-name">${user.username}</p>
    `;
    }

    const profileName = document.getElementById("main-menu-username");

    if (profileName) {
        profileName.innerHTML = `
            <p class="main-menu-username">${user.username}</p>
        `;
    }

    initTicketForm();

});
