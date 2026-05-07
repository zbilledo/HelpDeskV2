/**
 * @file tickets-template.js
 * @description Manages fetching, rendering, and deleting support tickets on the dashboard.
 */

/** State */
let tickets = []; // Full ticket list fetched from the server

/** Fetch Tickets */
// Fetches all tickets from the server and triggers a re-render on success
async function fetchTickets() {
    try {
        const response = await fetch("/getTickets");
        if (response.ok) {
            tickets = await response.json();
            renderTickets(tickets);
        }
    } catch (error) {
        console.error("Error fetching tickets:", error);
    }
}

/** Render Tickets */
// Maps the ticket array to HTML cards and injects them into #ticket-container.
// Shows a "No Pending Tickets" message if the array is empty.
function renderTickets(tickets) {
    const container = document.getElementById("ticket-container");

    if (tickets.length === 0) {
        container.innerHTML = `<h1 class="ticket-title">Tickets</h1>
                               <p class="no-tickets">No, Pending Tickets</p>`;
        return container;
    }

    // Build and inject ticket card HTML for each ticket
    container.innerHTML = `<h1 class="ticket-title">Tickets</h1>` + tickets.map(ticket => `
    <div class="ticket-card" data-priority="${ticket.priority}">
        <div>
            <h3>#${ticket.id} - ${ticket.title}</h3>
            <p>Description: ${ticket.description}</p>
            <p data-priority="${ticket.priority}">Priority: ${ticket.priority}</p>
            <p>Status: ${ticket.status}</p>
            <p><strong>Created By: ${ticket.createdBy}</strong></p>
        </div>
        <button class="delete-ticket-btn" data-id="${ticket.id}" id="delete-ticket-button">Delete</button>
    </div>
    `).join("");
}

/** Click Event Delegation */
// Handles all clicks within #ticket-container via a single delegated listener.
// Currently routes only delete button clicks.
document.getElementById("ticket-container").addEventListener("click", async (event) => {

    // Delete button: optimistically remove from local array, then send DELETE to server
    if (event.target.classList.contains("delete-ticket-btn")) {
        const ticketId = parseInt(event.target.getAttribute("data-id"));

        // Remove immediately from local state so the UI feels instant
        tickets = tickets.filter(t => t.id !== ticketId);

        try {
            const response = await fetch(`/deleteTicket/${ticketId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
            });

            const result = await response.json();
            console.log(result.message);
        } catch (error) {
            console.error("Error deleting ticket:", error);
        }

        // Re-render to reflect the removed ticket
        renderTickets(tickets);
    }
});

/** Ticket Created Event */
// Listens for the custom 'ticketCreated' event dispatched by the ticket form handler.
// Pushes the new ticket into the local array and triggers a re-render.
document.addEventListener("ticketCreated", (event) => {
    const newTicket = event.detail;

    if (newTicket) {
        tickets.push(newTicket);
        renderTickets(tickets);
    }
});

/** Init */
// Fetch tickets on page load
document.addEventListener("DOMContentLoaded", () => {
    fetchTickets().catch(error => {
        console.error("Failed to initialize tickets:", error);
    });
});

// Trigger an initial render with an empty array to build the page shell before data arrives
renderTickets(tickets);

// Poll the server every 2 seconds to keep the ticket list in sync
setInterval(fetchTickets, 2000);