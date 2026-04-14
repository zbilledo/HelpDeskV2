/**
 * @file user-registration.js
 * @description Handles new user registration via the registration form.
 */

import { supabase } from "/js/supabase.js";

const registrationForm = document.getElementById("register-form");
const passwordInput = document.getElementById("password");
const login = document.getElementById("login-button");

/** Password Requirement Check */
function toggleReq(id, met) {
    const el = document.getElementById(id);
    if (met) {
        el.classList.add("met");
    } else {
        el.classList.remove("met");
    }
}

passwordInput.addEventListener("input", () => {
    const val = passwordInput.value;

    toggleReq("req-length", val.length >= 8);
    toggleReq("req-upper", /[A-Z]/.test(val));
    toggleReq("req-lower", /[a-z]/.test(val));
    toggleReq("req-number", /[0-9]/.test(val));
    toggleReq("req-special", /[^A-Za-z0-9]/.test(val));
});


/**
 * Handle registration form submission.
 * Validates and sends new user credentials to the server.
 */
registrationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const errorMsg = document.getElementById("error-msg");


    if (password !== confirmPassword) {
        errorMsg.textContent = "Passwords do not match";
        errorMsg.style.display = "block";
        return;
    }

    // Create Authorized Account
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        errorMsg.textContent = authError.message;
        errorMsg.style.display = "block";
        return;
    }

    // Add user info
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
        errorMsg.textContent = "Registration failed. Please try again.";
        errorMsg.style.display = "block";
        return;
    }

    console.log("Registration successful!");
    window.location.href = "/pages/login-page.html";

});

login.addEventListener("click", () => {
    window.location.href = "/pages/user-registration.html";
});