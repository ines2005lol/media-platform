// Shared test setup. Points the app at TEST_DATABASE_URL *before* the app is loaded,
// and refuses to run against the development database (tests wipe all tables).
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is not set. Add it to backend/.env (see .env.example).");
}
if (testUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must point to a different database than DATABASE_URL.");
}
process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET ||= "test-only-secret";

const app = require("../src/app");
const prisma = require("../src/config/prisma");

function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

// Empties every table (CASCADE follows the foreign keys)
async function resetDb() {
  await prisma.$executeRawUnsafe("TRUNCATE TABLE users, media, genres CASCADE");
}

// Small fetch wrapper: returns { status, body }
function client(baseUrl) {
  return async function request(method, url, { body, token, rawBody } = {}) {
    const headers = {};
    if (body !== undefined || rawBody !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(baseUrl + url, {
      method,
      headers,
      body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, body: json };
  };
}

async function registerUser(request, overrides = {}) {
  const n = Math.random().toString(36).slice(2, 8);
  const payload = { username: `user_${n}`, email: `user_${n}@example.com`, password: "password123", ...overrides };
  const res = await request("POST", "/api/auth/register", { body: payload });
  if (res.status !== 201) throw new Error(`registerUser failed: ${JSON.stringify(res.body)}`);
  return { ...res.body, password: payload.password };
}

// Creates a title with its required detail row, like the seed script does
async function createMedia({ title, type = "MOVIE", releaseDate = "2000-01-01", genres = [], description = null }) {
  const genreRows = [];
  for (const name of genres) {
    genreRows.push(await prisma.genre.upsert({ where: { name }, update: {}, create: { name } }));
  }
  return prisma.media.create({
    data: {
      title,
      type,
      description,
      releaseDate: releaseDate ? new Date(`${releaseDate}T00:00:00Z`) : null,
      ...(type === "MOVIE"
        ? { movieDetails: { create: { duration: 100 } } }
        : { tvShowDetails: { create: { numberOfSeasons: 2, numberOfEpisodes: 20 } } }),
      genres: { create: genreRows.map((g) => ({ genreId: g.id })) },
    },
  });
}

module.exports = { prisma, startServer, resetDb, client, registerUser, createMedia };
