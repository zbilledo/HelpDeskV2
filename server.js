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

/** Server Config */
const app = express();
const PORT = 8000;

/** Supabase Client */
// Used for user lookups and account deletion; ticket data stays in SQLite
const SUPABASE_URL = "https://adnjlrxbqgerjlhgirlq.supabase.co";
const SUPABASE_KEY = "sb_publishable_sNNSlaz28kpULCpWkBCM3Q_OY6FN8cv";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Database Initialization */
// tickets.db stores all support ticket data via SQLite
// users.db (commented out) has been replaced by Supabase for user management
const ticketsDB = new Database("tickets.db");
// const userDB = new Database("users.db");

/** Tickets Table */
// Creates the tickets table on first run if it doesn't already exist
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

/** Schema Migrations */
// ALTER TABLE is wrapped in try/catch because SQLite throws if the column already exists;
// these blocks safely add columns to databases created before these fields were introduced
try {
  ticketsDB.exec(`ALTER TABLE tickets ADD COLUMN createdAt TEXT`);
} catch (error) {
  // Column already exists — safe to ignore
}
try {
  ticketsDB.exec(
    `ALTER TABLE tickets ADD COLUMN department TEXT NOT NULL DEFAULT 'General'`,
  );
} catch (error) {
  // Column already exists — safe to ignore
}
try {
  ticketsDB.exec(`ALTER TABLE tickets ADD COLUMN assignedTo TEXT`);
} catch (error) {
  // Column already exists — safe to ignore
}

// TODO: Uncomment if switching back to SQLite-based user management
/** Users Table (Disabled — replaced by Supabase) */
// userDB.exec(`
//     CREATE TABLE IF NOT EXISTS users (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         username TEXT NOT NULL UNIQUE,
//         password TEXT NOT NULL,
//         role TEXT NOT NULL DEFAULT 'user'
//     )
// `);

/** Middleware */
app.use(cors());            // Enable CORS for all routes
app.use(express.json());    // Parse JSON request bodies
app.use(morgan("dev"));     // HTTP request logging for development

/** Static Files */
// Serves the project root as static; index:false prevents auto-serving index.html
app.use(express.static("./", { index: false }));

/** Default Route */
// Redirects root requests to the login page
app.get("/", (req, res) => {
  res.sendFile("pages/login-page.html", { root: "./" });
});

// TODO: Uncomment if switching back to SQLite-based user management
/** Database Seed (Disabled) */
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

// TODO: Uncomment if switching back to SQLite-based user management
/**
 * POST /registerUser (Disabled)
 * Registers a new user in the local SQLite users database.
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
//     // SQLITE_CONSTRAINT_UNIQUE is thrown when the username is already taken
//     if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
//       return res.status(400).json({
//         success: false,
//         message: "Username already exists. Please choose another.",
//       });
//     }
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// TODO: Uncomment if switching back to SQLite-based user management
/**
 * POST /login (Disabled)
 * Authenticates a user against the local SQLite users database.
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
 * Accepts either an id or a username as the identifier.
 * @param {number} req.body.id
 * @param {string} req.body.username
 */
app.delete("/deleteAccount", (req, res) => {
  const { id, username } = req.body;

  if (!id && !username) {
    return res
      .status(400)
      .json({ success: false, message: "Account identifier missing" });
  }

  try {
    // Prefer id-based deletion; fall back to username if id is not provided
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
 * Creates a new support ticket and saves it to the SQLite database.
 * All new tickets default to "pending" status.
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
        status: "pending", // All new tickets start as pending
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
 * Retrieves all support tickets from the SQLite database.
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
 * Retrieves all users from Supabase for use in the ticket assignment dropdown.
 * Only fetches id and username — no sensitive fields.
 */
app.get("/getUsers", async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, username");

    if (error) {
      console.error("Error fetching users from Supabase:", error);
      return res
        .status(500)
        .json({ success: false, message: "Error fetching users" });
    }

    console.log("Supabase users:", users);
    res.json(users);
  } catch (error) {
    console.error("Error fetching users from Supabase:", error);
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

/**
 * PUT /updateTicket/:id
 * Updates the assignedTo field on a ticket.
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
 * Sets a ticket's status to 'closed'.
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
 * Removes a ticket from the SQLite database by its ID.
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

/** Start Server */
// Listens on all network interfaces so the server is reachable on the local network
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on your IP address or localhost:${PORT}`);
});