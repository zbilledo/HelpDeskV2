/**
 * @file settings-page.js
 * @description Loads the Settings as the User Set Them
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // --- Element References ---
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const ticketsNotifToggle = document.getElementById("tickets-notif-toggle");
    const assignmentsNotifToggle = document.getElementById("assignments-notif-toggle");
    const systemNotifToggle = document.getElementById("system-notif-toggle");
    const firstNameInput = document.getElementById("firstname-input");
    const lastNameInput = document.getElementById("lastname-input");
    const usernameInput = document.getElementById("username-input");
    const emailInput = document.getElementById("email-input");
    const saveBtn = document.getElementById("save-settings-btn");
    const saveStatus = document.getElementById("save-status");
    const phoneNumberInput = document.getElementById("phoneNumber-input");

    // --- Loads the Settings Preferences from Local Storage ---
    function loadSettings() {

        // --- Load Dark Mode ---
        const darkMode = localStorage.getItem("darkMode") === "true";
        darkModeToggle.checked = darkMode;
        applyDarkMode(darkMode);

        // --- Load Notifications ---
        ticketsNotifToggle.checked = localStorage.getItem("ticketsNotif") !== "false";
        assignmentsNotifToggle.checked = localStorage.getItem("assignmentsNotif") !== "false";
        systemNotifToggle.checked = localStorage.getItem("systemNotif") !== "false";

        // --- Load Profile and Account ---
        const storedUser = localStorage.getItem("userData");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            usernameInput.value = user.username || "";
            emailInput.value = user.email || "";
            firstNameInput.value = user.firstname || "";
            lastNameInput.value = user.lastname || "";
            phoneNumberInput.value=user.phonenumber || "";
        }
    }

    // --- Run loadSettings when page loads in ---
    loadSettings();

    
    // --- Apply Dark Mode to the Page ---
    function applyDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
    }

    // --- Instant Application of Dark Mode Toggle ---
    darkModeToggle.addEventListener("change", () => {
        applyDarkMode(darkModeToggle.checked);
    });

    // --- Save All Settings ---
    saveBtn.addEventListener("click", () => {
        
        // --- Save Dark Mode Changes ---
        localStorage.setItem("darkMode", darkModeToggle.checked);

        // --- Save Notification Changes ---
        localStorage.setItem("ticketsNotif", ticketsNotifToggle.checked);
        localStorage.setItem("assignmentsNotif", assignmentsNotifToggle.checked);
        localStorage.setItem("systemNotif", systemNotifToggle.checked);

        // --- Save Account and Profile Changes ---
        const storedUser = localStorage.getItem("userData");
        const user = storedUser ? JSON.parse(storedUser) : {};
        user.username = usernameInput.value.trim();
        user.email = emailInput.value.trim();
        user.firstname = firstNameInput.value.trim();
        user.lastname = lastNameInput.value.trim();
        user.phonenumber = phoneNumberInput.value.trim();
        localStorage.setItem("userData", JSON.stringify(user));

        // --- Show Confirmation of Changes ---
        saveStatus.textContent = "Settings Saved!";
        saveStatus.classList.add("visible");
        setTimeout(() => saveStatus.classList.remove("visible"), 3000);
    });
})