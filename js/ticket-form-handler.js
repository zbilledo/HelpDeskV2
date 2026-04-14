/**
 * @file ticket-form-handler.js
 * @description Manages the support ticket creation modal and form submission.
 */

/**
 * Returns the current timestamp in ISO string format.
 * @returns {string} The current timestamp.
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Initializes the ticket form functionality.
 * Sets up event listeners for opening/closing the modal and submitting the form.
 */
export function initTicketForm() {

    const createTicketBtn = document.getElementById("create-ticket-btn");
    const ticketModal = document.getElementById("ticket-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const ticketForm = document.getElementById("ticket-form");

    if (createTicketBtn && ticketModal) {
        // Show modal on 'Create Ticket' button click
        createTicketBtn.addEventListener("click", () => {
            ticketModal.classList.remove("hidden");
        });

        // Hide modal on 'Close' button click
        closeModalBtn.addEventListener("click", () => {
            ticketModal.classList.add("hidden");
        });

        /**
         * Handle ticket form submission.
         * Collects form data and sends it to the server.
         */
        ticketForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            // Extract values from form inputs
            const ticketTitle = document.querySelector("#ticket-title").value;
            const ticketDescription = document.querySelector("#ticket-description").value;
            const ticketPriority = document.querySelector("#ticket-priority").value;

            // Get current user information from session storage
            const userData = JSON.parse(sessionStorage.getItem("userData"));
            const createdBy = userData ? userData.username : "Guest";

            // Get current timestamp
            const createdAt = getCurrentTimestamp();

            try {
                // Send ticket data to the server
                const response = await fetch("/createTicket", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ ticketTitle, ticketDescription, ticketPriority, createdBy, createdAt })
                });

                const data = await response.json();

                if (response.ok) {
                    console.log("Server says:", data.message);
                    // Dispatch custom event to notify other components that a new ticket was created
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

            // Hide modal and reset form after submission (success or failure)
            ticketModal.classList.add("hidden");
            ticketForm.reset();
        });
    }
}