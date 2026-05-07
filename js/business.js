/**
 * @file business.js
 * @description Handles the business page testimonial carousel.
 */

document.addEventListener("DOMContentLoaded", () => {

    /** Carousel Setup */
    const cards = Array.from(document.getElementsByClassName('testimonial-card'));
    if (cards.length === 0) return;

    // Tracks the index of the currently active card
    let current = 0;

    /** Update Carousel */
    // Clears all position classes from every card, then assigns "prev", "active",
    // and "next" to the three cards surrounding the current index.
    // Wraps around using modulo so the carousel loops infinitely.
    function updateCarousel() {
        const prev = (current - 1 + cards.length) % cards.length;
        const next = (current + 1) % cards.length;

        cards.forEach(card => card.classList.remove('active', 'prev', 'next'));
        cards[prev].classList.add('prev');
        cards[current].classList.add('active');
        cards[next].classList.add('next');
    }

    // Set the initial carousel state on page load
    updateCarousel();

    // Auto-advance the carousel every 3 seconds
    setInterval(() => {
        current = (current + 1) % cards.length;
        updateCarousel();
    }, 3000);

});