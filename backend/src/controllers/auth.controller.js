const authService = require("../services/auth.service");
const { requireBody } = require("../utils/validation");

async function register(req, res) {
  const result = await authService.register(requireBody(req.body));
  res.status(201).json(result);
}

async function login(req, res) {
  const result = await authService.login(requireBody(req.body));
  res.json(result);
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
