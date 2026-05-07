/** Priority Filter */
// Provides priority-based filtering and sorting for ticket arrays.
// Priority order is fixed as high > medium > low.
class PriorityFilter {
    constructor() {
        this.items = [];
        this.priorities = [];
        // Defines the canonical priority order used for sorting and range filtering
        this.priorityOrder = ['high', 'medium', 'low'];
    }

    /** Set Items */
    // Stores the item array and derives the unique set of priorities present in the data
    setItems(items) {
        this.items = items;
        this.priorities = [...new Set(items.map(item => item.priority))];
    }

    /** Filter By Priority */
    // Returns items matching a single priority level.
    // Returns an empty array and logs an error if the priority value is not recognized.
    filterByPriority(priority) {
        if (!this.priorities.includes(priority)) {
            console.error('Invalid priority level');
            return [];
        }
        return this.items.filter(item => item.priority === priority);
    }

    /** Filter By Priorities */
    // Returns items matching any of the priorities in the provided array
    filterByPriorities(priorityArray) {
        return this.items.filter(item => priorityArray.includes(item.priority));
    }

    /** Sort By Priority */
    // Sorts items by priority order (high → low by default, low → high if descending=false).
    // Items with the same priority are then sorted by ID to ensure a stable order.
    sortByPriority(descending = true) {
        const order = descending ? this.priorityOrder : [...this.priorityOrder].reverse();

        return [...this.items].sort((a, b) => {
            const aPriorityIndex = order.indexOf(a.priority);
            const bPriorityIndex = order.indexOf(b.priority);

            if (aPriorityIndex !== bPriorityIndex) {
                return aPriorityIndex - bPriorityIndex;
            }

            // Tiebreak by ID for a stable sort
            return a.id - b.id;
        });
    }

    /** Filter Above Priority */
    // Returns items at or below the given minimum priority in the priority order.
    // e.g. filterAbovePriority('medium') returns medium and low items.
    filterAbovePriority(minPriority) {
        const minIndex = this.priorityOrder.indexOf(minPriority);
        return this.items.filter(item =>
            this.priorityOrder.indexOf(item.priority) >= minIndex
        );
    }
}

/** Date Filter */
// Provides date-based filtering for ticket arrays using the createdAt field.
class DateFilter {
    constructor() {
        this.items = [];
    }

    /** Set Items */
    setItems(items) {
        this.items = items;
    }

    /** Filter By Month Year */
    // Returns items whose createdAt falls in the given month (1-12) and year.
    // month - 1 corrects for JavaScript's zero-indexed Date.getMonth().
    filterByMonthYear(month, year) {
        return this.items.filter(item => {
            const date = new Date(item.createdAt);
            return date.getMonth() === month - 1 && date.getFullYear() === year;
        });
    }

    /** Filter By Year */
    // Returns items whose createdAt falls in the given year
    filterByYear(year) {
        return this.items.filter(item => {
            const date = new Date(item.createdAt);
            return date.getFullYear() === year;
        });
    }

    /** Filter By Date Range */
    // Returns items whose createdAt falls within the range (inclusive of both endpoints).
    // Parses YYYY-MM-DD strings from date inputs into UTC Date objects to avoid
    // timezone offset issues that arise when using new Date('YYYY-MM-DD') directly.
    // End date is set to 23:59:59.999 UTC so the full final day is included.
    filterByDateRange(startDate, endDate) {
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

        const start = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
        const end = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

        return this.items.filter(item => {
            const date = new Date(item.createdAt);
            return date >= start && date <= end;
        });
    }

    /** Filter By Month */
    // Returns items whose createdAt falls in the given month (1-12) across all years
    filterByMonth(month) {
        return this.items.filter(item => {
            const date = new Date(item.createdAt);
            return date.getMonth() === month - 1;
        });
    }

    /** Get Available Years */
    // Derives a unique sorted list of years present in the item set (newest first)
    getAvailableYears() {
        const years = [...new Set(this.items.map(item => new Date(item.createdAt).getFullYear()))];
        return years.sort((a, b) => b - a);
    }

    /** Get Available Months */
    // Derives a unique sorted list of months (1-12) that have tickets in the given year.
    // Used to populate the month dropdown after a year is selected.
    getAvailableMonths(year) {
        const months = [...new Set(
            this.items
                .filter(item => new Date(item.createdAt).getFullYear() === year)
                .map(item => new Date(item.createdAt).getMonth() + 1)
        )];
        return months.sort((a, b) => a - b);
    }
}

/** Department Filter */
// Provides department-based filtering for ticket arrays.
class DepartmentFilter {
    constructor() {
        this.items = [];
        this.departments = [];
    }

    /** Set Items */
    // Stores the item array and derives the unique set of departments present in the data
    setItems(items) {
        this.items = items;
        this.departments = [...new Set(items.map(item => item.department))];
    }

    /** Filter By Department */
    // Returns items matching the given department.
    // Returns an empty array and logs an error if the department is not recognized.
    filterByDepartment(department) {
        if (!this.departments.includes(department)) {
            console.error('Invalid department');
            return [];
        }
        return this.items.filter(item => item.department === department);
    }
}

export { PriorityFilter, DateFilter, DepartmentFilter };