const express = require("express");
const apiRoutes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

const morgan = require("morgan");

app.use(morgan("dev"));


// Parse incoming JSON request bodies (available as req.body)
app.use(express.json({ limit: "100kb" }));

// Health-check route
app.get("/", (req, res) => {
  res.send("Media Platform API is running!!!!");
});

// All API endpoints live under /api
app.use("/api", apiRoutes);

// 404 for unmatched routes, then centralized error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
