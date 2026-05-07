/**
 * @file ticket-form-handler.js
 * @description Manages the support ticket creation modal and form submission.
 */

/** Get Current Timestamp */
// Returns the current date and time as an ISO string for use as the ticket's createdAt value
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/** Populate User Dropdown */
// Fetches all users from the server and populates the assignment dropdown.
// Clears existing options first (except "Unassigned") to avoid duplicates on repeat opens.
async function populateUserDropdown() {
    const assignedToSelect = document.getElementById("assigned-to");
    if (!assignedToSelect) return;

    try {
        const response = await fetch("/getUsers");
        if (response.ok) {
            const users = await response.json();

            // Reset to just the default unassigned option before adding users
            assignedToSelect.innerHTML = '<option value="">Unassigned</option>';

            users.forEach(user => {
                const option = document.createElement("option");
                option.value = user.username;
                option.textContent = user.username;
                assignedToSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

/** Init Ticket Form */
// Exported function called by topbar.js to wire up the ticket creation modal.
// Sets up listeners for opening the modal, closing it, and handling form submission.
export function initTicketForm() {

    const createTicketBtn = document.getElementById("create-ticket-btn");
    const ticketModal = document.getElementById("ticket-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const ticketForm = document.getElementById("ticket-form");

    if (createTicketBtn && ticketModal) {

        // Open modal and populate the user dropdown on 'Create Ticket' click
        createTicketBtn.addEventListener("click", async () => {
            await populateUserDropdown();
            ticketModal.classList.remove("hidden");
        });

        // Close modal without submitting on 'Close' button click
        closeModalBtn.addEventListener("click", () => {
            ticketModal.classList.add("hidden");
        });

        /** Form Submission */
        // Collects form values, sends a POST request to create the ticket,
        // and dispatches a 'ticketCreated' custom event so other components
        // (e.g. tickets-template.js) can update their lists without a full re-fetch.
        // Modal is closed and form is reset regardless of success or failure.
        ticketForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            // Collect form values
            const ticketTitle = document.querySelector("#ticket-title").value;
            const ticketDescription = document.querySelector("#ticket-description").value;
            const ticketPriority = document.querySelector("#ticket-priority").value;
            const department = document.querySelector("#departments").value;
            const assignedTo = document.querySelector("#assigned-to").value;

            // Read the current user from localStorage; falls back to "Guest" if not found
            const userData = JSON.parse(localStorage.getItem("userData"));
            const createdBy = userData ? userData.username : "Guest";

            const createdAt = getCurrentTimestamp();

            try {
                const response = await fetch("/createTicket", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    // assignedTo is sent as null if left unassigned
                    body: JSON.stringify({
                        ticketTitle,
                        ticketDescription,
                        ticketPriority,
                        department,
                        createdBy,
                        createdAt,
                        assignedTo: assignedTo || null
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    console.log("Server says:", data.message);
                    // Notify listening components (e.g. tickets-template.js) that a new ticket exists
                    const ticketEvent = new CustomEvent("ticketCreated", {
                        detail: data.ticket
                    });
                    document.dispatchEvent(ticketEvent);
                } else {
                    console.error("Failed to create ticket:", data.message);
                }
            } catch (error) {
                console.error("Error creating ticket:", error);
            }

            // Always close and reset the modal after submission, even on failure
            ticketModal.classList.add("hidden");
            ticketForm.reset();
        });
    }
}