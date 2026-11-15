const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { prisma, startServer, resetDb, client, registerUser, createMedia } = require("./helpers");

let server;
let request;
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
  movie = await createMedia({
    title: "Inception", type: "MOVIE", releaseDate: "2010-07-16",
    genres: ["Action", "Science Fiction"], description: "Dream heist",
  });
  show = await createMedia({ title: "Breaking Bad", type: "TV_SHOW", releaseDate: "2008-01-20", genres: ["Crime", "Drama"] });
  await createMedia({ title: "The Matrix", type: "MOVIE", releaseDate: "1999-03-31", genres: ["Action", "Science Fiction"] });
});

describe("GET /api/media", () => {
  test("lists titles with pagination metadata, sorted by title", async () => {
    const res = await request("GET", "/api/media?limit=2");
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3);
    assert.equal(res.body.totalPages, 2);
    assert.deepEqual(res.body.items.map((m) => m.title), ["Breaking Bad", "Inception"]);
  });

  test("searches title and description case-insensitively", async () => {
    const byTitle = await request("GET", "/api/media?search=matrix");
    assert.deepEqual(byTitle.body.items.map((m) => m.title), ["The Matrix"]);
    const byDescription = await request("GET", "/api/media?search=HEIST");
    assert.deepEqual(byDescription.body.items.map((m) => m.title), ["Inception"]);
  });

  test("filters by type and by genre (name or id)", async () => {
    const tv = await request("GET", "/api/media?type=tv_show");
    assert.deepEqual(tv.body.items.map((m) => m.title), ["Breaking Bad"]);

    const byName = await request("GET", "/api/media?genre=science%20fiction");
    assert.equal(byName.body.total, 2);

    const crime = await prisma.genre.findUnique({ where: { name: "Crime" } });
    const byId = await request("GET", `/api/media?genre=${crime.id}`);
    assert.deepEqual(byId.body.items.map((m) => m.title), ["Breaking Bad"]);
  });

  test("sorts by newest release date", async () => {
    const res = await request("GET", "/api/media?sort=newest");
    assert.deepEqual(res.body.items.map((m) => m.title), ["Inception", "Breaking Bad", "The Matrix"]);
  });

  test("rejects an invalid type", async () => {
    const res = await request("GET", "/api/media?type=BOOK");
    assert.equal(res.status, 400);
  });

  test("returns release dates as YYYY-MM-DD and genres sorted by name", async () => {
    const res = await request("GET", "/api/media?search=inception");
    const [item] = res.body.items;
    assert.equal(item.releaseDate, "2010-07-16");
    assert.deepEqual(item.genres.map((g) => g.name), ["Action", "Science Fiction"]);
  });
});

describe("GET /api/media/:id", () => {
  test("returns movie details", async () => {
    const res = await request("GET", `/api/media/${movie.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.type, "MOVIE");
    assert.deepEqual(res.body.movieDetails, { duration: 100 });
    assert.equal(res.body.tvShowDetails, null);
    assert.equal(res.body.viewer, undefined); // not signed in
  });

  test("returns TV show details", async () => {
    const res = await request("GET", `/api/media/${show.id}`);
    assert.deepEqual(res.body.tvShowDetails, { numberOfSeasons: 2, numberOfEpisodes: 20 });
    assert.equal(res.body.movieDetails, null);
  });

  test("includes the viewer's own state when signed in", async () => {
    const { token } = await registerUser(request);
    const res = await request("GET", `/api/media/${movie.id}`, { token });
    assert.deepEqual(res.body.viewer, { preference: null, saved: false, collectionIds: [] });
  });

  test("returns 404 for an unknown id and 400 for an invalid id", async () => {
    const missing = await request("GET", "/api/media/00000000-0000-4000-8000-000000000000");
    assert.equal(missing.status, 404);
    const invalid = await request("GET", "/api/media/abc");
    assert.equal(invalid.status, 400);
  });
});

describe("GET /api/genres", () => {
  test("lists genres alphabetically with title counts", async () => {
    const res = await request("GET", "/api/genres");
    assert.equal(res.status, 200);
    const action = res.body.items.find((g) => g.name === "Action");
    assert.equal(action.mediaCount, 2);
    assert.deepEqual(
      res.body.items.map((g) => g.name),
      ["Action", "Crime", "Drama", "Science Fiction"],
    );
  });
});
