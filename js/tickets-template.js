/**
 * @file tickets-template.js
 * @description Manages fetching, rendering, and deleting support tickets on the dashboard.
 */

import { PriorityFilter, DateFilter } from '/js/tag-filtering.js';

/** State */
let tickets = [];
let currentSort = 'priority'; // 'priority', 'oldest', 'newest'
let filterMode = 'none';      // 'none', 'month-year', 'year', 'date-range'
let selectedYear = null;
let selectedMonth = null;
let dateRangeStart = null;
let dateRangeEnd = null;
let selectedStatuses = new Set();
let selectedPriorities = new Set();
let selectedDepartments = new Set();
let renderTimeout = null; // Debounce timer for filter re-renders
let users = [];           // Available users for ticket assignment

/** Fetch Tickets */
// Fetches all tickets from the server, filters out closed ones, and triggers a render
async function fetchTickets() {
  try {
    const response = await fetch("/getTickets");
    if (response.ok) {
      const allTickets = await response.json();
      // Exclude closed tickets from the dashboard view
      tickets = allTickets.filter(ticket => ticket.status !== 'closed');
      if (document.getElementById("tickets-list")) {
        renderTicketCards(tickets);
      } else {
        renderTickets(tickets);
      }
    }
  } catch (error) {
    console.error("Error fetching tickets:", error);
  }
}

/** Fetch Users */
// Fetches all users from the server and stores them for use in the assignment modal
async function fetchUsers() {
  try {
    const response = await fetch("/getUsers");
    if (response.ok) {
      users = await response.json();
    }
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

/** Available Filter Options */
// Each function derives a unique sorted list of values from the current ticket set
// so filter checkboxes always reflect only what's present in the data

function getAvailableStatuses(tickets) {
  return [...new Set(tickets.map((ticket) => ticket.status || 'pending'))].sort();
}

function getAvailablePriorities(tickets) {
  return [...new Set(tickets.map((ticket) => ticket.priority || 'low'))].sort();
}

function getAvailableDepartments(tickets) {
  return [...new Set(tickets.map((ticket) => ticket.department || 'General'))].sort();
}

/** Apply Filters */
// Applies the active date filter mode and any checked status/priority/department
// filters to the ticket array, returning only matching tickets
function applyFilters(tickets) {
  let filtered = tickets;
  const dateFilter = new DateFilter();
  dateFilter.setItems(tickets);

  if (filterMode === 'month-year' && selectedMonth && selectedYear) {
    filtered = dateFilter.filterByMonthYear(selectedMonth, selectedYear);
  } else if (filterMode === 'year' && selectedYear) {
    filtered = dateFilter.filterByYear(selectedYear);
  } else if (filterMode === 'date-range' && dateRangeStart && dateRangeEnd) {
    filtered = dateFilter.filterByDateRange(dateRangeStart, dateRangeEnd);
  }

  if (selectedStatuses.size > 0) {
    filtered = filtered.filter((ticket) => selectedStatuses.has(ticket.status));
  }

  if (selectedPriorities.size > 0) {
    filtered = filtered.filter((ticket) => selectedPriorities.has(ticket.priority));
  }

  if (selectedDepartments.size > 0) {
    filtered = filtered.filter((ticket) => selectedDepartments.has(ticket.department));
  }

  return filtered;
}

/** Sort Tickets */
// Sorts a copy of the ticket array by the current sort mode.
// Uses PriorityFilter for priority sorting, falls back to ID order for date sorts.
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

/** Render Filter Controls */
// Builds and injects the filter panel HTML into #filter-popup-content.
// Called separately from renderTicketCards so filters can update without
// re-rendering the entire ticket list.
function renderFilterControls(tickets) {
  const filtersContainer = document.getElementById("filter-popup-content");
  if (!filtersContainer) return;

  const dateFilter = new DateFilter();
  dateFilter.setItems(tickets);
  const availableYears = dateFilter.getAvailableYears();

  // Only populate months if a year has been selected
  let availableMonths = [];
  if (selectedYear) {
    availableMonths = dateFilter.getAvailableMonths(selectedYear);
  }

  const availableStatuses = getAvailableStatuses(tickets);
  const availablePriorities = getAvailablePriorities(tickets);

  let filterHTML = `
    <div class="filter-controls">
      <div class="filter-section">
        <div class="filter-section-title">Filters</div>
        <div class="filter-category">
          <div class="filter-category-title">Date</div>
          <div class="filter-item-list">
            <button type="button" class="filter-item-btn ${filterMode === 'year' ? 'active' : ''}" data-filter="year">Year</button>
            <button type="button" class="filter-item-btn ${filterMode === 'month-year' ? 'active' : ''}" data-filter="month-year">Month & Year</button>
            <button type="button" class="filter-item-btn ${filterMode === 'date-range' ? 'active' : ''}" data-filter="date-range">Date Range</button>
          </div>
          <div class="date-filter-fields">
            ${filterMode === 'none' ? `<div class="filter-help">Select a date filter to configure it.</div>` : ''}
            ${filterMode === 'year' ? `
              <div class="filter-group">
                <label for="year-select">Year:</label>
                <select id="year-select" class="filter-select">
                  <option value="">Select Year</option>
                  ${availableYears.map(year => `<option value="${year}" ${selectedYear === year ? 'selected' : ''}>${year}</option>`).join('')}
                </select>
              </div>` : ''}
            ${filterMode === 'month-year' ? `
              <div class="filter-group">
                <label for="year-select">Year:</label>
                <select id="year-select" class="filter-select">
                  <option value="">Select Year</option>
                  ${availableYears.map(year => `<option value="${year}" ${selectedYear === year ? 'selected' : ''}>${year}</option>`).join('')}
                </select>
              </div>
              <div class="filter-group">
                <label for="month-select">Month:</label>
                <select id="month-select" class="filter-select" ${availableMonths.length === 0 ? 'disabled' : ''}>
                  <option value="">Select Month</option>
                  ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => {
                    const monthNum = index + 1;
                    if (availableMonths.includes(monthNum) || selectedMonth === monthNum) {
                      return `<option value="${monthNum}" ${selectedMonth === monthNum ? 'selected' : ''}>${month}</option>`;
                    }
                    return '';
                  }).join('')}
                </select>
              </div>` : ''}
            ${filterMode === 'date-range' ? `
              <div class="filter-group">
                <label for="start-date">Start Date:</label>
                <input type="date" id="start-date" class="filter-input" value="${dateRangeStart || ''}">
              </div>
              <div class="filter-group">
                <label for="end-date">End Date:</label>
                <input type="date" id="end-date" class="filter-input" value="${dateRangeEnd || ''}">
              </div>` : ''}
          </div>
        </div>
        <div class="filter-category">
          <div class="filter-category-title">Status</div>
          <div class="filter-item-list filter-checkbox-list">
            ${availableStatuses.map((status) => `
              <label class="filter-checkbox-label">
                <input type="checkbox" class="filter-checkbox" data-filter-type="status" value="${status}" ${selectedStatuses.has(status) ? 'checked' : ''}>
                ${status}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="filter-category">
          <div class="filter-category-title">Priority</div>
          <div class="filter-item-list filter-checkbox-list">
            ${availablePriorities.map((priority) => `
              <label class="filter-checkbox-label">
                <input type="checkbox" class="filter-checkbox" data-filter-type="priority" value="${priority}" ${selectedPriorities.has(priority) ? 'checked' : ''}>
                ${priority}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="filter-category">
          <div class="filter-category-title">Department</div>
          <div class="filter-item-list filter-checkbox-list">
            ${getAvailableDepartments(tickets).map((department) => `
              <label class="filter-checkbox-label">
                <input type="checkbox" class="filter-checkbox" data-filter-type="department" value="${department}" ${selectedDepartments.has(department) ? 'checked' : ''}>
                ${department}
              </label>
            `).join('')}
          </div>
        </div>
      </div>`;

  // Only show Apply/Clear buttons if a filter mode or checkbox filter is active
  const hasStatusOrPriorityOrDepartment = selectedStatuses.size > 0 || selectedPriorities.size > 0 || selectedDepartments.size > 0;
  const showActionButtons = filterMode !== 'none' || hasStatusOrPriorityOrDepartment;

  if (showActionButtons) {
    filterHTML += `
      <div class="filter-action-row">
        <button id="apply-filters-btn" class="apply-filter-btn">Apply</button>
        <button id="clear-filters-btn" class="clear-filter-btn">Clear Filters</button>
      </div>`;
  }

  filterHTML += `</div>`;
  filtersContainer.innerHTML = filterHTML;
}

/** Render Ticket Cards */
// Applies filters and sort to the ticket array and injects the resulting
// ticket card HTML into #tickets-list. Does not touch the filter controls.
function renderTicketCards(tickets) {
  const ticketsContainer = document.getElementById("tickets-list");

  let filteredTickets = applyFilters(tickets);

  if (filteredTickets.length === 0) {
    ticketsContainer.innerHTML = `<p class="no-tickets">No Pending Tickets</p>`;
    return;
  }

  const sortedTickets = sortTickets(filteredTickets);

  ticketsContainer.innerHTML = sortedTickets
    .map(
      (ticket) => `
  <div class="ticket-card" data-priority="${ticket.priority}">
      <div>
          <h3>#${ticket.id} - ${ticket.title}</h3>
          <p>Description: ${ticket.description}</p>
          <p data-priority="${ticket.priority}">Priority: ${ticket.priority}</p>
          <p>Department: ${ticket.department}</p>
          <p>Status: ${ticket.status}</p>
          <p><strong>Created By: ${ticket.createdBy}</strong></p>
          <p><strong>Assigned To: ${ticket.assignedTo || 'Unassigned'}</strong></p>
          <p>Created At: ${new Date(ticket.createdAt).toLocaleString()}</p>
      </div>
      <div class="ticket-actions">
          <button class="assign-btn" data-id="${ticket.id}">Assign</button>
          <button class="status-btn" data-id="${ticket.id}">Status</button>
          <button class="delete-ticket-btn" data-id="${ticket.id}" id="delete-ticket-button">Delete</button>
      </div>
  </div>
  `,
    )
    .join("");
}

/** Render Tickets */
// Builds the full ticket section structure (toolbar, filter panel, ticket list)
// on the first call, then delegates to renderFilterControls and renderTicketCards.
// Subsequent calls skip rebuilding the shell and only update the content inside.
function renderTickets(tickets) {
  const container = document.getElementById("ticket-container");

  // Only inject the outer shell if it hasn't been built yet
  if (!document.getElementById("tickets-list")) {
    container.innerHTML = `
      <h1 class="ticket-title">Tickets</h1>
      <div class="ticket-toolbar">
        <div class="sort-dropdown">
          <label for="sort-select">Sort by:</label>
          <select id="sort-select" class="sort-select">
            <option value="priority" ${currentSort === 'priority' ? 'selected' : ''}>Priority</option>
            <option value="oldest" ${currentSort === 'oldest' ? 'selected' : ''}>Oldest First</option>
            <option value="newest" ${currentSort === 'newest' ? 'selected' : ''}>Newest First</option>
          </select>
        </div>
        <button id="open-filter-btn" class="filter-toggle-btn">Filter</button>
      </div>
      <div id="filter-popup" class="filter-popup hidden">
        <div class="filter-popup-backdrop" id="filter-popup-backdrop"></div>
        <div class="filter-popup-panel">
          <div class="filter-popup-header">
            <h2>Ticket Filters</h2>
            <button id="close-filter-btn" class="close-filter-btn" aria-label="Close">×</button>
          </div>
          <div id="filter-popup-content"></div>
        </div>
      </div>
      <div id="tickets-list"></div>
    `;
  }

  renderFilterControls(tickets);
  renderTicketCards(tickets);
}

/** Assignment Modal */
// Builds and injects a modal for assigning a ticket to a user.
// On submission, PUTs the assignment to the server and updates the local
// ticket array so the card re-renders without a full re-fetch.
function showAssignmentModal(ticketId) {
  const modalHTML = `
    <div id="assignment-modal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
      <div class="modal" style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
        <h3>Assign Ticket #${ticketId}</h3>
        <form id="assignment-form">
          <label for="assign-user-select">Assign to:</label>
          <select id="assign-user-select" required>
            <option value="">Select User</option>
            ${users.map(user => `<option value="${user.username}">${user.username}</option>`).join('')}
          </select>
          <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button type="submit" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Assign</button>
            <button type="button" id="cancel-assignment" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  document.getElementById('assignment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const assignedTo = document.getElementById('assign-user-select').value;

    try {
      const response = await fetch(`/updateTicket/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo })
      });

      if (response.ok) {
        // Update the local ticket array so the card reflects the new assignee
        // without needing a full re-fetch
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
          ticket.assignedTo = assignedTo;
          renderTicketCards(tickets);
        }
      } else {
        console.error('Failed to assign ticket');
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
    }

    document.getElementById('assignment-modal').remove();
  });

  // Cancel button removes the modal without making any changes
  document.getElementById('cancel-assignment').addEventListener('click', () => {
    document.getElementById('assignment-modal').remove();
  });
}

/** Debounced Render */
// Delays renderTicketCards by 300ms to avoid thrashing the DOM while
// the user is still interacting with filter controls
function debouncedRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => renderTicketCards(tickets), 300);
}

/** Change Event Delegation */
// Handles all change events within #ticket-container via a single delegated listener.
// Routes to the appropriate state update and re-render based on the changed element.
document
  .getElementById("ticket-container")
  .addEventListener("change", (event) => {

    // Sort dropdown: immediate re-render
    if (event.target.id === 'sort-select') {
      currentSort = event.target.value;
      renderTicketCards(tickets);
      return;
    }

    // Year select: reset month and refresh both filter controls and ticket cards
    if (event.target.id === 'year-select') {
      selectedYear = event.target.value ? parseInt(event.target.value) : null;
      selectedMonth = null; // Reset month when year changes
      renderFilterControls(tickets);
      debouncedRender();
      return;
    }

    // Month select: debounced re-render
    if (event.target.id === 'month-select') {
      selectedMonth = event.target.value ? parseInt(event.target.value) : null;
      debouncedRender();
      return;
    }

    // Date range inputs: update state only; render is triggered by the Apply button
    if (event.target.id === 'start-date') {
      dateRangeStart = event.target.value;
      return;
    }
    if (event.target.id === 'end-date') {
      dateRangeEnd = event.target.value;
      return;
    }

    // Status/priority/department checkboxes: add or remove value from the relevant Set
    if (event.target.classList.contains('filter-checkbox')) {
      const type = event.target.dataset.filterType;
      const value = event.target.value;
      if (type === 'status') {
        if (event.target.checked) selectedStatuses.add(value);
        else selectedStatuses.delete(value);
      }
      if (type === 'priority') {
        if (event.target.checked) selectedPriorities.add(value);
        else selectedPriorities.delete(value);
      }
      if (type === 'department') {
        if (event.target.checked) selectedDepartments.add(value);
        else selectedDepartments.delete(value);
        return;
      }
    }
  });

/** Click Event Delegation */
// Handles all click events within #ticket-container via a single delegated listener.
// Routes to the appropriate action based on the clicked element's ID or class.
document
  .getElementById("ticket-container")
  .addEventListener("click", async (event) => {

    // Apply filters button: validates required fields then applies and closes the panel
    if (event.target.id === 'apply-filters-btn') {
      let valid = true;
      if (filterMode === 'year') {
        valid = selectedYear !== null;
        if (!valid) alert('Please select a year.');
      } else if (filterMode === 'month-year') {
        valid = selectedYear !== null && selectedMonth !== null;
        if (!selectedYear) alert('Please select a year.');
        else if (!selectedMonth) alert('Please select a month.');
      } else if (filterMode === 'date-range') {
        valid = Boolean(dateRangeStart && dateRangeEnd);
        if (!dateRangeStart || !dateRangeEnd) alert('Please select both start and end dates.');
      }

      if (valid) {
        renderTicketCards(tickets);
        const popup = document.getElementById('filter-popup');
        if (popup) popup.classList.add('hidden');
      }
      return;
    }

    // Filter mode button: switch the active date filter type and reset all date state
    if (event.target.classList.contains('filter-item-btn')) {
      const selectedFilter = event.target.dataset.filter;
      if (selectedFilter && selectedFilter !== filterMode) {
        filterMode = selectedFilter;
        selectedYear = null;
        selectedMonth = null;
        dateRangeStart = null;
        dateRangeEnd = null;
        renderFilterControls(tickets);
      }
      return;
    }

    // Clear filters: reset all filter state and do a full render to rebuild controls
    if (event.target.id === 'clear-filters-btn') {
      filterMode = 'none';
      selectedYear = null;
      selectedMonth = null;
      dateRangeStart = null;
      dateRangeEnd = null;
      selectedStatuses.clear();
      selectedPriorities.clear();
      selectedDepartments.clear();
      renderTickets(tickets);
      return;
    }

    // Open filter panel
    if (event.target.id === 'open-filter-btn') {
      const popup = document.getElementById('filter-popup');
      if (popup) popup.classList.remove('hidden');
      return;
    }

    // Close filter panel via close button or backdrop click
    if (event.target.id === 'close-filter-btn' || event.target.id === 'filter-popup-backdrop') {
      const popup = document.getElementById('filter-popup');
      if (popup) popup.classList.add('hidden');
      return;
    }

    // Assign button: open the assignment modal for this ticket
    if (event.target.classList.contains("assign-btn")) {
      const ticketId = parseInt(event.target.getAttribute("data-id"));
      showAssignmentModal(ticketId);
      return;
    }

    // Status button: navigate to the status page for this ticket
    if (event.target.classList.contains("status-btn")) {
      const ticketId = parseInt(event.target.getAttribute("data-id"));
      window.location.href = `/pages/status-page.html?ticketId=${ticketId}`;
      return;
    }

    // Delete button: optimistically remove from local array, then send DELETE to server
    if (event.target.classList.contains("delete-ticket-btn")) {
      const ticketId = parseInt(event.target.getAttribute("data-id"));

      // Remove immediately from local state so the UI feels instant
      tickets = tickets.filter((t) => t.id !== ticketId);

      try {
        const response = await fetch(`/deleteTicket/${ticketId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        const result = await response.json();
        console.log(result.message);
      } catch (error) {
        console.error("Error deleting ticket:", error);
      }

      renderTicketCards(tickets);
    }
  });

/** Ticket Created Event */
// Listens for the custom 'ticketCreated' event dispatched by the ticket form handler.
// Pushes the new ticket into the local array and triggers a full re-render.
document.addEventListener("ticketCreated", (event) => {
  const newTicket = event.detail;
  if (newTicket) {
    tickets.push(newTicket);
    renderTickets(tickets);
  }
});

/** Init */
document.addEventListener("DOMContentLoaded", async () => {
  await fetchUsers();
  fetchTickets().catch((error) => {
    console.error("Failed to initialize tickets:", error);
  });
});

// Trigger an initial render with an empty array to build the page shell before data arrives
renderTickets(tickets);

// Poll the server every 2 seconds to keep the ticket list in sync
setInterval(fetchTickets, 2000);