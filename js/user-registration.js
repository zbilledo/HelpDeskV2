/**
 * @file user-registration.js
 * @description Handles new user registration via the registration form.
 */

import { supabase } from "/js/supabase.js";

/** Element References */

const registrationForm = document.getElementById("register-form");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirm-password");
const requirementsBox = document.getElementById("password-requirements");

// Hide the requirements box on page load; it appears only on password field focus
requirementsBox.style.display = "none";


/** Password Requirements */

/**
 * Returns true if the password field satisfies all five requirements.
 * Used to gate form submission and control requirements box visibility.
 */
function allRequirementsMet() {
    const val = passwordInput.value;
    return (
        val.length>=8 &&
        /[A-Z]/.test(val) &&
        /[a-z]/.test(val) &&
        /[0-9]/.test(val) &&
        /[^A-Za-z0-9]/.test(val)
    );
}

/**
 * Reads the current password value and updates each requirement list item
 * by toggling the "met" class on or off via toggleReq().
 */
function updateRequirements() {
    const val = passwordInput.value;
    toggleReq("req-length", val.length >= 8);
    toggleReq("req-upper", /[A-Z]/.test(val));
    toggleReq("req-lower", /[a-z]/.test(val));
    toggleReq("req-number", /[0-9]/.test(val));
    toggleReq("req-special", /[^A-Za-z0-9]/.test(val));
}

/**
 * Adds or removes the "met" CSS class on a requirement list item.
 * CSS uses the "met" class to style the item as satisfied (e.g. green checkmark).
 * @param {string} id - The element ID of the requirement list item.
 * @param {boolean} met - Whether the requirement is currently satisfied.
 */
function toggleReq(id, met) {
    const el = document.getElementById(id);
    if (met) {
        el.classList.add("met");
    } else {
        el.classList.remove("met");
    }
}

/** Requirements Box Visibility */
// The requirements box is shown when either the password or confirm field is
// focused AND not all requirements are met. Two flags track focus state so
// the box doesn't disappear when the user tabs between the two fields.

let passwordFocused = false;
let confirmPwFocused = false;

// Show the box when the password field is focused (if requirements aren't already met)
passwordInput.addEventListener("focus", () => {
    passwordFocused = true;
    if (!allRequirementsMet()) requirementsBox.style.display = "block";
});

// Hide the box on blur only if the confirm field also isn't focused
passwordInput.addEventListener("blur", () => {
    passwordFocused = false;
    if (!confirmPwFocused) requirementsBox.style.display = "none";
})

// Re-evaluate requirement items on every keystroke; hide the box once all are met
passwordInput.addEventListener("input", () => {
    updateRequirements();
    if (allRequirementsMet()) {
        requirementsBox.style.display = "none";
    } else if (passwordFocused) {
        requirementsBox.style.display = "block";
    }

});

// Show the box when the confirm field is focused (if requirements aren't already met)
confirmInput.addEventListener("focus", () => {
    confirmPwFocused = true;
    if (!allRequirementsMet()) requirementsBox.style.display = "block";
});

// Hide the box on blur only if the password field also isn't focused
confirmInput.addEventListener("blur", () => {
    confirmPwFocused = false;
    if (!passwordFocused) requirementsBox.style.display = "none";
});

/** Form Submission */

/**
 * Handles registration form submission.
 * Validation order:
 *   1. Password requirements check
 *   2. Password confirmation match
 *   3. Username uniqueness check (Supabase)
 *   4. Email uniqueness check (Supabase)
 *   5. Supabase Auth account creation
 *   6. User profile row insertion into the "users" table
 */
registrationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Collect and sanitize form values
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const errorMsg = document.getElementById("error-msg");

    // Step 1: Ensure all password requirements are satisfied before proceeding
    if (!allRequirementsMet()) {
        errorMsg.textContent = "Not all password requirements met.";
        errorMsg.style.display = "block";
        requirementsBox.style.display = "block";
        return;
    }

    // Step 2: Confirm both password fields match
    if (password !== confirmPassword) {
        errorMsg.textContent = "Passwords do not match";
        errorMsg.style.display = "block";
        return;
    }

    // Step 3: Check that the username isn't already taken (case-insensitive)
    const { data: existingUsername } = await supabase
        .from("users")
        .select("username")
        .ilike("username", username)
        .single();
    
    if (existingUsername) {
        errorMsg.textContent = "That username is already taken.";
        errorMsg.style.display = "block";
        return;
    }

    // Step 4: Check that the email isn't already registered (case-insensitive)
    const { data: existingEmail } = await supabase
        .from("users")
        .select("email")
        .ilike("email", email)
        .single();
    
    if (existingEmail) {
        errorMsg.textContent = "That email is already registered.";
        errorMsg.style.display = "block";
        return;
    }

    // Step 5: Create the Supabase Auth account (handles password hashing and session)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        errorMsg.textContent = authError.message;
        errorMsg.style.display = "block";
        return;
    }

    // Step 6: Insert the user's profile row into the "users" table.
    // The id is sourced from the newly created auth account to keep them in sync.
    // All new users are assigned the "client" role by default.
    const { error: profileError } = await supabase
        .from("users")
        .insert([{
            id: authData.user.id,
            username,
            email,
            phone,
            role: "client",
            firstname: document.getElementById("first").value.trim(),
            lastname: document.getElementById("last").value.trim()
        }]);

    if (profileError) {
        console.error("Profile error:", profileError);

        // Error code 23505 is a Postgres unique constraint violation;
        // parse the message to surface a specific duplicate field to the user
        if (profileError.code === "23505") {
            if (profileError.message.includes("username")) {
                errorMsg.textContent = "That username is already taken.";
            } else if (profileError.message.includes("email")) {
                errorMsg.textContent = "That email is already registered.";
            } else {
                errorMsg.textContent = "An account with those details already exists.";
            }
        } else {
            errorMsg.textContent = "Registration failed. Please try again.";
        }
        errorMsg.style.display = "block";
        return;
    }

    // Registration complete — redirect to login
    console.log("Registration successful!");
    window.location.href = "/pages/login-page.html";

});