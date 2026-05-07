/**
 * @file supabase.js
 * @description Initializes and exports the Supabase client for use across the site.
 */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/** Config */
// Public project URL and publishable anon key — safe to expose in client-side code
const SUPABASE_URL = "https://adnjlrxbqgerjlhgirlq.supabase.co";
const SUPABASE_KEY = "sb_publishable_sNNSlaz28kpULCpWkBCM3Q_OY6FN8cv";

/** Client */
// Shared Supabase client instance imported by all modules that need database access
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Connection Tests (Disabled) */
// TODO: Remove before production — kept for reference during development
/*
// Test 1: Basic connection check — verifies the client can query the users table
const { data, error } = await supabase.from("users").select("*");
if (error) {
    console.error("Supabase connection failed:", error.message);
} else {
    console.log("Supabase connected!", data);
}

// Test 2: Anon role query — verifies RLS allows unauthenticated reads on the users table
const { data, error } = await supabase
    .from("users")
    .select("email")
    .ilike("username", "yourusername");

console.log("anon test data:", data);
console.log("anon test error:", error);
*/