const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { prisma, startServer, resetDb, client, registerUser, createMedia } = require("./helpers");

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

let server;
let request;
let token;
let movie;
let show;

before(async () => {
  let baseUrl;
  ({ server, baseUrl } = await startServer());
  request = client(baseUrl);
});
after(async () => {
  server.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb();
  movie = await createMedia({ title: "Inception", type: "MOVIE", genres: ["Action"] });
  show = await createMedia({ title: "Breaking Bad", type: "TV_SHOW", genres: ["Crime"] });
  ({ token } = await registerUser(request));
});

async function createCollection(body, authToken = token) {
  const res = await request("POST", "/api/collections", { token: authToken, body });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}

describe("Creating and listing collections", () => {
  test("creates a collection with a trimmed name and an item count", async () => {
    const res = await request("POST", "/api/collections", {
      token,
      body: { name: "  Weekend watch  ", description: "Easy picks" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, "Weekend watch");
    assert.equal(res.body.description, "Easy picks");
    assert.equal(res.body.itemCount, 0);
  });

  test("validates name and description", async () => {
    const empty = await request("POST", "/api/collections", { token, body: { name: "   " } });
    assert.equal(empty.status, 400);
    assert.ok(empty.body.details.name);

    const long = await request("POST", "/api/collections", { token, body: { name: "x".repeat(51) } });
    assert.equal(long.status, 400);

    const badDesc = await request("POST", "/api/collections", {
      token,
      body: { name: "Ok", description: "x".repeat(501) },
    });
    assert.equal(badDesc.status, 400);
    assert.ok(badDesc.body.details.description);
  });

  test("rejects duplicate names for the same user (case-insensitive) but allows them across users", async () => {
    await createCollection({ name: "Favourites" });
    const dup = await request("POST", "/api/collections", { token, body: { name: "favourites" } });
    assert.equal(dup.status, 409);

    const other = await registerUser(request);
    await createCollection({ name: "Favourites" }, other.token);
  });

  test("lists only the user's own collections, with counts and a poster preview", async () => {
    const mine = await createCollection({ name: "Mine" });
    await request("PUT", `/api/collections/${mine.id}/items/${movie.id}`, { token });
    const other = await registerUser(request);
    await createCollection({ name: "Theirs" }, other.token);

    const res = await request("GET", "/api/collections", { token });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items.map((c) => c.name), ["Mine"]);
    assert.equal(res.body.items[0].itemCount, 1);
    assert.deepEqual(res.body.items[0].preview.map((m) => m.title), ["Inception"]);
  });

  test("requires auth", async () => {
    assert.equal((await request("GET", "/api/collections")).status, 401);
    assert.equal((await request("POST", "/api/collections", { body: { name: "x" } })).status, 401);
  });
});

describe("Reading, updating and deleting a collection", () => {
  test("returns the collection with its titles, newest first", async () => {
    const c = await createCollection({ name: "Mix" });
    await request("PUT", `/api/collections/${c.id}/items/${movie.id}`, { token });
    await request("PUT", `/api/collections/${c.id}/items/${show.id}`, { token });

    const res = await request("GET", `/api/collections/${c.id}`, { token });
    assert.equal(res.status, 200);
    assert.equal(res.body.itemCount, 2);
    assert.deepEqual(res.body.items.map((m) => m.title), ["Breaking Bad", "Inception"]);
    assert.ok(res.body.items[0].addedAt);
  });

  test("hides other users' collections behind 404", async () => {
    const c = await createCollection({ name: "Private" });
    const other = await registerUser(request);
    const opts = { token: other.token };
    assert.equal((await request("GET", `/api/collections/${c.id}`, opts)).status, 404);
    assert.equal((await request("PATCH", `/api/collections/${c.id}`, { ...opts, body: { name: "x" } })).status, 404);
    assert.equal((await request("DELETE", `/api/collections/${c.id}`, opts)).status, 404);
    assert.equal((await request("PUT", `/api/collections/${c.id}/items/${movie.id}`, opts)).status, 404);
  });

  test("renames and clears the description", async () => {
    const c = await createCollection({ name: "Old", description: "Something" });
    const res = await request("PATCH", `/api/collections/${c.id}`, {
      token,
      body: { name: "New", description: "" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.name, "New");
    assert.equal(res.body.description, null);
  });

  test("rejects empty updates and renaming onto an existing name", async () => {
    const a = await createCollection({ name: "A" });
    await createCollection({ name: "B" });
    assert.equal((await request("PATCH", `/api/collections/${a.id}`, { token, body: {} })).status, 400);
    assert.equal((await request("PATCH", `/api/collections/${a.id}`, { token, body: { name: "b" } })).status, 409);
    // Renaming to its own name (different case) is fine
    assert.equal((await request("PATCH", `/api/collections/${a.id}`, { token, body: { name: "a" } })).status, 200);
  });

  test("deletes a collection but keeps the titles in the catalogue", async () => {
    const c = await createCollection({ name: "Temp" });
    await request("PUT", `/api/collections/${c.id}/items/${movie.id}`, { token });
    assert.equal((await request("DELETE", `/api/collections/${c.id}`, { token })).status, 204);
    assert.equal((await request("GET", `/api/collections/${c.id}`, { token })).status, 404);
    assert.equal(await prisma.media.count(), 2);
  });

  test("returns 400 for an invalid id and 404 for an unknown one", async () => {
    assert.equal((await request("GET", "/api/collections/abc", { token })).status, 400);
    assert.equal((await request("GET", `/api/collections/${MISSING_ID}`, { token })).status, 404);
  });
});

describe("Collection items", () => {
  test("adds a title (idempotent) and shows it in the viewer state", async () => {
    const c = await createCollection({ name: "Picks" });
    const first = await request("PUT", `/api/collections/${c.id}/items/${movie.id}`, { token });
    assert.equal(first.status, 200);
    const second = await request("PUT", `/api/collections/${c.id}/items/${movie.id}`, { token });
    assert.equal(second.body.addedAt, first.body.addedAt);
    assert.equal(await prisma.collectionMedia.count(), 1);

    const details = await request("GET", `/api/media/${movie.id}`, { token });
    assert.deepEqual(details.body.viewer.collectionIds, [c.id]);
  });

  test("removes a title (idempotent)", async () => {
    const c = await createCollection({ name: "Picks" });
    await request("PUT", `/api/collections/${c.id}/items/${movie.id}`, { token });
    assert.equal((await request("DELETE", `/api/collections/${c.id}/items/${movie.id}`, { token })).status, 204);
    assert.equal((await request("DELETE", `/api/collections/${c.id}/items/${movie.id}`, { token })).status, 204);
    const res = await request("GET", `/api/collections/${c.id}`, { token });
    assert.equal(res.body.itemCount, 0);
  });

  test("returns 404 for unknown media", async () => {
    const c = await createCollection({ name: "Picks" });
    const res = await request("PUT", `/api/collections/${c.id}/items/${MISSING_ID}`, { token });
    assert.equal(res.status, 404);
  });
});
