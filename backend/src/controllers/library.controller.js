const libraryService = require("../services/library.service");
const { requireBody, requireUuid } = require("../utils/validation");

// ── Likes / dislikes ──

async function setPreference(req, res) {
  const mediaId = requireUuid(req.params.id, "media id");
  res.json(await libraryService.setPreference(req.user.id, mediaId, requireBody(req.body)));
}

async function removePreference(req, res) {
  const mediaId = requireUuid(req.params.id, "media id");
  await libraryService.removePreference(req.user.id, mediaId);
  res.status(204).end();
}

async function listPreferences(req, res) {
  res.json(await libraryService.listPreferences(req.user.id, req.query));
}

// ── Library ──

async function save(req, res) {
  const mediaId = requireUuid(req.params.id, "media id");
  res.json(await libraryService.saveMedia(req.user.id, mediaId));
}

async function unsave(req, res) {
  const mediaId = requireUuid(req.params.id, "media id");
  await libraryService.unsaveMedia(req.user.id, mediaId);
  res.status(204).end();
}

async function listLibrary(req, res) {
  res.json(await libraryService.listLibrary(req.user.id, req.query));
}

module.exports = { setPreference, removePreference, listPreferences, save, unsave, listLibrary };
