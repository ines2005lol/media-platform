const path = require("path");

// Load backend/.env no matter which folder the app is started from.
// Variables already set in the environment take precedence.
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});

function required(name) {
  const value = process.env[name];
  if (!value) {
    // Name the variable only; never print its value
    throw new Error(`${name} is not set. Add it to backend/.env (see .env.example).`);
  }
  return value;
}

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
};
