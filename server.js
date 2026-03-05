import express from "express";
import morgan from "morgan";

const app = express();
const PORT = 8000;
const adminUsername = "admin";
const adminPassword = "admin";
const userUsername = "user";
const userPassword = "user";
let tickets = [];

app.use(express.json());

// HTTP request logging
app.use(morgan("dev"));

app.use(express.static("./", { index: false }));

app.get("/", (req, res) => {
    res.sendFile("pages/login-page.html", { root: "./" });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on your IP address or localhost:${PORT}`);
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (username === adminUsername && password === adminPassword) {
        res.json({ success: true, message: "Logged in as admin" });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

app.post("/ticket", (req, res) => {
    console.log("Server-Side ticket data:", req.body);

    const { ticketTitle, ticketDescription, ticketPriority } = req.body;

    if (ticketTitle && ticketDescription && ticketPriority) {

        const newTicket = {
            id: Date.now(),
            title: ticketTitle,
            description: ticketDescription,
            priority: ticketPriority,
            status: "pending"
        };

        tickets.push(newTicket);
        console.log("ticket saved. Total tickets:", tickets.length);

        res.json({ success: true, message: "Ticket created successfully", ticket: newTicket });

    } else {

        res.status(400).json({ success: false, message: "Missing required fields" });

    }
});

app.get("/tickets", (req, res) => {
    res.json(tickets);
});
