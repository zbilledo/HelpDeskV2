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

        ticketForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const ticketTitle = document.querySelector("#ticket-title").value;
            const ticketDescription = document.querySelector("#ticket-description").value;
            const ticketPriority = document.querySelector("#ticket-priority").value;

            try {
                const response = await fetch("/ticket", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ ticketTitle, ticketDescription, ticketPriority })
                });

                const data = await response.json();

                if (response.ok) {
                    console.log("Server says:", data.message);
                    const ticketEvent = new CustomEvent("ticketCreated", {
                        detail: data.ticket
                    });
                    document.dispatchEvent(ticketEvent);
                } else {
                    console.error("Failed to create ticket:", data.message);
                }
            } catch (error) {
                console.error("Error creating ticket:", error);
            }

            ticketModal.classList.add("hidden");
            ticketForm.reset();
        });
    }
}