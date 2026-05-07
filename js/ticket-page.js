/**
 * @file ticket-page.js
 * @description Manages displaying tickets assigned to the current user on the ticket page.
 */

import { PriorityFilter, DateFilter } from '/js/tag-filtering.js';

/** State */
let assignedTickets = [];          // Active tickets assigned to the current user
let closedTickets = [];            // Closed tickets assigned to the current user
let currentSort = 'priority';      // 'priority', 'oldest', 'newest'
let filterMode = 'none';           // 'none', 'month-year', 'year', 'date-range'
let selectedYear = null;
let selectedMonth = null;
let dateRangeStart = null;
let dateRangeEnd = null;
let selectedStatuses = new Set();
let selectedPriorities = new Set();
let selectedDepartments = new Set();
let renderTimeout = null;          // Debounce timer for filter re-renders

/** Fetch Assigned Tickets */
// Fetches all tickets from the server and filters down to those assigned to
// the current user that are not yet closed
async function fetchAssignedTickets() {
  try {
    const userData = JSON.parse(localStorage.getItem("userData"));
    if (!userData) {
      console.error("No user data found");
      return;
    }

    const response = await fetch("/getTickets");
    if (response.ok) {
      const allTickets = await response.json();
      // Keep only active tickets assigned to the current user
      assignedTickets = allTickets.filter(
        (ticket) => ticket.assignedTo === userData.username && ticket.status !== 'closed'
      );
      renderAssignedTickets(assignedTickets);
    }
  } catch (error) {
    console.error("Error fetching assigned tickets:", error);
  }
}

/** Fetch Closed Tickets */
// Fetches all tickets from the server and filters down to those assigned to
// the current user that have been closed, then renders the history section
async function fetchClosedTickets() {
  try {
    const userData = JSON.parse(localStorage.getItem("userData"));
    if (!userData) {
      console.error("No user data found");
      return;
    }

    const response = await fetch("/getTickets");
    if (response.ok) {
      const allTickets = await response.json();
      // Keep only closed tickets assigned to the current user
      closedTickets = allTickets.filter(
        ticket => ticket.assignedTo === userData.username && ticket.status === 'closed'
      );
      renderClosedTickets();
    }
  } catch (error) {
    console.error("Error fetching closed tickets:", error);
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

/** Render Assigned Tickets */
// Builds the full ticket section structure (toolbar, filter panel, ticket list)
// on the first call, then delegates to renderFilterControls and renderTicketCards.
// Subsequent calls skip rebuilding the shell and only update content inside.
function renderAssignedTickets(tickets) {
  const container = document.getElementById("ticket-container");

  // Only inject the outer shell if it hasn't been built yet
  if (!document.getElementById("tickets-list")) {
    container.innerHTML = `
      <h1 class="ticket-title">My Assigned Tickets</h1>
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

/** Render Ticket Cards */
// Applies filters and sort to the ticket array and injects the resulting
// ticket card HTML into #tickets-list. Does not touch the filter controls.
function renderTicketCards(tickets) {
  const ticketsContainer = document.getElementById("tickets-list");

  let filteredTickets = applyFilters(tickets);

  if (filteredTickets.length === 0) {
    ticketsContainer.innerHTML = `<p class="no-tickets">No Assigned Tickets</p>`;
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
          <p>Created At: ${new Date(ticket.createdAt).toLocaleString()}</p>
      </div>
      <div class="ticket-actions">
          <button class="close-ticket-btn status-btn" data-id="${ticket.id}">Close Ticket</button>
          <button class="status-btn" data-id="${ticket.id}">Status</button>
      </div>
  </div>
  `,
    )
    .join("");
}

/** Close Ticket */
// Sends a PUT request to mark the ticket as closed on the server.
// On success, removes it from the local assignedTickets array and refreshes
// the closed tickets section to include the newly closed ticket.
async function closeTicket(ticketId) {
  console.log('closeTicket called with ticketId:', ticketId);
  try {
    console.log('Making fetch request to:', `/closeTicket/${ticketId}`);
    const response = await fetch(`/closeTicket/${ticketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (response.ok) {
      // Remove from local active array and re-render assigned tickets
      assignedTickets = assignedTickets.filter(ticket => ticket.id !== ticketId);
      renderAssignedTickets(assignedTickets);
      // Re-fetch closed tickets from server to include the one just closed
      fetchClosedTickets();
    } else {
      console.error('Failed to close ticket');
      alert('Failed to close ticket. Please try again.');
    }
  } catch (error) {
    console.error('Error closing ticket:', error);
    alert('Error closing ticket. Please try again.');
  }
}

/** Render Closed Tickets */
// Builds or updates the #closed-tickets-section appended below the assigned tickets.
// Creates the section element on first call; updates it in place on subsequent calls.
// Closed tickets are sorted newest first by createdAt date.
function renderClosedTickets() {
  const container = document.getElementById("ticket-container");

  // Create the closed tickets section if it doesn't exist yet
  let closedSection = document.getElementById("closed-tickets-section");
  if (!closedSection) {
    closedSection = document.createElement("div");
    closedSection.id = "closed-tickets-section";
    closedSection.className = "closed-tickets-section";
    container.appendChild(closedSection);
  }

  if (closedTickets.length === 0) {
    closedSection.innerHTML = `
      <h2>Closed Tickets History</h2>
      <p class="no-tickets">No closed tickets yet.</p>
    `;
    return;
  }

  closedSection.innerHTML = `
    <h2>Closed Tickets History</h2>
    <div class="closed-tickets-list">
      ${closedTickets
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(
          (ticket) => `
      <div class="closed-ticket-card">
        <div class="closed-ticket-header">
          <h3>#${ticket.id} - ${ticket.title}</h3>
          <span class="closed-date">Closed: ${new Date(ticket.createdAt).toLocaleString()}</span>
        </div>
        <div class="closed-ticket-details">
          <p><strong>Description:</strong> ${ticket.description}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><strong>Department:</strong> ${ticket.department}</p>
          <p><strong>Created By:</strong> ${ticket.createdBy}</p>
        </div>
      </div>
      `,
        )
        .join("")}
    </div>
  `;
}

/** Debounced Render */
// Delays renderTicketCards by 300ms to avoid thrashing the DOM while
// the user is still interacting with filter controls
function debouncedRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => renderTicketCards(assignedTickets), 300);
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
      renderTicketCards(assignedTickets);
      return;
    }

    // Year select: reset month and refresh both filter controls and ticket cards
    if (event.target.id === 'year-select') {
      selectedYear = event.target.value ? parseInt(event.target.value) : null;
      selectedMonth = null; // Reset month when year changes
      renderFilterControls(assignedTickets);
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
      }
      return;
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
        renderTicketCards(assignedTickets);
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
        renderFilterControls(assignedTickets);
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
      renderAssignedTickets(assignedTickets);
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

    // Close ticket button: prompt for confirmation before closing
    if (event.target.classList.contains("close-ticket-btn")) {
      const ticketId = parseInt(event.target.getAttribute("data-id"));
      if (confirm("Are you sure you want to close this ticket?")) {
        closeTicket(ticketId);
      }
      return;
    }

    // Status button: navigate to the status page for this ticket
    if (event.target.classList.contains("status-btn")) {
      const ticketId = parseInt(event.target.getAttribute("data-id"));
      window.location.href = `/pages/status-page.html?ticketId=${ticketId}`;
      return;
    }
  });

/** Init */
// Fetch both assigned and closed tickets on page load
document.addEventListener("DOMContentLoaded", () => {
  fetchAssignedTickets().catch((error) => {
    console.error("Failed to initialize assigned tickets:", error);
  });
  fetchClosedTickets().catch((error) => {
    console.error("Failed to initialize closed tickets:", error);
  });
});

// Poll the server every 2 seconds to keep both ticket lists in sync
setInterval(() => {
  fetchAssignedTickets();
  fetchClosedTickets();
}, 2000);