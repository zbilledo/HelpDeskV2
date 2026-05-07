/**
 * @file login-page.js
 * @description Handles user login authentication and navigation to registration.
 */

import { supabase } from "/js/supabase.js";

/** Clear Existing Session */
// Sign out any existing session on landing to prevent stale auth state
// from carrying over if the user was previously logged in
await supabase.auth.signOut();

/** Element References */
const loginForm = document.getElementById("login-form");
const signUp = document.getElementById("sign-up-button");

/** Login Form Submission */
// Accepts either a username or email, resolves to an email if a username is given,
// then authenticates via Supabase Auth and loads the user profile on success.
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userLogin = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("error-msg");

  // Default to treating the input as an email; overridden below if it's a username
  let email = userLogin;

  // TODO: Remove after debugging — session check is not needed for login flow
  const { data: session } = await supabase.auth.getSession();

  /** Username to Email Lookup */
  // If the input has no "@" it's treated as a username; look up the associated email
  if (!userLogin.includes("@")) {
    const { data: users, error: lookupError } = await supabase
      .from("users")
      .select("email")
      .ilike("username", userLogin);

    if (lookupError || !users || users.length === 0) {
      errorMsg.textContent = "Username not found.";
      errorMsg.style.display = "block";
      return;
    }

    email = users[0].email;
  }

  /** Supabase Auth Sign In */
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    errorMsg.textContent = "Invalid username or password";
    errorMsg.style.display = "block";
    return;
  }

  /** Profile Lookup */
  // Fetch the full user profile row from the "users" table using the auth user's ID
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .single();

  // TODO: Remove debug logs after login flow is confirmed stable
  console.log("profile:", profile);
  console.log("profileError:", profileError);
  console.log("auth user id:", data.user.id);

  if (profileError || !profile) {
    errorMsg.textContent = "Could not load user profile. Please try again.";
    errorMsg.style.display = "block";
    return;
  }

  /** Redirect on Success */
  // Save session flags and full profile to localStorage, then redirect to the dashboard
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userData", JSON.stringify(profile));
  window.location.href = "/pages/dashboard.html";
});

// TODO: Remove after debugging — username lookup test, no longer needed
/*
const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("username", "yourusername")
    .single();

console.log("data:", data);
console.log("error:", error);
*/

/** Sign Up Button */
// Redirects to the registration page when the Sign Up button is clicked.
// Note: this listener is duplicated below — one copy should be removed.
signUp.addEventListener("click", () => {
  window.location.href = "/pages/user-registration.html";
});

// TODO: Remove this duplicate — identical listener registered twice
signUp.addEventListener("click", () => {
  window.location.href = "/pages/user-registration.html";
});