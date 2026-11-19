# ---------- Stage 1: build ----------
# Installs every dependency (including the Prisma CLI) only to generate Prisma Client.
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Copy only the dependency manifests first so Docker can cache the npm install
# layer and skip it when only source code changes.
COPY package.json package-lock.json ./

# Install exactly what package-lock.json specifies (dev deps included, for the CLI).
RUN npm ci

# Prisma needs the schema and its config to generate the client.
COPY prisma.config.ts ./
COPY prisma ./prisma

# Generate Prisma Client into node_modules/.prisma/client.
RUN npx prisma generate


# ---------- Stage 2: runtime ----------
# A clean image that only contains what is needed to run the API.
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./

# Install production dependencies only.
# --omit=optional is needed because @prisma/client lists the Prisma CLI as an
# optional peer dependency; without it npm would install the ~300MB CLI anyway.
# --ignore-scripts skips the postinstall (editor tooling, not needed at runtime).
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force

# Bring in the generated Prisma Client from the build stage.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Application source code.
COPY src ./src

# Never run the app as root. Files above stay owned by root, so the app
# can read its code but cannot modify it.
USER node

# Documents the port the app listens on (PORT defaults to 3000 in src/config/env.js).
EXPOSE 3000

# Run node directly (not via npm). Start the container with `docker run --init`
# so Docker's stop signal is forwarded and the app shuts down cleanly.
CMD ["node", "src/server.js"]
