/**
 * @file tickets-template.js
 * @description Manages fetching, rendering, and deleting support tickets on the dashboard.
 */

import PriorityFilter from './tag-filtering.js';

let tickets = [];
let currentSort = 'priority'; // 'priority', 'oldest', 'newest'

/**
 * Fetches all tickets from the server and updates the UI.
 */
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

/**
 * Sorts the tickets based on the current sort mode.
 * @param {Array} tickets - Array of ticket objects to sort.
 * @returns {Array} Sorted tickets.
 */
function sortTickets(tickets) {
  const sorted = [...tickets];
  if (currentSort === 'priority') {
    const filter = new PriorityFilter();
    filter.setItems(sorted);
    return filter.sortByPriority(true);
  } else if (currentSort === 'oldest') {
    return sorted.sort((a, b) => a.id - b.id);
  } else if (currentSort === 'newest') {
    return sorted.sort((a, b) => b.id - a.id);
  }
  return sorted;
}

/**
 * Renders the list of tickets into the ticket container.
 * @param {Array} tickets - Array of ticket objects to display.
 */
function renderTickets(tickets) {
  const container = document.getElementById("ticket-container");

  // Display message if no tickets are found
  if (tickets.length === 0) {
    container.innerHTML = `<h1 class="ticket-title">Tickets</h1>
                               <p class="no-tickets">No, Pending Tickets</p>`;
    return container;
  }

  // Sort the tickets
  const sortedTickets = sortTickets(tickets);

  // Map ticket data to HTML cards
  container.innerHTML =
    `<h1 class="ticket-title">Tickets</h1>
    <div class="sort-dropdown">
      <label for="sort-select">Sort by:</label>
      <select id="sort-select" class="sort-select">
        <option value="priority" ${currentSort === 'priority' ? 'selected' : ''}>Priority</option>
        <option value="oldest" ${currentSort === 'oldest' ? 'selected' : ''}>Oldest First</option>
        <option value="newest" ${currentSort === 'newest' ? 'selected' : ''}>Newest First</option>
      </select>
    </div>` +
    sortedTickets
      .map(
        (ticket) => `
    <div class="ticket-card" data-priority="${ticket.priority}">
        <div>
            <h3>#${ticket.id} - ${ticket.title}</h3>
            <p>Description: ${ticket.description}</p>
            <p data-priority="${ticket.priority}">Priority: ${ticket.priority}</p>
            <p>Status: ${ticket.status}</p>
            <p><strong>Created By: ${ticket.createdBy}</strong></p>
        </div>
        <div class="ticket-actions">
            <button class="status-btn" data-id="${ticket.id}">Status</button>
            <button class="delete-ticket-btn" data-id="${ticket.id}" id="delete-ticket-button">Delete</button>
        </div>
    </div>
    `,
      )
      .join("");
}

/**
 * Event delegation for ticket deletion and sort dropdown.
 * Listens for clicks on delete buttons and changes on sort select within the ticket container.
 */
document
  .getElementById("ticket-container")
  .addEventListener("change", (event) => {
    // Handle sort dropdown change
    if (event.target.id === 'sort-select') {
      currentSort = event.target.value;
      renderTickets(tickets);
    }
  });

document
  .getElementById("ticket-container")
  .addEventListener("click", async (event) => {
    // Navigate to status page when Status button clicked
    if (event.target.classList.contains("status-btn")) {
      const ticketId = parseInt(event.target.getAttribute("data-id"));
      window.location.href = `/pages/status-page.html?ticketId=${ticketId}`;
      return;
    }

    // Check if the clicked element is a delete button
    if (event.target.classList.contains("delete-ticket-btn")) {
      const ticketId = parseInt(event.target.getAttribute("data-id"));

      // Optimistically remove the ticket from the local array
      tickets = tickets.filter((t) => t.id !== ticketId);

      try {
        // Send delete request to the server
        const response = await fetch(`/deleteTicket/${ticketId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();
        console.log(result.message);
      } catch (error) {
        console.error("Error deleting ticket:", error);
      }

      // Re-render the list to reflect changes
      renderTickets(tickets);
    }
  });

/**
 * Listen for the custom 'ticketCreated' event to add newly created tickets to the list.
 */
document.addEventListener("ticketCreated", (event) => {
  const newTicket = event.detail;

  if (newTicket) {
    tickets.push(newTicket);
    renderTickets(tickets);
  }
});

/**
 * Initialize tickets on page load.
 */
document.addEventListener("DOMContentLoaded", () => {
  fetchTickets().catch((error) => {
    console.error("Failed to initialize tickets:", error);
  });
});

// Initial render
renderTickets(tickets);

// Set up polling to keep tickets synchronized with the server every 2 seconds
setInterval(fetchTickets, 2000);
