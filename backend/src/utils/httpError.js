// An error with an HTTP status code. The error handler sends `message`
// (and optional `details`) to the client for any status below 500.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = HttpError;
