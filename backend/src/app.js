const express = require("express");

const app = express();

// Parse incoming JSON request bodies (available as req.body)
app.use(express.json());

// Health-check route
app.get("/", (req, res) => {
  res.send("Media Platform API is running!!!!");
});

// 404 handler: runs when no route above matched
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Centralized error handler: Express recognizes it by its 4 arguments.
// In Express 5, errors thrown in async route handlers also end up here.
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message,
  });
});

module.exports = app;
