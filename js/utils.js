/**
 *  * @file utils.js
 * @description Utility functions and page security checks.
 */


/** Component Loader */

/**
* Dynamically loads an HTML component and injects it into a target element.
* Used to insert shared components like the sidebar, topbar, and footer.
* @param {string} componentSelector - The CSS selector for the target element.
* @param {string} componentPath - The path to the HTML file to load.
*/

export async function loadComponent(componentSelector, componentPath) {
  const target = document.querySelector(componentSelector);

  // Bail early if the target element doesn't exist in the current page's DOM
  if (!target) {
    console.error(`Target element "${componentSelector}" not found.`);
    return;
  }

  try {
    const response = await fetch(componentPath);

    if (!response.ok) throw new Error(`Failed to load: ${componentPath}`);

    // Inject the fetched HTML into the target element
    target.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
  }
}

import { supabase } from "/js/supabase.js";

/** Role-based View */

/**
 * Fetches the current user's role from Supabase and applies it as a CSS class
 * on <body> (e.g. "role-admin", "role-employee", "role-client").
 * CSS then uses these classes to show or hide role-specific UI elements.
 * Redirects to login if the session is missing or the profile lookup fails.
 */

async function applyRoleView() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // No active session — redirect to login
  if (!session) {
    window.location.href = "/pages/login-page.html";
    return;
  }

  // Look up the user's role in the "users" table by their session ID
  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  // Profile missing or query failed — redirect to login
  if (error || !profile) {
    window.location.href = "/pages/login-page.html";
    return;
  }

  // Apply the role as a body class so CSS can conditionally show/hide elements
  document.body.classList.add(`role-${profile.role}`);
}

/** Auth Guard */

// Determine whether the current page is public (no login required).
// applyRoleView() is only called on protected pages to avoid unnecessary
// Supabase calls and redirects on public-facing routes.
const currentPath = window.location.pathname;
const isPublicPage =
  currentPath === "/" ||
  currentPath === "/index.html" ||
  currentPath.includes("login-page.html") ||
  currentPath.includes("user-registration.html") ||
  currentPath.includes("forgot-pw.html") ||
  currentPath.includes("faq.html") ||
  currentPath.includes("sales.html") ||
  currentPath.includes("business-page.html") ||
  currentPath.includes("about.html") ||
  currentPath.includes("request-demo.html");

// Only run the role/auth check on protected pages
if (!isPublicPage) {
  applyRoleView();
}


// ===================== LEGACY AUTH GUARD (DEPRECATED) =====================
// Original session-storage-based auth guard, replaced by Supabase session checks above.
// Kept for reference; safe to remove once the Supabase implementation is confirmed stable.
/*

/**
* IIFE for Authentication Guard:
* Redirects the user to the login page if they are not logged in.
*/
/*(function() {
const isLoggedIn = sessionStorage.getItem("isLoggedIn");

// Allow access to the login and registration pages without authentication
const currentPath = window.location.pathname;
const isPublicPage = currentPath === "/" || 
currentPath.includes("login-page.html") || 
currentPath.includes("user-registration.html");

    if (!isLoggedIn && !isPublicPage) {
        window.location.href = "/";
    }
})();*/
