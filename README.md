# Media Discovery Platform

A full-stack web app for discovering movies and TV shows: browse and search a catalogue, like or dislike titles, save them to a personal library, organise them into collections, and get recommendations based on your tastes.

> **Status:** work in progress. Accounts, browsing, search, title details, likes/dislikes, the personal library and collections work end to end (React frontend + API). Recommendations are in development.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, React Router (JavaScript) |
| Backend | Node.js, Express 5 (CommonJS) |
| Database | PostgreSQL |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Auth | JWT (`jsonwebtoken`), passwords hashed with Node's built-in `scrypt` |
| Tests | Node's built-in test runner (`node:test`) against a real test database |
| Containers | Docker (backend image) |

No paid services or external APIs are required.

## Features so far

- **Accounts:** register, log in, get the current user. Usernames and emails are stored in lowercase; passwords are never stored in plain text.
- **Catalogue:** browse movies and TV shows with search (title and description), filters (type, genre), sorting (title, newest, oldest) and pagination.
- **Details:** full information for a title, including runtime (movies) or seasons and episodes (TV shows). Signed-in users also see their own like/save state.
- **Genres:** list of genres with the number of titles in each.
- **Likes / dislikes:** one verdict per title; clicking the active one clears it. Your liked and disliked titles are listed in your library.
- **Library:** save titles to watch later. Saving is independent of liking.
- **Collections:** create, rename and delete your own named lists, and add or remove titles from a title's page. Names are unique per user (case-insensitive). Other users' collections are never visible (they answer 404).
- **Seed data:** a starter catalogue of 39 real, well-known titles across 15 genres.

## Project structure

```
media_platform/
├── docs/database/          ERD (draw.io)
├── frontend/
│   └── src/
│       ├── api/            fetch wrapper for the backend API
│       ├── context/        login state (AuthContext)
│       ├── components/     layout, cards, posters
│       ├── pages/          Browse, Details, Library, Collections, Login, Register
│       └── utils/          formatting helpers
└── backend/
    ├── prisma/             schema, migrations, seed script
    ├── scripts/            helper scripts (test database migration)
    ├── src/
    │   ├── app.js          Express app setup (middleware, routes, error handling)
    │   ├── server.js       starts the server
    │   ├── config/         environment variables and Prisma client
    │   ├── routes/         URL → controller mapping
    │   ├── controllers/    read the request, send the response
    │   ├── services/       business logic and database queries
    │   ├── middleware/     authentication and error handling
    │   └── utils/          validation, password hashing, tokens
    ├── tests/              API integration tests
    ├── Dockerfile          container image for the API
    └── .dockerignore       files kept out of the image
```

## Getting started

### Prerequisites
- Node.js 22 or later
- PostgreSQL running locally

### 1. Install
```bash
cd backend
npm install
npx prisma generate
```

### 2. Configure
Create two empty PostgreSQL databases (for example `media_platform` and `media_platform_test`), then copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Your development database |
| `TEST_DATABASE_URL` | A separate database used by the tests (it is wiped on every run) |
| `JWT_SECRET` | A long random string used to sign login tokens |
| `JWT_EXPIRES_IN` | How long a login lasts, e.g. `7d` |
| `PORT` | API port (default `3000`) |

Generate a secret with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Set up the databases
```bash
npx prisma migrate deploy   # development database
npm run db:migrate:test     # test database
npm run db:seed             # load the starter catalogue
```

### 4. Run
Open two terminals:

```bash
# Terminal 1 — API on http://localhost:3000
cd backend
npm run dev

# Terminal 2 — website on http://localhost:5173
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173**. The frontend forwards `/api` requests to the backend (see `frontend/vite.config.js`), so both must be running.

Run the backend tests with `npm test` in `backend/`.

## Running the backend with Docker

The API can also run in a container, built from [`backend/Dockerfile`](backend/Dockerfile). The database is **not** part of the image: the container connects to a PostgreSQL server you already have.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- PostgreSQL running, with migrations applied (step 3 of [Getting started](#3-set-up-the-databases)). The image does not include the Prisma CLI, so run migrations from your machine.

### Build the image
```bash
cd backend
docker build -t media-platform-backend .
```

### Run the container
Replace the placeholders (`USER`, `PASSWORD`, the secret) with your own values:

```bash
docker run --rm --init -p 3000:3000 -e DATABASE_URL="postgresql://USER:PASSWORD@host.docker.internal:5432/media_platform" -e JWT_SECRET="your-long-random-secret" media-platform-backend
```

The API is then available at **http://localhost:3000**.

| Option | What it does |
|---|---|
| `--rm` | Deletes the container when it stops |
| `--init` | Forwards stop signals to Node so `docker stop` shuts the app down cleanly |
| `-p 3000:3000` | Maps port 3000 on your computer to port 3000 in the container |
| `-e NAME=value` | Passes an environment variable at runtime |

Environment variables:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Use `host.docker.internal` instead of `localhost` (see below) |
| `JWT_SECRET` | yes | Long random string |
| `JWT_EXPIRES_IN` | no | Defaults to `7d` |
| `PORT` | no | Defaults to `3000`; change the `-p` mapping to match |

### Things to know
- **`localhost` inside a container means the container itself.** To reach PostgreSQL running on your computer, use `host.docker.internal` as the host (Docker Desktop on Windows and macOS). Keep the same port your database uses.
- **No secrets are stored in the image.** `.env` is excluded by [`backend/.dockerignore`](backend/.dockerignore); all configuration is supplied with `-e` when the container starts.
- **A 500 error on database routes while `/` works** usually means `DATABASE_URL` is wrong (bad credentials or host). Check the logs with `docker logs <container>`.

### How the image is built
- **Two stages:** the first installs all dependencies and runs `prisma generate`; the second installs production dependencies only and copies in just the generated Prisma Client. The Prisma CLI and dev tools never reach the final image.
- **Base image:** `node:22-bookworm-slim`, the same Node version as CI.
- **Runs as the non-root `node` user**; application files are owned by root, so the app cannot modify its own code.
- Tests, `.env`, `node_modules` and editor files are excluded from the build by `.dockerignore`.

## API overview

All endpoints are under `/api`. Protected endpoints need the header `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create an account, returns a token |
| POST | `/api/auth/login` | – | Log in, returns a token |
| GET | `/api/auth/me` | ✔ | Current user |
| GET | `/api/media` | – | Browse/search: `search`, `type` (`MOVIE`/`TV_SHOW`), `genre` (name or id), `sort` (`title`/`newest`/`oldest`), `page`, `limit` |
| GET | `/api/media/:id` | optional | Title details (+ your like/save state when signed in) |
| GET | `/api/genres` | – | All genres with title counts |
| PUT | `/api/media/:id/preference` | ✔ | Like or dislike: body `{ "type": "LIKE" \| "DISLIKE" }` (replaces an earlier verdict) |
| DELETE | `/api/media/:id/preference` | ✔ | Remove your verdict (204) |
| GET | `/api/me/preferences` | ✔ | Your liked/disliked titles: `type` (`LIKE`/`DISLIKE`), `page`, `limit` |
| PUT | `/api/media/:id/save` | ✔ | Save a title to your library (saving twice is fine) |
| DELETE | `/api/media/:id/save` | ✔ | Remove it from your library (204) |
| GET | `/api/me/library` | ✔ | Your saved titles, newest first: `page`, `limit` |
| GET | `/api/collections` | ✔ | Your collections with item counts and a 4-poster preview |
| POST | `/api/collections` | ✔ | Create: `{ "name", "description"? }` (name 1–50 chars, description ≤ 500) |
| GET | `/api/collections/:id` | ✔ | A collection with its titles, newest first |
| PATCH | `/api/collections/:id` | ✔ | Rename / change description (send `""` to clear it) |
| DELETE | `/api/collections/:id` | ✔ | Delete the collection; titles stay in the catalogue (204) |
| PUT | `/api/collections/:id/items/:mediaId` | ✔ | Add a title (adding twice is fine) |
| DELETE | `/api/collections/:id/items/:mediaId` | ✔ | Remove a title (204) |

All `DELETE` endpoints are idempotent: removing something that is already gone still returns 204

Errors are returned as JSON: `{ "error": "message", "details": { "field": "problem" } }`.

## Database

The schema is designed from the ERD in `docs/database/`. Key decisions:
- UUID primary keys generated by PostgreSQL (`gen_random_uuid()`).
- Every title has exactly one detail record: `MovieDetails` or `TVShowDetails`.
- A user has at most one preference (LIKE or DISLIKE) per title and can save a title once; saving and liking are independent.
- Collection names are unique per user.
- Deleting a user removes their own data but never the shared catalogue.
- CHECK constraints (lowercase emails/usernames, valid types, positive numbers) are enforced in the migration.
