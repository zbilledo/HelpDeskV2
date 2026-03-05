let tickets = [];

async function fetchTickets() {
    try {
        const response = await fetch("/tickets");
        if (response.ok) {
            tickets = await response.json();
            renderTickets(tickets);
        }
    } catch (error) {
        console.error("Error fetching tickets:", error);
    }
}

function renderTickets(tickets) {
    const container = document.getElementById("ticket-container");

    if (tickets.length === 0) {
        container.innerHTML = `<h1 class="ticket-title">Tickets</h1>
                               <p class="no-tickets">No, Pending Tickets</p>`;
        return container;
    }

    container.innerHTML = `<h1 class="ticket-title">Tickets</h1>` + tickets.map(ticket => `
    <div class="ticket-card" data-priority="${ticket.priority}">
        <div>
            <h3>#${ticket.id} - ${ticket.title}</h3>
            <p>Description: ${ticket.description}</p>
            <p data-priority="${ticket.priority}">Priority: ${ticket.priority}</p>
            <p>Status: ${ticket.status}</p>
        </div>
        <button class="delete-ticket-btn" data-id="${ticket.id}" id="delete-ticket-button">Delete</button>
    </div>
    `).join("");
}

document.getElementById("ticket-container").addEventListener("click", (event) => {
    // Check if the clicked element is a delete button
    if (event.target.classList.contains("delete-ticket-btn")) {
        const ticketId = parseInt(event.target.getAttribute("data-id"));

        // Remove the ticket from the array
        tickets = tickets.filter(t => t.id !== ticketId);

        // Re-render the list
        renderTickets(tickets);
    }
});

document.addEventListener("ticketCreated", (event) => {
    const newTicket = event.detail;

    if (newTicket) {
        tickets.push(newTicket);
        renderTickets(tickets);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    fetchTickets().catch(error => {
        console.error("Failed to initialize tickets:", error);
    });
});



renderTickets(tickets);