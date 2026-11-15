const mediaService = require("../services/media.service");
const { requireUuid } = require("../utils/validation");

async function list(req, res) {
  res.json(await mediaService.listMedia(req.query));
}

async function getById(req, res) {
  const id = requireUuid(req.params.id, "media id");
  res.json(await mediaService.getMediaById(id, req.user?.id));
}

async function listGenres(req, res) {
  res.json({ items: await mediaService.listGenres() });
}

module.exports = { list, getById, listGenres };
