/**
 * @file user-page.js
 * @description Handles loading, filtering, searching and displaying users.
 * Admins can edit user roles via an inline modal.
 */

import { supabase } from "/js/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {

/** State */

    let allUsers = [];          // Full unfiltered user list fetched from Supabase
    let currentFilter = "all"; // Active role filter tab ("all", "client", "employee", "admin")
    let currentView = "table"; // Active display mode ("table" or "grid")
    let searchQuery = "";      // Current value of the search input

/** Element Reference */

    const tableBody = document.getElementById("table-body");
    const gridBody = document.getElementById("grid-body");
    const tableView = document.getElementById("table-view");
    const gridView = document.getElementById("grid-view");
    const loadingState = document.getElementById("loading-state");
    const emptyState = document.getElementById("empty-state");
    const userSearch = document.getElementById("user-search");
    const tableViewBtn = document.getElementById("table-view-btn");
    const gridViewBtn = document.getElementById("grid-view-btn");
    const filterTabs = document.querySelectorAll(".filter-tab");

/** Current User */

    // Read the logged-in user's data from localStorage to determine admin status.
    // isAdmin controls whether role edit buttons are rendered at all.
    const storedUser = localStorage.getItem("userData");
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    const isAdmin = currentUser?.role === "admin";

 /** Role Edit Modal */

    // Build and inject the role change modal into the DOM dynamically
    // so it doesn't need to live in the HTML template
    const modal = document.createElement("div");
    modal.id = "role-modal";
    modal.className = "role-modal-overlay hidden";
    modal.innerHTML = `
        <div class="role-modal">
            <div class="role-modal-header">
                <h3>Change User Role</h3>
                <button class="role-modal-close" id="close-role-modal">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="role-modal-body">
                <div class="role-modal-user" id="modal-user-info"></div>
                <label for="modal-role-select">Select Role</label>
                <select id="modal-role-select" class="role-select">
                    <option value="client">Client</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                </select>
                <p class="role-modal-desc">
                    <i class="fa-solid fa-circle-info"></i>
                    Changing a user's role affects what they can see and do in the system.
                </p>
            </div>
            <div class="role-modal-footer">
                <button class="role-cancel-btn" id="cancel-role-modal">Cancel</button>
                <button class="role-save-btn" id="save-role-btn">
                    <i class="fa-solid fa-floppy-disk"></i> Save Role
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Tracks which user's role is being edited; set on modal open, cleared on close
    let editingUserId = null;

    /**
     * Opens the role edit modal for a given user.
     * Populates the avatar, name, username, and pre-selects their current role.
     * Falls back to initials if no avatar URL is present.
     * @param {Object} user - The user object from the allUsers array.
     */
    function openRoleModal(user) {
        editingUserId = user.id;

        // Build initials from first/last name, falling back to username initial or "?"
        const initials = ((user.firstname?.[0] || "") + (user.lastname?.[0] || "")).toUpperCase()
            || user.username?.[0]?.toUpperCase()
            || "?";

        const avatarHtml = user.avatar_url
            ? `<img src="${user.avatar_url}" alt="${user.username}">`
            : initials;

        document.getElementById("modal-user-info").innerHTML = `
            <div class="modal-avatar">${avatarHtml}</div>
            <div>
                <div class="modal-user-name">${(user.firstname || "") + " " + (user.lastname || "")}</div>
                <div class="modal-user-username">@${user.username}</div>
            </div>
        `;

        // Pre-select the user's current role in the dropdown
        document.getElementById("modal-role-select").value = user.role;
        modal.classList.remove("hidden");
    }

    /**
     * Closes the role edit modal and clears the tracked user ID.
     */
    function closeModal() {
        modal.classList.add("hidden");
        editingUserId = null;
    }

    // Close modal via the X button, Cancel button, or clicking the backdrop
    document.getElementById("close-role-modal").addEventListener("click", closeModal);
    document.getElementById("cancel-role-modal").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

/** Save Role */

    document.getElementById("save-role-btn").addEventListener("click", async () => {
        const newRole = document.getElementById("modal-role-select").value;
        const saveBtn = document.getElementById("save-role-btn");

        // Disable the button and show a saving indicator while the request is in flight
        saveBtn.textContent = "Saving...";
        saveBtn.disabled = true;

        const { error } = await supabase
            .from("users")
            .update({ role: newRole })
            .eq("id", editingUserId);

        // Restore button state regardless of success or failure
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Role';
        saveBtn.disabled = false;

        if (error) {
            console.error("Role update error:", error);
            alert("Failed to update role. Please try again.");
            return;
        }

        // Update the local allUsers array so the UI reflects the change
        // without needing a full re-fetch from Supabase
        const user = allUsers.find(u => u.id === editingUserId);
        if (user) user.role = newRole;

        updateCounts();
        renderUsers();
        closeModal();
    });

  /** Fetch User */

    /**
     * Fetches all users from Supabase ordered by creation date (newest first).
     * Shows the loading state while fetching, then hands off to renderUsers().
     */
    async function fetchUsers() {
        // Show loading state and hide all other views while fetching
        loadingState.style.display = "flex";
        tableView.style.display = "none";
        gridView.style.display = "none";
        emptyState.style.display = "none";

        const { data, error } = await supabase
            .from("users")
            .select("*")
            .order("created_at", { ascending: false });

        loadingState.style.display = "none";

        if (error) {
            console.error("Error fetching users:", error);
            return;
        }

        allUsers = data;
        updateCounts();
        renderUsers();
    }

    // TODO: Remove debug fetch and console logs below before production
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

    console.log("data:", data);
    console.log("error:", error);
    console.log("session:", await supabase.auth.getSession());

 /** Tab Counts */

    /**
     * Updates the count badge on each filter tab to reflect
     * the current number of users in each role.
     */
    function updateCounts() {
        document.getElementById("count-all").textContent = allUsers.length;
        document.getElementById("count-client").textContent = allUsers.filter(u => u.role === "client").length;
        document.getElementById("count-employee").textContent = allUsers.filter(u => u.role === "employee").length;
        document.getElementById("count-admin").textContent = allUsers.filter(u => u.role === "admin").length;
    }

/** Filter and Search */

    /**
     * Returns the subset of allUsers that match both the active role
     * filter tab and the current search query.
     * Search checks first name, last name, username, and email (case-insensitive).
     */
    function getFilteredUsers() {
        return allUsers.filter(user => {
            const matchesFilter = currentFilter === "all" || user.role === currentFilter;
            const query = searchQuery.toLowerCase();
            const matchesSearch = !query ||
                (user.firstname && user.firstname.toLowerCase().includes(query)) ||
                (user.lastname && user.lastname.toLowerCase().includes(query)) ||
                (user.username && user.username.toLowerCase().includes(query)) ||
                (user.email && user.email.toLowerCase().includes(query));
            return matchesFilter && matchesSearch;
        });
    }

/** Render Helpers */

    /**
     * Returns a user's initials (first + last name), falling back to
     * the first character of their username, or "?" if neither is available.
     * @param {Object} user
     * @returns {string}
     */
    function getInitials(user) {
        const first = user.firstname?.[0] || "";
        const last = user.lastname?.[0] || "";
        return (first + last).toUpperCase() || user.username?.[0]?.toUpperCase() || "?";
    }

    /**
     * Formats an ISO date string into a short readable date (e.g. "Jan 1, 2024").
     * Returns an em dash if the date is missing.
     * @param {string} dateString
     * @returns {string}
     */
    function formatDate(dateString) {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric"
        });
    }

    /**
     * Returns an avatar HTML string for a user.
     * Uses their avatar image if available, otherwise falls back to initials.
     * @param {Object} user
     * @param {string} size - "small" for table rows, "large" for grid cards.
     * @returns {string}
     */
    function renderAvatar(user, size = "small") {
        const cls = size === "large" ? "user-card-avatar" : "user-avatar";
        if (user.avatar_url) {
            return `<div class="${cls}"><img src="${user.avatar_url}" alt="${user.username}"></div>`;
        }
        return `<div class="${cls}">${getInitials(user)}</div>`;
    }

    /**
     * Returns the role edit button HTML for a user row or card.
     * Returns an empty string if the current user is not an admin.
     * @param {string} userId
     * @returns {string}
     */
    function renderEditBtn(userId) {
        if (!isAdmin) return "";
        return `<button class="action-btn edit-btn" data-id="${userId}">
            <i class="fa-solid fa-shield"></i> Role
        </button>`;
    }

/** Render Table */

    /**
     * Renders the filtered user list as an HTML table.
     * Shows the empty state instead if there are no results.
     * The Actions column is only included for admin users.
     * @param {Array} users - Filtered array of user objects.
     */
    function renderTable(users) {
        if (users.length === 0) {
            tableView.style.display = "none";
            emptyState.style.display = "flex";
            return;
        }

        emptyState.style.display = "none";
        tableView.style.display = "block";

        tableBody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="user-cell">
                        ${renderAvatar(user)}
                        <span class="user-full-name">${user.firstname || ""} ${user.lastname || ""}</span>
                    </div>
                </td>
                <td>@${user.username || "—"}</td>
                <td>${user.email || "—"}</td>
                <td>${user.phone || "—"}</td>
                <td><span class="role-badge ${user.role}">${user.role}</span></td>
                <td>${formatDate(user.created_at)}</td>
                ${isAdmin ? `<td>${renderEditBtn(user.id)}</td>` : ""}
            </tr>
        `).join("");
    }

/** Render Grid */

    /**
     * Renders the filtered user list as a grid of cards.
     * Shows the empty state instead if there are no results.
     * @param {Array} users - Filtered array of user objects.
     */
    function renderGrid(users) {
        if (users.length === 0) {
            gridView.style.display = "none";
            emptyState.style.display = "flex";
            return;
        }

        emptyState.style.display = "none";
        gridView.style.display = "block";

        gridBody.innerHTML = users.map(user => `
            <div class="user-card">
                ${renderAvatar(user, "large")}
                <div class="user-card-name">${user.firstname || ""} ${user.lastname || ""}</div>
                <div class="user-card-username">@${user.username || "—"}</div>
                <div class="user-card-email">${user.email || "—"}</div>
                <span class="role-badge ${user.role}">${user.role}</span>
                ${renderEditBtn(user.id)}
            </div>
        `).join("");
    }

/** Render Users */

    /**
     * Entry point for all re-renders. Applies the active filter and search,
     * delegates to renderTable or renderGrid based on currentView,
     * then re-attaches click listeners to all role edit buttons.
     * Edit button listeners must be re-attached after each render
     * because innerHTML replacement destroys previous event bindings.
     */
    function renderUsers() {
        const filtered = getFilteredUsers();
        tableView.style.display = "none";
        gridView.style.display = "none";

        if (currentView === "table") {
            renderTable(filtered);
        } else {
            renderGrid(filtered);
        }

        // Re-attach edit button listeners after every render since
        // innerHTML replacement removes previously bound event handlers
        document.querySelectorAll(".edit-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const userId = btn.getAttribute("data-id");
                const user = allUsers.find(u => u.id === userId);
                if (user) openRoleModal(user);
            });
        });
    }

/** Event Listeners */

    // View toggle: switch between table and grid display modes
    tableViewBtn.addEventListener("click", () => {
        currentView = "table";
        tableViewBtn.classList.add("active");
        gridViewBtn.classList.remove("active");
        renderUsers();
    });

    gridViewBtn.addEventListener("click", () => {
        currentView = "grid";
        gridViewBtn.classList.add("active");
        tableViewBtn.classList.remove("active");
        renderUsers();
    });

    // Filter tabs: update the active role filter and re-render
    filterTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            filterTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            currentFilter = tab.getAttribute("data-filter");
            renderUsers();
        });
    });

    // Search input: update the search query and re-render on every keystroke
    userSearch.addEventListener("input", () => {
        searchQuery = userSearch.value;
        renderUsers();
    });

/** Innit */

    // Kick off the initial user fetch on page load
    fetchUsers();
});