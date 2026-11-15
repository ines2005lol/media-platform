const HttpError = require("./httpError");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MEDIA_TYPES = ["MOVIE", "TV_SHOW"];
const PREFERENCE_TYPES = ["LIKE", "DISLIKE"];

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

// Throws 400 if the route parameter is not a valid UUID
function requireUuid(value, label = "id") {
  if (!isUuid(value)) throw new HttpError(400, `Invalid ${label}`);
  return value;
}

// Collects field errors and throws a single 400 with all of them
function throwIfErrors(errors) {
  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, "Validation failed", errors);
  }
}

// Ensures the request body is a plain object
function requireBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
  return body;
}

// page >= 1, 1 <= limit <= 50
function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = {
  MEDIA_TYPES,
  PREFERENCE_TYPES,
  isUuid,
  requireUuid,
  throwIfErrors,
  requireBody,
  parsePagination,
};
