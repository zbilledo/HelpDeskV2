/**
 * @file login-page.js
 * @description Handles user login authentication and navigation to registration.
 */

import { supabase } from "/js/supabase.js";

// Clear any existing session when landing on login page
await supabase.auth.signOut();

const loginForm = document.getElementById("login-form");
const signUp = document.getElementById("sign-up-button");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userLogin = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("error-msg");

  let email = userLogin;

  // Add this before the username lookup
  const { data: session } = await supabase.auth.getSession();

  // Finds email by username
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

  // Sign in with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // No matching user found
  if (error) {
    errorMsg.textContent = "Invalid username or password";
    errorMsg.style.display = "block";
    return;
  }

  // Look for user within database with matching username and password
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .single();

  console.log("profile:", profile);
  console.log("profileError:", profileError);
  console.log("auth user id:", data.user.id);

  if (profileError || !profile) {
    errorMsg.textContent = "Could not load user profile. Please try again.";
    errorMsg.style.display = "block";
    return;
  }

  // User found - saves to localStorage and redirects.
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userData", JSON.stringify(profile));
  window.location.href = "/pages/dashboard.html";
});
/** Temporary test - delete after debugging
const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("username", "yourusername") // replace with your actual username
    .single();

console.log("data:", data);
console.log("error:", error); */
/**
 * Redirect to the user registration page when the sign-up button is clicked.
 */
signUp.addEventListener("click", () => {
  window.location.href = "/pages/user-registration.html";
});
/**
 * Redirect to the user registration page when the sign-up button is clicked.
 */
signUp.addEventListener("click", () => {
  window.location.href = "/pages/user-registration.html";
});
