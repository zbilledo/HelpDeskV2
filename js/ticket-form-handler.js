export function initTicketForm() {

    const createTicketBtn = document.getElementById("create-ticket-btn");
    const ticketModal = document.getElementById("ticket-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const ticketForm = document.getElementById("ticket-form");

    if (createTicketBtn && ticketModal) {
        createTicketBtn.addEventListener("click", () => {
            ticketModal.classList.remove("hidden");
        });

        closeModalBtn.addEventListener("click", () => {
            ticketModal.classList.add("hidden");
        });

        // Close when clicking outside the modal box
        // ticketModal.addEventListener("click", (event) => {
        //     if (event.target === ticketModal) {
        //         ticketModal.classList.add("hidden");
        //     }
        // });

        ticketForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const ticketTitle = document.querySelector("#ticket-title").value;
            const ticketDescription = document.querySelector("#ticket-description").value;
            const ticketPriority = document.querySelector("#ticket-priority").value;

            const ticketEvent = new CustomEvent("ticketCreated", {
                detail: {
                    title: ticketTitle,
                    description: ticketDescription,
                    priority: ticketPriority,
                    status: "pending"
                }
            });
            document.dispatchEvent(ticketEvent);


            ticketModal.classList.add("hidden");
            ticketForm.reset();
        });
    }
}