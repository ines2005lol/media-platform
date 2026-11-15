// Applies the existing migrations to the test database (TEST_DATABASE_URL).
// Works the same on Windows, macOS and Linux. Run with: npm run db:migrate:test
const path = require("path");
const { spawnSync } = require("child_process");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error("TEST_DATABASE_URL is not set. Add it to backend/.env (see .env.example).");
  process.exit(1);
}
if (testUrl === process.env.DATABASE_URL) {
  console.error("TEST_DATABASE_URL must point to a different database than DATABASE_URL.");
  process.exit(1);
}

// prisma.config.ts reads DATABASE_URL; override it for this one command only
const result = spawnSync("npx prisma migrate deploy", {
  cwd: path.resolve(__dirname, ".."),
  env: { ...process.env, DATABASE_URL: testUrl },
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
