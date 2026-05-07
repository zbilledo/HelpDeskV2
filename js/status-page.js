/** @file status-page.js */
/** Renders a detailed ticket status view based on ticketId in the query string */

/** Load Ticket Status */
// Reads the ticketId from the URL query string, fetches all tickets, finds the
// matching one, and injects a status card into #status-container.
// Shows an inline error message if the ID is missing, not found, or the fetch fails.
async function loadTicketStatus() {
  const params = new URLSearchParams(window.location.search);
  const ticketId = params.get("ticketId");
  const container = document.getElementById("status-container");

  // Bail early if no ticketId was provided in the URL
  if (!ticketId) {
    container.innerHTML = '<p class="error">No ticket id provided in the URL.</p>';
    return;
  }

  try {
    const res = await fetch("/getTickets");
    if (!res.ok) throw new Error("Failed to fetch tickets");

    const tickets = await res.json();

    // String comparison used to avoid type mismatch between URL param and ticket ID
    const ticket = tickets.find((t) => String(t.id) === String(ticketId));

    if (!ticket) {
      container.innerHTML = `<p class="error">Ticket with id ${ticketId} not found.</p>`;
      return;
    }

    // Inject the status card; data-priority drives priority color coding via CSS
    container.innerHTML = `
      <div class="ticket-status-card" data-priority="${ticket.priority}">
        <div class="header">
          <h2>#${ticket.id} - ${ticket.title}</h2>
          <div class="current-status ${ticket.status}">${ticket.status}</div>
        </div>

        <div class="priority-box">Priority: <span class="priority-value">${ticket.priority}</span></div>

        <div class="department-box">Department: <span class="department-value">${ticket.department}</span></div>

        <div class="description-box">
          <h4>Description</h4>
          <p>${ticket.description}</p>
        </div>

        <p class="created-by">Created By: ${ticket.createdBy}</p>

        <div class="actions">
          <a class="back-link" href="./dashboard.html">← Back to Tickets</a>
        </div>
      </div>
    `;

    // Uppercases the status label after injection for display consistency
    const statusEl = container.querySelector(".current-status");
    if (statusEl) {
      statusEl.textContent = String(ticket.status).toUpperCase();
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="error">Error loading ticket status.</p>';
  }
}

/** Init */
document.addEventListener("DOMContentLoaded", loadTicketStatus);