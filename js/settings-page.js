/**
 * @file settings-page.js
 * @description Loads the Settings as the User Set Them
 */

import { supabase } from "/js/supabase.js";

document.addEventListener("DOMContentLoaded", () => {

    /** Element References */
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
    const profilePicInput = document.getElementById("profilePic");
    const profilePreview = document.getElementById("preview");
    const profilePlaceholder = document.getElementById("profile-pic-placeholder");

    /** Load Settings */
    // Reads saved preferences from localStorage and populates all settings inputs.
    // Called once on page load to restore the user's last saved state.
    function loadSettings() {

        // Restore dark mode toggle and apply the class to the body immediately
        const darkMode = localStorage.getItem("darkMode") === "true";
        darkModeToggle.checked = darkMode;
        applyDarkMode(darkMode);

        // TODO: Uncomment when notification backend is implemented
        /*
        ticketsNotifToggle.checked = localStorage.getItem("ticketsNotif") !== "false";
        assignmentsNotifToggle.checked = localStorage.getItem("assignmentsNotif") !== "false";
        systemNotifToggle.checked = localStorage.getItem("systemNotif") !== "false";
        */

        // Populate profile and account fields from the stored user object
        const storedUser = localStorage.getItem("userData");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            usernameInput.value = user.username || "";
            emailInput.value = user.email || "";
            firstNameInput.value = user.firstname || "";
            lastNameInput.value = user.lastname || "";
            phoneNumberInput.value = user.phone || "";
        }
    }

    loadSettings();

    /** Apply Dark Mode */
    // Adds or removes the "dark-mode" class on <body> based on the enabled flag
    function applyDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
    }

    /** Dark Mode Toggle */
    // Applies dark mode instantly when the toggle changes, before the user hits Save
    darkModeToggle.addEventListener("change", () => {
        applyDarkMode(darkModeToggle.checked);
    });

    /** Profile Picture Preview */
    // Validates the selected file (type and size) then shows a live preview.
    // Clears the input and aborts if validation fails.
    profilePicInput.addEventListener("change", () => {
        const file = profilePicInput.files[0];
        if (!file) return;

        // Reject files over 2MB
        if (file.size > 2 * 1024 * 1024) {
            alert("Image must be under 2MB");
            profilePicInput.value = "";
            return;
        }

        // Reject non-image file types
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file");
            profilePicInput.value = "";
            return;
        }

        // Read file as a data URL and show the preview, hiding the placeholder icon
        const reader = new FileReader();
        reader.onload = (e) => {
            profilePreview.src = e.target.result;
            profilePreview.style.display = "block";
            if (profilePlaceholder) profilePlaceholder.style.display = "none";
        };
        reader.readAsDataURL(file);
    });

    /** Load Existing Avatar */
    // Restores the saved profile picture from localStorage on page load
    // so the preview area shows the current avatar rather than the placeholder
    const storedUser = localStorage.getItem("userData");
    if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.profilePic_url && profilePreview) {
            profilePreview.src = user.profilePic_url;
            profilePreview.style.display = "block";
            if (profilePlaceholder) profilePlaceholder.style.display = "none";
        }
    }

    /** Upload Profile Picture */
    // Uploads the selected image to Supabase Storage under a folder named
    // after the user's ID, then returns the public URL of the uploaded file.
    // Returns null if no file is selected or the upload fails.
    async function uploadProfilePicture(userId) {
        const file = profilePicInput.files[0];
        if (!file) return null;

        // Prefix with userId to keep each user's images in their own folder;
        // timestamp prefix avoids filename collisions on re-upload
        const filePath = `${userId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
            .from("profile-pic")
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            console.error("Upload error:", uploadError.message);
            return null;
        }

        // Retrieve the public URL for the uploaded file
        const { data } = supabase.storage
            .from("profile-pic")
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    /** Save Settings */
    // Persists all settings changes on Save button click.
    // Save order: dark mode → Supabase profile update → localStorage sync → profile picture upload.
    // The success message is shown for 3 seconds then faded out.
    saveBtn.addEventListener("click", async () => {

        // Persist dark mode preference to localStorage
        localStorage.setItem("darkMode", darkModeToggle.checked);

        // TODO: Uncomment when notification backend is implemented
        /*
        localStorage.setItem("ticketsNotif", ticketsNotifToggle.checked);
        localStorage.setItem("assignmentsNotif", assignmentsNotifToggle.checked);
        localStorage.setItem("systemNotif", systemNotifToggle.checked);
        */

        const storedUser = localStorage.getItem("userData");
        const user = storedUser ? JSON.parse(storedUser) : {};

        // Push profile and account field changes to Supabase
        await supabase
            .from("users")
            .update({
                username: usernameInput.value.trim(),
                email: emailInput.value.trim(),
                firstname: firstNameInput.value.trim(),
                lastname: lastNameInput.value.trim(),
                phone: phoneNumberInput.value.trim(),
                pronouns: document.getElementById("pronouns").value
            })
            .eq("id", user.id);

        // Mirror the Supabase update in localStorage so the rest of the app
        // reflects the changes without needing a re-fetch
        user.username = usernameInput.value.trim();
        user.email = emailInput.value.trim();
        user.firstname = firstNameInput.value.trim();
        user.lastname = lastNameInput.value.trim();
        user.phone = phoneNumberInput.value.trim();
        localStorage.setItem("userData", JSON.stringify(user));

        // Upload a new profile picture if one was selected, then save its URL
        if (profilePicInput.files[0]) {
            const profilePicUrl = await uploadProfilePicture(user.id);
            if (profilePicUrl) {
                user.profilePic_url = profilePicUrl;

                // Save the new URL to both Supabase and localStorage
                await supabase
                    .from("users")
                    .update({ profilePic_url: profilePicUrl })
                    .eq("id", user.id);
            }
        }

        // Final localStorage write includes the profile picture URL if it was updated
        localStorage.setItem("userData", JSON.stringify(user));

        // Show the save confirmation message and auto-hide after 3 seconds
        saveStatus.textContent = "Settings Saved!";
        saveStatus.classList.add("visible");
        setTimeout(() => saveStatus.classList.remove("visible"), 3000);
    });

    /** Delete Account */
    // Prompts for confirmation then sends a DELETE request to the server.
    // On success, clears localStorage and redirects to the login page.
    const deleteAccountBtn = document.getElementById("delete-account-btn");
    deleteAccountBtn.addEventListener("click", async () => {

        if (!confirm("Are you sure you want to permanently delete your account? This cannot be undone.")) {
            return;
        }

        const storedUser = localStorage.getItem("userData");
        if (!storedUser) {
            alert("No user is currently logged in.");
            return;
        }

        const user = JSON.parse(storedUser);

        try {
            const response = await fetch("/deleteAccount", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: user.id, username: user.username })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Clear all local session data before redirecting
                localStorage.removeItem("userData");
                localStorage.removeItem("isLoggedIn");
                alert("Your account has been deleted.");
                window.location.href = "/pages/login-page.html";
            } else {
                alert(data.message || "Unable to delete account. Please try again.");
            }
        } catch (error) {
            console.error("Delete account error:", error);
            alert("Error deleting account. Please try again.");
        }
    });

});