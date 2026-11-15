const prisma = require("../config/prisma");
const HttpError = require("../utils/httpError");
const { verifyToken } = require("../utils/token");

const publicUserSelect = { id: true, username: true, email: true, createdAt: true };

function readBearerToken(req) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

// Loads the user from the token. The DB lookup makes tokens of deleted users stop working.
async function loadUser(req) {
  const token = readBearerToken(req);
  if (!token) return null;
  const userId = verifyToken(token);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
}

// Rejects the request with 401 unless a valid token is provided
async function requireAuth(req, res, next) {
  const user = await loadUser(req);
  if (!user) throw new HttpError(401, "Authentication required");
  req.user = user;
  next();
}

// Attaches req.user when a valid token is provided, but never rejects
async function optionalAuth(req, res, next) {
  req.user = await loadUser(req);
  next();
}

module.exports = { requireAuth, optionalAuth, publicUserSelect };
