// Tag Filtering System - Priority-based filtering

class PriorityFilter {
    constructor() {
        this.items = [];
        this.priorities = [];
        // high > medium > low
        this.priorityOrder = ['high', 'medium', 'low'];
    }

    setItems(items) {
        this.items = items;
        this.priorities = [...new Set(items.map(item => item.priority))];
    }

    filterByPriority(priority) {
        if (!this.priorities.includes(priority)) {
            console.error('Invalid priority level');
            return [];
        }
        return this.items.filter(item => item.priority === priority);
    }

    filterByPriorities(priorityArray) {
        return this.items.filter(item => priorityArray.includes(item.priority));
    }

    sortByPriority(descending = true) {
        const order = descending ? this.priorityOrder : [...this.priorityOrder].reverse();
        
        return [...this.items].sort((a, b) => {
            const aPriorityIndex = order.indexOf(a.priority);
            const bPriorityIndex = order.indexOf(b.priority);
            
            if (aPriorityIndex !== bPriorityIndex) {
                return aPriorityIndex - bPriorityIndex;
            }
            
            return a.id - b.id;
        });
    }

    filterAbovePriority(minPriority) {
        const minIndex = this.priorityOrder.indexOf(minPriority);
        return this.items.filter(item => 
            this.priorityOrder.indexOf(item.priority) >= minIndex
        );
    }
}

export default PriorityFilter;