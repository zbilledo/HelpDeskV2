/**
 * @file topbar.js
 * @description Manages the top bar component, including user profile display, dropdown menu, and logout functionality.
 */

import { loadComponent } from "./utils.js";
import { initTicketForm } from "/js/ticket-form-handler.js";
import { supabase } from "/js/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {

    /** Load Component */
    await loadComponent("#topbar", "/components/topbar.html");

    /** Element References */
    const profilePic = document.getElementById("profile-pic");
    const userDropdown = document.getElementById("user-dropdown");

    /** Current User */
    // Read from localStorage; defaults to a Guest object if no session data is found
    const storedUser = localStorage.getItem("userData");
    console.log("stored user:", storedUser);
    const user = storedUser ? JSON.parse(storedUser) : { username: "Guest" };
    console.log("parsed user:", user);

    /** Profile Picture */
    if (profilePic) {
        // Set the profile picture src if the user has one saved
        if (user.profilePic_url) {
            profilePic.src = user.profilePic_url;
        }

        // Toggle the dropdown menu on profile picture click
        profilePic.addEventListener("click", (event) => {
            event.stopPropagation();
            userDropdown.classList.toggle("show");
        });
    }

    /** Dropdown Dismiss */
    if (userDropdown) {
        // Close the dropdown when clicking anywhere outside of it
        window.addEventListener("click", () => {
            if (userDropdown.classList.contains("show")) {
                userDropdown.classList.remove("show");
            }
        });
    }

    /** Logout */
    const logoutLink = document.getElementById("logout-link");
    if (logoutLink) {
        logoutLink.addEventListener("click", async (event) => {
            event.preventDefault();
            // Sign out of Supabase Auth and clear all local session data
            await supabase.auth.signOut();
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("userData");
            window.location.href = "/pages/login-page.html";
        });
    }

    /** Dropdown Header */
    // Display the current user's username in the dropdown menu header
    const userProfile = document.getElementById("dropdown-header");
    if (userProfile) {
        userProfile.innerHTML = `
            <p class="user-name">${user.username}</p>
        `;
    }

    /** Main Menu Username */
    // Display the current user's username in the main menu profile section
    const profileName = document.getElementById("main-menu-username");
    if (profileName) {
        profileName.innerHTML = `
            <p class="main-menu-username">${user.username}</p>
        `;
    }

    /** Ticket Form */
    // Initialize the ticket creation form and modal event listeners
    initTicketForm();

});