const prisma = require("../config/prisma");
const HttpError = require("../utils/httpError");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signToken } = require("../utils/token");
const { throwIfErrors } = require("../utils/validation");
const { publicUserSelect } = require("../middleware/auth");

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Used when the email is unknown, so a failed login takes the same time either way
let dummyHashPromise;
function dummyHash() {
  dummyHashPromise ??= hashPassword("timing-equaliser-password");
  return dummyHashPromise;
}

function normalise(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validateRegistration(body) {
  const username = normalise(body.username);
  const email = normalise(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const errors = {};

  if (!USERNAME_RE.test(username)) {
    errors.username = "Username must be 3-30 characters: letters, numbers or underscores";
  }
  if (email.length > 255 || !EMAIL_RE.test(email)) {
    errors.email = "A valid email address is required";
  }
  if (password.length < 8 || password.length > 128) {
    errors.password = "Password must be 8-128 characters";
  }
  throwIfErrors(errors);
  return { username, email, password };
}

function authResponse(user) {
  return { token: signToken(user.id), user };
}

async function register(body) {
  const { username, email, password } = validateRegistration(body);

  // Friendly message for the common case; the unique indexes still guard against races (409)
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
  });
  if (existing) {
    const errors = {};
    if (existing.username === username) errors.username = "Username is already taken";
    if (existing.email === email) errors.email = "Email is already registered";
    throw new HttpError(409, "Account already exists", errors);
  }

  const user = await prisma.user.create({
    data: { username, email, passwordHash: await hashPassword(password) },
    select: publicUserSelect,
  });
  return authResponse(user);
}

async function login(body) {
  const email = normalise(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    throw new HttpError(400, "Email and password are required");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : (await verifyPassword(password, await dummyHash()), false);

  // Same message whether the email or the password is wrong
  if (!valid) throw new HttpError(401, "Invalid email or password");

  const { passwordHash, updatedAt, ...publicUser } = user;
  return authResponse(publicUser);
}

module.exports = { register, login };
