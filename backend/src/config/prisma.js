const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { DATABASE_URL } = require("./env");

const adapter = new PrismaPg({ connectionString: DATABASE_URL });

// Single shared instance: Node caches this module, so every require() gets the same client
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
