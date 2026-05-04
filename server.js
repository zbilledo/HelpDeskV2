/**
 * @file server.js
 * @description Main entry point for the HelpDeskV2 Express server.
 * Handles user authentication, ticket management, and serves static files.
 */

import express from "express";
import morgan from "morgan";
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

const app = express();
const PORT = 8000;

const SUPABASE_URL = "https://adnjlrxbqgerjlhgirlq.supabase.co";
const SUPABASE_KEY = "sb_publishable_sNNSlaz28kpULCpWkBCM3Q_OY6FN8cv";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize databases
// tickets.db stores support ticket information
// users.db stores user credentials and roles
const ticketsDB = new Database("tickets.db");
// const userDB = new Database("users.db");

/**
 * Initialize the 'tickets' table if it doesn't exist.
 */
ticketsDB.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL,
        department TEXT NOT NULL DEFAULT 'General',
        status TEXT NOT NULL DEFAULT 'pending',
        createdBy TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        assignedTo TEXT
    )
`);

// Add createdAt column if it doesn't exist (for existing databases)
try {
  ticketsDB.exec(`ALTER TABLE tickets ADD COLUMN createdAt TEXT`);
} catch (error) {
  // Column might already exist, ignore error
}
try {
  ticketsDB.exec(
    `ALTER TABLE tickets ADD COLUMN department TEXT NOT NULL DEFAULT 'General'`,
  );
} catch (error) {
  // Column might already exist, ignore error
}
try {
  ticketsDB.exec(`ALTER TABLE tickets ADD COLUMN assignedTo TEXT`);
} catch (error) {
  // Column might already exist, ignore error
}

/**
 * Initialize the 'users' table if it doesn't exist.
 */
// userDB.exec(`
//     CREATE TABLE IF NOT EXISTS users (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         username TEXT NOT NULL UNIQUE,
//         password TEXT NOT NULL,
//         role TEXT NOT NULL DEFAULT 'user'
//     )
// `);

// Middleware configuration
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// HTTP request logging for development
app.use(morgan("dev"));

// Serve static files from the project root
app.use(express.static("./", { index: false }));

/**
 * Default route: Serves the login page.
 */
app.get("/", (req, res) => {
  res.sendFile("pages/login-page.html", { root: "./" });
});

/**
 * Database Seeding: Creates default 'admin' and 'user' accounts if the database is empty.
 */
// const seedUsers = userDB.prepare("SELECT COUNT(*) AS count FROM users").get();
// if (seedUsers && seedUsers.count === 0) {
//   userDB
//     .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
//     .run("admin", "passwordAdmin", "admin");
//   userDB
//     .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
//     .run("user", "passwordUser", "user");
//   console.log("Database seeded with default users.");
// }

/**
 * POST /registerUser
 * Registers a new user in the system.
 * @param {string} req.body.username
 * @param {string} req.body.password
 */
// app.post("/registerUser", (req, res) => {
//   const { username, password } = req.body;
//
//   try {
//     const result = userDB
//       .prepare("INSERT INTO users (username, password) VALUES (?, ?)")
//       .run(username, password);
//
//     res.json({
//       success: true,
//       message: "User created successfully",
//       newUser: { id: result.lastInsertRowid, username: username },
//     });
//   } catch (error) {
//     // If username already exists, SQLite throws a 'SQLITE_CONSTRAINT_UNIQUE' error
//     if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
//       return res.status(400).json({
//         success: false,
//         message: "Username already exists. Please choose another.",
//       });
//     }
//
//     // Handle other internal server errors
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

/**
 * POST /login
 * Authenticates a user based on username and password.
 * @param {string} req.body.username
 * @param {string} req.body.password
 */
// app.post("/login", (req, res) => {
//   const { username, password } = req.body;
//
//   try {
//     const user = userDB
//       .prepare("SELECT * FROM users WHERE username = ? AND password = ?")
//       .get(username, password);
//
//     if (user) {
//       res.json({
//         success: true,
//         message: `Logged in as ${user.role}`,
//         user: { id: user.id, username: user.username, role: user.role },
//       });
//     } else {
//       res.status(401).json({ success: false, message: "Invalid credentials" });
//     }
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

/**
 * DELETE /deleteAccount
 * Deletes a user account from the local users database.
 * @param {number} req.body.id - The ID of the user to delete.
 * @param {string} req.body.username - The username of the user to delete.
 */
app.delete("/deleteAccount", (req, res) => {
  const { id, username } = req.body;

  if (!id && !username) {
    return res
      .status(400)
      .json({ success: false, message: "Account identifier missing" });
  }

  try {
    const stmt = id
      ? userDB.prepare("DELETE FROM users WHERE id = ?")
      : userDB.prepare("DELETE FROM users WHERE username = ?");

    const result = id ? stmt.run(id) : stmt.run(username);

    if (result.changes > 0) {
      res.json({ success: true, message: "Account deleted successfully" });
    } else {
      res.status(404).json({ success: false, message: "Account not found" });
    }
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * POST /createTicket
 * Creates a new support ticket and saves it to the database.
 * @param {string} req.body.ticketTitle
 * @param {string} req.body.ticketDescription
 * @param {string} req.body.ticketPriority
 * @param {string} req.body.department
 * @param {string} req.body.createdBy
 * @param {string} req.body.createdAt
 * @param {string} req.body.assignedTo
 */
app.post("/createTicket", (req, res) => {
  console.log("Server-Side ticket data:", req.body);

  const {
    ticketTitle,
    ticketDescription,
    ticketPriority,
    department,
    createdBy,
    createdAt,
    assignedTo,
  } = req.body;

  if (ticketTitle && ticketDescription && ticketPriority && department) {
    try {
      const insertTicket = ticketsDB.prepare(`
                INSERT INTO tickets (title, description, priority, department, status, createdBy, createdAt, assignedTo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

      const newTicket = {
        title: ticketTitle,
        description: ticketDescription,
        priority: ticketPriority,
        department: department,
        status: "pending",
        createdBy: createdBy,
        createdAt: createdAt,
        assignedTo: assignedTo || null,
      };

      insertTicket.run(
        newTicket.title,
        newTicket.description,
        newTicket.priority,
        newTicket.department,
        newTicket.status,
        newTicket.createdBy,
        newTicket.createdAt,
        newTicket.assignedTo,
      );
      console.log("Ticket saved to database.");

      res.json({
        success: true,
        message: "Ticket created successfully",
        ticket: newTicket,
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      res
        .status(500)
        .json({ success: false, message: "Error creating ticket" });
    }
  } else {
    res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }
});

/**
 * GET /getTickets
 * Retrieves all support tickets from the database.
 */
app.get("/getTickets", (req, res) => {
  try {
    const tickets = ticketsDB.prepare("SELECT * FROM tickets").all();
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ success: false, message: "Error fetching tickets" });
  }
});

/**
 * GET /getUsers
 * Retrieves all users from the local SQLite database for assignment purposes.
 */
// app.get("/getUsers", (req, res) => {
//   try {
//     const users = userDB.prepare("SELECT id, username FROM users").all();
//     console.log("Local users:", users);
//     res.json(users);
//   } catch (error) {
//     console.error("Error fetching users from local database:", error);
//     res.status(500).json({ success: false, message: "Error fetching users" });
//   }
// });

/**
 * PUT /updateTicket/:id
 * Updates a ticket's assignment.
 * @param {number} req.params.id - The ID of the ticket to update.
 * @param {string} req.body.assignedTo - The username to assign the ticket to.
 */
app.put("/updateTicket/:id", (req, res) => {
  const ticketID = parseInt(req.params.id);
  const { assignedTo } = req.body;

  try {
    const result = ticketsDB
      .prepare("UPDATE tickets SET assignedTo = ? WHERE id = ?")
      .run(assignedTo, ticketID);

    if (result.changes > 0) {
      res.json({ success: true, message: "Ticket updated successfully" });
    } else {
      res.status(404).json({ success: false, message: "Ticket not found" });
    }
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ success: false, message: "Error updating ticket" });
  }
});

/**
 * PUT /closeTicket/:id
 * Closes a ticket by setting its status to 'closed'.
 * @param {number} req.params.id - The ID of the ticket to close.
 */
app.put("/closeTicket/:id", (req, res) => {
  const ticketID = parseInt(req.params.id);

  try {
    const result = ticketsDB
      .prepare("UPDATE tickets SET status = 'closed' WHERE id = ?")
      .run(ticketID);

    if (result.changes > 0) {
      res.json({ success: true, message: "Ticket closed successfully" });
    } else {
      res.status(404).json({ success: false, message: "Ticket not found" });
    }
  } catch (error) {
    console.error("Error closing ticket:", error);
    res.status(500).json({ success: false, message: "Error closing ticket" });
  }
});

/**
 * DELETE /deleteTicket/:id
 * Removes a ticket from the database by its ID.
 * @param {number} req.params.id - The ID of the ticket to delete.
 */
app.delete("/deleteTicket/:id", (req, res) => {
  const ticketID = parseInt(req.params.id);

  try {
    const result = ticketsDB
      .prepare("DELETE FROM tickets WHERE id = ?")
      .run(ticketID);

    if (result.changes > 0) {
      res.json({
        success: true,
        message: "Ticket deleted from database successfully",
      });
    } else {
      res.status(404).json({ success: false, message: "Ticket not found" });
    }
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({ success: false, message: "Error deleting ticket" });
  }
});

/**
 * Start the server and listen on all network interfaces.
 */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on your IP address or localhost:${PORT}`);
});
