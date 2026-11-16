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

describe("PUT/DELETE /api/media/:id/preference", () => {
  test("likes a title and shows it in the viewer state", async () => {
    const res = await request("PUT", `/api/media/${movie.id}/preference`, { token, body: { type: "LIKE" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.preference, "LIKE");

    const details = await request("GET", `/api/media/${movie.id}`, { token });
    assert.equal(details.body.viewer.preference, "LIKE");
  });

  test("switches LIKE to DISLIKE without creating a second row", async () => {
    await request("PUT", `/api/media/${movie.id}/preference`, { token, body: { type: "LIKE" } });
    const res = await request("PUT", `/api/media/${movie.id}/preference`, { token, body: { type: "dislike" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.preference, "DISLIKE");
    assert.equal(await prisma.userPreference.count(), 1);
  });

  test("removes a preference, and removing again is still 204", async () => {
    await request("PUT", `/api/media/${movie.id}/preference`, { token, body: { type: "LIKE" } });
    const first = await request("DELETE", `/api/media/${movie.id}/preference`, { token });
    assert.equal(first.status, 204);
    const second = await request("DELETE", `/api/media/${movie.id}/preference`, { token });
    assert.equal(second.status, 204);

    const details = await request("GET", `/api/media/${movie.id}`, { token });
    assert.equal(details.body.viewer.preference, null);
  });

  test("rejects an invalid type, unknown media and missing auth", async () => {
    const bad = await request("PUT", `/api/media/${movie.id}/preference`, { token, body: { type: "LOVE" } });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.details.type);

    const missing = await request("PUT", `/api/media/${MISSING_ID}/preference`, { token, body: { type: "LIKE" } });
    assert.equal(missing.status, 404);

    const invalidId = await request("PUT", "/api/media/abc/preference", { token, body: { type: "LIKE" } });
    assert.equal(invalidId.status, 400);

    const anon = await request("PUT", `/api/media/${movie.id}/preference`, { body: { type: "LIKE" } });
    assert.equal(anon.status, 401);
  });
});

describe("GET /api/me/preferences", () => {
  test("lists the user's verdicts, filterable by type", async () => {
    await request("PUT", `/api/media/${movie.id}/preference`, { token, body: { type: "LIKE" } });
    await request("PUT", `/api/media/${show.id}/preference`, { token, body: { type: "DISLIKE" } });

    const all = await request("GET", "/api/me/preferences", { token });
    assert.equal(all.status, 200);
    assert.equal(all.body.total, 2);

    const liked = await request("GET", "/api/me/preferences?type=like", { token });
    assert.deepEqual(liked.body.items.map((m) => [m.title, m.preference]), [["Inception", "LIKE"]]);
    assert.ok(liked.body.items[0].genres);

    const bad = await request("GET", "/api/me/preferences?type=meh", { token });
    assert.equal(bad.status, 400);
  });

  test("never shows another user's verdicts", async () => {
    await request("PUT", `/api/media/${movie.id}/preference`, { token, body: { type: "LIKE" } });
    const other = await registerUser(request);
    const res = await request("GET", "/api/me/preferences", { token: other.token });
    assert.equal(res.body.total, 0);
  });

  test("requires auth", async () => {
    const res = await request("GET", "/api/me/preferences");
    assert.equal(res.status, 401);
  });
});

describe("Library", () => {
  test("saves a title, saving twice keeps one row and the first savedAt", async () => {
    const first = await request("PUT", `/api/media/${movie.id}/save`, { token });
    assert.equal(first.status, 200);
    assert.equal(first.body.saved, true);

    const second = await request("PUT", `/api/media/${movie.id}/save`, { token });
    assert.equal(second.body.savedAt, first.body.savedAt);
    assert.equal(await prisma.userSavedMedia.count(), 1);

    const details = await request("GET", `/api/media/${movie.id}`, { token });
    assert.equal(details.body.viewer.saved, true);
  });

  test("lists saved titles newest first with pagination", async () => {
    await request("PUT", `/api/media/${movie.id}/save`, { token });
    await request("PUT", `/api/media/${show.id}/save`, { token });

    const res = await request("GET", "/api/me/library?limit=1", { token });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    assert.equal(res.body.totalPages, 2);
    assert.equal(res.body.items[0].title, "Breaking Bad");
    assert.ok(res.body.items[0].savedAt);
  });

  test("unsaves a title (idempotent)", async () => {
    await request("PUT", `/api/media/${movie.id}/save`, { token });
    assert.equal((await request("DELETE", `/api/media/${movie.id}/save`, { token })).status, 204);
    assert.equal((await request("DELETE", `/api/media/${movie.id}/save`, { token })).status, 204);
    const res = await request("GET", "/api/me/library", { token });
    assert.equal(res.body.total, 0);
  });

  test("saving and liking are independent", async () => {
    await request("PUT", `/api/media/${movie.id}/save`, { token });
    await request("PUT", `/api/media/${movie.id}/preference`, { token, body: { type: "DISLIKE" } });
    await request("DELETE", `/api/media/${movie.id}/preference`, { token });
    const details = await request("GET", `/api/media/${movie.id}`, { token });
    assert.deepEqual(
      { preference: details.body.viewer.preference, saved: details.body.viewer.saved },
      { preference: null, saved: true },
    );
  });

  test("returns 404 for unknown media and 401 without a token", async () => {
    assert.equal((await request("PUT", `/api/media/${MISSING_ID}/save`, { token })).status, 404);
    assert.equal((await request("PUT", `/api/media/${movie.id}/save`)).status, 401);
    assert.equal((await request("GET", "/api/me/library")).status, 401);
  });
});
