// 404 for any route that did not match
function notFound(req, res) {
  res.status(404).json({ error: "Not found" });
}

// Translates known error types into HTTP responses.
// Express 5 forwards errors thrown in async handlers here automatically.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message;
  const details = err.details;

  // Malformed JSON body (from express.json())
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON in request body";
  }

  // Prisma known errors
  if (err.code === "P2002") {
    status = 409;
    message = "A record with these values already exists";
  } else if (err.code === "P2025") {
    status = 404;
    message = "Record not found";
  } else if (err.code === "P2003") {
    status = 400;
    message = "Referenced record does not exist";
  }

  if (status >= 500) {
    console.error(err);
    message = "Internal server error";
  }

  res.status(status).json(details ? { error: message, details } : { error: message });
}

module.exports = { notFound, errorHandler };
