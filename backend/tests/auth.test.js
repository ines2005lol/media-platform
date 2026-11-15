const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { prisma, startServer, resetDb, client, registerUser } = require("./helpers");

let server;
let request;

before(async () => {
  let baseUrl;
  ({ server, baseUrl } = await startServer());
  request = client(baseUrl);
});
after(async () => {
  server.close();
  await prisma.$disconnect();
});
beforeEach(resetDb);

describe("POST /api/auth/register", () => {
  test("creates a user, normalises to lowercase and returns a token", async () => {
    const res = await request("POST", "/api/auth/register", {
      body: { username: "  Alice_1 ", email: "Alice@Example.COM", password: "password123" },
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.username, "alice_1");
    assert.equal(res.body.user.email, "alice@example.com");
    assert.equal(res.body.user.passwordHash, undefined);
  });

  test("stores a scrypt hash, never the plaintext password", async () => {
    await registerUser(request, { username: "bob", email: "bob@example.com", password: "s3cret-pass" });
    const row = await prisma.user.findUnique({ where: { email: "bob@example.com" } });
    assert.match(row.passwordHash, /^scrypt\$/);
    assert.ok(!row.passwordHash.includes("s3cret-pass"));
  });

  test("rejects invalid input with field errors", async () => {
    const res = await request("POST", "/api/auth/register", {
      body: { username: "a!", email: "not-an-email", password: "short" },
    });
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(res.body.details).sort(), ["email", "password", "username"]);
  });

  test("rejects duplicate username or email, case-insensitively", async () => {
    await registerUser(request, { username: "carol", email: "carol@example.com" });
    const res = await request("POST", "/api/auth/register", {
      body: { username: "CAROL", email: "CAROL@example.com", password: "password123" },
    });
    assert.equal(res.status, 409);
    assert.ok(res.body.details.username);
    assert.ok(res.body.details.email);
  });

  test("rejects malformed JSON", async () => {
    const res = await request("POST", "/api/auth/register", { rawBody: "{bad json" });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Malformed JSON in request body");
  });
});

describe("POST /api/auth/login", () => {
  test("logs in with correct credentials (email is case-insensitive)", async () => {
    await registerUser(request, { username: "dave", email: "dave@example.com", password: "password123" });
    const res = await request("POST", "/api/auth/login", {
      body: { email: "DAVE@example.com", password: "password123" },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.username, "dave");
    assert.equal(res.body.user.passwordHash, undefined);
  });

  test("returns the same 401 for a wrong password and an unknown email", async () => {
    await registerUser(request, { username: "erin", email: "erin@example.com" });
    const wrongPassword = await request("POST", "/api/auth/login", {
      body: { email: "erin@example.com", password: "wrong-password" },
    });
    const unknownEmail = await request("POST", "/api/auth/login", {
      body: { email: "nobody@example.com", password: "password123" },
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.body.error, unknownEmail.body.error);
  });

  test("requires email and password", async () => {
    const res = await request("POST", "/api/auth/login", { body: {} });
    assert.equal(res.status, 400);
  });
});

describe("GET /api/auth/me", () => {
  test("returns the current user with a valid token", async () => {
    const { token, user } = await registerUser(request);
    const res = await request("GET", "/api/auth/me", { token });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, user.id);
  });

  test("rejects missing or invalid tokens", async () => {
    assert.equal((await request("GET", "/api/auth/me")).status, 401);
    assert.equal((await request("GET", "/api/auth/me", { token: "not-a-jwt" })).status, 401);
  });

  test("rejects the token of a deleted user", async () => {
    const { token, user } = await registerUser(request);
    await prisma.user.delete({ where: { id: user.id } });
    assert.equal((await request("GET", "/api/auth/me", { token })).status, 401);
  });
});
